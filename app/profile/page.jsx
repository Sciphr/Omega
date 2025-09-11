'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  User, 
  Trophy, 
  Users, 
  Plus, 
  Edit3, 
  Trash2,
  Crown,
  Gamepad2,
  Calendar,
  Settings,
  Shield,
  Eye
} from 'lucide-react'
import { GAME_TEMPLATES, TOURNAMENT_STATUS } from '@/lib/types'

export default function ProfilePage() {
  const { user, loading } = useAuthStore()
  const router = useRouter()
  const [tournaments, setTournaments] = useState([])
  const [games, setGames] = useState([])
  const [teams, setTeams] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/profile')
    }
  }, [user, loading, router])

  // Fetch user data
  useEffect(() => {
    if (user) {
      fetchUserData()
    }
  }, [user])

  const fetchUserData = async () => {
    try {
      setLoadingData(true)
      
      // Get auth token
      const { session } = useAuthStore.getState()
      if (!session?.access_token) {
        console.error('No auth token available')
        return
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
      
      // Fetch tournaments, games, and teams in parallel
      const [tournamentsRes, gamesRes, teamsRes] = await Promise.all([
        fetch('/api/user/tournaments', { headers }),
        fetch('/api/user/games', { headers }),
        fetch('/api/teams', { headers })
      ])
      
      // Handle tournaments
      if (tournamentsRes.ok) {
        const tournamentsData = await tournamentsRes.json()
        setTournaments(tournamentsData.tournaments || [])
      } else {
        console.error('Failed to fetch tournaments:', await tournamentsRes.text())
      }
      
      // Handle games
      if (gamesRes.ok) {
        const gamesData = await gamesRes.json()
        // Transform to match component structure
        const transformedGames = gamesData.gameProfiles?.map(profile => ({
          id: profile.id,
          gameId: profile.game_id,
          displayName: profile.display_name,
          rank: profile.rank,
          notes: profile.notes
        })) || []
        setGames(transformedGames)
      } else {
        console.error('Failed to fetch games:', await gamesRes.text())
      }
      
      // Handle teams
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json()
        // Transform and combine led teams and member teams
        const allTeams = [
          ...(teamsData.ledTeams?.map(team => ({
            id: team.id,
            name: team.name,
            game: team.game,
            role: 'leader',
            members: team.team_members?.length || 0,
            created_at: team.created_at,
            description: team.description
          })) || []),
          ...(teamsData.memberTeams?.map(team => ({
            id: team.id,
            name: team.name,
            game: team.game,
            role: 'member',
            members: team.team_members?.length || 0,
            created_at: team.created_at,
            description: team.description
          })) || [])
        ]
        setTeams(allTeams)
      } else {
        console.error('Failed to fetch teams:', await teamsRes.text())
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                {user.user_metadata?.display_name || user.user_metadata?.username || 'User'}
              </h1>
              <p className="text-muted-foreground">{user.email}</p>
              <p className="text-sm text-muted-foreground">
                Member since {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="ml-auto">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <Tabs defaultValue="tournaments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
            <TabsTrigger value="games">Games</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="tournaments">
            <TournamentsTab tournaments={tournaments} loading={loadingData} />
          </TabsContent>

          <TabsContent value="games">
            <GamesTab games={games} loading={loadingData} />
          </TabsContent>

          <TabsContent value="teams">
            <TeamsTab teams={teams} loading={loadingData} />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function TournamentsTab({ tournaments, loading }) {
  if (loading) {
    return <div className="text-center py-8">Loading tournaments...</div>
  }

  const activeTournaments = tournaments.filter(t => t.status !== 'completed')
  const pastTournaments = tournaments.filter(t => t.status === 'completed')

  return (
    <div className="space-y-6">
      {/* Active Tournaments */}
      {activeTournaments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span>Active Tournaments ({activeTournaments.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {activeTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Tournaments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-muted-foreground" />
            <span>Tournament History ({pastTournaments.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pastTournaments.length > 0 ? (
            <div className="grid gap-4">
              {pastTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>No completed tournaments yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function GamesTab({ games, loading }) {
  const [isAddingGame, setIsAddingGame] = useState(false)

  if (loading) {
    return <div className="text-center py-8">Loading games...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Gamepad2 className="h-5 w-5 text-primary" />
              <span>My Games ({games.length})</span>
            </CardTitle>
            <Dialog open={isAddingGame} onOpenChange={setIsAddingGame}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Game
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Game Profile</DialogTitle>
                  <DialogDescription>
                    Add a game you play and set your display name and rank
                  </DialogDescription>
                </DialogHeader>
                <AddGameForm onClose={() => setIsAddingGame(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {games.length > 0 ? (
            <div className="grid gap-4">
              {games.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Gamepad2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>No games added yet</p>
              <p className="text-sm">Add games you play to show in tournaments</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TeamsTab({ teams, loading }) {
  if (loading) {
    return <div className="text-center py-8">Loading teams...</div>
  }

  const myTeams = teams.filter(t => t.role === 'leader')
  const memberTeams = teams.filter(t => t.role === 'member')

  return (
    <div className="space-y-6">
      {/* My Teams */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Crown className="h-5 w-5 text-primary" />
              <span>My Teams ({myTeams.length})</span>
            </CardTitle>
            <Link href="/teams/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {myTeams.length > 0 ? (
            <div className="grid gap-4">
              {myTeams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Crown className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>You haven't created any teams yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Teams I'm In */}
      {memberTeams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span>Teams I'm In ({memberTeams.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {memberTeams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SettingsTab({ user }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Manage your account preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} disabled />
          </div>
          <div>
            <Label htmlFor="displayName">Display Name</Label>
            <Input 
              id="displayName" 
              defaultValue={user.user_metadata?.display_name || ''} 
              placeholder="Enter display name"
            />
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  )
}

function TournamentCard({ tournament }) {
  const gameTemplate = Object.values(GAME_TEMPLATES).find(g => g.id === tournament.game)
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'registration':
        return <Badge className="bg-green-500">Registration</Badge>
      case 'in_progress':
        return <Badge className="bg-blue-500">In Progress</Badge>
      case 'completed':
        return <Badge className="bg-gray-500">Completed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRoleBadge = (role) => {
    switch (role) {
      case 'creator':
        return <Badge variant="secondary"><Crown className="h-3 w-3 mr-1" />Creator</Badge>
      case 'participant':
        return <Badge variant="outline"><User className="h-3 w-3 mr-1" />Participant</Badge>
      default:
        return null
    }
  }

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Gamepad2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-semibold">{tournament.name}</h3>
            {getStatusBadge(tournament.status)}
            {getRoleBadge(tournament.role)}
          </div>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>{gameTemplate?.name || tournament.game}</span>
            <span>{new Date(tournament.created_at).toLocaleDateString()}</span>
            {tournament.placement && (
              <Badge className="bg-yellow-500">#{tournament.placement}</Badge>
            )}
          </div>
        </div>
      </div>
      <Link href={`/tournament/${tournament.id}`}>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
      </Link>
    </div>
  )
}

function GameCard({ game }) {
  const gameTemplate = Object.values(GAME_TEMPLATES).find(g => g.id === game.gameId)
  
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Gamepad2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">{gameTemplate?.name || game.gameId}</h3>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>Display Name: {game.displayName}</span>
            {game.rank && <Badge variant="outline">{game.rank}</Badge>}
          </div>
        </div>
      </div>
      <div className="flex space-x-2">
        <Button variant="outline" size="sm">
          <Edit3 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function TeamCard({ team }) {
  const gameTemplate = Object.values(GAME_TEMPLATES).find(g => g.id === team.game)
  
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-semibold">{team.name}</h3>
            {team.role === 'leader' && (
              <Badge variant="secondary">
                <Crown className="h-3 w-3 mr-1" />
                Leader
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>{gameTemplate?.name || team.game}</span>
            <span>{team.members} members</span>
            <span>Created {new Date(team.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <Link href={`/teams/${team.id}`}>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
      </Link>
    </div>
  )
}

function AddGameForm({ onClose }) {
  const [selectedGame, setSelectedGame] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [rank, setRank] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Get auth token
      const { session } = useAuthStore.getState()
      if (!session?.access_token) {
        console.error('No auth token available')
        return
      }

      const response = await fetch('/api/user/games', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          game_id: selectedGame,
          display_name: displayName,
          rank: rank || null,
          notes: notes || null
        })
      })

      if (response.ok) {
        // Refresh the page data
        window.location.reload()
        onClose()
      } else {
        const errorData = await response.json()
        console.error('Failed to add game:', errorData.error)
        alert('Failed to add game: ' + errorData.error)
      }
    } catch (error) {
      console.error('Error adding game:', error)
      alert('Failed to add game. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="game">Game</Label>
        <Select value={selectedGame} onValueChange={setSelectedGame}>
          <SelectTrigger>
            <SelectValue placeholder="Select a game" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(GAME_TEMPLATES).map((game) => (
              <SelectItem key={game.id} value={game.id}>
                {game.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="displayName">Display Name</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your in-game name"
        />
      </div>
      
      <div>
        <Label htmlFor="rank">Rank (Optional)</Label>
        <Input
          id="rank"
          value={rank}
          onChange={(e) => setRank(e.target.value)}
          placeholder="Your current rank"
        />
      </div>
      
      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes"
        />
      </div>
      
      <div className="flex space-x-2">
        <Button type="submit" disabled={!selectedGame || !displayName || isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Game'}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  )
}