'use client';

import { useState } from 'react';
import { Player, Room } from '@/types/game';
import { getAvatarDisplay } from '@/lib/gameLogic';
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

    const renderSlot = (player: Player | undefined) => (
        <div className={`${styles.playerSlot} ${player ? styles.filled : styles.empty}`}>
            {player ? (
                <>
                    <div className={styles.playerAvatar}>{renderAvatar(player.avatar)}</div>
                    <div className={styles.playerInfo}>
                        <div className={styles.playerName}>{player.name}</div>
                        <div className={styles.playerBadges}>
                            {player.id === room.hostId && <span className={styles.hostBadge}>ホスト</span>}
                            {player.id === currentPlayerId && <span className={styles.youBadge}>あなた</span>}
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className={`${styles.playerAvatar} ${styles.waitingAvatar}`}>?</div>
                    <div className={styles.playerInfo}>
                        <div className={styles.waitingText}>待機中...</div>
                    </div>
                </>
            )}
        </div>
    );

    return (
        <div className={`${styles.lobby} boxbom-lobby-screen`}>
            <div className={`card ${styles.lobbyCard}`}>
                {/* 対戦カード（いちばん上） */}
                <div className={styles.playersList}>
                    {renderSlot(players[0])}
                    <span className={styles.vs}>VS</span>
                    {renderSlot(players[1])}
                </div>

                <div className={styles.statusRow}>
                    <span className={styles.subtitle}>
                        {spectator ? '👀 観戦モード：開始待ち' : canStart ? '対戦相手がそろいました！' : '対戦相手を待っています...'}
                    </span>
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
                            <button className={`${styles.copyButton} ${styles.codeButton}`} onClick={copyRoomCode}>
                                {copied ? '✓ コピーしました' : 'コードをコピー'}
                            </button>
                            <button className={`${styles.copyButton} ${styles.urlButton}`} onClick={copyInviteUrl}>
                                {urlCopied ? '✓ コピーしました' : '招待URLをコピー'}
                            </button>
                        </div>
                    </div>
                )}

                {room.watchTokens && (
                    <WatchShare roomCode={room.roomCode} tokens={room.watchTokens} spectatorCount={spectatorCount} compact />
                )}

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
