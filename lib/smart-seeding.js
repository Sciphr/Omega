/**
 * Smart Bracket & Seeding Algorithms
 * Implements AI-powered seeding based on recent performance, skill balancing, and tournament adjustments
 */

import { SEEDING_TYPE, GROUP_CREATION_METHOD, ADJUSTMENT_TYPE, BRACKET_ADJUSTMENT_ACTION } from './types'

/**
 * Get participant's effective rating for seeding
 * @param {Object} participant - Participant object with stats
 * @param {string} gameId - Game identifier
 * @param {Object} options - Seeding options
 * @returns {number} Effective rating for seeding
 */
export function calculateEffectiveRating(participant, gameId, options = {}) {
  const { weightRecentPerformance = 0.7, weightOverallRating = 0.3, weightWinRate = 0.2 } = options

  // Base rating (ELO-style)
  const baseRating = participant.stats?.performance_rating || 1000

  // Recent performance factor
  const recentMatches = participant.recent_matches || []
  let recentPerformanceBonus = 0

  if (recentMatches.length > 0) {
    const recentWinRate = recentMatches.filter(m => m.won).length / recentMatches.length
    const expectedWinRate = 0.5 // neutral expectation
    recentPerformanceBonus = (recentWinRate - expectedWinRate) * 200 // ±100 rating adjustment
  }

  // Win rate factor
  const winRate = participant.stats?.win_rate || 50
  const winRateBonus = (winRate - 50) * 2 // ±100 rating adjustment for 100% win rate difference

  // Calculate weighted effective rating
  const effectiveRating =
    (baseRating * weightOverallRating) +
    ((baseRating + recentPerformanceBonus) * weightRecentPerformance) +
    (winRateBonus * weightWinRate)

  return Math.round(effectiveRating)
}

/**
 * Advanced seeding algorithm based on multiple factors
 * @param {Array} participants - Array of participant objects
 * @param {string} seedingType - Type of seeding algorithm to use
 * @param {string} gameId - Game identifier
 * @param {Object} options - Additional seeding options
 * @returns {Array} Sorted array of participants with seeding
 */
export function generateSmartSeeding(participants, seedingType, gameId, options = {}) {
  const seededParticipants = [...participants]

  switch (seedingType) {
    case SEEDING_TYPE.AI_OPTIMIZED:
      return generateAIOptimizedSeeding(seededParticipants, gameId, options)

    case SEEDING_TYPE.RECENT_PERFORMANCE:
      return generateRecentPerformanceSeeding(seededParticipants, gameId, options)

    case SEEDING_TYPE.SKILL_BALANCED:
      return generateSkillBalancedSeeding(seededParticipants, gameId, options)

    case SEEDING_TYPE.RANKED:
      return generateRankedSeeding(seededParticipants, gameId, options)

    case SEEDING_TYPE.RANDOM:
      return generateRandomSeeding(seededParticipants)

    default:
      return generateRankedSeeding(seededParticipants, gameId, options)
  }
}

/**
 * AI-optimized seeding that balances competitive matches while maintaining fairness
 */
function generateAIOptimizedSeeding(participants, gameId, options) {
  // Calculate effective ratings for all participants
  const ratedParticipants = participants.map(p => ({
    ...p,
    effectiveRating: calculateEffectiveRating(p, gameId, options),
    volatility: calculateVolatility(p),
    matchupValue: calculateMatchupValue(p, gameId)
  }))

  // Sort by a composite score that balances rating with entertainment value
  return ratedParticipants.sort((a, b) => {
    const scoreA = a.effectiveRating + (a.matchupValue * 50) - (a.volatility * 25)
    const scoreB = b.effectiveRating + (b.matchupValue * 50) - (b.volatility * 25)
    return scoreB - scoreA
  }).map((p, index) => ({
    ...p,
    seedNumber: index + 1
  }))
}

/**
 * Recent performance weighted seeding
 */
function generateRecentPerformanceSeeding(participants, gameId, options) {
  const { recentMatchesCount = 10 } = options

  return participants.map(p => ({
    ...p,
    effectiveRating: calculateEffectiveRating(p, gameId, { weightRecentPerformance: 0.8, weightOverallRating: 0.2 })
  })).sort((a, b) => b.effectiveRating - a.effectiveRating)
    .map((p, index) => ({
      ...p,
      seedNumber: index + 1
    }))
}

/**
 * Skill-balanced seeding that tries to create the most competitive first round
 */
function generateSkillBalancedSeeding(participants, gameId, options) {
  const ratedParticipants = participants.map(p => ({
    ...p,
    effectiveRating: calculateEffectiveRating(p, gameId, options)
  })).sort((a, b) => b.effectiveRating - a.effectiveRating)

  // For skill-balanced, we want to avoid mismatches in early rounds
  // Use a modified seeding that places similar-skilled players further apart
  const balanced = []
  const topHalf = ratedParticipants.slice(0, Math.ceil(ratedParticipants.length / 2))
  const bottomHalf = ratedParticipants.slice(Math.ceil(ratedParticipants.length / 2))

  // Interleave top and bottom performers to create more balanced first round matchups
  for (let i = 0; i < Math.max(topHalf.length, bottomHalf.length); i++) {
    if (topHalf[i]) balanced.push(topHalf[i])
    if (bottomHalf[i]) balanced.push(bottomHalf[i])
  }

  return balanced.map((p, index) => ({
    ...p,
    seedNumber: index + 1
  }))
}

/**
 * Traditional ranked seeding by overall rating
 */
function generateRankedSeeding(participants, gameId, options) {
  return participants.map(p => ({
    ...p,
    effectiveRating: p.stats?.performance_rating || 1000
  })).sort((a, b) => b.effectiveRating - a.effectiveRating)
    .map((p, index) => ({
      ...p,
      seedNumber: index + 1
    }))
}

/**
 * Random seeding
 */
function generateRandomSeeding(participants) {
  const shuffled = [...participants].sort(() => Math.random() - 0.5)
  return shuffled.map((p, index) => ({
    ...p,
    seedNumber: index + 1
  }))
}

/**
 * Calculate participant's performance volatility (consistency)
 */
function calculateVolatility(participant) {
  const recentMatches = participant.recent_matches || []
  if (recentMatches.length < 3) return 0

  const ratings = recentMatches.map(m => m.performance_rating || 1000)
  const mean = ratings.reduce((sum, r) => sum + r, 0) / ratings.length
  const variance = ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratings.length

  return Math.sqrt(variance) / 100 // Normalized volatility score
}

/**
 * Calculate participant's entertainment/matchup value
 */
function calculateMatchupValue(participant, gameId) {
  let value = 0

  // High-rated players are naturally entertaining
  const rating = participant.stats?.performance_rating || 1000
  value += Math.max(0, (rating - 1000) / 100)

  // Players with high KDA ratios create exciting matches
  if (participant.stats?.kda_ratio) {
    value += Math.min(2, participant.stats.kda_ratio - 1)
  }

  // Players with comeback history are exciting
  if (participant.stats?.comeback_rate && participant.stats.comeback_rate > 30) {
    value += 1
  }

  return value
}

/**
 * Create skill-balanced groups for round robin tournaments
 * @param {Array} participants - Array of participants
 * @param {number} groupCount - Number of groups to create
 * @param {string} method - Group creation method
 * @param {string} gameId - Game identifier
 * @returns {Array} Array of groups with balanced participants
 */
export function createSkillBalancedGroups(participants, groupCount, method, gameId) {
  const groupSize = Math.ceil(participants.length / groupCount)

  switch (method) {
    case GROUP_CREATION_METHOD.SKILL_BALANCED:
      return createBalancedGroupsBySkill(participants, groupCount, gameId)

    case GROUP_CREATION_METHOD.SEEDED:
      return createSeededGroups(participants, groupCount, gameId)

    case GROUP_CREATION_METHOD.RANDOM:
      return createRandomGroups(participants, groupCount)

    default:
      return createBalancedGroupsBySkill(participants, groupCount, gameId)
  }
}

/**
 * Create groups with balanced skill distribution
 */
function createBalancedGroupsBySkill(participants, groupCount, gameId) {
  // Sort participants by skill level
  const sortedParticipants = participants.map(p => ({
    ...p,
    effectiveRating: calculateEffectiveRating(p, gameId)
  })).sort((a, b) => b.effectiveRating - a.effectiveRating)

  // Initialize groups
  const groups = Array.from({ length: groupCount }, (_, i) => ({
    id: i + 1,
    name: `Group ${String.fromCharCode(65 + i)}`, // A, B, C, etc.
    participants: [],
    averageRating: 0
  }))

  // Distribute participants using snake draft method
  // This ensures each group gets a mix of high and low skilled players
  let currentGroup = 0
  let direction = 1

  for (const participant of sortedParticipants) {
    groups[currentGroup].participants.push(participant)

    // Move to next group
    currentGroup += direction

    // Reverse direction when reaching end
    if (currentGroup >= groupCount) {
      currentGroup = groupCount - 1
      direction = -1
    } else if (currentGroup < 0) {
      currentGroup = 0
      direction = 1
    }
  }

  // Calculate average ratings for each group
  groups.forEach(group => {
    if (group.participants.length > 0) {
      group.averageRating = Math.round(
        group.participants.reduce((sum, p) => sum + p.effectiveRating, 0) / group.participants.length
      )
    }
  })

  return groups
}

/**
 * Create groups with seeded distribution (top seeds spread across groups)
 */
function createSeededGroups(participants, groupCount, gameId) {
  const sortedParticipants = participants.map(p => ({
    ...p,
    effectiveRating: calculateEffectiveRating(p, gameId)
  })).sort((a, b) => b.effectiveRating - a.effectiveRating)

  // Initialize groups
  const groups = Array.from({ length: groupCount }, (_, i) => ({
    id: i + 1,
    name: `Group ${String.fromCharCode(65 + i)}`,
    participants: [],
    averageRating: 0
  }))

  // Distribute participants round-robin style (1st to Group A, 2nd to Group B, etc.)
  sortedParticipants.forEach((participant, index) => {
    const groupIndex = index % groupCount
    groups[groupIndex].participants.push(participant)
  })

  // Calculate average ratings
  groups.forEach(group => {
    if (group.participants.length > 0) {
      group.averageRating = Math.round(
        group.participants.reduce((sum, p) => sum + p.effectiveRating, 0) / group.participants.length
      )
    }
  })

  return groups
}

/**
 * Create random groups
 */
function createRandomGroups(participants, groupCount) {
  const shuffled = [...participants].sort(() => Math.random() - 0.5)

  const groups = Array.from({ length: groupCount }, (_, i) => ({
    id: i + 1,
    name: `Group ${String.fromCharCode(65 + i)}`,
    participants: [],
    averageRating: 0
  }))

  shuffled.forEach((participant, index) => {
    const groupIndex = index % groupCount
    groups[groupIndex].participants.push(participant)
  })

  return groups
}

/**
 * Handle tournament adjustments for no-shows and dropouts
 * @param {Object} tournament - Tournament object
 * @param {Object} adjustment - Adjustment details
 * @returns {Object} Updated tournament structure
 */
export function handleTournamentAdjustment(tournament, adjustment) {
  const { type, participantId, action, reason } = adjustment

  switch (type) {
    case ADJUSTMENT_TYPE.NO_SHOW:
      return handleNoShowAdjustment(tournament, participantId, action)

    case ADJUSTMENT_TYPE.DROPOUT:
      return handleDropoutAdjustment(tournament, participantId, action)

    case ADJUSTMENT_TYPE.DISQUALIFICATION:
      return handleDisqualificationAdjustment(tournament, participantId, reason)

    default:
      return tournament
  }
}

/**
 * Handle no-show participant adjustment
 */
function handleNoShowAdjustment(tournament, participantId, action) {
  switch (action) {
    case BRACKET_ADJUSTMENT_ACTION.FORFEIT_REMAINING_MATCHES:
      return forfeitRemainingMatches(tournament, participantId)

    case BRACKET_ADJUSTMENT_ACTION.REMOVE_PARTICIPANT:
      return removeParticipantFromTournament(tournament, participantId)

    default:
      return tournament
  }
}

/**
 * Handle dropout adjustment
 */
function handleDropoutAdjustment(tournament, participantId, action) {
  // Similar to no-show but may have different implications for seeding
  return handleNoShowAdjustment(tournament, participantId, action)
}

/**
 * Handle disqualification
 */
function handleDisqualificationAdjustment(tournament, participantId, reason) {
  // Disqualification typically results in removal and forfeit of all matches
  return removeParticipantFromTournament(tournament, participantId, 'disqualified')
}

/**
 * Forfeit all remaining matches for a participant
 */
function forfeitRemainingMatches(tournament, participantId) {
  // This would update the tournament matches to mark participant as forfeit
  // Implementation depends on tournament structure in database
  return {
    ...tournament,
    adjustments: [
      ...(tournament.adjustments || []),
      {
        type: 'forfeit_remaining',
        participantId,
        timestamp: new Date().toISOString()
      }
    ]
  }
}

/**
 * Remove participant from tournament completely
 */
function removeParticipantFromTournament(tournament, participantId, status = 'removed') {
  return {
    ...tournament,
    adjustments: [
      ...(tournament.adjustments || []),
      {
        type: 'participant_removed',
        participantId,
        status,
        timestamp: new Date().toISOString()
      }
    ]
  }
}

/**
 * Calculate optimal group size for round robin based on time constraints
 * @param {number} totalParticipants - Total number of participants
 * @param {number} maxMatchDuration - Maximum expected match duration in minutes
 * @param {number} availableTime - Available tournament time in minutes
 * @returns {Object} Optimal grouping recommendations
 */
export function calculateOptimalGrouping(totalParticipants, maxMatchDuration, availableTime) {
  const recommendations = []

  // Try different group counts
  for (let groupCount = 2; groupCount <= Math.min(8, Math.floor(totalParticipants / 3)); groupCount++) {
    const participantsPerGroup = Math.ceil(totalParticipants / groupCount)
    const matchesPerGroup = (participantsPerGroup * (participantsPerGroup - 1)) / 2 // Round robin formula
    const totalMatches = matchesPerGroup * groupCount
    const estimatedTime = totalMatches * maxMatchDuration

    recommendations.push({
      groupCount,
      participantsPerGroup,
      matchesPerGroup,
      totalMatches,
      estimatedTime,
      fits: estimatedTime <= availableTime,
      efficiency: availableTime > 0 ? (estimatedTime / availableTime) : 0
    })
  }

  // Find the best recommendation (uses most time without going over)
  const validRecommendations = recommendations.filter(r => r.fits)
  const optimalRecommendation = validRecommendations.reduce((best, current) =>
    current.efficiency > best.efficiency ? current : best
  , validRecommendations[0] || recommendations[0])

  return {
    optimal: optimalRecommendation,
    allOptions: recommendations
  }
}