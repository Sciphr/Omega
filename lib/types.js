// Tournament types and enums

export const TOURNAMENT_STATUS = {
  REGISTRATION: 'registration',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
}

export const TOURNAMENT_FORMAT = {
  SINGLE_ELIMINATION: 'single_elimination',
  DOUBLE_ELIMINATION: 'double_elimination',
  ROUND_ROBIN: 'round_robin'
}

export const TOURNAMENT_TYPE = {
  INDIVIDUAL: 'individual',
  TEAM: 'team'
}

export const PARTICIPATION_TYPE = {
  ANYONE: 'anyone',
  REGISTERED_ONLY: 'registered_only'
}

export const SEEDING_TYPE = {
  RANDOM: 'random',
  MANUAL: 'manual',
  RANKED: 'ranked',
  SKILL_BALANCED: 'skill_balanced',
  AI_OPTIMIZED: 'ai_optimized',
  RECENT_PERFORMANCE: 'recent_performance'
}

export const MATCH_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  DISPUTED: 'disputed',
  FORFEIT: 'forfeit'
}

export const MATCH_FORMAT = {
  BO1: 'bo1',
  BO3: 'bo3',
  BO5: 'bo5'
}

export const PARTICIPANT_STATUS = {
  ACTIVE: 'active',
  ELIMINATED: 'eliminated',
  DISQUALIFIED: 'disqualified',
  NO_SHOW: 'no_show'
}

export const PARTICIPANT_TYPE = {
  INDIVIDUAL: 'individual',
  TEAM: 'team'
}

export const PARTICIPANT_FORMAT = {
  INDIVIDUAL: 'individual',  // Tournament accepts only individuals
  TEAM: 'team',             // Tournament accepts only teams
  MIXED: 'mixed'            // Tournament accepts both individuals and teams
}

export const COMPLETION_REASON = {
  NATURAL: 'natural',        // Tournament completed through normal match progression
  MANUAL_STOP: 'manual_stop', // Tournament stopped manually by creator
  CANCELLED: 'cancelled'      // Tournament cancelled
}

export const GAME_TEMPLATES = {
  LEAGUE_OF_LEGENDS: {
    id: 'league_of_legends',
    name: 'League of Legends',
    defaultFormat: MATCH_FORMAT.BO1,
    teamSize: 5,
    settings: {
      maxRounds: null,
      timeLimit: null
    }
  },
  SMASH_BROS: {
    id: 'smash_bros',
    name: 'Super Smash Bros',
    defaultFormat: MATCH_FORMAT.BO3,
    teamSize: 1,
    settings: {
      stockCount: 3,
      timeLimit: 8 // minutes
    }
  },
  CS2: {
    id: 'cs2',
    name: 'Counter-Strike 2',
    defaultFormat: MATCH_FORMAT.BO1,
    teamSize: 5,
    settings: {
      maxRounds: 24,
      overtimeEnabled: true
    }
  },
  VALORANT: {
    id: 'valorant',
    name: 'Valorant',
    defaultFormat: MATCH_FORMAT.BO1,
    teamSize: 5,
    settings: {
      maxRounds: 24,
      overtimeEnabled: true
    }
  }
}

// Game Profile System Types
export const DRAFT_TYPES = {
  TOURNAMENT_DRAFT: 'tournament_draft',
  FEARLESS_DRAFT: 'fearless_draft',
  BLIND_PICK: 'blind_pick'
}

export const PHASE_TYPES = {
  BAN: 'ban',
  PICK: 'pick',
  MAP_SELECTION: 'map_selection',
  CUSTOM: 'custom'
}

export const LEAGUE_OF_LEGENDS_MAPS = {
  SUMMONERS_RIFT: 'summoners_rift',
  ARAM: 'aram'
}

export const LEAGUE_OF_LEGENDS_ROLES = [
  'Top',
  'Jungle',
  'Mid',
  'ADC',
  'Support'
]

// Game Profile Configuration Templates
export const LEAGUE_OF_LEGENDS_CONFIG = {
  gameKey: 'league_of_legends',
  name: 'League of Legends',
  defaultTeamSize: 5,
  supportsIndividual: true,
  supportsTeam: true,
  maps: [
    { id: 'summoners_rift', name: "Summoner's Rift", isDefault: true },
    { id: 'aram', name: 'ARAM (Howling Abyss)', isDefault: false }
  ],
  draftTypes: [
    {
      id: 'tournament_draft',
      name: 'Tournament Draft',
      description: 'Alternating pick/ban phases like professional play'
    },
    {
      id: 'fearless_draft',
      name: 'Fearless Draft',
      description: 'Champions cannot be picked again in the series'
    },
    {
      id: 'blind_pick',
      name: 'Blind Pick',
      description: 'All players pick simultaneously'
    }
  ],
  roles: LEAGUE_OF_LEGENDS_ROLES,
  championPoolSize: 160,
  maxBansPerTeam: 5,
  maxPicksPerTeam: 5
}

export const EVENT_TYPES = {
  DRAFT_PICK: 'draft_pick',
  DRAFT_BAN: 'draft_ban',
  SCORE_UPDATE: 'score_update',
  MATCH_START: 'match_start',
  MATCH_END: 'match_end',
  FORFEIT: 'forfeit',
  DISPUTE: 'dispute'
}

// Round Robin specific types
export const ROUND_ROBIN_TYPE = {
  SINGLE: 'single',           // Each participant plays every other participant once
  DOUBLE: 'double',           // Each participant plays every other participant twice
  GROUPS: 'groups'            // Participants divided into groups, round robin within groups
}

export const GROUP_CREATION_METHOD = {
  SKILL_BALANCED: 'skill_balanced',     // Distribute skills evenly across groups
  RANDOM: 'random',                     // Random group assignment
  SEEDED: 'seeded',                     // Top seeds distributed across groups
  MANUAL: 'manual'                      // Manual group assignment
}

// Tournament adjustment and management types
export const ADJUSTMENT_TYPE = {
  NO_SHOW: 'no_show',
  DROPOUT: 'dropout',
  LATE_ENTRY: 'late_entry',
  DISQUALIFICATION: 'disqualification'
}

export const BRACKET_ADJUSTMENT_ACTION = {
  REMOVE_PARTICIPANT: 'remove_participant',
  FORFEIT_REMAINING_MATCHES: 'forfeit_remaining_matches',
  REDISTRIBUTE_OPPONENTS: 'redistribute_opponents',
  REBALANCE_GROUPS: 'rebalance_groups'
}