import { Chair, GameState, Player, GamePhase } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';

// 初期の椅子配列を生成
export function createInitialChairs(): Chair[] {
    return Array.from({ length: 12 }, (_, i) => ({
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
        id: uuidv4(),
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

// 残っている椅子の数を取得
export function getRemainingChairCount(chairs: Chair[]): number {
    return chairs.filter(c => !c.isRemoved).length;
}

// 残っている椅子を取得
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
    if (gameState.player1Score >= 40) {
        return { winner: player1Id, reason: 'score' };
    }
    if (gameState.player2Score >= 40) {
        return { winner: player2Id, reason: 'score' };
    }

    // 3回感電で負け
    if (gameState.player1Shocks >= 3) {
        return { winner: player2Id, reason: 'shock' };
    }
    if (gameState.player2Shocks >= 3) {
        return { winner: player1Id, reason: 'shock' };
    }

    // 残り1脚
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

// 感電判定
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

    let newState = { ...gameState };

    if (isElectrocuted) {
        // 感電: 得点を全て失い、感電回数を増やす
        if (isPlayer1Sitter) {
            newState.player1Score = 0;
            newState.player1Shocks += 1;
        } else {
            newState.player2Score = 0;
            newState.player2Shocks += 1;
        }
    } else {
        // セーフ: 椅子の番号分の得点を獲得し、椅子を除去
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

// ルームコード生成
export function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// 利用可能なアバター一覧
export const AVATARS = ['ghost', 'fox', 'cat', 'dog', 'bear', 'rabbit', 'panda', 'tiger'] as const;

// アバター生成（除外オプション付き）
export function getRandomAvatar(excludeAvatar?: string): string {
    // 除外リストを作成
    const available = excludeAvatar
        ? AVATARS.filter(a => a !== excludeAvatar)
        : [...AVATARS];

    return available[Math.floor(Math.random() * available.length)];
}

// BOXBOM キャラクター定義
export interface BoxbomCharacter {
    id: string;
    name: string;
    image: string;       // 通常時の立ち絵
    themeColor: string;  // スコアカード背景色
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const BOXBOM_CHARACTERS: BoxbomCharacter[] = [
    {
        id: 'kirarin',
        name: 'キラリン',
        image: `${BASE_PATH}/images/boxbom/kirarin.png`,
        themeColor: '#9b59b6', // 紫
    },
    {
        id: 'ponyu',
        name: 'ボニュ',
        image: `${BASE_PATH}/images/boxbom/ponyu.png`,
        themeColor: '#FF2D55', // ピンク
    },
];

export function getBoxbomCharacter(id: string | undefined | null): BoxbomCharacter | null {
    if (!id) return null;
    return BOXBOM_CHARACTERS.find(c => c.id === id) ?? null;
}

// アバターコードから表示文字を取得するヘルパー（絵文字モード + BOXBOM画像対応）
export function getAvatarDisplay(avatarCode: string | undefined | null): { type: 'image' | 'text', value: string } {
    if (!avatarCode) return { type: 'text', value: '?' };

    // BOXBOM キャラ
    const boxbomChar = getBoxbomCharacter(avatarCode);
    if (boxbomChar) {
        return { type: 'image', value: boxbomChar.image };
    }

    // 絵文字マッピング
    const emojiMap: Record<string, string> = {
        'ghost': '👻',
        'fox': '🦊',
        'cat': '🐱',
        'dog': '🐶',
        'bear': '🐻',
        'rabbit': '🐰',
        'panda': '🐼',
        'tiger': '🐯',
        'bomb': '💣',
        // 短縮形（互換性のため）
        'g': '👻',
        'f': '🦊',
        'b': '💣',
    };

    if (emojiMap[avatarCode]) {
        return { type: 'text', value: emojiMap[avatarCode] };
    }

    // そのまま返す（絵文字やその他のテキスト）
    return { type: 'text', value: avatarCode };
}
