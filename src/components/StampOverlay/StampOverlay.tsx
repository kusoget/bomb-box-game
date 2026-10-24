'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChatMessage } from '@/types/game';
import { getBoxbomCharacter } from '@/lib/gameLogic';
import styles from './StampOverlay.module.css';

interface FloatingStamp {
    key: string;
    image: string;
    name: string;
    own: boolean;
    left: number; // 表示位置（％）
}

interface StampOverlayProps {
    messages: ChatMessage[];
    currentPlayerId: string;
}

/** チャットメッセージのうちスタンプを表すプレフィックス */
const STAMP_PREFIX = ':stamp:';
/** 1つのスタンプが画面に残る時間（ms）。CSS のアニメーション長と合わせる */
const STAMP_DURATION = 2600;

/**
 * スタンプID（`${characterId}-N` 形式）からキャラ画像を解決する。
 * characterId 自体にハイフンは含まれない前提。
 */
function resolveStampImage(stampId: string): string | null {
    const charId = stampId.replace(/-\d+$/, '');
    return getBoxbomCharacter(charId)?.image ?? null;
}

/**
 * 盤面に一瞬ふわっと出るスタンプ演出（LINE のリアクション風）。
 * 受信した CHAT メッセージのうち `:stamp:` で始まるものを検知し、
 * キャラ画像を浮かび上がらせて自動で消す。チャット表示とは独立。
 */
export default function StampOverlay({ messages, currentPlayerId }: StampOverlayProps) {
    const [stamps, setStamps] = useState<FloatingStamp[]>([]);
    const seenIdsRef = useRef<Set<string>>(new Set());
    const initializedRef = useRef(false);

    useEffect(() => {
        // 初回マウント時は既存メッセージを「表示済み」として履歴を再生しない
        if (!initializedRef.current) {
            messages.forEach(m => seenIdsRef.current.add(m.id));
            initializedRef.current = true;
            return;
        }

        const newStamps: FloatingStamp[] = [];
        for (const m of messages) {
            if (seenIdsRef.current.has(m.id)) continue;
            seenIdsRef.current.add(m.id);
            if (!m.message.startsWith(STAMP_PREFIX)) continue;

            const stampId = m.message.slice(STAMP_PREFIX.length);
            const image = resolveStampImage(stampId);
            if (!image) continue;

            newStamps.push({
                key: m.id,
                image,
                name: m.playerName,
                own: m.playerId === currentPlayerId,
                left: 15 + Math.random() * 55,
            });
        }

        if (newStamps.length === 0) return;

        setStamps(prev => [...prev, ...newStamps]);
        newStamps.forEach(s => {
            setTimeout(() => {
                setStamps(prev => prev.filter(x => x.key !== s.key));
            }, STAMP_DURATION);
        });
    }, [messages, currentPlayerId]);

    if (stamps.length === 0) return null;

    return (
        <div className={styles.overlay} aria-hidden>
            {stamps.map(s => (
                <div
                    key={s.key}
                    className={`${styles.stamp} ${s.own ? styles.own : ''}`}
                    style={{ left: `${s.left}%` }}
                >
                    <div className={styles.bubble}>
                        <Image src={s.image} alt="" width={96} height={96} unoptimized />
                    </div>
                    <span className={styles.name}>{s.name}</span>
                </div>
            ))}
        </div>
    );
}
