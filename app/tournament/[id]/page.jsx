'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BracketVisualization } from '@/components/bracket-visualization'
import { 
  Trophy, 
  Users, 
  Calendar, 
  Settings, 
  Share,
  Copy,
  Crown,
  Shield,
  Clock,
  Gamepad2,
  User,
  MapPin,
  Award,
  Plus,
  Search,
  X,
  UserPlus,
  Trash2,
  Target,
  ArrowRight,
  Shuffle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'
import { GAME_TEMPLATES, TOURNAMENT_STATUS, TOURNAMENT_FORMAT } from '@/lib/types'
import { BracketGenerator } from '@/lib/bracket-utils'

// Mock tournament data - replace with actual API call
const mockTournament = {
  id: '1',
  name: 'Spring Championship 2024',
  description: 'A competitive League of Legends tournament featuring the best players from around the region. Join us for intense matches, great prizes, and unforgettable moments!',
  game: 'league_of_legends',
  format: 'single_elimination',
  status: 'in_progress',
  currentParticipants: 16,
  maxParticipants: 16,
  creatorName: 'GameMaster',
  createdAt: '2024-01-15T10:00:00Z',
  startedAt: '2024-01-16T18:00:00Z',
  isPublic: true,
  hasPassword: false,
  settings: {
    matchFormat: 'bo3',
    allowForfeits: true,
    scoreConfirmationRequired: true,
    rules: 'Standard tournament rules apply. No cheating, respect opponents, and have fun!',
    prizeInfo: '$1000 for 1st place, $500 for 2nd place, $250 for 3rd place'
  },
  participants: [
    { id: '1', participantName: 'Player1', seed: 1, status: 'active' },
    { id: '2', participantName: 'Player2', seed: 2, status: 'active' },
    { id: '3', participantName: 'Player3', seed: 3, status: 'eliminated' },
    { id: '4', participantName: 'Player4', seed: 4, status: 'active' }
    // Add more participants...
  ]
}

export default function TournamentPage() {
  const params = useParams()
  const [tournament, setTournament] = useState(null)
  const [bracket, setBracket] = useState(null)
  const [activeTab, setActiveTab] = useState('bracket')
  const [loading, setLoading] = useState(true)

  // Mock user - replace with actual auth
  const currentUser = null
  const isAdmin = true // Set to true for testing participant management

  useEffect(() => {
    const loadTournament = async () => {
      try {
        setLoading(true)
        
        // Fetch actual tournament data
        const response = await fetch(`/api/tournaments/${params.id}`)
        const result = await response.json()
        
        if (result.success) {
          // Transform participant data to ensure UI compatibility
          const transformedTournament = {
            ...result.tournament,
            participants: (result.tournament.participants || []).map(p => ({
              ...p,
              participantName: p.participant_name || p.participantName,
              participant_name: p.participant_name || p.participantName
            }))
          }
          setTournament(transformedTournament)
          
          // Generate bracket visualization
          if (result.tournament.status === 'in_progress' && result.tournament.matches?.length > 0) {
            // Use real matches from database for in-progress tournaments
            const bracketWithMatches = BracketGenerator.generateBracketFromMatches(
              result.tournament.matches,
              result.tournament.participants
            )
            setBracket(bracketWithMatches)
          } else if (result.tournament.status === 'in_progress' && result.tournament.participants?.length >= 4) {
            // Fallback: generate bracket from participants if no matches exist yet
            const generatedBracket = BracketGenerator.generateSingleElimination(
              result.tournament.participants
            )
            setBracket(generatedBracket)
          } else if (result.tournament.status === 'registration') {
            // Generate bracket with mix of real participants and placeholders
            const maxParticipants = result.tournament.max_participants
            const assignedParticipants = result.tournament.participants?.filter(p => p.seed) || []
            
            // Create array for all bracket positions
            const bracketParticipants = Array.from({ length: maxParticipants }, (_, i) => {
              const seed = i + 1
              
              // Find participant assigned to this seed
              const assignedParticipant = assignedParticipants.find(p => p.seed === seed)
              
              if (assignedParticipant) {
                return {
                  id: assignedParticipant.id,
                  participantName: assignedParticipant.participant_name,
                  seed: seed,
                  status: assignedParticipant.status
                }
              } else {
                // Use placeholder for unassigned positions
                return {
                  id: `placeholder-${seed}`,
                  participantName: `Participant ${seed}`,
                  seed: seed,
                  status: 'pending'
                }
              }
            })
            
            const generatedBracket = BracketGenerator.generateSingleElimination(bracketParticipants)
            setBracket(generatedBracket)
          }
        } else {
          console.error('Failed to load tournament:', result.error)
          setTournament(null)
        }
      } catch (error) {
        console.error('Failed to load tournament:', error)
        setTournament(null)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadTournament()
    }
  }, [params.id])

  const [shareSuccess, setShareSuccess] = useState(false)

  const handleShareTournament = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setShareSuccess(true)
      setTimeout(() => setShareSuccess(false), 2000) // Reset after 2 seconds
    } catch (error) {
      console.error('Failed to copy URL:', error)
      // Fallback for browsers that don't support clipboard API
      try {
        const textArea = document.createElement('textarea')
        textArea.value = url
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setShareSuccess(true)
        setTimeout(() => setShareSuccess(false), 2000)
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError)
      }
    }
  }

  const handleJoinTournament = () => {
    // Implement join tournament logic
    console.log('Joining tournament...')
  }

  const handleMatchClick = (match) => {
    console.log('Match clicked:', match)
    // Match details are handled by the BracketVisualization component's modal
  }

  const handleReportScore = (scoreData) => {
    console.log('Reporting score:', scoreData)
    // Implement score reporting logic
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading tournament...</p>
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Tournament Not Found</h1>
          <p className="text-muted-foreground mb-4">The tournament you're looking for doesn't exist or has been deleted.</p>
          <Link href="/tournaments">
            <Button>Browse Tournaments</Button>
          </Link>
        </div>
      </div>
    )
  }

  const gameTemplate = GAME_TEMPLATES[tournament.game]
  const canJoin = tournament.status === TOURNAMENT_STATUS.REGISTRATION && 
                 (tournament.current_participants || tournament.participants?.length || 0) < tournament.max_participants

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Gamepad2 className="h-6 w-6 text-primary" />
                </div>
                <Badge variant="outline">{gameTemplate?.name || tournament.game}</Badge>
                <StatusBadge status={tournament.status} />
                {tournament.hasPassword && (
                  <Badge variant="secondary">
                    <Shield className="h-3 w-3 mr-1" />
                    Private
                  </Badge>
                )}
              </div>
              
              <h1 className="text-3xl lg:text-4xl font-bold mb-3">{tournament.name}</h1>
              
              <p className="text-lg text-muted-foreground mb-4 max-w-2xl">
                {tournament.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>by {tournament.creator_name || 'Unknown'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Created {new Date(tournament.created_at).toLocaleDateString()}</span>
                </div>
                {tournament.started_at && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>Started {new Date(tournament.started_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={handleShareTournament}>
                {shareSuccess ? (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Share className="h-4 w-4 mr-2" />
                    Share
                  </>
                )}
              </Button>
              
              {canJoin && (
                <Button size="lg" onClick={handleJoinTournament}>
                  <Users className="h-4 w-4 mr-2" />
                  Join Tournament
                </Button>
              )}
              
              {isAdmin && (
                <Link href={`/tournament/${tournament.id}/manage`}>
                  <Button variant="secondary">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Tournament Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">
                {tournament.current_participants || tournament.participants?.length || 0} / {tournament.max_participants}
              </div>
              <div className="text-sm text-muted-foreground">Participants</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold capitalize">
                {tournament.format.replace('_', ' ')}
              </div>
              <div className="text-sm text-muted-foreground">Format</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Gamepad2 className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">
                {tournament.settings?.matchFormat?.toUpperCase() || 'BO1'}
              </div>
              <div className="text-sm text-muted-foreground">Match Format</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Award className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">
                {tournament.settings?.prizeInfo ? 'Yes' : 'No'}
              </div>
              <div className="text-sm text-muted-foreground">Prizes</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="bracket">Bracket</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>

          <TabsContent value="bracket">
            <Card>
              <CardHeader>
                <CardTitle>Tournament Bracket</CardTitle>
                <CardDescription>
                  Interactive bracket visualization. Click on matches to view details or report scores.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bracket ? (
                  <BracketVisualization
                    bracket={bracket}
                    tournament={tournament}
                    onMatchClick={handleMatchClick}
                    onReportScore={handleReportScore}
                    currentUser={currentUser}
                    isAdmin={isAdmin}
                  />
                ) : (
                  <div className="text-center py-12">
                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Bracket will be generated once tournament starts
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participants">
            <ParticipantsList 
              participants={tournament.participants || []} 
              tournament={tournament}
              bracket={bracket}
              isAdmin={isAdmin}
              onParticipantAdded={(newParticipant) => {
                // Ensure the new participant has proper data transformation
                const transformedParticipant = {
                  ...newParticipant,
                  participantName: newParticipant.participant_name || newParticipant.participantName,
                  participant_name: newParticipant.participant_name || newParticipant.participantName
                }
                
                setTournament(prev => ({
                  ...prev,
                  participants: [...(prev.participants || []), transformedParticipant]
                }))
              }}
              onParticipantRemoved={(participantId) => {
                setTournament(prev => {
                  const updatedParticipants = (prev.participants || []).filter(p => p.id !== participantId)
                  return {
                    ...prev,
                    participants: updatedParticipants
                  }
                })
                
                // Also update bracket to remove the participant and restore placeholder
                if (bracket && bracket.rounds && bracket.rounds.length > 0) {
                  const updatedBracket = { ...bracket }
                  const firstRound = updatedBracket.rounds[0]
                  
                  firstRound.matches.forEach((match, matchIndex) => {
                    // Check participant 1
                    if (match.participant1 && match.participant1.id === participantId) {
                      const seed = matchIndex * 2 + 1
                      match.participant1 = { 
                        id: `placeholder-${seed}`, 
                        name: `Participant ${seed}`,
                        participantName: `Participant ${seed}`,
                        seed: seed,
                        status: 'pending'
                      }
                    }
                    
                    // Check participant 2
                    if (match.participant2 && match.participant2.id === participantId) {
                      const seed = matchIndex * 2 + 2
                      match.participant2 = { 
                        id: `placeholder-${seed}`, 
                        name: `Participant ${seed}`,
                        participantName: `Participant ${seed}`,
                        seed: seed,
                        status: 'pending'
                      }
                    }
                  })
                  
                  setBracket(updatedBracket)
                }
              }}
              onBracketUpdated={(updatedBracket) => {
                setBracket(updatedBracket)
              }}
            />
          </TabsContent>

          <TabsContent value="matches">
            <MatchesList bracket={bracket} tournament={tournament} />
          </TabsContent>

          <TabsContent value="info">
            <TournamentInfo tournament={tournament} gameTemplate={gameTemplate} />
          </TabsContent>
        </Tabs>
      </div>

    </div>
  )
}

function StatusBadge({ status }) {
  switch (status) {
    case TOURNAMENT_STATUS.REGISTRATION:
      return <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">Registration Open</Badge>
    case TOURNAMENT_STATUS.IN_PROGRESS:
      return <Badge className="bg-gradient-to-r from-primary to-blue-600 text-white border-0">In Progress</Badge>
    case TOURNAMENT_STATUS.COMPLETED:
      return <Badge className="bg-gradient-to-r from-accent to-purple-600 text-white border-0">Completed</Badge>
    case TOURNAMENT_STATUS.ARCHIVED:
      return <Badge className="bg-gradient-to-r from-gray-500 to-gray-600 text-white border-0">Archived</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function ParticipantsList({ participants, tournament, isAdmin, onParticipantAdded, onParticipantRemoved, bracket, onBracketUpdated }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedParticipant, setSelectedParticipant] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [manualName, setManualName] = useState('')
  const [addMode, setAddMode] = useState('search') // 'search' or 'manual'
  
  // UI feedback states
  const [showRandomizeConfirm, setShowRandomizeConfirm] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isRandomizing, setIsRandomizing] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [actionStatus, setActionStatus] = useState(null) // { type: 'success'|'error', message: string }
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [participantToRemove, setParticipantToRemove] = useState(null)

  const activeParticipants = participants.filter(p => p.status === 'active')
  const eliminatedParticipants = participants.filter(p => p.status === 'eliminated')
  
  // Debug logging
  console.log('ParticipantsList - participants:', participants)
  console.log('ParticipantsList - activeParticipants:', activeParticipants)

  // Get available bracket positions
  const getAvailableBracketPositions = () => {
    if (!bracket || !bracket.rounds || bracket.rounds.length === 0) return []
    
    const firstRound = bracket.rounds[0]
    const positions = []
    
    firstRound.matches.forEach((match, matchIndex) => {
      // Check participant 1 position - consider placeholders as available
      const isParticipant1Available = !match.participant1 || 
        match.participant1.name === 'TBD' || 
        match.participant1.name?.startsWith('Participant ') ||
        match.participant1.participantName?.startsWith('Participant ')
        
      if (isParticipant1Available) {
        positions.push({
          matchIndex,
          position: 1,
          seed: matchIndex * 2 + 1,
          description: `Match ${match.matchNumber || matchIndex + 1}, Position 1 (Seed ${matchIndex * 2 + 1})`
        })
      }
      
      // Check participant 2 position - consider placeholders as available
      const isParticipant2Available = !match.participant2 || 
        match.participant2.name === 'TBD' || 
        match.participant2.name?.startsWith('Participant ') ||
        match.participant2.participantName?.startsWith('Participant ')
        
      if (isParticipant2Available) {
        positions.push({
          matchIndex,
          position: 2,
          seed: matchIndex * 2 + 2,
          description: `Match ${match.matchNumber || matchIndex + 1}, Position 2 (Seed ${matchIndex * 2 + 2})`
        })
      }
    })
    
    return positions
  }

  // Get participant's current bracket position
  const getParticipantBracketPosition = (participant) => {
    if (!bracket || !bracket.rounds || bracket.rounds.length === 0) return null
    
    const firstRound = bracket.rounds[0]
    
    for (let matchIndex = 0; matchIndex < firstRound.matches.length; matchIndex++) {
      const match = firstRound.matches[matchIndex]
      
      // Check participant 1 - ignore placeholders
      if (match.participant1 && 
          !match.participant1.name?.startsWith('Participant ') &&
          !match.participant1.participantName?.startsWith('Participant ') &&
          match.participant1.name !== 'TBD' &&
          (match.participant1.name === participant.participantName || 
           match.participant1.participantName === participant.participantName ||
           match.participant1.id === participant.id)) {
        return {
          matchIndex,
          position: 1,
          seed: matchIndex * 2 + 1,
          description: `Match ${match.matchNumber || matchIndex + 1}, Position 1 (Seed ${matchIndex * 2 + 1})`
        }
      }
      
      // Check participant 2 - ignore placeholders
      if (match.participant2 && 
          !match.participant2.name?.startsWith('Participant ') &&
          !match.participant2.participantName?.startsWith('Participant ') &&
          match.participant2.name !== 'TBD' &&
          (match.participant2.name === participant.participantName || 
           match.participant2.participantName === participant.participantName ||
           match.participant2.id === participant.id)) {
        return {
          matchIndex,
          position: 2,
          seed: matchIndex * 2 + 2,
          description: `Match ${match.matchNumber || matchIndex + 1}, Position 2 (Seed ${matchIndex * 2 + 2})`
        }
      }
    }
    
    return null
  }

  // Assign participant to bracket position
  const handleAssignToBracket = async (participant, targetPosition) => {
    if (!bracket || !onBracketUpdated) return
    
    try {
      // Update seed in database
      const response = await fetch(`/api/tournaments/${tournament.id}/participants/${participant.id}/seed`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: targetPosition.seed })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Failed to update participant seed:', errorData.error)
        setActionStatus({ 
          type: 'error', 
          message: 'Failed to assign participant to bracket position' 
        })
        setTimeout(() => setActionStatus(null), 3000)
        return
      }

      // Update local state
      const updatedBracket = { ...bracket }
      const firstRound = updatedBracket.rounds[0]
      const targetMatch = firstRound.matches[targetPosition.matchIndex]
      
      // Remove participant from any existing position first (ignore placeholders)
      firstRound.matches.forEach((match, matchIndex) => {
        if (match.participant1 && 
            !match.participant1.name?.startsWith('Participant ') &&
            !match.participant1.participantName?.startsWith('Participant ') &&
            match.participant1.name !== 'TBD' &&
            (match.participant1.name === participant.participantName || 
             match.participant1.participantName === participant.participantName ||
             match.participant1.id === participant.id)) {
          // Restore original placeholder name
          const seed = matchIndex * 2 + 1
          match.participant1 = { 
            id: `placeholder-${seed}`, 
            name: `Participant ${seed}`,
            participantName: `Participant ${seed}`,
            seed: seed,
            status: 'pending'
          }
        }
        if (match.participant2 && 
            !match.participant2.name?.startsWith('Participant ') &&
            !match.participant2.participantName?.startsWith('Participant ') &&
            match.participant2.name !== 'TBD' &&
            (match.participant2.name === participant.participantName || 
             match.participant2.participantName === participant.participantName ||
             match.participant2.id === participant.id)) {
          // Restore original placeholder name
          const seed = matchIndex * 2 + 2
          match.participant2 = { 
            id: `placeholder-${seed}`, 
            name: `Participant ${seed}`,
            participantName: `Participant ${seed}`,
            seed: seed,
            status: 'pending'
          }
        }
      })
      
      // Assign to new position (replacing placeholder or empty slot)
      if (targetPosition.position === 1) {
        targetMatch.participant1 = {
          id: participant.id,
          name: participant.participantName,
          participantName: participant.participantName,
          seed: targetPosition.seed
        }
      } else {
        targetMatch.participant2 = {
          id: participant.id,
          name: participant.participantName,
          participantName: participant.participantName,
          seed: targetPosition.seed
        }
      }
      
      onBracketUpdated(updatedBracket)
      setShowAssignModal(false)
      setSelectedParticipant(null)
    } catch (error) {
      console.error('Failed to assign participant:', error)
      setActionStatus({ 
        type: 'error', 
        message: 'Failed to assign participant to bracket position' 
      })
      setTimeout(() => setActionStatus(null), 3000)
    }
  }

  // Clear all participant assignments
  const confirmClearAllAssignments = () => {
    const assignedParticipants = activeParticipants.filter(p => getParticipantBracketPosition(p))
    if (assignedParticipants.length === 0) return
    setShowClearConfirm(true)
  }

  const handleClearAllAssignments = async () => {
    if (!bracket || !onBracketUpdated) return

    const assignedParticipants = activeParticipants.filter(p => getParticipantBracketPosition(p))
    if (assignedParticipants.length === 0) return

    setIsClearing(true)
    setActionStatus(null)
    setShowClearConfirm(false)

    try {
      // Remove seeds from all assigned participants in database
      const clearPromises = assignedParticipants.map(async (participant) => {
        const response = await fetch(`/api/tournaments/${tournament.id}/participants/${participant.id}/seed`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(`Failed to clear ${participant.participantName}: ${errorData.error}`)
        }

        return participant
      })

      await Promise.all(clearPromises)

      // Reset bracket to all placeholders
      const updatedBracket = { ...bracket }
      const firstRound = updatedBracket.rounds[0]

      firstRound.matches.forEach((match, matchIndex) => {
        const seed1 = matchIndex * 2 + 1
        const seed2 = matchIndex * 2 + 2
        
        match.participant1 = {
          id: `placeholder-${seed1}`,
          name: `Participant ${seed1}`,
          participantName: `Participant ${seed1}`,
          seed: seed1,
          status: 'pending'
        }
        
        match.participant2 = {
          id: `placeholder-${seed2}`,
          name: `Participant ${seed2}`,
          participantName: `Participant ${seed2}`,
          seed: seed2,
          status: 'pending'
        }
      })

      onBracketUpdated(updatedBracket)
      setActionStatus({ 
        type: 'success', 
        message: `Successfully cleared ${assignedParticipants.length} participant assignments!` 
      })
    } catch (error) {
      console.error('Failed to clear assignments:', error)
      setActionStatus({ 
        type: 'error', 
        message: `Failed to clear assignments: ${error.message}` 
      })
    } finally {
      setIsClearing(false)
      // Clear status message after 3 seconds
      setTimeout(() => setActionStatus(null), 3000)
    }
  }

  // Randomize all participant positions
  const confirmRandomizePositions = () => {
    if (activeParticipants.length === 0) return
    setShowRandomizeConfirm(true)
  }

  const handleRandomizePositions = async () => {
    if (!bracket || !onBracketUpdated || activeParticipants.length === 0) return

    setIsRandomizing(true)
    setActionStatus(null)
    setShowRandomizeConfirm(false)

    try {
      // Get all available positions (1 through max tournament size)
      const maxPositions = tournament.max_participants || 16
      const availableSeeds = Array.from({ length: maxPositions }, (_, i) => i + 1)
      
      // Shuffle the available seeds
      const shuffledSeeds = [...availableSeeds].sort(() => Math.random() - 0.5)
      
      // Update each participant's seed in the database
      const updatePromises = activeParticipants.map(async (participant, index) => {
        const newSeed = shuffledSeeds[index] // Assign first N shuffled seeds to participants
        
        const response = await fetch(`/api/tournaments/${tournament.id}/participants/${participant.id}/seed`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seed: newSeed })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(`Failed to update ${participant.participantName}: ${errorData.error}`)
        }

        return { participant, seed: newSeed }
      })

      const updatedParticipants = await Promise.all(updatePromises)

      // Update bracket state
      const updatedBracket = { ...bracket }
      const firstRound = updatedBracket.rounds[0]

      // Reset all positions to placeholders first
      firstRound.matches.forEach((match, matchIndex) => {
        const seed1 = matchIndex * 2 + 1
        const seed2 = matchIndex * 2 + 2
        
        match.participant1 = {
          id: `placeholder-${seed1}`,
          name: `Participant ${seed1}`,
          participantName: `Participant ${seed1}`,
          seed: seed1,
          status: 'pending'
        }
        
        match.participant2 = {
          id: `placeholder-${seed2}`,
          name: `Participant ${seed2}`,
          participantName: `Participant ${seed2}`,
          seed: seed2,
          status: 'pending'
        }
      })

      // Place participants in their new positions
      updatedParticipants.forEach(({ participant, seed }) => {
        const matchIndex = Math.floor((seed - 1) / 2)
        const position = (seed - 1) % 2 + 1
        const targetMatch = firstRound.matches[matchIndex]

        const participantData = {
          id: participant.id,
          name: participant.participantName,
          participantName: participant.participantName,
          seed: seed
        }

        if (position === 1) {
          targetMatch.participant1 = participantData
        } else {
          targetMatch.participant2 = participantData
        }
      })

      onBracketUpdated(updatedBracket)
      setActionStatus({ 
        type: 'success', 
        message: `Successfully randomized ${activeParticipants.length} participants!` 
      })
    } catch (error) {
      console.error('Failed to randomize positions:', error)
      setActionStatus({ 
        type: 'error', 
        message: `Failed to randomize positions: ${error.message}` 
      })
    } finally {
      setIsRandomizing(false)
      // Clear status message after 3 seconds
      setTimeout(() => setActionStatus(null), 3000)
    }
  }

  const handleSearchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const results = await response.json()
        setSearchResults(results.users || [])
      }
    } catch (error) {
      console.error('Failed to search users:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddParticipant = async (participant) => {
    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantName: participant.name || participant.participantName,
          userId: participant.userId || null,
          seed: null // Don't auto-assign seed - let user manually assign to bracket positions
        })
      })

      if (response.ok) {
        const result = await response.json()
        onParticipantAdded(result.participant)
        setShowAddModal(false)
        setSearchQuery('')
        setManualName('')
        setSearchResults([])
      }
    } catch (error) {
      console.error('Failed to add participant:', error)
    }
  }

  const confirmRemoveParticipant = (participant) => {
    setParticipantToRemove(participant)
    setShowRemoveConfirm(true)
  }

  const handleRemoveParticipant = async () => {
    if (!participantToRemove) return

    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/participants/${participantToRemove.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onParticipantRemoved(participantToRemove.id)
        setShowRemoveConfirm(false)
        setParticipantToRemove(null)
      }
    } catch (error) {
      console.error('Failed to remove participant:', error)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Active Participants ({activeParticipants.length})</span>
            </CardTitle>
            {isAdmin && (
              <div className="flex space-x-2">
                {activeParticipants.length > 0 && (
                  <>
                    {activeParticipants.some(p => getParticipantBracketPosition(p)) && (
                      <Button 
                        onClick={confirmClearAllAssignments} 
                        size="sm" 
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear All
                      </Button>
                    )}
                    <Button 
                      onClick={confirmRandomizePositions} 
                      size="sm" 
                      variant="outline"
                    >
                      <Shuffle className="h-4 w-4 mr-2" />
                      Randomize Positions
                    </Button>
                  </>
                )}
                <Button onClick={() => setShowAddModal(true)} size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Participant
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeParticipants.map((participant, index) => {
              const bracketPosition = getParticipantBracketPosition(participant)
              return (
                <div
                  key={participant.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border bg-card group"
                >
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">{bracketPosition?.seed || '?'}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{participant.participantName}</div>
                    {bracketPosition ? (
                      <Badge variant="secondary" className="text-xs">
                        <Target className="h-3 w-3 mr-1" />
                        Seed {bracketPosition.seed}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Not Assigned
                      </Badge>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedParticipant(participant)
                          setShowAssignModal(true)
                        }}
                        title="Assign to bracket position"
                      >
                        <Target className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmRemoveParticipant(participant)}
                        title="Remove participant"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {eliminatedParticipants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">
              Eliminated Participants ({eliminatedParticipants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {eliminatedParticipants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border bg-muted/50 opacity-60 group"
                >
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                    <span className="text-sm">{participant.seed}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{participant.participantName}</div>
                    <Badge variant="outline" className="text-xs">
                      Eliminated
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Participant Modal */}
      {showAddModal && (
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Participant</DialogTitle>
              <DialogDescription>
                Search for existing users or add a manual participant
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Mode Selection */}
              <div className="flex space-x-2">
                <Button
                  variant={addMode === 'search' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAddMode('search')}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search Users
                </Button>
                <Button
                  variant={addMode === 'manual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAddMode('manual')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Manual Entry
                </Button>
              </div>

              {addMode === 'search' && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="userSearch">Search Users</Label>
                    <Input
                      id="userSearch"
                      placeholder="Type username or email..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        handleSearchUsers(e.target.value)
                      }}
                    />
                  </div>

                  {isSearching && (
                    <div className="text-center py-2">
                      <div className="text-sm text-muted-foreground">Searching...</div>
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleAddParticipant({ 
                            name: user.display_name || user.username,
                            userId: user.id,
                            participantName: user.display_name || user.username
                          })}
                        >
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium">{user.display_name || user.username}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchQuery && !isSearching && searchResults.length === 0 && (
                    <div className="text-center py-4">
                      <div className="text-sm text-muted-foreground">No users found</div>
                    </div>
                  )}
                </div>
              )}

              {addMode === 'manual' && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="manualName">Participant Name</Label>
                    <Input
                      id="manualName"
                      placeholder="Enter participant name..."
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full"
                    disabled={!manualName.trim()}
                    onClick={() => handleAddParticipant({ 
                      participantName: manualName.trim(),
                      userId: null
                    })}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Participant
                  </Button>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bracket Assignment Modal */}
      {showAssignModal && selectedParticipant && (
        <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign to Bracket Position</DialogTitle>
              <DialogDescription>
                Assign {selectedParticipant.participantName} to a bracket position
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Current Position */}
              {(() => {
                const currentPosition = getParticipantBracketPosition(selectedParticipant)
                if (currentPosition) {
                  return (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm font-medium">Current Position:</div>
                      <div className="text-sm text-muted-foreground">
                        {currentPosition.description}
                      </div>
                    </div>
                  )
                }
                return (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      Not currently assigned to bracket
                    </div>
                  </div>
                )
              })()}

              {/* Available Positions */}
              <div>
                <Label>Available Positions</Label>
                <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                  {getAvailableBracketPositions().map((position, index) => (
                    <div
                      key={`${position.matchIndex}-${position.position}`}
                      className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleAssignToBracket(selectedParticipant, position)}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">{position.seed}</span>
                        </div>
                        <div>
                          <div className="font-medium text-sm">{position.description}</div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {getAvailableBracketPositions().length === 0 && (
                    <div className="text-center py-4">
                      <div className="text-sm text-muted-foreground">
                        No available positions. All bracket slots are filled.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between space-x-2 pt-4 border-t">
                {getParticipantBracketPosition(selectedParticipant) && (
                  <Button 
                    variant="outline"
                    onClick={async () => {
                      try {
                        // Remove seed from database
                        const response = await fetch(`/api/tournaments/${tournament.id}/participants/${selectedParticipant.id}/seed`, {
                          method: 'DELETE'
                        })

                        if (!response.ok) {
                          const errorData = await response.json()
                          console.error('Failed to remove participant seed:', errorData.error)
                          setActionStatus({ 
                            type: 'error', 
                            message: 'Failed to remove participant from bracket' 
                          })
                          setTimeout(() => setActionStatus(null), 3000)
                          return
                        }

                        // Remove from current position
                        const updatedBracket = { ...bracket }
                        const firstRound = updatedBracket.rounds[0]
                        
                        firstRound.matches.forEach((match, matchIndex) => {
                          if (match.participant1 && 
                              !match.participant1.name?.startsWith('Participant ') &&
                              !match.participant1.participantName?.startsWith('Participant ') &&
                              match.participant1.name !== 'TBD' &&
                              (match.participant1.name === selectedParticipant.participantName || 
                               match.participant1.participantName === selectedParticipant.participantName ||
                               match.participant1.id === selectedParticipant.id)) {
                            // Restore original placeholder name
                            const seed = matchIndex * 2 + 1
                            match.participant1 = { 
                              id: `placeholder-${seed}`, 
                              name: `Participant ${seed}`,
                              participantName: `Participant ${seed}`,
                              seed: seed,
                              status: 'pending'
                            }
                          }
                          if (match.participant2 && 
                              !match.participant2.name?.startsWith('Participant ') &&
                              !match.participant2.participantName?.startsWith('Participant ') &&
                              match.participant2.name !== 'TBD' &&
                              (match.participant2.name === selectedParticipant.participantName || 
                               match.participant2.participantName === selectedParticipant.participantName ||
                               match.participant2.id === selectedParticipant.id)) {
                            // Restore original placeholder name
                            const seed = matchIndex * 2 + 2
                            match.participant2 = { 
                              id: `placeholder-${seed}`, 
                              name: `Participant ${seed}`,
                              participantName: `Participant ${seed}`,
                              seed: seed,
                              status: 'pending'
                            }
                          }
                        })
                        
                        onBracketUpdated(updatedBracket)
                        setShowAssignModal(false)
                        setSelectedParticipant(null)
                      } catch (error) {
                        console.error('Failed to remove participant from bracket:', error)
                        setActionStatus({ 
                          type: 'error', 
                          message: 'Failed to remove participant from bracket' 
                        })
                        setTimeout(() => setActionStatus(null), 3000)
                      }
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove from Bracket
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Status Message */}
      {actionStatus && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
          actionStatus.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-center space-x-2">
            {actionStatus.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span className="text-sm font-medium">{actionStatus.message}</span>
          </div>
        </div>
      )}

      {/* Randomize Confirmation Modal */}
      {showRandomizeConfirm && (
        <Dialog open={showRandomizeConfirm} onOpenChange={setShowRandomizeConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Randomize Positions</DialogTitle>
              <DialogDescription>
                This will randomly assign all {activeParticipants.length} participants to bracket positions. Current assignments will be overwritten.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowRandomizeConfirm(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleRandomizePositions}
                disabled={isRandomizing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isRandomizing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Randomizing...
                  </>
                ) : (
                  <>
                    <Shuffle className="h-4 w-4 mr-2" />
                    Randomize Positions
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Clear All Assignments</DialogTitle>
              <DialogDescription>
                This will remove all participants from their bracket positions and restore placeholders. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleClearAllAssignments}
                disabled={isClearing}
                variant="destructive"
              >
                {isClearing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Clear All Assignments
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Remove Participant Confirmation Modal */}
      {showRemoveConfirm && participantToRemove && (
        <Dialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Remove Participant</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove <strong>{participantToRemove.participantName}</strong> from this tournament? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => {
                setShowRemoveConfirm(false)
                setParticipantToRemove(null)
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleRemoveParticipant}
                variant="destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Participant
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function MatchesList({ bracket, tournament }) {
  if (!bracket || !bracket.rounds) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No matches available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {bracket.rounds.map((round) => (
        <Card key={round.roundNumber}>
          <CardHeader>
            <CardTitle>{round.name}</CardTitle>
            <CardDescription>
              {round.matches.length} match{round.matches.length !== 1 ? 'es' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {round.matches.map((match) => (
                <div
                  key={match.id || `${round.roundNumber}-${match.matchNumber}`}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium mb-1">
                      Match {match.matchNumber}
                    </div>
                    <div className="text-sm space-y-1">
                      <div className={match.winner === match.participant1?.id ? 'font-bold' : ''}>
                        {match.participant1?.participantName || 'TBD'}
                      </div>
                      <div className={match.winner === match.participant2?.id ? 'font-bold' : ''}>
                        {match.participant2?.participantName || 'TBD'}
                      </div>
                    </div>
                  </div>
                  
                  {match.score && (
                    <div className="text-right font-mono">
                      <div>{match.score[match.participant1?.id] || '0'}</div>
                      <div>{match.score[match.participant2?.id] || '0'}</div>
                    </div>
                  )}
                  
                  <div className="ml-4">
                    <StatusBadge status={match.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TournamentInfo({ tournament, gameTemplate }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tournament Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Game</h4>
            <p>{gameTemplate?.name || tournament.game}</p>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="font-semibold mb-2">Format</h4>
            <p className="capitalize">{tournament.format.replace('_', ' ')}</p>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="font-semibold mb-2">Match Format</h4>
            <p>{tournament.settings?.matchFormat?.toUpperCase() || 'BO1'}</p>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="font-semibold mb-2">Participants</h4>
            <p>{tournament.current_participants || tournament.participants?.length || 0} / {tournament.max_participants}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {tournament.settings?.rules && (
          <Card>
            <CardHeader>
              <CardTitle>Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{tournament.settings.rules}</p>
            </CardContent>
          </Card>
        )}

        {tournament.settings?.prizeInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5" />
                <span>Prizes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{tournament.settings.prizeInfo}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}