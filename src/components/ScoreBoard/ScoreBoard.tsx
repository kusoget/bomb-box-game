'use client';

import Image from 'next/image';
import { Player, GameState } from '@/types/game';
import { getBoxbomCharacter } from '@/lib/gameLogic';
import { asset } from '@/lib/assets';
import styles from './ScoreBoard.module.css';

interface ScoreBoardProps {
    player1: Player | null;
    player2: Player | null;
    gameState: GameState | null;
    currentPlayerId: string;
}

export default function ScoreBoard({
    player1,
    player2,
    gameState,
    currentPlayerId,
}: ScoreBoardProps) {
    const p1Score = gameState?.player1Score ?? 0;
    const p2Score = gameState?.player2Score ?? 0;
    const p1Shocks = gameState?.player1Shocks ?? 0;
    const p2Shocks = gameState?.player2Shocks ?? 0;
    const round = gameState?.currentRound ?? 1;

    // アクティブなプレイヤー（手番）を判定
    let activePlayerId: string | null = null;
    if (gameState) {
        if (gameState.phase === 'setting_trap') {
            activePlayerId = gameState.currentSwitcherId;
        } else if (gameState.phase === 'selecting_chair' || gameState.phase === 'confirming') {
            activePlayerId = gameState.currentSitterId;
        }
    }

    const isPlayer1Active = activePlayerId === player1?.id;
    const isPlayer2Active = activePlayerId === player2?.id;

    const isSwitcher = gameState?.currentSwitcherId === currentPlayerId;
    const isSitter = gameState?.currentSitterId === currentPlayerId;

    const getPhaseDisplayText = () => {
        if (!gameState) return 'LOADING...';

        const switcher =
            gameState.currentSwitcherId === player1?.id ? player1 :
                gameState.currentSwitcherId === player2?.id ? player2 : null;
        const sitter =
            gameState.currentSitterId === player1?.id ? player1 :
                gameState.currentSitterId === player2?.id ? player2 : null;

        const switcherName = switcher?.name ?? '相手';
        const sitterName = sitter?.name ?? '相手';

        switch (gameState.phase) {
            case 'setting_trap':
                return `${switcherName}が爆弾セット中`;
            case 'selecting_chair':
                return `${sitterName}が箱を選択中`;
            case 'confirming':
                return isSitter ? '決定しますか？' : `${sitterName}が確認中...`;
            case 'revealing':
                return '結果発表';
            case 'round_end':
                return '次のラウンドへ';
            case 'game_over':
                return 'ゲーム終了';
            default:
                return '';
        }
    };

    const isActionRequired = gameState && (
        (gameState.phase === 'setting_trap' && isSwitcher) ||
        (gameState.phase === 'selecting_chair' && isSitter) ||
        (gameState.phase === 'confirming' && isSitter)
    );

    // プレイヤーカード（縦長＋名前タグ＋巨大スコア＋キャラ右上）
    const renderPlayerCard = (
        player: Player | null,
        score: number,
        shocks: number,
        isActive: boolean,
        align: 'left' | 'right',
    ) => {
        const character = getBoxbomCharacter(player?.avatar);

        return (
            <div
                className={`${styles.playerCard} ${align === 'right' ? styles.cardRight : styles.cardLeft} ${isActive ? styles.active : ''}`}
            >
                {/* 名前タグ */}
                <div className={styles.nameTag}>
                    {player?.name ?? '待機中'}
                </div>

                {/* キャラ立ち絵（円形アバター） */}
                <div className={styles.characterIcon}>
                    {character && (
                        <div className={styles.characterImageWrap}>
                            <Image
                                src={character.image}
                                alt={character.name}
                                fill
                                sizes="112px"
                                style={{ objectFit: 'cover' }}
                                unoptimized
                            />
                        </div>
                    )}
                </div>

                {/* 巨大スコア */}
                <div className={styles.scoreValue}>{score}</div>

                {/* ハート行 */}
                <div className={styles.lifeIndicator}>
                    {[0, 1, 2].map(i => (
                        <Image
                            key={i}
                            src={i < 3 - shocks ? asset('/images/boxbom/heart_on.png') : asset('/images/boxbom/heart_off.png')}
                            alt={i < 3 - shocks ? 'life' : 'lost'}
                            width={20}
                            height={20}
                            className={styles.lifeHeart}
                            unoptimized
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.topRow}>
                {renderPlayerCard(player1, p1Score, p1Shocks, isPlayer1Active, 'left')}

                <div className={styles.roundBadge}>
                    <span className={styles.roundLabel}>ROUND</span>
                    <span className={styles.roundNumber}>{round}</span>
                </div>

                {renderPlayerCard(player2, p2Score, p2Shocks, isPlayer2Active, 'right')}
            </div>

            <div className={`${styles.phaseHeader} ${isActionRequired ? styles.actionRequired : ''}`}>
                {getPhaseDisplayText()}
            </div>
        </div>
    );
}
