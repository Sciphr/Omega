'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useRouter } from 'next/navigation'
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

export default function TeamPage({ params }) {
  const { user, loading } = useAuthStore()
  const router = useRouter()
  const [team, setTeam] = useState(null)
  const [loadingTeam, setLoadingTeam] = useState(true)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  // Fetch team data
  useEffect(() => {
    if (params.id) {
      fetchTeam()
    }
  }, [params.id])

  const fetchTeam = async () => {
    try {
      setLoadingTeam(true)
      const response = await fetch(`/api/teams/${params.id}`)
      
      if (response.ok) {
        const { team } = await response.json()
        setTeam(team)
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

  const isLeader = user && team && team.leader_id === user.id
  const isMember = team?.team_members?.some(member => member.user_id === user.id)
  const gameTemplate = Object.values(GAME_TEMPLATES).find(g => g.id === team?.game)

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
                    <Button size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Members
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {team.team_members?.map((member) => (
                    <MemberCard key={member.user_id} member={member} isLeader={isLeader} teamId={team.id} />
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

            {/* Actions */}
            {user && !isMember && team.is_public && (
              <Card>
                <CardHeader>
                  <CardTitle>Join Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Request to Join
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MemberCard({ member, isLeader, teamId }) {
  const isLeaderMember = member.role === 'leader'
  
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            {member.users?.user_metadata?.display_name?.charAt(0) ||
             member.users?.email?.charAt(0) ||
             'U'}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">
            {member.users?.user_metadata?.display_name || 
             member.users?.user_metadata?.username || 
             'User'}
          </p>
          <p className="text-sm text-muted-foreground">{member.users?.email}</p>
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
      </div>
    </div>
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
          rows={4}
          disabled={isSubmitting}
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
          Make this team public
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