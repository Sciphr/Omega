'use client'

import { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CHAMPIONS, ROLES, ROLE_COLORS, searchChampions, getChampion } from '@/lib/champions'
import { Search, Target, Ban, Crown } from 'lucide-react'

export function ChampionSelector({
  onSelect,
  selected,
  bannedChampions = [],
  pickedChampions = [],
  phaseType = 'pick', // 'pick' or 'ban'
  disabled = false,
  timeRemaining = 0,
  currentTurn = null,
  isMyTurn = false
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('All')
  const [hoveredChampion, setHoveredChampion] = useState(null)

  // Get all excluded champion IDs (banned + picked)
  const excludedIds = useMemo(() => {
    const banned = bannedChampions.map(b => b.championId || b.id || b)
    const picked = pickedChampions.map(p => p.championId || p.id || p)
    return [...banned, ...picked]
  }, [bannedChampions, pickedChampions])

  // Filter champions based on search and role
  const filteredChampions = useMemo(() => {
    let champions = searchChampions(searchTerm, excludedIds)

    if (selectedRole !== 'All') {
      champions = champions.filter(c => c.role === selectedRole)
    }

    return champions
  }, [searchTerm, selectedRole, excludedIds])

  const handleChampionClick = (champion) => {
    if (disabled || excludedIds.includes(champion.id)) return
    onSelect(champion)
  }

  const getChampionStatus = (championId) => {
    if (bannedChampions.some(b => (b.championId || b.id || b) === championId)) return 'banned'
    if (pickedChampions.some(p => (p.championId || p.id || p) === championId)) return 'picked'
    return 'available'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {phaseType === 'ban' ? (
            <Ban className="h-5 w-5 text-red-600" />
          ) : (
            <Target className="h-5 w-5 text-blue-600" />
          )}
          <h3 className="text-lg font-semibold">
            {phaseType === 'ban' ? 'Ban Champion' : 'Pick Champion'}
          </h3>
          {timeRemaining > 0 && (
            <Badge variant={timeRemaining <= 10 ? 'destructive' : 'outline'}>
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </Badge>
          )}
        </div>

        {currentTurn && (
          <div className="flex items-center space-x-2">
            <Badge variant={isMyTurn ? 'default' : 'secondary'}>
              {isMyTurn ? 'Your Turn' : `${currentTurn}'s Turn`}
            </Badge>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search champions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          disabled={disabled}
        />
      </div>

      {/* Role Filter */}
      <Tabs value={selectedRole} onValueChange={setSelectedRole}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="All">All</TabsTrigger>
          {ROLES.map(role => (
            <TabsTrigger key={role} value={role}>
              {role}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedRole} className="mt-4">
          {/* Champion Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-96 overflow-y-auto">
            {filteredChampions.map(champion => {
              const status = getChampionStatus(champion.id)
              const isHovered = hoveredChampion === champion.id
              const isSelected = selected?.id === champion.id

              return (
                <div
                  key={champion.id}
                  className={`relative group cursor-pointer transition-all duration-200 ${
                    status === 'banned' ? 'opacity-50 cursor-not-allowed' :
                    status === 'picked' ? 'opacity-50 cursor-not-allowed' :
                    disabled ? 'opacity-50 cursor-not-allowed' :
                    isSelected ? 'ring-2 ring-blue-500 scale-105' :
                    isHovered ? 'scale-105' : 'hover:scale-105'
                  }`}
                  onClick={() => handleChampionClick(champion)}
                  onMouseEnter={() => setHoveredChampion(champion.id)}
                  onMouseLeave={() => setHoveredChampion(null)}
                >
                  <Card className={`p-2 h-24 flex flex-col items-center justify-center text-center ${
                    isSelected ? 'border-blue-500 bg-blue-50' : ''
                  }`}>
                    {/* Champion Avatar Placeholder */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1 ${
                      status === 'banned' ? 'bg-red-500' :
                      status === 'picked' ? 'bg-gray-500' :
                      'bg-gradient-to-br from-blue-500 to-purple-600'
                    }`}>
                      {champion.name.substring(0, 2).toUpperCase()}
                    </div>

                    {/* Champion Name */}
                    <div className="text-xs font-medium truncate w-full">
                      {champion.name}
                    </div>

                    {/* Role Badge */}
                    <Badge
                      variant="outline"
                      className={`text-xs ${ROLE_COLORS[champion.role]} h-4`}
                    >
                      {champion.role}
                    </Badge>

                    {/* Status Overlay */}
                    {status === 'banned' && (
                      <div className="absolute inset-0 bg-red-600 bg-opacity-75 flex items-center justify-center rounded">
                        <Ban className="h-6 w-6 text-white" />
                      </div>
                    )}
                    {status === 'picked' && (
                      <div className="absolute inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center rounded">
                        <Crown className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </Card>
                </div>
              )
            })}
          </div>

          {filteredChampions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No champions found matching your search.
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Selected Champion Display */}
      {selected && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {selected.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-blue-900">{selected.name}</h4>
              <Badge className={`${ROLE_COLORS[selected.role]}`}>
                {selected.role}
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-700 font-medium">
                {phaseType === 'ban' ? 'Champion to Ban' : 'Champion to Pick'}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Current Picks/Bans Summary */}
      {(pickedChampions.length > 0 || bannedChampions.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Picked Champions */}
          {pickedChampions.length > 0 && (
            <Card className="p-3">
              <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center">
                <Crown className="h-4 w-4 mr-1" />
                Picked Champions ({pickedChampions.length})
              </h4>
              <div className="flex flex-wrap gap-1">
                {pickedChampions.map((pick, index) => {
                  const champion = getChampion(pick.championId || pick.id || pick)
                  return (
                    <Badge key={index} className="bg-green-100 text-green-800">
                      {champion?.name || 'Unknown'}
                    </Badge>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Banned Champions */}
          {bannedChampions.length > 0 && (
            <Card className="p-3">
              <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center">
                <Ban className="h-4 w-4 mr-1" />
                Banned Champions ({bannedChampions.length})
              </h4>
              <div className="flex flex-wrap gap-1">
                {bannedChampions.map((ban, index) => {
                  const champion = getChampion(ban.championId || ban.id || ban)
                  return (
                    <Badge key={index} className="bg-red-100 text-red-800">
                      {champion?.name || 'Unknown'}
                    </Badge>
                  )
                })}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}