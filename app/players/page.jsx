'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Trophy, Users, Star, Calendar, Target } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'

export default function PlayersDiscoveryPage() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGame, setSelectedGame] = useState('all')
  const [sortBy, setSortBy] = useState('performance_rating')
  const [sortOrder, setSortOrder] = useState('desc')
  const [availableGames, setAvailableGames] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })

  // Fetch players with search/filter parameters
  const fetchPlayers = async (params = {}) => {
    try {
      setLoading(true)
      const searchParams = new URLSearchParams({
        search: searchTerm,
        game: selectedGame === 'all' ? '' : selectedGame,
        sortBy,
        sortOrder,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...params
      })

      const response = await fetch(`/api/players/search?${searchParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch players')
      }

      const data = await response.json()
      if (data.success) {
        setPlayers(data.players || [])
        setPagination(data.pagination || pagination)
      } else {
        throw new Error(data.error || 'Failed to fetch players')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch available games for filtering
  const fetchAvailableGames = async () => {
    try {
      const response = await fetch('/api/players/search', { method: 'POST' })
      if (!response.ok) return

      const data = await response.json()
      if (data.success) {
        setAvailableGames(data.games || [])
      }
    } catch (err) {
      console.error('Failed to fetch games:', err)
    }
  }

  // Initial load
  useEffect(() => {
    fetchPlayers()
    fetchAvailableGames()
  }, [])

  // Re-fetch when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPlayers({ page: '1' })
      setPagination(prev => ({ ...prev, page: 1 }))
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, selectedGame, sortBy, sortOrder])

  // Handle pagination
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }))
    fetchPlayers({ page: newPage.toString() })
  }

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

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <p className="text-red-600">Error loading players: {error}</p>
          <Button onClick={() => fetchPlayers()} className="mt-4">Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Discover Players</h1>
        <p className="text-muted-foreground">Find competitive players and view their performance statistics</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search players by name or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Game Filter */}
          <Select value={selectedGame} onValueChange={setSelectedGame}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Games" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Games</SelectItem>
              {availableGames.map(game => (
                <SelectItem key={game} value={game}>{game}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort By */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="performance_rating">Performance Rating</SelectItem>
              <SelectItem value="win_rate">Win Rate</SelectItem>
              <SelectItem value="tournaments_won">Tournaments Won</SelectItem>
              <SelectItem value="kda_ratio">KDA Ratio</SelectItem>
              <SelectItem value="tournaments_played">Activity</SelectItem>
              <SelectItem value="last_active">Last Active</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Order */}
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Highest</SelectItem>
              <SelectItem value="asc">Lowest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Players Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No players found</h3>
          <p className="text-muted-foreground">Try adjusting your search criteria or filters</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {players.map((player) => (
              <Card key={`${player.user_id}-${player.game_id}`} className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link href={`/players/${player.user_id}?game=${player.game_id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {(player.display_name || player.username)?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{player.display_name || player.username}</CardTitle>
                            <p className="text-sm text-muted-foreground">{player.game_id}</p>
                          </div>
                        </div>
                        {player.game_profile && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm">{player.game_profile.display_name}</span>
                            {player.game_profile.rank && (
                              <Badge className={getRankColor(player.game_profile.rank)}>
                                {player.game_profile.rank}
                              </Badge>
                            )}
                          </div>
                        )}
                        {player.preferred_role && (
                          <p className="text-sm text-muted-foreground">
                            Role: {player.preferred_role}
                          </p>
                        )}
                      </div>
                      {player.performance_rating && (
                        <Badge className={getPerformanceColor(player.performance_rating)}>
                          {formatPerformanceRating(player.performance_rating)}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Performance Stats */}
                      <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-1">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          Win Rate
                        </span>
                        <span className="font-medium">{formatWinRate(player.win_rate)}</span>
                      </div>

                      <div className="flex justify-between items-center text-sm">
                        <span>KDA Ratio</span>
                        <span className="font-medium">{formatKDA(player.kda_ratio)}</span>
                      </div>

                      <div className="flex justify-between items-center text-sm">
                        <span>Tournaments Won</span>
                        <span className="font-medium">{player.tournaments_won || 0}</span>
                      </div>

                      <div className="flex justify-between items-center text-sm">
                        <span>Tournaments Played</span>
                        <span className="font-medium">{player.tournaments_played || 0}</span>
                      </div>

                      {player.last_active && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Last Active
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(player.last_active).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4">
              <Button
                variant="outline"
                disabled={!pagination.hasPrev}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                Previous
              </Button>

              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} players)
              </span>

              <Button
                variant="outline"
                disabled={!pagination.hasNext}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}