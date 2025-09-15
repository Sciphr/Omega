'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Trophy, Users, Crown, Calendar, Activity, Target, TrendingUp, Star } from 'lucide-react'
import Link from 'next/link'
import { getGameDisplayName } from '@/lib/game-utils'
import { TeamAnalytics } from '@/components/analytics/team-analytics'

export default function TeamDetailPage() {
  const params = useParams()
  const teamId = params.id
  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (teamId) {
      fetchTeamDetails()
    }
  }, [teamId])

  const fetchTeamDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/teams/${teamId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch team details')
      }

      const data = await response.json()
      if (data.success) {
        setTeam(data.team)
      } else {
        throw new Error(data.error || 'Failed to fetch team details')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatPerformanceRating = (rating) => {
    if (!rating) return 'Unranked'
    return Math.round(rating).toLocaleString()
  }

  const formatWinRate = (winRate) => {
    if (!winRate) return '0%'
    return `${Math.round(winRate)}%`
  }

  const getPerformanceColor = (rating) => {
    if (!rating) return 'bg-gray-100 text-gray-600'
    if (rating >= 1400) return 'bg-yellow-100 text-yellow-800'
    if (rating >= 1200) return 'bg-green-100 text-green-800'
    if (rating >= 1000) return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-600'
  }

  const getRankColor = (rank) => {
    if (!rank) return 'bg-gray-100 text-gray-600'
    const lowerRank = rank.toLowerCase()
    if (lowerRank.includes('grandmaster') || lowerRank.includes('challenger')) return 'bg-red-100 text-red-800'
    if (lowerRank.includes('master') || lowerRank.includes('diamond')) return 'bg-purple-100 text-purple-800'
    if (lowerRank.includes('platinum') || lowerRank.includes('emerald')) return 'bg-green-100 text-green-800'
    if (lowerRank.includes('gold')) return 'bg-yellow-100 text-yellow-800'
    if (lowerRank.includes('silver')) return 'bg-gray-100 text-gray-800'
    return 'bg-blue-100 text-blue-800'
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-4 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-4 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <p className="text-red-600">Error loading team: {error}</p>
          <Button onClick={fetchTeamDetails} className="mt-4">Try Again</Button>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Team not found</h3>
          <p className="text-muted-foreground">The team you're looking for doesn't exist or has been removed.</p>
          <Link href="/teams">
            <Button className="mt-4">Back to Teams</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/teams" className="hover:text-foreground">Teams</Link>
          <span>/</span>
          <span>{team.name}</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{team.name}</h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              <span>{getGameDisplayName(team.game)}</span>
              <span>•</span>
              <span>Created {new Date(team.created_at).toLocaleDateString()}</span>
              {team.stats?.last_active && (
                <>
                  <span>•</span>
                  <span>Last active {new Date(team.stats.last_active).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
          {team.stats?.performance_rating && (
            <Badge className={`${getPerformanceColor(team.stats.performance_rating)} text-lg px-3 py-1`}>
              {formatPerformanceRating(team.stats.performance_rating)}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Team Analytics */}
          <TeamAnalytics team={team} />
          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members ({team.member_details?.length || 0})
              </CardTitle>
              <CardDescription>
                Current roster and their game profiles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {team.member_details?.map((member) => {
                  const isRegisteredUser = member.is_registered && member.user_id
                  const MemberCard = isRegisteredUser ?
                    ({ children }) => (
                      <Link href={`/players/${member.user_id}?game=${team.game}`} className="block">
                        {children}
                      </Link>
                    ) :
                    ({ children }) => <div>{children}</div>

                  return (
                    <MemberCard key={member.id}>
                      <div className={`flex items-center justify-between p-4 border rounded-lg ${isRegisteredUser ? 'hover:shadow-md transition-shadow cursor-pointer hover:border-primary/20' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {(member.display_name || member.username)?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${isRegisteredUser ? 'text-primary hover:underline' : ''}`}>
                                {member.display_name || member.username}
                              </span>
                              {member.id === team.captain_id && (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Captain
                                </Badge>
                              )}
                              {!isRegisteredUser && (
                                <Badge variant="outline" className="text-xs">
                                  Guest
                                </Badge>
                              )}
                            </div>
                            {member.game_profile && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{member.game_profile.display_name}</span>
                                {member.game_profile.rank && (
                                  <Badge className={getRankColor(member.game_profile.rank)}>
                                    {member.game_profile.rank}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          {member.player_stats ? (
                            <>
                              <div className="font-medium">
                                {formatPerformanceRating(member.player_stats.performance_rating)}
                              </div>
                              <div className="text-muted-foreground">
                                {formatWinRate(member.player_stats.win_rate)} WR
                              </div>
                            </>
                          ) : (
                            <div className="text-muted-foreground">
                              {isRegisteredUser ? 'No stats' : 'Guest member'}
                            </div>
                          )}
                        </div>
                      </div>
                    </MemberCard>
                  )
                })}
                {(!team.member_details || team.member_details.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="mx-auto h-8 w-8 mb-2" />
                    <p>No member information available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tournament History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Tournament History
              </CardTitle>
              <CardDescription>
                Recent tournament performances and results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {team.tournament_results && team.tournament_results.length > 0 ? (
                <div className="space-y-3">
                  {team.tournament_results.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{result.tournament_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(result.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          {result.placement === 1 && <Trophy className="h-4 w-4 text-yellow-500" />}
                          <span className="font-medium">
                            {result.placement ? `#${result.placement}` : 'TBD'}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {result.wins}W - {result.losses}L
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="mx-auto h-8 w-8 mb-2" />
                  <p>No tournament history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Performance Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {team.stats ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Win Rate</span>
                    <span className="font-bold text-lg">{formatWinRate(team.stats.win_rate)}</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Tournaments Won</span>
                    <span className="font-medium">{team.stats.tournaments_won || 0}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Tournaments Played</span>
                    <span className="font-medium">{team.stats.tournaments_played || 0}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Wins</span>
                    <span className="font-medium">{team.stats.total_wins || 0}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Losses</span>
                    <span className="font-medium">{team.stats.total_losses || 0}</span>
                  </div>

                  {team.stats.average_placement && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Avg. Placement</span>
                      <span className="font-medium">#{Math.round(team.stats.average_placement)}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Target className="mx-auto h-6 w-6 mb-2" />
                  <p className="text-sm">No performance data yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Team Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Captain</div>
                <div className="font-medium">{team.captain_name || 'Unknown'}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Game</div>
                <div className="font-medium">{getGameDisplayName(team.game)}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Team Size</div>
                <div className="font-medium">{team.member_details?.length || 0} / {team.max_members || 5}</div>
              </div>

              {team.description && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Description</div>
                  <div className="text-sm">{team.description}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}