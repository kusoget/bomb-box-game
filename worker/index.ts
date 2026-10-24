import { generateRoomCode, normalizeRules } from '../src/lib/rules';
import type { GameRules } from '../src/types/game';
import type { Env } from './env';
import { RoomDO } from './room';

export { RoomDO };

const ROOM_CODE_RE = /^[A-Z0-9]{4,8}$/;

// next dev (localhost:3000) から wrangler dev (localhost:8787) を叩けるようにする。
// 本番は同一オリジンなので実害はない。
const CORS_HEADERS: Record<string, string> = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
    'access-control-allow-headers': 'content-type',
};

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json; charset=utf-8', ...CORS_HEADERS },
    });
}

function roomStub(env: Env, roomCode: string) {
    return env.ROOM.get(env.ROOM.idFromName(roomCode));
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
    try {
        const body = await request.json();
        return (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
    } catch {
        return {};
    }
}

function playerNameOf(body: Record<string, unknown>): string {
    return typeof body.playerName === 'string' ? body.playerName.trim() : '';
}

function rulesOf(body: Record<string, unknown>): GameRules {
    return normalizeRules(body.rules);
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        // 旧招待URL (/room/XXXXXX) を新形式へ転送
        const legacy = url.pathname.match(/^\/room\/([A-Za-z0-9]{4,8})\/?$/);
        if (legacy) {
            const target = new URL(url);
            target.pathname = '/room';
            target.searchParams.set('code', legacy[1].toUpperCase());
            return Response.redirect(target.toString(), 302);
        }

        // WebSocket: /api/rooms/:code/ws
        const wsMatch = url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]{4,8})\/ws$/);
        if (wsMatch) {
            const roomCode = wsMatch[1].toUpperCase();
            if (!ROOM_CODE_RE.test(roomCode)) return json({ error: 'Invalid room code' }, 400);
            return roomStub(env, roomCode).fetch(request);
        }

        if (url.pathname === '/api/rooms') {
            return handleRooms(request, env, url);
        }

        if (url.pathname.startsWith('/api/')) {
            return json({ error: 'Not found' }, 404);
        }

        // それ以外は静的アセット（next build の ./out）へ
        return env.ASSETS.fetch(request);
    },
} satisfies ExportedHandler<Env>;

async function handleRooms(request: Request, env: Env, url: URL): Promise<Response> {
    // 招待リンク用のルーム情報
    if (request.method === 'GET') {
        const code = url.searchParams.get('code')?.toUpperCase() ?? '';
        if (!ROOM_CODE_RE.test(code)) return json({ error: 'Room code is required' }, 400);

        const info = await roomStub(env, code).getInfo();
        if (!info) return json({ error: 'Room not found' }, 404);
        return json(info);
    }

    // ルーム作成
    if (request.method === 'POST') {
        const body = await readJson(request);
        const playerName = playerNameOf(body);
        if (!playerName) return json({ error: '名前を入力してください' }, 400);
        const rules = rulesOf(body);

        // コード衝突時はリトライ
        for (let i = 0; i < 10; i++) {
            const roomCode = generateRoomCode();
            const result = await roomStub(env, roomCode).createRoom(roomCode, playerName, rules);
            if (result.ok) {
                return json({ roomCode, roomId: roomCode, playerId: result.playerId });
            }
        }
        return json({ error: 'ルームの作成に失敗しました' }, 500);
    }

    // ルーム参加
    if (request.method === 'PUT') {
        const body = await readJson(request);
        const playerName = playerNameOf(body);
        const roomCode = typeof body.roomCode === 'string' ? body.roomCode.trim().toUpperCase() : '';

        if (!playerName) return json({ error: '名前を入力してください' }, 400);
        if (!ROOM_CODE_RE.test(roomCode)) return json({ error: 'ルームコードが正しくありません' }, 400);

        const result = await roomStub(env, roomCode).joinRoom(playerName);
        if (!result.ok) return json({ error: result.error }, result.status);

        return json({ roomCode: result.roomCode, roomId: result.roomCode, playerId: result.playerId });
    }

    return json({ error: 'Method not allowed' }, 405);
}
