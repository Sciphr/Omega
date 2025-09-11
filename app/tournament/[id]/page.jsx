'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
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
  Award
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
  const isAdmin = false

  useEffect(() => {
    // Simulate API call
    const loadTournament = async () => {
      try {
        setLoading(true)
        // Replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        setTournament(mockTournament)
        
        // Generate bracket visualization
        if (mockTournament.participants.length >= 4) {
          const generatedBracket = BracketGenerator.generateSingleElimination(
            mockTournament.participants
          )
          setBracket(generatedBracket)
        }
      } catch (error) {
        console.error('Failed to load tournament:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTournament()
  }, [params.id])

  const handleShareTournament = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      // Show success toast
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  const handleJoinTournament = () => {
    // Implement join tournament logic
    console.log('Joining tournament...')
  }

  const handleMatchClick = (match) => {
    console.log('Match clicked:', match)
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
                 tournament.currentParticipants < tournament.maxParticipants

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
                  <span>by {tournament.creatorName}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Created {new Date(tournament.createdAt).toLocaleDateString()}</span>
                </div>
                {tournament.startedAt && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>Started {new Date(tournament.startedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={handleShareTournament}>
                <Share className="h-4 w-4 mr-2" />
                Share
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
              <div className="text-2xl font-bold">{tournament.currentParticipants}</div>
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
            <ParticipantsList participants={tournament.participants} />
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

function ParticipantsList({ participants }) {
  const activeParticipants = participants.filter(p => p.status === 'active')
  const eliminatedParticipants = participants.filter(p => p.status === 'eliminated')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Active Participants ({activeParticipants.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeParticipants.map((participant, index) => (
              <div
                key={participant.id}
                className="flex items-center space-x-3 p-3 rounded-lg border bg-card"
              >
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">{participant.seed || index + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium">{participant.participantName}</div>
                  {participant.seed === 1 && (
                    <Badge variant="secondary" className="text-xs">
                      <Crown className="h-3 w-3 mr-1" />
                      Top Seed
                    </Badge>
                  )}
                </div>
              </div>
            ))}
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
                  className="flex items-center space-x-3 p-3 rounded-lg border bg-muted/50 opacity-60"
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
            <p>{tournament.currentParticipants} / {tournament.maxParticipants}</p>
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