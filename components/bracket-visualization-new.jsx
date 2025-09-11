'use client'

import { useState, useMemo } from 'react'
import { SingleEliminationBracket, DoubleEliminationBracket, Match, createTheme } from '@g-loot/react-tournament-brackets'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trophy, Clock, User, AlertCircle } from 'lucide-react'

// Custom Match component that renders our own match card
const CustomMatch = ({ 
  match, 
  onMatchClick, 
  onPartyClick,
  ...props 
}) => {
  if (!match) return null

  const participant1 = match.participants?.[0]
  const participant2 = match.participants?.[1]
  
  return (
    <div 
      className="border-2 border-slate-200 bg-white rounded-lg p-3 cursor-pointer hover:shadow-lg transition-all min-w-[180px]"
      onClick={() => onMatchClick?.(match)}
      style={props.style}
    >
      <div className="text-xs font-semibold text-center mb-2 text-slate-600">
        {match.name || `Match ${match.matchNumber || ''}`}
      </div>
      
      <div className="space-y-1">
        <div className={`flex justify-between items-center text-sm ${
          participant1?.isWinner ? 'font-bold text-blue-600' : 'text-slate-700'
        }`}>
          <span className="truncate max-w-[120px]">
            {participant1?.name || 'TBD'}
          </span>
          {participant1?.resultText && (
            <span className="ml-2 font-mono text-xs">
              {participant1.resultText}
            </span>
          )}
        </div>
        
        <div className={`flex justify-between items-center text-sm ${
          participant2?.isWinner ? 'font-bold text-blue-600' : 'text-slate-700'
        }`}>
          <span className="truncate max-w-[120px]">
            {participant2?.name || 'TBD'}
          </span>
          {participant2?.resultText && (
            <span className="ml-2 font-mono text-xs">
              {participant2.resultText}
            </span>
          )}
        </div>
      </div>
      
      {match.state && (
        <div className="mt-2 text-center">
          <span className={`text-xs px-2 py-1 rounded ${
            match.state === 'DONE' ? 'bg-green-100 text-green-700' :
            match.state === 'RUNNING' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {match.state === 'DONE' ? 'Complete' :
             match.state === 'RUNNING' ? 'Live' :
             'Pending'}
          </span>
        </div>
      )}
    </div>
  )
}

// Custom theme to match our app design
const OmegaTheme = createTheme({
  textColor: { 
    main: '#0f172a', // slate-900
    highlighted: '#1e293b', // slate-800
    dark: '#64748b' // slate-500
  },
  matchBackground: { 
    wonColor: '#dbeafe', // blue-100
    lostColor: '#f1f5f9' // slate-100
  },
  score: { 
    background: { 
      wonColor: '#3b82f6', // blue-500
      lostColor: '#94a3b8' // slate-400
    }, 
    text: { 
      highlightedWonColor: '#ffffff',
      highlightedLostColor: '#ffffff'
    }
  },
  border: { 
    color: '#e2e8f0', // slate-200
    highlightedColor: '#3b82f6' // blue-500
  },
  roundHeader: { 
    backgroundColor: '#3b82f6', // blue-500
    fontColor: '#ffffff'
  },
  connectorColor: '#cbd5e1', // slate-300
  connectorColorHighlight: '#3b82f6', // blue-500
  svgBackground: '#fafafa'
})

export function BracketVisualizationNew({ 
  bracket, 
  tournament, 
  onMatchClick,
  onReportScore,
  currentUser,
  isAdmin = false 
}) {
  const [selectedMatch, setSelectedMatch] = useState(null)

  // Transform our bracket data to the format expected by g-loot package
  const transformedMatches = useMemo(() => {
    if (!bracket || !bracket.rounds) return []

    const matches = []
    const matchMap = new Map()
    
    // First pass: create all matches
    bracket.rounds.forEach((round, roundIndex) => {
      round.matches.forEach((match, matchIndex) => {
        const matchId = match.id || `${round.roundNumber}-${match.matchNumber}`
        const transformedMatch = {
          id: matchId,
          name: `Match ${match.matchNumber}`,
          nextMatchId: null, // Will be set in second pass
          nextLooserMatchId: null,
          participants: [
            {
              id: match.participant1?.id || `p1-${matchId}`,
              resultText: match.participant1 && match.score ? String(match.score[match.participant1.id] || '') : null,
              isWinner: match.winner === match.participant1?.id,
              status: match.participant1 ? 'PLAYED' : 'NO_SHOW',
              name: match.participant1?.participantName || match.participant1?.participant_name || 'TBD'
            },
            {
              id: match.participant2?.id || `p2-${matchId}`,
              resultText: match.participant2 && match.score ? String(match.score[match.participant2.id] || '') : null,
              isWinner: match.winner === match.participant2?.id,
              status: match.participant2 ? 'PLAYED' : 'NO_SHOW',
              name: match.participant2?.participantName || match.participant2?.participant_name || 'TBD'
            }
          ],
          startTime: match.scheduled_time || match.scheduledTime,
          state: mapMatchStatus(match.status),
          tournamentRoundText: round.name || `Round ${round.roundNumber}`,
          roundIndex,
          matchIndex
        }
        matches.push(transformedMatch)
        matchMap.set(matchId, transformedMatch)
      })
    })

    // Second pass: set nextMatchId for progression
    bracket.rounds.forEach((round, roundIndex) => {
      if (roundIndex < bracket.rounds.length - 1) {
        const nextRound = bracket.rounds[roundIndex + 1]
        round.matches.forEach((match, matchIndex) => {
          const currentMatchId = match.id || `${round.roundNumber}-${match.matchNumber}`
          const nextMatchIndex = Math.floor(matchIndex / 2)
          if (nextRound.matches[nextMatchIndex]) {
            const nextMatchId = nextRound.matches[nextMatchIndex].id || `${nextRound.roundNumber}-${nextRound.matches[nextMatchIndex].matchNumber}`
            const currentMatch = matchMap.get(currentMatchId)
            if (currentMatch) {
              currentMatch.nextMatchId = nextMatchId
            }
          }
        })
      }
    })

    return matches
  }, [bracket])

  const finalMatch = useMemo(() => {
    // Find the final match (the one with no nextMatchId)
    return transformedMatches.find(match => !match.nextMatchId) || null
  }, [transformedMatches])

  if (!bracket || !bracket.rounds || transformedMatches.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No bracket data available</p>
        </div>
      </div>
    )
  }

  const BracketComponent = tournament?.format === 'double_elimination' 
    ? DoubleEliminationBracket 
    : SingleEliminationBracket

  return (
    <div className="w-full h-full">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Tournament Bracket</span>
            <Badge variant="outline">
              {tournament?.format === 'double_elimination' ? 'Double Elimination' : 'Single Elimination'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] border rounded-lg overflow-hidden">
            <BracketComponent
              matches={transformedMatches}
              matchComponent={CustomMatch}
              theme={OmegaTheme}
              options={{
                style: {
                  roundHeader: { backgroundColor: OmegaTheme.roundHeader.backgroundColor, fontColor: OmegaTheme.roundHeader.fontColor },
                  connectorColor: OmegaTheme.connectorColor,
                  connectorColorHighlight: OmegaTheme.connectorColorHighlight
                }
              }}
              onMatchClick={(match) => {
                setSelectedMatch(match)
                onMatchClick?.(match)
              }}
              onPartyClick={(party, partyWon) => {
                console.log('Party clicked:', party, 'Won:', partyWon)
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper function to map our match status to the package's expected status
function mapMatchStatus(status) {
  switch (status) {
    case 'completed':
      return 'DONE'
    case 'in_progress':
      return 'RUNNING'
    case 'pending':
      return 'SCHEDULED'
    case 'disputed':
      return 'RUNNING'
    case 'forfeit':
      return 'DONE'
    default:
      return 'SCHEDULED'
  }
}