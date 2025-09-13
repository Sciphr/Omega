-- Score Submission and Verification System
-- Run this in your Supabase SQL Editor

-- Create score submissions table
CREATE TABLE IF NOT EXISTS score_submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  participant1_score INTEGER NOT NULL DEFAULT 0,
  participant2_score INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'disputed', 'final'
  submission_type VARCHAR(20) NOT NULL DEFAULT 'initial', -- 'initial', 'counter', 'creator_override'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create score verification actions table
CREATE TABLE IF NOT EXISTS score_verification_actions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  score_submission_id UUID NOT NULL REFERENCES score_submissions(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  action_type VARCHAR(20) NOT NULL, -- 'accept', 'dispute', 'counter_propose', 'creator_finalize'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Add score submission tracking to matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS current_score_submission_id UUID REFERENCES score_submissions(id);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS score_submission_status VARCHAR(20) DEFAULT 'none'; -- 'none', 'pending_verification', 'disputed', 'finalized'

-- Add RLS for score submissions
ALTER TABLE score_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_verification_actions ENABLE ROW LEVEL SECURITY;

-- Policy: Participants and tournament creators can view score submissions for their matches
CREATE POLICY "Match participants can view score submissions" ON score_submissions
  FOR SELECT USING (
    -- Tournament creator access
    EXISTS (
      SELECT 1 FROM matches 
      JOIN tournaments ON tournaments.id = matches.tournament_id
      WHERE matches.id = score_submissions.match_id 
      AND tournaments.creator_id = auth.uid()
    )
    OR
    -- Participant access
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = score_submissions.match_id 
      AND (matches.participant1_id IN (
        SELECT id FROM participants WHERE user_id = auth.uid()
      ) OR matches.participant2_id IN (
        SELECT id FROM participants WHERE user_id = auth.uid()
      ))
    )
  );

-- Policy: Participants can create score submissions
CREATE POLICY "Match participants can create score submissions" ON score_submissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = match_id 
      AND (matches.participant1_id = submitted_by OR matches.participant2_id = submitted_by)
      AND matches.participant1_id IN (
        SELECT id FROM participants WHERE user_id = auth.uid()
      ) OR matches.participant2_id IN (
        SELECT id FROM participants WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Tournament creators can update any score submission
CREATE POLICY "Tournament creators can update score submissions" ON score_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM matches 
      JOIN tournaments ON tournaments.id = matches.tournament_id
      WHERE matches.id = score_submissions.match_id 
      AND tournaments.creator_id = auth.uid()
    )
  );

-- Policy: Participants and tournament creators can view verification actions
CREATE POLICY "Match participants can view verification actions" ON score_verification_actions
  FOR SELECT USING (
    -- Tournament creator access
    EXISTS (
      SELECT 1 FROM matches 
      JOIN tournaments ON tournaments.id = matches.tournament_id
      WHERE matches.id = score_verification_actions.match_id 
      AND tournaments.creator_id = auth.uid()
    )
    OR
    -- Participant access
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = score_verification_actions.match_id 
      AND (matches.participant1_id IN (
        SELECT id FROM participants WHERE user_id = auth.uid()
      ) OR matches.participant2_id IN (
        SELECT id FROM participants WHERE user_id = auth.uid()
      ))
    )
  );

-- Policy: Participants and tournament creators can create verification actions
CREATE POLICY "Match participants can create verification actions" ON score_verification_actions
  FOR INSERT WITH CHECK (
    -- Tournament creator can create any action
    EXISTS (
      SELECT 1 FROM matches 
      JOIN tournaments ON tournaments.id = matches.tournament_id
      WHERE matches.id = match_id 
      AND tournaments.creator_id = auth.uid()
    )
    OR
    -- Participants can create actions for their matches
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = match_id 
      AND (matches.participant1_id = participant_id OR matches.participant2_id = participant_id)
      AND matches.participant1_id IN (
        SELECT id FROM participants WHERE user_id = auth.uid()
      ) OR matches.participant2_id IN (
        SELECT id FROM participants WHERE user_id = auth.uid()
      )
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_score_submissions_match_id ON score_submissions(match_id);
CREATE INDEX IF NOT EXISTS idx_score_submissions_submitted_by ON score_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_score_verification_actions_match_id ON score_verification_actions(match_id);
CREATE INDEX IF NOT EXISTS idx_score_verification_actions_submission_id ON score_verification_actions(score_submission_id);

-- Function to finalize match when score is accepted
CREATE OR REPLACE FUNCTION finalize_match_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is an acceptance action
  IF NEW.action_type = 'accept' OR NEW.action_type = 'creator_finalize' THEN
    -- Get the score submission
    DECLARE
      submission RECORD;
      winner_participant_id UUID;
    BEGIN
      SELECT * INTO submission FROM score_submissions WHERE id = NEW.score_submission_id;
      
      -- Determine winner based on scores
      IF submission.participant1_score > submission.participant2_score THEN
        SELECT participant1_id INTO winner_participant_id FROM matches WHERE id = NEW.match_id;
      ELSIF submission.participant2_score > submission.participant1_score THEN
        SELECT participant2_id INTO winner_participant_id FROM matches WHERE id = NEW.match_id;
      ELSE
        winner_participant_id := NULL; -- Tie
      END IF;
      
      -- Update match with final scores and status
      UPDATE matches 
      SET 
        status = 'completed',
        participant1_score = submission.participant1_score,
        participant2_score = submission.participant2_score,
        winner_id = winner_participant_id,
        completed_at = NOW(),
        updated_at = NOW(),
        score_submission_status = 'finalized',
        current_score_submission_id = NEW.score_submission_id
      WHERE id = NEW.match_id;
      
      -- Mark the score submission as final
      UPDATE score_submissions 
      SET 
        status = 'final',
        updated_at = NOW()
      WHERE id = NEW.score_submission_id;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to finalize matches when scores are accepted
CREATE TRIGGER trigger_finalize_match_score
  AFTER INSERT ON score_verification_actions
  FOR EACH ROW
  EXECUTE FUNCTION finalize_match_score();

-- Enable real-time subscriptions
ALTER publication supabase_realtime ADD TABLE score_submissions;
ALTER publication supabase_realtime ADD TABLE score_verification_actions;