'use client';

import Image from 'next/image';
import { Chair } from '@/types/game';
import { asset } from '@/lib/assets';
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
    inactiveColor?: 'purple' | 'orange';
    selectedByName?: string | null;
    selectedByAvatar?: string | null;
    centerContent?: {
        mainText?: React.ReactNode;
        subText?: string;
        characterImage?: string;
        characterName?: string | null;
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
    selectedByName,
    selectedByAvatar,
}: ChairCircleProps) {
    const totalChairs = chairs.length;

    // スタジアム配置：chair 16cqw対応で位置を少し広げて重なり回避
    const STADIUM_POSITIONS_12: { x: number; y: number }[] = [
        { x: 59, y: 18 },   // 1: top-right
        { x: 79, y: 29 },   // 2
        { x: 87, y: 47 },   // 3
        { x: 87, y: 63 },   // 4
        { x: 79, y: 80 },   // 5
        { x: 59, y: 90 },   // 6: bottom-right
        { x: 41, y: 90 },   // 7: bottom-left
        { x: 21, y: 80 },   // 8
        { x: 13, y: 63 },   // 9
        { x: 13, y: 47 },   // 10
        { x: 21, y: 29 },   // 11
        { x: 41, y: 18 },   // 12: top-left
    ];

    const getChairPosition = (index: number, total: number) => {
        if (total === 12) return STADIUM_POSITIONS_12[index];
        const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
        return { x: 50 + 38 * Math.cos(angle), y: 50 + 38 * Math.sin(angle) };
    };

    // 選択中の番号（中央表示用）
    const selectedNumber =
        selectedChair && chairs.some(c => c.id === selectedChair && !c.isRemoved)
            ? selectedChair
            : null;

    return (
        <div className={styles.chairCircle}>
            {/* 中央エリア */}
            <div className={styles.centerArea}>
                {centerContent ? (
                    <div className={styles.centerContent}>
                        {centerContent.characterImage && (
                            <div className={styles.centerCharacter}>
                                <Image
                                    src={centerContent.characterImage}
                                    alt={centerContent.characterName ?? 'character'}
                                    width={140}
                                    height={140}
                                    unoptimized
                                    priority
                                />
                                {centerContent.characterName && (
                                    <div className={styles.centerCharacterTag}>
                                        {centerContent.characterName}
                                    </div>
                                )}
                            </div>
                        )}
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
                ) : selectedNumber !== null ? (
                    <div className={styles.centerNumber}>{selectedNumber}</div>
                ) : null}
            </div>

            {/* 箱を円形配置 */}
            {chairs.map((chair, index) => {
                const pos = getChairPosition(index, totalChairs);
                const isSelected = selectedChair === chair.id;
                const isTrapped = showTrapped && trappedChair === chair.id;
                const isCurrentlyShocking = isShocking && shockingChair === chair.id;
                const showAsOn = isSelected || isTrapped;

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
                        <div className={styles.boxImageWrapper}>
                            <Image
                                src={showAsOn ? asset('/images/boxbom/box_on.png') : asset('/images/boxbom/box_off.png')}
                                alt={`box-${chair.id}`}
                                fill
                                sizes="80px"
                                unoptimized
                                draggable={false}
                            />
                            <span className={styles.chairNumber}>{chair.id}</span>
                            {isTrapped && (
                                <div className={styles.bombIcon}>💣</div>
                            )}
                            {isSelected && selectedByName && (
                                <div className={styles.selectedIndicator}>
                                    {selectedByAvatar && (
                                        <div className={styles.selectedAvatar}>
                                            <Image
                                                src={selectedByAvatar}
                                                alt=""
                                                fill
                                                sizes="40px"
                                                style={{ objectFit: 'cover' }}
                                                unoptimized
                                            />
                                        </div>
                                    )}
                                    <div className={styles.selectedNameTag}>{selectedByName}</div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
