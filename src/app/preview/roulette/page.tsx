'use client';

import { useState } from 'react';
import Link from 'next/link';
import RouletteOverlay from '@/components/RouletteOverlay/RouletteOverlay';
import styles from '../preview.module.css';

type Winner = 'p1' | 'p2';

export default function RoulettePreviewPage() {
    const [winner, setWinner] = useState<Winner>('p1');
    const [runKey, setRunKey] = useState(0);
    const [collapsed, setCollapsed] = useState(false);

    const startPlayerName = winner === 'p1' ? 'キラリン' : 'ボニュ';

    return (
        <div className={styles.previewWrap}>
            {collapsed ? (
                <button
                    className={styles.debugMini}
                    onClick={() => setCollapsed(false)}
                    aria-label="Open debug panel"
                >⚙</button>
            ) : (
                <div className={styles.debugPanel}>
                    <div className={styles.debugRow}>
                        <div className={styles.debugTitle}>Roulette Preview</div>
                        <Link href="/preview" className={styles.debugBackBtn}>← 一覧へ</Link>
                        <button
                            className={styles.debugCollapseBtn}
                            onClick={() => setCollapsed(true)}
                            aria-label="Collapse"
                        >–</button>
                    </div>
                    <div className={styles.debugRow}>
                        <span className={styles.debugLabel}>Winner:</span>
                        <button
                            className={`${styles.debugBtn} ${winner === 'p1' ? styles.debugBtnOn : ''}`}
                            onClick={() => setWinner('p1')}
                        >P1 キラリン</button>
                        <button
                            className={`${styles.debugBtn} ${winner === 'p2' ? styles.debugBtnOn : ''}`}
                            onClick={() => setWinner('p2')}
                        >P2 ボニュ</button>
                    </div>
                    <div className={styles.debugRow}>
                        <button
                            className={styles.debugBtn}
                            onClick={() => setRunKey(k => k + 1)}
                        >▶ Replay</button>
                    </div>
                </div>
            )}

            <RouletteOverlay
                key={`${winner}-${runKey}`}
                player1Name="キラリン"
                player2Name="ボニュ"
                startPlayerName={startPlayerName}
                onComplete={() => { /* noop */ }}
            />
        </div>
    );
}
