'use client';

import { GameState, Player } from '@/types/game';
import styles from './GameOverlay.module.css';

interface GameOverlayProps {
    gameState: GameState;
    player1: Player | null;
    player2: Player | null;
    currentPlayerId: string;
    revealResult: { safe: boolean; points: number } | null;
    onContinue: () => void;
    onBackToHome: () => void;
}

export default function GameOverlay({
    gameState,
    player1,
    player2,
    currentPlayerId,
    revealResult,
    onContinue,
    onBackToHome,
}: GameOverlayProps) {
    // ゲームオーバー画面
    if (gameState.phase === 'game_over') {
        const isWinner = gameState.winner === currentPlayerId;
        const isDraw = gameState.winner === null && gameState.winReason === 'last_chair';

        const getWinReasonText = () => {
            switch (gameState.winReason) {
                case 'score':
                    return '40点達成！';
                case 'shock':
                    return '3回感電...';
                case 'last_chair':
                    return '残り1脚 - 最終判定';
                default:
                    return '';
            }
        };

        const winnerPlayer = gameState.winner === player1?.id ? player1 : gameState.winner === player2?.id ? player2 : null;
        const resultClass = isDraw ? styles.draw : isWinner ? styles.win : styles.lose;

        return (
            <div className={styles.gameOverOverlay}>
                <div className={styles.resultContainer}>
                    <div className={styles.resultHeader}>
                        {winnerPlayer && (
                            <div className={styles.winnerAvatar}>
                                {winnerPlayer.avatar}
                            </div>
                        )}
                        <h1 className={`${styles.resultTitle} ${resultClass}`}>
                            {isDraw ? '引き分け' : isWinner ? '勝利' : '敗北'}
                        </h1>
                        <div className={styles.winReason}>{getWinReasonText()}</div>
                    </div>

                    <div className={styles.scoreSummary}>
                        <div className={`${styles.playerBlock} ${gameState.winner === player1?.id ? styles.winner : ''}`}>
                            <div className={styles.playerName}>{player1?.name}</div>
                            <div className={styles.scoreValue}>{gameState.player1Score}</div>
                        </div>
                        <div className={styles.vsLabel}>VS</div>
                        <div className={`${styles.playerBlock} ${gameState.winner === player2?.id ? styles.winner : ''}`}>
                            <div className={styles.playerName}>{player2?.name}</div>
                            <div className={styles.scoreValue}>{gameState.player2Score}</div>
                        </div>
                    </div>

                    <div className={styles.actionButtons}>
                        <button className={styles.homeButton} onClick={onBackToHome}>
                            HOMEへ戻る
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 結果表示画面
    if (gameState.phase === 'revealing' && revealResult) {
        return (
            <div className={styles.resultOverlay}>
                <div className={styles.resultContent}>
                    <div className={styles.resultIcon}>
                        {revealResult.safe ? '✅' : '⚡'}
                    </div>
                    <div className={`${styles.resultTitle} ${revealResult.safe ? styles.safe : styles.shock}`}>
                        {revealResult.safe ? 'セーフ！' : '爆発！'}
                    </div>
                    {revealResult.safe ? (
                        <div className={styles.pointsGained}>+{revealResult.points} Points</div>
                    ) : (
                        <div className={styles.pointsLost}>得点リセット</div>
                    )}
                </div>
            </div>
        );
    }

    return null;
}
