// Achievement System Database Schema
// This defines the structure for the achievement system

export const ACHIEVEMENT_TABLES = {
  // Main achievements definition table
  achievements: {
    id: 'uuid PRIMARY KEY',
    slug: 'text UNIQUE NOT NULL', // e.g., 'first_tournament_win'
    name: 'text NOT NULL', // e.g., 'Tournament Victor'
    description: 'text NOT NULL', // e.g., 'Win your first tournament'
    category: 'text NOT NULL', // 'tournament', 'performance', 'social', 'game_specific', 'rare'
    tier: 'text NOT NULL', // 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'legendary'
    icon_url: 'text', // Path to badge icon
    icon_emoji: 'text', // Emoji representation
    points: 'integer DEFAULT 0', // Achievement points value
    is_secret: 'boolean DEFAULT false', // Hidden until unlocked
    requirements: 'jsonb NOT NULL', // Specific requirements for unlocking
    game_id: 'text', // NULL for universal achievements, specific for game achievements
    created_at: 'timestamptz DEFAULT NOW()',
    updated_at: 'timestamptz DEFAULT NOW()'
  },

  // User achievement progress/unlocks
  user_achievements: {
    id: 'uuid PRIMARY KEY',
    user_id: 'uuid NOT NULL REFERENCES auth.users(id)',
    achievement_id: 'uuid NOT NULL REFERENCES achievements(id)',
    unlocked_at: 'timestamptz NOT NULL DEFAULT NOW()',
    progress: 'jsonb DEFAULT \'{}\'', // Current progress towards achievement
    context_data: 'jsonb DEFAULT \'{}\'', // Additional context (tournament_id, match_id, etc.)
    is_featured: 'boolean DEFAULT false', // Featured on profile
    created_at: 'timestamptz DEFAULT NOW()'
  },

  // Achievement progress tracking for complex achievements
  achievement_progress: {
    id: 'uuid PRIMARY KEY',
    user_id: 'uuid NOT NULL REFERENCES auth.users(id)',
    achievement_id: 'uuid NOT NULL REFERENCES achievements(id)',
    progress_key: 'text NOT NULL', // e.g., 'tournaments_won', 'win_streak'
    progress_value: 'integer DEFAULT 0',
    metadata: 'jsonb DEFAULT \'{}\'', // Additional tracking data
    last_updated: 'timestamptz DEFAULT NOW()',
    UNIQUE: '(user_id, achievement_id, progress_key)'
  },

  // Achievement categories for organization
  achievement_categories: {
    id: 'uuid PRIMARY KEY',
    slug: 'text UNIQUE NOT NULL',
    name: 'text NOT NULL',
    description: 'text',
    icon: 'text',
    sort_order: 'integer DEFAULT 0',
    created_at: 'timestamptz DEFAULT NOW()'
  }
}

// Achievement tier definitions
export const ACHIEVEMENT_TIERS = {
  BRONZE: {
    name: 'Bronze',
    color: '#CD7F32',
    points: 10,
    rarity: 'common'
  },
  SILVER: {
    name: 'Silver',
    color: '#C0C0C0',
    points: 25,
    rarity: 'uncommon'
  },
  GOLD: {
    name: 'Gold',
    color: '#FFD700',
    points: 50,
    rarity: 'rare'
  },
  PLATINUM: {
    name: 'Platinum',
    color: '#E5E4E2',
    points: 100,
    rarity: 'epic'
  },
  DIAMOND: {
    name: 'Diamond',
    color: '#B9F2FF',
    points: 250,
    rarity: 'legendary'
  },
  LEGENDARY: {
    name: 'Legendary',
    color: '#FF6B35',
    points: 500,
    rarity: 'mythic'
  }
}

// Achievement categories
export const ACHIEVEMENT_CATEGORIES = {
  TOURNAMENT: {
    slug: 'tournament',
    name: 'Tournament Mastery',
    description: 'Achievements related to tournament participation and victories',
    icon: '🏆'
  },
  PERFORMANCE: {
    slug: 'performance',
    name: 'Performance Excellence',
    description: 'Achievements based on exceptional performance metrics',
    icon: '⭐'
  },
  SOCIAL: {
    slug: 'social',
    name: 'Community Builder',
    description: 'Achievements for community engagement and tournament creation',
    icon: '👥'
  },
  GAME_SPECIFIC: {
    slug: 'game_specific',
    name: 'Game Master',
    description: 'Game-specific achievements and milestones',
    icon: '🎮'
  },
  RARE: {
    slug: 'rare',
    name: 'Legendary Moments',
    description: 'Rare and special achievements for unique accomplishments',
    icon: '💎'
  }
}

// Achievement requirement types
export const ACHIEVEMENT_REQUIREMENT_TYPES = {
  TOURNAMENT_WINS: 'tournament_wins',
  TOURNAMENT_PARTICIPATION: 'tournament_participation',
  WIN_STREAK: 'win_streak',
  PERFECT_TOURNAMENT: 'perfect_tournament',
  COMEBACK_VICTORY: 'comeback_victory',
  TOURNAMENT_CREATION: 'tournament_creation',
  SCORE_DIFFERENTIAL: 'score_differential',
  MATCH_DURATION: 'match_duration',
  OPPONENT_RATING_DIFFERENTIAL: 'opponent_rating_differential',
  TOURNAMENT_SIZE: 'tournament_size',
  GAME_SPECIFIC_METRIC: 'game_specific_metric'
}

// Sample achievement definitions
export const SAMPLE_ACHIEVEMENTS = [
  {
    slug: 'first_tournament',
    name: 'First Steps',
    description: 'Participate in your first tournament',
    category: 'tournament',
    tier: 'bronze',
    icon_emoji: '🚀',
    points: 10,
    requirements: {
      type: 'tournament_participation',
      count: 1
    }
  },
  {
    slug: 'first_victory',
    name: 'Tournament Victor',
    description: 'Win your first tournament',
    category: 'tournament',
    tier: 'silver',
    icon_emoji: '🏆',
    points: 25,
    requirements: {
      type: 'tournament_wins',
      count: 1
    }
  },
  {
    slug: 'hat_trick',
    name: 'Hat Trick Hero',
    description: 'Win 3 tournaments',
    category: 'tournament',
    tier: 'gold',
    icon_emoji: '🎩',
    points: 50,
    requirements: {
      type: 'tournament_wins',
      count: 3
    }
  },
  {
    slug: 'win_streak_5',
    name: 'Unstoppable Force',
    description: 'Win 5 matches in a row across tournaments',
    category: 'performance',
    tier: 'gold',
    icon_emoji: '🔥',
    points: 50,
    requirements: {
      type: 'win_streak',
      count: 5
    }
  },
  {
    slug: 'perfect_tournament',
    name: 'Flawless Victory',
    description: 'Win a tournament without losing a single match',
    category: 'performance',
    tier: 'platinum',
    icon_emoji: '💎',
    points: 100,
    requirements: {
      type: 'perfect_tournament',
      count: 1
    }
  },
  {
    slug: 'tournament_organizer',
    name: 'Community Builder',
    description: 'Create your first tournament',
    category: 'social',
    tier: 'silver',
    icon_emoji: '🏗️',
    points: 25,
    requirements: {
      type: 'tournament_creation',
      count: 1
    }
  },
  {
    slug: 'comeback_king',
    name: 'Comeback King',
    description: 'Win a match after being down by 50% or more in score',
    category: 'rare',
    tier: 'diamond',
    icon_emoji: '👑',
    points: 250,
    requirements: {
      type: 'comeback_victory',
      score_deficit_percentage: 50
    }
  },
  {
    slug: 'giant_slayer',
    name: 'Giant Slayer',
    description: 'Defeat an opponent ranked 500+ points higher than you',
    category: 'rare',
    tier: 'platinum',
    icon_emoji: '⚔️',
    points: 100,
    requirements: {
      type: 'opponent_rating_differential',
      min_difference: 500
    }
  }
]