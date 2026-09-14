// BOXBOM のゲームルール（純粋ロジック）
//
// このファイルはブラウザ(Next.js)と Cloudflare Worker / Durable Object の
// 両方から読み込まれる。React / Next / Node 固有の API は絶対に持ち込まないこと。
// （import は相対パスのみ。Worker のバンドラは `@/` エイリアスを解決できない）

import { Chair, GameState } from '../types/game';

export const CHAIR_COUNT = 12;
export const WIN_SCORE = 40;
export const MAX_SHOCKS = 3;

// 初期の箱配列を生成
export function createInitialChairs(): Chair[] {
    return Array.from({ length: CHAIR_COUNT }, (_, i) => ({
        id: i + 1,
        isRemoved: false,
        isTrapped: false,
    }));
}

// 初期のゲーム状態を生成
export function createInitialGameState(
    roomId: string,
    player1Id: string,
    player2Id: string
): GameState {
    // ランダムで先攻を決定
    const isPlayer1First = Math.random() < 0.5;

    return {
        id: crypto.randomUUID(),
        roomId,
        chairs: createInitialChairs(),
        player1Score: 0,
        player2Score: 0,
        player1Shocks: 0,
        player2Shocks: 0,
        currentRound: 1,
        isHalfFront: true, // 表から開始
        phase: 'setting_trap',
        // 表ターン: 先攻が着席側、後攻がスイッチ側
        currentSitterId: isPlayer1First ? player1Id : player2Id,
        currentSwitcherId: isPlayer1First ? player2Id : player1Id,
        trappedChair: null,
        selectedChair: null,
        winner: null,
        winReason: null,
        updatedAt: new Date().toISOString(),
    };
}

// 残っている箱の数を取得
export function getRemainingChairCount(chairs: Chair[]): number {
    return chairs.filter(c => !c.isRemoved).length;
}

// 残っている箱を取得
export function getRemainingChairs(chairs: Chair[]): Chair[] {
    return chairs.filter(c => !c.isRemoved);
}

// 勝敗チェック
export function checkWinCondition(
    gameState: GameState,
    player1Id: string,
    player2Id: string
): { winner: string | null; reason: 'score' | 'shock' | 'last_chair' | null } {
    // 40点以上獲得
    if (gameState.player1Score >= WIN_SCORE) {
        return { winner: player1Id, reason: 'score' };
    }
    if (gameState.player2Score >= WIN_SCORE) {
        return { winner: player2Id, reason: 'score' };
    }

    // 3回爆発で負け
    if (gameState.player1Shocks >= MAX_SHOCKS) {
        return { winner: player2Id, reason: 'shock' };
    }
    if (gameState.player2Shocks >= MAX_SHOCKS) {
        return { winner: player1Id, reason: 'shock' };
    }

    // 残り1箱
    const remainingCount = getRemainingChairCount(gameState.chairs);
    if (remainingCount <= 1) {
        if (gameState.player1Score > gameState.player2Score) {
            return { winner: player1Id, reason: 'last_chair' };
        } else if (gameState.player2Score > gameState.player1Score) {
            return { winner: player2Id, reason: 'last_chair' };
        }
        // 同点の場合は引き分け（winnerがnullのまま）
        return { winner: null, reason: 'last_chair' };
    }

    return { winner: null, reason: null };
}

// 爆発判定
export function processReveal(
    gameState: GameState,
    player1Id: string,
    player2Id: string
): GameState {
    const selectedChair = gameState.chairs.find(c => c.id === gameState.selectedChair);
    if (!selectedChair) return gameState;

    const isElectrocuted = selectedChair.isTrapped;
    const sitterId = gameState.currentSitterId;
    const isPlayer1Sitter = sitterId === player1Id;
    // player2Id は対称性のために受け取っている（片方が sitter でなければもう片方）
    void player2Id;

    const newState: GameState = { ...gameState };

    if (isElectrocuted) {
        // 爆発: 得点を全て失い、爆発回数を増やす
        if (isPlayer1Sitter) {
            newState.player1Score = 0;
            newState.player1Shocks += 1;
        } else {
            newState.player2Score = 0;
            newState.player2Shocks += 1;
        }
    } else {
        // セーフ: 箱の番号分の得点を獲得し、箱を除去
        if (isPlayer1Sitter) {
            newState.player1Score += selectedChair.id;
        } else {
            newState.player2Score += selectedChair.id;
        }
        newState.chairs = gameState.chairs.map(c =>
            c.id === selectedChair.id ? { ...c, isRemoved: true } : c
        );
    }

    newState.phase = 'revealing';
    newState.updatedAt = new Date().toISOString();

    return newState;
}

// 次のラウンドへ進む
export function advanceToNextRound(
    gameState: GameState,
    player1Id: string,
    player2Id: string
): GameState {
    // 勝敗チェック
    const { winner, reason } = checkWinCondition(gameState, player1Id, player2Id);

    if (winner || reason === 'last_chair') {
        return {
            ...gameState,
            phase: 'game_over',
            winner,
            winReason: reason,
            updatedAt: new Date().toISOString(),
        };
    }

    // 役割交代
    const wasHalfFront = gameState.isHalfFront;
    const newIsHalfFront = !wasHalfFront;
    const newRound = newIsHalfFront ? gameState.currentRound + 1 : gameState.currentRound;

    // 裏→表になるとき、着席側とスイッチ側が入れ替わる
    const newSitterId = gameState.currentSwitcherId;
    const newSwitcherId = gameState.currentSitterId;

    // トラップをリセット
    const resetChairs = gameState.chairs.map(c => ({ ...c, isTrapped: false }));

    return {
        ...gameState,
        chairs: resetChairs,
        currentRound: newRound,
        isHalfFront: newIsHalfFront,
        phase: 'setting_trap',
        currentSitterId: newSitterId,
        currentSwitcherId: newSwitcherId,
        trappedChair: null,
        selectedChair: null,
        updatedAt: new Date().toISOString(),
    };
}

// ルームコード生成（紛らわしい文字 I/O/0/1 は除外）
export function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// プレイヤー番号に対応する BOXBOM キャラクターID
export const CHARACTER_IDS = ['kirarin', 'ponyu'] as const;

export function avatarForPlayerNumber(playerNumber: number): string {
    return CHARACTER_IDS[(playerNumber - 1) % CHARACTER_IDS.length];
}
