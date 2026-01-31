'use client';

import { Player, GameState } from '@/types/game';
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
    const isHalfFront = gameState?.isHalfFront ?? true;

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

    // フェーズ表示用テキスト
    const getPhaseDisplayText = () => {
        if (!gameState) return 'LOADING...';
        switch (gameState.phase) {
            case 'setting_trap':
                return 'SETTING TRAP';
            case 'selecting_chair':
                return 'SELECT BOX';
            case 'confirming':
                return 'CONFIRMING...';
            case 'revealing':
                return 'RESULT';
            case 'round_end':
                return 'NEXT ROUND';
            case 'game_over':
                return 'GAME OVER';
            default:
                return '';
        }
    };

    return (
        <div className={styles.container}>
            {/* Phase Header */}
            <div className={styles.phaseHeader}>
                {getPhaseDisplayText()}
            </div>

            {/* Scores */}
            <div className={styles.scoreBoard}>
                {/* Player 1 */}
                <div className={`${styles.playerScore} ${isPlayer1Active ? styles.active : ''}`}>
                    <div className={styles.playerTopRow}>
                        <div className={styles.avatar}>{player1?.avatar ?? '?'}</div>
                        <div className={styles.scoreValue}>{p1Score}</div>
                    </div>
                    <div className={styles.playerBottomRow}>
                        <span className={styles.playerName}>{player1?.name ?? '待機中...'}</span>
                        <div className={styles.lifeIndicator}>
                            {[0, 1, 2].map(i => (
                                <div
                                    key={i}
                                    className={`${styles.lifeHeart} ${i >= (3 - p1Shocks) ? styles.lost : ''}`}
                                >
                                    ❤️
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Round Info */}
                <div className={styles.roundInfo}>
                    <span className={styles.roundLabel}>ROUND</span>
                    <span className={styles.roundValue}>{round}</span>
                </div>

                {/* Player 2 */}
                <div className={`${styles.playerScore} ${styles.player2} ${isPlayer2Active ? styles.active : ''}`}>
                    <div className={styles.playerTopRow}>
                        <div className={styles.scoreValue}>{p2Score}</div>
                        <div className={styles.avatar}>{player2?.avatar ?? '?'}</div>
                    </div>
                    <div className={styles.playerBottomRow}>
                        <div className={styles.lifeIndicator}>
                            {[0, 1, 2].map(i => (
                                <div
                                    key={i}
                                    className={`${styles.lifeHeart} ${i >= (3 - p2Shocks) ? styles.lost : ''}`}
                                >
                                    ❤️
                                </div>
                            ))}
                        </div>
                        <span className={styles.playerName}>{player2?.name ?? '待機中...'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
