import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, Gamepad2, Zap, Shield, Clock } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Trophy className="h-4 w-4" />
            <span>Tournament Bracket Generator</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Create Epic
            <span className="text-primary"> Tournaments</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Generate professional tournament brackets, manage participants, and run competitions 
            with real-time updates and game-specific features.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/create">
              <Button size="lg" className="text-lg px-8">
                <Trophy className="h-5 w-5 mr-2" />
                Create Tournament
              </Button>
            </Link>
            <Link href="/tournaments">
              <Button size="lg" variant="outline" className="text-lg px-8">
                <Users className="h-5 w-5 mr-2" />
                Browse Tournaments
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Gamepad2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Game Templates</CardTitle>
              <CardDescription>
                Pre-configured setups for popular games including League of Legends, Smash Bros, CS2, and Valorant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">League of Legends</Badge>
                <Badge variant="secondary">Smash Bros</Badge>
                <Badge variant="secondary">CS2</Badge>
                <Badge variant="secondary">Valorant</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Real-time Updates</CardTitle>
              <CardDescription>
                Live bracket updates, draft/ban interfaces, and instant score reporting with real-time synchronization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Live bracket visualization
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Real-time score updates
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Draft/ban system
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Flexible Participation</CardTitle>
              <CardDescription>
                Support for individual players and teams, with options for public or private tournaments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm">Up to 128 participants</div>
                <div className="text-sm">Team management system</div>
                <div className="text-sm">Anonymous or registered users</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Tournament Formats</CardTitle>
              <CardDescription>
                Single and double elimination brackets with automatic advancement and comprehensive match management.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge variant="outline">Single Elimination</Badge>
                <Badge variant="outline">Double Elimination</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Secure & Private</CardTitle>
              <CardDescription>
                Optional password protection, dispute resolution system, and comprehensive admin controls.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm">Password protection</div>
                <div className="text-sm">Admin override capabilities</div>
                <div className="text-sm">Dispute resolution</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Smart Management</CardTitle>
              <CardDescription>
                Automated bracket generation, match scheduling, and intelligent handling of dropouts and no-shows.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm">Auto bracket generation</div>
                <div className="text-sm">Match scheduling</div>
                <div className="text-sm">Dropout handling</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to Get Started?</CardTitle>
              <CardDescription className="text-lg">
                Create your first tournament in under 2 minutes. No registration required.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              <Link href="/create">
                <Button size="lg" className="text-lg px-8">
                  <Trophy className="h-5 w-5 mr-2" />
                  Create Your Tournament Now
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
