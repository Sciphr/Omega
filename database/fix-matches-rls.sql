-- Fix RLS policy for matches table to allow tournament creators to create matches
-- Run this in your Supabase SQL Editor

-- Add INSERT policy for matches - only tournament creators can create matches
CREATE POLICY "Tournament creators can create matches" ON matches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = tournament_id 
      AND tournaments.creator_id = auth.uid()
    )
  );

-- Add UPDATE policy for matches - tournament creators and participants can update matches
CREATE POLICY "Tournament creators can update matches" ON matches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = tournament_id 
      AND tournaments.creator_id = auth.uid()
    )
  );

-- Also add policies for teams table if missing
CREATE POLICY "Tournament creators can manage teams" ON teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = tournament_id 
      AND tournaments.creator_id = auth.uid()
    )
  );

-- Add policy for match_events table
CREATE POLICY "Tournament creators can create match events" ON match_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches 
      JOIN tournaments ON tournaments.id = matches.tournament_id
      WHERE matches.id = match_id 
      AND tournaments.creator_id = auth.uid()
    )
  );

-- Add policies for match_participant_privileges table (access tokens)
CREATE POLICY "Tournament creators can create match access links" ON match_participant_privileges
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches 
      JOIN tournaments ON tournaments.id = matches.tournament_id
      WHERE matches.id = match_id 
      AND tournaments.creator_id = auth.uid()
    )
  );

CREATE POLICY "Tournament creators can view match access links" ON match_participant_privileges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches 
      JOIN tournaments ON tournaments.id = matches.tournament_id
      WHERE matches.id = match_id 
      AND tournaments.creator_id = auth.uid()
    )
  );

CREATE POLICY "Tournament creators can update match access links" ON match_participant_privileges
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM matches 
      JOIN tournaments ON tournaments.id = matches.tournament_id
      WHERE matches.id = match_id 
      AND tournaments.creator_id = auth.uid()
    )
  );

-- Allow access token validation (anyone can validate a token they have)
CREATE POLICY "Allow access token validation" ON match_participant_privileges
  FOR SELECT USING (true);