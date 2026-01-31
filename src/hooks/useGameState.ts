'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { GameState, Player, Room, ChatMessage, Chair, GamePhase } from '@/types/game';
import { createInitialGameState, processReveal, advanceToNextRound } from '@/lib/gameLogic';

// Supabaseレコード型
interface DbRoom {
    id: string;
    room_code: string;
    status: string;
    host_id: string;
    created_at: string;
}

interface DbPlayer {
    id: string;
    room_id: string;
    name: string;
    avatar: string;
    player_number: number;
    score: number;
    shock_count: number;
    joined_at: string;
}

interface DbGameState {
    id: string;
    room_id: string;
    chairs: Chair[];
    player1_score: number;
    player2_score: number;
    player1_shocks: number;
    player2_shocks: number;
    current_round: number;
    is_half_front: boolean;
    phase: string;
    current_sitter_id: string | null;
    current_switcher_id: string | null;
    trapped_chair: number | null;
    selected_chair: number | null;
    winner: string | null;
    win_reason: string | null;
    updated_at: string;
}

interface DbChatMessage {
    id: string;
    room_id: string;
    player_id: string;
    player_name: string;
    message: string;
    created_at: string;
}

interface UseGameStateProps {
    roomCode: string;
    playerId: string;
}

interface UseGameStateReturn {
    room: Room | null;
    players: Player[];
    gameState: GameState | null;
    messages: ChatMessage[];
    loading: boolean;
    error: string | null;
    isHost: boolean;
    startGame: () => Promise<void>;
    setTrap: (chairId: number) => Promise<void>;
    selectChair: (chairId: number) => Promise<void>;
    confirmSelection: () => Promise<void>;
    nextRound: () => Promise<void>;
    sendMessage: (message: string) => Promise<void>;
    leaveRoom: () => Promise<void>;
}

function mapDbRoom(r: DbRoom): Room {
    return {
        id: r.id,
        roomCode: r.room_code,
        status: r.status as 'waiting' | 'playing' | 'finished',
        hostId: r.host_id,
        createdAt: r.created_at,
    };
}

function mapDbPlayer(p: DbPlayer): Player {
    return {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        playerNumber: p.player_number as 1 | 2,
        score: p.score,
        shockCount: p.shock_count,
    };
}

function mapDbGameState(gs: DbGameState): GameState {
    return {
        id: gs.id,
        roomId: gs.room_id,
        chairs: gs.chairs,
        player1Score: gs.player1_score,
        player2Score: gs.player2_score,
        player1Shocks: gs.player1_shocks,
        player2Shocks: gs.player2_shocks,
        currentRound: gs.current_round,
        isHalfFront: gs.is_half_front,
        phase: gs.phase as GamePhase,
        currentSitterId: gs.current_sitter_id,
        currentSwitcherId: gs.current_switcher_id,
        trappedChair: gs.trapped_chair,
        selectedChair: gs.selected_chair,
        winner: gs.winner,
        winReason: gs.win_reason as 'score' | 'shock' | 'last_chair' | null,
        updatedAt: gs.updated_at,
    };
}

function mapDbChatMessage(m: DbChatMessage): ChatMessage {
    return {
        id: m.id,
        roomId: m.room_id,
        playerId: m.player_id,
        playerName: m.player_name,
        message: m.message,
        createdAt: m.created_at,
    };
}

export function useGameState({ roomCode, playerId }: UseGameStateProps): UseGameStateReturn {
    const [room, setRoom] = useState<Room | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [roomId, setRoomId] = useState<string | null>(null);

    const supabase = getSupabaseBrowserClient();
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    // API呼び出しヘルパー
    const callGameApi = async (action: string, data: Record<string, unknown> = {}) => {
        if (!room || !gameState) return;

        try {
            const res = await fetch('/api/game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    gameStateId: gameState.id,
                    roomId: room.id,
                    data,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Action failed');
            }
        } catch (err) {
            console.error(`API Error (${action}):`, err);
            // エラー処理（必要に応じて）
        }
    };

    // 初期データ取得
    const fetchInitialData = useCallback(async () => {
        try {
            // ルーム取得
            const { data: roomData, error: roomError } = await supabase
                .from('rooms')
                .select('*')
                .eq('room_code', roomCode)
                .single();

            if (roomError) throw roomError;
            if (!roomData) throw new Error('Room not found');

            const dbRoom = roomData as unknown as DbRoom;
            setRoom(mapDbRoom(dbRoom));
            setRoomId(dbRoom.id);

            // プレイヤー取得
            const { data: playersData, error: playersError } = await supabase
                .from('players')
                .select('*')
                .eq('room_id', dbRoom.id)
                .order('player_number');

            if (playersError) throw playersError;
            setPlayers((playersData as unknown as DbPlayer[]).map(mapDbPlayer));

            // ゲーム状態取得
            const { data: gameStateData } = await supabase
                .from('game_states')
                .select('*')
                .eq('room_id', dbRoom.id)
                .single();

            if (gameStateData) {
                setGameState(mapDbGameState(gameStateData as unknown as DbGameState));
            }

            // チャットメッセージ取得
            const { data: messagesData } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('room_id', dbRoom.id)
                .order('created_at', { ascending: true })
                .limit(100);

            if (messagesData) {
                setMessages((messagesData as unknown as DbChatMessage[]).map(mapDbChatMessage));
            }

            setLoading(false);
        } catch (err) {
            console.error('Error fetching initial data:', err);
            setError('データの読み込みに失敗しました');
            setLoading(false);
        }
    }, [roomCode, supabase]);

    // リアルタイム購読 & ポーリング
    useEffect(() => {
        fetchInitialData();

        // ポーリング（3秒ごとに更新確認）
        const intervalId = setInterval(fetchInitialData, 3000);

        return () => clearInterval(intervalId);
    }, [fetchInitialData]);

    // リアルタイム購読（roomIdが設定された後）
    useEffect(() => {
        if (!roomId) return;

        const channel = supabase.channel(`room:${roomCode}`);

        channel
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'players',
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const p = payload.new as unknown as DbPlayer;
                    setPlayers(prev => [...prev, mapDbPlayer(p)]);
                } else if (payload.eventType === 'DELETE') {
                    const oldP = payload.old as { id: string };
                    setPlayers(prev => prev.filter(p => p.id !== oldP.id));
                } else if (payload.eventType === 'UPDATE') {
                    const p = payload.new as unknown as DbPlayer;
                    setPlayers(prev => prev.map(player =>
                        player.id === p.id ? mapDbPlayer(p) : player
                    ));
                }
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'game_states',
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const gs = payload.new as unknown as DbGameState;
                    setGameState(mapDbGameState(gs));
                }
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'rooms',
                filter: `room_code=eq.${roomCode}`,
            }, (payload) => {
                if (payload.eventType === 'UPDATE') {
                    const r = payload.new as unknown as DbRoom;
                    setRoom(mapDbRoom(r));
                }
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const m = payload.new as unknown as DbChatMessage;
                setMessages(prev => [...prev, mapDbChatMessage(m)]);
            })
            .subscribe();

        channelRef.current = channel;

        return () => {
            channel.unsubscribe();
        };
    }, [roomCode, roomId, supabase]);

    // ゲーム開始
    const startGame = useCallback(async () => {
        if (!room || players.length !== 2) return;

        const initialState = createInitialGameState(room.id, players[0].id, players[1].id);

        try {
            await fetch('/api/game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'START_GAME',
                    roomId: room.id,
                    data: { initialState },
                }),
            });
        } catch (err) {
            console.error('Start game error:', err);
        }
    }, [room, players]);

    // トラップ設置
    const setTrap = useCallback(async (chairId: number) => {
        if (!gameState) return;

        // 楽観的更新: ローカルの状態を即座に更新
        const updatedChairs = gameState.chairs.map(c => ({
            ...c,
            isTrapped: c.id === chairId,
        }));

        // まだ確定していない場合はローカルだけ更新してAPIを呼ぶ
        if (gameState.trappedChair !== chairId) {
            setGameState(prev => prev ? {
                ...prev,
                chairs: updatedChairs,
                trappedChair: chairId,
            } : null);

            await callGameApi('SET_TRAP', {
                chairId,
                chairs: updatedChairs,
                confirm: false,
            });
        } else {
            // 確定時はフェーズも更新
            setGameState(prev => prev ? {
                ...prev,
                chairs: updatedChairs,
                trappedChair: chairId,
                phase: 'selecting_chair',
            } : null);

            await callGameApi('SET_TRAP', {
                chairId,
                chairs: updatedChairs,
                confirm: true,
            });
        }
    }, [gameState, callGameApi]);

    // 椅子選択
    const selectChair = useCallback(async (chairId: number) => {
        if (!gameState) return;

        // 楽観的更新
        setGameState(prev => prev ? {
            ...prev,
            selectedChair: chairId,
        } : null);

        await callGameApi('SELECT_CHAIR', { chairId });
    }, [gameState, callGameApi]);

    // 選択確定
    const confirmSelection = useCallback(async () => {
        if (!gameState || !gameState.selectedChair) return;
        const result = processReveal(gameState, players[0]?.id ?? '', players[1]?.id ?? '');
        await callGameApi('CONFIRM_SELECTION', { result });
    }, [gameState, players, callGameApi]);

    // 次のラウンド
    const nextRound = useCallback(async () => {
        if (!gameState) return;
        const result = advanceToNextRound(gameState, players[0]?.id ?? '', players[1]?.id ?? '');
        await callGameApi('NEXT_ROUND', { result });
    }, [gameState, players, callGameApi]);

    // メッセージ送信
    const sendMessage = useCallback(async (message: string) => {
        if (!room) return;
        const player = players.find(p => p.id === playerId);
        if (!player) return;

        try {
            await fetch('/api/game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'SEND_MESSAGE',
                    roomId: room.id,
                    data: { playerId, playerName: player.name, message },
                }),
            });
        } catch (err) {
            console.error('Send message error:', err);
        }
    }, [room, players, playerId]);

    // ルーム退出
    const leaveRoom = useCallback(async () => {
        if (!room) return;

        try {
            await fetch('/api/game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'LEAVE_ROOM',
                    roomId: room.id,
                    data: { playerId, isHost: room.hostId === playerId },
                }),
            });
        } catch (err) {
            console.error('Leave room error:', err);
        }
    }, [room, playerId]);

    return {
        room,
        players,
        gameState,
        messages,
        loading,
        error,
        isHost: room?.hostId === playerId,
        startGame,
        setTrap,
        selectChair,
        confirmSelection,
        nextRound,
        sendMessage,
        leaveRoom,
    };
}
