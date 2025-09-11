import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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

// Mock tournament data - replace with actual API call
const mockTournaments = [
  {
    id: '1',
    name: 'Spring Championship 2024',
    game: 'league_of_legends',
    format: 'single_elimination',
    status: 'registration',
    currentParticipants: 12,
    maxParticipants: 16,
    creatorName: 'GameMaster',
    createdAt: '2024-01-15T10:00:00Z',
    isPublic: true,
    hasPassword: false,
    description: 'Competitive League of Legends tournament with prizes for top 3.'
  },
  {
    id: '2',
    name: 'Weekly Smash Bros',
    game: 'smash_bros',
    format: 'double_elimination',
    status: 'in_progress',
    currentParticipants: 32,
    maxParticipants: 32,
    creatorName: 'SmashPro',
    createdAt: '2024-01-14T15:30:00Z',
    isPublic: true,
    hasPassword: false,
    description: 'Weekly tournament for Smash Bros Ultimate players.'
  },
  {
    id: '3',
    name: 'CS2 Community Cup',
    game: 'cs2',
    format: 'single_elimination',
    status: 'registration',
    currentParticipants: 24,
    maxParticipants: 64,
    creatorName: 'CS_Admin',
    createdAt: '2024-01-13T20:00:00Z',
    isPublic: true,
    hasPassword: true,
    description: 'Team-based CS2 tournament for community members.'
  },
  {
    id: '4',
    name: 'Valorant Invitational',
    game: 'valorant',
    format: 'double_elimination',
    status: 'completed',
    currentParticipants: 16,
    maxParticipants: 16,
    creatorName: 'ValPro',
    createdAt: '2024-01-10T12:00:00Z',
    isPublic: true,
    hasPassword: false,
    description: 'Invite-only Valorant tournament with professional teams.'
  }
]

export default function TournamentsPage() {
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
                />
              </div>
              
              <Select>
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
              
              <Select>
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
              
              <Select>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockTournaments.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-8">
          <Button variant="outline" size="lg">
            Load More Tournaments
          </Button>
        </div>
      </div>
    </div>
  )
}

function TournamentCard({ tournament }) {
  const gameTemplate = GAME_TEMPLATES[tournament.game]
  
  const getStatusBadge = (status) => {
    switch (status) {
      case TOURNAMENT_STATUS.REGISTRATION:
        return <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">Registration Open</Badge>
      case TOURNAMENT_STATUS.IN_PROGRESS:
        return <Badge className="bg-gradient-to-r from-primary to-blue-600 text-white border-0">In Progress</Badge>
      case TOURNAMENT_STATUS.COMPLETED:
        return <Badge className="bg-gradient-to-r from-accent to-purple-600 text-white border-0">Completed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getProgressPercentage = () => {
    return (tournament.currentParticipants / tournament.maxParticipants) * 100
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
            {tournament.hasPassword && (
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
                {tournament.currentParticipants}/{tournament.maxParticipants}
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
            <span>by {tournament.creatorName}</span>
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(tournament.createdAt).toLocaleDateString()}
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
            
            {tournament.status === TOURNAMENT_STATUS.REGISTRATION && (
              <Link href={`/tournament/${tournament.id}/join`} className="flex-1">
                <Button className="w-full" size="sm">
                  Join
                </Button>
              </Link>
            )}
            
            {tournament.status === TOURNAMENT_STATUS.IN_PROGRESS && (
              <Link href={`/tournament/${tournament.id}`} className="flex-1">
                <Button className="w-full" size="sm">
                  <Clock className="h-4 w-4 mr-2" />
                  Watch
                </Button>
              </Link>
            )}
            
            {tournament.status === TOURNAMENT_STATUS.COMPLETED && (
              <Link href={`/tournament/${tournament.id}`} className="flex-1">
                <Button variant="secondary" className="w-full" size="sm">
                  <Trophy className="h-4 w-4 mr-2" />
                  Results
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}