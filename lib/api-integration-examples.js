/**
 * API Integration Examples for Advanced Stats
 * Shows how to integrate advanced stats into your existing match/tournament APIs
 */

import {
  storeMatchPerformanceData,
  updatePlayerAdvancedStats,
  updateTeamAdvancedStats,
  updateTournamentStats
} from './advanced-stats-calculator'

// ========================================
// EXAMPLE 1: Match Completion Handler
// ========================================
// Add this to your existing match completion API endpoint

export async function handleMatchCompletion(matchId, matchResults) {
  try {
    // Parse match results into performance data
    const participantData = matchResults.participants.map(participant => ({
      user_id: participant.user_id,
      team_id: participant.team_id, // null for individual matches
      game_id: matchResults.game_id,
      won: participant.placement === 1, // or however you determine winners
      placement: participant.placement,
      duration_seconds: matchResults.duration_seconds,
      performance_data: parseGameSpecificData(participant.stats, matchResults.game_id)
    }))

    // Step 1: Store raw performance data
    await storeMatchPerformanceData(matchId, participantData)

    // Step 2: Update individual player stats
    for (const participant of participantData) {
      await updatePlayerAdvancedStats(
        participant.user_id,
        participant.game_id,
        participant
      )
    }

    // Step 3: Update team stats (if team match)
    if (matchResults.is_team_match) {
      const teamData = groupParticipantsByTeam(participantData)

      for (const [teamId, teamParticipants] of Object.entries(teamData)) {
        const teamMatchData = {
          won: teamParticipants.some(p => p.won),
          player_performances: teamParticipants,
          game_id: matchResults.game_id
        }

        await updateTeamAdvancedStats(teamId, matchResults.game_id, teamMatchData)
      }
    }

    console.log(`Advanced stats updated for match ${matchId}`)

  } catch (error) {
    console.error('Failed to update advanced stats:', error)
    // Don't throw - stat update failure shouldn't break match completion
  }
}

// ========================================
// EXAMPLE 2: Tournament Completion Handler
// ========================================
// Add this to your tournament completion API

export async function handleTournamentCompletion(tournamentId) {
  try {
    // Update tournament-specific stats (tournaments played/won counts)
    await updateTournamentStats(tournamentId)

    console.log(`Tournament stats updated for tournament ${tournamentId}`)

  } catch (error) {
    console.error('Failed to update tournament stats:', error)
  }
}

// ========================================
// EXAMPLE 3: Game-Specific Data Parsers
// ========================================

function parseGameSpecificData(rawStats, gameId) {
  switch (gameId) {
    case 'league_of_legends':
      return {
        // Core combat stats
        kills: rawStats.kills || 0,
        deaths: rawStats.deaths || 0,
        assists: rawStats.assists || 0,

        // Farm and economy
        cs_per_min: rawStats.creepScore ? rawStats.creepScore / rawStats.gameTimeMinutes : 0,
        gold_per_min: rawStats.goldEarned ? rawStats.goldEarned / rawStats.gameTimeMinutes : 0,

        // Damage and combat effectiveness
        damage_dealt: rawStats.totalDamageDealtToChampions || 0,
        damage_taken: rawStats.totalDamageTaken || 0,

        // Vision and map control
        vision_score_per_min: rawStats.visionScore ? rawStats.visionScore / rawStats.gameTimeMinutes : 0,

        // Objectives and teamfight participation
        first_blood: rawStats.firstBloodKill || false,
        objective_participation: calculateObjectiveParticipation(rawStats),

        // Game phase performance
        early_game_rating: calculateEarlyGameRating(rawStats),
        late_game_rating: calculateLateGameRating(rawStats)
      }

    case 'counter_strike':
      return {
        // Core combat stats
        kills: rawStats.kills || 0,
        deaths: rawStats.deaths || 0,
        assists: rawStats.assists || 0,

        // Shooting accuracy
        headshot_percentage: rawStats.headshotKills && rawStats.kills ?
          (rawStats.headshotKills / rawStats.kills * 100) : 0,

        // Round impact
        adr: rawStats.damage ? rawStats.damage / rawStats.roundsPlayed : 0,

        // Clutch performance
        clutch_attempts: rawStats.clutchAttempts || 0,
        clutch_wins: rawStats.clutchWins || 0,
        clutch_success_rate: rawStats.clutchAttempts ?
          (rawStats.clutchWins / rawStats.clutchAttempts * 100) : 0,

        // Entry fragging
        entry_attempts: rawStats.entryAttempts || 0,
        entry_wins: rawStats.entryWins || 0,
        entry_frag_success: rawStats.entryAttempts ?
          (rawStats.entryWins / rawStats.entryAttempts * 100) : 0,

        // Economy rounds
        pistol_round_wins: rawStats.pistolRoundWins || 0,
        pistol_round_attempts: rawStats.pistolRoundAttempts || 0,
        pistol_round_wr: rawStats.pistolRoundAttempts ?
          (rawStats.pistolRoundWins / rawStats.pistolRoundAttempts * 100) : 0
      }

    case 'super_smash_bros':
      return {
        // Stock management
        stocks_taken: rawStats.stocksTaken || 0,
        stocks_lost: rawStats.stocksLost || 0,

        // Damage dealing and taking
        damage_percent_dealt: rawStats.damageDealt || 0,
        damage_percent_taken: rawStats.damageTaken || 0,

        // Technical skill
        combo_efficiency: calculateComboEfficiency(rawStats),

        // Neutral game
        neutral_wins: rawStats.neutralWins || 0,
        neutral_attempts: rawStats.neutralAttempts || 0,
        neutral_win_rate: rawStats.neutralAttempts ?
          (rawStats.neutralWins / rawStats.neutralAttempts * 100) : 0,

        // Edgeguarding
        edgeguard_attempts: rawStats.edgeguardAttempts || 0,
        edgeguard_successes: rawStats.edgeguardSuccesses || 0,
        edgeguard_success_rate: rawStats.edgeguardAttempts ?
          (rawStats.edgeguardSuccesses / rawStats.edgeguardAttempts * 100) : 0,

        // Recovery
        recovery_attempts: rawStats.recoveryAttempts || 0,
        recovery_successes: rawStats.recoverySuccesses || 0,
        recovery_success_rate: rawStats.recoveryAttempts ?
          (rawStats.recoverySuccesses / rawStats.recoveryAttempts * 100) : 0
      }

    default:
      return {
        // Generic stats for unknown games
        score: rawStats.score || 0,
        performance_rating: rawStats.rating || 0
      }
  }
}

// ========================================
// EXAMPLE 4: Helper Functions
// ========================================

function groupParticipantsByTeam(participantData) {
  const teams = {}

  participantData.forEach(participant => {
    if (participant.team_id) {
      if (!teams[participant.team_id]) {
        teams[participant.team_id] = []
      }
      teams[participant.team_id].push(participant)
    }
  })

  return teams
}

function calculateObjectiveParticipation(rawStats) {
  const totalObjectives = (rawStats.dragonKills || 0) +
                         (rawStats.baronKills || 0) +
                         (rawStats.towerKills || 0)
  const teamObjectives = rawStats.teamObjectives || 1 // Avoid division by zero

  return Math.min(100, (totalObjectives / teamObjectives) * 100)
}

function calculateEarlyGameRating(rawStats) {
  // Calculate rating based on first 15 minutes performance
  const earlyKills = rawStats.earlyGameKills || 0
  const earlyDeaths = rawStats.earlyGameDeaths || 1
  const earlyCS = rawStats.earlyGameCS || 0

  // Simple formula - can be made more sophisticated
  const kda = earlyKills / earlyDeaths
  const csRating = earlyCS / 10 // CS per minute roughly

  return Math.round(1000 + (kda * 100) + (csRating * 20))
}

function calculateLateGameRating(rawStats) {
  // Calculate rating based on post-25 minute performance
  const lateKills = rawStats.lateGameKills || 0
  const lateDeaths = rawStats.lateGameDeaths || 1
  const teamfightParticipation = rawStats.teamfightParticipation || 0

  const kda = lateKills / lateDeaths

  return Math.round(1000 + (kda * 100) + (teamfightParticipation * 50))
}

function calculateComboEfficiency(rawStats) {
  const totalCombos = rawStats.combosAttempted || 1
  const successfulCombos = rawStats.combosCompleted || 0
  const avgComboLength = rawStats.avgComboLength || 1

  // Efficiency = (success rate) * (avg combo length factor)
  const successRate = (successfulCombos / totalCombos) * 100
  const lengthMultiplier = Math.min(2, avgComboLength / 3) // Cap at 2x multiplier

  return Math.round(successRate * lengthMultiplier)
}

// ========================================
// EXAMPLE 5: Match Score Submission Integration
// ========================================
// Example of how to integrate with your existing score submission

export async function enhancedScoreSubmission(matchId, scoreData, gameSpecificData) {
  try {
    // Your existing score submission logic
    const matchResult = await submitMatchScore(matchId, scoreData)

    // If match is now completed, update advanced stats
    if (matchResult.status === 'completed') {
      const enhancedResults = {
        ...matchResult,
        participants: matchResult.participants.map(participant => ({
          ...participant,
          stats: gameSpecificData[participant.user_id] || {}
        }))
      }

      await handleMatchCompletion(matchId, enhancedResults)
    }

    return matchResult

  } catch (error) {
    console.error('Enhanced score submission failed:', error)
    throw error
  }
}

// ========================================
// EXAMPLE 6: API Endpoint Integration
// ========================================
// Example Next.js API route with advanced stats

/*
// In your /api/matches/[id]/complete/route.js

import { handleMatchCompletion } from '@/lib/api-integration-examples'

export async function POST(request, { params }) {
  try {
    const { id: matchId } = await params
    const body = await request.json()

    // Your existing match completion logic
    // ... update match status, determine winner, etc.

    // Add advanced stats update
    await handleMatchCompletion(matchId, {
      game_id: match.game_id,
      is_team_match: match.tournament?.team_size > 1,
      duration_seconds: match.duration_seconds,
      participants: body.participants // Should include user_id, placement, stats
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Match completion error:', error)
    return NextResponse.json({ error: 'Failed to complete match' }, { status: 500 })
  }
}
*/