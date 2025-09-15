'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ChampionSelector } from './ChampionSelector'
import { getChampion } from '@/lib/champions'
import { Timer, Crown, Ban, Users, Gamepad2 } from 'lucide-react'

// Tournament Draft Phase Order (Professional LoL format)
const TOURNAMENT_DRAFT_PHASES = [
  // Phase 1: Opening Bans (3 bans each, alternating) - 30 seconds each
  { id: 1, type: 'ban', team: 'blue', order: 1, name: 'Blue Ban 1', timeLimit: 30 },
  { id: 2, type: 'ban', team: 'red', order: 2, name: 'Red Ban 1', timeLimit: 30 },
  { id: 3, type: 'ban', team: 'blue', order: 3, name: 'Blue Ban 2', timeLimit: 30 },
  { id: 4, type: 'ban', team: 'red', order: 4, name: 'Red Ban 2', timeLimit: 30 },
  { id: 5, type: 'ban', team: 'blue', order: 5, name: 'Blue Ban 3', timeLimit: 30 },
  { id: 6, type: 'ban', team: 'red', order: 6, name: 'Red Ban 3', timeLimit: 30 },

  // Phase 2: First Pick Round (3 picks each, blue starts) - 30 seconds each
  { id: 7, type: 'pick', team: 'blue', order: 7, name: 'Blue Pick 1', timeLimit: 30 },
  { id: 8, type: 'pick', team: 'red', order: 8, name: 'Red Pick 1', timeLimit: 30 },
  { id: 9, type: 'pick', team: 'red', order: 9, name: 'Red Pick 2', timeLimit: 30 },
  { id: 10, type: 'pick', team: 'blue', order: 10, name: 'Blue Pick 2', timeLimit: 30 },
  { id: 11, type: 'pick', team: 'blue', order: 11, name: 'Blue Pick 3', timeLimit: 30 },
  { id: 12, type: 'pick', team: 'red', order: 12, name: 'Red Pick 3', timeLimit: 30 },

  // Phase 3: Second Ban Round (2 bans each, red starts) - 30 seconds each
  { id: 13, type: 'ban', team: 'red', order: 13, name: 'Red Ban 4', timeLimit: 30 },
  { id: 14, type: 'ban', team: 'blue', order: 14, name: 'Blue Ban 4', timeLimit: 30 },
  { id: 15, type: 'ban', team: 'red', order: 15, name: 'Red Ban 5', timeLimit: 30 },
  { id: 16, type: 'ban', team: 'blue', order: 16, name: 'Blue Ban 5', timeLimit: 30 },

  // Phase 4: Final Picks (2 picks each, red starts) - 30 seconds each
  { id: 17, type: 'pick', team: 'red', order: 17, name: 'Red Pick 4', timeLimit: 30 },
  { id: 18, type: 'pick', team: 'blue', order: 18, name: 'Blue Pick 4', timeLimit: 30 },
  { id: 19, type: 'pick', team: 'red', order: 19, name: 'Red Pick 5', timeLimit: 30 },
  { id: 20, type: 'pick', team: 'blue', order: 20, name: 'Blue Pick 5', timeLimit: 30 }
]

export function LeagueOfLegendsDraft({
  match,
  currentPhase,
  selections = {},
  timeRemaining = 0,
  onMakeSelection,
  canMakeSelection = false,
  currentParticipant = null,
  isSpectator = false
}) {
  const [selectedChampion, setSelectedChampion] = useState(null)
  const [draftPhases, setDraftPhases] = useState(TOURNAMENT_DRAFT_PHASES)
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const [phaseTimer, setPhaseTimer] = useState(0)
  const [autoProgressTimer, setAutoProgressTimer] = useState(null)

  // Initialize phase timer when component mounts or phase changes
  useEffect(() => {
    const currentPhaseInfo = getCurrentPhaseInfo()
    if (currentPhaseInfo && !isDraftComplete) {
      setPhaseTimer(currentPhaseInfo.timeLimit)
      startPhaseTimer(currentPhaseInfo.timeLimit)
    }

    return () => {
      if (autoProgressTimer) {
        clearInterval(autoProgressTimer)
      }
    }
  }, [currentPhaseIndex])

  // Start phase timer
  const startPhaseTimer = (duration) => {
    if (autoProgressTimer) {
      clearInterval(autoProgressTimer)
    }

    const timer = setInterval(() => {
      setPhaseTimer(prevTime => {
        if (prevTime <= 1) {
          // Time's up - auto progress to next phase
          handleTimeUp()
          clearInterval(timer)
          return 0
        }
        return prevTime - 1
      })
    }, 1000)

    setAutoProgressTimer(timer)
  }

  // Handle when time runs out
  const handleTimeUp = () => {
    console.log('Time up for phase:', getCurrentPhaseInfo()?.name)

    // Auto-progress to next phase (no selection made)
    const nextIndex = currentPhaseIndex + 1
    setCurrentPhaseIndex(nextIndex)

    // If there's a next phase, start its timer
    if (nextIndex < draftPhases.length) {
      const nextPhaseInfo = draftPhases[nextIndex]
      setPhaseTimer(nextPhaseInfo.timeLimit)
      startPhaseTimer(nextPhaseInfo.timeLimit)
    }
  }

  // Parse existing selections to extract picks and bans
  const parseSelections = () => {
    const picks = { blue: [], red: [] }
    const bans = { blue: [], red: [] }

    Object.values(selections).flat().forEach(selection => {
      const championId = selection.selection_data?.championId || selection.selection_data?.item
      const team = getTeamForParticipant(selection.participant_id)

      if (selection.selection_type === 'pick') {
        picks[team].push({
          championId,
          participantId: selection.participant_id,
          phaseId: selection.phase_id
        })
      } else if (selection.selection_type === 'ban') {
        bans[team].push({
          championId,
          participantId: selection.participant_id,
          phaseId: selection.phase_id
        })
      }
    })

    return { picks, bans }
  }

  // Determine which team a participant belongs to
  const getTeamForParticipant = (participantId) => {
    return participantId === match.participant1_id ? 'blue' : 'red'
  }

  // Get current team that should be making a selection
  const getCurrentTurnTeam = () => {
    if (!currentPhase) return null
    const phaseInfo = draftPhases.find(p => p.order === currentPhaseIndex + 1)
    return phaseInfo?.team || null
  }

  // Check if it's current user's turn
  const isMyTurn = () => {
    if (!canMakeSelection || !currentParticipant) return false
    const currentTeam = getCurrentTurnTeam()
    const myTeam = getTeamForParticipant(currentParticipant.id)
    return currentTeam === myTeam
  }

  // Get current phase info
  const getCurrentPhaseInfo = () => {
    return draftPhases[currentPhaseIndex] || null
  }

  // Handle champion selection
  const handleChampionSelect = (champion) => {
    setSelectedChampion(champion)
  }

  // Confirm selection
  const handleConfirmSelection = async () => {
    if (!selectedChampion || !canMakeSelection) return

    const phaseInfo = getCurrentPhaseInfo()
    if (!phaseInfo) return

    try {
      // Stop the current timer
      if (autoProgressTimer) {
        clearInterval(autoProgressTimer)
        setAutoProgressTimer(null)
      }

      await onMakeSelection({
        selection_type: phaseInfo.type,
        selection_data: {
          championId: selectedChampion.id,
          championName: selectedChampion.name,
          item: selectedChampion.name // For compatibility with existing system
        },
        phase_order: phaseInfo.order,
        timestamp: new Date().toISOString()
      })

      setSelectedChampion(null)

      // Progress to next phase
      const nextIndex = currentPhaseIndex + 1
      setCurrentPhaseIndex(nextIndex)

      // Start timer for next phase if there is one
      if (nextIndex < draftPhases.length) {
        const nextPhaseInfo = draftPhases[nextIndex]
        setPhaseTimer(nextPhaseInfo.timeLimit)
        startPhaseTimer(nextPhaseInfo.timeLimit)
      }
    } catch (error) {
      console.error('Failed to make selection:', error)
    }
  }

  const { picks, bans } = parseSelections()
  const currentPhaseInfo = getCurrentPhaseInfo()
  const isDraftComplete = currentPhaseIndex >= draftPhases.length

  return (
    <div className="space-y-6">
      {/* Draft Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Gamepad2 className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>League of Legends Draft</CardTitle>
                <p className="text-sm text-muted-foreground">Tournament Draft Format</p>
              </div>
            </div>

            {!isDraftComplete && (
              <div className="flex items-center space-x-4">
                {phaseTimer > 0 && currentPhaseInfo && (
                  <div className="text-center">
                    <div className="flex items-center space-x-2 text-lg font-mono">
                      <Timer className="h-5 w-5" />
                      <span className={phaseTimer <= 10 ? 'text-red-600 animate-pulse' : ''}>
                        {Math.floor(phaseTimer / 60)}:{(phaseTimer % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    <Progress
                      value={(phaseTimer / currentPhaseInfo.timeLimit) * 100}
                      className="w-24 mt-1"
                    />
                  </div>
                )}

                {currentPhaseInfo && (
                  <div className="text-center">
                    <Badge variant={currentPhaseInfo.type === 'pick' ? 'default' : 'destructive'}>
                      {currentPhaseInfo.type === 'pick' ? 'Pick Phase' : 'Ban Phase'}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentPhaseInfo.name}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Team Draft Boards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blue Team (Participant 1) */}
        <TeamDraftBoard
          team="blue"
          teamName={match.participant1?.participant_name || 'Blue Team'}
          picks={picks.blue}
          bans={bans.blue}
          isCurrentTurn={getCurrentTurnTeam() === 'blue'}
          isMyTeam={currentParticipant && getTeamForParticipant(currentParticipant.id) === 'blue'}
        />

        {/* Red Team (Participant 2) */}
        <TeamDraftBoard
          team="red"
          teamName={match.participant2?.participant_name || 'Red Team'}
          picks={picks.red}
          bans={bans.red}
          isCurrentTurn={getCurrentTurnTeam() === 'red'}
          isMyTeam={currentParticipant && getTeamForParticipant(currentParticipant.id) === 'red'}
        />
      </div>

      {/* Champion Selector */}
      {!isDraftComplete && currentPhaseInfo && (
        <Card>
          <CardContent className="p-6">
            <ChampionSelector
              onSelect={handleChampionSelect}
              selected={selectedChampion}
              bannedChampions={[...bans.blue, ...bans.red]}
              pickedChampions={[...picks.blue, ...picks.red]}
              phaseType={currentPhaseInfo.type}
              disabled={!canMakeSelection || !isMyTurn()}
              timeRemaining={phaseTimer}
              currentTurn={getCurrentTurnTeam() === 'blue' ? match.participant1?.participant_name : match.participant2?.participant_name}
              isMyTurn={isMyTurn()}
            />

            {/* Confirm Button */}
            {isMyTurn() && selectedChampion && (
              <div className="mt-4 text-center">
                <Button
                  onClick={handleConfirmSelection}
                  size="lg"
                  className={`w-full max-w-md ${
                    phaseTimer <= 10 ? 'bg-red-600 hover:bg-red-700 animate-pulse' : ''
                  }`}
                >
                  Confirm {currentPhaseInfo.type === 'pick' ? 'Pick' : 'Ban'}: {selectedChampion.name}
                  {phaseTimer <= 10 && (
                    <span className="ml-2 text-white">
                      ({phaseTimer}s)
                    </span>
                  )}
                </Button>
              </div>
            )}

            {/* Urgency Warning */}
            {isMyTurn() && !selectedChampion && phaseTimer <= 15 && (
              <div className="mt-4 text-center">
                <div className={`p-3 rounded-lg border ${
                  phaseTimer <= 5 ? 'bg-red-100 border-red-300 text-red-800' :
                  'bg-yellow-100 border-yellow-300 text-yellow-800'
                }`}>
                  <Timer className="h-4 w-4 inline mr-2" />
                  {phaseTimer <= 5 ? (
                    <span className="font-semibold">
                      Time almost up! Pick any champion in {phaseTimer} seconds!
                    </span>
                  ) : (
                    <span>
                      Hurry up! {phaseTimer} seconds remaining to {currentPhaseInfo.type}
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Draft Complete */}
      {isDraftComplete && (
        <Card>
          <CardContent className="p-6 text-center">
            <Crown className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Draft Complete!</h3>
            <p className="text-muted-foreground">
              Both teams have completed their picks and bans. The match can now begin.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Draft Progress */}
      <DraftProgress
        phases={draftPhases}
        currentPhaseIndex={currentPhaseIndex}
        selections={selections}
      />
    </div>
  )
}

// Team Draft Board Component
function TeamDraftBoard({ team, teamName, picks, bans, isCurrentTurn, isMyTeam }) {
  const teamColor = team === 'blue' ? 'blue' : 'red'

  return (
    <Card className={`${isCurrentTurn ? `ring-2 ring-${teamColor}-500` : ''} ${isMyTeam ? 'bg-blue-50' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-4 h-4 rounded-full bg-${teamColor}-500`} />
            <h3 className="font-semibold text-lg">{teamName}</h3>
            {isMyTeam && <Badge variant="default">Your Team</Badge>}
          </div>
          {isCurrentTurn && (
            <Badge variant="default" className="bg-green-600">
              <Timer className="h-3 w-3 mr-1" />
              Current Turn
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Picks */}
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-green-800 flex items-center mb-2">
              <Crown className="h-4 w-4 mr-1" />
              Picks ({picks.length}/5)
            </h4>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, index) => {
                const pick = picks[index]
                const champion = pick ? getChampion(pick.championId) : null

                return (
                  <div
                    key={index}
                    className={`aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center ${
                      champion ? 'border-solid border-green-500 bg-green-50' : ''
                    }`}
                  >
                    {champion ? (
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs mx-auto mb-1">
                          {champion.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="text-xs font-medium truncate">
                          {champion.name}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 text-center">
                        Pick {index + 1}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bans */}
          <div>
            <h4 className="text-sm font-medium text-red-800 flex items-center mb-2">
              <Ban className="h-4 w-4 mr-1" />
              Bans ({bans.length}/5)
            </h4>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, index) => {
                const ban = bans[index]
                const champion = ban ? getChampion(ban.championId) : null

                return (
                  <div
                    key={index}
                    className={`aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center ${
                      champion ? 'border-solid border-red-500 bg-red-50' : ''
                    }`}
                  >
                    {champion ? (
                      <div className="text-center relative">
                        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-xs mx-auto mb-1">
                          {champion.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="text-xs font-medium truncate">
                          {champion.name}
                        </div>
                        <Ban className="absolute inset-0 h-4 w-4 text-red-600 m-auto" />
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 text-center">
                        Ban {index + 1}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Draft Progress Component
function DraftProgress({ phases, currentPhaseIndex, selections }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Draft Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm mb-2">
            <span>Progress</span>
            <span>{currentPhaseIndex}/{phases.length}</span>
          </div>
          <Progress value={(currentPhaseIndex / phases.length) * 100} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          {phases.map((phase, index) => (
            <div
              key={phase.id}
              className={`text-xs p-2 rounded border text-center ${
                index < currentPhaseIndex ? 'bg-green-100 border-green-300' :
                index === currentPhaseIndex ? 'bg-blue-100 border-blue-300' :
                'bg-gray-100 border-gray-300'
              }`}
            >
              <div className={`font-medium ${phase.type === 'ban' ? 'text-red-600' : 'text-blue-600'}`}>
                {phase.type === 'ban' ? 'Ban' : 'Pick'} {phase.order}
              </div>
              <div className="text-gray-600 truncate">
                {phase.team === 'blue' ? 'Blue' : 'Red'}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}