-- Auto-complete tournament when all matches are finished
-- Run this in your Supabase SQL Editor

-- Function to check if tournament should be completed
CREATE OR REPLACE FUNCTION check_tournament_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this match completion should trigger tournament completion
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Check if all matches in this tournament are now completed
    UPDATE tournaments 
    SET 
      status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = (
      SELECT tournament_id 
      FROM matches 
      WHERE id = NEW.id
    )
    AND status = 'in_progress'
    AND NOT EXISTS (
      SELECT 1 
      FROM matches 
      WHERE tournament_id = (
        SELECT tournament_id 
        FROM matches 
        WHERE id = NEW.id
      )
      AND status != 'completed'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-complete tournaments when all matches are done
DROP TRIGGER IF EXISTS trigger_auto_complete_tournament ON matches;
CREATE TRIGGER trigger_auto_complete_tournament
  AFTER UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION check_tournament_completion();

-- Add completed_at column to tournaments if it doesn't exist
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;