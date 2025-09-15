'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Users, Target, TrendingUp, Crown, Zap, Brain, HelpCircle } from 'lucide-react'
import { getGameDisplayName } from '@/lib/game-utils'

export function TeamAnalytics({ team, className = '' }) {
  if (!team || !team.stats) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Analytics
          </CardTitle>
          <CardDescription>
            Team performance metrics and synergy analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No team data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const stats = team.stats

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Analytics
        </CardTitle>
        <CardDescription>
          Performance metrics for {team.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-sm">Win Rate</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {Math.round(stats.win_rate || 0)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Overall team performance
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-sm">Team Rating</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>ELO-style rating starting at 1000. Increases with wins against higher-rated teams, decreases with losses. Higher rating = stronger team.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(stats.performance_rating || 1000)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Combined skill rating
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-4 w-4 text-purple-600" />
              <span className="font-semibold text-sm">Tournaments</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(stats.tournaments_won || 0)}/{Math.round(stats.tournaments_played || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Won / Played
            </p>
          </div>
        </div>

        {/* Team Chemistry */}
        <TeamChemistry members={team.member_details} stats={stats} />

        {/* Recent Performance */}
        <RecentPerformance stats={stats} />

        {/* Strengths & Areas for Improvement */}
        <TeamInsights team={team} />
      </CardContent>
    </Card>
  )
}

function TeamChemistry({ members, stats }) {
  if (!members || members.length === 0) {
    return null
  }

  const chemistryScore = stats.team_chemistry || calculateChemistryScore(stats)

  return (
    <div>
      <h4 className="text-sm font-medium text-muted-foreground mb-3">Team Chemistry</h4>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Chemistry</span>
              <span className="text-sm text-muted-foreground">{Math.round(chemistryScore || 0)}%</span>
            </div>
            <Progress value={chemistryScore} className="h-2" />
          </div>
          <div className="text-right">
            <div className={`font-bold ${getChemistryColor(chemistryScore)}`}>
              {getChemistryRating(chemistryScore)}
            </div>
            <div className="text-xs text-muted-foreground">Chemistry</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Communication</span>
            </div>
            <div className="text-lg font-bold text-blue-600">
              {Math.round(stats.communication_score || (chemistryScore || 0) * 0.9)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Based on match coordination
            </p>
          </div>

          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Synergy</span>
            </div>
            <div className="text-lg font-bold text-yellow-600">
              {Math.round(stats.synergy_score || (chemistryScore || 0) * 1.1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Performance boost when together
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function RecentPerformance({ stats }) {
  const trend = getPerformanceTrend(stats)

  return (
    <div>
      <h4 className="text-sm font-medium text-muted-foreground mb-3">Recent Performance</h4>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-2xl font-bold text-foreground">
            {stats.recent_wins || 0}
          </div>
          <div className="text-xs text-muted-foreground">Recent Wins</div>
        </div>

        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-2xl font-bold text-foreground">
            {stats.recent_losses || 0}
          </div>
          <div className="text-xs text-muted-foreground">Recent Losses</div>
        </div>

        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className={`text-2xl font-bold ${trend.color}`}>
            {trend.icon}
          </div>
          <div className="text-xs text-muted-foreground">Trend</div>
        </div>

        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-2xl font-bold text-foreground">
            {Math.round(stats.average_placement || 0) || 'N/A'}
          </div>
          <div className="text-xs text-muted-foreground">Avg Placement</div>
        </div>
      </div>
    </div>
  )
}

function TeamInsights({ team }) {
  const insights = generateTeamInsights(team)

  if (insights.length === 0) return null

  return (
    <div>
      <h4 className="text-sm font-medium text-muted-foreground mb-3">Team Insights</h4>

      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="mt-0.5">
              <insight.icon className={`h-4 w-4 ${insight.color}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{insight.title}</p>
              <p className="text-xs text-muted-foreground">{insight.description}</p>
            </div>
            {insight.badge && (
              <Badge variant="outline" className="text-xs">
                {insight.badge}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function calculateChemistryScore(stats) {
  // Calculate team chemistry based on various factors
  const winRate = stats.win_rate || 0
  const consistency = Math.max(0, 100 - (stats.performance_variance || 20))
  const experience = Math.min(100, (stats.tournaments_played || 0) * 10)

  return Math.round((winRate + consistency + experience) / 3)
}

function getChemistryColor(score) {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-blue-600'
  if (score >= 40) return 'text-yellow-600'
  return 'text-red-600'
}

function getChemistryRating(score) {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Average'
  return 'Needs Work'
}

function getPerformanceTrend(stats) {
  const recentWinRate = ((stats.recent_wins || 0) / Math.max(1, (stats.recent_wins || 0) + (stats.recent_losses || 0))) * 100
  const overallWinRate = stats.win_rate || 0

  const improvement = recentWinRate - overallWinRate

  if (improvement > 10) {
    return { icon: '📈', color: 'text-green-600', text: 'Improving' }
  }
  if (improvement < -10) {
    return { icon: '📉', color: 'text-red-600', text: 'Declining' }
  }
  return { icon: '➖', color: 'text-blue-600', text: 'Stable' }
}

function generateTeamInsights(team) {
  const insights = []
  const stats = team.stats

  // Win rate insights
  if (stats.win_rate >= 75) {
    insights.push({
      icon: TrendingUp,
      color: 'text-green-600',
      title: 'Dominant Performance',
      description: 'Your team maintains an exceptional win rate across tournaments.',
      badge: 'Elite'
    })
  }

  // Tournament experience
  if (stats.tournaments_played >= 10) {
    insights.push({
      icon: Crown,
      color: 'text-purple-600',
      title: 'Experienced Squad',
      description: 'Your team has extensive tournament experience.',
      badge: 'Veteran'
    })
  }

  // Team chemistry
  const chemistry = calculateChemistryScore(stats)
  if (chemistry >= 80) {
    insights.push({
      icon: Users,
      color: 'text-blue-600',
      title: 'Great Team Chemistry',
      description: 'Your team members work exceptionally well together.',
      badge: 'Synergy'
    })
  }

  // Consistency
  if (stats.performance_variance && stats.performance_variance < 15) {
    insights.push({
      icon: Target,
      color: 'text-indigo-600',
      title: 'Consistent Performance',
      description: 'Your team delivers reliable results across different tournaments.',
      badge: 'Reliable'
    })
  }

  // Improvement areas
  if (stats.win_rate < 40) {
    insights.push({
      icon: Brain,
      color: 'text-orange-600',
      title: 'Growth Opportunity',
      description: 'Focus on strategy and coordination to improve match outcomes.',
      badge: 'Developing'
    })
  }

  return insights
}