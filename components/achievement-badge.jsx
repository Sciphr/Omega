'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ACHIEVEMENT_TIERS } from '@/lib/achievement-schema'
import { cn } from '@/lib/utils'
import { Star, Lock, Calendar, Trophy } from 'lucide-react'

export function AchievementBadge({
  achievement,
  unlocked = false,
  unlockedAt = null,
  size = 'md',
  showProgress = false,
  progress = null,
  className
}) {
  const [isHovered, setIsHovered] = useState(false)

  const tier = ACHIEVEMENT_TIERS[achievement.tier?.toUpperCase()] || ACHIEVEMENT_TIERS.BRONZE

  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-16 h-16 text-xl',
    lg: 'w-20 h-20 text-2xl',
    xl: 'w-24 h-24 text-3xl'
  }

  const badgeContent = (
    <div
      className={cn(
        "relative group cursor-pointer transition-all duration-200",
        sizeClasses[size],
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card className={cn(
        "w-full h-full border-2 transition-all duration-200 overflow-hidden",
        unlocked
          ? `border-[${tier.color}] shadow-md hover:shadow-lg`
          : "border-gray-300 opacity-60 grayscale",
        isHovered && unlocked && "scale-105"
      )}>
        <CardContent className="p-0 h-full flex items-center justify-center relative">
          {/* Background gradient for unlocked achievements */}
          {unlocked && (
            <div
              className="absolute inset-0 opacity-10"
              style={{
                background: `linear-gradient(135deg, ${tier.color}20, ${tier.color}40)`
              }}
            />
          )}

          {/* Lock overlay for locked achievements */}
          {!unlocked && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80">
              <Lock className="w-1/3 h-1/3 text-gray-400" />
            </div>
          )}

          {/* Achievement icon */}
          <div className={cn(
            "relative z-10 transition-all duration-200",
            unlocked ? "opacity-100" : "opacity-30"
          )}>
            {achievement.icon_emoji || '🏆'}
          </div>

          {/* Tier indicator */}
          {unlocked && (
            <div
              className="absolute top-1 right-1 w-3 h-3 rounded-full border border-white"
              style={{ backgroundColor: tier.color }}
            />
          )}

          {/* Points indicator */}
          {unlocked && size !== 'sm' && (
            <div className="absolute bottom-0 right-0 bg-black/70 text-white text-xs px-1 rounded-tl">
              {achievement.points}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress bar for achievements in progress */}
      {showProgress && progress && !unlocked && (
        <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{
              width: `${Math.min(100, (progress.current / progress.total) * 100)}%`
            }}
          />
        </div>
      )}
    </div>
  )

  const tooltipContent = (
    <div className="max-w-xs">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{achievement.icon_emoji || '🏆'}</span>
        <div>
          <h4 className="font-semibold text-white">{achievement.name}</h4>
          <div className="flex items-center gap-1">
            <Badge
              variant="outline"
              className="text-xs"
              style={{
                borderColor: tier.color,
                color: tier.color
              }}
            >
              {tier.name}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-gray-300">
              <Star className="w-3 h-3" />
              {achievement.points}
            </div>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-200 mb-2">
        {achievement.description}
      </p>

      {unlocked && unlockedAt && (
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Calendar className="w-3 h-3" />
          Unlocked {new Date(unlockedAt).toLocaleDateString()}
        </div>
      )}

      {showProgress && progress && !unlocked && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Progress</span>
            <span>{progress.current} / {progress.total}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1">
            <div
              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (progress.current / progress.total) * 100)}%`
              }}
            />
          </div>
        </div>
      )}

      {!unlocked && achievement.is_secret && (
        <div className="mt-2 text-xs text-gray-400 italic">
          🤐 Secret Achievement
        </div>
      )}
    </div>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-gray-900 border-gray-700 p-3"
        >
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function AchievementGrid({ achievements, showProgress = false, className }) {
  const categorizedAchievements = achievements.reduce((acc, achievement) => {
    const category = achievement.achievements?.category || achievement.category
    if (!acc[category]) acc[category] = []
    acc[category].push(achievement)
    return acc
  }, {})

  return (
    <div className={cn("space-y-6", className)}>
      {Object.entries(categorizedAchievements).map(([category, categoryAchievements]) => (
        <div key={category}>
          <h3 className="text-lg font-semibold mb-3 capitalize flex items-center gap-2">
            {getCategoryIcon(category)}
            {getCategoryName(category)}
            <Badge variant="secondary" className="text-xs">
              {categoryAchievements.filter(a => a.unlocked_at || a.unlocked).length} / {categoryAchievements.length}
            </Badge>
          </h3>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3">
            {categoryAchievements.map((achievement) => (
              <AchievementBadge
                key={achievement.id || achievement.achievements?.slug}
                achievement={achievement.achievements || achievement}
                unlocked={!!achievement.unlocked_at || achievement.unlocked}
                unlockedAt={achievement.unlocked_at}
                showProgress={showProgress}
                progress={achievement.progress}
                size="md"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function getCategoryIcon(category) {
  const icons = {
    tournament: '🏆',
    performance: '⭐',
    social: '👥',
    game_specific: '🎮',
    rare: '💎'
  }
  return icons[category] || '🏅'
}

function getCategoryName(category) {
  const names = {
    tournament: 'Tournament Mastery',
    performance: 'Performance Excellence',
    social: 'Community Builder',
    game_specific: 'Game Master',
    rare: 'Legendary Moments'
  }
  return names[category] || category.replace('_', ' ')
}