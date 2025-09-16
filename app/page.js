'use client'

import { useState, useEffect } from 'react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Trophy,
  Users,
  Gamepad2,
  Zap,
  Plus,
  Clock,
  Eye,
  Shield,
  Calendar,
  TrendingUp,
  Flame,
  Star
} from "lucide-react"
import { getGameDisplayName } from '@/lib/game-utils'
import { TournamentThumbnail } from '@/components/ui/tournament-image'

export default function Home() {
  const [featuredTournaments, setFeaturedTournaments] = useState([])
  const [activeTournaments, setActiveTournaments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    try {
      const response = await fetch('/api/tournaments')
      const result = await response.json()

      if (result.success) {
        const tournaments = result.tournaments

        // Featured tournaments (largest, most full, or in progress)
        const featured = tournaments
          .filter(t => t.status === 'registration' || t.status === 'in_progress')
          .sort((a, b) => {
            const aParticipants = a.participants?.[0]?.count || 0
            const bParticipants = b.participants?.[0]?.count || 0
            const aFillRate = aParticipants / (a.max_participants || 1)
            const bFillRate = bParticipants / (b.max_participants || 1)

            // Prioritize: in_progress > high fill rate > large tournaments
            if (a.status === 'in_progress' && b.status !== 'in_progress') return -1
            if (b.status === 'in_progress' && a.status !== 'in_progress') return 1
            if (Math.abs(aFillRate - bFillRate) > 0.1) return bFillRate - aFillRate
            return (b.max_participants || 0) - (a.max_participants || 0)
          })
          .slice(0, 3)

        // Active tournaments (recently created or with activity)
        const active = tournaments
          .filter(t => t.status === 'registration')
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 6)

        setFeaturedTournaments(featured)
        setActiveTournaments(active)
      }
    } catch (error) {
      console.error('Failed to fetch tournaments:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
        <div className="relative container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary/10 to-accent/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4 border border-primary/20">
              <Flame className="h-4 w-4" />
              <span>Live Tournament Platform</span>
              <Flame className="h-4 w-4" />
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
              COMPETE. <span className="text-primary">DOMINATE.</span> WIN.
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-6 leading-relaxed px-4">
              Join epic tournaments, climb the ranks, and prove your skills against the best players.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 px-4">
              <Link href="/tournaments" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto text-lg px-8 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg">
                  <Zap className="h-5 w-5 mr-2" />
                  Join Tournament
                </Button>
              </Link>
              <Link href="/create" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 border-2 hover:bg-primary/5">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Tournament
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Featured Tournaments */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2 flex items-center">
                <Star className="h-8 w-8 text-yellow-500 mr-3" />
                Featured Tournaments
              </h2>
              <p className="text-muted-foreground">High-stakes competitions and tournaments filling up fast</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/tournaments">
                View All
                <Eye className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <FeaturedTournamentSkeleton key={i} />
              ))}
            </div>
          ) : featuredTournaments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredTournaments.map((tournament) => (
                <FeaturedTournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center border-2 border-dashed">
              <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Featured Tournaments</h3>
              <p className="text-muted-foreground mb-6">Be the first to create an epic tournament!</p>
              <Link href="/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tournament
                </Button>
              </Link>
            </Card>
          )}
        </section>

        {/* Active Tournaments */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2 flex items-center">
                <TrendingUp className="h-8 w-8 text-green-500 mr-3" />
                Active Tournaments
              </h2>
              <p className="text-muted-foreground">Recently created tournaments looking for players</p>
            </div>
            <Link href="/tournaments?status=registration">
              <Button variant="outline">
                Join Now
                <Zap className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <TournamentSkeleton key={i} />
              ))}
            </div>
          ) : activeTournaments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTournaments.map((tournament) => (
                <ActiveTournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center border-2 border-dashed">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Tournaments</h3>
              <p className="text-muted-foreground mb-4">Create the first tournament and get the competition started!</p>
              <Link href="/create">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tournament
                </Button>
              </Link>
            </Card>
          )}
        </section>

        {/* Platform Features */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Built for Competitive Gaming</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to run professional tournaments with real-time features and game-specific tools
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Real-time Updates"
              description="Live bracket updates, instant scoring, and real-time participant tracking"
              gradient="from-blue-500 to-cyan-500"
            />
            <FeatureCard
              icon={<Gamepad2 className="h-6 w-6" />}
              title="Game Templates"
              description="Pre-configured setups for League of Legends, CS2, Valorant, and more"
              gradient="from-purple-500 to-pink-500"
            />
            <FeatureCard
              icon={<Trophy className="h-6 w-6" />}
              title="Tournament Formats"
              description="Single/double elimination, round robin, and custom bracket systems"
              gradient="from-amber-500 to-orange-500"
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Team Management"
              description="Individual and team tournaments with flexible participation options"
              gradient="from-green-500 to-emerald-500"
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Secure & Private"
              description="Password protection, admin controls, and dispute resolution"
              gradient="from-red-500 to-rose-500"
            />
            <FeatureCard
              icon={<Clock className="h-6 w-6" />}
              title="Smart Automation"
              description="Auto bracket generation, scheduling, and dropout handling"
              gradient="from-indigo-500 to-purple-500"
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <Card className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 border-2 border-primary/20">
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:40px_40px]" />
            <CardContent className="relative p-12">
              <div className="max-w-2xl mx-auto">
                <Trophy className="h-16 w-16 text-primary mx-auto mb-6" />
                <h2 className="text-3xl font-bold mb-4">Ready to Compete?</h2>
                <p className="text-xl text-muted-foreground mb-8">
                  Join thousands of players in epic tournaments. Create your tournament in under 2 minutes.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
                  <Link href="/create" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto text-lg px-8 bg-gradient-to-r from-primary to-accent">
                      <Plus className="h-5 w-5 mr-2" />
                      Create Tournament
                    </Button>
                  </Link>
                  <Link href="/tournaments" className="w-full sm:w-auto">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8">
                      <Users className="h-5 w-5 mr-2" />
                      Browse Tournaments
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

function FeaturedTournamentCard({ tournament }) {
  const currentParticipants = tournament.participants?.[0]?.count || 0
  const fillPercentage = (currentParticipants / tournament.max_participants) * 100

  const getStatusBadge = (status) => {
    switch (status) {
      case 'registration':
        return <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">Registration Open</Badge>
      case 'in_progress':
        return <Badge className="bg-gradient-to-r from-primary to-blue-600 text-white">Live</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Card className="group relative hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50 overflow-hidden bg-gradient-to-br from-background to-muted/30">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Tournament Image */}
      <TournamentThumbnail
        tournament={tournament}
        className="h-48 rounded-t-lg group-hover:scale-105 transition-transform duration-300"
        overlayContent={
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
              <Badge variant="outline" className="bg-black/70 border-white/30 text-white">
                {getGameDisplayName(tournament.game)}
              </Badge>
              <div className="flex items-center space-x-2">
                {tournament.password_hash && (
                  <Shield className="h-4 w-4 text-yellow-400" />
                )}
                {getStatusBadge(tournament.status)}
              </div>
            </div>
          </>
        }
      />

      <CardHeader className="relative pb-3">

        <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors leading-tight line-clamp-2">
          {tournament.name}
        </CardTitle>

        <CardDescription className="line-clamp-2 text-sm">
          {tournament.description || "Join this epic tournament and compete against skilled players!"}
        </CardDescription>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              Players
            </span>
            <span className="font-semibold">{currentParticipants}/{tournament.max_participants}</span>
          </div>
          <Progress value={fillPercentage} className="h-2" />
          <div className="text-xs text-muted-foreground text-center">
            {Math.round(fillPercentage)}% full
          </div>
        </div>

        {/* Tournament Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-1">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{tournament.format?.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{new Date(tournament.created_at).toLocaleDateString()}</span>
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
              <Button className="w-full bg-gradient-to-r from-primary to-accent" size="sm">
                Join
              </Button>
            </Link>
          )}

          {tournament.status === 'in_progress' && (
            <Link href={`/tournament/${tournament.id}`} className="flex-1">
              <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500" size="sm">
                <Clock className="h-4 w-4 mr-2" />
                Watch
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ActiveTournamentCard({ tournament }) {
  const currentParticipants = tournament.participants?.[0]?.count || 0

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border hover:border-primary/30 overflow-hidden">
      <TournamentThumbnail
        tournament={tournament}
        className="h-24 group-hover:scale-105 transition-transform duration-200"
        overlayContent={
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
              <Badge variant="outline" className="bg-black/70 border-white/30 text-white text-xs">
                {getGameDisplayName(tournament.game)}
              </Badge>
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs">Open</Badge>
            </div>
          </>
        }
      />

      <CardContent className="p-4">

        <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {tournament.name}
        </h3>

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <div className="flex items-center space-x-1">
            <Users className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{currentParticipants}/{tournament.max_participants}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Trophy className="h-3 w-3 flex-shrink-0" />
            <span className="capitalize truncate text-xs">{tournament.format?.replace('_', ' ')}</span>
          </div>
        </div>

        <div className="flex space-x-2">
          <Link href={`/tournament/${tournament.id}`} className="flex-1">
            <Button variant="outline" className="w-full h-8 text-xs">
              View
            </Button>
          </Link>
          <Link href={`/tournament/${tournament.id}/join`} className="flex-1">
            <Button className="w-full h-8 text-xs">
              Join
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function FeatureCard({ icon, title, description, gradient }) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/30">
      <CardContent className="p-6">
        <div className={`w-12 h-12 bg-gradient-to-r ${gradient} rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  )
}

function FeaturedTournamentSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
            <div className="w-16 h-5 bg-gray-200 rounded"></div>
          </div>
          <div className="w-20 h-5 bg-gray-200 rounded"></div>
        </div>
        <div className="w-3/4 h-6 bg-gray-200 rounded"></div>
        <div className="w-full h-4 bg-gray-200 rounded"></div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="w-full h-2 bg-gray-200 rounded"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="w-full h-4 bg-gray-200 rounded"></div>
          <div className="w-full h-4 bg-gray-200 rounded"></div>
        </div>
        <div className="flex space-x-2">
          <div className="flex-1 h-8 bg-gray-200 rounded"></div>
          <div className="flex-1 h-8 bg-gray-200 rounded"></div>
        </div>
      </CardContent>
    </Card>
  )
}

function TournamentSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gray-200 rounded"></div>
            <div className="w-12 h-4 bg-gray-200 rounded"></div>
          </div>
          <div className="w-12 h-4 bg-gray-200 rounded"></div>
        </div>
        <div className="w-3/4 h-4 bg-gray-200 rounded mb-3"></div>
        <div className="flex items-center justify-between mb-3">
          <div className="w-16 h-3 bg-gray-200 rounded"></div>
          <div className="w-16 h-3 bg-gray-200 rounded"></div>
        </div>
        <div className="flex space-x-2">
          <div className="flex-1 h-6 bg-gray-200 rounded"></div>
          <div className="flex-1 h-6 bg-gray-200 rounded"></div>
        </div>
      </CardContent>
    </Card>
  )
}