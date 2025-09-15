# 🗄️ Omega Tournament Platform - Complete Database Schema

> **Last Updated**: September 15, 2025
> **Version**: 2.1 - Performance Tracking System
> **Supabase Project**: Omega Tournament Platform

---

## 📋 **Table of Contents**

1. [Core User Management](#core-user-management)
2. [Team System](#team-system)
3. [Tournament System](#tournament-system)
4. [Match & Game System](#match--game-system)
5. [Performance Tracking](#performance-tracking)
6. [Game Profiles](#game-profiles)
7. [Authentication & Security](#authentication--security)
8. [Views & Functions](#views--functions)

---

## 🔐 **Core User Management**

### `users`
Primary user profiles extending Supabase Auth
```sql
users (
  id UUID PRIMARY KEY,           -- Supabase auth.users.id
  email VARCHAR(255) UNIQUE,     -- User email
  username VARCHAR(50) UNIQUE,   -- Unique username
  display_name VARCHAR(100),     -- Display name
  avatar_url TEXT,               -- Profile picture URL
  created_at TIMESTAMPTZ,        -- Account creation
  updated_at TIMESTAMPTZ,        -- Last profile update
  is_verified BOOLEAN,           -- Email verification status
  bio TEXT,                      -- User biography
  timezone VARCHAR(50)           -- User timezone
)
```

### `user_game_profiles`
Game-specific user profiles and rankings
```sql
user_game_profiles (
  id UUID PRIMARY KEY,
  user_id UUID → users(id),
  game_id VARCHAR(100),          -- Game identifier (league_of_legends, etc.)
  display_name VARCHAR(100),     -- In-game name
  rank VARCHAR(50),              -- Current rank/tier
  notes TEXT,                    -- Additional profile notes
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id, game_id)
)
```

---

## 👥 **Team System**

### `user_teams`
General teams created by users (persistent)
```sql
user_teams (
  id UUID PRIMARY KEY,
  name VARCHAR(100),             -- Team name
  description TEXT,              -- Team description
  game VARCHAR(100),             -- Primary game
  max_members INTEGER DEFAULT 5, -- Maximum team size
  is_public BOOLEAN DEFAULT TRUE, -- Public visibility
  captain_id UUID → users(id),   -- Team captain
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### `team_members`
Team membership relationships
```sql
team_members (
  id UUID PRIMARY KEY,
  team_id UUID → user_teams(id),
  user_id UUID → users(id),      -- NULL for guest members
  display_name VARCHAR(100),     -- For guest members
  email VARCHAR(255),            -- For guest members
  role VARCHAR(50) DEFAULT 'member', -- 'member', 'moderator', 'leader'
  is_registered BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMPTZ,
  UNIQUE(team_id, user_id) WHERE user_id IS NOT NULL
)
```

### `teams`
Tournament-specific team entries (temporary)
```sql
teams (
  id UUID PRIMARY KEY,
  tournament_id UUID → tournaments(id),
  name VARCHAR(100),             -- Team name for this tournament
  tag VARCHAR(10),               -- Team tag/abbreviation
  captain_id UUID → users(id),   -- Team captain
  captain_name VARCHAR(100),     -- Captain display name
  user_team_id UUID → user_teams(id), -- Reference to original team
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'eliminated', 'withdrawn'
  created_at TIMESTAMPTZ
)
```

---

## 🏆 **Tournament System**

### `tournaments`
Main tournament entries
```sql
tournaments (
  id UUID PRIMARY KEY,
  name VARCHAR(200),             -- Tournament name
  description TEXT,              -- Tournament description
  game VARCHAR(100),             -- Game being played
  format VARCHAR(50),            -- 'single_elimination', 'double_elimination', etc.
  tournament_type VARCHAR(20) DEFAULT 'individual', -- 'individual', 'team'
  team_size INTEGER DEFAULT 1,  -- Players per team

  -- Participation limits
  max_participants INTEGER,      -- Maximum participants/teams
  current_participants INTEGER DEFAULT 0,

  -- Tournament configuration
  password_hash VARCHAR(255),    -- Optional password protection
  is_public BOOLEAN DEFAULT TRUE,
  participation_type VARCHAR(20) DEFAULT 'anyone', -- 'anyone', 'registered_only'
  seeding_type VARCHAR(20) DEFAULT 'manual', -- 'manual', 'random', 'ranked'

  -- Timing
  registration_deadline TIMESTAMPTZ,
  start_time TIMESTAMPTZ,
  check_in_deadline TIMESTAMPTZ,

  -- Status tracking
  status VARCHAR(20) DEFAULT 'registration', -- 'registration', 'in_progress', 'completed', 'cancelled'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completion_reason VARCHAR(50), -- 'finished', 'cancelled', 'insufficient_participants'

  -- Tournament results
  declared_winner_id UUID → participants(id),
  prize_pool DECIMAL(10,2),

  -- Ownership
  creator_id UUID → users(id),
  creator_name VARCHAR(100),

  -- Settings (JSON for flexibility)
  settings JSONB DEFAULT '{}',   -- Match format, rules, etc.

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### `participants`
Tournament participants (individuals or team members)
```sql
participants (
  id UUID PRIMARY KEY,
  tournament_id UUID → tournaments(id),

  -- Participant identity
  participant_name VARCHAR(100), -- Display name in tournament
  participant_type VARCHAR(20) DEFAULT 'individual', -- 'individual', 'team'
  user_id UUID → users(id),      -- NULL for guest participants
  team_id UUID → teams(id),      -- NULL for individual tournaments

  -- Tournament positioning
  seed INTEGER,                  -- Bracket position
  display_order INTEGER DEFAULT 0, -- Display ordering

  -- Contact & access
  email VARCHAR(255),            -- Contact email
  receives_match_access BOOLEAN DEFAULT FALSE, -- Gets match links
  contact_method VARCHAR(20) DEFAULT 'none', -- 'email', 'discord', 'none'

  -- Status tracking
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'eliminated', 'withdrawn'
  joined_at TIMESTAMPTZ,
  eliminated_at TIMESTAMPTZ,
  elimination_reason VARCHAR(100)
)
```

---

## 🎮 **Match & Game System**

### `matches`
Individual tournament matches
```sql
matches (
  id UUID PRIMARY KEY,
  tournament_id UUID → tournaments(id),

  -- Match structure
  round INTEGER,                 -- Tournament round number
  match_number INTEGER,          -- Match number within round
  bracket_type VARCHAR(20) DEFAULT 'winner', -- 'winner', 'loser' (for double elim)

  -- Participants
  participant1_id UUID → participants(id),
  participant2_id UUID → participants(id),
  participant1_score INTEGER DEFAULT 0,
  participant2_score INTEGER DEFAULT 0,

  -- Match results
  winner_id UUID → participants(id),
  loser_id UUID → participants(id),
  score JSONB DEFAULT '{}',      -- Detailed scoring data

  -- Status and timing
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  scheduled_time TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Additional data
  notes TEXT,                    -- Match notes or comments
  forfeit BOOLEAN DEFAULT FALSE, -- Was this a forfeit?

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### `game_profiles`
Game definitions and configurations
```sql
game_profiles (
  id UUID PRIMARY KEY,
  game_id VARCHAR(100) UNIQUE,   -- Game identifier
  name VARCHAR(100),             -- Display name
  description TEXT,              -- Game description
  icon_url TEXT,                 -- Game icon

  -- Draft/Ban system configuration
  draft_ban_enabled BOOLEAN DEFAULT FALSE,
  draft_ban_config JSONB DEFAULT '{}', -- Draft/ban settings

  -- Game-specific settings
  default_match_format JSONB DEFAULT '{}',
  scoring_system JSONB DEFAULT '{}',

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

---

## 📊 **Performance Tracking**

### `team_tournament_results`
Team performance in specific tournaments
```sql
team_tournament_results (
  id UUID PRIMARY KEY,
  team_id UUID → user_teams(id),
  tournament_id UUID → tournaments(id),

  -- Tournament results
  placement INTEGER,             -- Final ranking (1st, 2nd, etc.)
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  points_scored INTEGER DEFAULT 0,
  points_against INTEGER DEFAULT 0,
  eliminated_round INTEGER,      -- Round eliminated

  -- Performance metrics
  performance_rating DECIMAL(10,2), -- Match performance score
  prize_earned DECIMAL(10,2) DEFAULT 0,
  notes TEXT,

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(team_id, tournament_id)
)
```

### `team_stats`
Aggregated team statistics
```sql
team_stats (
  id UUID PRIMARY KEY,
  team_id UUID → user_teams(id),
  game_id VARCHAR(100),

  -- Tournament participation
  tournaments_played INTEGER DEFAULT 0,
  tournaments_won INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,

  -- Performance metrics
  win_rate DECIMAL(5,2) DEFAULT 0, -- Percentage
  average_placement DECIMAL(5,2), -- Average tournament finish
  performance_rating DECIMAL(10,2) DEFAULT 1000, -- ELO-style rating
  highest_placement INTEGER,      -- Best tournament finish

  -- Activity tracking
  last_active TIMESTAMPTZ,
  activity_score INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(team_id, game_id)
)
```

### `player_tournament_results`
Individual player tournament performance
```sql
player_tournament_results (
  id UUID PRIMARY KEY,
  user_id UUID → users(id),
  tournament_id UUID → tournaments(id),
  team_id UUID → user_teams(id), -- NULL for individual tournaments

  -- Tournament results
  placement INTEGER,             -- Final ranking
  kills INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  mvp_awards INTEGER DEFAULT 0,

  -- Game-specific stats (flexible JSON)
  game_stats JSONB DEFAULT '{}',

  -- Meta information
  role VARCHAR(50),              -- Position/role played
  champion_most_played VARCHAR(100), -- Most used character
  performance_rating DECIMAL(10,2),

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id, tournament_id)
)
```

### `player_stats`
Aggregated player statistics per game
```sql
player_stats (
  id UUID PRIMARY KEY,
  user_id UUID → users(id),
  game_id VARCHAR(100),

  -- Tournament participation
  tournaments_played INTEGER DEFAULT 0,
  tournaments_won INTEGER DEFAULT 0,

  -- Performance stats
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  total_kills INTEGER DEFAULT 0,
  total_deaths INTEGER DEFAULT 0,
  total_assists INTEGER DEFAULT 0,
  mvp_awards INTEGER DEFAULT 0,

  -- Calculated metrics
  win_rate DECIMAL(5,2) DEFAULT 0,
  kda_ratio DECIMAL(5,2) DEFAULT 0, -- (Kills + Assists) / Deaths
  performance_rating DECIMAL(10,2) DEFAULT 1000,
  average_placement DECIMAL(5,2),

  -- Player preferences
  preferred_role VARCHAR(50),
  favorite_champions TEXT[],     -- Array of most played characters

  -- Activity tracking
  last_active TIMESTAMPTZ,
  activity_score INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id, game_id)
)
```

### `match_player_stats`
Detailed match-level player performance
```sql
match_player_stats (
  id UUID PRIMARY KEY,
  match_id UUID → matches(id),
  user_id UUID → users(id),

  -- Match performance
  kills INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  champion VARCHAR(100),         -- Character used
  role VARCHAR(50),              -- Position played

  -- Game-specific stats (flexible)
  game_stats JSONB DEFAULT '{}',

  -- Performance rating
  match_rating DECIMAL(10,2),
  mvp BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ,
  UNIQUE(match_id, user_id)
)
```

---

## 🎯 **Views & Functions**

### Views
```sql
-- Team leaderboard view for public team discovery
CREATE OR REPLACE VIEW team_leaderboard AS
SELECT
  ut.id,
  ut.name,
  ut.game,
  ts.performance_rating,
  ts.win_rate,
  ts.tournaments_played,
  ts.tournaments_won,
  ts.total_wins,
  ts.total_losses,
  ts.average_placement,
  ts.last_active,
  ut.captain_id,
  u.display_name as captain_name
FROM user_teams ut
LEFT JOIN team_stats ts ON ut.id = ts.team_id
LEFT JOIN users u ON ut.captain_id = u.id
WHERE ut.is_public = true
ORDER BY ts.performance_rating DESC NULLS LAST, ts.win_rate DESC NULLS LAST;

-- Player leaderboard view for individual rankings
CREATE OR REPLACE VIEW player_leaderboard AS
SELECT
  u.id,
  u.username,
  u.display_name,
  ps.game_id,
  ps.performance_rating,
  ps.win_rate,
  ps.tournaments_played,
  ps.tournaments_won,
  ps.kda_ratio,
  ps.preferred_role,
  ps.last_active
FROM users u
LEFT JOIN player_stats ps ON u.id = ps.user_id
ORDER BY ps.performance_rating DESC NULLS LAST, ps.win_rate DESC NULLS LAST;
```

### Functions
```sql
-- Auto-update team stats after tournament completion
CREATE OR REPLACE FUNCTION update_team_stats_after_tournament()
RETURNS TRIGGER AS $$
BEGIN
  -- Update team_stats table with aggregated data
  INSERT INTO team_stats (team_id, game_id, tournaments_played, tournaments_won, total_wins, total_losses, win_rate, average_placement, performance_rating, last_active, updated_at)
  SELECT
    NEW.team_id,
    t.game,
    COUNT(*) as tournaments_played,
    COUNT(*) FILTER (WHERE NEW.placement = 1) as tournaments_won,
    COALESCE(SUM(NEW.wins), 0) as total_wins,
    COALESCE(SUM(NEW.losses), 0) as total_losses,
    CASE
      WHEN COALESCE(SUM(NEW.wins), 0) + COALESCE(SUM(NEW.losses), 0) > 0
      THEN (COALESCE(SUM(NEW.wins), 0)::DECIMAL / (COALESCE(SUM(NEW.wins), 0) + COALESCE(SUM(NEW.losses), 0))) * 100
      ELSE 0
    END as win_rate,
    AVG(NEW.placement) as average_placement,
    COALESCE(NEW.performance_rating, 1000) as performance_rating,
    NOW() as last_active,
    NOW() as updated_at
  FROM tournaments t
  WHERE t.id = NEW.tournament_id
  GROUP BY NEW.team_id, t.game
  ON CONFLICT (team_id, game_id)
  DO UPDATE SET
    tournaments_played = team_stats.tournaments_played + 1,
    tournaments_won = team_stats.tournaments_won + (CASE WHEN NEW.placement = 1 THEN 1 ELSE 0 END),
    total_wins = team_stats.total_wins + COALESCE(NEW.wins, 0),
    total_losses = team_stats.total_losses + COALESCE(NEW.losses, 0),
    win_rate = CASE
      WHEN (team_stats.total_wins + COALESCE(NEW.wins, 0)) + (team_stats.total_losses + COALESCE(NEW.losses, 0)) > 0
      THEN ((team_stats.total_wins + COALESCE(NEW.wins, 0))::DECIMAL / ((team_stats.total_wins + COALESCE(NEW.wins, 0)) + (team_stats.total_losses + COALESCE(NEW.losses, 0)))) * 100
      ELSE 0
    END,
    performance_rating = COALESCE(NEW.performance_rating, team_stats.performance_rating),
    last_active = NOW(),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update team stats
CREATE TRIGGER update_team_stats_trigger
  AFTER INSERT OR UPDATE ON team_tournament_results
  FOR EACH ROW
  EXECUTE FUNCTION update_team_stats_after_tournament();
```

### Indexes for Performance
```sql
-- Team performance indexes
CREATE INDEX IF NOT EXISTS idx_team_stats_performance_rating ON team_stats(performance_rating DESC);
CREATE INDEX IF NOT EXISTS idx_team_stats_win_rate ON team_stats(win_rate DESC);
CREATE INDEX IF NOT EXISTS idx_team_stats_game_id ON team_stats(game_id);

-- Player performance indexes
CREATE INDEX IF NOT EXISTS idx_player_stats_performance_rating ON player_stats(performance_rating DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_game_id ON player_stats(game_id);

-- Tournament results indexes
CREATE INDEX IF NOT EXISTS idx_team_tournament_results_team_id ON team_tournament_results(team_id);
CREATE INDEX IF NOT EXISTS idx_player_tournament_results_user_id ON player_tournament_results(user_id);
```

---

## 🔒 **Security & RLS**

### Row Level Security
- **Public Read**: Most tournament and performance data
- **Owner Write**: Users can only edit their own data
- **Captain Access**: Team captains can manage their teams
- **Tournament Creator**: Full access to their tournaments

### Key Policies

#### Core Tables
- **Teams**: Captain can manage, anyone can view public teams
- **Tournaments**: Creator has full access, participants can view
- **User profiles**: Owner can edit, anyone can view public info

#### Performance Tracking Tables
```sql
-- Team tournament results: Anyone can view, team captains can update
CREATE POLICY "Anyone can view team tournament results" ON team_tournament_results
  FOR SELECT USING (true);

CREATE POLICY "Team captains can update team tournament results" ON team_tournament_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_teams
      WHERE user_teams.id = team_tournament_results.team_id
      AND user_teams.captain_id = auth.uid()
    )
  );

-- Team stats: Public read, captain write
CREATE POLICY "Anyone can view team stats" ON team_stats
  FOR SELECT USING (true);

CREATE POLICY "Team captains can update team stats" ON team_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_teams
      WHERE user_teams.id = team_stats.team_id
      AND user_teams.captain_id = auth.uid()
    )
  );

-- Player tournament results: Anyone can view, players can update own
CREATE POLICY "Anyone can view player tournament results" ON player_tournament_results
  FOR SELECT USING (true);

CREATE POLICY "Players can update own tournament results" ON player_tournament_results
  FOR ALL USING (user_id = auth.uid());

-- Player stats: Anyone can view, players can update own
CREATE POLICY "Anyone can view player stats" ON player_stats
  FOR SELECT USING (true);

CREATE POLICY "Players can update own stats" ON player_stats
  FOR ALL USING (user_id = auth.uid());

-- Match player stats: Anyone can view, players can update own
CREATE POLICY "Anyone can view match player stats" ON match_player_stats
  FOR SELECT USING (true);

CREATE POLICY "Players can update own match stats" ON match_player_stats
  FOR ALL USING (user_id = auth.uid());
```

---

## 🚀 **Migration Order**

1. **Core tables**: `users`, `user_game_profiles`
2. **Team system**: `user_teams`, `team_members`
3. **Tournament system**: `tournaments`, `participants`, `teams`, `matches`
4. **Game system**: `game_profiles`
5. **Performance tracking**: All `*_stats` and `*_results` tables
6. **Views and functions**
7. **RLS policies**

---

## 📝 **Notes**

- All tables use UUID primary keys for scalability
- JSONB columns provide flexibility for game-specific data
- Performance tracking supports both individual and team tournaments
- Row Level Security ensures proper data access control
- Triggers automatically maintain aggregated statistics

---

> **To Update This Schema**: Run new migrations → Update this file → Commit both to version control