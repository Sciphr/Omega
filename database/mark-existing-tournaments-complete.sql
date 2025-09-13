-- Mark existing tournaments as completed if all their matches are finished
-- Run this in your Supabase SQL Editor

UPDATE tournaments 
SET 
  status = 'completed',
  completed_at = NOW(),
  updated_at = NOW()
WHERE status = 'in_progress'
AND NOT EXISTS (
  SELECT 1 
  FROM matches 
  WHERE tournament_id = tournaments.id
  AND status != 'completed'
);

-- This will update any tournament that:
-- 1. Is currently 'in_progress' 
-- 2. Has ALL matches completed