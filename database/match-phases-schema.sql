-- Match Phase System Database Schema Extension
-- This extends the existing schema with draft/pick/ban phase functionality

-- Tournament phase configurations table
CREATE TABLE tournament_phases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  phase_name VARCHAR(50) NOT NULL, -- 'ban', 'pick', 'first_ban', 'first_pick', etc.
  phase_type VARCHAR(20) NOT NULL, -- 'ban', 'pick'
  phase_order INTEGER NOT NULL, -- Order of execution
  max_selections INTEGER DEFAULT 1, -- How many items can be selected in this phase
  turn_based BOOLEAN DEFAULT true, -- Whether participants alternate
  time_limit_seconds INTEGER DEFAULT 30, -- Time limit for each selection
  is_optional BOOLEAN DEFAULT false, -- Whether this phase can be skipped
  is_enabled BOOLEAN DEFAULT true, -- Whether this phase is active
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tournament_id, phase_order)
);

-- Match phase instances (for each match)
CREATE TABLE match_phases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  tournament_phase_id UUID NOT NULL REFERENCES tournament_phases(id) ON DELETE CASCADE,
  phase_order INTEGER NOT NULL,
  current_turn_participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  phase_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'completed', 'skipped'
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_remaining INTEGER, -- Seconds remaining for current turn
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Phase selections (individual picks/bans)
CREATE TABLE phase_selections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_phase_id UUID NOT NULL REFERENCES match_phases(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  selection_data JSONB NOT NULL, -- Flexible data for whatever was picked/banned
  selection_order INTEGER NOT NULL, -- Order within this phase
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Match participant privileges (secure access tokens)
CREATE TABLE match_participant_privileges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  access_token VARCHAR(255) UNIQUE NOT NULL, -- Secure random token
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(match_id, participant_id)
);

-- Match spectator access (for tournament creators and public viewing)
CREATE TABLE match_spectator_access (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  access_type VARCHAR(20) NOT NULL, -- 'creator', 'public', 'invited'
  access_token VARCHAR(255) UNIQUE, -- Optional token for invited spectators
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time match updates (for WebSocket/webhook notifications)
CREATE TABLE match_updates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  update_type VARCHAR(50) NOT NULL, -- 'phase_start', 'selection_made', 'phase_complete', 'match_start', etc.
  update_data JSONB DEFAULT '{}',
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL, -- Who caused the update
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_tournament_phases_tournament_id ON tournament_phases(tournament_id);
CREATE INDEX idx_tournament_phases_order ON tournament_phases(tournament_id, phase_order);
CREATE INDEX idx_match_phases_match_id ON match_phases(match_id);
CREATE INDEX idx_match_phases_status ON match_phases(phase_status);
CREATE INDEX idx_phase_selections_match_phase_id ON phase_selections(match_phase_id);
CREATE INDEX idx_match_participant_privileges_match_id ON match_participant_privileges(match_id);
CREATE INDEX idx_match_participant_privileges_token ON match_participant_privileges(access_token);
CREATE INDEX idx_match_spectator_access_match_id ON match_spectator_access(match_id);
CREATE INDEX idx_match_updates_match_id ON match_updates(match_id);
CREATE INDEX idx_match_updates_timestamp ON match_updates(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE tournament_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_participant_privileges ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_spectator_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournament_phases
CREATE POLICY "Tournament phases readable by tournament viewers" ON tournament_phases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = tournament_phases.tournament_id 
      AND (tournaments.is_public = true OR tournaments.creator_id = auth.uid())
    )
  );

CREATE POLICY "Tournament creators can manage phases" ON tournament_phases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = tournament_phases.tournament_id 
      AND tournaments.creator_id = auth.uid()
    )
  );

-- RLS Policies for match_phases (readable by match participants and spectators)
CREATE POLICY "Match phases readable by participants and spectators" ON match_phases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches 
      JOIN tournaments ON tournaments.id = matches.tournament_id
      WHERE matches.id = match_phases.match_id 
      AND (
        tournaments.is_public = true OR 
        tournaments.creator_id = auth.uid() OR
        matches.participant1_id IN (
          SELECT id FROM participants WHERE user_id = auth.uid()
        ) OR
        matches.participant2_id IN (
          SELECT id FROM participants WHERE user_id = auth.uid()
        )
      )
    )
  );

-- RLS Policies for phase_selections
CREATE POLICY "Phase selections readable by match participants" ON phase_selections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM match_phases 
      JOIN matches ON matches.id = match_phases.match_id
      JOIN tournaments ON tournaments.id = matches.tournament_id
      WHERE match_phases.id = phase_selections.match_phase_id 
      AND (
        tournaments.is_public = true OR 
        tournaments.creator_id = auth.uid() OR
        matches.participant1_id IN (
          SELECT id FROM participants WHERE user_id = auth.uid()
        ) OR
        matches.participant2_id IN (
          SELECT id FROM participants WHERE user_id = auth.uid()
        )
      )
    )
  );

-- RLS Policies for match_participant_privileges (only accessible by the participant)
CREATE POLICY "Participants can view their own privileges" ON match_participant_privileges
  FOR SELECT USING (
    participant_id IN (
      SELECT id FROM participants WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for match_updates (readable by all authorized viewers)
CREATE POLICY "Match updates readable by authorized users" ON match_updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches 
      JOIN tournaments ON tournaments.id = matches.tournament_id
      WHERE matches.id = match_updates.match_id 
      AND (
        tournaments.is_public = true OR 
        tournaments.creator_id = auth.uid() OR
        matches.participant1_id IN (
          SELECT id FROM participants WHERE user_id = auth.uid()
        ) OR
        matches.participant2_id IN (
          SELECT id FROM participants WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Triggers for updated_at columns
CREATE TRIGGER update_tournament_phases_updated_at BEFORE UPDATE ON tournament_phases 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_match_phases_updated_at BEFORE UPDATE ON match_phases 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to initialize match phases when a match starts
CREATE OR REPLACE FUNCTION initialize_match_phases(match_uuid UUID)
RETURNS void AS $$
DECLARE
    tournament_uuid UUID;
    phase_record RECORD;
BEGIN
    -- Get tournament ID from match
    SELECT tournament_id INTO tournament_uuid
    FROM matches 
    WHERE id = match_uuid;
    
    -- Create match phase instances for all enabled tournament phases
    FOR phase_record IN 
        SELECT * FROM tournament_phases 
        WHERE tournament_id = tournament_uuid 
        AND is_enabled = true 
        ORDER BY phase_order
    LOOP
        INSERT INTO match_phases (
            match_id,
            tournament_phase_id,
            phase_order,
            phase_status
        ) VALUES (
            match_uuid,
            phase_record.id,
            phase_record.phase_order,
            'pending'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to generate secure access tokens
CREATE OR REPLACE FUNCTION generate_match_access_tokens(match_uuid UUID)
RETURNS void AS $$
DECLARE
    participant_record RECORD;
    secure_token VARCHAR(255);
BEGIN
    -- Generate tokens for both participants
    FOR participant_record IN 
        SELECT DISTINCT participant_id
        FROM (
            SELECT participant1_id as participant_id FROM matches WHERE id = match_uuid
            UNION
            SELECT participant2_id as participant_id FROM matches WHERE id = match_uuid
        ) participants
        WHERE participant_id IS NOT NULL
    LOOP
        -- Generate cryptographically secure token
        secure_token := encode(gen_random_bytes(32), 'base64');
        
        INSERT INTO match_participant_privileges (
            match_id,
            participant_id,
            access_token,
            expires_at
        ) VALUES (
            match_uuid,
            participant_record.participant_id,
            secure_token,
            NOW() + INTERVAL '24 hours'
        )
        ON CONFLICT (match_id, participant_id) 
        DO UPDATE SET 
            access_token = EXCLUDED.access_token,
            expires_at = EXCLUDED.expires_at,
            is_active = true;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to advance to next phase
CREATE OR REPLACE FUNCTION advance_match_phase(match_uuid UUID)
RETURNS UUID AS $$
DECLARE
    current_phase_id UUID;
    next_phase_record RECORD;
    participant1_id UUID;
    participant2_id UUID;
BEGIN
    -- Get match participants
    SELECT matches.participant1_id, matches.participant2_id 
    INTO participant1_id, participant2_id
    FROM matches 
    WHERE id = match_uuid;
    
    -- Get current active phase
    SELECT id INTO current_phase_id
    FROM match_phases
    WHERE match_id = match_uuid 
    AND phase_status = 'active'
    LIMIT 1;
    
    -- Complete current phase if exists
    IF current_phase_id IS NOT NULL THEN
        UPDATE match_phases 
        SET phase_status = 'completed', completed_at = NOW()
        WHERE id = current_phase_id;
    END IF;
    
    -- Get next pending phase
    SELECT * INTO next_phase_record
    FROM match_phases mp
    JOIN tournament_phases tp ON tp.id = mp.tournament_phase_id
    WHERE mp.match_id = match_uuid 
    AND mp.phase_status = 'pending'
    ORDER BY mp.phase_order
    LIMIT 1;
    
    -- If next phase exists, activate it
    IF next_phase_record.id IS NOT NULL THEN
        UPDATE match_phases 
        SET 
            phase_status = 'active', 
            started_at = NOW(),
            current_turn_participant_id = participant1_id, -- Always start with participant 1
            time_remaining = (
                SELECT time_limit_seconds 
                FROM tournament_phases 
                WHERE id = next_phase_record.tournament_phase_id
            )
        WHERE id = next_phase_record.id;
        
        RETURN next_phase_record.id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;