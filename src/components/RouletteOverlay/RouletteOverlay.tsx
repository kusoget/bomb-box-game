'use client';

import { useState, useEffect } from 'react';
import styles from './RouletteOverlay.module.css';

interface RouletteOverlayProps {
    player1Name: string;
    player2Name: string;
    startPlayerName: string; // 最終的に決まるプレイヤー名
    onComplete: () => void;
}

export default function RouletteOverlay({
    player1Name,
    player2Name,
    startPlayerName,
    onComplete
}: RouletteOverlayProps) {
    const [currentName, setCurrentName] = useState(player1Name);
    const [speed, setSpeed] = useState(50);
    const [phase, setPhase] = useState<'spinning' | 'stopping' | 'result'>('spinning');

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        let count = 0;
        const maxCount = 12; // 回転回数 (20 -> 12)

        const spin = () => {
            // 交互に切り替え
            setCurrentName(prev => prev === player1Name ? player2Name : player1Name);
            count++;

            if (count < maxCount) {
                // 加速フェーズ
                timeoutId = setTimeout(spin, 60); // 100ms -> 60ms
            } else {
                // 減速して止まる
                setPhase('stopping');
                handleStop();
            }
        };

        const handleStop = () => {
            // 3回ゆっくり点滅して、最後に正解を表示
            let stopCount = 0;
            const slowSpin = () => {
                setCurrentName(prev => prev === player1Name ? player2Name : player1Name);
                stopCount++;
                if (stopCount < 4) { // 6 -> 4回
                    timeoutId = setTimeout(slowSpin, 200 + (stopCount * 80)); // 徐々に遅く (短縮)
                } else {
                    // 最終決定
                    setCurrentName(startPlayerName);
                    setPhase('result');
                    setTimeout(onComplete, 1500); // 2秒 -> 1.5秒
                }
            };
            slowSpin();
        };

        timeoutId = setTimeout(spin, 200); // 初期ディレイ 500ms -> 200ms

        return () => clearTimeout(timeoutId);
    }, [player1Name, player2Name, startPlayerName, onComplete]);

    return (
        <div className={styles.overlay}>
            <div className={styles.content}>
                <h2 className={styles.title}>先行（仕掛け人）抽選中...</h2>
                <div className={`${styles.rouletteBox} ${phase === 'result' ? styles.result : ''}`}>
                    <div className={styles.name}>{currentName}</div>
                </div>
                {phase === 'result' && <div className={styles.decided}>先行決定！</div>}
            </div>
        </div>
    );
}
