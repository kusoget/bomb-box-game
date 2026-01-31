'use client';

import { Chair } from '@/types/game';
import styles from './ChairCircle.module.css';

interface ChairCircleProps {
    chairs: Chair[];
    selectedChair: number | null;
    trappedChair: number | null;
    showTrapped: boolean;
    canSelect: boolean;
    isShocking: boolean;
    shockingChair: number | null;
    onChairClick: (chairId: number) => void;
    centerContent?: {
        mainText: React.ReactNode;
        subText?: string;
        button?: {
            label: string;
            onClick: () => void;
            variant: 'primary' | 'danger';
        };
    };
}

export default function ChairCircle({
    chairs,
    selectedChair,
    trappedChair,
    showTrapped,
    canSelect,
    isShocking,
    shockingChair,
    onChairClick,
    centerContent,
}: ChairCircleProps) {
    const remainingChairs = chairs.filter(c => !c.isRemoved);
    const totalChairs = chairs.length;
    const radius = 36; // パーセント（狭い画面でも収まるように調整）

    // 椅子の位置を計算（円形配置）
    const getChairPosition = (index: number, total: number) => {
        const angle = (index / total) * 2 * Math.PI - Math.PI / 2; // 上から開始
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);
        return { x, y };
    };

    return (
        <div className={styles.chairCircle}>
            {/* 中央エリア */}
            <div className={styles.centerArea}>
                {centerContent ? (
                    (centerContent.mainText || centerContent.subText || centerContent.button) ? (
                        <div className={styles.centerContent}>
                            {centerContent.mainText && (
                                <div className={styles.centerMainText}>{centerContent.mainText}</div>
                            )}
                            {centerContent.subText && (
                                <div className={styles.centerSubText}>{centerContent.subText}</div>
                            )}
                            {centerContent.button && (
                                <button
                                    className={`${styles.centerButton} ${styles[centerContent.button.variant]}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        centerContent.button!.onClick();
                                    }}
                                >
                                    {centerContent.button.label}
                                </button>
                            )}
                        </div>
                    ) : null
                ) : null}
            </div>

            {/* 椅子 */}
            {chairs.map((chair, index) => {
                const pos = getChairPosition(index, totalChairs);
                const isSelected = selectedChair === chair.id;
                const isTrapped = showTrapped && trappedChair === chair.id;
                const isCurrentlyShocking = isShocking && shockingChair === chair.id;

                return (
                    <div
                        key={chair.id}
                        className={`
              ${styles.chair}
              ${chair.isRemoved ? styles.removed : ''}
              ${isSelected ? styles.selected : ''}
              ${isTrapped ? styles.trapped : ''}
              ${isCurrentlyShocking ? styles.shocking : ''}
              ${!canSelect || chair.isRemoved ? styles.disabled : ''}
            `}
                        style={{
                            left: `${pos.x}%`,
                            top: `${pos.y}%`,
                            transform: 'translate(-50%, -50%)',
                        }}
                        onClick={() => {
                            if (canSelect && !chair.isRemoved) {
                                onChairClick(chair.id);
                            }
                        }}
                    >
                        <div className={styles.chairBody}>
                            <span className={styles.chairNumber}>{chair.id}</span>
                            {/* トラップ表示（爆弾アイコン） */}
                            {isTrapped && (
                                <div className={styles.bombIcon}>
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_BASE_PATH || '/bomb-box-game'}/images/pop_bomb.png`}
                                        alt="Bomb"
                                        style={{ width: '40px', height: 'auto' }}
                                    />
                                </div>
                            )}
                            <div className={styles.electricWire} />
                        </div>
                        {/* 箱なので足は不要 <div className={styles.chairLegs}>
                            <div className={styles.chairLeg} />
                            <div className={styles.chairLeg} />
                        </div> */}
                    </div>
                );
            })}
        </div>
    );
}
