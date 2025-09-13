-- Match Ready System - allows participants to mark ready and tournament creators to start matches
-- Run this in your Supabase SQL Editor

-- Add ready status tracking to matches table
ALTER TABLE matches ADD COLUMN IF NOT EXISTS participant1_ready BOOLEAN DEFAULT FALSE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS participant2_ready BOOLEAN DEFAULT FALSE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS ready_timeout_at TIMESTAMP WITH TIME ZONE;

-- Create match ready events table for tracking ready state changes
CREATE TABLE IF NOT EXISTS match_ready_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL, -- 'ready', 'unready', 'creator_start', 'auto_start'
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Add RLS for match ready events
ALTER TABLE match_ready_events ENABLE ROW LEVEL SECURITY;

-- Policy: Tournament creators and participants can view ready events for their matches
CREATE POLICY "Match participants can view ready events" ON match_ready_events
  FOR SELECT USING (
    -- Tournament creator access
    EXISTS (
      SELECT 1 FROM matches 
      JOIN tournaments ON tournaments.id = matches.tournament_id
      WHERE matches.id = match_ready_events.match_id 
      AND tournaments.creator_id = auth.uid()
    )
    OR
    -- Participant access (if they have a valid access token or are the participant)
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = match_ready_events.match_id 
      AND (matches.participant1_id = match_ready_events.participant_id OR matches.participant2_id = match_ready_events.participant_id)
      AND EXISTS (
        SELECT 1 FROM participants 
        WHERE participants.id = match_ready_events.participant_id 
        AND participants.user_id = auth.uid()
      )
    )
  );

-- Policy: Tournament creators and participants can create ready events
CREATE POLICY "Match participants can create ready events" ON match_ready_events
  FOR INSERT WITH CHECK (
    -- Tournament creator can create any event type
    EXISTS (
      SELECT 1 FROM matches 
      JOIN tournaments ON tournaments.id = matches.tournament_id
      WHERE matches.id = match_id 
      AND tournaments.creator_id = auth.uid()
    )
    OR
    -- Participants can only create ready/unready events for themselves
    (event_type IN ('ready', 'unready') AND EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.id = participant_id 
      AND participants.user_id = auth.uid()
    ))
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_match_ready_events_match_id ON match_ready_events(match_id);
CREATE INDEX IF NOT EXISTS idx_match_ready_events_participant_id ON match_ready_events(participant_id);

-- Function to auto-start match when both participants are ready
CREATE OR REPLACE FUNCTION check_auto_start_match()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if this is a ready event
  IF NEW.event_type = 'ready' THEN
    -- Check if both participants are now ready
    UPDATE matches 
    SET 
      status = 'in_progress',
      started_at = NOW(),
      updated_at = NOW()
    WHERE id = NEW.match_id
      AND status = 'pending'
      AND participant1_ready = true 
      AND participant2_ready = true;
    
    -- If match was auto-started, log the auto-start event
    IF FOUND THEN
      INSERT INTO match_ready_events (match_id, event_type, timestamp)
      VALUES (NEW.match_id, 'auto_start', NOW());
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-start matches when both participants are ready
CREATE TRIGGER trigger_auto_start_match
  AFTER INSERT ON match_ready_events
  FOR EACH ROW
  EXECUTE FUNCTION check_auto_start_match();

-- Enable real-time subscriptions for match updates
ALTER publication supabase_realtime ADD TABLE matches;
ALTER publication supabase_realtime ADD TABLE match_ready_events;