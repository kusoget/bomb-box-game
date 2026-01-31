'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useGameState } from '@/hooks/useGameState';
import Lobby from '@/components/Lobby/Lobby';
import GameBoard from '@/components/GameBoard/GameBoard';
import styles from './page.module.css';

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const roomCode = params.code as string;

    const [playerId, setPlayerId] = useState<string>('');
    const [isClient, setIsClient] = useState(false);




    useEffect(() => {
        setIsClient(true);

        // 再参加フラグがある場合はセッションを無視（クリア）して選択画面へ
        const isRejoin = searchParams.get('rejoin');
        if (isRejoin) {
            sessionStorage.removeItem('playerId');
            sessionStorage.removeItem('playerName');
            return;
        }

        const storedPlayerId = sessionStorage.getItem('playerId');
        if (storedPlayerId) {
            setPlayerId(storedPlayerId);
        }
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
    } = useGameState({ roomCode, playerId });

    // プレイヤー検証 & リダイレクト制御
    useEffect(() => {
        // ロード完了後
        if (!loading && room) {
            // 1. セッション切れのプレイヤーIDが残っている場合は削除
            if (playerId && players.length > 0 && !players.some(p => p.id === playerId)) {
                sessionStorage.removeItem('playerId');
                sessionStorage.removeItem('playerName');
                setPlayerId(''); // stateもクリア
                return;
            }

            // 2. セッションがなく、かつルームが待機中なら -> 参加画面へ
            if (!playerId && room.status === 'waiting') {
                router.push(`/?join=${roomCode}`);
                return;
            }

            // 3. ゲーム中だがセッションがない場合 -> 参加不可（観戦モード的なものがないならエラー）
            // "Strict Mode": 再入場不可
            // リダイレクト等はしないが、レンダリング側で弾く
        }
    }, [loading, room, players, playerId, roomCode, router]);

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

    // ゲーム中または終了後（リザルト表示）
    if ((room.status === 'playing' || room.status === 'finished') && gameState) {
        // Strict Mode: セッションがない場合はアクセス拒否
        if (!playerId) {
            return (
                <div className={styles.error}>
                    <h2 style={{ color: 'var(--neon-orange)' }}>ゲーム進行中</h2>
                    <p>
                        現在ゲームが進行中のため、途中参加はできません。<br />
                        （ブラウザを閉じたりリロードすると復帰できない場合があります）
                    </p>
                    <button className="btn btn-primary" onClick={() => router.push('/')}>
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
