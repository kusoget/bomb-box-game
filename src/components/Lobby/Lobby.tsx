'use client';

import { useState } from 'react';
import { Player, Room } from '@/types/game';
import styles from './Lobby.module.css';

interface LobbyProps {
    room: Room;
    players: Player[];
    currentPlayerId: string;
    isHost: boolean;
    onStartGame: () => void;
    onLeaveRoom: () => void;
}

export default function Lobby({
    room,
    players,
    currentPlayerId,
    isHost,
    onStartGame,
    onLeaveRoom,
}: LobbyProps) {
    const [copied, setCopied] = useState(false);

    const copyRoomCode = async () => {
        try {
            await navigator.clipboard.writeText(room.roomCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // フォールバック
            const input = document.createElement('input');
            input.value = room.roomCode;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const canStart = players.length === 2;

    return (
        <div className={styles.lobby}>
            <div className={`card ${styles.lobbyCard}`}>
                <h1 className={styles.title}>⚡ Electric Chair</h1>
                <p className={styles.subtitle}>対戦相手を待っています...</p>

                {/* ルームコード */}
                <div className={styles.roomCode}>
                    <div className={styles.roomCodeLabel}>ルームコード</div>
                    <div className={styles.roomCodeValue}>{room.roomCode}</div>
                    <button
                        className={`btn btn-secondary ${styles.copyButton}`}
                        onClick={copyRoomCode}
                    >
                        {copied ? '✓ コピーしました' : 'コピー'}
                    </button>
                    {copied && <div className={styles.copySuccess}>クリップボードにコピーしました</div>}
                </div>

                {/* プレイヤー一覧 */}
                <div className={styles.playersSection}>
                    <div className={styles.sectionTitle}>プレイヤー</div>
                    <div className={styles.playersList}>
                        {/* Player 1 */}
                        <div className={`${styles.playerSlot} ${players[0] ? styles.filled : styles.empty}`}>
                            {players[0] ? (
                                <>
                                    <div className={styles.playerAvatar}>{players[0].avatar}</div>
                                    <div className={styles.playerName}>{players[0].name}</div>
                                    {players[0].id === room.hostId && (
                                        <span className={styles.hostBadge}>ホスト</span>
                                    )}
                                    {players[0].id === currentPlayerId && (
                                        <span className={styles.youBadge}>あなた</span>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className={styles.waitingDots}>...</div>
                                    <div className={styles.waitingText}>待機中</div>
                                </>
                            )}
                        </div>

                        {/* Player 2 */}
                        <div className={`${styles.playerSlot} ${players[1] ? styles.filled : styles.empty}`}>
                            {players[1] ? (
                                <>
                                    <div className={styles.playerAvatar}>{players[1].avatar}</div>
                                    <div className={styles.playerName}>{players[1].name}</div>
                                    {players[1].id === room.hostId && (
                                        <span className={styles.hostBadge}>ホスト</span>
                                    )}
                                    {players[1].id === currentPlayerId && (
                                        <span className={styles.youBadge}>あなた</span>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className={styles.waitingDots}>...</div>
                                    <div className={styles.waitingText}>待機中</div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* アクション */}
                <div className={styles.actions}>
                    {isHost ? (
                        <button
                            className={`btn btn-primary ${styles.startButton}`}
                            onClick={onStartGame}
                            disabled={!canStart}
                        >
                            {canStart ? '⚡ ゲーム開始' : '対戦相手を待っています...'}
                        </button>
                    ) : (
                        <div className={styles.waitingForHost}>
                            ホストがゲームを開始するのを待っています...
                        </div>
                    )}

                    <button className={styles.leaveButton} onClick={onLeaveRoom}>
                        ルームを退出
                    </button>
                </div>
            </div>
        </div>
    );
}
