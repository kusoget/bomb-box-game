import { DurableObject } from 'cloudflare:workers';

import type { ChatMessage, GameRules, GameState, Player, WatchMode } from '../src/types/game';
import type { ClientMessage, RoomSnapshot, ServerMessage } from '../src/types/realtime';
import {
    advanceToNextRound,
    avatarForPlayerNumber,
    createInitialGameState,
    normalizeRules,
    processReveal,
    WATCH_DELAY_MS,
} from '../src/lib/rules';
import type { Env } from './env';

/** 最終更新からこの時間が経ったルームは自動的に消える */
const ROOM_TTL_MS = 3 * 60 * 60 * 1000; // 3時間
/** 保持するチャット/スタンプの最大件数 */
const MAX_MESSAGES = 50;
/** 爆弾の位置を全員に見せてよいフェーズ */
const TRAP_VISIBLE_PHASES = new Set<GameState['phase']>(['revealing', 'round_end', 'game_over']);

interface RoomData {
    roomCode: string;
    status: 'waiting' | 'playing' | 'finished';
    hostId: string;
    createdAt: string;
    rules: GameRules;
    players: Player[];
    gameState: GameState | null;
    messages: ChatMessage[];
    /** 観戦URL用のトークン（ルームコードだけでは観戦できないようにする）。モードごとに別 */
    watchTokens?: Record<WatchMode, string>;
}

interface SocketMeta {
    playerId: string;
    /** 観戦者の接続ならそのモード。観戦者の操作は受け付けない */
    spectator?: WatchMode;
}

export type JoinResult =
    | { ok: true; roomCode: string; playerId: string }
    | { ok: false; error: string; status: number };

/**
 * ルーム1つ分の状態を丸ごと抱える Durable Object。
 * Supabase の rooms / players / game_states / chat_messages を置き換える。
 *
 * - 状態は storage の 'room' キーに JSON 1件で持つ（1ルームぶんは数KB）
 * - プレイヤーは WebSocket で常時つながっていて、更新のたびに push される
 * - 勝敗や得点の計算は必ずここで行う（クライアントは結果を送ってこない）
 */
export class RoomDO extends DurableObject<Env> {
    #data: RoomData | null = null;
    #loaded = false;

    async #load(): Promise<RoomData | null> {
        if (!this.#loaded) {
            this.#data = (await this.ctx.storage.get<RoomData>('room')) ?? null;
            this.#loaded = true;
            // 観戦機能より前に作られたルームにもトークンを振っておく
            if (this.#data && !this.#data.watchTokens) {
                this.#data.watchTokens = makeWatchTokens();
                await this.ctx.storage.put('room', this.#data);
            }
        }
        return this.#data;
    }

    async #persist(): Promise<void> {
        if (this.#data === null) {
            // deleteAll() はアラームも一緒に消してくれる
            await this.ctx.storage.deleteAll();
            return;
        }
        await this.ctx.storage.put('room', this.#data);
        await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
    }

    /** TTL 切れ: ルームを破棄して接続を閉じる */
    async alarm(): Promise<void> {
        this.#data = null;
        this.#loaded = true;
        await this.ctx.storage.deleteAll();
        this.#broadcast();
        for (const ws of this.ctx.getWebSockets()) {
            try {
                ws.close(1000, 'room expired');
            } catch {
                // すでに閉じている
            }
        }
    }

    // ---- RPC（Worker のルーターから呼ばれる） ----

    /** ルーム作成。すでにそのコードが使われていれば ok:false を返す */
    async createRoom(roomCode: string, playerName: string, rules?: GameRules): Promise<{ ok: boolean; playerId?: string }> {
        if (await this.#load()) return { ok: false };

        const playerId = crypto.randomUUID();
        this.#data = {
            roomCode,
            status: 'waiting',
            hostId: playerId,
            createdAt: new Date().toISOString(),
            rules: normalizeRules(rules),
            players: [makePlayer(playerId, playerName, 1)],
            gameState: null,
            messages: [],
            watchTokens: makeWatchTokens(),
        };
        await this.#persist();
        return { ok: true, playerId };
    }

    /** ルーム参加。2人揃った時点で自動的にゲームが始まる */
    async joinRoom(playerName: string): Promise<JoinResult> {
        const data = await this.#load();
        if (!data) return { ok: false, error: 'Room not found', status: 404 };
        if (data.status !== 'waiting') return { ok: false, error: 'Game already started', status: 400 };
        if (data.players.length >= 2) return { ok: false, error: 'Room is full', status: 400 };

        const playerId = crypto.randomUUID();
        data.players.push(makePlayer(playerId, playerName, data.players.length + 1));

        if (data.players.length === 2) this.#startGame(data);

        await this.#persist();
        this.#broadcast();
        return { ok: true, roomCode: data.roomCode, playerId };
    }

    /** 招待リンク用のルーム情報 */
    async getInfo(): Promise<{ roomCode: string; hostName: string; status: string } | null> {
        const data = await this.#load();
        if (!data) return null;
        return {
            roomCode: data.roomCode,
            hostName: data.players.find(p => p.id === data.hostId)?.name ?? 'Unknown',
            status: data.status,
        };
    }

    // ---- WebSocket ----

    async fetch(request: Request): Promise<Response> {
        if (request.headers.get('Upgrade') !== 'websocket') {
            return new Response('Expected websocket', { status: 426 });
        }

        const data = await this.#load();
        const params = new URL(request.url).searchParams;
        const watch = params.get('watch');
        const spectator = watch !== null ? watchModeOf(data, watch) : undefined;
        const playerId = watch !== null ? '' : params.get('playerId') ?? '';

        const pair = new WebSocketPair();
        const client = pair[0];
        const server = pair[1];

        // hibernation API: DO が眠っても接続は維持される
        this.ctx.acceptWebSocket(server);
        const meta: SocketMeta = { playerId, spectator };
        server.serializeAttachment(meta);

        // ルームが無い / 観戦トークン違いの場合は payload:null を返す（クライアント側で「見つかりません」表示）
        const allowed = data !== null && (watch === null || spectator !== undefined);
        if (!allowed) {
            send(server, { t: 'STATE', payload: null });
            server.close(1000, 'not found');
        } else if (spectator) {
            // 遅延観戦は「今」を全部見せられないので、入った瞬間だけ爆弾を伏せた盤面を出しておく
            if (spectator === 'delay') {
                const masked = this.#viewFor(data, { playerId: '', spectator: 'safe' });
                send(server, { t: 'STATE', payload: { ...masked, spectatorMode: 'delay' } });
            }
            // 観戦者が増えたことをプレイヤーにも知らせる（自分宛ても含む）
            this.#broadcast();
        } else {
            send(server, { t: 'STATE', payload: this.#viewFor(data, meta) });
        }

        return new Response(null, { status: 101, webSocket: client });
    }

    async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
        if (typeof raw !== 'string') return;

        let action: ClientMessage;
        try {
            action = JSON.parse(raw) as ClientMessage;
        } catch {
            return;
        }

        if (action.t === 'PING') {
            send(ws, { t: 'PONG' });
            return;
        }

        const meta = ws.deserializeAttachment() as SocketMeta | null;
        // 観戦者は見るだけ
        if (meta?.spectator) return;
        const playerId = meta?.playerId ?? '';

        const data = await this.#load();
        if (!data) return;

        if (!this.#apply(data, playerId, action)) return;

        await this.#persist();
        this.#broadcast();
    }

    async webSocketClose(ws: WebSocket, code: number): Promise<void> {
        // 1006 等の異常切断でも状態は残す（リロードで復帰できるように）
        try {
            ws.close(code === 1006 ? 1000 : code);
        } catch {
            // already closed
        }
        // 観戦者が抜けたら人数表示を更新
        const meta = ws.deserializeAttachment() as SocketMeta | null;
        if (meta?.spectator) this.#broadcast(ws);
    }

    // ---- ゲーム進行 ----

    /** 受け取ったアクションを適用する。state が変わったら true */
    #apply(data: RoomData, playerId: string, action: ClientMessage): boolean {
        const gs = data.gameState;

        switch (action.t) {
            case 'START_GAME': {
                if (data.status !== 'waiting' || data.players.length !== 2) return false;
                if (data.hostId !== playerId) return false;
                this.#startGame(data);
                return true;
            }

            case 'SET_TRAP': {
                if (!gs || gs.phase !== 'setting_trap' || gs.currentSwitcherId !== playerId) return false;
                const chair = gs.chairs.find(c => c.id === action.chairId);
                if (!chair || chair.isRemoved) return false;

                if (gs.trappedChair !== action.chairId) {
                    // 1回目のタップ: 仮置き
                    gs.chairs = gs.chairs.map(c => ({ ...c, isTrapped: c.id === action.chairId }));
                    gs.trappedChair = action.chairId;
                } else {
                    // 同じ箱をもう一度 = 確定
                    gs.phase = 'selecting_chair';
                }
                gs.updatedAt = new Date().toISOString();
                return true;
            }

            case 'SELECT_CHAIR': {
                if (!gs || gs.phase !== 'selecting_chair' || gs.currentSitterId !== playerId) return false;
                const chair = gs.chairs.find(c => c.id === action.chairId);
                if (!chair || chair.isRemoved) return false;

                gs.selectedChair = action.chairId;
                gs.updatedAt = new Date().toISOString();
                return true;
            }

            case 'CONFIRM_SELECTION': {
                if (!gs || gs.phase !== 'selecting_chair' || gs.currentSitterId !== playerId) return false;
                if (gs.selectedChair === null) return false;

                const [p1, p2] = playerIds(data);
                data.gameState = processReveal(gs, p1, p2);
                syncPlayerStats(data);
                return true;
            }

            case 'NEXT_ROUND': {
                // 両クライアントが演出後に送ってくるので、最初の1回だけ効かせる
                if (!gs || gs.phase !== 'revealing') return false;

                const [p1, p2] = playerIds(data);
                const next = advanceToNextRound(gs, p1, p2);
                data.gameState = next;
                if (next.phase === 'game_over') data.status = 'finished';
                syncPlayerStats(data);
                return true;
            }

            case 'CHAT': {
                const player = data.players.find(p => p.id === playerId);
                if (!player) return false;
                const message = String(action.message ?? '').slice(0, 200);
                if (!message) return false;

                data.messages.push({
                    id: crypto.randomUUID(),
                    roomId: data.roomCode,
                    playerId: player.id,
                    playerName: player.name,
                    message,
                    createdAt: new Date().toISOString(),
                });
                if (data.messages.length > MAX_MESSAGES) {
                    data.messages = data.messages.slice(-MAX_MESSAGES);
                }
                return true;
            }

            case 'LEAVE': {
                const index = data.players.findIndex(p => p.id === playerId);
                if (index === -1) return false;

                const isHost = data.hostId === playerId;
                data.players.splice(index, 1);

                // ホストが抜けた / 誰もいなくなった場合はルームごと破棄
                if (isHost || data.players.length === 0) {
                    this.#data = null;
                }
                return true;
            }

            default:
                return false;
        }
    }

    #startGame(data: RoomData): void {
        const [p1, p2] = playerIds(data);
        data.gameState = createInitialGameState(data.roomCode, p1, p2, data.rules);
        data.status = 'playing';
    }

    // ---- 配信 ----

    /** exclude: 閉じかけの接続（人数に数えず、送信もしない） */
    #broadcast(exclude?: WebSocket): void {
        const sockets = this.ctx.getWebSockets().filter(ws => ws !== exclude);
        const spectatorCount = sockets.filter(ws => (ws.deserializeAttachment() as SocketMeta | null)?.spectator).length;
        for (const ws of sockets) {
            const meta = (ws.deserializeAttachment() as SocketMeta | null) ?? { playerId: '' };
            const message: ServerMessage = {
                t: 'STATE',
                payload: this.#data ? this.#viewFor(this.#data, meta, spectatorCount) : null,
            };
            if (meta.spectator === 'delay' && message.payload) {
                // 送る中身は今この瞬間のもので確定させ、届けるのだけ遅らせる
                const frozen = JSON.stringify(message);
                setTimeout(() => sendRaw(ws, frozen), WATCH_DELAY_MS);
            } else {
                send(ws, message);
            }
        }
    }

    #spectatorCount(): number {
        return this.ctx.getWebSockets()
            .filter(ws => (ws.deserializeAttachment() as SocketMeta | null)?.spectator)
            .length;
    }

    /** 受け取る人に応じて爆弾の位置を隠したスナップショットを作る（観戦者には全部見せる） */
    #viewFor(data: RoomData, meta: SocketMeta, spectatorCount = this.#spectatorCount()): RoomSnapshot {
        const spectator = meta.spectator ?? null;
        const isPlayer = !spectator && data.players.some(p => p.id === meta.playerId);
        // safe 観戦は「誰でもない人」として見せる＝仕掛け役以外と同じく結果発表まで爆弾を伏せる
        const gameState =
            spectator === 'live' || spectator === 'delay' ? data.gameState :
                maskGameState(data.gameState, spectator === 'safe' ? '' : meta.playerId);
        return {
            room: {
                id: data.roomCode,
                roomCode: data.roomCode,
                status: data.status,
                hostId: data.hostId,
                createdAt: data.createdAt,
                rules: normalizeRules(data.rules),
                // 観戦URLを発行できるのはプレイヤーだけ
                watchTokens: isPlayer ? data.watchTokens : undefined,
            },
            players: data.players,
            gameState,
            messages: data.messages,
            spectatorCount,
            spectatorMode: spectator,
        };
    }
}

// ---- ヘルパー ----

function makePlayer(id: string, name: string, playerNumber: number): Player {
    return {
        id,
        name: name.slice(0, 20),
        avatar: avatarForPlayerNumber(playerNumber),
        playerNumber: playerNumber as 1 | 2,
        score: 0,
        shockCount: 0,
    };
}

function makeWatchTokens(): Record<WatchMode, string> {
    const token = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    return { live: token(), delay: token(), safe: token() };
}

function watchModeOf(data: RoomData | null, token: string): WatchMode | undefined {
    if (!data?.watchTokens || !token) return undefined;
    return (Object.keys(data.watchTokens) as WatchMode[]).find(mode => data.watchTokens![mode] === token);
}

function playerIds(data: RoomData): [string, string] {
    const p1 = data.players.find(p => p.playerNumber === 1)?.id ?? '';
    const p2 = data.players.find(p => p.playerNumber === 2)?.id ?? '';
    return [p1, p2];
}

/** gameState の得点を players にも反映しておく */
function syncPlayerStats(data: RoomData): void {
    const gs = data.gameState;
    if (!gs) return;
    for (const player of data.players) {
        if (player.playerNumber === 1) {
            player.score = gs.player1Score;
            player.shockCount = gs.player1Shocks;
        } else {
            player.score = gs.player2Score;
            player.shockCount = gs.player2Shocks;
        }
    }
}

/**
 * 仕掛け役以外には爆弾の位置を渡さない。
 * （Supabase 版は全員に isTrapped を配っていたので、DevTools を開けば覗けてしまっていた）
 */
function maskGameState(gs: GameState | null, playerId: string): GameState | null {
    if (!gs) return null;
    if (gs.currentSwitcherId === playerId || TRAP_VISIBLE_PHASES.has(gs.phase)) return gs;

    return {
        ...gs,
        trappedChair: null,
        chairs: gs.chairs.map(c => (c.isTrapped ? { ...c, isTrapped: false } : c)),
    };
}

function send(ws: WebSocket, message: ServerMessage): void {
    sendRaw(ws, JSON.stringify(message));
}

function sendRaw(ws: WebSocket, raw: string): void {
    try {
        ws.send(raw);
    } catch {
        // 送信先がすでに閉じている
    }
}
