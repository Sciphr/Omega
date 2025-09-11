// Database Schema Reference
// This file documents our Supabase database schema for easy reference

export const TABLES = {
  tournaments: {
    id: 'uuid PRIMARY KEY',
    name: 'text NOT NULL',
    description: 'text',
    game: 'text NOT NULL',
    format: 'text NOT NULL', // 'single_elimination', 'double_elimination'
    status: 'text NOT NULL DEFAULT \'registration\'', // 'registration', 'in_progress', 'completed', 'archived'
    max_participants: 'integer NOT NULL',
    current_participants: 'integer DEFAULT 0',
    participation_type: 'text NOT NULL', // 'anyone', 'registered_only'
    seeding_type: 'text NOT NULL', // 'random', 'manual', 'skill_based'
    password_hash: 'text',
    creator_id: 'uuid REFERENCES auth.users(id)', // Can be NULL for guest tournaments
    creator_name: 'text',
    is_public: 'boolean DEFAULT true',
    settings: 'jsonb DEFAULT \'{}\'',
    bracket_data: 'jsonb',
    created_at: 'timestamptz DEFAULT NOW()',
    updated_at: 'timestamptz DEFAULT NOW()',
    started_at: 'timestamptz',
    completed_at: 'timestamptz'
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
    joined_at: 'timestamptz DEFAULT NOW()',
    eliminated_at: 'timestamptz'
  },

  matches: {
    id: 'uuid PRIMARY KEY',
    tournament_id: 'uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE',
    round: 'integer NOT NULL',
    match_number: 'integer NOT NULL',
    bracket_type: 'text DEFAULT \'main\'', // 'main', 'losers' (for double elimination)
    participant1_id: 'uuid REFERENCES participants(id)',
    participant2_id: 'uuid REFERENCES participants(id)',
    winner_id: 'uuid REFERENCES participants(id)',
    score: 'jsonb',
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
    captain_id: 'uuid REFERENCES auth.users(id)',
    members: 'jsonb DEFAULT \'[]\'',
    created_at: 'timestamptz DEFAULT NOW()'
  }
}

// Useful field subsets for queries
export const TOURNAMENT_FIELDS = {
  // Basic tournament info
  basic: 'id, name, description, game, format, status, max_participants, current_participants, is_public, creator_name, created_at',
  
  // Full tournament with settings
  full: 'id, name, description, game, format, status, max_participants, current_participants, participation_type, seeding_type, creator_id, creator_name, is_public, settings, bracket_data, created_at, updated_at, started_at, completed_at',
  
  // Tournament list view
  list: 'id, name, game, format, status, max_participants, current_participants, is_public, creator_name, created_at'
}

export const PARTICIPANT_FIELDS = {
  basic: 'id, participant_name, participant_type, seed, status, joined_at',
  full: 'id, tournament_id, user_id, participant_name, participant_type, seed, status, team_id, joined_at, eliminated_at'
}

export const MATCH_FIELDS = {
  basic: 'id, round, match_number, participant1_id, participant2_id, winner_id, score, status',
  full: 'id, tournament_id, round, match_number, bracket_type, participant1_id, participant2_id, winner_id, score, status, match_format, scheduled_time, started_at, completed_at'
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