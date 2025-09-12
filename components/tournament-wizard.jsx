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
import { TOURNAMENT_FORMAT, PARTICIPATION_TYPE, SEEDING_TYPE, MATCH_FORMAT, GAME_TEMPLATES } from '@/lib/types'
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
  const router = useRouter()
  const { user, session, loading, initialized } = useAuthStore()

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
  
  const form = useForm({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: {
      name: '',
      description: '',
      game: '',
      format: TOURNAMENT_FORMAT.SINGLE_ELIMINATION,
      maxParticipants: 16,
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
        rules: '',
        prizeInfo: '',
      }
    }
  })
  
  const watchedValues = form.watch()
  const currentGame = Object.values(GAME_TEMPLATES).find(g => g.id === watchedValues.game)
  const duration = calculateTournamentDuration(watchedValues.maxParticipants, watchedValues.format)
  
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
      console.log('Creating tournament:', data)
      
      if (!session?.access_token) {
        throw new Error('No access token available')
      }
      
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

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
      form.setError('root', { message: 'An unexpected error occurred' })
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
                    <Select onValueChange={(value) => form.setValue('game', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a game" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(GAME_TEMPLATES).map((game) => (
                          <SelectItem key={game.id} value={game.id}>
                            <span>{game.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.game && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.game.message}</p>
                    )}
                  </div>
                  
                  {currentGame && (
                    <Card className="p-4 bg-muted">
                      <h4 className="font-semibold mb-2">{currentGame.name} Settings</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Team Size: {currentGame.teamSize === 1 ? 'Individual' : `${currentGame.teamSize} players`}</p>
                        <p>Default Format: {currentGame.defaultFormat.toUpperCase()}</p>
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
                        <SelectItem value={TOURNAMENT_FORMAT.SINGLE_ELIMINATION}>
                          <div>
                            <div className="font-medium">Single Elimination</div>
                            <div className="text-xs text-muted-foreground">One loss = elimination</div>
                          </div>
                        </SelectItem>
                        <SelectItem value={TOURNAMENT_FORMAT.DOUBLE_ELIMINATION}>
                          <div>
                            <div className="font-medium">Double Elimination</div>
                            <div className="text-xs text-muted-foreground">Two losses = elimination</div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Match Format</Label>
                    <Select 
                      value={watchedValues.settings?.matchFormat || currentGame?.defaultFormat} 
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
                    Configure how many participants can join and who can participate.
                  </CardDescription>
                </div>
                
                <div className="grid gap-6">
                  <div>
                    <Label htmlFor="maxParticipants">Maximum Participants *</Label>
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
                        <SelectItem value={PARTICIPATION_TYPE.ANYONE}>
                          Anyone (no registration required)
                        </SelectItem>
                        <SelectItem value={PARTICIPATION_TYPE.REGISTERED_ONLY}>
                          Registered users only
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
                      <p><strong>Game:</strong> {currentGame?.name || 'Not selected'}</p>
                      <p><strong>Format:</strong> {watchedValues.format?.replace('_', ' ') || 'Single Elimination'}</p>
                      <p><strong>Participants:</strong> Up to {watchedValues.maxParticipants}</p>
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
              <Button type="submit" disabled={isSubmitting}>
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