'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AchievementBadge } from './achievement-badge'
import { ACHIEVEMENT_TIERS } from '@/lib/achievement-schema'
import { cn } from '@/lib/utils'
import {
  Trophy,
  TrendingUp,
  Star,
  Clock,
  Target,
  ChevronRight,
  Filter
} from 'lucide-react'

export function AchievementProgress({
  userAchievements = [],
  allAchievements = [],
  progressData = [],
  totalPoints = 0,
  className
}) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showOnlyInProgress, setShowOnlyInProgress] = useState(false)

  // Calculate statistics
  const unlockedCount = userAchievements.length
  const totalCount = allAchievements.length
  const completionPercentage = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0

  // Get achievements by tier
  const achievementsByTier = userAchievements.reduce((acc, achievement) => {
    const tier = achievement.achievements?.tier || 'bronze'
    acc[tier] = (acc[tier] || 0) + 1
    return acc
  }, {})

  // Get recent achievements (last 7 days)
  const recentAchievements = userAchievements
    .filter(achievement => {
      const unlockedDate = new Date(achievement.unlocked_at)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return unlockedDate >= sevenDaysAgo
    })
    .sort((a, b) => new Date(b.unlocked_at) - new Date(a.unlocked_at))

  // Get achievements in progress
  const achievementsInProgress = progressData
    .filter(progress => progress.progress_value > 0)
    .map(progress => {
      const achievement = allAchievements.find(a =>
        a.requirements?.type === progress.progress_key
      )
      return {
        ...achievement,
        progress: {
          current: progress.progress_value,
          total: achievement?.requirements?.count || 100,
          percentage: Math.min(100, (progress.progress_value / (achievement?.requirements?.count || 100)) * 100)
        }
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.progress.percentage - a.progress.percentage)

  return (
    <div className={cn("space-y-6", className)}>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Trophy className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Achievements</p>
                <p className="text-xl font-bold">{unlockedCount}/{totalCount}</p>
              </div>
            </div>
            <Progress value={completionPercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Star className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Points</p>
                <p className="text-xl font-bold">{totalPoints.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-xl font-bold">{recentAchievements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-xl font-bold">{achievementsInProgress.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Achievement Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {Object.entries(ACHIEVEMENT_TIERS).map(([tierKey, tier]) => (
              <div key={tierKey} className="text-center">
                <div
                  className="w-12 h-12 mx-auto rounded-full border-2 flex items-center justify-center mb-2"
                  style={{ borderColor: tier.color }}
                >
                  <span className="text-lg font-bold" style={{ color: tier.color }}>
                    {achievementsByTier[tierKey.toLowerCase()] || 0}
                  </span>
                </div>
                <p className="text-xs font-medium">{tier.name}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="progress" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="progress">In Progress</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="all">All Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Achievements in Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              {achievementsInProgress.length > 0 ? (
                <div className="space-y-4">
                  {achievementsInProgress.map((achievement, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className="text-2xl">{achievement.icon_emoji || '🏆'}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{achievement.name}</h4>
                            <Badge variant="outline">
                              {achievement.tier}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            {achievement.description}
                          </p>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>
                                {achievement.progress.current} / {achievement.progress.total}
                              </span>
                            </div>
                            <Progress value={achievement.progress.percentage} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No achievements in progress</p>
                  <p className="text-sm">Keep playing to unlock new achievements!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recently Unlocked
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentAchievements.length > 0 ? (
                <div className="space-y-3">
                  {recentAchievements.map((achievement, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                      <AchievementBadge
                        achievement={achievement.achievements}
                        unlocked={true}
                        size="sm"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold">{achievement.achievements.name}</h4>
                        <p className="text-sm text-gray-600">
                          {achievement.achievements.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Star className="w-4 h-4 text-yellow-500" />
                          {achievement.achievements.points}
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(achievement.unlocked_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent achievements</p>
                  <p className="text-sm">Play some tournaments to unlock achievements!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-3">
                {allAchievements.map((achievement) => {
                  const userAchievement = userAchievements.find(
                    ua => ua.achievement_id === achievement.id
                  )
                  return (
                    <AchievementBadge
                      key={achievement.id}
                      achievement={achievement}
                      unlocked={!!userAchievement}
                      unlockedAt={userAchievement?.unlocked_at}
                      size="md"
                    />
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}