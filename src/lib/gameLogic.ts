// ゲームルールは src/lib/rules.ts（Worker と共有する純粋ロジック）に置いている。
// ここからは再エクスポートするだけなので、UI 側の import は今まで通り
// `@/lib/gameLogic` のままでよい。
export * from './rules';

// ---- ここから下は UI 専用のヘルパー（Worker からは使わない） ----

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
