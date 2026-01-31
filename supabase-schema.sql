-- Electric Chair Game Database Schema
-- Run this in Supabase SQL Editor

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(6) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  host_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  avatar VARCHAR(10) NOT NULL,
  player_number INTEGER CHECK (player_number IN (1, 2)),
  score INTEGER DEFAULT 0,
  shock_count INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game states table
CREATE TABLE IF NOT EXISTS game_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID UNIQUE REFERENCES rooms(id) ON DELETE CASCADE,
  chairs JSONB NOT NULL,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  player1_shocks INTEGER DEFAULT 0,
  player2_shocks INTEGER DEFAULT 0,
  current_round INTEGER DEFAULT 1,
  is_half_front BOOLEAN DEFAULT TRUE,
  phase VARCHAR(20) DEFAULT 'waiting' CHECK (phase IN ('waiting', 'setting_trap', 'selecting_chair', 'confirming', 'revealing', 'round_end', 'game_over')),
  current_sitter_id UUID,
  current_switcher_id UUID,
  trapped_chair INTEGER,
  selected_chair INTEGER,
  winner UUID,
  win_reason VARCHAR(20) CHECK (win_reason IN ('score', 'shock', 'last_chair', NULL)),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  player_name VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id);
CREATE INDEX IF NOT EXISTS idx_game_states_room_id ON game_states(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous access (game uses anon key)
CREATE POLICY "Allow all access to rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to players" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to game_states" ON game_states FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to chat_messages" ON chat_messages FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_states;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
