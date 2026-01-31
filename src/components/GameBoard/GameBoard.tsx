'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GameState, Player, ChatMessage, Chair } from '@/types/game';
import ChairCircle from '@/components/ChairCircle/ChairCircle';
import Character from '@/components/Character/Character';
import ScoreBoard from '@/components/ScoreBoard/ScoreBoard';
import Chat from '@/components/Chat/Chat';
import ElectricEffect from '@/components/ElectricEffect/ElectricEffect';
import GameOverlay from '@/components/GameOverlay/GameOverlay';
import RouletteOverlay from '@/components/RouletteOverlay/RouletteOverlay';
import Toast from '@/components/Toast/Toast';
import styles from './GameBoard.module.css';

interface GameBoardProps {
    gameState: GameState;
    player1: Player | null;
    player2: Player | null;
    currentPlayerId: string;
    messages: ChatMessage[];
    onSetTrap: (chairId: number) => void;
    onSelectChair: (chairId: number) => void;
    onConfirmSelection: () => void;
    onNextRound: () => void;
    onSendMessage: (message: string) => void;
    onBackToHome: () => void;
}

export default function GameBoard({
    gameState,
    player1,
    player2,
    currentPlayerId,
    messages,
    onSetTrap,
    onSelectChair,
    onConfirmSelection,
    onNextRound,
    onSendMessage,
    onBackToHome,
}: GameBoardProps) {
    const [isShocking, setIsShocking] = useState(false);

    // 復元: 結果表示用のstate
    const [revealResult, setRevealResult] = useState<{ safe: boolean; points: number } | null>(null);

    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const isSitter = gameState.currentSitterId === currentPlayerId;
    const isSwitcher = gameState.currentSwitcherId === currentPlayerId;

    // 前回のフェーズを追跡するためのRef
    const previousPhaseRef = useRef(gameState.phase);
    // タイマー管理用のRef
    const revealTimerRef = useRef<NodeJS.Timeout | null>(null);

    // 椅子の位置を計算
    const getChairPosition = useCallback((chairId: number, totalChairs: number) => {
        const index = chairId - 1;
        const radius = 42;
        const angle = (index / totalChairs) * 2 * Math.PI - Math.PI / 2;
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);
        return { x, y };
    }, []);

    // フェーズ変化の処理（結果表示 + トースト通知）
    useEffect(() => {
        const prevPhase = previousPhaseRef.current;

        // フェーズが変わったときのみ処理
        if (prevPhase !== gameState.phase) {
            // 前のタイマーをクリア
            if (revealTimerRef.current) {
                clearTimeout(revealTimerRef.current);
                revealTimerRef.current = null;
            }

            // revealing フェーズに入った時の処理
            if (gameState.phase === 'revealing') {
                const selectedChair = gameState.chairs.find(c => c.id === gameState.selectedChair);
                const isSafe = selectedChair && !selectedChair.isTrapped;

                if (!isSafe) {
                    setIsShocking(true);
                }

                setRevealResult({
                    safe: !!isSafe,
                    points: selectedChair?.id ?? 0,
                });

                // 結果表示後に次のラウンドへ (2秒) - Refに保存
                revealTimerRef.current = setTimeout(() => {
                    setIsShocking(false);
                    setRevealResult(null);
                    onNextRound();
                    revealTimerRef.current = null;
                }, 2000);
            }

            // 爆弾セット完了通知（仕掛け人へ）
            if (prevPhase === 'setting_trap' && gameState.phase === 'selecting_chair' && isSwitcher) {
                setToastMessage('爆弾をセットしました！');
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2000);
            }

            // 爆弾セット完了通知（解除役へ）
            if (prevPhase === 'setting_trap' && gameState.phase === 'selecting_chair' && isSitter) {
                setToastMessage('爆弾がセットされました！箱を選択してください');
                setShowToast(true);
                setTimeout(() => setShowToast(false), 3000);
            }

            // Refを更新
            previousPhaseRef.current = gameState.phase;
        }

        // クリーンアップ（コンポーネントのアンマウント時のみ）
        return () => {
            if (revealTimerRef.current) {
                clearTimeout(revealTimerRef.current);
            }
        };
    }, [gameState.phase]); // 依存配列を最小限に - phaseのみで十分

    // 現在のプレイヤーの役割
    const currentPlayerRole = useMemo(() => {
        if (isSitter) return 'sitter';
        if (isSwitcher) return 'switcher';
        return null;
    }, [isSitter, isSwitcher]);

    // キャラクター位置
    const sitterPosition = useMemo(() => {
        if (gameState.selectedChair) {
            return getChairPosition(gameState.selectedChair, 12);
        }
        return { x: 50, y: 50 };
    }, [gameState.selectedChair, getChairPosition]);

    // フェーズに応じたテキスト
    const getPhaseText = () => {
        const opponentName = isSitter ? (player2?.name ?? '相手') : (player1?.name ?? '相手');
        const switcherName = isSwitcher ? 'あなた' : (gameState.currentSwitcherId === player1?.id ? player1.name : player2?.name);
        const sitterName = isSitter ? 'あなた' : (gameState.currentSitterId === player1?.id ? player1.name : player2?.name);

        switch (gameState.phase) {
            case 'setting_trap':
                return isSwitcher
                    ? '爆弾をセット'
                    : `${switcherName}が\n爆弾設置中`;
            case 'selecting_chair':
                return isSitter
                    ? '開ける箱を選択'
                    : `${sitterName}が\n箱を選択中`;
            case 'confirming':
                return isSitter
                    ? '確定しますか？'
                    : `${sitterName}が決定を検討中...`;
            case 'revealing':
                return '結果発表...';
            case 'round_end':
                return '次のラウンドへ...';
            case 'game_over':
                return 'ゲーム終了';
            default:
                return '';
        }
    };

    const canSelectChair = gameState.phase === 'selecting_chair' && isSitter;
    const canSetTrap = gameState.phase === 'setting_trap' && isSwitcher;

    const getTargetPosition = useCallback((player: Player, isSelf: boolean) => {
        const isPlayerSitter = gameState.currentSitterId === player.id;

        if (isPlayerSitter) {
            // Sitter: 選んだ椅子があればそこへ
            return gameState.selectedChair
                ? getChairPosition(gameState.selectedChair, 12)
                : { x: 50, y: 50 };
        } else {
            // Switcher: トラップ設置中も移動しない（定位置）
            return { x: player.playerNumber === 1 ? 10 : 90, y: 85 };
        }
    }, [gameState.currentSitterId, gameState.selectedChair, getChairPosition]);

    const handleChairClick = (chairId: number) => {
        if (canSetTrap) {
            onSetTrap(chairId);
        } else if (canSelectChair) {
            onSelectChair(chairId);
        }
    };

    // アクティブなプレイヤー（手番）を特定
    const activePlayerId = useMemo(() => {
        if (gameState.phase === 'setting_trap') return gameState.currentSwitcherId;
        if (gameState.phase === 'selecting_chair' || gameState.phase === 'confirming') return gameState.currentSitterId;
        return null; // revealing, etc.
    }, [gameState.phase, gameState.currentSwitcherId, gameState.currentSitterId]);

    const activePlayerColorClass = useMemo(() => {
        if (!activePlayerId) return '';
        if (activePlayerId === player1?.id) return styles.textPlayer1;
        if (activePlayerId === player2?.id) return styles.textPlayer2;
        return '';
    }, [activePlayerId, player1?.id, player2?.id]);

    // キャラクターの表示条件
    const showPlayer1 = useMemo(() => {
        // 爆弾セット中は表示しない
        if (gameState.phase === 'setting_trap') return false;

        // アクション中（選択・結果）は、座る側（Sitter）のみ表示
        if (['selecting_chair', 'confirming', 'revealing'].includes(gameState.phase)) {
            return gameState.currentSitterId === player1?.id;
        }

        // それ以外（ゲーム終了など）は表示
        return true;
    }, [gameState.phase, gameState.currentSitterId, player1?.id]);

    const showPlayer2 = useMemo(() => {
        // 爆弾セット中は表示しない
        if (gameState.phase === 'setting_trap') return false;

        // アクション中（選択・結果）は、座る側（Sitter）のみ表示
        if (['selecting_chair', 'confirming', 'revealing'].includes(gameState.phase)) {
            return gameState.currentSitterId === player2?.id;
        }

        return true;
    }, [gameState.phase, gameState.currentSitterId, player2?.id]);

    // ルーレット表示ロジック
    const shouldShowRoulette =
        gameState.currentRound === 1 &&
        gameState.phase === 'setting_trap' &&
        !gameState.trappedChair;

    const [showRoulette, setShowRoulette] = useState(shouldShowRoulette);

    useEffect(() => {
        if (!shouldShowRoulette) {
            setShowRoulette(false);
        }
    }, [shouldShowRoulette]);

    const handleRouletteComplete = useCallback(() => {
        setShowRoulette(false);
    }, []);

    // アクティブなプレイヤーに応じた背景クラス
    const mainAreaClass = useMemo(() => {
        if (activePlayerId === player1?.id) return `${styles.mainArea} ${styles.turnPlayer1}`;
        if (activePlayerId === player2?.id) return `${styles.mainArea} ${styles.turnPlayer2}`;
        return styles.mainArea;
    }, [activePlayerId, player1?.id, player2?.id]);

    return (
        <div className={styles.gameBoard}>
            {/* ルーレット（先行決め） */}
            {showRoulette && player1 && player2 && (
                <RouletteOverlay
                    player1Name={player1.name}
                    player2Name={player2.name}
                    startPlayerName={gameState.currentSwitcherId === player1.id ? player1.name : player2.name}
                    onComplete={handleRouletteComplete}
                />
            )}

            {/* メインエリア: スコアボード + ゲーム画面 */}
            <div className={mainAreaClass}>
                {/* スコアボードをここへ移動 */}
                <ScoreBoard
                    player1={player1}
                    player2={player2}
                    gameState={gameState}
                    currentPlayerId={currentPlayerId}
                />

                <div className={styles.gameArea}>
                    <div className={styles.gameContainer}>
                        <ChairCircle
                            chairs={gameState.chairs}
                            selectedChair={gameState.selectedChair}
                            trappedChair={gameState.trappedChair}
                            showTrapped={isSwitcher}
                            canSelect={canSelectChair || canSetTrap}
                            isShocking={isShocking}
                            shockingChair={gameState.selectedChair}
                            onChairClick={handleChairClick}
                            centerContent={undefined}
                        />

                        {/* キャラクター表示 */}
                        {player1 && showPlayer1 && (
                            <Character
                                name={player1.name}
                                avatar={player1.avatar}
                                playerNumber={1}
                                role={gameState.currentSitterId === player1.id ? 'sitter' : 'switcher'}
                                targetPosition={getTargetPosition(player1, currentPlayerId === player1.id)}
                                isShocking={isShocking && gameState.currentSitterId === player1.id}
                            />
                        )}
                        {player2 && showPlayer2 && (
                            <Character
                                name={player2.name}
                                avatar={player2.avatar}
                                playerNumber={2}
                                role={gameState.currentSitterId === player2.id ? 'sitter' : 'switcher'}
                                targetPosition={getTargetPosition(player2, currentPlayerId === player2.id)}
                                isShocking={isShocking && gameState.currentSitterId === player2.id}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* 固定フッター (アクション & チャット) */}
            <div className={styles.gameFooter}>
                {(canSetTrap || canSelectChair) ? (
                    <button
                        className={`${styles.footerButton} ${canSetTrap ? styles.danger : ''}`}
                        disabled={
                            (canSetTrap && !gameState.trappedChair) ||
                            (canSelectChair && !gameState.selectedChair)
                        }
                        onClick={() => {
                            if (canSetTrap && gameState.trappedChair) {
                                onSetTrap(gameState.trappedChair);
                            } else if (canSelectChair) {
                                onConfirmSelection();
                            }
                        }}
                    >
                        {canSetTrap ? '爆弾をセットする' : 'この箱にする'}
                    </button>
                ) : (
                    /* アクションがない時はダミー要素で高さを確保するか、空にしておく（チャットは右寄せ） */
                    <div />
                )}

                {/* チャット (Embedded) */}
                <Chat
                    messages={messages}
                    currentPlayerId={currentPlayerId}
                    onSendMessage={onSendMessage}
                    embedded={true}
                />
            </div>

            {/* 感電エフェクト */}
            <ElectricEffect isActive={isShocking} />

            {/* チャット (Floating Removed) */}

            {/* オーバーレイ（結果表示、ゲームオーバー） */}
            <GameOverlay
                gameState={gameState}
                player1={player1}
                player2={player2}
                currentPlayerId={currentPlayerId}
                revealResult={revealResult}
                onContinue={onNextRound}
                onBackToHome={onBackToHome}
            />

            {/* トースト通知 */}
            <Toast message={toastMessage} isVisible={showToast} />
        </div>
    );
}
