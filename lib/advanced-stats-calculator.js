/**
 * Advanced Statistics Calculator
 * Handles real-time calculation and updating of player/team advanced stats
 */

import { createClient } from '@/lib/supabase-server'

// Game-specific stat field mappings
const GAME_STAT_FIELDS = {
  league_of_legends: {
    player: ['avg_kills', 'avg_deaths', 'avg_assists', 'avg_cs_per_min', 'avg_gold_per_min',
             'avg_damage_dealt', 'vision_score_per_min', 'first_blood_rate', 'objective_participation'],
    team: ['avg_team_kda', 'avg_team_gold_advantage']
  },
  counter_strike: {
    player: ['avg_kills', 'avg_deaths', 'avg_assists', 'headshot_percentage', 'avg_adr',
             'clutch_success_rate', 'entry_frag_success', 'pistol_round_wr'],
    team: ['avg_round_win_rate', 'avg_team_adr', 'clutch_round_success']
  },
  super_smash_bros: {
    player: ['avg_stocks_taken', 'avg_damage_percent_dealt', 'avg_damage_percent_taken',
             'combo_efficiency', 'edgeguard_success_rate', 'neutral_win_rate', 'recovery_success_rate'],
    team: []
  },
  default: {
    player: ['avg_kills', 'avg_deaths'],
    team: []
  }
}

/**
 * Store match performance data
 */
export async function storeMatchPerformanceData(matchId, participantData) {
  const supabase = await createClient()
  const startTime = Date.now()

  try {
    // Insert performance data for all participants
    const performanceRecords = participantData.map(participant => ({
      match_id: matchId,
      user_id: participant.user_id,
      team_id: participant.team_id || null,
      game_id: participant.game_id,
      won: participant.won,
      placement: participant.placement || null,
      duration_seconds: participant.duration_seconds || null,
      performance_data: participant.performance_data || {}
    }))

    const { error: insertError } = await supabase
      .from('match_performance_data')
      .insert(performanceRecords)

    if (insertError) {
      throw new Error(`Failed to store performance data: ${insertError.message}`)
    }

    // Log the operation
    await logStatCalculation('match_update', 'system', participantData[0]?.game_id, {
      matches_processed: 1,
      success: true,
      processing_time_ms: Date.now() - startTime
    })

    return { success: true }

  } catch (error) {
    console.error('Error storing match performance data:', error)

    // Log the error
    await logStatCalculation('match_update', 'system', participantData[0]?.game_id, {
      matches_processed: 0,
      success: false,
      error_message: error.message,
      processing_time_ms: Date.now() - startTime
    })

    throw error
  }
}

/**
 * Update player advanced stats after a match
 */
export async function updatePlayerAdvancedStats(userId, gameId, matchPerformanceData) {
  const supabase = await createClient()
  const startTime = Date.now()

  try {
    // Get current stats
    const { data: currentStats } = await supabase
      .from('player_advanced_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .single()

    // Calculate new stats
    const newStats = calculatePlayerStats(currentStats, matchPerformanceData, gameId)

    if (currentStats) {
      // Update existing stats
      const { error: updateError } = await supabase
        .from('player_advanced_stats')
        .update(newStats)
        .eq('user_id', userId)
        .eq('game_id', gameId)

      if (updateError) throw updateError

    } else {
      // Create new stats record
      const { error: insertError } = await supabase
        .from('player_advanced_stats')
        .insert({
          user_id: userId,
          game_id: gameId,
          ...newStats
        })

      if (insertError) throw insertError
    }

    // Log successful update
    await logStatCalculation('match_update', userId, gameId, {
      matches_processed: 1,
      success: true,
      processing_time_ms: Date.now() - startTime
    })

    return { success: true, stats: newStats }

  } catch (error) {
    console.error('Error updating player advanced stats:', error)

    await logStatCalculation('match_update', userId, gameId, {
      matches_processed: 0,
      success: false,
      error_message: error.message,
      processing_time_ms: Date.now() - startTime
    })

    throw error
  }
}

/**
 * Update team advanced stats after a match
 */
export async function updateTeamAdvancedStats(teamId, gameId, teamMatchData) {
  const supabase = await createClient()
  const startTime = Date.now()

  try {
    // Get current team stats
    const { data: currentStats } = await supabase
      .from('team_advanced_stats')
      .select('*')
      .eq('team_id', teamId)
      .eq('game_id', gameId)
      .single()

    // Calculate new team stats
    const newStats = calculateTeamStats(currentStats, teamMatchData, gameId)

    if (currentStats) {
      // Update existing stats
      const { error: updateError } = await supabase
        .from('team_advanced_stats')
        .update(newStats)
        .eq('team_id', teamId)
        .eq('game_id', gameId)

      if (updateError) throw updateError

    } else {
      // Create new stats record
      const { error: insertError } = await supabase
        .from('team_advanced_stats')
        .insert({
          team_id: teamId,
          game_id: gameId,
          ...newStats
        })

      if (insertError) throw insertError
    }

    // Log successful update
    await logStatCalculation('team', teamId, gameId, {
      matches_processed: 1,
      success: true,
      processing_time_ms: Date.now() - startTime
    })

    return { success: true, stats: newStats }

  } catch (error) {
    console.error('Error updating team advanced stats:', error)

    await logStatCalculation('team', teamId, gameId, {
      matches_processed: 0,
      success: false,
      error_message: error.message,
      processing_time_ms: Date.now() - startTime
    })

    throw error
  }
}

/**
 * Calculate new player stats based on match performance
 */
function calculatePlayerStats(currentStats, matchData, gameId) {
  const isFirstMatch = !currentStats
  const totalMatches = isFirstMatch ? 1 : currentStats.total_matches + 1
  const totalWins = isFirstMatch ? (matchData.won ? 1 : 0) : currentStats.total_wins + (matchData.won ? 1 : 0)
  const totalLosses = isFirstMatch ? (matchData.won ? 0 : 1) : currentStats.total_losses + (matchData.won ? 0 : 1)

  // Base stats
  const newStats = {
    total_matches: totalMatches,
    total_wins: totalWins,
    total_losses: totalLosses,
    last_calculated_at: new Date().toISOString()
  }

  // Add placement if available
  if (matchData.placement) {
    if (isFirstMatch) {
      newStats.avg_placement = matchData.placement
    } else {
      newStats.avg_placement = ((currentStats.avg_placement || 0) * (totalMatches - 1) + matchData.placement) / totalMatches
    }
  }

  // Game-specific calculations
  const gameFields = GAME_STAT_FIELDS[gameId] || GAME_STAT_FIELDS.default
  const performanceData = matchData.performance_data || {}

  // Calculate rolling averages for game-specific stats
  gameFields.player.forEach(field => {
    const matchValue = performanceData[field]
    if (matchValue !== undefined && matchValue !== null) {
      if (isFirstMatch) {
        newStats[field] = matchValue
      } else {
        const currentValue = currentStats[field] || 0
        newStats[field] = (currentValue * (totalMatches - 1) + matchValue) / totalMatches
      }
    }
  })

  // Calculate performance rating change
  if (currentStats?.performance_rating) {
    const ratingChange = calculateEloChange(currentStats.performance_rating, matchData.won, matchData.opponent_rating)
    newStats.performance_rating = Math.max(0, currentStats.performance_rating + ratingChange)
  }

  return newStats
}

/**
 * Calculate new team stats based on match performance
 */
function calculateTeamStats(currentStats, teamMatchData, gameId) {
  const isFirstMatch = !currentStats
  const totalMatches = isFirstMatch ? 1 : currentStats.total_matches + 1
  const totalWins = isFirstMatch ? (teamMatchData.won ? 1 : 0) : currentStats.total_wins + (teamMatchData.won ? 1 : 0)
  const totalLosses = isFirstMatch ? (teamMatchData.won ? 0 : 1) : currentStats.total_losses + (teamMatchData.won ? 0 : 1)

  const newStats = {
    total_matches: totalMatches,
    total_wins: totalWins,
    total_losses: totalLosses,
    last_match_date: new Date().toISOString(),
    last_calculated_at: new Date().toISOString()
  }

  // Update recent form (last 10 matches)
  if (totalMatches <= 10) {
    newStats.recent_form_wins = totalWins
    newStats.recent_form_losses = totalLosses
  } else {
    // For teams with more than 10 matches, we'd need to query recent matches
    // For now, approximate based on current stats
    newStats.recent_form_wins = Math.min(10, totalWins)
    newStats.recent_form_losses = Math.min(10, totalLosses)
  }

  // Calculate team chemistry based on individual performance variance
  if (teamMatchData.player_performances && teamMatchData.player_performances.length > 1) {
    newStats.team_chemistry_score = calculateTeamChemistry(teamMatchData.player_performances)
  }

  // Update performance rating
  if (currentStats?.performance_rating) {
    const ratingChange = calculateEloChange(currentStats.performance_rating, teamMatchData.won, teamMatchData.opponent_rating)
    newStats.performance_rating = Math.max(0, currentStats.performance_rating + ratingChange)
  }

  return newStats
}

/**
 * Calculate ELO rating change
 */
function calculateEloChange(currentRating, won, opponentRating = 1000, kFactor = 32) {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - currentRating) / 400))
  const actualScore = won ? 1 : 0
  return Math.round(kFactor * (actualScore - expectedScore))
}

/**
 * Calculate team chemistry based on player performance variance
 */
function calculateTeamChemistry(playerPerformances) {
  if (playerPerformances.length < 2) return 50

  // Calculate variance in player performance
  const performances = playerPerformances.map(p => p.individual_rating || 50)
  const mean = performances.reduce((a, b) => a + b, 0) / performances.length
  const variance = performances.reduce((sum, perf) => sum + Math.pow(perf - mean, 2), 0) / performances.length

  // Lower variance = higher chemistry (inverted scale)
  const maxVariance = 2500 // Max reasonable variance
  const chemistryScore = Math.max(0, 100 - (variance / maxVariance) * 100)

  return Math.round(chemistryScore)
}

/**
 * Log stat calculation for monitoring
 */
async function logStatCalculation(entityType, entityId, gameId, details) {
  const supabase = await createClient()

  try {
    await supabase
      .from('stat_calculation_log')
      .insert({
        entity_type: entityType === 'team' ? 'team' : 'player',
        entity_id: entityId,
        game_id: gameId,
        calculation_type: 'match_update',
        matches_processed: details.matches_processed || 0,
        success: details.success,
        error_message: details.error_message || null,
        processing_time_ms: details.processing_time_ms
      })
  } catch (error) {
    console.error('Failed to log stat calculation:', error)
    // Don't throw - logging failure shouldn't break the main operation
  }
}

/**
 * Batch update stats after tournament completion
 */
export async function updateTournamentStats(tournamentId) {
  const supabase = await createClient()

  try {
    // Get all matches from the tournament
    const { data: matches } = await supabase
      .from('matches')
      .select(`
        id,
        game_id,
        match_performance_data (
          user_id,
          team_id,
          won,
          placement,
          performance_data
        )
      `)
      .eq('tournament_id', tournamentId)
      .eq('status', 'completed')

    // Update tournament-specific stats
    for (const match of matches) {
      for (const performance of match.match_performance_data) {
        // Update tournament counts
        await supabase
          .from('player_advanced_stats')
          .update({
            tournaments_played: supabase.raw('tournaments_played + 1')
          })
          .eq('user_id', performance.user_id)
          .eq('game_id', match.game_id)

        // Update tournament wins for winners
        if (performance.won && performance.placement === 1) {
          await supabase
            .from('player_advanced_stats')
            .update({
              tournaments_won: supabase.raw('tournaments_won + 1')
            })
            .eq('user_id', performance.user_id)
            .eq('game_id', match.game_id)
        }

        // Update team tournament stats if applicable
        if (performance.team_id) {
          await supabase
            .from('team_advanced_stats')
            .update({
              tournaments_played: supabase.raw('tournaments_played + 1')
            })
            .eq('team_id', performance.team_id)
            .eq('game_id', match.game_id)

          if (performance.won && performance.placement === 1) {
            await supabase
              .from('team_advanced_stats')
              .update({
                tournaments_won: supabase.raw('tournaments_won + 1')
              })
              .eq('team_id', performance.team_id)
              .eq('game_id', match.game_id)
          }
        }
      }
    }

    return { success: true }

  } catch (error) {
    console.error('Error updating tournament stats:', error)
    throw error
  }
}

/**
 * Get advanced stats for display
 */
export async function getPlayerAdvancedStats(userId, gameId) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('player_advanced_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('game_id', gameId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return data
}

export async function getTeamAdvancedStats(teamId, gameId) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('team_advanced_stats')
    .select('*')
    .eq('team_id', teamId)
    .eq('game_id', gameId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return data
}