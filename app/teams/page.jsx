'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Trophy, Users, Star, Calendar } from 'lucide-react'
import { getGameDisplayName } from '@/lib/game-utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'

export default function TeamsDiscoveryPage() {
  const [teams, setTeams] = useState([])
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

  // Fetch teams with search/filter parameters
  const fetchTeams = async (params = {}) => {
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

      const response = await fetch(`/api/teams/search?${searchParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch teams')
      }

      const data = await response.json()
      if (data.success) {
        setTeams(data.teams || [])
        setPagination(data.pagination || pagination)
      } else {
        throw new Error(data.error || 'Failed to fetch teams')
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
      const response = await fetch('/api/teams/search', { method: 'POST' })
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
    fetchTeams()
    fetchAvailableGames()
  }, [])

  // Re-fetch when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchTeams({ page: '1' })
      setPagination(prev => ({ ...prev, page: 1 }))
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, selectedGame, sortBy, sortOrder])

  // Handle pagination
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }))
    fetchTeams({ page: newPage.toString() })
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

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <p className="text-red-600">Error loading teams: {error}</p>
          <Button onClick={() => fetchTeams()} className="mt-4">Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Discover Teams</h1>
        <p className="text-muted-foreground">Find competitive teams to watch, follow, or potentially join</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search teams by name or captain..."
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

      {/* Teams Grid */}
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
      ) : teams.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No teams found</h3>
          <p className="text-muted-foreground">Try adjusting your search criteria or filters</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {teams.map((team) => (
              <Card key={team.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link href={`/teams/${team.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{team.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mb-2">{getGameDisplayName(team.game)}</p>
                        <p className="text-sm text-muted-foreground">
                          Captain: {team.captain_name || 'Unknown'}
                        </p>
                      </div>
                      {team.performance_rating && (
                        <Badge className={getPerformanceColor(team.performance_rating)}>
                          {formatPerformanceRating(team.performance_rating)}
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
                        <span className="font-medium">{formatWinRate(team.win_rate)}</span>
                      </div>

                      <div className="flex justify-between items-center text-sm">
                        <span>Tournaments Won</span>
                        <span className="font-medium">{team.tournaments_won || 0}</span>
                      </div>

                      <div className="flex justify-between items-center text-sm">
                        <span>Tournaments Played</span>
                        <span className="font-medium">{team.tournaments_played || 0}</span>
                      </div>

                      {team.last_active && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Last Active
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(team.last_active).toLocaleDateString()}
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
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} teams)
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