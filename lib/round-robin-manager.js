/**
 * Round Robin Tournament Manager
 * Handles creation and management of round robin tournaments using brackets-manager
 */

import { BracketsManager } from 'brackets-manager'
import { ROUND_ROBIN_TYPE, GROUP_CREATION_METHOD } from './types'
import { createSkillBalancedGroups } from './smart-seeding'

/**
 * Create a round robin tournament structure
 * @param {Array} participants - Array of participants
 * @param {Object} options - Tournament options
 * @returns {Object} Tournament structure compatible with brackets-manager
 */
export async function createRoundRobinTournament(participants, options = {}) {
  const {
    type = ROUND_ROBIN_TYPE.SINGLE,
    groupCount = null,
    groupCreationMethod = GROUP_CREATION_METHOD.SKILL_BALANCED,
    gameId = null,
    name = 'Round Robin Tournament'
  } = options

  // Initialize brackets manager
  const manager = new BracketsManager()

  try {
    switch (type) {
      case ROUND_ROBIN_TYPE.SINGLE:
        return await createSingleRoundRobin(manager, participants, options)

      case ROUND_ROBIN_TYPE.DOUBLE:
        return await createDoubleRoundRobin(manager, participants, options)

      case ROUND_ROBIN_TYPE.GROUPS:
        return await createGroupRoundRobin(manager, participants, options)

      default:
        return await createSingleRoundRobin(manager, participants, options)
    }
  } catch (error) {
    console.error('Error creating round robin tournament:', error)
    throw new Error(`Failed to create round robin tournament: ${error.message}`)
  }
}

/**
 * Create a single round robin (each participant plays each other once)
 */
async function createSingleRoundRobin(manager, participants, options) {
  const { name = 'Single Round Robin' } = options

  // Create the tournament
  await manager.create({
    name,
    tournamentId: options.tournamentId || 0,
    type: 'round_robin',
    participants: participants.map((p, index) => ({
      id: p.id || index,
      name: p.name || p.participant_name || p.display_name || `Participant ${index + 1}`
    }))
  })

  // Get the created structure
  const tournament = await manager.get.tournamentData(options.tournamentId || 0)

  return {
    type: 'round_robin',
    subType: 'single',
    tournament,
    groups: null,
    matches: await generateRoundRobinMatches(participants, 1),
    totalRounds: participants.length - 1,
    matchesPerParticipant: participants.length - 1,
    totalMatches: (participants.length * (participants.length - 1)) / 2
  }
}

/**
 * Create a double round robin (each participant plays each other twice)
 */
async function createDoubleRoundRobin(manager, participants, options) {
  const { name = 'Double Round Robin' } = options

  await manager.create({
    name,
    tournamentId: options.tournamentId || 0,
    type: 'round_robin',
    participants: participants.map((p, index) => ({
      id: p.id || index,
      name: p.name || p.participant_name || p.display_name || `Participant ${index + 1}`
    }))
  })

  const tournament = await manager.get.tournamentData(options.tournamentId || 0)

  return {
    type: 'round_robin',
    subType: 'double',
    tournament,
    groups: null,
    matches: await generateRoundRobinMatches(participants, 2),
    totalRounds: (participants.length - 1) * 2,
    matchesPerParticipant: (participants.length - 1) * 2,
    totalMatches: participants.length * (participants.length - 1)
  }
}

/**
 * Create group-based round robin
 */
async function createGroupRoundRobin(manager, participants, options) {
  const {
    groupCount = Math.ceil(participants.length / 4),
    groupCreationMethod = GROUP_CREATION_METHOD.SKILL_BALANCED,
    gameId,
    name = 'Group Round Robin'
  } = options

  // Create balanced groups
  const groups = createSkillBalancedGroups(participants, groupCount, groupCreationMethod, gameId)

  // Create tournament structure for each group
  const groupTournaments = []
  const allMatches = []

  for (const group of groups) {
    if (group.participants.length < 2) continue

    const groupTournamentId = `${options.tournamentId || 0}-group-${group.id}`

    await manager.create({
      name: `${name} - ${group.name}`,
      tournamentId: groupTournamentId,
      type: 'round_robin',
      participants: group.participants.map((p, index) => ({
        id: p.id || `${group.id}-${index}`,
        name: p.name || p.participant_name || p.display_name || `Participant ${index + 1}`
      }))
    })

    const groupTournament = await manager.get.tournamentData(groupTournamentId)
    const groupMatches = await generateRoundRobinMatches(group.participants, 1, group.id)

    groupTournaments.push({
      group: group,
      tournament: groupTournament,
      matches: groupMatches
    })

    allMatches.push(...groupMatches)
  }

  return {
    type: 'round_robin',
    subType: 'groups',
    tournament: null, // No single tournament, multiple group tournaments
    groups,
    groupTournaments,
    matches: allMatches,
    totalGroups: groupCount,
    totalRounds: Math.max(...groups.map(g => g.participants.length - 1)),
    totalMatches: allMatches.length
  }
}

/**
 * Generate round robin matches manually
 * This creates a more detailed match structure than what brackets-manager provides
 */
async function generateRoundRobinMatches(participants, rounds = 1, groupId = null) {
  const matches = []
  let matchId = 1

  for (let round = 1; round <= rounds; round++) {
    // Use round-robin algorithm to generate pairings
    const schedule = generateRoundRobinSchedule(participants)

    for (let roundNum = 0; roundNum < schedule.length; roundNum++) {
      const roundMatches = schedule[roundNum]

      for (const matchup of roundMatches) {
        const match = {
          id: `${groupId ? `g${groupId}-` : ''}m${matchId}`,
          matchNumber: matchId,
          roundNumber: roundNum + 1,
          roundIteration: round, // 1 for first round robin, 2 for second (in double RR)
          groupId,
          participant1: matchup.participant1,
          participant2: matchup.participant2,
          status: 'pending',
          winner: null,
          participant1_score: null,
          participant2_score: null,
          scheduled_time: null,
          completed_at: null,
          created_at: new Date().toISOString()
        }

        matches.push(match)
        matchId++
      }
    }
  }

  return matches
}

/**
 * Generate round robin schedule using circle method
 * This ensures fair scheduling where each participant plays once per round
 */
function generateRoundRobinSchedule(participants) {
  const n = participants.length
  const schedule = []

  // If odd number of participants, add a "bye" participant
  const players = [...participants]
  if (n % 2 === 1) {
    players.push({ id: 'bye', name: 'BYE', isBye: true })
  }

  const numRounds = players.length - 1
  const numMatchesPerRound = players.length / 2

  for (let round = 0; round < numRounds; round++) {
    const roundMatches = []

    for (let match = 0; match < numMatchesPerRound; match++) {
      let home, away

      if (match === 0) {
        // First match: fixed participant vs rotating participant
        home = players[0]
        away = players[round + 1]
      } else {
        // Other matches: calculated positions
        const homeIndex = (round + match) % (players.length - 1)
        const awayIndex = (round + players.length - match) % (players.length - 1)

        home = players[homeIndex + 1] // +1 because index 0 is fixed
        away = players[awayIndex + 1]
      }

      // Skip matches involving the bye participant
      if (!home.isBye && !away.isBye) {
        roundMatches.push({
          participant1: home,
          participant2: away
        })
      }
    }

    schedule.push(roundMatches)
  }

  return schedule
}

/**
 * Calculate round robin standings
 * @param {Array} matches - Array of completed matches
 * @param {Array} participants - Array of all participants
 * @returns {Array} Standings with points, wins, losses, etc.
 */
export function calculateRoundRobinStandings(matches, participants) {
  const standings = participants.map(participant => ({
    participant,
    matches_played: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    points: 0, // 3 for win, 1 for draw, 0 for loss
    goals_for: 0,
    goals_against: 0,
    goal_difference: 0,
    head_to_head: {},
    form: [] // Last 5 results
  }))

  // Process each completed match
  matches.filter(match => match.status === 'completed').forEach(match => {
    const participant1Standing = standings.find(s => s.participant.id === match.participant1.id)
    const participant2Standing = standings.find(s => s.participant.id === match.participant2.id)

    if (!participant1Standing || !participant2Standing) return

    // Update matches played
    participant1Standing.matches_played++
    participant2Standing.matches_played++

    // Update scores
    const score1 = match.participant1_score || 0
    const score2 = match.participant2_score || 0

    participant1Standing.goals_for += score1
    participant1Standing.goals_against += score2
    participant2Standing.goals_for += score2
    participant2Standing.goals_against += score1

    // Determine winner and update points
    if (score1 > score2) {
      // Participant 1 wins
      participant1Standing.wins++
      participant1Standing.points += 3
      participant2Standing.losses++
      participant1Standing.form.push('W')
      participant2Standing.form.push('L')
    } else if (score2 > score1) {
      // Participant 2 wins
      participant2Standing.wins++
      participant2Standing.points += 3
      participant1Standing.losses++
      participant1Standing.form.push('L')
      participant2Standing.form.push('W')
    } else {
      // Draw
      participant1Standing.draws++
      participant2Standing.draws++
      participant1Standing.points += 1
      participant2Standing.points += 1
      participant1Standing.form.push('D')
      participant2Standing.form.push('D')
    }

    // Keep only last 5 form results
    if (participant1Standing.form.length > 5) {
      participant1Standing.form = participant1Standing.form.slice(-5)
    }
    if (participant2Standing.form.length > 5) {
      participant2Standing.form = participant2Standing.form.slice(-5)
    }

    // Update head-to-head records
    const p1Id = match.participant1.id
    const p2Id = match.participant2.id

    if (!participant1Standing.head_to_head[p2Id]) {
      participant1Standing.head_to_head[p2Id] = { wins: 0, losses: 0, draws: 0 }
    }
    if (!participant2Standing.head_to_head[p1Id]) {
      participant2Standing.head_to_head[p1Id] = { wins: 0, losses: 0, draws: 0 }
    }

    if (score1 > score2) {
      participant1Standing.head_to_head[p2Id].wins++
      participant2Standing.head_to_head[p1Id].losses++
    } else if (score2 > score1) {
      participant2Standing.head_to_head[p1Id].wins++
      participant1Standing.head_to_head[p2Id].losses++
    } else {
      participant1Standing.head_to_head[p2Id].draws++
      participant2Standing.head_to_head[p1Id].draws++
    }
  })

  // Calculate goal difference
  standings.forEach(standing => {
    standing.goal_difference = standing.goals_for - standing.goals_against
  })

  // Sort standings by: points, goal difference, goals for, head-to-head
  standings.sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points
    if (a.goal_difference !== b.goal_difference) return b.goal_difference - a.goal_difference
    if (a.goals_for !== b.goals_for) return b.goals_for - a.goals_for

    // Head-to-head comparison if available
    const aVsB = a.head_to_head[b.participant.id]
    const bVsA = b.head_to_head[a.participant.id]
    if (aVsB && bVsA) {
      const aH2HPoints = (aVsB.wins * 3) + aVsB.draws
      const bH2HPoints = (bVsA.wins * 3) + bVsA.draws
      if (aH2HPoints !== bH2HPoints) return bH2HPoints - aH2HPoints
    }

    return 0 // Equal if all tiebreakers are the same
  })

  // Add position numbers
  standings.forEach((standing, index) => {
    standing.position = index + 1
  })

  return standings
}

/**
 * Get next round of matches to be played
 * @param {Array} matches - All tournament matches
 * @returns {Array} Next round matches that need to be played
 */
export function getNextRoundMatches(matches) {
  // Group matches by round
  const matchesByRound = {}
  matches.forEach(match => {
    const round = match.roundNumber
    if (!matchesByRound[round]) {
      matchesByRound[round] = []
    }
    matchesByRound[round].push(match)
  })

  // Find the first round that has pending matches
  const rounds = Object.keys(matchesByRound).sort((a, b) => parseInt(a) - parseInt(b))

  for (const round of rounds) {
    const roundMatches = matchesByRound[round]
    const pendingMatches = roundMatches.filter(match => match.status === 'pending')

    if (pendingMatches.length > 0) {
      return pendingMatches
    }
  }

  return [] // No pending matches
}

/**
 * Check if round robin tournament is complete
 * @param {Array} matches - All tournament matches
 * @returns {boolean} True if all matches are completed
 */
export function isRoundRobinComplete(matches) {
  return matches.every(match => match.status === 'completed' || match.status === 'forfeit')
}

/**
 * Generate fixtures display for round robin
 * @param {Array} matches - Tournament matches
 * @returns {Object} Organized fixtures by round
 */
export function generateFixturesDisplay(matches) {
  const fixtures = {}

  matches.forEach(match => {
    const round = match.roundNumber
    if (!fixtures[round]) {
      fixtures[round] = {
        roundNumber: round,
        matches: [],
        completed: 0,
        total: 0
      }
    }

    fixtures[round].matches.push(match)
    fixtures[round].total++

    if (match.status === 'completed' || match.status === 'forfeit') {
      fixtures[round].completed++
    }
  })

  return fixtures
}