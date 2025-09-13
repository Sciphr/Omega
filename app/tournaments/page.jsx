'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Trophy, 
  Users, 
  Calendar, 
  Search, 
  Filter, 
  Plus,
  Clock,
  Gamepad2,
  Shield,
  Eye
} from 'lucide-react'
import { GAME_TEMPLATES, TOURNAMENT_STATUS, TOURNAMENT_FORMAT } from '@/lib/types'

export default function TournamentsPage() {
  const searchParams = useSearchParams()
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    game: 'all',
    status: 'all',
    format: 'all'
  })

  // Set initial search from URL parameter
  useEffect(() => {
    const searchQuery = searchParams.get('search')
    if (searchQuery) {
      setFilters(prev => ({
        ...prev,
        search: searchQuery
      }))
    }
  }, [searchParams])

  // Fetch tournaments from API
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Build query parameters
        const params = new URLSearchParams()
        if (filters.search) params.append('search', filters.search)
        if (filters.game !== 'all') params.append('game', filters.game)
        if (filters.status !== 'all') params.append('status', filters.status)
        if (filters.format !== 'all') params.append('format', filters.format)
        
        const response = await fetch(`/api/tournaments?${params}`)
        const result = await response.json()
        
        if (result.success) {
          setTournaments(result.tournaments)
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError('Failed to load tournaments')
        console.error('Failed to fetch tournaments:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTournaments()
  }, [filters])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Tournaments</h1>
              <p className="text-muted-foreground">
                Discover and join active tournaments or create your own
              </p>
            </div>
            <Link href="/create">
              <Button size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Create Tournament
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search tournaments..." 
                  className="pl-9"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
              
              <Select value={filters.game} onValueChange={(value) => handleFilterChange('game', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Games" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Games</SelectItem>
                  {Object.values(GAME_TEMPLATES).map((game) => (
                    <SelectItem key={game.id} value={game.id}>
                      {game.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="registration">Registration Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filters.format} onValueChange={(value) => handleFilterChange('format', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Formats</SelectItem>
                  <SelectItem value="single_elimination">Single Elimination</SelectItem>
                  <SelectItem value="double_elimination">Double Elimination</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tournaments Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load Tournaments</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Tournaments Found</h3>
            <p className="text-muted-foreground mb-4">
              {filters.search || filters.game !== 'all' || filters.status !== 'all' || filters.format !== 'all'
                ? "Try adjusting your filters or create the first tournament!"
                : "Be the first to create a tournament!"
              }
            </p>
            <Link href="/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Tournament
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TournamentCard({ tournament }) {
  const [showStandings, setShowStandings] = useState(false)
  const gameTemplate = Object.values(GAME_TEMPLATES).find(g => g.id === tournament.game)
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'registration':
        return <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">Registration Open</Badge>
      case 'in_progress':
        return <Badge className="bg-gradient-to-r from-primary to-blue-600 text-white border-0">In Progress</Badge>
      case 'completed':
        return <Badge className="bg-gradient-to-r from-accent to-purple-600 text-white border-0">Completed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getProgressPercentage = () => {
    const current = tournament.participants?.[0]?.count || 0
    const max = tournament.max_participants || 1
    return (current / max) * 100
  }

  const getCurrentParticipants = () => {
    return tournament.participants?.[0]?.count || 0
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <Gamepad2 className="h-5 w-5 text-primary" />
            <Badge variant="outline">{gameTemplate?.name || tournament.game}</Badge>
          </div>
          <div className="flex items-center space-x-2">
            {tournament.password_hash && (
              <Shield className="h-4 w-4 text-yellow-600" title="Password Protected" />
            )}
            {getStatusBadge(tournament.status)}
          </div>
        </div>
        
        <CardTitle className="text-lg group-hover:text-primary transition-colors">
          {tournament.name}
        </CardTitle>
        
        <CardDescription className="line-clamp-2">
          {tournament.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Format and Participants */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">
                {tournament.format.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>
                {getCurrentParticipants()}/{tournament.max_participants}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>

          {/* Creator and Date */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>by {tournament.creator_name}</span>
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(tournament.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2 pt-2">
            <Link href={`/tournament/${tournament.id}`} className="flex-1">
              <Button variant="outline" className="w-full" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
            </Link>
            
            {tournament.status === 'registration' && (
              <Link href={`/tournament/${tournament.id}/join`} className="flex-1">
                <Button className="w-full" size="sm">
                  Join
                </Button>
              </Link>
            )}
            
            {tournament.status === 'in_progress' && (
              <Link href={`/tournament/${tournament.id}`} className="flex-1">
                <Button className="w-full" size="sm">
                  <Clock className="h-4 w-4 mr-2" />
                  Watch
                </Button>
              </Link>
            )}
            
            {tournament.status === 'completed' && (
              <Button 
                variant="secondary" 
                className="w-full flex-1" 
                size="sm"
                onClick={() => setShowStandings(true)}
              >
                <Trophy className="h-4 w-4 mr-2" />
                Results
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      {/* Standings Modal */}
      <Dialog open={showStandings} onOpenChange={setShowStandings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span>{tournament.name} - Final Results</span>
            </DialogTitle>
            <DialogDescription>
              Tournament standings and final rankings
            </DialogDescription>
          </DialogHeader>
          <StandingsContent tournament={tournament} />
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function StandingsContent({ tournament }) {
  const [standings, setStandings] = useState([])
  const [tournamentData, setTournamentData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (tournament.id) {
      fetchStandings()
    }
  }, [tournament.id])

  const fetchStandings = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/standings`)
      const result = await response.json()
      
      if (result.success) {
        setStandings(result.standings || [])
        setTournamentData(result.tournament || null)
      } else {
        console.error('Failed to fetch standings:', result.error)
      }
    } catch (error) {
      console.error('Error fetching standings:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 border rounded animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!standings.length) {
    return (
      <div className="text-center py-8">
        <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No participants found</p>
      </div>
    )
  }

  const isCompleted = tournamentData?.is_completed || false
  const hasScores = standings.some(s => s.score > 0)
  const hasMatches = standings.some(s => s.matches_won > 0 || s.matches_lost > 0)

  const getRankIcon = (position) => {
    switch (position) {
      case 1:
        return <div className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white text-sm font-bold">1</div>
      case 2:
        return <div className="w-6 h-6 bg-gradient-to-r from-gray-300 to-gray-500 rounded-full flex items-center justify-center text-white text-sm font-bold">2</div>
      case 3:
        return <div className="w-6 h-6 bg-gradient-to-r from-amber-600 to-amber-800 rounded-full flex items-center justify-center text-white text-sm font-bold">3</div>
      default:
        return <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-sm font-semibold">{position}</div>
    }
  }

  return (
    <div className="space-y-4">
      {/* Tournament Status Header */}
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="flex items-center space-x-2">
          <Trophy className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {isCompleted ? 'Final Results' : 'Current Participants'}
          </span>
        </div>
        {!isCompleted && (
          <Badge variant="outline" className="text-xs">
            In Progress
          </Badge>
        )}
      </div>

      {/* Standings List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {standings.map((standing, index) => (
          <div 
            key={standing.user_id || index} 
            className={`flex items-center justify-between p-3 border rounded-lg ${
              isCompleted && standing.final_position <= 3 
                ? 'bg-gradient-to-r from-primary/5 to-accent/5' 
                : 'hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center space-x-3">
              {getRankIcon(standing.final_position)}
              <div>
                <div className="flex items-center space-x-2">
                  <p className="font-medium">{standing.user_name}</p>
                  {standing.participant_type === 'manual' && (
                    <Badge variant="outline" className="text-xs">
                      Manual
                    </Badge>
                  )}
                </div>
                {hasScores && standing.score > 0 && (
                  <p className="text-sm text-muted-foreground">Score: {standing.score}</p>
                )}
                {!isCompleted && standing.seed && (
                  <p className="text-xs text-muted-foreground">Seed #{standing.seed}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              {standing.prize && (
                <Badge variant="secondary" className="mb-1">
                  {standing.prize}
                </Badge>
              )}
              {hasMatches && (standing.matches_won > 0 || standing.matches_lost > 0) && (
                <p className="text-sm text-muted-foreground">
                  {standing.matches_won}W - {standing.matches_lost}L
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}