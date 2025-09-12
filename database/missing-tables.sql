-- Missing tables for profile and teams functionality
-- Run this in your Supabase SQL Editor to add the missing tables

-- General user teams table (separate from tournament teams)
CREATE TABLE IF NOT EXISTS user_teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  game VARCHAR(100),
  max_members INTEGER DEFAULT 5,
  is_public BOOLEAN DEFAULT TRUE,
  captain_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User game profiles table
CREATE TABLE IF NOT EXISTS user_game_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  rank VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, game_id)
);

-- Team members table (if you want team functionality)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- 'member', 'moderator', 'admin'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_game_profiles_user_id ON user_game_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_profiles_game_id ON user_game_profiles(game_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- Enable RLS for new tables
ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_game_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_teams
CREATE POLICY "Anyone can view public teams" ON user_teams
  FOR SELECT USING (is_public = true OR captain_id = auth.uid());

CREATE POLICY "Users can create teams" ON user_teams
  FOR INSERT WITH CHECK (auth.uid() = captain_id);

CREATE POLICY "Team captains can update teams" ON user_teams
  FOR UPDATE USING (auth.uid() = captain_id);

CREATE POLICY "Team captains can delete teams" ON user_teams
  FOR DELETE USING (auth.uid() = captain_id);

-- RLS Policies for user_game_profiles
CREATE POLICY "Users can view own game profiles" ON user_game_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own game profiles" ON user_game_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own game profiles" ON user_game_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own game profiles" ON user_game_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for team_members
CREATE POLICY "Team members are viewable by team members" ON team_members
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = team_members.team_id 
      AND tm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM teams t 
      WHERE t.id = team_members.team_id 
      AND t.captain_id = auth.uid()
    )
  );

CREATE POLICY "Team captains can manage members" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_members.team_id 
      AND teams.captain_id = auth.uid()
    )
  );

-- Add user_team_id reference to tournament teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS user_team_id UUID REFERENCES user_teams(id);

-- Triggers for updated_at
CREATE TRIGGER update_user_teams_updated_at 
  BEFORE UPDATE ON user_teams 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_game_profiles_updated_at 
  BEFORE UPDATE ON user_game_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();