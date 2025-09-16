'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getAvailableGames, getGameDisplayName } from '@/lib/game-utils'
import { cn } from '@/lib/utils'
import { Gamepad2, ChevronDown } from 'lucide-react'

export function GameSelector({
  currentGame = null,
  onGameChange,
  variant = 'select', // 'select', 'tabs', 'compact'
  showAllOption = true,
  clientSideOnly = false,
  className
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const availableGames = getAvailableGames()

  const handleGameChange = (gameId) => {
    const selectedGame = gameId === 'all' ? null : gameId

    if (clientSideOnly) {
      // Only call the callback, don't update URL
      onGameChange?.(selectedGame)
    } else {
      // Create new URLSearchParams
      const params = new URLSearchParams(searchParams)

      if (gameId && gameId !== 'all') {
        params.set('game', gameId)
      } else {
        params.delete('game')
      }

      // Navigate to new URL
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
      router.push(newUrl)

      // Call optional callback
      onGameChange?.(selectedGame)
    }
  }

  if (variant === 'select') {
    return (
      <div className={cn("min-w-48", className)}>
        <Select
          value={currentGame || 'all'}
          onValueChange={handleGameChange}
        >
          <SelectTrigger className="w-full">
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {showAllOption && (
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <span>All Games</span>
                  <Badge variant="secondary" className="text-xs">
                    Overall
                  </Badge>
                </div>
              </SelectItem>
            )}
            {availableGames.map((game) => (
              <SelectItem key={game.id} value={game.id}>
                <div className="flex items-center gap-2">
                  <span>{game.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  if (variant === 'tabs') {
    return (
      <Card className={className}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <Gamepad2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              View stats for:
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {showAllOption && (
              <Button
                variant={!currentGame ? "default" : "outline"}
                size="sm"
                onClick={() => handleGameChange('all')}
                className="text-xs"
              >
                All Games
              </Button>
            )}
            {availableGames.map((game) => (
              <Button
                key={game.id}
                variant={currentGame === game.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleGameChange(game.id)}
                className="text-xs"
              >
                {game.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Gamepad2 className="h-4 w-4 text-muted-foreground" />
        <Select
          value={currentGame || 'all'}
          onValueChange={handleGameChange}
        >
          <SelectTrigger className="w-auto min-w-32 h-8 text-sm">
            <SelectValue />
            <ChevronDown className="h-3 w-3 opacity-50" />
          </SelectTrigger>
          <SelectContent>
            {showAllOption && (
              <SelectItem value="all">All Games</SelectItem>
            )}
            {availableGames.map((game) => (
              <SelectItem key={game.id} value={game.id}>
                {game.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return null
}

export function GameSelectorHeader({
  currentGame,
  playerName,
  onGameChange,
  className
}) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div>
        <h2 className="text-xl font-semibold">
          {currentGame ? (
            <>
              <span className="text-muted-foreground">{playerName}'s</span>{' '}
              {getGameDisplayName(currentGame)} Stats
            </>
          ) : (
            <>
              <span className="text-muted-foreground">{playerName}'s</span>{' '}
              Overall Stats
            </>
          )}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {currentGame
            ? `Performance metrics and statistics for ${getGameDisplayName(currentGame)}`
            : 'Combined performance metrics across all games'
          }
        </p>
      </div>
      <GameSelector
        currentGame={currentGame}
        variant="compact"
        onGameChange={onGameChange}
        clientSideOnly={true}
      />
    </div>
  )
}

// Hook for game selection state
export function useGameSelection() {
  const searchParams = useSearchParams()
  const currentGame = searchParams.get('game')

  return {
    currentGame,
    isAllGames: !currentGame,
    gameDisplayName: currentGame ? getGameDisplayName(currentGame) : 'All Games'
  }
}