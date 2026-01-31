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
        // 現在のプレイヤーが「開けた人(Sitter)」かどうか
        const isOpener = gameState.currentSitterId === currentPlayerId;

        let titleText = '';
        let titleStyle = '';
        let resultIcon = '';

        if (revealResult.safe) {
            // セーフの場合
            if (isOpener) {
                titleText = `${revealResult.points}ポイントGET！`;
                titleStyle = styles.safe;
                resultIcon = '🎉'; // 自分が獲得→嬉しい
            } else {
                titleText = `相手が${revealResult.points}ポイント獲得...`;
                titleStyle = styles.shock;
                resultIcon = '😢'; // 相手が獲得→悲しい
            }
        } else {
            // アウト（爆発）の場合
            if (isOpener) {
                titleText = '爆発！';
                titleStyle = styles.shock;
                resultIcon = '💥'; // 自分が爆発→ショック
            } else {
                titleText = '爆破成功！';
                titleStyle = styles.safe;
                resultIcon = '😈'; // 相手を爆破→嬉しい
            }
        }

        return (
            <div className={styles.resultOverlay}>
                <div className={styles.resultContent}>
                    <div className={styles.resultIcon}>
                        {resultIcon}
                    </div>
                    <div className={`${styles.resultTitle} ${titleStyle}`}>
                        {titleText}
                    </div>
                    {!revealResult.safe && isOpener && (
                        <div className={styles.pointsLost}>得点リセット</div>
                    )}
                </div>
            </div>
        );
    }

    return null;
}
