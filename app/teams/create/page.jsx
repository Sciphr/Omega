'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Users, Crown } from 'lucide-react'
import { GAME_TEMPLATES } from '@/lib/types'
import Link from 'next/link'

export default function CreateTeamPage() {
  const { user, loading } = useAuthStore()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    game: '',
    maxMembers: 5,
    isPublic: false
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/teams/create')
    }
  }, [user, loading, router])

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

      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          game: formData.game,
          max_members: formData.maxMembers,
          is_public: formData.isPublic
        })
      })

      if (response.ok) {
        const { team } = await response.json()
        router.push(`/teams/${team.id}`)
      } else {
        const errorData = await response.json()
        console.error('Failed to create team:', errorData.error)
        alert('Failed to create team: ' + errorData.error)
      }
    } catch (error) {
      console.error('Error creating team:', error)
      alert('Failed to create team. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
        {/* Header */}
        <div className="mb-8">
          <Link href="/profile" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Link>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Create Team</h1>
              <p className="text-muted-foreground">Build your competitive team</p>
            </div>
          </div>
        </div>

        {/* Create Team Form */}
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <span>Team Details</span>
              </CardTitle>
              <CardDescription>
                Set up your team information and recruit members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Team Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Team Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter team name"
                    disabled={isSubmitting}
                    required
                  />
                </div>

                {/* Game */}
                <div className="space-y-2">
                  <Label htmlFor="game">Game *</Label>
                  <Select value={formData.game} onValueChange={(value) => handleInputChange('game', value)} disabled={isSubmitting}>
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

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe your team, playstyle, goals..."
                    rows={4}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Max Members */}
                <div className="space-y-2">
                  <Label htmlFor="maxMembers">Maximum Members</Label>
                  <Select 
                    value={formData.maxMembers.toString()} 
                    onValueChange={(value) => handleInputChange('maxMembers', parseInt(value))}
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

                {/* Public Team */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPublic"
                    checked={formData.isPublic}
                    onCheckedChange={(checked) => handleInputChange('isPublic', checked)}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="isPublic" className="text-sm">
                    Make this team public (others can find and request to join)
                  </Label>
                </div>

                {/* Submit Button */}
                <div className="flex space-x-4">
                  <Button type="submit" disabled={!formData.name || !formData.game || isSubmitting} className="flex-1">
                    {isSubmitting ? 'Creating Team...' : 'Create Team'}
                  </Button>
                  <Link href="/profile">
                    <Button type="button" variant="outline" disabled={isSubmitting}>
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}