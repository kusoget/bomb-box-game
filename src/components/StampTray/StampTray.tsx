'use client';

import Image from 'next/image';
import { getBoxbomCharacter } from '@/lib/gameLogic';
import { asset } from '@/lib/assets';
import styles from './StampTray.module.css';

interface StampTrayProps {
    /** 自分のキャラID（避難時はnull） */
    myAvatar: string | null;
    /** スタンプ送信ハンドラ（任意） */
    onSendStamp?: (stampId: string) => void;
}

/**
 * スタンプトレイ。
 * 自分のキャラの表情バリエーション 4 つを横並びで表示。
 * 暫定として全部同じ画像を使い、後で表情別画像が来たら差し替え可能。
 */
export default function StampTray({ myAvatar, onSendStamp }: StampTrayProps) {
    const character = getBoxbomCharacter(myAvatar);
    if (!character) return null;

    // 表情パターン（実画像が増えたらここを増やすだけ）
    const stamps = [
        { id: `${character.id}-1`, image: character.image },
        { id: `${character.id}-2`, image: character.image },
        { id: `${character.id}-3`, image: character.image },
        { id: `${character.id}-4`, image: character.image },
    ];

    return (
        <div className={styles.tray}>
            <div className={styles.label}>スタンプ</div>
            <div className={styles.row}>
                {stamps.map(s => (
                    <button
                        key={s.id}
                        className={styles.stamp}
                        onClick={() => onSendStamp?.(s.id)}
                        type="button"
                    >
                        <Image src={s.image} alt="stamp" width={56} height={56} unoptimized />
                    </button>
                ))}
            </div>
        </div>
    );
}

// Suppress unused-import warning in build (asset is intentionally accessible)
void asset;
