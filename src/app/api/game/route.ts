import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ゲームアクション処理
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, gameStateId, roomId, data } = body;

        switch (action) {
            case 'START_GAME': {
                const { initialState } = data;

                const { error: gsError } = await supabase
                    .from('game_states')
                    .insert([{
                        id: initialState.id,
                        room_id: roomId,
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
                        trapped_chair: null,
                        selected_chair: null,
                    }]);

                if (gsError) {
                    console.error('Game state creation error:', gsError);
                    return NextResponse.json({ error: 'Failed to create game state' }, { status: 500 });
                }

                await supabase
                    .from('rooms')
                    .update({ status: 'playing' })
                    .eq('id', roomId);

                return NextResponse.json({ success: true });
            }

            case 'SET_TRAP': {
                const { chairId, chairs, confirm } = data;

                const updateData: Record<string, unknown> = {
                    chairs,
                    trapped_chair: chairId,
                    updated_at: new Date().toISOString(),
                };

                if (confirm) {
                    updateData.phase = 'selecting_chair';
                }

                await supabase
                    .from('game_states')
                    .update(updateData)
                    .eq('id', gameStateId);

                return NextResponse.json({ success: true });
            }

            case 'SELECT_CHAIR': {
                const { chairId } = data;

                await supabase
                    .from('game_states')
                    .update({
                        selected_chair: chairId,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', gameStateId);

                return NextResponse.json({ success: true });
            }

            case 'CONFIRM_SELECTION': {
                const { result } = data;

                await supabase
                    .from('game_states')
                    .update({
                        chairs: result.chairs,
                        player1_score: result.player1Score,
                        player2_score: result.player2Score,
                        player1_shocks: result.player1Shocks,
                        player2_shocks: result.player2Shocks,
                        phase: 'revealing',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', gameStateId);

                return NextResponse.json({ success: true });
            }

            case 'NEXT_ROUND': {
                const { result } = data;

                await supabase
                    .from('game_states')
                    .update({
                        chairs: result.chairs,
                        current_round: result.currentRound,
                        is_half_front: result.isHalfFront,
                        phase: result.phase,
                        current_sitter_id: result.currentSitterId,
                        current_switcher_id: result.currentSwitcherId,
                        trapped_chair: result.trappedChair,
                        selected_chair: result.selectedChair,
                        winner: result.winner,
                        win_reason: result.winReason,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', gameStateId);

                if (result.phase === 'game_over') {
                    await supabase
                        .from('rooms')
                        .update({ status: 'finished' })
                        .eq('id', roomId);
                }

                return NextResponse.json({ success: true });
            }

            case 'SEND_MESSAGE': {
                const { playerId, playerName, message } = data;

                await supabase
                    .from('chat_messages')
                    .insert([{
                        room_id: roomId,
                        player_id: playerId,
                        player_name: playerName,
                        message,
                    }]);

                return NextResponse.json({ success: true });
            }

            case 'LEAVE_ROOM': {
                const { playerId, isHost } = data;

                await supabase
                    .from('players')
                    .delete()
                    .eq('id', playerId);

                if (isHost) {
                    await supabase
                        .from('rooms')
                        .delete()
                        .eq('id', roomId);
                }

                return NextResponse.json({ success: true });
            }

            default:
                return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
