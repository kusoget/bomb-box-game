'use client';

import { useState } from 'react';
import { WatchMode } from '@/types/game';
import { shareUrl, watchPath } from '@/lib/api';
import { copyText } from '@/lib/clipboard';
import { WATCH_DELAY_MS } from '@/lib/gameLogic';
import styles from './WatchShare.module.css';

interface WatchShareProps {
    roomCode: string;
    tokens: Record<WatchMode, string>;
    spectatorCount: number;
    /** 横3列の小さい版（ロビー用）。説明文も短くなる */
    compact?: boolean;
}

const MODES: { mode: WatchMode; label: string; note: string; short: string }[] = [
    { mode: 'live', label: 'ライブ', note: '爆弾の位置までリアルタイムで全部見える', short: '爆弾も見える' },
    { mode: 'delay', label: `${WATCH_DELAY_MS / 1000}秒遅れ`, note: '全部見えるが少し遅れて届く（配信向け）', short: '配信向け' },
    { mode: 'safe', label: '爆弾ふせ', note: '爆弾の位置は結果発表まで隠す（ズル防止）', short: 'ズル防止' },
];

/** 観戦URLをモードを選んでコピーするパネル（ロビーと対戦画面で共用） */
export default function WatchShare({ roomCode, tokens, spectatorCount, compact = false }: WatchShareProps) {
    const [copiedMode, setCopiedMode] = useState<WatchMode | null>(null);

    const copy = async (mode: WatchMode) => {
        if (!(await copyText(shareUrl(watchPath(roomCode, tokens[mode]))))) return;
        setCopiedMode(mode);
        setTimeout(() => setCopiedMode(current => (current === mode ? null : current)), 2000);
    };

    return (
        <div className={`${styles.panel} ${compact ? styles.compact : ''}`}>
            <div className={styles.title}>
                👀 観戦URLをシェア
                {spectatorCount > 0 && <span className={styles.count}>{spectatorCount}人が観戦中</span>}
            </div>
            <div className={styles.modes}>
                {MODES.map(({ mode, label, note, short }) => (
                    <button key={mode} type="button" className={`${styles.mode} ${styles[mode]}`} onClick={() => copy(mode)}>
                        <span className={styles.label}>{copiedMode === mode ? '✓ コピー' : label}</span>
                        <span className={styles.note}>{compact ? short : note}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
