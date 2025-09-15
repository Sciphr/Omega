'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Users, Crown, Calendar, Settings, Trash2 } from 'lucide-react'

export default function ProfileTeamsPage() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [error, setError] = useState(null)
  const router = useRouter()
  const { user, loading: authLoading } = useAuthStore()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/profile/teams')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadTeams()
    }
  }, [user])

  const loadTeams = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/teams')
      const result = await response.json()

      if (result.success) {
        setTeams(result.teams)
      } else {
        setError(result.error)
      }
    } catch (error) {
      console.error('Failed to load teams:', error)
      setError('Failed to load teams')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async (e) => {
    e.preventDefault()

    if (!teamName.trim()) return

    try {
      setCreating(true)
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: teamName.trim()
        })
      })

      const result = await response.json()

      if (result.success) {
        setTeams(prev => [result.team, ...prev])
        setShowCreateModal(false)
        setTeamName('')
      } else {
        setError(result.error)
      }
    } catch (error) {
      console.error('Failed to create team:', error)
      setError('Failed to create team')
    } finally {
      setCreating(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading teams...</div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Teams</h1>
            <p className="text-gray-600 mt-2">
              Manage your teams and prepare for team tournaments
            </p>
          </div>

          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogDescription>
                  Create a team to participate in team tournaments
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div>
                  <Label htmlFor="teamName">Team Name</Label>
                  <Input
                    id="teamName"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Enter team name"
                    required
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button type="submit" disabled={creating}>
                    {creating ? 'Creating...' : 'Create Team'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Teams Grid */}
        {teams.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No teams yet</h3>
                <p className="text-gray-500 mb-6">
                  Create your first team to participate in team tournaments
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Team
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Card key={team.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    {team.captain_id === user.id && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        <Crown className="h-3 w-3 mr-1" />
                        Captain
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    Created {new Date(team.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {/* Members */}
                    <div>
                      <div className="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <Users className="h-4 w-4 mr-1" />
                        Members ({team.member_details?.length || 0})
                      </div>
                      <div className="space-y-1">
                        {team.member_details?.map((member) => (
                          <div key={member.id} className="flex items-center text-sm">
                            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium mr-2">
                              {member.display_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <span>{member.display_name || member.username}</span>
                            {member.id === team.captain_id && (
                              <Crown className="h-3 w-3 ml-1 text-yellow-500" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2 pt-2">
                      {team.captain_id === user.id ? (
                        <>
                          <Button variant="outline" size="sm" className="flex-1">
                            <Settings className="h-4 w-4 mr-1" />
                            Manage
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" className="flex-1">
                          <Calendar className="h-4 w-4 mr-1" />
                          View Team
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}