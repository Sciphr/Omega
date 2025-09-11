// Tournament types and enums

export const TOURNAMENT_STATUS = {
  REGISTRATION: 'registration',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
}

export const TOURNAMENT_FORMAT = {
  SINGLE_ELIMINATION: 'single_elimination',
  DOUBLE_ELIMINATION: 'double_elimination'
}

export const PARTICIPATION_TYPE = {
  ANYONE: 'anyone',
  REGISTERED_ONLY: 'registered_only'
}

export const SEEDING_TYPE = {
  RANDOM: 'random',
  MANUAL: 'manual', 
  RANKED: 'ranked'
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

export const EVENT_TYPES = {
  DRAFT_PICK: 'draft_pick',
  DRAFT_BAN: 'draft_ban',
  SCORE_UPDATE: 'score_update',
  MATCH_START: 'match_start',
  MATCH_END: 'match_end',
  FORFEIT: 'forfeit',
  DISPUTE: 'dispute'
}