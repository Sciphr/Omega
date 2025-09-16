'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Trophy, Users, Crown, Calendar, Activity, Target, TrendingUp, Star, Gamepad2 } from 'lucide-react'
import Link from 'next/link'
import { getGameDisplayName } from '@/lib/game-utils'
import { AdvancedStats } from '@/components/analytics/advanced-stats'
import { GameSelector, GameSelectorHeader, useGameSelection } from '@/components/game-selector'

export default function PlayerProfilePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const playerId = params.id
  const initialGameId = searchParams.get('game')
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedGame, setSelectedGame] = useState(initialGameId)
  const [allPlayerData, setAllPlayerData] = useState(null)

  useEffect(() => {
    if (playerId) {
      fetchPlayerProfile()
    }
  }, [playerId])

  // Handle game selection change
  const handleGameChange = (game) => {
    setSelectedGame(game)
  }

  const fetchPlayerProfile = async () => {
    try {
      setLoading(true)
      // Always fetch all player data without game filter
      const response = await fetch(`/api/players/${playerId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch player profile')
      }

      const data = await response.json()
      if (data.success) {
        setAllPlayerData(data.player)
        setPlayer(data.player) // Set initial player data
      } else {
        throw new Error(data.error || 'Failed to fetch player profile')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter player data based on selected game
  const getFilteredPlayerData = () => {
    if (!allPlayerData) return null

    if (!selectedGame) {
      // Return overall/combined stats
      return allPlayerData
    }

    // Filter data for specific game
    const filteredData = { ...allPlayerData }

    // Filter game profiles
    if (filteredData.game_profiles) {
      const gameProfile = filteredData.game_profiles.find(p => p.game_id === selectedGame)
      filteredData.game_profile = gameProfile
      filteredData.current_game = selectedGame
    }

    // Filter tournament results for specific game
    if (filteredData.tournament_results) {
      filteredData.tournament_results = filteredData.tournament_results.filter(
        result => result.game === selectedGame
      )
    }

    // Filter stats for specific game if available
    if (filteredData.game_stats && filteredData.game_stats[selectedGame]) {
      filteredData.stats = filteredData.game_stats[selectedGame]
    }

    return filteredData
  }

  // Get the displayed player data
  const displayedPlayer = getFilteredPlayerData()

  const formatPerformanceRating = (rating) => {
    if (!rating) return 'Unranked'
    return Math.round(rating).toLocaleString()
  }

  const formatWinRate = (winRate) => {
    if (!winRate) return '0%'
    return `${Math.round(winRate)}%`
  }

  const formatKDA = (kda) => {
    if (!kda) return '0.00'
    return Number(kda).toFixed(2)
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
          <p className="text-red-600">Error loading player: {error}</p>
          <Button onClick={fetchPlayerProfile} className="mt-4">Try Again</Button>
        </div>
      </div>
    )
  }

  if (!displayedPlayer) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Player not found</h3>
          <p className="text-muted-foreground">The player you're looking for doesn't exist or has been removed.</p>
          <Link href="/players">
            <Button className="mt-4">Back to Players</Button>
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
          <Link href="/players" className="hover:text-foreground">Players</Link>
          <span>/</span>
          <span>{displayedPlayer.display_name || displayedPlayer.username}</span>
        </div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {(displayedPlayer.display_name || displayedPlayer.username)?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex flex-col justify-center h-20">
              <h1 className="text-3xl font-bold">{displayedPlayer.display_name || displayedPlayer.username}</h1>
              {(displayedPlayer.current_game || displayedPlayer.stats?.last_active) && (
                <div className="flex items-center gap-4 text-muted-foreground mt-1">
                  {displayedPlayer.current_game && (
                    <>
                      <span className="flex items-center gap-1">
                        <Gamepad2 className="h-4 w-4" />
                        {getGameDisplayName(displayedPlayer.current_game)}
                      </span>
                      <span>•</span>
                    </>
                  )}
                  {displayedPlayer.game_profile?.display_name && (
                    <>
                      <span>{displayedPlayer.game_profile.display_name}</span>
                      <span>•</span>
                    </>
                  )}
                  {displayedPlayer.stats?.last_active && (
                    <span>Last active {new Date(displayedPlayer.stats.last_active).toLocaleDateString()}</span>
                  )}
                </div>
              )}
              {displayedPlayer.game_profile?.rank && (
                <div className="mt-1">
                  <Badge className={getRankColor(displayedPlayer.game_profile.rank)}>
                    {displayedPlayer.game_profile.rank}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          {displayedPlayer.stats?.performance_rating && (
            <Badge className={`${getPerformanceColor(displayedPlayer.stats.performance_rating)} text-lg px-3 py-1`}>
              {formatPerformanceRating(displayedPlayer.stats.performance_rating)}
            </Badge>
          )}
        </div>
      </div>

      {/* Game Selector */}
      <div className="mb-6">
        <GameSelectorHeader
          currentGame={selectedGame}
          playerName={displayedPlayer.display_name || displayedPlayer.username}
          onGameChange={handleGameChange}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Advanced Analytics */}
          <AdvancedStats
            gameId={selectedGame || displayedPlayer.current_game || 'default'}
            playerStats={displayedPlayer.advanced_stats || displayedPlayer.stats}
          />
          {/* Game Profiles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5" />
                Game Profiles
              </CardTitle>
              <CardDescription>
                Player rankings and profiles across different games
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayedPlayer.game_profiles?.map((profile) => (
                  <div key={profile.game_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Gamepad2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{getGameDisplayName(profile.game_id)}</div>
                        <div className="text-sm text-muted-foreground">
                          {profile.display_name}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {profile.rank && (
                        <Badge className={getRankColor(profile.rank)}>
                          {profile.rank}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {(!player.game_profiles || player.game_profiles.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gamepad2 className="mx-auto h-8 w-8 mb-2" />
                    <p>No game profiles available</p>
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
              {displayedPlayer.tournament_results && displayedPlayer.tournament_results.length > 0 ? (
                <div className="space-y-3">
                  {displayedPlayer.tournament_results.map((result) => (
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
                          {result.kills}K/{result.deaths}D/{result.assists}A
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

          {/* Teams */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Teams
              </CardTitle>
              <CardDescription>
                Teams this player is a member of
              </CardDescription>
            </CardHeader>
            <CardContent>
              {displayedPlayer.teams && displayedPlayer.teams.length > 0 ? (
                <div className="space-y-3">
                  {displayedPlayer.teams.map((team) => (
                    <Link key={team.id} href={`/teams/${team.id}`} className="block">
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-shadow cursor-pointer hover:border-primary/20">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-primary hover:underline">
                                {team.name}
                              </span>
                              {team.is_captain && (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Captain
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {getGameDisplayName(team.game)} • Joined {new Date(team.joined_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {team.role}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="mx-auto h-8 w-8 mb-2" />
                  <p>Not a member of any public teams</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Game Filter */}
          <GameSelector
            currentGame={selectedGame}
            variant="tabs"
            onGameChange={handleGameChange}
            clientSideOnly={true}
            className="sticky top-4"
          />

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {displayedPlayer.stats ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Account Created</span>
                    <span className="font-medium text-sm">{new Date(displayedPlayer.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Preferred Role</span>
                    <span className="font-medium text-sm">{displayedPlayer.preferred_role || 'Not set'}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Teams Joined</span>
                    <span className="font-medium">{displayedPlayer.teams?.length || 0}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Games Played</span>
                    <span className="font-medium">{displayedPlayer.game_profiles?.length || 0}</span>
                  </div>

                  {displayedPlayer.stats.average_placement && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Avg. Placement</span>
                      <span className="font-medium">#{Math.round(displayedPlayer.stats.average_placement)}</span>
                    </div>
                  )}

                  {displayedPlayer.stats.mvp_awards && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm">MVP Awards</span>
                      <span className="font-medium">{displayedPlayer.stats.mvp_awards}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Target className="mx-auto h-6 w-6 mb-2" />
                  <p className="text-sm">No stats available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Player Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Player Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Username</div>
                <div className="font-medium">{player.username}</div>
              </div>

              {player.display_name && player.display_name !== player.username && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Display Name</div>
                  <div className="font-medium">{player.display_name}</div>
                </div>
              )}

              {player.stats?.preferred_role && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Preferred Role</div>
                  <div className="font-medium">{player.stats.preferred_role}</div>
                </div>
              )}

              {player.stats?.favorite_champions && player.stats.favorite_champions.length > 0 && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Favorite Champions</div>
                  <div className="flex flex-wrap gap-1">
                    {player.stats.favorite_champions.slice(0, 5).map((champion, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {champion}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}