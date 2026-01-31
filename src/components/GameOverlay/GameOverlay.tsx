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

        return (
            <div className={styles.gameOverOverlay}>
                <div className={`${styles.gameOverTitle} ${isDraw ? styles.draw : isWinner ? styles.win : styles.lose}`}>
                    {isDraw ? 'DRAW' : isWinner ? 'YOU WIN!' : 'YOU LOSE'}
                </div>
                <div className={styles.gameOverReason}>{getWinReasonText()}</div>

                <div className={styles.finalScores}>
                    <div className={styles.finalPlayerScore}>
                        <div className={styles.finalPlayerName}>{player1?.name ?? 'Player 1'}</div>
                        <div className={`${styles.finalScore} ${gameState.winner === player1?.id ? styles.winner : ''}`}>
                            {gameState.player1Score}
                        </div>
                    </div>
                    <div className={styles.finalPlayerScore}>
                        <div className={styles.finalPlayerName}>{player2?.name ?? 'Player 2'}</div>
                        <div className={`${styles.finalScore} ${gameState.winner === player2?.id ? styles.winner : ''}`}>
                            {gameState.player2Score}
                        </div>
                    </div>
                </div>

                <button className={`btn btn-primary ${styles.continuButton}`} onClick={onBackToHome}>
                    ホームに戻る
                </button>
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
                        {revealResult.safe ? 'SAFE!' : 'SHOCK!'}
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
