'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GameState, Player, ChatMessage } from '@/types/game';
import ChairCircle from '@/components/ChairCircle/ChairCircle';
import ScoreBoard from '@/components/ScoreBoard/ScoreBoard';
import StampTray from '@/components/StampTray/StampTray';
import ElectricEffect from '@/components/ElectricEffect/ElectricEffect';
import GameOverlay from '@/components/GameOverlay/GameOverlay';
import RouletteOverlay from '@/components/RouletteOverlay/RouletteOverlay';
import Toast from '@/components/Toast/Toast';
import { getBoxbomCharacter } from '@/lib/gameLogic';
import styles from './GameBoard.module.css';

interface GameBoardProps {
    gameState: GameState;
    player1: Player | null;
    player2: Player | null;
    currentPlayerId: string;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    messages: ChatMessage[];
    onSetTrap: (chairId: number) => void;
    onSelectChair: (chairId: number) => void;
    onConfirmSelection: () => void;
    onNextRound: () => void;
    onSendMessage: (message: string) => void;
    onBackToHome: () => void;
    // プレビュー用: false にすると結果演出(revealing)を自動で送らず保持する
    autoAdvanceReveal?: boolean;
}

export default function GameBoard({
    gameState,
    player1,
    player2,
    currentPlayerId,
    onSetTrap,
    onSelectChair,
    onConfirmSelection,
    onNextRound,
    onSendMessage,
    onBackToHome,
    autoAdvanceReveal = true,
}: GameBoardProps) {
    const [isShocking, setIsShocking] = useState(false);
    // 初期マウント時に既に revealing なら結果を即時算出（SSR/プレビューでも表示できるように）
    const [revealResult, setRevealResult] = useState<{ safe: boolean; points: number } | null>(() => {
        if (gameState.phase === 'revealing') {
            const sel = gameState.chairs.find(c => c.id === gameState.selectedChair);
            return { safe: !!(sel && !sel.isTrapped), points: sel?.id ?? 0 };
        }
        return null;
    });
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const isSitter = gameState.currentSitterId === currentPlayerId;
    const isSwitcher = gameState.currentSwitcherId === currentPlayerId;

    const previousPhaseRef = useRef(gameState.phase);
    const revealTimerRef = useRef<NodeJS.Timeout | null>(null);
    const revealingHandledRef = useRef(false);
    const lastClickTimeRef = useRef<number>(0);
    const CLICK_COOLDOWN_MS = 500;

    // revealing フェーズ処理
    useEffect(() => {
        if (gameState.phase === 'revealing' && !revealingHandledRef.current) {
            revealingHandledRef.current = true;

            const selectedChair = gameState.chairs.find(c => c.id === gameState.selectedChair);
            const isSafe = selectedChair && !selectedChair.isTrapped;

            if (!isSafe) {
                setIsShocking(true);
            }

            setRevealResult({
                safe: !!isSafe,
                points: selectedChair?.id ?? 0,
            });

            // プレビューでは自動送りせず演出を保持する
            if (autoAdvanceReveal) {
                revealTimerRef.current = setTimeout(() => {
                    setIsShocking(false);
                    setRevealResult(null);
                    onNextRound();
                    revealTimerRef.current = null;
                }, 2000);
            }
        }

        if (gameState.phase !== 'revealing') {
            revealingHandledRef.current = false;
            if (revealTimerRef.current) {
                clearTimeout(revealTimerRef.current);
                revealTimerRef.current = null;
            }
        }
    }, [gameState.phase, gameState.chairs, gameState.selectedChair, onNextRound, autoAdvanceReveal]);

    // フェーズ遷移トースト
    useEffect(() => {
        const prevPhase = previousPhaseRef.current;

        if (prevPhase !== gameState.phase) {
            if (prevPhase === 'setting_trap' && gameState.phase === 'selecting_chair' && isSwitcher) {
                setToastMessage('爆弾をセットしました！');
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2000);
            }

            if (prevPhase === 'setting_trap' && gameState.phase === 'selecting_chair' && isSitter) {
                setToastMessage('爆弾がセットされました！箱を選択してください');
                setShowToast(true);
                setTimeout(() => setShowToast(false), 3000);
            }

            previousPhaseRef.current = gameState.phase;
        }
    }, [gameState.phase, isSwitcher, isSitter]);

    const canSelectChair = gameState.phase === 'selecting_chair' && isSitter;
    const canSetTrap = gameState.phase === 'setting_trap' && isSwitcher;

    const handleChairClick = (chairId: number) => {
        const now = Date.now();
        if (now - lastClickTimeRef.current < CLICK_COOLDOWN_MS) return;
        lastClickTimeRef.current = now;

        if (canSetTrap) {
            if (gameState.trappedChair !== chairId) onSetTrap(chairId);
        } else if (canSelectChair) {
            onSelectChair(chairId);
        }
    };

    const activePlayerId = useMemo(() => {
        if (gameState.phase === 'setting_trap') return gameState.currentSwitcherId;
        if (gameState.phase === 'selecting_chair' || gameState.phase === 'confirming') return gameState.currentSitterId;
        return null;
    }, [gameState.phase, gameState.currentSwitcherId, gameState.currentSitterId]);

    const shouldShowRoulette =
        gameState.currentRound === 1 &&
        gameState.phase === 'setting_trap' &&
        !gameState.trappedChair;

    const [showRoulette, setShowRoulette] = useState(shouldShowRoulette);

    useEffect(() => {
        if (!shouldShowRoulette) setShowRoulette(false);
    }, [shouldShowRoulette]);

    const handleRouletteComplete = useCallback(() => setShowRoulette(false), []);

    // 現在の手番側プレイヤー（中央表示用）
    const activePlayer =
        activePlayerId === player1?.id ? player1 :
            activePlayerId === player2?.id ? player2 : null;
    const activeCharacter = getBoxbomCharacter(activePlayer?.avatar);

    return (
        <div className={styles.gameBoard}>
            {showRoulette && player1 && player2 && (
                <RouletteOverlay
                    player1Name={player1.name}
                    player2Name={player2.name}
                    startPlayerName={gameState.currentSwitcherId === player1.id ? player1.name : player2.name}
                    onComplete={handleRouletteComplete}
                />
            )}

            <div className={styles.mainArea}>
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
                            showTrapped={isSwitcher || gameState.phase === 'revealing'}
                            canSelect={canSelectChair || canSetTrap}
                            isShocking={isShocking}
                            shockingChair={gameState.selectedChair}
                            onChairClick={handleChairClick}
                            selectedByName={
                                gameState.currentSitterId === player1?.id
                                    ? player1?.name ?? null
                                    : gameState.currentSitterId === player2?.id
                                        ? player2?.name ?? null
                                        : null
                            }
                            selectedByAvatar={
                                gameState.currentSitterId === player1?.id
                                    ? getBoxbomCharacter(player1?.avatar)?.image ?? null
                                    : gameState.currentSitterId === player2?.id
                                        ? getBoxbomCharacter(player2?.avatar)?.image ?? null
                                        : null
                            }
                            centerContent={
                                // 爆弾セット中: 仕掛け人のキャラを中央表示
                                gameState.phase === 'setting_trap' && activeCharacter ? {
                                    characterImage: activeCharacter.image,
                                    characterName: activePlayer?.name ?? null,
                                } : undefined
                            }
                        />
                    </div>
                </div>
            </div>

            {/* アクションボタン (固定フッター) */}
            <div className={styles.gameFooter}>
                <button
                    className={`${styles.footerButton} ${(canSetTrap || canSelectChair) ? '' : styles.disabledButton}`}
                    disabled={
                        !(canSetTrap || canSelectChair) ||
                        (canSetTrap && !gameState.trappedChair) ||
                        (canSelectChair && !gameState.selectedChair)
                    }
                    onClick={() => {
                        const now = Date.now();
                        if (now - lastClickTimeRef.current < CLICK_COOLDOWN_MS) return;
                        lastClickTimeRef.current = now;

                        if (canSetTrap && gameState.trappedChair) onSetTrap(gameState.trappedChair);
                        else if (canSelectChair) onConfirmSelection();
                    }}
                >
                    けってい！
                </button>
            </div>

            {/* スタンプトレイ (下部) */}
            <div className={styles.stampTrayWrapper}>
                <StampTray
                    myAvatar={
                        currentPlayerId === player1?.id ? player1?.avatar ?? null :
                            currentPlayerId === player2?.id ? player2?.avatar ?? null :
                                null
                    }
                    onSendStamp={(stampId) => onSendMessage(`:stamp:${stampId}`)}
                />
            </div>

            {/* 感電エフェクト */}
            <ElectricEffect isActive={isShocking} />

            {/* オーバーレイ */}
            <GameOverlay
                gameState={gameState}
                player1={player1}
                player2={player2}
                currentPlayerId={currentPlayerId}
                revealResult={revealResult}
                onContinue={onNextRound}
                onBackToHome={onBackToHome}
            />

            <Toast message={toastMessage} isVisible={showToast} />
        </div>
    );
}
