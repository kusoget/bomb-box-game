import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateRoomCode, getRandomAvatar, createInitialGameState } from '@/lib/gameLogic';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ルーム情報の取得（招待用）
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');

        if (!code) {
            return NextResponse.json({ error: 'Room code is required' }, { status: 400 });
        }

        // ルームとホスト情報を取得
        const { data: room, error: roomError } = await supabase
            .from('rooms')
            .select('*')
            .eq('room_code', code.toUpperCase())
            .single();

        if (roomError || !room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        // 有効期限チェック (1時間)
        // updated_at がない場合は created_at を代用（スキーマによるが念のため）
        const lastActive = new Date(room.updated_at || room.created_at || Date.now());
        const now = new Date();
        const diffHours = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);

        if (diffHours >= 1) {
            // 期限切れなら404扱い、またはステータス更新してもよいが、
            // 今回は簡易的に404を返す（実質アクセス不可）
            // 必要であればDBで delete する処理を入れても良い
            return NextResponse.json({ error: 'Room expired' }, { status: 404 });
        }

        // ホスト名を取得
        const { data: host } = await supabase
            .from('players')
            .select('name')
            .eq('id', room.host_id)
            .single();

        return NextResponse.json({
            roomCode: room.room_code,
            hostName: host?.name || 'Unknown',
            status: room.status
        });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

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

        // [Cleanup] 古いルーム（24時間以上前）を削除
        try {
            const yesterday = new Date();
            yesterday.setHours(yesterday.getHours() - 24);

            await supabase
                .from('rooms')
                .delete()
                .lt('created_at', yesterday.toISOString());
        } catch (e) {
            // クリーンアップ失敗は無視
            console.error('Cleanup error:', e);
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

        // 既存プレイヤー数チェック (自分を含めて2人になるか)
        const { data: existingPlayers } = await supabase
            .from('players')
            .select('*')
            .eq('room_id', room.id);

        if (existingPlayers && existingPlayers.length >= 2) {
            return NextResponse.json({ error: 'Room is full' }, { status: 400 });
        }

        const playerId = uuidv4();
        // 既存が0人なら1、1人なら2
        const playerNumber = (existingPlayers?.length ?? 0) + 1;

        // 既存プレイヤーのアバターを除外してランダム選択
        const existingAvatar = existingPlayers?.[0]?.avatar;
        const newAvatar = getRandomAvatar(existingAvatar);

        // プレイヤー作成
        const { error: playerError } = await supabase.from('players').insert({
            id: playerId,
            room_id: room.id,
            name: playerName,
            avatar: newAvatar,
            player_number: playerNumber,
        });

        if (playerError) {
            console.error('Player creation error:', playerError);
            return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
        }

        // 2人になったら自動でゲーム開始
        if (playerNumber === 2) {
            // もう一人のプレイヤーIDを取得
            const otherPlayerId = existingPlayers![0].id;

            // 重要: 初期状態作成ロジック (gameLogic.tsのimportが必要)
            // ここでは簡易的にimport済みのcreateInitialGameStateを使用する前提
            // もしimportできない場合は、util関数として切り出すか、ここでロジックを再実装する必要があるが、
            // 上部でimport済みなのでそのまま利用する。

            // player1は常にホスト(player_number 1)、player2は今参加した人(player_number 2)とする
            // existingPlayers[0]がホストのはず（念のため確認してもいいが、単純化のため）
            const hostId = existingPlayers!.find(p => p.player_number === 1)?.id || otherPlayerId;
            const guestId = playerId;

            // ランダムで先行後攻を決めるロジックは createInitialGameState 内にある
            const { createInitialGameState } = require('@/lib/gameLogic'); // 動的インポート回避のためrequire使用、または上部でimport修正
            const initialState = createInitialGameState(room.id, hostId, guestId);

            // DBにGameState保存
            await supabase.from('game_states').insert({
                id: initialState.id,
                room_id: room.id,
                chairs: initialState.chairs,
                player1_score: 0,
                player2_score: 0,
                player1_shocks: 0,
                player2_shocks: 0,
                current_round: 1,
                is_half_front: true,
                phase: 'setting_trap',
                current_sitter_id: initialState.currentSitterId,
                current_switcher_id: initialState.currentSwitcherId,
                updated_at: new Date().toISOString()
            });

            // ルームステータスをplayingに変更
            await supabase.from('rooms').update({ status: 'playing' }).eq('id', room.id);
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
