'use client';

import { Player, GameState } from '@/types/game';
import { getAvatarDisplay } from '@/lib/gameLogic';
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

    // 自分の役割判定
    const isSwitcher = gameState?.currentSwitcherId === currentPlayerId;
    const isSitter = gameState?.currentSitterId === currentPlayerId;

    // フェーズ表示用テキスト
    const getPhaseDisplayText = () => {
        if (!gameState) return 'LOADING...';
        switch (gameState.phase) {
            case 'setting_trap':
                return isSwitcher ? '爆弾をセットしてください' : '相手が爆弾をセット中';
            case 'selecting_chair':
                return isSitter ? '箱をえらんでください' : '相手が箱を選んでいます';
            case 'confirming':
                return isSitter ? '決定しますか？' : '相手が確認中...';
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

    // フェーズヘッダーのスタイル判定
    const getPhaseClass = () => {
        if (!gameState) return '';
        // 自分のアクションが必要なフェーズ（目立たせる）
        if ((gameState.phase === 'setting_trap' && isSwitcher) ||
            (gameState.phase === 'selecting_chair' && isSitter) ||
            (gameState.phase === 'confirming' && isSitter)) {
            return styles.phaseAction; // 青/赤など明るい色
        }
        // 待機フェーズ（暗めにする、または警告色）
        if ((gameState.phase === 'setting_trap' && !isSwitcher) ||
            (gameState.phase === 'selecting_chair' && !isSitter) ||
            (gameState.phase === 'confirming' && !isSitter)) {
            return styles.phaseWait;
        }
        return '';
    };

    // アバター描画ヘルパー
    const renderAvatar = (avatar: string | undefined) => {
        const { type, value } = getAvatarDisplay(avatar);
        if (type === 'image') {
            return (
                <img
                    src={value}
                    alt={avatar || "Avatar"}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        // Show text fallback instead
                        const span = document.createElement('span');
                        span.textContent = avatar?.substring(0, 1) || '?';
                        e.currentTarget.parentElement?.appendChild(span);
                    }}
                />
            );
        }
        return value;
    };

    return (
        <div className={`${styles.container} ${getPhaseClass()}`}>
            {/* Phase Header */}
            <div className={styles.phaseHeader}>
                {getPhaseDisplayText()}
            </div>

            {/* Scores */}
            <div className={styles.scoreBoard}>
                {/* Player 1 */}
                <div className={`${styles.playerScore} ${isPlayer1Active ? styles.active : ''}`}>
                    <div className={styles.playerContent}>
                        <div className={styles.avatar}>{renderAvatar(player1?.avatar)}</div>
                        <div className={styles.playerInfo}>
                            <span className={styles.playerName}>{player1?.name ?? '待機中'}</span>
                            <div className={styles.statsRow}>
                                <span className={styles.scoreValue}>{p1Score}</span>
                                <div className={styles.lifeIndicator}>
                                    {[0, 1, 2].map(i => (
                                        <div key={i} className={`${styles.lifeHeart} ${i >= (3 - p1Shocks) ? styles.lost : ''}`}>❤️</div>
                                    ))}
                                </div>
                            </div>
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
                    <div className={styles.playerContent}>
                        <div className={styles.avatar}>{renderAvatar(player2?.avatar)}</div>
                        <div className={styles.playerInfo}>
                            <span className={styles.playerName}>{player2?.name ?? '待機中'}</span>
                            <div className={styles.statsRow}>
                                <span className={styles.scoreValue}>{p2Score}</span>
                                <div className={styles.lifeIndicator}>
                                    {[0, 1, 2].map(i => (
                                        <div key={i} className={`${styles.lifeHeart} ${i >= (3 - p2Shocks) ? styles.lost : ''}`}>❤️</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
