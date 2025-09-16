'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Trophy,
  Calendar,
  Clock,
  Users,
  Target,
  TrendingUp,
  TrendingDown,
  Medal,
  Minus,
  CheckCircle,
  PlayCircle,
  Pause
} from 'lucide-react'
import { calculateRoundRobinStandings, generateFixturesDisplay } from '@/lib/round-robin-manager'

/**
 * Round Robin Tournament Visualization Component
 * Displays standings, fixtures, and results for round robin tournaments
 */
export function RoundRobinVisualization({
  tournament,
  matches = [],
  participants = [],
  groups = null,
  onMatchClick,
  currentUser,
  isAdmin = false,
  className = ''
}) {
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [activeTab, setActiveTab] = useState('standings')

  // Calculate standings for each group or overall tournament
  const standingsData = useMemo(() => {
    if (groups && groups.length > 0) {
      // Group-based round robin
      return groups.map(group => {
        const groupMatches = matches.filter(match => match.groupId === group.id)
        const groupStandings = calculateRoundRobinStandings(groupMatches, group.participants)
        return {
          group,
          standings: groupStandings,
          matches: groupMatches
        }
      })
    } else {
      // Single round robin
      const standings = calculateRoundRobinStandings(matches, participants)
      return [{
        group: null,
        standings,
        matches
      }]
    }
  }, [matches, participants, groups])

  // Generate fixtures organized by round
  const fixturesData = useMemo(() => {
    if (groups && groups.length > 0) {
      return groups.map(group => {
        const groupMatches = matches.filter(match => match.groupId === group.id)
        return {
          group,
          fixtures: generateFixturesDisplay(groupMatches)
        }
      })
    } else {
      return [{
        group: null,
        fixtures: generateFixturesDisplay(matches)
      }]
    }
  }, [matches, groups])

  const handleMatchClick = (match) => {
    setSelectedMatch(match)
    onMatchClick?.(match)
  }

  const handleDialogClose = () => {
    setSelectedMatch(null)
  }

  // Calculate overall tournament progress
  const completedMatches = matches.filter(m => m.status === 'completed' || m.status === 'forfeit').length
  const totalMatches = matches.length
  const progressPercentage = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0

  return (
    <div className={`w-full space-y-6 ${className}`}>
      {/* Tournament Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Round Robin Tournament
            <Badge variant="outline">
              {tournament?.roundRobinType || 'Round Robin'}
            </Badge>
          </CardTitle>
          <CardDescription>
            {groups && groups.length > 0
              ? `${groups.length} groups • ${participants.length} total participants`
              : `${participants.length} participants • Single round robin`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Tournament Progress</span>
                <span className="text-sm text-muted-foreground">
                  {completedMatches} / {totalMatches} matches completed
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {Math.round(progressPercentage)}%
              </div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="standings" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Standings
          </TabsTrigger>
          <TabsTrigger value="fixtures" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Fixtures
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Results
          </TabsTrigger>
        </TabsList>

        {/* Standings Tab */}
        <TabsContent value="standings" className="space-y-6">
          {standingsData.map((data, index) => (
            <StandingsTable
              key={index}
              group={data.group}
              standings={data.standings}
              isGrouped={groups && groups.length > 0}
            />
          ))}
        </TabsContent>

        {/* Fixtures Tab */}
        <TabsContent value="fixtures" className="space-y-6">
          {fixturesData.map((data, index) => (
            <FixturesDisplay
              key={index}
              group={data.group}
              fixtures={data.fixtures}
              onMatchClick={handleMatchClick}
              isGrouped={groups && groups.length > 0}
            />
          ))}
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          <ResultsGrid
            matches={matches.filter(m => m.status === 'completed')}
            groups={groups}
            onMatchClick={handleMatchClick}
          />
        </TabsContent>
      </Tabs>

      {/* Match Details Dialog */}
      {selectedMatch && (
        <MatchDetailsDialog
          match={selectedMatch}
          onClose={handleDialogClose}
          tournament={tournament}
        />
      )}
    </div>
  )
}

/**
 * Standings Table Component
 */
function StandingsTable({ group, standings, isGrouped }) {
  const getPositionColor = (position) => {
    if (position === 1) return 'text-yellow-600 bg-yellow-50'
    if (position === 2) return 'text-gray-600 bg-gray-50'
    if (position === 3) return 'text-amber-600 bg-amber-50'
    return 'text-muted-foreground'
  }

  const getPositionIcon = (position) => {
    if (position === 1) return <Trophy className="h-4 w-4" />
    if (position === 2) return <Medal className="h-4 w-4" />
    if (position === 3) return <Medal className="h-4 w-4" />
    return <span className="text-sm font-semibold">{position}</span>
  }

  const getFormIcon = (result) => {
    switch (result) {
      case 'W': return <div className="w-2 h-2 bg-green-500 rounded-full" />
      case 'L': return <div className="w-2 h-2 bg-red-500 rounded-full" />
      case 'D': return <div className="w-2 h-2 bg-yellow-500 rounded-full" />
      default: return <div className="w-2 h-2 bg-gray-300 rounded-full" />
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          {isGrouped ? `${group.name} Standings` : 'Tournament Standings'}
        </CardTitle>
        {isGrouped && (
          <CardDescription>
            Average Rating: {group.averageRating} • {group.participants.length} participants
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-medium">#</th>
                <th className="text-left py-2 px-4 font-medium">Participant</th>
                <th className="text-center py-2 px-2 font-medium">MP</th>
                <th className="text-center py-2 px-2 font-medium">W</th>
                <th className="text-center py-2 px-2 font-medium">D</th>
                <th className="text-center py-2 px-2 font-medium">L</th>
                <th className="text-center py-2 px-2 font-medium">GF</th>
                <th className="text-center py-2 px-2 font-medium">GA</th>
                <th className="text-center py-2 px-2 font-medium">GD</th>
                <th className="text-center py-2 px-2 font-medium">Pts</th>
                <th className="text-center py-2 px-4 font-medium">Form</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing) => (
                <tr key={standing.participant.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-2">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${getPositionColor(standing.position)}`}>
                      {getPositionIcon(standing.position)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium">
                      {standing.participant.name || standing.participant.participant_name || standing.participant.display_name}
                    </div>
                  </td>
                  <td className="text-center py-3 px-2">{standing.matches_played}</td>
                  <td className="text-center py-3 px-2 text-green-600 font-medium">{standing.wins}</td>
                  <td className="text-center py-3 px-2 text-yellow-600">{standing.draws}</td>
                  <td className="text-center py-3 px-2 text-red-600">{standing.losses}</td>
                  <td className="text-center py-3 px-2">{standing.goals_for}</td>
                  <td className="text-center py-3 px-2">{standing.goals_against}</td>
                  <td className="text-center py-3 px-2">
                    <span className={standing.goal_difference >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {standing.goal_difference > 0 ? '+' : ''}{standing.goal_difference}
                    </span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <div className="font-bold text-lg text-primary">{standing.points}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      {standing.form.slice(-5).map((result, index) => (
                        <div key={index} title={result === 'W' ? 'Win' : result === 'L' ? 'Loss' : 'Draw'}>
                          {getFormIcon(result)}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Fixtures Display Component
 */
function FixturesDisplay({ group, fixtures, onMatchClick, isGrouped }) {
  const rounds = Object.keys(fixtures).sort((a, b) => parseInt(a) - parseInt(b))

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          {isGrouped ? `${group.name} Fixtures` : 'Tournament Fixtures'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {rounds.map(roundNumber => {
            const round = fixtures[roundNumber]
            return (
              <div key={roundNumber}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-lg">Round {roundNumber}</h4>
                  <div className="text-sm text-muted-foreground">
                    {round.completed} / {round.total} completed
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {round.matches.map(match => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      onClick={() => onMatchClick(match)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Results Grid Component
 */
function ResultsGrid({ matches, groups, onMatchClick }) {
  const completedMatches = matches.filter(m => m.status === 'completed')

  if (completedMatches.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No completed matches yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Completed Matches</CardTitle>
        <CardDescription>{completedMatches.length} matches completed</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {completedMatches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              onClick={() => onMatchClick(match)}
              showResult={true}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Match Card Component
 */
function MatchCard({ match, onClick, showResult = false }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-blue-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />
      default:
        return <Pause className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'border-green-200 bg-green-50'
      case 'in_progress':
        return 'border-blue-200 bg-blue-50'
      case 'pending':
        return 'border-gray-200 bg-gray-50'
      default:
        return 'border-gray-200'
    }
  }

  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer hover:shadow-md transition-all ${getStatusColor(match.status)}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">
          Match {match.matchNumber}
        </span>
        <div className="flex items-center gap-1">
          {getStatusIcon(match.status)}
          <span className="text-xs capitalize">{match.status}</span>
        </div>
      </div>

      <div className="space-y-2">
        {/* Participant 1 */}
        <div className={`flex items-center justify-between p-2 rounded ${
          match.winner === match.participant1?.id ? 'bg-green-100 border border-green-300' : 'bg-white border'
        }`}>
          <span className="font-medium text-sm truncate">
            {match.participant1?.name || match.participant1?.participant_name || 'TBD'}
          </span>
          {match.status === 'completed' && (
            <div className={`px-2 py-1 rounded text-xs font-bold ${
              match.winner === match.participant1?.id ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'
            }`}>
              {match.participant1_score ?? 0}
            </div>
          )}
        </div>

        {/* VS */}
        <div className="text-center text-xs text-muted-foreground">vs</div>

        {/* Participant 2 */}
        <div className={`flex items-center justify-between p-2 rounded ${
          match.winner === match.participant2?.id ? 'bg-green-100 border border-green-300' : 'bg-white border'
        }`}>
          <span className="font-medium text-sm truncate">
            {match.participant2?.name || match.participant2?.participant_name || 'TBD'}
          </span>
          {match.status === 'completed' && (
            <div className={`px-2 py-1 rounded text-xs font-bold ${
              match.winner === match.participant2?.id ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'
            }`}>
              {match.participant2_score ?? 0}
            </div>
          )}
        </div>
      </div>

      {match.scheduled_time && (
        <div className="mt-3 text-xs text-muted-foreground text-center">
          {new Date(match.scheduled_time).toLocaleString()}
        </div>
      )}
    </div>
  )
}

/**
 * Match Details Dialog Component
 */
function MatchDetailsDialog({ match, onClose, tournament }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Match Details</DialogTitle>
          <DialogDescription>
            Round {match.roundNumber} • Match {match.matchNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {match.participant1?.name || match.participant1?.participant_name || 'TBD'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-center">
                  {match.participant1_score ?? '-'}
                </div>
                {match.winner && match.winner === match.participant1?.id && (
                  <Badge className="w-full justify-center mt-2">
                    Winner
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {match.participant2?.name || match.participant2?.participant_name || 'TBD'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-center">
                  {match.participant2_score ?? '-'}
                </div>
                {match.winner && match.winner === match.participant2?.id && (
                  <Badge className="w-full justify-center mt-2">
                    Winner
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Status:</span>
              <Badge variant="outline">
                {match.status || 'Pending'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Round:</span>
              <span>{match.roundNumber}</span>
            </div>
            {match.scheduled_time && (
              <div className="flex justify-between">
                <span className="font-medium">Scheduled:</span>
                <span>
                  {new Date(match.scheduled_time).toLocaleString()}
                </span>
              </div>
            )}
            {match.completed_at && (
              <div className="flex justify-between">
                <span className="font-medium">Completed:</span>
                <span>
                  {new Date(match.completed_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <Button
              variant="secondary"
              className="w-full"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}