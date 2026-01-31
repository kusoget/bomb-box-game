import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateRoomCode, getRandomAvatar } from '@/lib/gameLogic';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ルーム作成
export async function POST(request: NextRequest) {
    try {
        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('Supabase credentials missing');
            return NextResponse.json({ error: 'Server configuration error: Missing Supabase credentials' }, { status: 500 });
        }

        const body = await request.json();
        const { playerName } = body;

        if (!playerName) {
            return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
        }

        // ルームコード生成（重複チェック）
        let roomCode = generateRoomCode();
        let attempts = 0;
        while (attempts < 10) {
            const { data: existing } = await supabase
                .from('rooms')
                .select('id')
                .eq('room_code', roomCode)
                .single();

            if (!existing) break;
            roomCode = generateRoomCode();
            attempts++;
        }

        const playerId = uuidv4();
        const roomId = uuidv4();

        // ルーム作成
        const { error: roomError } = await supabase.from('rooms').insert({
            id: roomId,
            room_code: roomCode,
            status: 'waiting',
            host_id: playerId,
        });

        if (roomError) {
            console.error('Room creation error:', roomError);
            return NextResponse.json({
                error: `Failed to create room: ${roomError.message}`,
                details: JSON.stringify(roomError),
                code: roomError.code
            }, { status: 500 });
        }

        // プレイヤー作成
        const { error: playerError } = await supabase.from('players').insert({
            id: playerId,
            room_id: roomId,
            name: playerName,
            avatar: getRandomAvatar(),
            player_number: 1,
        });

        if (playerError) {
            console.error('Player creation error:', playerError);
            // ロールバック
            await supabase.from('rooms').delete().eq('id', roomId);
            return NextResponse.json({
                error: `Failed to create player: ${playerError.message}`,
                details: JSON.stringify(playerError),
                code: playerError.code
            }, { status: 500 });
        }

        return NextResponse.json({
            roomCode,
            roomId,
            playerId,
        });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ルーム参加
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { roomCode, playerName } = body;

        if (!roomCode || !playerName) {
            return NextResponse.json({ error: 'Room code and player name are required' }, { status: 400 });
        }

        // ルーム検索
        const { data: room, error: roomError } = await supabase
            .from('rooms')
            .select('*')
            .eq('room_code', roomCode.toUpperCase())
            .single();

        if (roomError || !room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        if (room.status !== 'waiting') {
            return NextResponse.json({ error: 'Game already started' }, { status: 400 });
        }

        // 既存プレイヤー数チェック
        const { data: existingPlayers } = await supabase
            .from('players')
            .select('*')
            .eq('room_id', room.id);

        if (existingPlayers && existingPlayers.length >= 2) {
            return NextResponse.json({ error: 'Room is full' }, { status: 400 });
        }

        const playerId = uuidv4();
        const playerNumber = (existingPlayers?.length ?? 0) + 1;

        // プレイヤー作成
        const { error: playerError } = await supabase.from('players').insert({
            id: playerId,
            room_id: room.id,
            name: playerName,
            avatar: getRandomAvatar(),
            player_number: playerNumber,
        });

        if (playerError) {
            console.error('Player creation error:', playerError);
            return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
        }

        return NextResponse.json({
            roomCode: room.room_code,
            roomId: room.id,
            playerId,
        });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
