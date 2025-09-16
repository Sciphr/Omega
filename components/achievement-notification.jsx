'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ACHIEVEMENT_TIERS } from '@/lib/achievement-schema'
import { cn } from '@/lib/utils'
import { X, Star, Trophy } from 'lucide-react'

export function AchievementNotification({
  achievement,
  show = false,
  onClose,
  autoClose = true,
  autoCloseDelay = 5000
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const tier = ACHIEVEMENT_TIERS[achievement?.tier?.toUpperCase()] || ACHIEVEMENT_TIERS.BRONZE

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      setTimeout(() => setIsAnimating(true), 100)

      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose()
        }, autoCloseDelay)

        return () => clearTimeout(timer)
      }
    }
  }, [show, autoClose, autoCloseDelay])

  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, 300)
  }

  if (!isVisible || !achievement) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/20 transition-opacity duration-300",
          isAnimating ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Notification */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <Card
          className={cn(
            "border-4 shadow-2xl max-w-md w-full pointer-events-auto transform transition-all duration-500",
            isAnimating
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-8 scale-95 opacity-0",
            "animate-pulse-subtle"
          )}
          style={{
            borderColor: tier.color,
            boxShadow: `0 0 30px ${tier.color}40`
          }}
        >
          <CardContent className="p-6 text-center relative">
            {/* Close button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-8 w-8 p-0"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Achievement unlocked header */}
            <div className="mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <h2 className="text-lg font-bold text-yellow-500">
                  Achievement Unlocked!
                </h2>
                <Trophy className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="w-16 h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 mx-auto rounded-full" />
            </div>

            {/* Achievement icon */}
            <div className="mb-4">
              <div
                className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-4xl border-4 shadow-lg"
                style={{
                  borderColor: tier.color,
                  background: `linear-gradient(135deg, ${tier.color}20, ${tier.color}40)`
                }}
              >
                {achievement.icon_emoji || '🏆'}
              </div>
            </div>

            {/* Achievement details */}
            <div className="space-y-3">
              <h3 className="text-xl font-bold">{achievement.name}</h3>

              <p className="text-gray-600 text-sm">
                {achievement.description}
              </p>

              <div className="flex items-center justify-center gap-3">
                <Badge
                  variant="outline"
                  className="px-3 py-1"
                  style={{
                    borderColor: tier.color,
                    color: tier.color
                  }}
                >
                  {tier.name}
                </Badge>

                <div className="flex items-center gap-1 text-sm font-medium">
                  <Star className="w-4 h-4 text-yellow-500" />
                  {achievement.points} points
                </div>
              </div>

              {/* Sparkle effect */}
              <div className="relative">
                <div className="absolute inset-0 -m-4 opacity-60">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-twinkle"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 2}s`
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
              >
                Awesome!
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function AchievementToast({
  achievement,
  show = false,
  onClose,
  position = 'top-right'
}) {
  const [isVisible, setIsVisible] = useState(false)

  const tier = ACHIEVEMENT_TIERS[achievement?.tier?.toUpperCase()] || ACHIEVEMENT_TIERS.BRONZE

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  }

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onClose, 300)
      }, 4000)

      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  if (!show || !achievement) return null

  return (
    <div className={cn(
      "fixed z-50 transition-all duration-300 pointer-events-auto",
      positionClasses[position],
      isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
    )}>
      <Card
        className="border-2 shadow-lg max-w-sm"
        style={{
          borderColor: tier.color
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl border-2"
              style={{
                borderColor: tier.color,
                background: `linear-gradient(135deg, ${tier.color}20, ${tier.color}40)`
              }}
            >
              {achievement.icon_emoji || '🏆'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <p className="text-sm font-medium text-yellow-600">
                  Achievement Unlocked!
                </p>
              </div>
              <h4 className="font-semibold text-sm truncate">
                {achievement.name}
              </h4>
              <div className="flex items-center gap-2 mt-1">
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
                <span className="text-xs text-gray-500">
                  +{achievement.points} pts
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 shrink-0"
              onClick={() => {
                setIsVisible(false)
                setTimeout(onClose, 300)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// CSS for animations (add to your global CSS)
export const achievementAnimationCSS = `
@keyframes pulse-subtle {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

@keyframes twinkle {
  0%, 100% { opacity: 0; transform: scale(0); }
  50% { opacity: 1; transform: scale(1); }
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s ease-in-out infinite;
}

.animate-twinkle {
  animation: twinkle 2s ease-in-out infinite;
}
`