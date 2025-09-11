'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Trophy, 
  Clock, 
  User, 
  Users,
  PlayCircle,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { MATCH_STATUS, PARTICIPANT_STATUS } from '@/lib/types'

const MATCH_CARD_WIDTH = 200
const MATCH_CARD_HEIGHT = 80
const ROUND_SPACING = 240
const MATCH_SPACING = 100

export function BracketVisualization({ 
  bracket, 
  tournament, 
  onMatchClick, 
  onReportScore,
  currentUser,
  isAdmin = false 
}) {
  const [scale, setScale] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })
  const [selectedMatch, setSelectedMatch] = useState(null)
  const containerRef = useRef(null)
  const bracketRef = useRef(null)

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 3))
  }

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.3))
  }

  const handleZoomReset = () => {
    setScale(1)
    setPanOffset({ x: 0, y: 0 })
  }

  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left mouse button
      setIsPanning(true)
      setLastPanPoint({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMove = (e) => {
    if (!isPanning) return
    
    const deltaX = e.clientX - lastPanPoint.x
    const deltaY = e.clientY - lastPanPoint.y
    
    setPanOffset(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }))
    
    setLastPanPoint({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const preventDefault = (e) => e.preventDefault()
    
    container.addEventListener('wheel', preventDefault, { passive: false })
    
    return () => {
      container.removeEventListener('wheel', preventDefault)
    }
  }, [])

  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY * -0.001
    const newScale = Math.min(Math.max(scale * (1 + delta), 0.3), 3)
    setScale(newScale)
  }

  if (!bracket || !bracket.rounds) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No bracket data available</p>
        </div>
      </div>
    )
  }

  const totalWidth = bracket.rounds.length * ROUND_SPACING
  const maxMatchesInRound = Math.max(...bracket.rounds.map(r => r.matches.length))
  const totalHeight = maxMatchesInRound * MATCH_SPACING

  return (
    <div className="w-full h-full relative">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex space-x-2">
        <Button variant="outline" size="sm" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleZoomReset}>
          <Maximize className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {/* Bracket Container */}
      <div
        ref={containerRef}
        className="w-full h-96 overflow-hidden border rounded-lg bg-muted/20 cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          ref={bracketRef}
          className="relative origin-top-left transition-transform duration-200"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
            width: `${totalWidth + 100}px`,
            height: `${totalHeight + 100}px`,
            minWidth: '100%',
            minHeight: '100%'
          }}
        >
          {/* Render Rounds */}
          {bracket.rounds.map((round, roundIndex) => (
            <div key={round.roundNumber} className="absolute">
              {/* Round Header */}
              <div
                className="text-center mb-4 font-semibold text-lg"
                style={{
                  left: `${roundIndex * ROUND_SPACING + 50}px`,
                  top: '20px',
                  width: `${MATCH_CARD_WIDTH}px`
                }}
              >
                {round.name}
              </div>

              {/* Matches */}
              {round.matches.map((match, matchIndex) => {
                const x = roundIndex * ROUND_SPACING + 50
                const y = 80 + matchIndex * MATCH_SPACING + 
                         (maxMatchesInRound - round.matches.length) * MATCH_SPACING / 2

                return (
                  <MatchCard
                    key={match.id || `${round.roundNumber}-${match.matchNumber}`}
                    match={match}
                    tournament={tournament}
                    position={{ x, y }}
                    onClick={() => {
                      setSelectedMatch(match)
                      onMatchClick?.(match)
                    }}
                    isClickable={isAdmin || canUserInteractWithMatch(match, currentUser)}
                  />
                )
              })}

              {/* Connection Lines */}
              {roundIndex < bracket.rounds.length - 1 && (
                <svg
                  className="absolute pointer-events-none"
                  style={{
                    left: `${roundIndex * ROUND_SPACING + MATCH_CARD_WIDTH + 50}px`,
                    top: '80px',
                    width: `${ROUND_SPACING - MATCH_CARD_WIDTH}px`,
                    height: `${round.matches.length * MATCH_SPACING}px`
                  }}
                >
                  {round.matches.map((match, matchIndex) => {
                    const nextRoundMatchIndex = Math.floor(matchIndex / 2)
                    const nextRound = bracket.rounds[roundIndex + 1]
                    
                    if (!nextRound || !nextRound.matches[nextRoundMatchIndex]) return null

                    const startY = matchIndex * MATCH_SPACING + MATCH_CARD_HEIGHT / 2
                    const endY = (nextRoundMatchIndex * MATCH_SPACING + MATCH_CARD_HEIGHT / 2) +
                               (maxMatchesInRound - nextRound.matches.length) * MATCH_SPACING / 2 - 
                               (maxMatchesInRound - round.matches.length) * MATCH_SPACING / 2

                    return (
                      <g key={`line-${matchIndex}`}>
                        <line
                          x1="0"
                          y1={startY}
                          x2={ROUND_SPACING - MATCH_CARD_WIDTH - 20}
                          y2={endY}
                          stroke="hsl(var(--border))"
                          strokeWidth="2"
                          className="transition-colors"
                        />
                      </g>
                    )
                  })}
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Match Details Dialog */}
      {selectedMatch && (
        <MatchDetailsDialog
          match={selectedMatch}
          tournament={tournament}
          onClose={() => setSelectedMatch(null)}
          onReportScore={onReportScore}
          isAdmin={isAdmin}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}

function MatchCard({ match, tournament, position, onClick, isClickable = true }) {
  const getMatchStatusColor = (status) => {
    switch (status) {
      case MATCH_STATUS.COMPLETED:
        return 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950'
      case MATCH_STATUS.IN_PROGRESS:
        return 'border-primary bg-gradient-to-br from-blue-50 to-primary/10 dark:from-blue-950 dark:to-primary/20'
      case MATCH_STATUS.DISPUTED:
        return 'border-orange-500 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950 dark:to-yellow-950'
      case MATCH_STATUS.FORFEIT:
        return 'border-red-500 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950 dark:to-pink-950'
      default:
        return 'border-muted-foreground/20 bg-background'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case MATCH_STATUS.COMPLETED:
        return <CheckCircle className="h-4 w-4 text-emerald-600" />
      case MATCH_STATUS.IN_PROGRESS:
        return <PlayCircle className="h-4 w-4 text-primary" />
      case MATCH_STATUS.DISPUTED:
        return <AlertCircle className="h-4 w-4 text-orange-600" />
      case MATCH_STATUS.FORFEIT:
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const isMatchReady = match.participant1 && match.participant2
  const showScore = match.status === MATCH_STATUS.COMPLETED && match.score

  return (
    <Card
      className={`absolute border-2 cursor-pointer transition-all hover:shadow-lg ${
        getMatchStatusColor(match.status)
      } ${!isClickable ? 'cursor-default' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${MATCH_CARD_WIDTH}px`,
        height: `${MATCH_CARD_HEIGHT}px`
      }}
      onClick={isClickable ? onClick : undefined}
    >
      <CardContent className="p-2 h-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium">
            Match {match.matchNumber}
          </span>
          {getStatusIcon(match.status)}
        </div>
        
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className={`truncate ${match.winner === match.participant1?.id ? 'font-bold' : ''}`}>
              {match.participant1?.participantName || 'TBD'}
            </span>
            {showScore && (
              <span className="font-mono text-xs">
                {match.score[match.participant1?.id] || '0'}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <span className={`truncate ${match.winner === match.participant2?.id ? 'font-bold' : ''}`}>
              {match.participant2?.participantName || 'TBD'}
            </span>
            {showScore && (
              <span className="font-mono text-xs">
                {match.score[match.participant2?.id] || '0'}
              </span>
            )}
          </div>
        </div>

        {!isMatchReady && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center text-xs text-muted-foreground">
            Waiting for participants
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MatchDetailsDialog({ match, tournament, onClose, onReportScore, isAdmin, currentUser }) {
  const [scoreData, setScoreData] = useState({
    [match.participant1?.id]: '',
    [match.participant2?.id]: '',
    winnerId: ''
  })

  const canReportScore = isAdmin || 
    (currentUser && (
      currentUser.id === match.participant1?.userId || 
      currentUser.id === match.participant2?.userId
    ))

  const handleScoreSubmit = () => {
    const winnerId = scoreData.winnerId || 
      (parseInt(scoreData[match.participant1?.id] || 0) > parseInt(scoreData[match.participant2?.id] || 0)
        ? match.participant1?.id
        : match.participant2?.id)

    onReportScore?.({
      matchId: match.id,
      score: {
        [match.participant1?.id]: parseInt(scoreData[match.participant1?.id] || 0),
        [match.participant2?.id]: parseInt(scoreData[match.participant2?.id] || 0)
      },
      winnerId
    })
    
    onClose()
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Match {match.matchNumber} - Round {match.round}</span>
          </DialogTitle>
          <DialogDescription>
            {tournament.game} • {tournament.settings?.matchFormat?.toUpperCase() || 'BO1'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Participants */}
          <div className="space-y-3">
            <h4 className="font-semibold">Participants</h4>
            
            <div className="space-y-2">
              <div className={`flex items-center justify-between p-2 rounded border ${
                match.winner === match.participant1?.id ? 'bg-green-50 dark:bg-green-950 border-green-200' : ''
              }`}>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>{match.participant1?.participantName || 'TBD'}</span>
                  {match.winner === match.participant1?.id && (
                    <Badge className="bg-green-600">Winner</Badge>
                  )}
                </div>
                {match.score && (
                  <span className="font-mono">
                    {match.score[match.participant1?.id] || '0'}
                  </span>
                )}
              </div>

              <div className={`flex items-center justify-between p-2 rounded border ${
                match.winner === match.participant2?.id ? 'bg-green-50 dark:bg-green-950 border-green-200' : ''
              }`}>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>{match.participant2?.participantName || 'TBD'}</span>
                  {match.winner === match.participant2?.id && (
                    <Badge className="bg-green-600">Winner</Badge>
                  )}
                </div>
                {match.score && (
                  <span className="font-mono">
                    {match.score[match.participant2?.id] || '0'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Match Status */}
          <div className="flex items-center justify-between">
            <span className="font-semibold">Status:</span>
            <Badge variant={match.status === MATCH_STATUS.COMPLETED ? 'default' : 'secondary'}>
              {match.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>

          {/* Score Reporting */}
          {canReportScore && match.status === MATCH_STATUS.PENDING && match.participant1 && match.participant2 && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-semibold">Report Score</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="score1">{match.participant1.participantName}</Label>
                  <Input
                    id="score1"
                    type="number"
                    min="0"
                    value={scoreData[match.participant1.id]}
                    onChange={(e) => setScoreData(prev => ({
                      ...prev,
                      [match.participant1.id]: e.target.value
                    }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="score2">{match.participant2.participantName}</Label>
                  <Input
                    id="score2"
                    type="number"
                    min="0"
                    value={scoreData[match.participant2.id]}
                    onChange={(e) => setScoreData(prev => ({
                      ...prev,
                      [match.participant2.id]: e.target.value
                    }))}
                  />
                </div>
              </div>

              <Button 
                onClick={handleScoreSubmit} 
                className="w-full"
                disabled={!scoreData[match.participant1.id] || !scoreData[match.participant2.id]}
              >
                Submit Score
              </Button>
            </div>
          )}

          {/* Match Details */}
          {match.scheduledTime && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Scheduled: {new Date(match.scheduledTime).toLocaleString()}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function canUserInteractWithMatch(match, user) {
  if (!user || !match.participant1 || !match.participant2) return false
  
  return user.id === match.participant1.userId || user.id === match.participant2.userId
}