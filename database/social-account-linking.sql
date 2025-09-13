-- Social Account Linking System
-- Run this in your Supabase SQL Editor

-- Create linked accounts table
CREATE TABLE IF NOT EXISTS user_linked_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'riot', 'steam', 'discord', 'twitch', 'epic', etc.
  platform_user_id VARCHAR(255) NOT NULL, -- Their ID on that platform
  platform_username VARCHAR(255), -- Their display name/username on that platform
  platform_data JSONB, -- Additional platform-specific data
  access_token TEXT, -- OAuth access token (encrypted in production)
  refresh_token TEXT, -- OAuth refresh token (encrypted in production)
  token_expires_at TIMESTAMP WITH TIME ZONE,
  is_public BOOLEAN DEFAULT true, -- Whether to show this on their profile
  verified BOOLEAN DEFAULT false, -- Whether we've verified ownership
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one account per platform per user
  UNIQUE(user_id, platform),
  -- Ensure one platform account can't be linked to multiple users
  UNIQUE(platform, platform_user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_linked_accounts_user_id ON user_linked_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_linked_accounts_platform ON user_linked_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_user_linked_accounts_platform_user_id ON user_linked_accounts(platform, platform_user_id);

-- Add RLS for linked accounts
ALTER TABLE user_linked_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view and manage their own linked accounts
CREATE POLICY "Users can manage their own linked accounts" ON user_linked_accounts
  FOR ALL USING (user_id = auth.uid());

-- Policy: Public linked accounts can be viewed by anyone (for profiles)
CREATE POLICY "Public linked accounts are viewable" ON user_linked_accounts
  FOR SELECT USING (is_public = true);

-- Create account linking verification table for OAuth flows
CREATE TABLE IF NOT EXISTS account_linking_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  state_token VARCHAR(255) NOT NULL UNIQUE, -- CSRF protection
  oauth_state JSONB, -- Store OAuth state data
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clean up expired sessions
CREATE INDEX IF NOT EXISTS idx_account_linking_sessions_expires_at ON account_linking_sessions(expires_at);

-- Add RLS for linking sessions
ALTER TABLE account_linking_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own linking sessions
CREATE POLICY "Users can access their own linking sessions" ON account_linking_sessions
  FOR ALL USING (user_id = auth.uid());

-- Function to clean up expired linking sessions
CREATE OR REPLACE FUNCTION cleanup_expired_linking_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM account_linking_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create platform-specific game profile data
CREATE TABLE IF NOT EXISTS game_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  linked_account_id UUID NOT NULL REFERENCES user_linked_accounts(id) ON DELETE CASCADE,
  game VARCHAR(100) NOT NULL, -- 'league_of_legends', 'valorant', 'csgo', 'dota2', etc.
  game_data JSONB NOT NULL, -- Game-specific data (rank, level, stats, etc.)
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(linked_account_id, game)
);

-- Add RLS for game profiles
ALTER TABLE game_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Game profiles follow the same rules as their linked accounts
CREATE POLICY "Game profiles inherit linked account permissions" ON game_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_linked_accounts 
      WHERE id = game_profiles.linked_account_id 
      AND (user_id = auth.uid() OR is_public = true)
    )
  );

-- Policy: Users can manage game profiles for their own linked accounts
CREATE POLICY "Users can manage their own game profiles" ON game_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_linked_accounts 
      WHERE id = game_profiles.linked_account_id 
      AND user_id = auth.uid()
    )
  );

-- Enable real-time subscriptions for linked accounts
ALTER publication supabase_realtime ADD TABLE user_linked_accounts;
ALTER publication supabase_realtime ADD TABLE game_profiles;