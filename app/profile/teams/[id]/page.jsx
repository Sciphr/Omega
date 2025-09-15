'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ArrowLeft,
  Users,
  Crown,
  Edit3,
  Trash2,
  Settings,
  UserPlus,
  Shield,
  Calendar,
  Gamepad2
} from 'lucide-react'
import { GAME_TEMPLATES } from '@/lib/types'
import Link from 'next/link'

export default function ProfileTeamPage() {
  const { user, loading } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const [team, setTeam] = useState(null)
  const [loadingTeam, setLoadingTeam] = useState(true)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const teamId = params.id

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/profile')
    }
  }, [user, loading, router])

  // Fetch team data
  useEffect(() => {
    if (teamId && user) {
      fetchTeam()
    }
  }, [teamId, user])

  const fetchTeam = async () => {
    try {
      setLoadingTeam(true)
      const response = await fetch(`/api/teams/${teamId}`)

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setTeam(data.team)
        } else {
          setError('Failed to load team')
        }
      } else {
        setError('Team not found')
      }
    } catch (error) {
      console.error('Error fetching team:', error)
      setError('Failed to load team')
    } finally {
      setLoadingTeam(false)
    }
  }

  const isLeader = user && team && team.captain_id === user.id
  const isMember = team?.team_members?.some(member => member.user_id === user.id)
  const gameTemplate = Object.values(GAME_TEMPLATES).find(g => g.id === team?.game)

  // Redirect if user is not a member of this team
  useEffect(() => {
    if (team && user && !isLeader && !isMember) {
      router.push('/profile')
    }
  }, [team, user, isLeader, isMember, router])

  if (loading || loadingTeam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading team...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Team Not Found</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link href="/profile">
            <Button>Back to Profile</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!team) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/profile" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold">{team.name}</h1>
                  {team.is_public && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Public
                    </Badge>
                  )}
                  {!team.is_public && (
                    <Badge variant="outline">
                      Private
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-muted-foreground">
                  <span className="flex items-center">
                    <Gamepad2 className="h-4 w-4 mr-1" />
                    {gameTemplate?.name || team.game}
                  </span>
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {team.team_members?.length || 0}/{team.max_members} members
                  </span>
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Created {new Date(team.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {isLeader && (
              <div className="flex space-x-2">
                <Dialog open={isEditing} onOpenChange={setIsEditing}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Team
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Team</DialogTitle>
                      <DialogDescription>
                        Update your team information
                      </DialogDescription>
                    </DialogHeader>
                    <EditTeamForm team={team} onClose={() => setIsEditing(false)} onUpdate={setTeam} />
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Team Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Description */}
            {team.description && (
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{team.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Members */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Members ({team.team_members?.length || 0})</span>
                  </CardTitle>
                  {isLeader && (
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={() => setShowInviteModal(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite User
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowAddMemberModal(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Member
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {team.team_members?.map((member) => (
                    <MemberCard
                      key={member.id || member.user_id}
                      member={member}
                      isLeader={isLeader}
                      teamId={team.id}
                      team={team}
                      user={user}
                      onMemberRemoved={(memberId) => {
                        setTeam(prevTeam => ({
                          ...prevTeam,
                          team_members: prevTeam.team_members.filter(m => m.id !== memberId)
                        }))
                      }}
                    />
                  ))}

                  {!team.team_members?.length && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p>No members yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Team Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Team Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Members</span>
                  <span className="font-medium">{team.team_members?.length || 0}/{team.max_members}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Game</span>
                  <span className="font-medium">{gameTemplate?.name || team.game}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{new Date(team.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Visibility</span>
                  <span className="font-medium">{team.is_public ? 'Public' : 'Private'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Performance Stats */}
            {team.stats && (
              <Card>
                <CardHeader>
                  <CardTitle>Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Win Rate</span>
                    <span className="font-medium">{Math.round(team.stats.win_rate || 0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tournaments Won</span>
                    <span className="font-medium">{team.stats.tournaments_won || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tournaments Played</span>
                    <span className="font-medium">{team.stats.tournaments_played || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Performance Rating</span>
                    <span className="font-medium">{Math.round(team.stats.performance_rating || 1000)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Invite User Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Search for users by email or name to invite them to your team
            </DialogDescription>
          </DialogHeader>
          <InviteUserForm
            teamId={teamId}
            onClose={() => setShowInviteModal(false)}
            onSuccess={fetchTeam}
            team={team}
            user={user}
          />
        </DialogContent>
      </Dialog>

      {/* Add Member Modal */}
      <Dialog open={showAddMemberModal} onOpenChange={setShowAddMemberModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add someone to your team manually (they don't need an account)
            </DialogDescription>
          </DialogHeader>
          <AddMemberForm
            teamId={teamId}
            onClose={() => setShowAddMemberModal(false)}
            onSuccess={fetchTeam}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MemberCard({ member, isLeader, teamId, onMemberRemoved, team, user }) {
  const isLeaderMember = member.role === 'leader'
  const [isRemoving, setIsRemoving] = useState(false)

  const handleRemoveMember = async () => {
    if (!confirm(`Are you sure you want to remove ${member.display_name || 'this member'} from the team?`)) {
      return
    }

    setIsRemoving(true)
    try {
      const { session } = useAuthStore.getState()
      if (!session?.access_token) {
        alert('Authentication required')
        return
      }

      const response = await fetch(`/api/teams/${teamId}/members?member_id=${member.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        if (onMemberRemoved) {
          onMemberRemoved(member.id)
        }
      } else {
        const errorData = await response.json()
        alert('Failed to remove member: ' + errorData.error)
      }
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Failed to remove member. Please try again.')
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            {member.display_name?.charAt(0) ||
             member.email?.charAt(0) ||
             'U'}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">
            {member.display_name || 'User'}
          </p>
          <p className="text-sm text-muted-foreground">{member.email}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {isLeaderMember && (
          <Badge variant="secondary">
            <Crown className="h-3 w-3 mr-1" />
            Leader
          </Badge>
        )}
        <span className="text-sm text-muted-foreground">
          Joined {new Date(member.joined_at).toLocaleDateString()}
        </span>
        {isLeader && !isLeaderMember && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRemoveMember}
            disabled={isRemoving}
            className="ml-2"
          >
            {isRemoving ? (
              <div className="h-3 w-3 animate-spin border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

function InviteUserForm({ teamId, onClose, onSuccess, team, user }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const searchUsers = async (query) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (data.success) {
        // Filter out current user and existing team members
        const existingMemberIds = team?.team_members?.map(m => m.user_id) || []
        const filteredUsers = data.users.filter(searchUser =>
          searchUser.id !== user?.id && // Exclude current user
          !existingMemberIds.includes(searchUser.id) // Exclude existing members
        )
        setSearchResults(filteredUsers)
      } else {
        console.error('User search failed:', data.error)
        setSearchResults([])
      }
    } catch (error) {
      console.error('Error searching users:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleInvite = async () => {
    if (!selectedUser) return

    setIsSubmitting(true)
    try {
      const { session } = useAuthStore.getState()
      if (!session?.access_token) {
        alert('Authentication required')
        return
      }

      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
          is_registered: true
        })
      })

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        const errorData = await response.json()
        alert('Failed to invite user: ' + errorData.error)
      }
    } catch (error) {
      console.error('Error inviting user:', error)
      alert('Failed to invite user. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="search">Search Users</Label>
        <Input
          id="search"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            searchUsers(e.target.value)
          }}
          placeholder="Enter username, display name, or email..."
          disabled={isSubmitting}
        />
      </div>

      {isSearching && (
        <div className="text-center py-4">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {searchResults.map((user) => (
            <div
              key={user.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedUser?.id === user.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
              }`}
              onClick={() => setSelectedUser(user)}
            >
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {user.display_name?.charAt(0) || user.username?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {user.display_name || user.username}
                  </p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          No users found matching "{searchQuery}"
        </div>
      )}

      <div className="flex space-x-2">
        <Button
          onClick={handleInvite}
          disabled={!selectedUser || isSubmitting}
        >
          {isSubmitting ? 'Inviting...' : 'Invite User'}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function AddMemberForm({ teamId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    display_name: '',
    email: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const { session } = useAuthStore.getState()
      if (!session?.access_token) {
        alert('Authentication required')
        return
      }

      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          display_name: formData.display_name,
          email: formData.email || null,
          is_registered: false
        })
      })

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        const errorData = await response.json()
        alert('Failed to add member: ' + errorData.error)
      }
    } catch (error) {
      console.error('Error adding member:', error)
      alert('Failed to add member. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="displayName">Display Name *</Label>
        <Input
          id="displayName"
          value={formData.display_name}
          onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
          placeholder="Enter member's name"
          disabled={isSubmitting}
          required
        />
      </div>

      <div>
        <Label htmlFor="email">Email (optional)</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          placeholder="Enter member's email"
          disabled={isSubmitting}
        />
      </div>

      <div className="flex space-x-2">
        <Button type="submit" disabled={!formData.display_name || isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Member'}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function EditTeamForm({ team, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    name: team.name,
    description: team.description || '',
    max_members: team.max_members,
    is_public: team.is_public
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const { session } = useAuthStore.getState()
      if (!session?.access_token) {
        console.error('No auth token available')
        return
      }

      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const { team: updatedTeam } = await response.json()
        onUpdate(prevTeam => ({ ...prevTeam, ...updatedTeam }))
        onClose()
      } else {
        const errorData = await response.json()
        console.error('Failed to update team:', errorData.error)
        alert('Failed to update team: ' + errorData.error)
      }
    } catch (error) {
      console.error('Error updating team:', error)
      alert('Failed to update team. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Team Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          disabled={isSubmitting}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Tell people about your team..."
          disabled={isSubmitting}
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="maxMembers">Maximum Members</Label>
        <Select
          value={formData.max_members.toString()}
          onValueChange={(value) => setFormData(prev => ({ ...prev, max_members: parseInt(value) }))}
          disabled={isSubmitting}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map((num) => (
              <SelectItem key={num} value={num.toString()}>
                {num} members
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isPublic"
          checked={formData.is_public}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
          disabled={isSubmitting}
        />
        <Label htmlFor="isPublic" className="text-sm">
          Make this team public (visible in team discovery)
        </Label>
      </div>

      <div className="flex space-x-2">
        <Button type="submit" disabled={!formData.name || isSubmitting}>
          {isSubmitting ? 'Updating...' : 'Update Team'}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  )
}