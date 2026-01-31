'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGameState } from '@/hooks/useGameState';
import Lobby from '@/components/Lobby/Lobby';
import GameBoard from '@/components/GameBoard/GameBoard';
import styles from './page.module.css';

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomCode = params.code as string;

    const [playerId, setPlayerId] = useState<string>('');
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const storedPlayerId = sessionStorage.getItem('playerId');
        if (!storedPlayerId) {
            router.push('/');
            return;
        }
        setPlayerId(storedPlayerId);
    }, [router]);

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
    } = useGameState({ roomCode, playerId });

    const handleLeaveRoom = async () => {
        await leaveRoom();
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
                <button className="btn btn-primary" onClick={() => router.push('/')}>
                    ホームに戻る
                </button>
            </div>
        );
    }

    if (!room) {
        return (
            <div className={styles.error}>
                <h2>ルームが見つかりません</h2>
                <button className="btn btn-primary" onClick={() => router.push('/')}>
                    ホームに戻る
                </button>
            </div>
        );
    }

    // ゲーム中
    if (room.status === 'playing' && gameState) {
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
