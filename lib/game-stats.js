/**
 * Game-specific statistics configuration and utilities
 * Defines what advanced stats are available for each game
 */

// Stat types for organizing and displaying stats
export const STAT_CATEGORIES = {
  COMBAT: 'combat',
  PERFORMANCE: 'performance',
  TEAM: 'team',
  STRATEGIC: 'strategic',
  CONSISTENCY: 'consistency'
}

// Stat display types for UI rendering
export const STAT_DISPLAY_TYPES = {
  PERCENTAGE: 'percentage',
  RATIO: 'ratio',
  AVERAGE: 'average',
  COUNT: 'count',
  RATING: 'rating',
  TIME: 'time'
}

// Game-specific stat configurations
export const GAME_STATS_CONFIG = {
  league_of_legends: {
    name: 'League of Legends',
    primaryStats: ['kda_ratio', 'win_rate', 'avg_cs_per_min'],
    categories: {
      [STAT_CATEGORIES.COMBAT]: [
        {
          key: 'kda_ratio',
          name: 'KDA Ratio',
          description: 'Average (Kills + Assists) / Deaths ratio',
          displayType: STAT_DISPLAY_TYPES.RATIO,
          icon: '⚔️',
          format: (value) => Number(value || 0).toFixed(2)
        },
        {
          key: 'avg_kills',
          name: 'Avg Kills',
          description: 'Average kills per game',
          displayType: STAT_DISPLAY_TYPES.AVERAGE,
          icon: '💀',
          format: (value) => Number(value || 0).toFixed(1)
        },
        {
          key: 'avg_deaths',
          name: 'Avg Deaths',
          description: 'Average deaths per game',
          displayType: STAT_DISPLAY_TYPES.AVERAGE,
          icon: '💔',
          format: (value) => Number(value || 0).toFixed(1)
        },
        {
          key: 'avg_assists',
          name: 'Avg Assists',
          description: 'Average assists per game',
          displayType: STAT_DISPLAY_TYPES.AVERAGE,
          icon: '🤝',
          format: (value) => Number(value || 0).toFixed(1)
        }
      ],
      [STAT_CATEGORIES.PERFORMANCE]: [
        {
          key: 'avg_cs_per_min',
          name: 'CS/Min',
          description: 'Average creep score per minute',
          displayType: STAT_DISPLAY_TYPES.AVERAGE,
          icon: '⚡',
          format: (value) => Number(value || 0).toFixed(1)
        },
        {
          key: 'first_blood_rate',
          name: 'First Blood Rate',
          description: 'Percentage of games with first blood',
          displayType: STAT_DISPLAY_TYPES.PERCENTAGE,
          icon: '🩸',
          format: (value) => `${Math.round(value || 0)}%`
        },
        {
          key: 'objective_participation',
          name: 'Objective Participation',
          description: 'Percentage of team objectives participated in',
          displayType: STAT_DISPLAY_TYPES.PERCENTAGE,
          icon: '🏰',
          format: (value) => `${Math.round(value || 0)}%`
        }
      ],
      [STAT_CATEGORIES.STRATEGIC]: [
        {
          key: 'vision_score_per_min',
          name: 'Vision/Min',
          description: 'Vision score per minute',
          displayType: STAT_DISPLAY_TYPES.AVERAGE,
          icon: '👁️',
          format: (value) => Number(value || 0).toFixed(1)
        },
        {
          key: 'early_game_rating',
          name: 'Early Game',
          description: 'Performance in first 15 minutes',
          displayType: STAT_DISPLAY_TYPES.RATING,
          icon: '🌅',
          format: (value) => Math.round(value || 1000)
        },
        {
          key: 'late_game_rating',
          name: 'Late Game',
          description: 'Performance after 25 minutes',
          displayType: STAT_DISPLAY_TYPES.RATING,
          icon: '🌙',
          format: (value) => Math.round(value || 1000)
        }
      ]
    }
  },

  super_smash_bros: {
    name: 'Super Smash Bros',
    primaryStats: ['win_rate', 'avg_stocks_taken', 'edgeguard_success_rate'],
    categories: {
      [STAT_CATEGORIES.COMBAT]: [
        {
          key: 'avg_stocks_taken',
          name: 'Avg Stocks Taken',
          description: 'Average stocks taken per game',
          displayType: STAT_DISPLAY_TYPES.AVERAGE,
          icon: '⭐',
          format: (value) => Number(value || 0).toFixed(1)
        },
        {
          key: 'avg_damage_dealt',
          name: 'Avg Damage Dealt',
          description: 'Average damage percentage dealt',
          displayType: STAT_DISPLAY_TYPES.AVERAGE,
          icon: '💥',
          format: (value) => `${Math.round(value || 0)}%`
        },
        {
          key: 'combo_efficiency',
          name: 'Combo Efficiency',
          description: 'Average damage per combo string',
          displayType: STAT_DISPLAY_TYPES.AVERAGE,
          icon: '🔗',
          format: (value) => `${Math.round(value || 0)}%`
        }
      ],
      [STAT_CATEGORIES.STRATEGIC]: [
        {
          key: 'edgeguard_success_rate',
          name: 'Edgeguard Success',
          description: 'Percentage of successful edgeguards',
          displayType: STAT_DISPLAY_TYPES.PERCENTAGE,
          icon: '🌊',
          format: (value) => `${Math.round(value || 0)}%`
        },
        {
          key: 'neutral_win_rate',
          name: 'Neutral Win Rate',
          description: 'Percentage of neutral exchanges won',
          displayType: STAT_DISPLAY_TYPES.PERCENTAGE,
          icon: '⚖️',
          format: (value) => `${Math.round(value || 0)}%`
        },
        {
          key: 'recovery_success_rate',
          name: 'Recovery Success',
          description: 'Percentage of successful recoveries',
          displayType: STAT_DISPLAY_TYPES.PERCENTAGE,
          icon: '🔄',
          format: (value) => `${Math.round(value || 0)}%`
        }
      ],
      [STAT_CATEGORIES.CONSISTENCY]: [
        {
          key: 'three_stock_rate',
          name: '3-Stock Rate',
          description: 'Percentage of games won with 3+ stocks',
          displayType: STAT_DISPLAY_TYPES.PERCENTAGE,
          icon: '🔥',
          format: (value) => `${Math.round(value || 0)}%`
        },
        {
          key: 'comeback_rate',
          name: 'Comeback Rate',
          description: 'Win rate when behind in stocks',
          displayType: STAT_DISPLAY_TYPES.PERCENTAGE,
          icon: '🚀',
          format: (value) => `${Math.round(value || 0)}%`
        }
      ]
    }
  },

  counter_strike: {
    name: 'Counter-Strike',
    primaryStats: ['kd_ratio', 'headshot_percentage', 'clutch_success_rate'],
    categories: {
      [STAT_CATEGORIES.COMBAT]: [
        {
          key: 'kd_ratio',
          name: 'K/D Ratio',
          description: 'Kills to deaths ratio',
          displayType: STAT_DISPLAY_TYPES.RATIO,
          icon: '🎯',
          format: (value) => Number(value || 0).toFixed(2)
        },
        {
          key: 'headshot_percentage',
          name: 'Headshot %',
          description: 'Percentage of kills that are headshots',
          displayType: STAT_DISPLAY_TYPES.PERCENTAGE,
          icon: '🎯',
          format: (value) => `${Math.round(value || 0)}%`
        },
        {
          key: 'avg_adr',
          name: 'ADR',
          description: 'Average damage per round',
          displayType: STAT_DISPLAY_TYPES.AVERAGE,
          icon: '💥',
          format: (value) => Math.round(value || 0)
        }
      ],
      [STAT_CATEGORIES.STRATEGIC]: [
        {
          key: 'clutch_success_rate',
          name: 'Clutch Success',
          description: 'Win rate in 1vX situations',
          displayType: STAT_DISPLAY_TYPES.PERCENTAGE,
          icon: '⏰',
          format: (value) => `${Math.round(value || 0)}%`
        },
        {
          key: 'entry_frag_success',
          name: 'Entry Success',
          description: 'Success rate on opening duels',
          displayType: STAT_DISPLAY_TYPES.PERCENTAGE,
          icon: '🚪',
          format: (value) => `${Math.round(value || 0)}%`
        },
        {
          key: 'support_rating',
          name: 'Support Rating',
          description: 'Team utility and support contribution',
          displayType: STAT_DISPLAY_TYPES.RATING,
          icon: '🛡️',
          format: (value) => Math.round(value || 1000)
        }
      ],
      [STAT_CATEGORIES.PERFORMANCE]: [
        {
          key: 'pistol_round_wr',
          name: 'Pistol Round WR',
          description: 'Win rate on pistol rounds',
          displayType: STAT_DISPLAY_TYPES.PERCENTAGE,
          icon: '🔫',
          format: (value) => `${Math.round(value || 0)}%`
        },
        {
          key: 'eco_round_rating',
          name: 'Eco Round Rating',
          description: 'Performance in economy rounds',
          displayType: STAT_DISPLAY_TYPES.RATING,
          icon: '💰',
          format: (value) => Math.round(value || 1000)
        }
      ]
    }
  },

  // Default fallback for games without specific configs
  default: {
    name: 'General',
    primaryStats: ['win_rate', 'performance_rating'],
    categories: {
      [STAT_CATEGORIES.PERFORMANCE]: [
        {
          key: 'win_rate',
          name: 'Win Rate',
          description: 'Overall win percentage',
          displayType: STAT_DISPLAY_TYPES.PERCENTAGE,
          icon: '🏆',
          format: (value) => `${Math.round(value || 0)}%`
        },
        {
          key: 'performance_rating',
          name: 'Performance Rating',
          description: 'Overall skill rating',
          displayType: STAT_DISPLAY_TYPES.RATING,
          icon: '⭐',
          format: (value) => Math.round(value || 1000)
        },
        {
          key: 'total_matches',
          name: 'Total Matches',
          description: 'Total number of matches played',
          displayType: STAT_DISPLAY_TYPES.COUNT,
          icon: '📊',
          format: (value) => Math.round(value || 0)
        }
      ]
    }
  }
}

/**
 * Get stats configuration for a specific game
 */
export function getGameStatsConfig(gameId) {
  return GAME_STATS_CONFIG[gameId] || GAME_STATS_CONFIG.default
}

/**
 * Get all stats for a category within a game
 */
export function getStatsByCategory(gameId, category) {
  const config = getGameStatsConfig(gameId)
  return config.categories[category] || []
}

/**
 * Get primary stats to highlight for a game
 */
export function getPrimaryStats(gameId) {
  const config = getGameStatsConfig(gameId)
  return config.primaryStats || ['win_rate', 'performance_rating']
}

/**
 * Get all available categories for a game
 */
export function getAvailableCategories(gameId) {
  const config = getGameStatsConfig(gameId)
  return Object.keys(config.categories)
}

/**
 * Format a stat value for display
 */
export function formatStatValue(gameId, statKey, value) {
  const config = getGameStatsConfig(gameId)

  // Find the stat in all categories
  for (const category of Object.values(config.categories)) {
    const stat = category.find(s => s.key === statKey)
    if (stat) {
      return stat.format(value)
    }
  }

  // Fallback formatting
  if (typeof value === 'number') {
    return value.toFixed(2)
  }
  return value || 'N/A'
}

/**
 * Get stat configuration by key
 */
export function getStatConfig(gameId, statKey) {
  const config = getGameStatsConfig(gameId)

  for (const category of Object.values(config.categories)) {
    const stat = category.find(s => s.key === statKey)
    if (stat) {
      return stat
    }
  }

  return null
}

/**
 * Calculate team chemistry score between players
 */
export function calculateTeamChemistry(player1Stats, player2Stats, sharedMatches) {
  if (!sharedMatches || sharedMatches.length === 0) return 0

  const sharedWins = sharedMatches.filter(match => match.won).length
  const winRate = (sharedWins / sharedMatches.length) * 100

  // Boost chemistry for teams that perform better together than individually
  const individualWinRate = ((player1Stats.win_rate || 0) + (player2Stats.win_rate || 0)) / 2
  const chemistryBonus = Math.max(0, winRate - individualWinRate) * 2

  return Math.min(100, winRate + chemistryBonus)
}

/**
 * Determine performance trend (improving, declining, stable)
 */
export function getPerformanceTrend(recentMatches) {
  if (!recentMatches || recentMatches.length < 5) return 'insufficient_data'

  const recent = recentMatches.slice(-10) // Last 10 matches
  const older = recentMatches.slice(-20, -10) // Previous 10 matches

  const recentWinRate = recent.filter(m => m.won).length / recent.length
  const olderWinRate = older.filter(m => m.won).length / older.length

  const improvement = recentWinRate - olderWinRate

  if (improvement > 0.15) return 'improving'
  if (improvement < -0.15) return 'declining'
  return 'stable'
}

/**
 * Get trending stat descriptions for display
 */
export function getTrendDescription(trend) {
  const descriptions = {
    improving: { text: 'Improving', color: 'text-green-600', icon: '📈' },
    declining: { text: 'Declining', color: 'text-red-600', icon: '📉' },
    stable: { text: 'Stable', color: 'text-blue-600', icon: '➖' },
    insufficient_data: { text: 'New Player', color: 'text-gray-600', icon: '🆕' }
  }

  return descriptions[trend] || descriptions.insufficient_data
}