'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGameState } from '@/hooks/useGameState';
import Lobby from '@/components/Lobby/Lobby';
import GameBoard from '@/components/GameBoard/GameBoard';
import styles from './page.module.css';

function RoomContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roomCode = (searchParams.get('code') ?? '').toUpperCase();

    const [playerId, setPlayerId] = useState<string>('');
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        // 再参加フラグがある場合はセッションを無視（クリア）して選択画面へ
        const isRejoin = searchParams.get('rejoin');
        if (isRejoin) {
            sessionStorage.removeItem('playerId');
            sessionStorage.removeItem('playerName');
            setIsClient(true);
            return;
        }

        const storedPlayerId = sessionStorage.getItem('playerId');
        if (storedPlayerId) {
            setPlayerId(storedPlayerId);
        }
        setIsClient(true);
    }, [searchParams]);

    const {
        room,
        players,
        gameState,
        messages,
        loading,
        error,
        isHost,
        startGame,
        setTrap,
        selectChair,
        confirmSelection,
        nextRound,
        sendMessage,
        leaveRoom,
    } = useGameState({ roomCode, playerId, ready: isClient });

    // プレイヤー検証 & リダイレクト制御
    useEffect(() => {
        if (!loading && room) {
            // 1. セッション切れのプレイヤーIDが残っている場合は削除
            if (playerId && players.length > 0 && !players.some(p => p.id === playerId)) {
                sessionStorage.removeItem('playerId');
                sessionStorage.removeItem('playerName');
                setPlayerId('');
                return;
            }

            // 2. セッションがなく、かつルームが待機中なら -> 参加画面へ
            if (!playerId && room.status === 'waiting') {
                router.push(`/?join=${roomCode}`);
                return;
            }

            // 3. ゲーム中だがセッションがない場合は下のレンダリング側で弾く
        }
    }, [loading, room, players, playerId, roomCode, router]);

    const handleLeaveRoom = () => {
        leaveRoom();
        sessionStorage.removeItem('playerId');
        sessionStorage.removeItem('playerName');
        router.push('/');
    };

    const handleBackToHome = () => {
        sessionStorage.removeItem('playerId');
        sessionStorage.removeItem('playerName');
        router.push('/');
    };

    if (!isClient) {
        return null;
    }

    if (!roomCode) {
        return (
            <div className={styles.error}>
                <h2>ルームコードがありません</h2>
                <button className={styles.homeButton} onClick={() => router.push('/')}>
                    ホームに戻る
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.loadingSpinner} />
                <span>読み込み中...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.error}>
                <h2>エラー</h2>
                <p>{error}</p>
                <button className={styles.homeButton} onClick={() => router.push('/')}>
                    ホームに戻る
                </button>
            </div>
        );
    }

    if (!room) {
        return (
            <div className={styles.error}>
                <h2>ルームが見つかりません</h2>
                <p>ルームの有効期限が切れたか、ホストが退出した可能性があります。</p>
                <button className={styles.homeButton} onClick={() => router.push('/')}>
                    ホームに戻る
                </button>
            </div>
        );
    }

    // ゲーム中または終了後（リザルト表示）
    if ((room.status === 'playing' || room.status === 'finished') && gameState) {
        // Strict Mode: セッションがない場合はアクセス拒否
        if (!playerId) {
            return (
                <div className={styles.error}>
                    <h2>ゲーム進行中</h2>
                    <p>
                        現在ゲームが進行中のため、途中参加はできません。<br />
                        （ブラウザを閉じたりリロードすると復帰できない場合があります）
                    </p>
                    <button className={styles.homeButton} onClick={() => router.push('/')}>
                        ホームに戻る
                    </button>
                </div>
            );
        }

        const player1 = players.find(p => p.playerNumber === 1) ?? null;
        const player2 = players.find(p => p.playerNumber === 2) ?? null;

        return (
            <GameBoard
                gameState={gameState}
                player1={player1}
                player2={player2}
                currentPlayerId={playerId}
                messages={messages}
                onSetTrap={setTrap}
                onSelectChair={selectChair}
                onConfirmSelection={confirmSelection}
                onNextRound={nextRound}
                onSendMessage={sendMessage}
                onBackToHome={handleBackToHome}
            />
        );
    }

    // ロビー
    return (
        <Lobby
            room={room}
            players={players}
            currentPlayerId={playerId}
            isHost={isHost}
            onStartGame={startGame}
            onLeaveRoom={handleLeaveRoom}
        />
    );
}

export default function RoomPage() {
    return (
        <Suspense fallback={null}>
            <RoomContent />
        </Suspense>
    );
}
