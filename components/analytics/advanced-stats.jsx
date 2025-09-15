'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import {
  getGameStatsConfig,
  getStatsByCategory,
  getPrimaryStats,
  getAvailableCategories,
  formatStatValue,
  getStatConfig,
  STAT_CATEGORIES
} from '@/lib/game-stats'
import { TrendingUp, TrendingDown, Minus, BarChart3, Target, Users, Brain, Zap, HelpCircle } from 'lucide-react'

const categoryIcons = {
  [STAT_CATEGORIES.COMBAT]: Target,
  [STAT_CATEGORIES.PERFORMANCE]: BarChart3,
  [STAT_CATEGORIES.TEAM]: Users,
  [STAT_CATEGORIES.STRATEGIC]: Brain,
  [STAT_CATEGORIES.CONSISTENCY]: Zap
}

const categoryNames = {
  [STAT_CATEGORIES.COMBAT]: 'Combat',
  [STAT_CATEGORIES.PERFORMANCE]: 'Performance',
  [STAT_CATEGORIES.TEAM]: 'Teamplay',
  [STAT_CATEGORIES.STRATEGIC]: 'Strategic',
  [STAT_CATEGORIES.CONSISTENCY]: 'Consistency'
}

export function AdvancedStats({ gameId, playerStats, className = '' }) {
  const [selectedCategory, setSelectedCategory] = useState(null)
  const config = getGameStatsConfig(gameId)
  const availableCategories = getAvailableCategories(gameId)
  const primaryStats = getPrimaryStats(gameId)

  if (!playerStats || Object.keys(playerStats).length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Advanced Analytics
          </CardTitle>
          <CardDescription>
            Detailed performance metrics for {config.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No match data available</p>
            <p className="text-sm">Play some tournaments to see detailed analytics</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Advanced Analytics
        </CardTitle>
        <CardDescription>
          Detailed performance metrics for {config.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Stats Overview */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Key Performance Indicators</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {primaryStats.map(statKey => {
              const statConfig = getStatConfig(gameId, statKey)
              const value = playerStats[statKey]

              if (!statConfig) return null

              return (
                <div key={statKey} className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{statConfig.icon}</span>
                    <span className="font-semibold text-sm">{statConfig.name}</span>
                    {statKey === 'performance_rating' && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>ELO-style rating starting at 1000. Increases with wins against higher-rated opponents, decreases with losses. Higher rating = stronger player.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    {statConfig.format(value)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {statConfig.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Detailed Stats by Category */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-sm font-medium text-muted-foreground">Detailed Breakdown</h4>
            <div className="flex-1 h-px bg-border"></div>
          </div>

          <Tabs defaultValue={availableCategories[0]} className="w-full">
            <TabsList className="grid w-full grid-cols-5 lg:grid-cols-auto">
              {availableCategories.map(category => {
                const Icon = categoryIcons[category]
                return (
                  <TabsTrigger key={category} value={category} className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4" />}
                    <span className="hidden sm:inline">{categoryNames[category]}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {availableCategories.map(category => (
              <TabsContent key={category} value={category} className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getStatsByCategory(gameId, category).map(stat => {
                    const value = playerStats[stat.key]
                    const hasData = value !== undefined && value !== null

                    return (
                      <StatCard
                        key={stat.key}
                        stat={stat}
                        value={value}
                        hasData={hasData}
                      />
                    )
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Performance Insights */}
        <PerformanceInsights playerStats={playerStats} gameId={gameId} />
      </CardContent>
    </Card>
  )
}

function StatCard({ stat, value, hasData }) {
  const getRatingColor = (value, statKey) => {
    if (!hasData) return 'text-muted-foreground'

    // Color coding based on stat type and value
    if (statKey.includes('rating')) {
      if (value >= 1200) return 'text-green-600'
      if (value >= 1000) return 'text-blue-600'
      if (value >= 800) return 'text-yellow-600'
      return 'text-red-600'
    }

    if (statKey.includes('rate') || statKey.includes('percentage')) {
      if (value >= 70) return 'text-green-600'
      if (value >= 50) return 'text-blue-600'
      if (value >= 30) return 'text-yellow-600'
      return 'text-red-600'
    }

    return 'text-foreground'
  }

  return (
    <div className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{stat.icon}</span>
        <span className="font-medium text-sm">{stat.name}</span>
      </div>

      <div className={`text-xl font-bold ${getRatingColor(value, stat.key)}`}>
        {hasData ? stat.format(value) : 'N/A'}
      </div>

      <p className="text-xs text-muted-foreground mt-1">
        {stat.description}
      </p>

      {!hasData && (
        <Badge variant="outline" className="mt-2 text-xs">
          No data
        </Badge>
      )}
    </div>
  )
}

function PerformanceInsights({ playerStats, gameId }) {
  const insights = generateInsights(playerStats, gameId)

  if (insights.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h4 className="text-sm font-medium text-muted-foreground">Performance Insights</h4>
        <div className="flex-1 h-px bg-border"></div>
      </div>

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
          </div>
        ))}
      </div>
    </div>
  )
}

function generateInsights(stats, gameId) {
  const insights = []

  // Win rate insights
  if (stats.win_rate !== undefined) {
    if (stats.win_rate >= 70) {
      insights.push({
        icon: TrendingUp,
        color: 'text-green-600',
        title: 'Excellent Win Rate',
        description: `Your ${stats.win_rate}% win rate shows exceptional performance.`
      })
    } else if (stats.win_rate <= 30) {
      insights.push({
        icon: TrendingDown,
        color: 'text-red-600',
        title: 'Improvement Opportunity',
        description: 'Focus on fundamentals to improve your win rate.'
      })
    }
  }

  // Game-specific insights
  if (gameId === 'league_of_legends') {
    if (stats.kda_ratio > 2.5) {
      insights.push({
        icon: Target,
        color: 'text-green-600',
        title: 'Strong KDA Performance',
        description: 'Your KDA ratio indicates excellent combat decision-making.'
      })
    }

    if (stats.avg_cs_per_min > 7) {
      insights.push({
        icon: Zap,
        color: 'text-blue-600',
        title: 'Excellent Farm',
        description: 'Your CS/min shows strong laning fundamentals.'
      })
    }
  }

  if (gameId === 'super_smash_bros') {
    if (stats.edgeguard_success_rate > 60) {
      insights.push({
        icon: Target,
        color: 'text-green-600',
        title: 'Edgeguard Specialist',
        description: 'Your edgeguard success rate is above average.'
      })
    }
  }

  if (gameId === 'counter_strike') {
    if (stats.headshot_percentage > 50) {
      insights.push({
        icon: Target,
        color: 'text-green-600',
        title: 'Sharp Shooter',
        description: 'Your headshot percentage shows excellent aim.'
      })
    }

    if (stats.clutch_success_rate > 40) {
      insights.push({
        icon: Brain,
        color: 'text-purple-600',
        title: 'Clutch Player',
        description: 'You perform well under pressure in clutch situations.'
      })
    }
  }

  return insights
}