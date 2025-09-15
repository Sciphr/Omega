/**
 * Demo data generator for advanced analytics
 * Creates realistic sample stats for different games
 */

export function generateDemoPlayerStats(gameId, playerLevel = 'intermediate') {
  const baseStats = generateBaseStats(playerLevel)

  switch (gameId) {
    case 'league_of_legends':
      return {
        ...baseStats,
        // Combat stats
        kda_ratio: generateKDA(playerLevel),
        avg_kills: generateRange(playerLevel, { low: 3, mid: 6, high: 9 }),
        avg_deaths: generateRange(playerLevel, { low: 7, mid: 5, high: 3 }),
        avg_assists: generateRange(playerLevel, { low: 5, mid: 8, high: 12 }),

        // Performance stats
        avg_cs_per_min: generateRange(playerLevel, { low: 4.5, mid: 6.5, high: 8.5 }),
        first_blood_rate: generateRange(playerLevel, { low: 15, mid: 25, high: 40 }),
        objective_participation: generateRange(playerLevel, { low: 60, mid: 75, high: 90 }),

        // Strategic stats
        vision_score_per_min: generateRange(playerLevel, { low: 1.2, mid: 1.8, high: 2.5 }),
        early_game_rating: generateRange(playerLevel, { low: 900, mid: 1100, high: 1300 }),
        late_game_rating: generateRange(playerLevel, { low: 950, mid: 1150, high: 1350 })
      }

    case 'super_smash_bros':
      return {
        ...baseStats,
        // Combat stats
        avg_stocks_taken: generateRange(playerLevel, { low: 1.2, mid: 2.1, high: 2.8 }),
        avg_damage_dealt: generateRange(playerLevel, { low: 85, mid: 110, high: 140 }),
        combo_efficiency: generateRange(playerLevel, { low: 45, mid: 65, high: 85 }),

        // Strategic stats
        edgeguard_success_rate: generateRange(playerLevel, { low: 35, mid: 55, high: 75 }),
        neutral_win_rate: generateRange(playerLevel, { low: 45, mid: 60, high: 75 }),
        recovery_success_rate: generateRange(playerLevel, { low: 70, mid: 85, high: 95 }),

        // Consistency stats
        three_stock_rate: generateRange(playerLevel, { low: 10, mid: 25, high: 45 }),
        comeback_rate: generateRange(playerLevel, { low: 20, mid: 35, high: 50 })
      }

    case 'counter_strike':
      return {
        ...baseStats,
        // Combat stats
        kd_ratio: generateRange(playerLevel, { low: 0.8, mid: 1.1, high: 1.4 }),
        headshot_percentage: generateRange(playerLevel, { low: 35, mid: 50, high: 65 }),
        avg_adr: generateRange(playerLevel, { low: 65, mid: 80, high: 95 }),

        // Strategic stats
        clutch_success_rate: generateRange(playerLevel, { low: 20, mid: 35, high: 50 }),
        entry_frag_success: generateRange(playerLevel, { low: 40, mid: 55, high: 70 }),
        support_rating: generateRange(playerLevel, { low: 950, mid: 1100, high: 1250 }),

        // Performance stats
        pistol_round_wr: generateRange(playerLevel, { low: 45, mid: 60, high: 75 }),
        eco_round_rating: generateRange(playerLevel, { low: 900, mid: 1050, high: 1200 })
      }

    default:
      return baseStats
  }
}

export function generateDemoTeamStats(gameId, teamLevel = 'intermediate') {
  const baseStats = generateBaseTeamStats(teamLevel)

  // Add some team-specific calculations
  const chemistry = generateRange(teamLevel, { low: 45, mid: 70, high: 90 })
  const communication = chemistry * (0.9 + Math.random() * 0.2)
  const synergy = chemistry * (0.8 + Math.random() * 0.4)

  return {
    ...baseStats,
    team_chemistry: chemistry,
    communication_score: Math.min(100, communication),
    synergy_score: Math.min(100, synergy),
    performance_variance: generateRange(teamLevel, { low: 25, mid: 15, high: 8 }),
    recent_wins: Math.floor(Math.random() * 8) + 2,
    recent_losses: Math.floor(Math.random() * 5) + 1
  }
}

function generateBaseStats(playerLevel) {
  return {
    win_rate: Math.round(generateRange(playerLevel, { low: 35, mid: 55, high: 75 })),
    performance_rating: Math.round(generateRange(playerLevel, { low: 900, mid: 1100, high: 1300 })),
    total_matches: Math.floor(Math.random() * 50) + 20,
    tournaments_won: Math.round(generateRange(playerLevel, { low: 1, mid: 3, high: 6 })),
    tournaments_played: Math.round(generateRange(playerLevel, { low: 8, mid: 12, high: 18 })),
    mvp_awards: Math.round(generateRange(playerLevel, { low: 0, mid: 2, high: 5 })),
    average_placement: Number(generateRange(playerLevel, { low: 6, mid: 4, high: 2 }).toFixed(1))
  }
}

function generateBaseTeamStats(teamLevel) {
  return {
    win_rate: Math.round(generateRange(teamLevel, { low: 40, mid: 60, high: 80 })),
    performance_rating: Math.round(generateRange(teamLevel, { low: 950, mid: 1150, high: 1350 })),
    tournaments_won: Math.round(generateRange(teamLevel, { low: 1, mid: 4, high: 8 })),
    tournaments_played: Math.round(generateRange(teamLevel, { low: 6, mid: 10, high: 16 })),
    total_wins: Math.round(generateRange(teamLevel, { low: 15, mid: 35, high: 65 })),
    total_losses: Math.round(generateRange(teamLevel, { low: 25, mid: 20, high: 15 })),
    average_placement: Number(generateRange(teamLevel, { low: 5, mid: 3, high: 1.5 }).toFixed(1))
  }
}

function generateKDA(playerLevel) {
  const kills = generateRange(playerLevel, { low: 3, mid: 6, high: 9 })
  const deaths = generateRange(playerLevel, { low: 7, mid: 5, high: 3 })
  const assists = generateRange(playerLevel, { low: 5, mid: 8, high: 12 })

  return deaths > 0 ? (kills + assists) / deaths : kills + assists
}

function generateRange(level, ranges) {
  let base, variance

  switch (level) {
    case 'beginner':
      base = ranges.low
      variance = 0.2
      break
    case 'advanced':
      base = ranges.high
      variance = 0.15
      break
    case 'intermediate':
    default:
      base = ranges.mid
      variance = 0.25
      break
  }

  const randomFactor = 1 + (Math.random() - 0.5) * variance
  return Math.max(0, base * randomFactor)
}

/**
 * Inject demo stats into player data for testing
 */
export function injectDemoPlayerStats(player, gameId) {
  if (!player) return player

  // Determine player level based on existing stats
  let level = 'intermediate'
  if (player.stats?.win_rate) {
    if (player.stats.win_rate > 70) level = 'advanced'
    else if (player.stats.win_rate < 45) level = 'beginner'
  }

  const demoStats = generateDemoPlayerStats(gameId, level)

  return {
    ...player,
    advanced_stats: {
      ...player.stats,
      ...demoStats
    }
  }
}

/**
 * Inject demo stats into team data for testing
 */
export function injectDemoTeamStats(team, gameId) {
  if (!team) return team

  // Determine team level based on existing stats
  let level = 'intermediate'
  if (team.stats?.win_rate) {
    if (team.stats.win_rate > 70) level = 'advanced'
    else if (team.stats.win_rate < 45) level = 'beginner'
  }

  const demoStats = generateDemoTeamStats(gameId, level)

  // Round all numeric values to reasonable precision
  const roundedStats = {}
  for (const [key, value] of Object.entries(demoStats)) {
    if (typeof value === 'number') {
      if (key.includes('rate') || key.includes('percentage') || key.includes('score')) {
        roundedStats[key] = Math.round(value * 10) / 10 // 1 decimal place
      } else if (key.includes('rating')) {
        roundedStats[key] = Math.round(value) // Whole numbers for ratings
      } else if (key.includes('won') || key.includes('played') || key.includes('matches') || key.includes('wins') || key.includes('losses')) {
        roundedStats[key] = Math.round(value) // Whole numbers for counts
      } else {
        roundedStats[key] = Number(value.toFixed(2)) // 2 decimal places for others
      }
    } else {
      roundedStats[key] = value
    }
  }

  return {
    ...team,
    stats: {
      ...team.stats,
      ...roundedStats
    }
  }
}

/**
 * Get sample recent matches for trend analysis
 */
export function generateDemoRecentMatches(playerLevel = 'intermediate', count = 20) {
  const matches = []
  let baseWinRate = 0.5

  switch (playerLevel) {
    case 'beginner':
      baseWinRate = 0.35
      break
    case 'advanced':
      baseWinRate = 0.75
      break
    case 'intermediate':
    default:
      baseWinRate = 0.55
      break
  }

  for (let i = 0; i < count; i++) {
    // Add some variance to make trends more realistic
    const trendFactor = Math.sin(i / 5) * 0.2 // Creates waves in performance
    const randomFactor = (Math.random() - 0.5) * 0.3
    const winChance = Math.max(0.1, Math.min(0.9, baseWinRate + trendFactor + randomFactor))

    matches.push({
      id: `demo_match_${i}`,
      won: Math.random() < winChance,
      created_at: new Date(Date.now() - (count - i) * 24 * 60 * 60 * 1000).toISOString(),
      performance_rating: Math.floor(Math.random() * 200) + 900
    })
  }

  return matches
}