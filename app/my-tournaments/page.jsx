'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Trophy, 
  Calendar, 
  Users, 
  Crown,
  User,
  Eye,
  Settings,
  ArrowLeft,
  Gamepad2
} from 'lucide-react'
import { GAME_TEMPLATES, TOURNAMENT_STATUS } from '@/lib/types'
import { useUserTournaments } from '@/hooks/use-profile-data'
import { TournamentsSkeleton } from '@/components/profile-skeletons'

export default function MyTournamentsPage() {
  const { user, loading } = useAuthStore()
  const router = useRouter()
  const { data: tournaments, isLoading } = useUserTournaments()

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/my-tournaments')
    }
  }, [user, loading, router])

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!loading && !user) {
    return null
  }

  // Filter for active tournaments only (not completed)
  const activeTournaments = tournaments?.filter(t => t.status !== 'completed') || []

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
                <Trophy className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">My Active Tournaments</h1>
                <p className="text-muted-foreground">
                  Tournaments you're currently participating in or managing
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <TournamentsSkeleton />
        ) : (
          <div className="space-y-6">
            {activeTournaments.length > 0 ? (
              activeTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No Active Tournaments</h3>
                  <p className="text-muted-foreground mb-6">
                    You're not currently participating in any active tournaments.
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Link href="/tournaments">
                      <Button>
                        <Eye className="h-4 w-4 mr-2" />
                        Browse Tournaments
                      </Button>
                    </Link>
                    <Link href="/create">
                      <Button variant="outline">
                        <Trophy className="h-4 w-4 mr-2" />
                        Create Tournament
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TournamentCard({ tournament }) {
  const gameTemplate = Object.values(GAME_TEMPLATES).find(g => g.id === tournament.game)
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'registration':
        return <Badge className="bg-green-500">Registration Open</Badge>
      case 'in_progress':
        return <Badge className="bg-blue-500">In Progress</Badge>
      case 'starting_soon':
        return <Badge className="bg-orange-500">Starting Soon</Badge>
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
        return <Badge variant="outline">{role}</Badge>
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Gamepad2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{tournament.name}</h3>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span className="flex items-center">
                    <Gamepad2 className="h-4 w-4 mr-1" />
                    {gameTemplate?.name || tournament.game}
                  </span>
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {tournament.participants?.length || 0} participants
                  </span>
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(tournament.start_date || tournament.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mb-3">
              {getStatusBadge(tournament.status)}
              {getRoleBadge(tournament.role)}
            </div>

            {tournament.description && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {tournament.description}
              </p>
            )}
          </div>

          <div className="flex space-x-2">
            <Link href={`/tournaments/${tournament.id}`}>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
            </Link>
            {tournament.role === 'creator' && (
              <Link href={`/tournaments/${tournament.id}/manage`}>
                <Button size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}