// API / WebSocket の接続先。
// 本番は Worker が静的アセットも配信するので同一オリジン（空文字）。
// `next dev` で UI だけ触るときは .env.development の NEXT_PUBLIC_API_BASE で
// `wrangler dev`（http://localhost:8787）へ向ける。
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? '').replace(/\/$/, '');

export function apiUrl(path: string): string {
    return `${API_BASE}${path}`;
}

export function wsUrl(path: string): string {
    const origin = API_BASE || window.location.origin;
    const url = new URL(path, origin);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.toString();
}

/** ルーム画面の URL（/room?code=XXXXXX） */
export function roomPath(roomCode: string): string {
    return `/room?code=${encodeURIComponent(roomCode)}`;
}
