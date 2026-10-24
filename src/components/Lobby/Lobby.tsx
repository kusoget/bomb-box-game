'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Player, Room } from '@/types/game';
import { getAvatarDisplay } from '@/lib/gameLogic';
import { asset } from '@/lib/assets';
import { roomPath, shareUrl } from '@/lib/api';
import { copyText } from '@/lib/clipboard';
import WatchShare from '@/components/WatchShare/WatchShare';
import styles from './Lobby.module.css';

interface LobbyProps {
    room: Room;
    players: Player[];
    currentPlayerId: string;
    isHost: boolean;
    /** 観戦URLから来た人。コピーやゲーム開始は出さない */
    spectator?: boolean;
    spectatorCount?: number;
    onStartGame: () => void;
    onLeaveRoom: () => void;
}

export default function Lobby({
    room,
    players,
    currentPlayerId,
    isHost,
    spectator = false,
    spectatorCount = 0,
    onStartGame,
    onLeaveRoom,
}: LobbyProps) {
    const [copied, setCopied] = useState(false);
    const [urlCopied, setUrlCopied] = useState(false);

    const copyUrl = async (text: string, setStatus: (status: boolean) => void) => {
        if (!(await copyText(text))) return;
        setStatus(true);
        setTimeout(() => setStatus(false), 2000);
    };

    const copyRoomCode = () => copyUrl(room.roomCode, setCopied);

    // iOS アプリ内の location.href（capacitor://）は他人が開けないので、Web 版の URL を組み立てる
    const copyInviteUrl = () => copyUrl(shareUrl(roomPath(room.roomCode)), setUrlCopied);


    const canStart = players.length === 2;

    const renderAvatar = (avatar: string | undefined) => {
        const { type, value } = getAvatarDisplay(avatar);
        if (type === 'image') {
            return <img src={value} alt="Avatar" className={styles.avatarImage} />;
        }
        return <span className={styles.avatarText}>{value}</span>;
    };

    return (
        <div className={`${styles.lobby} boxbom-lobby-screen`}>
            <div className={`card ${styles.lobbyCard}`}>
                <h1 className={styles.title}>
                    <Image src={asset('/images/boxbom/logo-v3.png')} alt="BOXBOM" width={515} height={191} className={styles.titleLogo} priority unoptimized />
                </h1>
                <p className={styles.subtitle}>
                    {spectator ? '👀 観戦モード：対戦開始を待っています...' : '対戦相手を待っています...'}
                </p>

                <div className={styles.ruleBadges}>
                    <span className={styles.ruleBadge}>🎯 {room.rules?.targetScore ?? 40}点先取</span>
                    {room.rules?.maxShocks === 1 && (
                        <span className={`${styles.ruleBadge} ${styles.ruleBadgeDanger}`}>💀 一撃必殺</span>
                    )}
                </div>

                {!spectator && (
                <div className={styles.roomCode}>
                    <div className={styles.roomCodeLabel}>ルームコード</div>
                    <div className={styles.roomCodeValue}>{room.roomCode}</div>

                    <div className={styles.copyButtons}>
                        <button
                            className={`${styles.copyButton} ${styles.codeButton}`}
                            onClick={copyRoomCode}
                        >
                            {copied ? '✓ コードをコピー' : 'コードをコピー'}
                        </button>
                        <button
                            className={`${styles.copyButton} ${styles.urlButton}`}
                            onClick={copyInviteUrl}
                        >
                            {urlCopied ? '✓ URLをコピー' : '招待URLをコピー'}
                        </button>
                    </div>
                    {(copied || urlCopied) && <div className={styles.copySuccess}>クリップボードにコピーしました</div>}
                </div>
                )}

                {room.watchTokens && (
                    <WatchShare roomCode={room.roomCode} tokens={room.watchTokens} spectatorCount={spectatorCount} />
                )}

                {/* プレイヤー一覧 */}
                <div className={styles.playersSection}>
                    <div className={styles.sectionTitle}>プレイヤー</div>
                    <div className={styles.playersList}>
                        {/* Player 1 */}
                        <div className={`${styles.playerSlot} ${players[0] ? styles.filled : styles.empty}`}>
                            {players[0] ? (
                                <>
                                    <div className={styles.playerAvatar}>{renderAvatar(players[0].avatar)}</div>
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
                                    <div className={styles.playerAvatar}>{renderAvatar(players[1].avatar)}</div>
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
                    {spectator ? null : isHost ? (
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
                        {spectator ? '← 観戦をやめる' : '← ルームを退出'}
                    </button>
                </div>
            </div>
        </div>
    );
}
