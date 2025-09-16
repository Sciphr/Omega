import { TOURNAMENT_FORMAT, MATCH_STATUS, PARTICIPANT_STATUS, SEEDING_TYPE } from './types'
import { generateSmartSeeding } from './smart-seeding'
import { createRoundRobinTournament } from './round-robin-manager'

export class BracketGenerator {
  // Generate bracket structure from database matches
  static generateBracketFromMatches(matches, participants, tournamentFormat = 'single_elimination') {
    if (!matches || matches.length === 0) return null
    
    // Group matches by round
    const matchesByRound = matches.reduce((acc, match) => {
      if (!acc[match.round]) acc[match.round] = []
      acc[match.round].push(match)
      return acc
    }, {})
    
    // Create rounds array
    const rounds = []
    const roundNumbers = Object.keys(matchesByRound).sort((a, b) => parseInt(a) - parseInt(b))
    
    roundNumbers.forEach((roundNumber, index) => {
      const roundMatches = matchesByRound[roundNumber]
      
      // Sort matches by match_number within the round
      roundMatches.sort((a, b) => a.match_number - b.match_number)
      
      // Transform matches to bracket format
      const transformedMatches = roundMatches.map(match => {
        // Find participant details
        const participant1 = participants?.find(p => p.id === match.participant1_id)
        const participant2 = participants?.find(p => p.id === match.participant2_id)
        
        return {
          id: match.id, // Real database ID
          matchNumber: match.match_number,
          participant1: participant1 ? {
            id: participant1.id,
            participantName: participant1.participant_name,
            participant_name: participant1.participant_name,
            seed: participant1.seed,
            status: participant1.status
          } : null,
          participant2: participant2 ? {
            id: participant2.id,
            participantName: participant2.participant_name,
            participant_name: participant2.participant_name,
            seed: participant2.seed,
            status: participant2.status
          } : null,
          winner: match.winner_id,
          status: match.status,
          score: match.score,
          participant1_score: match.participant1_score,
          participant2_score: match.participant2_score,
          scheduled_time: match.scheduled_time,
          started_at: match.started_at,
          completed_at: match.completed_at,
          round: parseInt(roundNumber)
        }
      })
      
      rounds.push({
        roundNumber: parseInt(roundNumber),
        name: index === roundNumbers.length - 1 ? 'Final' : `Round ${roundNumber}`,
        matches: transformedMatches
      })
    })

    // Handle double elimination format
    if (tournamentFormat === 'double_elimination') {
      console.log('Processing double elimination matches:', matches.map(m => ({ id: m.id, bracket_type: m.bracket_type, round: m.round, match_number: m.match_number })))

      // Group matches by bracket_type
      const winnerMatches = matches.filter(m => m.bracket_type === 'winner')
      const loserMatches = matches.filter(m => m.bracket_type === 'loser')
      const grandFinalMatches = matches.filter(m => m.bracket_type === 'grand_final')

      console.log('Winner matches:', winnerMatches.length, 'Loser matches:', loserMatches.length, 'Grand finals:', grandFinalMatches.length)

      const winnerBracket = this.generateBracketFromMatches(winnerMatches, participants, 'single_elimination')
      const loserBracket = this.generateLoserBracketFromMatches(loserMatches, participants)

      return {
        format: TOURNAMENT_FORMAT.DOUBLE_ELIMINATION,
        winnerBracket: winnerBracket || { rounds: [] },
        loserBracket: loserBracket || [],
        grandFinals: grandFinalMatches.length > 0 ? {
          matchNumber: 1,
          participant1: null,
          participant2: null,
          winner: grandFinalMatches[0].winner_id,
          status: grandFinalMatches[0].status,
          round: 1,
          resetPossible: true
        } : null
      }
    }

    return {
      rounds,
      format: tournamentFormat
    }
  }

  // Generate round robin tournament structure
  static async generateRoundRobinBracket(participants, options = {}) {
    try {
      const roundRobinData = await createRoundRobinTournament(participants, options)
      return roundRobinData
    } catch (error) {
      console.error('Error generating round robin bracket:', error)
      return null
    }
  }

  static generateLoserBracketFromMatches(matches, participants) {
    if (!matches || matches.length === 0) return []

    // Group matches by round
    const matchesByRound = matches.reduce((acc, match) => {
      if (!acc[match.round]) acc[match.round] = []
      acc[match.round].push(match)
      return acc
    }, {})

    // Create rounds array
    const rounds = []
    const roundNumbers = Object.keys(matchesByRound).sort((a, b) => parseInt(a) - parseInt(b))

    roundNumbers.forEach((roundNumber, index) => {
      const roundMatches = matchesByRound[roundNumber]

      // Sort matches by match_number within the round
      roundMatches.sort((a, b) => a.match_number - b.match_number)

      // Transform matches to bracket format
      const transformedMatches = roundMatches.map(match => {
        const participant1 = participants?.find(p => p.id === match.participant1_id)
        const participant2 = participants?.find(p => p.id === match.participant2_id)

        return {
          id: match.id,
          matchNumber: match.match_number,
          participant1: participant1 ? {
            id: participant1.id,
            participantName: participant1.participant_name,
            seed: participant1.seed,
            status: participant1.status
          } : null,
          participant2: participant2 ? {
            id: participant2.id,
            participantName: participant2.participant_name,
            seed: participant2.seed,
            status: participant2.status
          } : null,
          winner: match.winner_id,
          status: match.status,
          score: match.score,
          round: parseInt(roundNumber)
        }
      })

      rounds.push({
        roundNumber: parseInt(roundNumber),
        name: `Loser Round ${roundNumber}`,
        matches: transformedMatches
      })
    })

    return rounds
  }

  static generateSingleElimination(participants) {
    const participantCount = participants.length
    if (participantCount < 2) throw new Error('At least 2 participants required')
    
    // Find the next power of 2
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(participantCount)))
    
    // Create rounds
    const rounds = []
    let currentRoundSize = bracketSize / 2
    let roundNumber = 1
    
    while (currentRoundSize >= 1) {
      const matches = []
      
      if (roundNumber === 1) {
        // First round - pair participants
        const shuffledParticipants = [...participants]
        
        // Add byes if needed
        while (shuffledParticipants.length < bracketSize) {
          shuffledParticipants.push(null) // null represents a bye
        }
        
        // Create first round matches
        for (let i = 0; i < bracketSize; i += 2) {
          const p1 = shuffledParticipants[i]
          const p2 = shuffledParticipants[i + 1]
          
          matches.push({
            matchNumber: i / 2 + 1,
            participant1: p1,
            participant2: p2,
            winner: p2 === null ? p1 : null, // Auto-advance if bye
            status: p2 === null ? MATCH_STATUS.COMPLETED : MATCH_STATUS.PENDING,
            round: roundNumber
          })
        }
      } else {
        // Subsequent rounds - create empty matches
        for (let i = 0; i < currentRoundSize; i++) {
          matches.push({
            matchNumber: i + 1,
            participant1: null,
            participant2: null,
            winner: null,
            status: MATCH_STATUS.PENDING,
            round: roundNumber
          })
        }
      }
      
      rounds.push({
        roundNumber,
        matches,
        name: this.getRoundName(roundNumber, Math.log2(bracketSize))
      })
      
      currentRoundSize /= 2
      roundNumber++
    }
    
    return {
      format: TOURNAMENT_FORMAT.SINGLE_ELIMINATION,
      rounds,
      bracketSize,
      participantCount
    }
  }
  
  static generateDoubleElimination(participants) {
    const participantCount = participants.length
    if (participantCount < 2) throw new Error('At least 2 participants required')

    // Generate winner bracket (same as single elimination structure)
    const winnerBracket = this.generateSingleElimination(participants)
    // Override the format for the winner bracket
    winnerBracket.format = TOURNAMENT_FORMAT.DOUBLE_ELIMINATION

    // Generate loser bracket
    const loserBracket = this.generateLoserBracket(participantCount)

    return {
      format: TOURNAMENT_FORMAT.DOUBLE_ELIMINATION,
      winnerBracket,
      loserBracket,
      grandFinals: {
        matchNumber: 1,
        participant1: null, // Winner bracket champion
        participant2: null, // Loser bracket champion
        winner: null,
        status: MATCH_STATUS.PENDING,
        round: 1,
        resetPossible: true // Grand finals can be reset
      }
    }
  }
  
  static generateLoserBracket(participantCount) {
    const rounds = []
    let roundNumber = 1

    // For a proper double elimination, we need multiple loser bracket rounds
    // The loser bracket should have (participantCount - 2) matches total
    // arranged in a specific pattern

    const totalLoserRounds = (participantCount === 4) ? 2 : Math.ceil(Math.log2(participantCount)) + 1

    for (let i = 0; i < totalLoserRounds; i++) {
      const matches = []
      let matchCount

      if (i === 0) {
        // First loser round: gets losers from winner bracket round 1
        matchCount = Math.floor(participantCount / 4) || 1
      } else if (i === totalLoserRounds - 1) {
        // Final loser round: loser bracket final
        matchCount = 1
      } else {
        // Middle rounds
        matchCount = Math.max(1, Math.floor(participantCount / Math.pow(2, i + 2)))
      }

      for (let j = 0; j < matchCount; j++) {
        matches.push({
          matchNumber: j + 1,
          participant1: null,
          participant2: null,
          winner: null,
          status: MATCH_STATUS.PENDING,
          round: roundNumber
        })
      }

      rounds.push({
        roundNumber,
        matches,
        name: `Loser Round ${roundNumber}`
      })

      roundNumber++
    }

    return rounds
  }
  
  static getRoundName(roundNumber, totalRounds) {
    const remainingRounds = totalRounds - roundNumber + 1
    
    if (remainingRounds === 1) return 'Finals'
    if (remainingRounds === 2) return 'Semifinals'
    if (remainingRounds === 3) return 'Quarterfinals'
    if (remainingRounds <= 5) return `Round of ${Math.pow(2, remainingRounds)}`
    
    return `Round ${roundNumber}`
  }
  
  static advanceWinner(bracket, matchId, winnerId) {
    // Find the match
    let match = null
    let roundIndex = -1
    let matchIndex = -1
    
    for (let i = 0; i < bracket.rounds.length; i++) {
      for (let j = 0; j < bracket.rounds[i].matches.length; j++) {
        if (bracket.rounds[i].matches[j].id === matchId) {
          match = bracket.rounds[i].matches[j]
          roundIndex = i
          matchIndex = j
          break
        }
      }
      if (match) break
    }
    
    if (!match) throw new Error('Match not found')
    
    // Update match result
    match.winner = winnerId
    match.status = MATCH_STATUS.COMPLETED
    match.completedAt = new Date().toISOString()
    
    // Advance winner to next round
    if (roundIndex < bracket.rounds.length - 1) {
      const nextRound = bracket.rounds[roundIndex + 1]
      const nextMatchIndex = Math.floor(matchIndex / 2)
      const nextMatch = nextRound.matches[nextMatchIndex]
      
      if (matchIndex % 2 === 0) {
        nextMatch.participant1 = winnerId
      } else {
        nextMatch.participant2 = winnerId
      }
      
      // If both participants are set, the match is ready
      if (nextMatch.participant1 && nextMatch.participant2) {
        nextMatch.status = MATCH_STATUS.PENDING
      }
    }
    
    return bracket
  }
}

export class TournamentManager {
  static shuffleParticipants(participants) {
    const shuffled = [...participants]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
  
  static seedParticipants(participants, seedingType, gameId = null, options = {}) {
    // Use smart seeding algorithms for new seeding types
    if ([SEEDING_TYPE.AI_OPTIMIZED, SEEDING_TYPE.RECENT_PERFORMANCE, SEEDING_TYPE.SKILL_BALANCED].includes(seedingType)) {
      return generateSmartSeeding(participants, seedingType, gameId, options)
    }

    // Legacy seeding types
    switch (seedingType) {
      case SEEDING_TYPE.RANDOM:
        return this.shuffleParticipants(participants)
      case SEEDING_TYPE.MANUAL:
        return participants.sort((a, b) => (a.seed || 999) - (b.seed || 999))
      case SEEDING_TYPE.RANKED:
        return participants.sort((a, b) => (b.ranking || b.stats?.performance_rating || 0) - (a.ranking || a.stats?.performance_rating || 0))
      default:
        return participants
    }
  }
  
  static calculateNextRoundSize(currentSize) {
    return Math.ceil(currentSize / 2)
  }
  
  static isValidBracketSize(participantCount) {
    return participantCount >= 4 && participantCount <= 128
  }
  
  static getMatchesInProgress(bracket) {
    const matches = []
    
    if (bracket.rounds) {
      bracket.rounds.forEach(round => {
        round.matches.forEach(match => {
          if (match.status === MATCH_STATUS.IN_PROGRESS) {
            matches.push(match)
          }
        })
      })
    }
    
    return matches
  }
  
  static getNextMatches(bracket) {
    const matches = []
    
    if (bracket.rounds) {
      bracket.rounds.forEach(round => {
        round.matches.forEach(match => {
          if (match.status === MATCH_STATUS.PENDING && 
              match.participant1 && match.participant2) {
            matches.push(match)
          }
        })
      })
    }
    
    return matches
  }
  
  static isTournamentComplete(bracket) {
    if (!bracket.rounds || bracket.rounds.length === 0) return false
    
    const finalRound = bracket.rounds[bracket.rounds.length - 1]
    const finalMatch = finalRound.matches[0]
    
    return finalMatch.status === MATCH_STATUS.COMPLETED && finalMatch.winner
  }
  
  static getTournamentWinner(bracket) {
    if (!this.isTournamentComplete(bracket)) return null
    
    const finalRound = bracket.rounds[bracket.rounds.length - 1]
    const finalMatch = finalRound.matches[0]
    
    return finalMatch.winner
  }
  
  static validateMatchResult(match, winnerId, score) {
    if (!match.participant1 || !match.participant2) {
      throw new Error('Match must have both participants')
    }
    
    if (winnerId !== match.participant1 && winnerId !== match.participant2) {
      throw new Error('Winner must be one of the match participants')
    }
    
    if (!score || typeof score !== 'object') {
      throw new Error('Valid score object required')
    }
    
    return true
  }
}

export function generateTournamentId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function generateShareableUrl(tournamentId) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/tournament/${tournamentId}`
}

export function calculateTournamentDuration(participantCount, format) {
  let estimatedMatches = 0
  
  if (format === TOURNAMENT_FORMAT.SINGLE_ELIMINATION) {
    estimatedMatches = participantCount - 1
  } else if (format === TOURNAMENT_FORMAT.DOUBLE_ELIMINATION) {
    estimatedMatches = (participantCount * 2) - 2
  }
  
  // Assume 15 minutes per match on average
  const estimatedMinutes = estimatedMatches * 15
  
  return {
    estimatedMatches,
    estimatedDuration: estimatedMinutes,
    estimatedHours: Math.ceil(estimatedMinutes / 60)
  }
}