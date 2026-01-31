// ゲームフェーズ
export type GamePhase =
  | 'waiting'        // 対戦相手待ち
  | 'setting_trap'   // スイッチ側が感電椅子を設定中
  | 'selecting_chair' // 着席側が椅子を選択中
  | 'confirming'     // 着席側が確定を宣言
  | 'revealing'      // 結果発表中
  | 'round_end'      // ラウンド終了、役割交代
  | 'game_over';     // ゲーム終了

// 椅子の状態
export interface Chair {
  id: number;        // 1-12
  isRemoved: boolean;
  isTrapped: boolean; // 感電装置がONか（スイッチ側のみ見える）
}

// プレイヤー情報
export interface Player {
  id: string;
  name: string;
  avatar: string;
  playerNumber: 1 | 2;
  score: number;
  shockCount: number;
}

// ゲーム状態
export interface GameState {
  id: string;
  roomId: string;
  chairs: Chair[];
  player1Score: number;
  player2Score: number;
  player1Shocks: number;
  player2Shocks: number;
  currentRound: number;      // 何回戦目か
  isHalfFront: boolean;      // true=表、false=裏
  phase: GamePhase;
  currentSitterId: string | null;    // 着席側のプレイヤーID
  currentSwitcherId: string | null;  // スイッチ側のプレイヤーID
  trappedChair: number | null;       // 感電装置がONの椅子ID
  selectedChair: number | null;      // 着席側が選択中の椅子ID
  winner: string | null;             // 勝者のプレイヤーID
  winReason: 'score' | 'shock' | 'last_chair' | null;
  updatedAt: string;
}

// ルーム情報
export interface Room {
  id: string;
  roomCode: string;
  status: 'waiting' | 'playing' | 'finished';
  hostId: string;
  createdAt: string;
}

// チャットメッセージ
export interface ChatMessage {
  id: string;
  roomId: string;
  playerId: string;
  playerName: string;
  message: string;
  createdAt: string;
}

// ルーム参加時の情報
export interface RoomWithPlayers extends Room {
  players: Player[];
  gameState: GameState | null;
}

// ゲームアクション
export type GameAction =
  | { type: 'SET_TRAP'; chairId: number }
  | { type: 'SELECT_CHAIR'; chairId: number }
  | { type: 'CONFIRM_SELECTION' }
  | { type: 'REVEAL_RESULT' }
  | { type: 'NEXT_ROUND' }
  | { type: 'START_GAME' };

// WebSocket イベント
export type RealtimeEvent =
  | { type: 'GAME_STATE_UPDATE'; payload: GameState }
  | { type: 'PLAYER_JOINED'; payload: Player }
  | { type: 'PLAYER_LEFT'; payload: { playerId: string } }
  | { type: 'CHAT_MESSAGE'; payload: ChatMessage };
