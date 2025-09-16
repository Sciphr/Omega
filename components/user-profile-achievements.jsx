'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AchievementBadge } from './achievement-badge'
import { AchievementProgress } from './achievement-progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ACHIEVEMENT_TIERS } from '@/lib/achievement-schema'
import { cn } from '@/lib/utils'
import {
  Trophy,
  Star,
  Medal,
  Crown,
  ChevronRight,
  ExternalLink
} from 'lucide-react'

export function UserProfileAchievements({
  userId,
  userAchievements = [],
  totalPoints = 0,
  showAll = false,
  className
}) {
  const [featuredAchievements, setFeaturedAchievements] = useState([])
  const [recentAchievements, setRecentAchievements] = useState([])
  const [topAchievements, setTopAchievements] = useState([])

  useEffect(() => {
    // Sort and categorize achievements
    const featured = userAchievements.filter(a => a.is_featured).slice(0, 3)
    const recent = userAchievements
      .sort((a, b) => new Date(b.unlocked_at) - new Date(a.unlocked_at))
      .slice(0, 6)

    const top = userAchievements
      .sort((a, b) => {
        const tierA = ACHIEVEMENT_TIERS[a.achievements?.tier?.toUpperCase()] || ACHIEVEMENT_TIERS.BRONZE
        const tierB = ACHIEVEMENT_TIERS[b.achievements?.tier?.toUpperCase()] || ACHIEVEMENT_TIERS.BRONZE
        return tierB.points - tierA.points
      })
      .slice(0, 6)

    setFeaturedAchievements(featured)
    setRecentAchievements(recent)
    setTopAchievements(top)
  }, [userAchievements])

  const achievementsByTier = userAchievements.reduce((acc, achievement) => {
    const tier = achievement.achievements?.tier || 'bronze'
    acc[tier] = (acc[tier] || 0) + 1
    return acc
  }, {})

  const getRank = () => {
    if (totalPoints >= 2000) return { name: 'Grandmaster', icon: '👑', color: '#FF6B35' }
    if (totalPoints >= 1000) return { name: 'Master', icon: '🏆', color: '#FFD700' }
    if (totalPoints >= 500) return { name: 'Expert', icon: '⭐', color: '#E5E4E2' }
    if (totalPoints >= 250) return { name: 'Advanced', icon: '🥇', color: '#CD7F32' }
    if (totalPoints >= 100) return { name: 'Intermediate', icon: '🥈', color: '#C0C0C0' }
    if (totalPoints >= 50) return { name: 'Novice', icon: '🥉', color: '#CD7F32' }
    return { name: 'Beginner', icon: '🎯', color: '#6B7280' }
  }

  const rank = getRank()

  if (!showAll) {
    // Compact version for profile preview
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Achievements
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs">
              View All
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User Rank */}
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl border-2"
              style={{ borderColor: rank.color }}
            >
              {rank.icon}
            </div>
            <div>
              <h4 className="font-semibold" style={{ color: rank.color }}>
                {rank.name}
              </h4>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Star className="w-4 h-4" />
                {totalPoints.toLocaleString()} points
              </div>
            </div>
          </div>

          {/* Featured Achievements */}
          {featuredAchievements.length > 0 && (
            <div>
              <h5 className="text-sm font-medium mb-2">Featured</h5>
              <div className="flex gap-2">
                {featuredAchievements.map((achievement, index) => (
                  <AchievementBadge
                    key={index}
                    achievement={achievement.achievements}
                    unlocked={true}
                    unlockedAt={achievement.unlocked_at}
                    size="sm"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="flex justify-between text-sm">
            <div className="text-center">
              <p className="font-semibold">{userAchievements.length}</p>
              <p className="text-gray-600">Unlocked</p>
            </div>
            <div className="text-center">
              <p className="font-semibold">{achievementsByTier.gold || 0}</p>
              <p className="text-gray-600">Gold+</p>
            </div>
            <div className="text-center">
              <p className="font-semibold">
                {Math.round((userAchievements.length / 50) * 100)}%
              </p>
              <p className="text-gray-600">Complete</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Full achievement profile page
  return (
    <div className={cn("space-y-6", className)}>
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-4xl border-4 shadow-lg"
              style={{ borderColor: rank.color }}
            >
              {rank.icon}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1" style={{ color: rank.color }}>
                {rank.name}
              </h2>
              <div className="flex items-center gap-4 text-gray-600">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  {totalPoints.toLocaleString()} points
                </div>
                <div className="flex items-center gap-1">
                  <Trophy className="w-4 h-4" />
                  {userAchievements.length} achievements
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(ACHIEVEMENT_TIERS).slice(0, 3).map(([tierKey, tier]) => (
                  <div key={tierKey} className="text-center">
                    <div
                      className="w-8 h-8 mx-auto rounded-full border flex items-center justify-center text-sm font-bold mb-1"
                      style={{ borderColor: tier.color, color: tier.color }}
                    >
                      {achievementsByTier[tierKey.toLowerCase()] || 0}
                    </div>
                    <p className="text-xs text-gray-600">{tier.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievement Tabs */}
      <Tabs defaultValue="featured" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="featured">Featured</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="top">Top Tier</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="featured">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="w-5 h-5" />
                Featured Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {featuredAchievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {featuredAchievements.map((achievement, index) => (
                    <div key={index} className="p-4 border rounded-lg text-center">
                      <AchievementBadge
                        achievement={achievement.achievements}
                        unlocked={true}
                        unlockedAt={achievement.unlocked_at}
                        size="lg"
                        className="mx-auto mb-3"
                      />
                      <h4 className="font-semibold mb-1">
                        {achievement.achievements.name}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {achievement.achievements.description}
                      </p>
                      <Badge variant="outline">
                        {achievement.achievements.tier}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Medal className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No featured achievements</p>
                  <p className="text-sm">Feature your favorite achievements to showcase them!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recently Unlocked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-3">
                {recentAchievements.map((achievement, index) => (
                  <AchievementBadge
                    key={index}
                    achievement={achievement.achievements}
                    unlocked={true}
                    unlockedAt={achievement.unlocked_at}
                    size="md"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Top Tier Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-3">
                {topAchievements.map((achievement, index) => (
                  <AchievementBadge
                    key={index}
                    achievement={achievement.achievements}
                    unlocked={true}
                    unlockedAt={achievement.unlocked_at}
                    size="md"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <AchievementProgress
            userAchievements={userAchievements}
            totalPoints={totalPoints}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}