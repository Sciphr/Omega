'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft,
  Timer,
  Users,
  Eye,
  Play,
  Trophy,
  Clock,
  Shield,
  Target,
  AlertCircle,
  CheckCircle,
  X,
  Gamepad2
} from 'lucide-react'

export default function MatchPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [match, setMatch] = useState(null)
  const [tournament, setTournament] = useState(null)
  const [phases, setPhases] = useState([])
  const [currentPhase, setCurrentPhase] = useState(null)
  const [selections, setSelections] = useState({})
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Access control
  const [hasParticipantAccess, setHasParticipantAccess] = useState(false)
  const [isSpectator, setIsSpectator] = useState(false)
  const [currentParticipant, setCurrentParticipant] = useState(null)
  
  // UI states
  const [showStartMatchModal, setShowStartMatchModal] = useState(false)
  const [showReportScoreModal, setShowReportScoreModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  
  // Get access token from URL params
  const accessToken = searchParams.get('token')

  useEffect(() => {
    loadMatch()
    
    // Set up real-time updates if we have access
    if (accessToken || isSpectator) {
      setupRealTimeUpdates()
    }
  }, [params.id, accessToken])

  useEffect(() => {
    // Timer for phase countdown
    let timer
    if (timeRemaining > 0 && currentPhase?.phase_status === 'active') {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time expired - handle timeout
            handlePhaseTimeout()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [timeRemaining, currentPhase])

  const loadMatch = async () => {
    try {
      setLoading(true)
      
      // Load match with access token if provided
      const url = accessToken 
        ? `/api/matches/${params.id}?token=${accessToken}`
        : `/api/matches/${params.id}`
        
      const response = await fetch(url)
      const result = await response.json()
      
      if (!result.success) {
        setError(result.error)
        return
      }
      
      setMatch(result.match)
      setTournament(result.tournament)
      setPhases(result.phases || [])
      setCurrentPhase(result.currentPhase)
      setSelections(result.selections || {})
      setTimeRemaining(result.timeRemaining || 0)
      setHasParticipantAccess(result.hasParticipantAccess || false)
      setIsSpectator(result.isSpectator || false)
      setCurrentParticipant(result.currentParticipant)
      
    } catch (error) {
      console.error('Failed to load match:', error)
      setError('Failed to load match')
    } finally {
      setLoading(false)
    }
  }

  const setupRealTimeUpdates = () => {
    // TODO: Implement WebSocket connection for real-time updates
    // For now, we'll use polling as a fallback
    const interval = setInterval(() => {
      if (match?.status === 'in_progress') {
        loadMatch()
      }
    }, 2000)
    
    return () => clearInterval(interval)
  }

  const handleStartMatch = async () => {
    if (!hasParticipantAccess && !tournament?.creator_id) return
    
    try {
      const response = await fetch(`/api/matches/${params.id}/start`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setMatch(prev => ({ ...prev, status: 'in_progress' }))
        setShowStartMatchModal(false)
        loadMatch() // Reload to get phase data
      } else {
        console.error('Failed to start match:', result.error)
      }
    } catch (error) {
      console.error('Failed to start match:', error)
    }
  }

  const handleMakeSelection = async (selectionData) => {
    if (!hasParticipantAccess || !currentPhase || !canMakeSelection()) return
    
    try {
      const response = await fetch(`/api/matches/${params.id}/phases/${currentPhase.id}/select`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(selectionData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        setSelections(result.selections)
        setCurrentPhase(result.currentPhase)
        setTimeRemaining(result.timeRemaining || 0)
      } else {
        console.error('Failed to make selection:', result.error)
      }
    } catch (error) {
      console.error('Failed to make selection:', error)
    }
  }

  const handleSkipPhase = async () => {
    if (!hasParticipantAccess || !currentPhase?.is_optional) return
    
    try {
      const response = await fetch(`/api/matches/${params.id}/phases/${currentPhase.id}/skip`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${accessToken}`
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setCurrentPhase(result.currentPhase)
        setTimeRemaining(result.timeRemaining || 0)
      }
    } catch (error) {
      console.error('Failed to skip phase:', error)
    }
  }

  const handlePhaseTimeout = async () => {
    // Handle automatic phase progression when time runs out
    try {
      const response = await fetch(`/api/matches/${params.id}/phases/${currentPhase.id}/timeout`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${accessToken}`
        }
      })
      
      if (response.ok) {
        loadMatch() // Reload match state
      }
    } catch (error) {
      console.error('Failed to handle phase timeout:', error)
    }
  }

  const canMakeSelection = () => {
    if (!currentPhase || !hasParticipantAccess || !currentParticipant) return false
    
    // Check if it's this participant's turn
    return currentPhase.current_turn_participant_id === currentParticipant.id ||
           !currentPhase.turn_based // If not turn-based, anyone can select
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getPhaseProgress = () => {
    if (!phases.length) return 0
    const completedPhases = phases.filter(p => p.phase_status === 'completed').length
    return Math.round((completedPhases / phases.length) * 100)
  }

  const isMyTurn = () => {
    return currentPhase && hasParticipantAccess && 
           currentPhase.current_turn_participant_id === currentParticipant?.id
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Gamepad2 className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading match...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link href="/tournaments">
            <Button>Browse Tournaments</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Match Not Found</h1>
          <p className="text-muted-foreground mb-4">The match you're looking for doesn't exist.</p>
          <Link href="/tournaments">
            <Button>Browse Tournaments</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href={`/tournament/${tournament?.id}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tournament
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">
                Match {match.match_number}
              </h1>
              <p className="text-muted-foreground">{tournament?.name}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-lg px-3 py-1">
              {match.status}
            </Badge>
            {isSpectator && (
              <Badge variant="secondary" className="flex items-center">
                <Eye className="h-3 w-3 mr-1" />
                Spectator
              </Badge>
            )}
            {hasParticipantAccess && (
              <Badge variant="default" className="flex items-center">
                <Users className="h-3 w-3 mr-1" />
                Participant
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Match Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Participants */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Participants</CardTitle>
                  {match.status === 'pending' && hasParticipantAccess && (
                    <Button onClick={() => setShowStartMatchModal(true)}>
                      <Play className="h-4 w-4 mr-2" />
                      Start Match
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {/* Participant 1 */}
                  <Card className={`${isMyTurn() && currentParticipant?.id === match.participant1_id ? 'ring-2 ring-primary' : ''}`}>
                    <CardContent className="p-4 text-center">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Users className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg">
                        {match.participant1?.participant_name || 'TBD'}
                      </h3>
                      {match.participant1_id === currentParticipant?.id && (
                        <Badge className="mt-2">You</Badge>
                      )}
                      {match.winner_id === match.participant1_id && (
                        <Badge className="mt-2 bg-green-600">Winner</Badge>
                      )}
                    </CardContent>
                  </Card>

                  {/* Participant 2 */}
                  <Card className={`${isMyTurn() && currentParticipant?.id === match.participant2_id ? 'ring-2 ring-primary' : ''}`}>
                    <CardContent className="p-4 text-center">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Users className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg">
                        {match.participant2?.participant_name || 'TBD'}
                      </h3>
                      {match.participant2_id === currentParticipant?.id && (
                        <Badge className="mt-2">You</Badge>
                      )}
                      {match.winner_id === match.participant2_id && (
                        <Badge className="mt-2 bg-green-600">Winner</Badge>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Current Phase */}
            {currentPhase && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{currentPhase.phase_name}</span>
                        <Badge variant={currentPhase.phase_type === 'pick' ? 'default' : 'destructive'}>
                          {currentPhase.phase_type}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {isMyTurn() && canMakeSelection() ? 'Your turn to make a selection' : 
                         currentPhase.turn_based ? `Waiting for ${currentPhase.current_turn_participant?.participant_name || 'participant'}` :
                         'Make your selection'}
                      </CardDescription>
                    </div>
                    
                    {timeRemaining > 0 && (
                      <div className="text-right">
                        <div className="flex items-center space-x-2 text-lg font-mono">
                          <Timer className="h-5 w-5" />
                          <span className={timeRemaining <= 10 ? 'text-red-600' : ''}>
                            {formatTime(timeRemaining)}
                          </span>
                        </div>
                        <Progress 
                          value={(timeRemaining / (currentPhase.time_limit_seconds || 30)) * 100} 
                          className="w-32 mt-1"
                        />
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Selection Interface */}
                  <PhaseSelectionInterface 
                    phase={currentPhase}
                    canSelect={canMakeSelection()}
                    onSelect={handleMakeSelection}
                    selections={selections[currentPhase.id] || []}
                    gameType={tournament?.game}
                  />
                  
                  {currentPhase.is_optional && hasParticipantAccess && (
                    <div className="mt-4 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        onClick={handleSkipPhase}
                        className="w-full"
                      >
                        Skip Phase
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Score Reporting (for completed phases or match end) */}
            {match.status === 'ready_for_score' && hasParticipantAccess && (
              <Card>
                <CardHeader>
                  <CardTitle>Match Complete</CardTitle>
                  <CardDescription>
                    All phases completed. Report the match score.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    onClick={() => setShowReportScoreModal(true)}
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Report Score
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Match Progress */}
            {phases.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Match Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Overall Progress</span>
                        <span>{getPhaseProgress()}%</span>
                      </div>
                      <Progress value={getPhaseProgress()} />
                    </div>
                    
                    <div className="space-y-2">
                      {phases.map((phase, index) => (
                        <div key={phase.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              phase.phase_status === 'completed' ? 'bg-green-500' :
                              phase.phase_status === 'active' ? 'bg-blue-500' :
                              'bg-gray-300'
                            }`} />
                            <span className={phase.phase_status === 'active' ? 'font-semibold' : ''}>
                              {phase.phase_name}
                            </span>
                          </div>
                          <Badge 
                            variant={phase.phase_type === 'pick' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {phase.phase_type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Match Info */}
            <Card>
              <CardHeader>
                <CardTitle>Match Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Game:</span>
                  <span className="font-medium">{tournament?.game}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Format:</span>
                  <span className="font-medium">{match.match_format}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Round:</span>
                  <span className="font-medium">{match.round}</span>
                </div>
                {match.scheduled_time && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scheduled:</span>
                    <span className="font-medium">
                      {new Date(match.scheduled_time).toLocaleString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selection History */}
            <SelectionHistory 
              phases={phases}
              selections={selections}
              participants={{
                [match.participant1_id]: match.participant1,
                [match.participant2_id]: match.participant2
              }}
            />
          </div>
        </div>
      </div>

      {/* Start Match Modal */}
      {showStartMatchModal && (
        <Dialog open={showStartMatchModal} onOpenChange={setShowStartMatchModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start Match</DialogTitle>
              <DialogDescription>
                Are you ready to begin the match? This will start the first phase if configured.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowStartMatchModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleStartMatch}>
                <Play className="h-4 w-4 mr-2" />
                Start Match
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// Phase Selection Interface Component
function PhaseSelectionInterface({ phase, canSelect, onSelect, selections, gameType }) {
  const [selectedItem, setSelectedItem] = useState('')
  
  // This is a flexible selection interface that can be customized per game
  const getSelectionOptions = () => {
    // For now, we'll use a generic text input, but this can be expanded
    // to include game-specific character/champion/agent selectors
    switch (gameType) {
      case 'league_of_legends':
        return (
          <ChampionSelector 
            onSelect={(champion) => setSelectedItem(champion)}
            selected={selectedItem}
            bannedChampions={selections.filter(s => s.selection_type === 'ban')}
          />
        )
      case 'valorant':
        return (
          <AgentSelector 
            onSelect={(agent) => setSelectedItem(agent)}
            selected={selectedItem}
            bannedAgents={selections.filter(s => s.selection_type === 'ban')}
          />
        )
      default:
        return (
          <div className="space-y-4">
            <Label htmlFor="selection">
              {phase.phase_type === 'ban' ? 'Ban Selection' : 'Pick Selection'}
            </Label>
            <Input
              id="selection"
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              placeholder={`Enter ${phase.phase_type} selection...`}
              disabled={!canSelect}
            />
          </div>
        )
    }
  }
  
  const handleSubmitSelection = () => {
    if (!selectedItem || !canSelect) return
    
    onSelect({
      selection_type: phase.phase_type,
      selection_data: { item: selectedItem },
      timestamp: new Date().toISOString()
    })
    
    setSelectedItem('')
  }
  
  return (
    <div className="space-y-4">
      {getSelectionOptions()}
      
      {/* Current selections display */}
      {selections.length > 0 && (
        <div className="space-y-2">
          <Label>Current {phase.phase_type}s:</Label>
          <div className="flex flex-wrap gap-2">
            {selections.map((selection, index) => (
              <Badge key={index} variant="outline">
                {selection.selection_data?.item || 'Unknown'}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {canSelect && (
        <Button 
          onClick={handleSubmitSelection}
          disabled={!selectedItem}
          className="w-full"
        >
          <Target className="h-4 w-4 mr-2" />
          Confirm {phase.phase_type}
        </Button>
      )}
    </div>
  )
}

// Placeholder components for game-specific selectors
function ChampionSelector({ onSelect, selected, bannedChampions }) {
  // TODO: Implement League of Legends champion selector
  const [searchTerm, setSearchTerm] = useState('')
  
  return (
    <div className="space-y-2">
      <Label>Select Champion</Label>
      <Input
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value)
          onSelect(e.target.value)
        }}
        placeholder="Search champions..."
      />
    </div>
  )
}

function AgentSelector({ onSelect, selected, bannedAgents }) {
  // TODO: Implement Valorant agent selector
  const [searchTerm, setSearchTerm] = useState('')
  
  return (
    <div className="space-y-2">
      <Label>Select Agent</Label>
      <Input
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value)
          onSelect(e.target.value)
        }}
        placeholder="Search agents..."
      />
    </div>
  )
}

// Selection History Component
function SelectionHistory({ phases, selections, participants }) {
  if (!phases.length || !Object.keys(selections).length) {
    return null
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Selection History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {phases
            .filter(p => p.phase_status === 'completed')
            .map(phase => (
            <div key={phase.id} className="space-y-2">
              <div className="flex items-center space-x-2">
                <Badge variant={phase.phase_type === 'pick' ? 'default' : 'destructive'}>
                  {phase.phase_type}
                </Badge>
                <span className="font-medium text-sm">{phase.phase_name}</span>
              </div>
              
              {selections[phase.id]?.map((selection, index) => (
                <div key={index} className="ml-4 flex items-center justify-between text-sm">
                  <span>{participants[selection.participant_id]?.participant_name}</span>
                  <Badge variant="outline">
                    {selection.selection_data?.item || 'Unknown'}
                  </Badge>
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}