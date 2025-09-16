// Database Schema Reference
// This file documents our Supabase database schema for easy reference

export const TABLES = {
  tournaments: {
    id: 'uuid PRIMARY KEY',
    name: 'text NOT NULL',
    description: 'text',
    game: 'text NOT NULL',
    format: 'text NOT NULL', // 'single_elimination', 'double_elimination', 'round_robin'
    tournament_type: 'text NOT NULL DEFAULT \'individual\'', // 'individual', 'team'
    team_size: 'integer DEFAULT 1',
    status: 'text NOT NULL DEFAULT \'registration\'', // 'registration', 'in_progress', 'completed', 'archived'
    max_participants: 'integer NOT NULL',
    current_participants: 'integer DEFAULT 0',
    participation_type: 'text NOT NULL', // 'anyone', 'registered_only'
    seeding_type: 'text NOT NULL', // 'random', 'manual', 'ranked', 'skill_balanced', 'ai_optimized', 'recent_performance'
    round_robin_type: 'text', // 'single', 'double', 'groups' - only for round_robin format
    group_count: 'integer', // Number of groups for round robin groups format
    group_creation_method: 'text', // 'skill_balanced', 'seeded', 'random' - for round robin groups
    password_hash: 'text',
    creator_id: 'uuid REFERENCES auth.users(id)', // Can be NULL for guest tournaments
    creator_name: 'text',
    is_public: 'boolean DEFAULT true',
    thumbnail_image_url: 'text', // Image for tournament cards/listings
    banner_image_url: 'text', // Banner image for tournament page
    settings: 'jsonb DEFAULT \'{}\'',
    bracket_data: 'jsonb',
    created_at: 'timestamptz DEFAULT NOW()',
    updated_at: 'timestamptz DEFAULT NOW()',
    started_at: 'timestamptz',
    completed_at: 'timestamptz',
    completion_reason: 'text', // 'natural', 'manual_stop' - how tournament ended
    declared_winner_id: 'uuid REFERENCES participants(id)' // For manually stopped tournaments
  },

  participants: {
    id: 'uuid PRIMARY KEY',
    tournament_id: 'uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE',
    user_id: 'uuid REFERENCES auth.users(id)', // Can be NULL for guest participants
    participant_name: 'text NOT NULL',
    participant_type: 'text DEFAULT \'individual\'', // 'individual', 'team'
    seed: 'integer',
    status: 'text DEFAULT \'active\'', // 'active', 'eliminated', 'withdrawn'
    team_id: 'uuid REFERENCES teams(id)',
    team_tournament_entry_id: 'uuid REFERENCES team_tournament_entries(id)',
    display_order: 'integer', // Order of joining for display purposes
    joined_at: 'timestamptz DEFAULT NOW()',
    eliminated_at: 'timestamptz'
  },

  matches: {
    id: 'uuid PRIMARY KEY',
    tournament_id: 'uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE',
    round: 'integer NOT NULL',
    match_number: 'integer NOT NULL',
    bracket_type: 'text DEFAULT \'winner\'', // 'winner', 'loser', 'grand_final' (for double elimination), 'group' (for round robin)
    group_id: 'text', // For round robin group matches
    participant1_id: 'uuid REFERENCES participants(id)',
    participant2_id: 'uuid REFERENCES participants(id)',
    winner_id: 'uuid REFERENCES participants(id)',
    score: 'jsonb',
    participant1_score: 'integer',
    participant2_score: 'integer',
    status: 'text DEFAULT \'pending\'', // 'pending', 'in_progress', 'completed', 'disputed', 'forfeit'
    match_format: 'text DEFAULT \'bo1\'', // 'bo1', 'bo3', 'bo5'
    scheduled_time: 'timestamptz',
    started_at: 'timestamptz',
    completed_at: 'timestamptz',
    created_at: 'timestamptz DEFAULT NOW()',
    updated_at: 'timestamptz DEFAULT NOW()'
  },

  match_events: {
    id: 'uuid PRIMARY KEY',
    match_id: 'uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE',
    event_type: 'text NOT NULL', // 'score_update', 'forfeit', 'dispute', 'draft_pick', 'draft_ban'
    participant_id: 'uuid REFERENCES participants(id)',
    event_data: 'jsonb',
    created_at: 'timestamptz DEFAULT NOW()',
    created_by: 'uuid REFERENCES auth.users(id)'
  },

  teams: {
    id: 'uuid PRIMARY KEY',
    name: 'text NOT NULL',
    tag: 'text',
    captain_id: 'uuid REFERENCES auth.users(id)',
    members: 'jsonb DEFAULT \'[]\'',
    created_at: 'timestamptz DEFAULT NOW()',
    updated_at: 'timestamptz DEFAULT NOW()'
  },

  team_tournament_entries: {
    id: 'uuid PRIMARY KEY',
    tournament_id: 'uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE',
    team_id: 'uuid NOT NULL REFERENCES teams(id)',
    captain_id: 'uuid NOT NULL REFERENCES auth.users(id)',
    roster: 'jsonb NOT NULL', // Array of player IDs participating for this team
    status: 'text DEFAULT \'active\'', // 'active', 'withdrawn', 'eliminated'
    created_at: 'timestamptz DEFAULT NOW()',
    updated_at: 'timestamptz DEFAULT NOW()'
  },

  match_participant_privileges: {
    id: 'uuid PRIMARY KEY',
    match_id: 'uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE',
    participant_id: 'uuid NOT NULL REFERENCES participants(id)',
    access_token: 'text NOT NULL UNIQUE',
    expires_at: 'timestamptz NOT NULL',
    is_active: 'boolean DEFAULT true',
    created_at: 'timestamptz DEFAULT NOW()'
  },

  users: {
    id: 'uuid PRIMARY KEY REFERENCES auth.users(id)',
    username: 'text UNIQUE NOT NULL',
    email: 'text UNIQUE NOT NULL',
    display_name: 'text',
    game_rankings: 'jsonb DEFAULT \'{}\'', // Game-specific rankings/stats
    achievement_points: 'integer DEFAULT 0', // Total achievement points
    is_verified: 'boolean DEFAULT false',
    created_at: 'timestamptz DEFAULT NOW()',
    updated_at: 'timestamptz DEFAULT NOW()'
  },

  // Achievement system tables
  achievements: {
    id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
    slug: 'text UNIQUE NOT NULL',
    name: 'text NOT NULL',
    description: 'text NOT NULL',
    category: 'text NOT NULL', // 'tournament', 'performance', 'social', 'game_specific', 'rare'
    tier: 'text NOT NULL', // 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'legendary'
    icon_url: 'text',
    icon_emoji: 'text',
    points: 'integer DEFAULT 0',
    is_secret: 'boolean DEFAULT false',
    requirements: 'jsonb NOT NULL',
    game_id: 'text',
    created_at: 'timestamptz DEFAULT NOW()',
    updated_at: 'timestamptz DEFAULT NOW()'
  },

  user_achievements: {
    id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
    user_id: 'uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE',
    achievement_id: 'uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE',
    unlocked_at: 'timestamptz NOT NULL DEFAULT NOW()',
    progress: 'jsonb DEFAULT \'{}\'',
    context_data: 'jsonb DEFAULT \'{}\'',
    is_featured: 'boolean DEFAULT false',
    created_at: 'timestamptz DEFAULT NOW()',
    UNIQUE: '(user_id, achievement_id)'
  },

  achievement_progress: {
    id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
    user_id: 'uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE',
    achievement_id: 'uuid REFERENCES achievements(id) ON DELETE CASCADE',
    progress_key: 'text NOT NULL',
    progress_value: 'integer DEFAULT 0',
    metadata: 'jsonb DEFAULT \'{}\'',
    last_updated: 'timestamptz DEFAULT NOW()',
    UNIQUE: '(user_id, progress_key)'
  },

  achievement_categories: {
    id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
    slug: 'text UNIQUE NOT NULL',
    name: 'text NOT NULL',
    description: 'text',
    icon: 'text',
    sort_order: 'integer DEFAULT 0',
    created_at: 'timestamptz DEFAULT NOW()'
  }
}

// Useful field subsets for queries
export const TOURNAMENT_FIELDS = {
  // Basic tournament info
  basic: 'id, name, description, game, format, tournament_type, team_size, status, max_participants, current_participants, is_public, creator_name, thumbnail_image_url, banner_image_url, created_at',

  // Full tournament with settings
  full: 'id, name, description, game, format, tournament_type, team_size, status, max_participants, current_participants, participation_type, seeding_type, round_robin_type, group_count, group_creation_method, creator_id, creator_name, is_public, thumbnail_image_url, banner_image_url, settings, bracket_data, created_at, updated_at, started_at, completed_at, completion_reason, declared_winner_id',

  // Tournament list view
  list: 'id, name, game, format, tournament_type, status, max_participants, current_participants, is_public, creator_name, thumbnail_image_url, created_at'
}

export const PARTICIPANT_FIELDS = {
  basic: 'id, participant_name, participant_type, seed, status, display_order, joined_at',
  full: 'id, tournament_id, user_id, participant_name, participant_type, seed, status, team_id, team_tournament_entry_id, display_order, joined_at, eliminated_at'
}

export const MATCH_FIELDS = {
  basic: 'id, round, match_number, bracket_type, participant1_id, participant2_id, winner_id, score, participant1_score, participant2_score, status',
  full: 'id, tournament_id, round, match_number, bracket_type, group_id, participant1_id, participant2_id, winner_id, score, participant1_score, participant2_score, status, match_format, scheduled_time, started_at, completed_at'
}

// Query builders
export const buildTournamentQuery = (fields = 'basic', includeParticipants = false, includeMatches = false) => {
  let query = TOURNAMENT_FIELDS[fields] || fields
  
  if (includeParticipants) {
    query += `, participants (${PARTICIPANT_FIELDS.basic})`
  }
  
  if (includeMatches) {
    query += `, matches (${MATCH_FIELDS.full})`
  }
  
  return query
}