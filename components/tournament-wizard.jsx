'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createTournamentSchema } from '@/lib/validations'
import { TOURNAMENT_FORMAT, TOURNAMENT_TYPE, PARTICIPATION_TYPE, SEEDING_TYPE, MATCH_FORMAT, GAME_TEMPLATES, DRAFT_TYPES, LEAGUE_OF_LEGENDS_CONFIG } from '@/lib/types'
import { calculateTournamentDuration } from '@/lib/bracket-utils'
import { ChevronLeft, ChevronRight, Trophy, Users, Settings, Gamepad2, Clock, Shield } from 'lucide-react'

const STEPS = [
  { id: 'basic', title: 'Basic Info', icon: Trophy },
  { id: 'game', title: 'Game & Format', icon: Gamepad2 },
  { id: 'participants', title: 'Participants', icon: Users },
  { id: 'settings', title: 'Settings', icon: Settings }
]

export function TournamentWizard({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [gameProfiles, setGameProfiles] = useState([])
  const [selectedGameProfile, setSelectedGameProfile] = useState(null)
  const [loadingGameProfiles, setLoadingGameProfiles] = useState(true)
  const router = useRouter()
  const { user, session, loading, initialized } = useAuthStore()

  const form = useForm({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: {
      name: '',
      description: '',
      game: '',
      format: TOURNAMENT_FORMAT.SINGLE_ELIMINATION,
      tournamentType: TOURNAMENT_TYPE.INDIVIDUAL,
      teamSize: 1,
      maxParticipants: 16,

      // Game profile specific settings
      gameProfileId: '',
      selectedMap: '',
      draftType: '',
      customPhases: [],

      // League of Legends specific settings
      leagueSettings: {
        map: 'summoners_rift',
        draftType: 'tournament_draft',
        enableBans: true,
        banPhases: [{ phase: 1, bansPerTeam: 3 }],
        pickPhases: [{ phase: 1, picksPerTeam: 5 }],
        timeLimit: 30
      },
      participationType: PARTICIPATION_TYPE.ANYONE,
      seedingType: SEEDING_TYPE.RANDOM,
      password: '',
      isPublic: true,
      creatorName: '',
      settings: {
        matchFormat: MATCH_FORMAT.BO1,
        allowForfeits: true,
        autoAdvance: false,
        scoreConfirmationRequired: true,
        checkInRequired: false,
        checkInDeadline: null,
        registrationDeadline: null,
        startTime: null,
        rules: '',
        prizeInfo: '',
        enableDraftBan: false,
        draftBanSettings: {
          enableBans: true,
          enableDrafts: true,
          bansPerSide: 3,
          draftsPerSide: 5,
          banTimer: 30,
          draftTimer: 30,
          alternatingOrder: true,
          customPhases: []
        }
      }
    }
  })

  const watchedValues = form.watch()

  // Computed values
  const currentGame = selectedGameProfile
  const duration = calculateTournamentDuration(
    watchedValues.maxParticipants,
    watchedValues.format,
    watchedValues.settings?.matchFormat
  )


  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/create')
    }
  }, [user, loading, router])

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timeout - forcing show of auth prompt')
      }
    }, 5000) // 5 second timeout

    return () => clearTimeout(timeout)
  }, [loading])

  // Load game profiles
  useEffect(() => {
    loadGameProfiles()
  }, [])

  const loadGameProfiles = async () => {
    try {
      setLoadingGameProfiles(true)
      const response = await fetch('/api/game-profiles')
      const result = await response.json()

      if (result.success) {
        setGameProfiles(result.profiles)
      } else {
        console.error('Failed to load game profiles:', result.error)
      }
    } catch (error) {
      console.error('Error loading game profiles:', error)
    } finally {
      setLoadingGameProfiles(false)
    }
  }

  // Show loading while checking auth (with timeout)
  if (loading && !initialized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
          <p className="text-xs text-muted-foreground mt-2">
            If this takes too long, try refreshing the page
          </p>
        </div>
      </div>
    )
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground mb-6">
            You need to be signed in to create tournaments. This allows you to manage participants, start tournaments, and track results.
          </p>
          <div className="space-x-4">
            <Button onClick={() => router.push('/login?redirect=/create')}>
              Sign In
            </Button>
            <Button variant="outline" onClick={() => router.push('/register?redirect=/create')}>
              Create Account
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const nextStep = async (e) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }
  
  const prevStep = (e) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }
  
  const onSubmit = async (data) => {
    console.log('onSubmit called on step:', currentStep, 'of', STEPS.length - 1)

    // Only allow submission on the final step
    if (currentStep !== STEPS.length - 1) {
      console.log('Preventing submission - not on final step')
      return
    }

    setIsSubmitting(true)
    try {
      console.log('Creating tournament with data:', data)
      console.log('Selected game profile:', selectedGameProfile)
      console.log('Session info:', session)

      if (!session?.access_token) {
        console.error('No access token available. Session:', session)
        throw new Error('No access token available')
      }

      // Transform the data to match API expectations
      const tournamentPayload = {
        ...data,
        game: selectedGameProfile?.game || data.game,
        gameProfileId: selectedGameProfile?.id || data.gameProfileId
      }

      console.log('Sending tournament payload:', tournamentPayload)

      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tournamentPayload),
      })

      console.log('Response status:', response.status)
      const result = await response.json()
      console.log('Response data:', result)

      if (result.success) {
        console.log('Tournament created successfully:', result.tournament)

        if (onComplete) {
          onComplete(result.tournament)
        } else {
          router.push(result.url || '/tournaments')
        }
      } else {
        console.error('Failed to create tournament:', result.error)
        form.setError('root', { message: result.error })
      }
    } catch (error) {
      console.error('Failed to create tournament:', error)
      form.setError('root', { message: 'An unexpected error occurred: ' + error.message })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const progress = ((currentStep + 1) / STEPS.length) * 100
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Tournament</h1>
        <p className="text-muted-foreground">Set up your tournament in just a few steps</p>
        
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Step {currentStep + 1} of {STEPS.length}</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        <div className="flex items-center justify-center mt-6 space-x-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const isActive = index === currentStep
            const isCompleted = index < currentStep
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  isActive ? 'border-primary bg-gradient-to-br from-primary to-accent text-white' :
                  isCompleted ? 'border-green-500 bg-gradient-to-br from-green-500 to-emerald-500 text-white' :
                  'border-muted bg-muted text-muted-foreground'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  isActive ? 'text-primary' :
                  isCompleted ? 'text-green-600' :
                  'text-muted-foreground'
                }`}>
                  {step.title}
                </span>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 mx-4 text-muted-foreground" />
                )}
              </div>
            )
          })}
        </div>
      </div>
      
      <form onSubmit={form.handleSubmit(onSubmit)} onKeyDown={(e) => {
        // Prevent form submission on Enter key unless on final step
        if (e.key === 'Enter' && currentStep !== STEPS.length - 1) {
          e.preventDefault()
        }
      }}>
        <Card>
          <CardContent className="p-6">
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <CardTitle className="mb-4">Basic Information</CardTitle>
                  <CardDescription>
                    Give your tournament a name and description that will attract participants.
                  </CardDescription>
                </div>
                
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="name">Tournament Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Spring Championship 2024"
                      {...form.register('name')}
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your tournament, rules, prizes, etc..."
                      rows={4}
                      {...form.register('description')}
                    />
                    {form.formState.errors.description && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.description.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="creatorName">Your Name</Label>
                    <Input
                      id="creatorName"
                      placeholder="Tournament organizer name"
                      {...form.register('creatorName')}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This will be shown as the tournament organizer
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <CardTitle className="mb-4">Game & Format</CardTitle>
                  <CardDescription>
                    Choose the game and tournament format for your competition.
                  </CardDescription>
                </div>
                
                <div className="grid gap-6">
                  <div>
                    <Label>Game *</Label>
                    <Select onValueChange={(value) => {
                      const gameProfile = gameProfiles.find(p => p.game_key === value)
                      form.setValue('game', value)
                      form.setValue('gameProfileId', gameProfile?.id || '')
                      setSelectedGameProfile(gameProfile)

                      // Set defaults based on game profile
                      if (gameProfile) {
                        form.setValue('teamSize', gameProfile.default_team_size)
                        if (gameProfile.game_key === 'league_of_legends') {
                          form.setValue('leagueSettings.map', 'summoners_rift')
                          form.setValue('leagueSettings.draftType', 'tournament_draft')
                        }
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a game" />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingGameProfiles ? (
                          <SelectItem disabled value="loading">Loading games...</SelectItem>
                        ) : gameProfiles.length === 0 ? (
                          <SelectItem disabled value="no-games">No games available</SelectItem>
                        ) : (
                          gameProfiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.game_key}>
                              <div>
                                <div className="font-medium">{profile.game}</div>
                                {profile.description && (
                                  <div className="text-xs text-muted-foreground">{profile.description}</div>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.game && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.game.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label>Tournament Type *</Label>
                    <Select
                      value={watchedValues.tournamentType}
                      onValueChange={(value) => {
                        form.setValue('tournamentType', value)
                        if (value === TOURNAMENT_TYPE.TEAM && selectedGameProfile) {
                          form.setValue('teamSize', selectedGameProfile.default_team_size)
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={TOURNAMENT_TYPE.INDIVIDUAL} className="p-0">
                          <div className="p-3 w-full">
                            <div className="font-medium text-foreground">Individual Tournament</div>
                            <div className="text-xs text-gray-600 mt-1 leading-relaxed">Single players compete</div>
                          </div>
                        </SelectItem>
                        <SelectItem value={TOURNAMENT_TYPE.TEAM} className="p-0">
                          <div className="p-3 w-full">
                            <div className="font-medium text-foreground">Team Tournament</div>
                            <div className="text-xs text-gray-600 mt-1 leading-relaxed">Teams compete against each other</div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {watchedValues.tournamentType === TOURNAMENT_TYPE.TEAM && (
                    <div>
                      <Label>Team Size *</Label>
                      <Select
                        value={String(watchedValues.teamSize)}
                        onValueChange={(value) => form.setValue('teamSize', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 players per team</SelectItem>
                          <SelectItem value="3">3 players per team</SelectItem>
                          <SelectItem value="4">4 players per team</SelectItem>
                          <SelectItem value="5">5 players per team</SelectItem>
                          <SelectItem value="6">6 players per team</SelectItem>
                          <SelectItem value="8">8 players per team</SelectItem>
                          <SelectItem value="10">10 players per team</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedGameProfile && (
                    <Card className="p-4 bg-muted">
                      <h4 className="font-semibold mb-2">{selectedGameProfile.game} Settings</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Recommended Team Size: {selectedGameProfile.default_team_size === 1 ? 'Individual' : `${selectedGameProfile.default_team_size} players`}</p>
                        <p>Supports: {[selectedGameProfile.supports_individual && 'Individual', selectedGameProfile.supports_team && 'Team'].filter(Boolean).join(', ')}</p>
                        {watchedValues.tournamentType === TOURNAMENT_TYPE.TEAM && watchedValues.teamSize !== selectedGameProfile.default_team_size && (
                          <p className="text-yellow-600">⚠️ Your team size differs from the game's recommended size</p>
                        )}
                      </div>
                    </Card>
                  )}

                  {/* League of Legends Specific Settings */}
                  {selectedGameProfile?.game_key === 'league_of_legends' && (
                    <Card className="p-6 border-blue-200 bg-blue-50">
                      <h4 className="font-semibold mb-4 text-blue-900 flex items-center">
                        <Gamepad2 className="h-5 w-5 mr-2" />
                        League of Legends Configuration
                      </h4>

                      <div className="grid gap-4">
                        {/* Map Selection */}
                        <div>
                          <Label>Map *</Label>
                          <Select
                            value={watchedValues.leagueSettings?.map}
                            onValueChange={(value) => form.setValue('leagueSettings.map', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="summoners_rift" className="p-0">
                                <div className="p-3 w-full">
                                  <div className="font-medium text-foreground">Summoner's Rift</div>
                                  <div className="text-xs text-gray-600 mt-1 leading-relaxed">Classic 5v5 map</div>
                                </div>
                              </SelectItem>
                              <SelectItem value="aram" className="p-0">
                                <div className="p-3 w-full">
                                  <div className="font-medium text-foreground">ARAM (Howling Abyss)</div>
                                  <div className="text-xs text-gray-600 mt-1 leading-relaxed">All Random All Mid</div>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Draft Type */}
                        <div>
                          <Label>Draft Type *</Label>
                          <Select
                            value={watchedValues.leagueSettings?.draftType}
                            onValueChange={(value) => form.setValue('leagueSettings.draftType', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tournament_draft" className="p-0">
                                <div className="p-3 w-full">
                                  <div className="font-medium text-foreground">Tournament Draft</div>
                                  <div className="text-xs text-gray-600 mt-1 leading-relaxed">Alternating pick/ban like pro play</div>
                                </div>
                              </SelectItem>
                              <SelectItem value="fearless_draft" className="p-0">
                                <div className="p-3 w-full">
                                  <div className="font-medium text-foreground">Fearless Draft</div>
                                  <div className="text-xs text-gray-600 mt-1 leading-relaxed">Champions can't be picked again in series</div>
                                </div>
                              </SelectItem>
                              <SelectItem value="blind_pick" className="p-0">
                                <div className="p-3 w-full">
                                  <div className="font-medium text-foreground">Blind Pick</div>
                                  <div className="text-xs text-gray-600 mt-1 leading-relaxed">All players pick simultaneously</div>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Draft Details */}
                        {watchedValues.leagueSettings?.draftType === 'tournament_draft' && (
                          <div className="bg-white p-4 rounded border">
                            <h5 className="font-medium mb-2 text-blue-800">Tournament Draft Phases</h5>
                            <div className="text-sm text-blue-700 space-y-1">
                              <p>• Phase 1: Each team bans 3 champions (alternating)</p>
                              <p>• Phase 2: Each team picks 1 champion (alternating)</p>
                              <p>• Phase 3: Each team picks 2 champions (alternating)</p>
                              <p>• Phase 4: Each team bans 2 champions (alternating)</p>
                              <p>• Phase 5: Each team picks 2 champions (alternating)</p>
                            </div>
                          </div>
                        )}

                        {watchedValues.leagueSettings?.draftType === 'fearless_draft' && (
                          <div className="bg-orange-50 p-4 rounded border border-orange-200">
                            <h5 className="font-medium mb-2 text-orange-800">Fearless Draft Rules</h5>
                            <div className="text-sm text-orange-700 space-y-1">
                              <p>• Champions picked in one game cannot be picked again in the series</p>
                              <p>• Each team bans 5 champions simultaneously</p>
                              <p>• Each team picks 5 champions simultaneously</p>
                              <p>• Best suited for Best of 3/5 series</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
                  
                  <div>
                    <Label>Tournament Format *</Label>
                    <Select 
                      value={watchedValues.format} 
                      onValueChange={(value) => form.setValue('format', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={TOURNAMENT_FORMAT.SINGLE_ELIMINATION} className="p-0">
                          <div className="p-3 w-full">
                            <div className="font-medium text-foreground">Single Elimination</div>
                            <div className="text-xs text-gray-600 mt-1 leading-relaxed">One loss = elimination</div>
                          </div>
                        </SelectItem>
                        <SelectItem value={TOURNAMENT_FORMAT.DOUBLE_ELIMINATION} className="p-0">
                          <div className="p-3 w-full">
                            <div className="font-medium text-foreground">Double Elimination</div>
                            <div className="text-xs text-gray-600 mt-1 leading-relaxed">Two losses = elimination</div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Match Format</Label>
                    <Select 
                      value={watchedValues.settings?.matchFormat} 
                      onValueChange={(value) => form.setValue('settings.matchFormat', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={MATCH_FORMAT.BO1}>Best of 1 (Bo1)</SelectItem>
                        <SelectItem value={MATCH_FORMAT.BO3}>Best of 3 (Bo3)</SelectItem>
                        <SelectItem value={MATCH_FORMAT.BO5}>Best of 5 (Bo5)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <CardTitle className="mb-4">Participants</CardTitle>
                  <CardDescription>
                    Configure how many {watchedValues.tournamentType === TOURNAMENT_TYPE.TEAM ? 'teams' : 'participants'} can join and who can participate.
                  </CardDescription>
                </div>
                
                <div className="grid gap-6">
                  <div>
                    <Label htmlFor="maxParticipants">Maximum {watchedValues.tournamentType === TOURNAMENT_TYPE.TEAM ? 'Teams' : 'Participants'} *</Label>
                    <Select 
                      value={watchedValues.maxParticipants?.toString()} 
                      onValueChange={(value) => form.setValue('maxParticipants', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[4, 8, 16, 32, 64, 128].map((size) => (
                          <SelectItem key={size} value={size.toString()}>
                            {size} participants
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {duration && (
                      <div className="mt-2 p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-2 text-sm">
                          <Clock className="h-4 w-4" />
                          <span>Estimated duration: {duration.estimatedHours} hours ({duration.estimatedMatches} matches)</span>
                        </div>
                      </div>
                    )}
                    {watchedValues.tournamentType === TOURNAMENT_TYPE.TEAM && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm text-blue-800">
                          <strong>Team Tournament:</strong> Teams will need to register with {watchedValues.teamSize} players each.
                          Team captains will select their roster and manage match participation.
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label>Who can participate?</Label>
                    <Select
                      value={watchedValues.participationType}
                      onValueChange={(value) => form.setValue('participationType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PARTICIPATION_TYPE.ANYONE} className="p-0">
                          <div className="p-3 w-full">
                            <div className="font-medium text-foreground">Anyone</div>
                            <div className="text-xs text-gray-600 mt-1 leading-relaxed">
                              {watchedValues.tournamentType === TOURNAMENT_TYPE.TEAM
                                ? 'Team captains must be registered, team members can be anyone'
                                : 'No registration required for participants'
                              }
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value={PARTICIPATION_TYPE.REGISTERED_ONLY} className="p-0">
                          <div className="p-3 w-full">
                            <div className="font-medium text-foreground">Registered Users Only</div>
                            <div className="text-xs text-gray-600 mt-1 leading-relaxed">
                              {watchedValues.tournamentType === TOURNAMENT_TYPE.TEAM
                                ? 'All team members must be registered users'
                                : 'Only registered users can participate'
                              }
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Explanatory note for team tournaments */}
                    {watchedValues.tournamentType === TOURNAMENT_TYPE.TEAM && (
                      <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200">
                        <div className="text-sm text-blue-800">
                          <strong>Team Tournament Rules:</strong>
                          <ul className="mt-1 ml-4 list-disc space-y-1">
                            <li>Team captains are always required to be registered users</li>
                            <li>
                              {watchedValues.participationType === PARTICIPATION_TYPE.ANYONE
                                ? 'Team members can be invited by username or email (unregistered users can join via invite links)'
                                : 'All team members must have registered accounts to participate'
                              }
                            </li>
                            <li>Captains manage their team roster and make match-related decisions</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label>Seeding Method</Label>
                    <Select 
                      value={watchedValues.seedingType} 
                      onValueChange={(value) => form.setValue('seedingType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SEEDING_TYPE.RANDOM}>
                          Random Seeding
                        </SelectItem>
                        <SelectItem value={SEEDING_TYPE.MANUAL}>
                          Manual Seeding (you choose)
                        </SelectItem>
                        <SelectItem value={SEEDING_TYPE.RANKED}>
                          Ranked Seeding (by user rankings)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <Label htmlFor="password">Tournament Password (Optional)</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Leave empty for public tournament"
                      {...form.register('password')}
                    />
                    <div className="flex items-center space-x-2 mt-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Add a password to make your tournament private
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <CardTitle className="mb-4">Tournament Settings</CardTitle>
                  <CardDescription>
                    Configure additional settings and rules for your tournament.
                  </CardDescription>
                </div>
                
                <div className="grid gap-6">
                  <div>
                    <Label htmlFor="rules">Tournament Rules</Label>
                    <Textarea
                      id="rules"
                      placeholder="Describe specific rules, restrictions, or guidelines..."
                      rows={4}
                      {...form.register('settings.rules')}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="prizeInfo">Prize Information</Label>
                    <Textarea
                      id="prizeInfo"
                      placeholder="Describe prizes, rewards, or recognition for winners..."
                      rows={3}
                      {...form.register('settings.prizeInfo')}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Match Settings</h4>
                    <div className="grid gap-3">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          {...form.register('settings.allowForfeits')}
                          className="rounded"
                        />
                        <span className="text-sm">Allow forfeits</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          {...form.register('settings.scoreConfirmationRequired')}
                          className="rounded"
                        />
                        <span className="text-sm">Require score confirmation from both players</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          {...form.register('settings.checkInRequired')}
                          className="rounded"
                        />
                        <span className="text-sm">Require participant check-in before tournament starts</span>
                      </label>
                    </div>
                  </div>

                  <Separator />

                  
                  <Card className="p-4 bg-muted">
                    <h4 className="font-semibold mb-2">Tournament Summary</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Name:</strong> {watchedValues.name || 'Untitled Tournament'}</p>
                      <p><strong>Game:</strong> {selectedGameProfile?.game || 'Not selected'}</p>
                      <p><strong>Type:</strong> {watchedValues.tournamentType === TOURNAMENT_TYPE.TEAM ? 'Team Tournament' : 'Individual Tournament'}</p>
                      <p><strong>Format:</strong> {watchedValues.format?.replace('_', ' ') || 'Single Elimination'}</p>
                      <p><strong>Participants:</strong> Up to {watchedValues.maxParticipants} {watchedValues.tournamentType === TOURNAMENT_TYPE.TEAM ? 'teams' : 'players'}</p>
                      {watchedValues.tournamentType === TOURNAMENT_TYPE.TEAM && (
                        <p><strong>Team Size:</strong> {watchedValues.teamSize} players per team</p>
                      )}
                      <p><strong>Participation:</strong> {
                        watchedValues.tournamentType === TOURNAMENT_TYPE.TEAM ? (
                          watchedValues.participationType === PARTICIPATION_TYPE.ANYONE
                            ? 'Captains must be registered, members can be anyone'
                            : 'All team members must be registered'
                        ) : (
                          watchedValues.participationType === PARTICIPATION_TYPE.ANYONE
                            ? 'Anyone can join'
                            : 'Registered users only'
                        )
                      }</p>
                      <p><strong>Match Format:</strong> {watchedValues.settings?.matchFormat?.toUpperCase() || 'BO1'}</p>
                      {duration && (
                        <p><strong>Estimated Duration:</strong> {duration.estimatedHours} hours</p>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {form.formState.errors.root && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
          </div>
        )}
        
        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <div className="flex space-x-2">
            {currentStep < STEPS.length - 1 ? (
              <Button type="button" onClick={nextStep}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                onClick={() => {
                  console.log('Submit button clicked!')
                  console.log('Form valid:', form.formState.isValid)
                  console.log('Form errors:', form.formState.errors)
                  console.log('Form values:', form.getValues())
                  console.log('Selected game profile:', selectedGameProfile)
                }}
              >
                {isSubmitting ? 'Creating Tournament...' : 'Create Tournament'}
                <Trophy className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}