// クライアント <-> Durable Object 間の WebSocket プロトコル定義
// ブラウザと Worker の両方から参照される（相対 import のみ）

import { ChatMessage, GameState, Player, Room, WatchMode } from './game';

// サーバーがクライアントに配るルームのスナップショット
export interface RoomSnapshot {
    room: Room;
    players: Player[];
    gameState: GameState | null;
    messages: ChatMessage[];
    /** いま観戦している人数 */
    spectatorCount: number;
    /** この接続が観戦者ならそのモード。プレイヤーは null */
    spectatorMode: WatchMode | null;
}

// サーバー -> クライアント
export type ServerMessage =
    // payload が null = ルームが存在しない / 解散した
    | { t: 'STATE'; payload: RoomSnapshot | null }
    | { t: 'PONG' };

// クライアント -> サーバー
export type ClientMessage =
    | { t: 'START_GAME' }
    | { t: 'SET_TRAP'; chairId: number }
    | { t: 'SELECT_CHAIR'; chairId: number }
    | { t: 'CONFIRM_SELECTION' }
    | { t: 'NEXT_ROUND' }
    | { t: 'CHAT'; message: string }
    | { t: 'LEAVE' }
    | { t: 'PING' };
