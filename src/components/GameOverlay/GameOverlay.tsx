'use client';

import Image from 'next/image';
import { GameState, Player } from '@/types/game';
import { getBoxbomCharacter } from '@/lib/gameLogic';
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
    // プレイヤーカード描画（結果画面用ミニ版）
    const renderMiniCard = (player: Player | null, score: number, shocks: number, align: 'left' | 'right') => {
        if (!player) return null;
        const character = getBoxbomCharacter(player.avatar);
        return (
            <div
                className={`${styles.miniCard} ${align === 'right' ? styles.miniCardRight : ''}`}
                style={{ background: align === 'left' ? '#FF2D55' : '#9b59b6' }}
            >
                <div className={styles.miniCardName}>{player.name}</div>
                <div className={styles.miniCardScore}>{score}</div>
                <div className={styles.miniCardHearts}>
                    {[0, 1, 2].map(i => (
                        <Image
                            key={i}
                            src={i < 3 - shocks ? '/images/boxbom/heart_on.png' : '/images/boxbom/heart_off.png'}
                            alt=""
                            width={16}
                            height={16}
                            unoptimized
                        />
                    ))}
                </div>
                {character && (
                    <div className={styles.miniCardChar}>
                        <Image src={character.image} alt={character.name} width={48} height={48} unoptimized />
                    </div>
                )}
            </div>
        );
    };

    // ゲームオーバー画面
    if (gameState.phase === 'game_over') {
        const isWinner = gameState.winner === currentPlayerId;
        const isDraw = gameState.winner === null && gameState.winReason === 'last_chair';

        const getWinReasonText = () => {
            switch (gameState.winReason) {
                case 'score': return '40点達成！';
                case 'shock': return '感電でKO...';
                case 'last_chair': return '最終判定';
                default: return '';
            }
        };

        const winnerPlayer = gameState.winner === player1?.id ? player1 : gameState.winner === player2?.id ? player2 : null;
        const winnerChar = winnerPlayer ? getBoxbomCharacter(winnerPlayer.avatar) : null;
        const resultClass = isDraw ? styles.draw : isWinner ? styles.win : styles.lose;

        return (
            <div className={styles.gameOverOverlay}>
                <div className={styles.resultContainer}>
                    <div className={styles.resultHeader}>
                        {winnerChar && (
                            <div className={styles.winnerAvatar}>
                                <Image src={winnerChar.image} alt={winnerChar.name} width={120} height={120} unoptimized />
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

    // 結果表示画面（revealing フェーズ）
    if (gameState.phase === 'revealing' && revealResult) {
        const sitter =
            gameState.currentSitterId === player1?.id ? player1 :
                gameState.currentSitterId === player2?.id ? player2 : null;
        const sitterName = sitter?.name ?? '相手';
        const round = gameState.currentRound ?? 1;

        if (revealResult.safe) {
            // SAFE 画面
            return (
                <div className={`${styles.resultOverlay} ${styles.safeBg}`}>
                    <div className={styles.bgImage}>
                        <Image src="/images/boxbom/bg_safe.png" alt="" fill style={{ objectFit: 'cover' }} unoptimized />
                    </div>
                    <div className={styles.resultContent}>
                        <div className={styles.headerLogo}>
                            <Image src="/images/boxbom/safe.png" alt="SAFE!" width={400} height={180} unoptimized />
                        </div>
                        <div className={styles.openedBox}>
                            <Image src="/images/boxbom/box_off.png" alt="" width={120} height={120} unoptimized />
                            <span className={styles.openedBoxNumber}>{revealResult.points}</span>
                        </div>
                        <div className={styles.resultMessage}>
                            <div className={styles.resultRound}>ROUND {round}</div>
                            <div className={styles.resultDetail}>
                                {sitterName}が箱アケ成功！<br />
                                <span className={styles.resultHighlight}>+{revealResult.points}ポイントGET！</span>
                            </div>
                        </div>

                        <div className={styles.resultScoreRow}>
                            {renderMiniCard(player1, gameState.player1Score, gameState.player1Shocks, 'left')}
                            {renderMiniCard(player2, gameState.player2Score, gameState.player2Shocks, 'right')}
                        </div>

                        <button className={styles.nextButton} onClick={onContinue}>つぎへ</button>
                    </div>
                </div>
            );
        }

        // BOOM 画面
        return (
            <div className={`${styles.resultOverlay} ${styles.boomBg}`}>
                <div className={styles.bgImage}>
                    <Image src="/images/boxbom/explosion.png" alt="" fill style={{ objectFit: 'cover' }} unoptimized />
                </div>
                <div className={styles.resultContent}>
                    <div className={styles.headerLogo}>
                        <Image src="/images/boxbom/boom.png" alt="BOOM!!" width={500} height={250} unoptimized priority />
                    </div>
                    <div className={styles.resultMessage}>
                        <div className={styles.resultRound}>ROUND {round}</div>
                        <div className={styles.resultDetail}>
                            {sitterName}が爆発！<br />
                            <span className={styles.resultHighlight}>ハート-1とポイント0に</span>
                        </div>
                    </div>

                    <div className={styles.resultScoreRow}>
                        {renderMiniCard(player1, gameState.player1Score, gameState.player1Shocks, 'left')}
                        {renderMiniCard(player2, gameState.player2Score, gameState.player2Shocks, 'right')}
                    </div>

                    <button className={styles.nextButton} onClick={onContinue}>つぎへ</button>
                </div>
            </div>
        );
    }

    return null;
}
