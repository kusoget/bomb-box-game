'use client';

import { useEffect, useState } from 'react';
import { getAvatarDisplay } from '@/lib/gameLogic';
import styles from './Character.module.css';

interface CharacterProps {
    name: string;
    avatar: string;
    playerNumber: 1 | 2;
    role: 'sitter' | 'switcher' | null;
    targetPosition: { x: number; y: number } | null;
    isShocking?: boolean;
}

export default function Character({
    name,
    avatar,
    playerNumber,
    role,
    targetPosition,
    isShocking = false,
}: CharacterProps) {
    const [currentPosition, setCurrentPosition] = useState({ x: 50, y: 50 });
    const [isWalking, setIsWalking] = useState(false);

    useEffect(() => {
        if (targetPosition) {
            setIsWalking(true);

            // 位置を更新
            const timer = setTimeout(() => {
                setCurrentPosition(targetPosition);
            }, 50);

            // 歩行アニメーション終了
            const walkTimer = setTimeout(() => {
                setIsWalking(false);
            }, 800);

            return () => {
                clearTimeout(timer);
                clearTimeout(walkTimer);
            };
        }
    }, [targetPosition]);

    // 位置はstateを使用（親から制御）
    const position = currentPosition;

    return (
        <div
            className={`
        ${styles.character}
        ${playerNumber === 2 ? styles.player2 : ''}
        ${isShocking ? styles.shocking : ''}
        ${isWalking ? styles.walking : styles.idle}
      `}
            style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: 'translate(-50%, -50%)',
            }}
        >
            <div className={styles.characterBody}>
                {(() => {
                    const { type, value } = getAvatarDisplay(avatar);
                    // Use a simple error handler in the img tag for now as we are inside a map/render
                    // Ideally we'd move this logic out, but inline onError is cleaner here for rapid fix
                    return type === 'image' ? (
                        <>
                            <img
                                src={value}
                                alt="Avatar"
                                className={styles.avatarImage}
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const parent = e.currentTarget.parentElement;
                                    if (parent) {
                                        const span = document.createElement('span');
                                        span.className = styles.avatarText || '';
                                        span.textContent = avatar?.substring(0, 2) || '?';
                                        parent.appendChild(span);
                                    }
                                }}
                            />
                        </>
                    ) : (
                        <span>{value}</span>
                    );
                })()}
            </div>
            {role && (
                <span className={`${styles.roleBadge} ${role === 'sitter' ? styles.sitter : styles.switcher}`}>
                    {role === 'sitter' ? '解除' : '仕掛'}
                </span>
            )}
            <div className={styles.characterName}>{name}</div>
        </div>
    );
}
