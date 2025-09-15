'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useRouter } from 'next/navigation'
import { useProfileData } from '@/hooks/use-profile-data'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
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
  Eye,
  Link as LinkIcon,
  Unlink,
  ExternalLink,
  Globe,
  Lock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { GAME_TEMPLATES, TOURNAMENT_STATUS } from '@/lib/types'
import { TournamentsSkeleton, GamesSkeleton, TeamsSkeleton, LinkedAccountsSkeleton } from '@/components/profile-skeletons'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'

export default function ProfilePage() {
  const { user, loading } = useAuthStore()
  const router = useRouter()
  const [showUnlinkModal, setShowUnlinkModal] = useState(null)
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)

  // Use React Query for data fetching
  const { tournaments, games, teams, linkedAccounts, isLoading: loadingData, error } = useProfileData()

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/profile')
    }
  }, [user, loading, router])

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])


  // Handle unauthenticated state silently (redirect will happen via useEffect)
  if (!loading && !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8">
          {loading || !user ? (
            <div className="flex items-center space-x-4 mb-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="ml-auto">
                <Skeleton className="h-9 w-28" />
              </div>
            </div>
          ) : (
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
                <Button variant="outline" onClick={() => setShowEditProfileModal(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Content */}
        <Tabs defaultValue="tournaments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
            <TabsTrigger value="games">Games</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="accounts">Linked Accounts</TabsTrigger>
          </TabsList>

          <TabsContent value="tournaments">
            <TournamentsTab tournaments={tournaments.data || []} loading={tournaments.isLoading} />
          </TabsContent>

          <TabsContent value="games">
            <GamesTab games={games.data || []} loading={games.isLoading} refetchGames={games.refetch} />
          </TabsContent>

          <TabsContent value="teams">
            <TeamsTab teams={teams.data || []} loading={teams.isLoading} />
          </TabsContent>

          <TabsContent value="accounts">
            <LinkedAccountsTab 
              linkedAccounts={linkedAccounts.data || []} 
              loading={linkedAccounts.isLoading}
              showUnlinkModal={showUnlinkModal}
              setShowUnlinkModal={setShowUnlinkModal}
              refetchLinkedAccounts={linkedAccounts.refetch}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Profile Modal */}
      <Dialog open={showEditProfileModal} onOpenChange={setShowEditProfileModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information and account settings
            </DialogDescription>
          </DialogHeader>
          <EditProfileForm 
            user={user} 
            onClose={() => setShowEditProfileModal(false)}
            onSuccess={() => {
              // You might want to refresh user data here
              setShowEditProfileModal(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EditProfileForm({ user, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    displayName: user?.user_metadata?.display_name || '',
    username: user?.user_metadata?.username || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notification, setNotification] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const { session } = useAuthStore.getState()
      if (!session?.access_token) {
        setNotification({ type: 'error', message: 'Authentication required' })
        return
      }

      // Validate password fields if user is trying to change password
      const isChangingPassword = formData.currentPassword || formData.newPassword || formData.confirmPassword
      if (isChangingPassword) {
        if (!formData.currentPassword) {
          setNotification({ type: 'error', message: 'Please enter your current password' })
          return
        }
        if (!formData.newPassword) {
          setNotification({ type: 'error', message: 'Please enter a new password' })
          return
        }
        if (formData.newPassword !== formData.confirmPassword) {
          setNotification({ type: 'error', message: 'New passwords do not match' })
          return
        }
        if (formData.newPassword.length < 6) {
          setNotification({ type: 'error', message: 'New password must be at least 6 characters long' })
          return
        }
      }

      // Update user data in Supabase Auth
      const updateData = {
        data: {
          display_name: formData.displayName,
          username: formData.username
        }
      }

      // Only include email if it's different from current email
      if (formData.email !== user.email) {
        updateData.email = formData.email
      }

      // Handle password change separately via API
      if (isChangingPassword) {
        const passwordResponse = await fetch('/api/user/change-password', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword
          })
        })

        const passwordResult = await passwordResponse.json()
        
        if (!passwordResponse.ok) {
          setNotification({ type: 'error', message: passwordResult.error || 'Failed to change password' })
          return
        }

        // Handle new session if provided
        if (passwordResult.newSession) {
          try {
            // Set the new session in Supabase
            const { error: setSessionError } = await supabase.auth.setSession(passwordResult.newSession)
            
            if (setSessionError) {
              console.warn('Could not set new session:', setSessionError)
            } else {
              console.log('New session set successfully after password change')
              // Update the auth store
              const { initialize } = useAuthStore.getState()
              await initialize()
            }
          } catch (sessionError) {
            console.warn('Session update failed:', sessionError)
          }
        }

        // If only changing password, skip other updates to avoid session conflicts
        const hasOtherChanges = formData.displayName !== (user?.user_metadata?.display_name || '') ||
                               formData.username !== (user?.user_metadata?.username || '') ||
                               formData.email !== user.email

        if (!hasOtherChanges) {
          setNotification({ type: 'success', message: 'Password updated successfully!' })
          setTimeout(() => {
            onSuccess()
          }, 1500)
          return
        }
      }

      // Only call updateUser if there are non-password fields to update
      if (Object.keys(updateData.data).length > 0 || updateData.email) {
        const { error: authError } = await supabase.auth.updateUser(updateData)
        
        if (authError) {
          console.error('Error updating user:', authError)
          setNotification({ type: 'error', message: 'Failed to update profile: ' + authError.message })
          return
        }
      }

      // Update the users table to keep data consistent (only if not password-only change)
      if (!isChangingPassword || (formData.displayName !== (user?.user_metadata?.display_name || '') ||
                                 formData.username !== (user?.user_metadata?.username || '') ||
                                 formData.email !== user.email)) {
        const profileResponse = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            display_name: formData.displayName,
            username: formData.username,
            email: formData.email
          })
        })

        if (!profileResponse.ok) {
          const errorData = await profileResponse.json()
          console.error('Error updating users table:', errorData)
          setNotification({ type: 'error', message: `Failed to update profile in users table: ${errorData.error}` })
          return
        }
      }

      if (formData.email !== user.email && isChangingPassword) {
        setNotification({ type: 'success', message: 'Profile updated successfully! Please check your email to verify your new email address. Your password has also been changed.' })
      } else if (formData.email !== user.email) {
        setNotification({ type: 'success', message: 'Profile updated successfully! Please check your email to verify your new email address.' })
      } else if (isChangingPassword) {
        setNotification({ type: 'success', message: 'Profile updated successfully! Your password has been changed.' })
      } else {
        setNotification({ type: 'success', message: 'Profile updated successfully!' })
      }

      setTimeout(() => {
        onSuccess()
      }, 1500)
    } catch (error) {
      console.error('Error updating profile:', error)
      setNotification({ type: 'error', message: 'Failed to update profile. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Notification */}
      {notification && (
        <div className={`p-3 rounded-md border ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <CheckCircle className="h-4 w-4 mr-2" />
            ) : (
              <AlertCircle className="h-4 w-4 mr-2" />
            )}
            <span className="text-sm">{notification.message}</span>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="displayName">Display Name</Label>
        <Input
          id="displayName"
          value={formData.displayName}
          onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
          placeholder="Enter your display name"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={formData.username}
          onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
          placeholder="Enter your username"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          placeholder="Enter your email"
          disabled={isSubmitting}
        />
      </div>


      {/* Password Change Section */}
      <div className="pt-4 border-t space-y-4">
        <div className="flex items-center space-x-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Change Password (Optional)</Label>
        </div>
        
        <div>
          <Label htmlFor="currentPassword">Current Password</Label>
          <Input
            id="currentPassword"
            type="password"
            value={formData.currentPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
            placeholder="Enter current password"
            disabled={isSubmitting}
          />
        </div>
        
        <div>
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            value={formData.newPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
            placeholder="Enter new password"
            disabled={isSubmitting}
          />
        </div>
        
        <div>
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            placeholder="Confirm new password"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="flex space-x-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function TournamentsTab({ tournaments, loading }) {
  if (loading) {
    return <TournamentsSkeleton />
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

function GamesTab({ games, loading, refetchGames }) {
  const [isAddingGame, setIsAddingGame] = useState(false)

  if (loading) {
    return <GamesSkeleton />
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Gamepad2 className="h-5 w-5 text-primary" />
              <span>My Games ({games?.length || 0})</span>
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
                <AddGameForm onClose={() => setIsAddingGame(false)} onSuccess={refetchGames} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {games?.length > 0 ? (
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
    return <TeamsSkeleton />
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
      <Link href={`/profile/teams/${team.id}`}>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
      </Link>
    </div>
  )
}

function AddGameForm({ onClose, onSuccess }) {
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
        // Refetch games data
        onSuccess?.()
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

// Platform configurations with proper brand colors and icons
const PLATFORMS = {
  discord: {
    name: 'Discord',
    color: 'bg-[#5865F2]', // Discord's official brand color
    iconType: 'svg',
    iconSvg: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0002 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9554 2.4189-2.1568 2.4189Z"/>
      </svg>
    ),
    description: 'Link your Discord account for community features and bot integration'
  }
}

function LinkedAccountsTab({ linkedAccounts, loading, showUnlinkModal, setShowUnlinkModal, refetchLinkedAccounts }) {
  if (loading) {
    return <LinkedAccountsSkeleton />
  }

  const handleLinkAccount = (platform) => {
    // Redirect to OAuth flow
    window.location.href = `/api/auth/link/${platform}`
  }

  const handleToggleVisibility = async (accountId, isPublic) => {
    try {
      const { session } = useAuthStore.getState()
      
      const response = await fetch('/api/user/linked-accounts', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId,
          is_public: isPublic
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Refetch linked accounts data
        refetchLinkedAccounts()
      } else {
        console.error('Failed to update visibility:', result.error)
        alert('Failed to update visibility settings')
      }
    } catch (error) {
      console.error('Error updating visibility:', error)
      alert('Failed to update visibility settings')
    }
  }

  const handleUnlinkAccount = async (accountId) => {
    try {
      const { session } = useAuthStore.getState()
      
      const response = await fetch(`/api/user/linked-accounts?id=${accountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Refetch linked accounts data
        refetchLinkedAccounts()
        setShowUnlinkModal(null)
        alert('Account unlinked successfully')
      } else {
        console.error('Failed to unlink account:', result.error)
        alert('Failed to unlink account')
      }
    } catch (error) {
      console.error('Error unlinking account:', error)
      alert('Failed to unlink account')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            <span>Gaming Account Links</span>
          </CardTitle>
          <CardDescription>
            Connect your gaming accounts to enhance your tournament experience and enable bot features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(PLATFORMS).map(([platformKey, platform]) => {
            const linkedAccount = linkedAccounts.find(account => account.platform === platformKey)
            
            return (
              <div key={platformKey} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`h-10 w-10 ${platform.color} rounded-lg flex items-center justify-center text-white`}>
                      {platform.iconSvg}
                    </div>
                    <div>
                      <div className="font-semibold flex items-center space-x-2">
                        <span>{platform.name}</span>
                        {linkedAccount && (
                          <Badge variant={linkedAccount.verified ? 'default' : 'secondary'}>
                            {linkedAccount.verified ? (
                              <><CheckCircle className="h-3 w-3 mr-1" /> Verified</>
                            ) : (
                              <><AlertCircle className="h-3 w-3 mr-1" /> Unverified</>
                            )}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm">
                        {linkedAccount ? (
                          <div className="flex items-center space-x-2">
                            <span className={platformKey === 'discord' ? 'font-mono text-[#5865F2] font-medium' : 'text-muted-foreground'}>
                              {linkedAccount.platform_username}
                            </span>
                            {platformKey === 'discord' && (
                              <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-xs text-green-600">Connected</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{platform.description}</span>
                        )}
                      </div>
                      {linkedAccount?.linked_at && (
                        <div className="text-xs text-muted-foreground">
                          Linked {new Date(linkedAccount.linked_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {linkedAccount ? (
                      <>
                        <div className="flex items-center space-x-2 text-sm">
                          <span>{linkedAccount.is_public ? 'Public' : 'Private'}</span>
                          <Switch
                            checked={linkedAccount.is_public}
                            onCheckedChange={(checked) => handleToggleVisibility(linkedAccount.id, checked)}
                            aria-label="Toggle visibility"
                          />
                          {linkedAccount.is_public ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowUnlinkModal(linkedAccount)}
                        >
                          <Unlink className="h-4 w-4 mr-2" />
                          Unlink
                        </Button>
                      </>
                    ) : (
                      <Button 
                        onClick={() => handleLinkAccount(platformKey)}
                        size="sm"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Link Account
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Unlink Confirmation Modal */}
      {showUnlinkModal && (
        <Dialog open={!!showUnlinkModal} onOpenChange={() => setShowUnlinkModal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unlink {PLATFORMS[showUnlinkModal.platform]?.name} Account</DialogTitle>
              <DialogDescription>
                Are you sure you want to unlink your {PLATFORMS[showUnlinkModal.platform]?.name} account 
                ({showUnlinkModal.platform_username})? This action cannot be undone and will disable any bot features that depend on this account.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setShowUnlinkModal(null)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleUnlinkAccount(showUnlinkModal.id)}
              >
                Unlink Account
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}