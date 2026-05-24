'use client';

import { useState } from 'react';
import Link from 'next/link';
import Lobby from '@/components/Lobby/Lobby';
import { Player, Room } from '@/types/game';
import styles from '../preview.module.css';

const ROOM: Room = {
    id: 'mock-room',
    roomCode: 'AB12',
    status: 'waiting',
    hostId: 'p1',
    createdAt: new Date().toISOString(),
};

const PLAYER1: Player = {
    id: 'p1',
    name: 'キラリン',
    avatar: 'kirarin',
    playerNumber: 1,
    score: 0,
    shockCount: 0,
};

const PLAYER2: Player = {
    id: 'p2',
    name: 'ボニュ',
    avatar: 'ponyu',
    playerNumber: 2,
    score: 0,
    shockCount: 0,
};

type LobbyMode = 'waiting' | 'ready' | 'guest_waiting';

const MODE_LABEL: Record<LobbyMode, string> = {
    waiting: '① 1人だけ（相手待ち）',
    ready: '② 2人揃った（ホスト視点）',
    guest_waiting: '③ 2人揃った（ゲスト視点）',
};

export default function LobbyPreviewPage() {
    const [mode, setMode] = useState<LobbyMode>('waiting');
    const [collapsed, setCollapsed] = useState(false);

    const players = mode === 'waiting' ? [PLAYER1] : [PLAYER1, PLAYER2];
    const currentPlayerId = mode === 'guest_waiting' ? 'p2' : 'p1';
    const isHost = mode !== 'guest_waiting';

    return (
        <div className={styles.previewWrap}>
            {collapsed ? (
                <button
                    className={styles.debugMini}
                    onClick={() => setCollapsed(false)}
                    aria-label="Open debug panel"
                >⚙</button>
            ) : (
                <div className={styles.debugPanel}>
                    <div className={styles.debugRow}>
                        <div className={styles.debugTitle}>Lobby Preview</div>
                        <Link href="/preview" className={styles.debugBackBtn}>← 一覧へ</Link>
                        <button
                            className={styles.debugCollapseBtn}
                            onClick={() => setCollapsed(true)}
                            aria-label="Collapse"
                        >–</button>
                    </div>
                    <div className={styles.debugRow}>
                        <span className={styles.debugLabel}>Mode:</span>
                        <select
                            value={mode}
                            onChange={e => setMode(e.target.value as LobbyMode)}
                            className={styles.debugSelect}
                        >
                            {(Object.keys(MODE_LABEL) as LobbyMode[]).map(k => (
                                <option key={k} value={k}>{MODE_LABEL[k]}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            <Lobby
                room={ROOM}
                players={players}
                currentPlayerId={currentPlayerId}
                isHost={isHost}
                onStartGame={() => { /* noop */ }}
                onLeaveRoom={() => { /* noop */ }}
            />
        </div>
    );
}
