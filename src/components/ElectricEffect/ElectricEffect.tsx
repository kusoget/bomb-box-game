'use client';

import { useEffect, useState } from 'react';
import styles from './ElectricEffect.module.css';

interface ElectricEffectProps {
    isActive: boolean;
    duration?: number;
    onComplete?: () => void;
}

export default function ElectricEffect({
    isActive,
    duration = 1500,
    onComplete,
}: ElectricEffectProps) {
    const [showEffect, setShowEffect] = useState(false);

    useEffect(() => {
        if (isActive) {
            setShowEffect(true);
            const timer = setTimeout(() => {
                setShowEffect(false);
                onComplete?.();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isActive, duration, onComplete]);

    if (!showEffect) return null;

    return (
        <div className={`${styles.electricEffect} ${styles.active}`}>
            {/* フラッシュ背景 */}
            <div className={styles.flash} />

            {/* 電撃ボルト */}
            <div className={styles.bolts}>
                <div className={styles.bolt} />
                <div className={styles.bolt} />
                <div className={styles.bolt} />
                <div className={styles.bolt} />
            </div>

            {/* 衝撃波 */}
            <div className={styles.epicenter} />

            {/* スパーク */}
            <div className={styles.sparks}>
                {[...Array(8)].map((_, i) => (
                    <div key={i} className={styles.spark} />
                ))}
            </div>

            {/* テキスト */}
            <div className={styles.shockText}>💥 BOOM! 💥</div>
        </div>
    );
}
