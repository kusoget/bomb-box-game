'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatMessage, GameState, Player, Room } from '@/types/game';
import { ClientMessage, RoomSnapshot, ServerMessage } from '@/types/realtime';
import { wsUrl } from '@/lib/api';

interface UseGameStateProps {
    roomCode: string;
    playerId: string;
    /** sessionStorage の読み出しが済むまで接続を待つ（false の間は何もしない） */
    ready?: boolean;
}

interface UseGameStateReturn {
    room: Room | null;
    players: Player[];
    gameState: GameState | null;
    messages: ChatMessage[];
    loading: boolean;
    error: string | null;
    isHost: boolean;
    startGame: () => void;
    setTrap: (chairId: number) => void;
    selectChair: (chairId: number) => void;
    confirmSelection: () => void;
    nextRound: () => void;
    sendMessage: (message: string) => void;
    leaveRoom: () => void;
}

/** ルームが未取得 / 解散済みのときは room が null になる */
type LocalSnapshot = Omit<RoomSnapshot, 'room'> & { room: Room | null };

const EMPTY: LocalSnapshot = {
    room: null,
    players: [],
    gameState: null,
    messages: [],
};

const PING_INTERVAL_MS = 30_000;
const MAX_RETRIES = 5;

/**
 * ルームの Durable Object に WebSocket でつなぎ、状態を丸ごと受け取る。
 * 得点計算・勝敗判定はサーバー側で行うので、ここからは「操作」だけを送る。
 */
export function useGameState({ roomCode, playerId, ready = true }: UseGameStateProps): UseGameStateReturn {
    const [snapshot, setSnapshot] = useState<LocalSnapshot>(EMPTY);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!ready || !roomCode) return;

        let disposed = false;
        let retries = 0;
        let retryTimer: ReturnType<typeof setTimeout> | undefined;
        let pingTimer: ReturnType<typeof setInterval> | undefined;

        const connect = () => {
            if (disposed) return;

            const ws = new WebSocket(
                wsUrl(`/api/rooms/${encodeURIComponent(roomCode)}/ws?playerId=${encodeURIComponent(playerId)}`)
            );
            wsRef.current = ws;

            ws.onopen = () => {
                retries = 0;
                setError(null);
                pingTimer = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'PING' } as ClientMessage));
                }, PING_INTERVAL_MS);
            };

            ws.onmessage = (event) => {
                let message: ServerMessage;
                try {
                    message = JSON.parse(event.data as string) as ServerMessage;
                } catch {
                    return;
                }
                if (message.t !== 'STATE') return;

                setSnapshot(message.payload ?? EMPTY);
                setLoading(false);
            };

            ws.onclose = () => {
                clearInterval(pingTimer);
                if (disposed) return;

                if (retries >= MAX_RETRIES) {
                    setError('接続が切れました。ページを再読み込みしてください');
                    setLoading(false);
                    return;
                }
                // 1s, 2s, 4s... で再接続
                retryTimer = setTimeout(connect, Math.min(1000 * 2 ** retries, 8000));
                retries += 1;
            };
        };

        connect();

        return () => {
            disposed = true;
            clearTimeout(retryTimer);
            clearInterval(pingTimer);
            wsRef.current?.close();
            wsRef.current = null;
        };
    }, [roomCode, playerId, ready]);

    const send = useCallback((message: ClientMessage) => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
    }, []);

    const { room, players, gameState, messages } = snapshot;

    const startGame = useCallback(() => send({ t: 'START_GAME' }), [send]);

    // 箱を選ぶ操作は体感を優先してローカルにも即反映する（直後にサーバーの状態で上書きされる）
    const setTrap = useCallback((chairId: number) => {
        setSnapshot(prev => {
            if (!prev.gameState || prev.gameState.phase !== 'setting_trap') return prev;
            if (prev.gameState.trappedChair === chairId) return prev;
            return {
                ...prev,
                gameState: {
                    ...prev.gameState,
                    trappedChair: chairId,
                    chairs: prev.gameState.chairs.map(c => ({ ...c, isTrapped: c.id === chairId })),
                },
            };
        });
        send({ t: 'SET_TRAP', chairId });
    }, [send]);

    const selectChair = useCallback((chairId: number) => {
        setSnapshot(prev => (
            prev.gameState
                ? { ...prev, gameState: { ...prev.gameState, selectedChair: chairId } }
                : prev
        ));
        send({ t: 'SELECT_CHAIR', chairId });
    }, [send]);

    const confirmSelection = useCallback(() => send({ t: 'CONFIRM_SELECTION' }), [send]);
    const nextRound = useCallback(() => send({ t: 'NEXT_ROUND' }), [send]);
    const sendMessage = useCallback((message: string) => send({ t: 'CHAT', message }), [send]);

    const leaveRoom = useCallback(() => {
        send({ t: 'LEAVE' });
        wsRef.current?.close();
    }, [send]);

    return {
        room,
        players,
        gameState,
        messages,
        loading,
        error,
        isHost: !!room && room.hostId === playerId,
        startGame,
        setTrap,
        selectChair,
        confirmSelection,
        nextRound,
        sendMessage,
        leaveRoom,
    };
}
