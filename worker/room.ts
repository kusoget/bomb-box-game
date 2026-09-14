import { DurableObject } from 'cloudflare:workers';

import type { ChatMessage, GameState, Player } from '../src/types/game';
import type { ClientMessage, RoomSnapshot, ServerMessage } from '../src/types/realtime';
import {
    advanceToNextRound,
    avatarForPlayerNumber,
    createInitialGameState,
    processReveal,
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
    players: Player[];
    gameState: GameState | null;
    messages: ChatMessage[];
}

interface SocketMeta {
    playerId: string;
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
    async createRoom(roomCode: string, playerName: string): Promise<{ ok: boolean; playerId?: string }> {
        if (await this.#load()) return { ok: false };

        const playerId = crypto.randomUUID();
        this.#data = {
            roomCode,
            status: 'waiting',
            hostId: playerId,
            createdAt: new Date().toISOString(),
            players: [makePlayer(playerId, playerName, 1)],
            gameState: null,
            messages: [],
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
        const playerId = new URL(request.url).searchParams.get('playerId') ?? '';

        const pair = new WebSocketPair();
        const client = pair[0];
        const server = pair[1];

        // hibernation API: DO が眠っても接続は維持される
        this.ctx.acceptWebSocket(server);
        server.serializeAttachment({ playerId } satisfies SocketMeta);

        // ルームが無い場合も payload:null を返す（クライアント側で「見つかりません」表示）
        send(server, { t: 'STATE', payload: data ? this.#viewFor(data, playerId) : null });

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
        data.gameState = createInitialGameState(data.roomCode, p1, p2);
        data.status = 'playing';
    }

    // ---- 配信 ----

    #broadcast(): void {
        for (const ws of this.ctx.getWebSockets()) {
            const meta = ws.deserializeAttachment() as SocketMeta | null;
            send(ws, {
                t: 'STATE',
                payload: this.#data ? this.#viewFor(this.#data, meta?.playerId ?? '') : null,
            });
        }
    }

    /** 受け取る人に応じて爆弾の位置を隠したスナップショットを作る */
    #viewFor(data: RoomData, playerId: string): RoomSnapshot {
        return {
            room: {
                id: data.roomCode,
                roomCode: data.roomCode,
                status: data.status,
                hostId: data.hostId,
                createdAt: data.createdAt,
            },
            players: data.players,
            gameState: maskGameState(data.gameState, playerId),
            messages: data.messages,
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
    try {
        ws.send(JSON.stringify(message));
    } catch {
        // 送信先がすでに閉じている
    }
}
