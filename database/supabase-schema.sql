-- Supabase-Compatible Database Schema for Tournament Bracket Generator
-- Run this in your Supabase SQL Editor

-- Enable UUID extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for registered users
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  display_name VARCHAR(100),
  avatar_url TEXT,
  game_rankings JSONB DEFAULT '{}',
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournaments table
CREATE TABLE tournaments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  game VARCHAR(100) NOT NULL,
  format VARCHAR(50) NOT NULL, -- 'single_elimination', 'double_elimination'
  max_participants INTEGER NOT NULL DEFAULT 16,
  current_participants INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'registration', -- 'registration', 'in_progress', 'completed', 'archived'
  settings JSONB DEFAULT '{}', -- match format, rules, etc.
  password_hash TEXT,
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  creator_type VARCHAR(20) DEFAULT 'anonymous', -- 'anonymous', 'registered'
  creator_name VARCHAR(100), -- for anonymous creators
  participation_type VARCHAR(20) DEFAULT 'anyone', -- 'anyone', 'registered_only'
  seeding_type VARCHAR(20) DEFAULT 'random', -- 'random', 'manual', 'ranked'
  bracket_data JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table (for team-based tournaments)
CREATE TABLE teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  tag VARCHAR(10),
  captain_id UUID REFERENCES users(id) ON DELETE SET NULL,
  captain_name VARCHAR(100), -- for anonymous captains
  roster JSONB DEFAULT '[]', -- array of player objects
  seed INTEGER,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'eliminated', 'disqualified'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tournament_id, name)
);

-- Participants table (for individual tournaments)
CREATE TABLE participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  participant_name VARCHAR(100) NOT NULL, -- display name for the participant
  participant_type VARCHAR(20) DEFAULT 'individual', -- 'individual', 'team'
  seed INTEGER,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'eliminated', 'disqualified', 'no_show'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  eliminated_at TIMESTAMP WITH TIME ZONE,
  CHECK (
    (user_id IS NOT NULL AND team_id IS NULL) OR 
    (user_id IS NULL AND team_id IS NOT NULL)
  )
);

-- Matches table
CREATE TABLE matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  bracket_type VARCHAR(20) DEFAULT 'winner', -- 'winner', 'loser' (for double elimination)
  participant1_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  participant2_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  score JSONB DEFAULT '{}', -- flexible score format
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'disputed', 'forfeit'
  match_format VARCHAR(20) DEFAULT 'bo1', -- 'bo1', 'bo3', 'bo5'
  scheduled_time TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  next_match_id UUID REFERENCES matches(id),
  previous_matches JSONB DEFAULT '[]', -- for tracking bracket progression
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Match events table (for draft/ban, score updates, etc.)
CREATE TABLE match_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'draft_pick', 'ban', 'score_update', 'forfeit', etc.
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  event_data JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Tournament invitations table
CREATE TABLE tournament_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_game ON tournaments(game);
CREATE INDEX idx_tournaments_creator_id ON tournaments(creator_id);
CREATE INDEX idx_tournaments_last_activity ON tournaments(last_activity);
CREATE INDEX idx_participants_tournament_id ON participants(tournament_id);
CREATE INDEX idx_participants_user_id ON participants(user_id);
CREATE INDEX idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_match_events_match_id ON match_events(match_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Tournaments are publicly readable but only creators can modify
CREATE POLICY "Tournaments are publicly readable" ON tournaments
  FOR SELECT USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "Creators can update tournaments" ON tournaments
  FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "Anyone can create tournaments" ON tournaments
  FOR INSERT WITH CHECK (true);

-- Participants policies
CREATE POLICY "Participants readable by tournament viewers" ON participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = participants.tournament_id 
      AND (tournaments.is_public = true OR tournaments.creator_id = auth.uid())
    )
  );

CREATE POLICY "Users can join tournaments" ON participants
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = tournament_id 
      AND tournaments.creator_id = auth.uid()
    )
  );

-- Matches are readable by tournament viewers
CREATE POLICY "Matches readable by tournament viewers" ON matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = matches.tournament_id 
      AND (tournaments.is_public = true OR tournaments.creator_id = auth.uid())
    )
  );

-- Match events are readable by tournament viewers
CREATE POLICY "Match events readable by tournament viewers" ON match_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches 
      JOIN tournaments ON tournaments.id = matches.tournament_id
      WHERE matches.id = match_events.match_id 
      AND (tournaments.is_public = true OR tournaments.creator_id = auth.uid())
    )
  );

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON participants 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update tournament activity timestamp
CREATE OR REPLACE FUNCTION update_tournament_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tournaments 
    SET last_activity = NOW() 
    WHERE id = COALESCE(NEW.tournament_id, OLD.tournament_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Triggers to update tournament activity
CREATE TRIGGER update_tournament_activity_participants 
  AFTER INSERT OR UPDATE OR DELETE ON participants
  FOR EACH ROW EXECUTE FUNCTION update_tournament_activity();

CREATE TRIGGER update_tournament_activity_matches 
  AFTER INSERT OR UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_tournament_activity();

-- Function to generate bracket structure
CREATE OR REPLACE FUNCTION generate_single_elimination_bracket(tournament_uuid UUID)
RETURNS void AS $$
DECLARE
    participant_count INTEGER;
    bracket_size INTEGER;
    round_num INTEGER := 1;
    match_num INTEGER := 1;
    current_participants UUID[];
    next_round_participants UUID[];
    p1 UUID;
    p2 UUID;
    i INTEGER;
BEGIN
    -- Get participant count
    SELECT COUNT(*) INTO participant_count
    FROM participants 
    WHERE tournament_id = tournament_uuid AND status = 'active';
    
    -- Calculate bracket size (next power of 2)
    bracket_size := 1;
    WHILE bracket_size < participant_count LOOP
        bracket_size := bracket_size * 2;
    END LOOP;
    
    -- Get participants array
    SELECT array_agg(id ORDER BY seed NULLS LAST, created_at)
    INTO current_participants
    FROM participants 
    WHERE tournament_id = tournament_uuid AND status = 'active';
    
    -- Generate first round matches
    FOR i IN 1..(bracket_size/2) LOOP
        p1 := NULL;
        p2 := NULL;
        
        -- Get participants for this match
        IF i <= array_length(current_participants, 1) THEN
            p1 := current_participants[i];
        END IF;
        
        IF (bracket_size - i + 1) <= array_length(current_participants, 1) THEN
            p2 := current_participants[bracket_size - i + 1];
        END IF;
        
        -- Create match
        INSERT INTO matches (
            tournament_id, 
            round, 
            match_number, 
            participant1_id, 
            participant2_id,
            status
        ) VALUES (
            tournament_uuid, 
            round_num, 
            match_num,
            p1, 
            p2,
            CASE WHEN p2 IS NULL THEN 'completed' ELSE 'pending' END
        );
        
        -- If only one participant, they advance automatically
        IF p2 IS NULL AND p1 IS NOT NULL THEN
            UPDATE matches 
            SET winner_id = p1, completed_at = NOW()
            WHERE tournament_id = tournament_uuid 
            AND round = round_num 
            AND match_number = match_num;
        END IF;
        
        match_num := match_num + 1;
    END LOOP;
    
    -- Generate subsequent rounds
    WHILE bracket_size > 2 LOOP
        bracket_size := bracket_size / 2;
        round_num := round_num + 1;
        match_num := 1;
        
        FOR i IN 1..(bracket_size/2) LOOP
            INSERT INTO matches (
                tournament_id, 
                round, 
                match_number,
                status
            ) VALUES (
                tournament_uuid, 
                round_num, 
                match_num,
                'pending'
            );
            
            match_num := match_num + 1;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;