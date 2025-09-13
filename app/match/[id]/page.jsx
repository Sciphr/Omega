'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft,
  Timer,
  Users,
  Eye,
  Play,
  Trophy,
  Clock,
  Shield,
  Target,
  AlertCircle,
  CheckCircle,
  X,
  Gamepad2,
  Copy,
  Plus,
  Minus,
  Crown,
  Link as LinkIcon,
  Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function MatchPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [match, setMatch] = useState(null)
  const [tournament, setTournament] = useState(null)
  const [phases, setPhases] = useState([])
  const [currentPhase, setCurrentPhase] = useState(null)
  const [selections, setSelections] = useState({})
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Access control
  const [hasParticipantAccess, setHasParticipantAccess] = useState(false)
  const [isSpectator, setIsSpectator] = useState(false)
  const [isTournamentCreator, setIsTournamentCreator] = useState(false)
  const [currentParticipant, setCurrentParticipant] = useState(null)
  
  // UI states
  const [showStartMatchModal, setShowStartMatchModal] = useState(false)
  const [showReportScoreModal, setShowReportScoreModal] = useState(false)
  const [showAccessLinksModal, setShowAccessLinksModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  
  // Scoring states
  const [scores, setScores] = useState({ participant1: 0, participant2: 0 })
  const [reportingScore, setReportingScore] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  
  // Score submission states
  const [submissionScores, setSubmissionScores] = useState({ participant1: 0, participant2: 0 })
  const [submissionNotes, setSubmissionNotes] = useState('')
  const [isSubmittingScore, setIsSubmittingScore] = useState(false)
  const [scoreSubmissions, setScoreSubmissions] = useState([])
  const [currentSubmission, setCurrentSubmission] = useState(null)
  const [showCounterProposeModal, setShowCounterProposeModal] = useState(null)
  
  // Ready states
  const [participant1Ready, setParticipant1Ready] = useState(false)
  const [participant2Ready, setParticipant2Ready] = useState(false)
  const [isMarkingReady, setIsMarkingReady] = useState(false)
  const [realtimeChannel, setRealtimeChannel] = useState(null)
  
  // Get access token from URL params
  const accessToken = searchParams.get('token')

  useEffect(() => {
    loadMatch()
    loadScoreSubmissions()
    
    // Set up real-time updates if we have access
    if (accessToken || isSpectator) {
      const cleanup = setupRealTimeUpdates()
      return cleanup
    }
  }, [params.id, accessToken])

  // Cleanup real-time channel on unmount
  useEffect(() => {
    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel)
      }
    }
  }, [])

  useEffect(() => {
    // Timer for phase countdown
    let timer
    if (timeRemaining > 0 && currentPhase?.phase_status === 'active') {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time expired - handle timeout
            handlePhaseTimeout()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [timeRemaining, currentPhase])

  const loadMatch = async () => {
    try {
      setLoading(true)
      
      // Load match with access token if provided
      const url = accessToken 
        ? `/api/matches/${params.id}?token=${accessToken}`
        : `/api/matches/${params.id}`
        
      const response = await fetch(url)
      const result = await response.json()
      
      if (!result.success) {
        setError(result.error)
        return
      }
      
      setMatch(result.match)
      setTournament(result.tournament)
      setPhases(result.phases || [])
      setCurrentPhase(result.currentPhase)
      setSelections(result.selections || {})
      setTimeRemaining(result.timeRemaining || 0)
      setHasParticipantAccess(result.hasParticipantAccess || false)
      setIsSpectator(result.isSpectator || false)
      setIsTournamentCreator(result.isTournamentCreator || false)
      setCurrentParticipant(result.currentParticipant)
      
      // Initialize scores if match has score data
      if (result.match.score) {
        setScores(result.match.score)
      }
      
      // Initialize ready states
      setParticipant1Ready(result.match.participant1_ready || false)
      setParticipant2Ready(result.match.participant2_ready || false)
      
    } catch (error) {
      console.error('Failed to load match:', error)
      setError('Failed to load match')
    } finally {
      setLoading(false)
    }
  }

  const setupRealTimeUpdates = () => {
    if (!params.id) return

    // Set up real-time subscription for match updates
    const channel = supabase
      .channel(`match-${params.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${params.id}`,
        },
        (payload) => {
          console.log('Match update received:', payload)
          if (payload.new) {
            setMatch(prev => ({ ...prev, ...payload.new }))
            setParticipant1Ready(payload.new.participant1_ready || false)
            setParticipant2Ready(payload.new.participant2_ready || false)
            
            if (payload.new.score) {
              setScores(payload.new.score)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_ready_events',
          filter: `match_id=eq.${params.id}`,
        },
        (payload) => {
          console.log('Ready event received:', payload)
          // Reload match data to get latest ready states
          loadMatch()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'score_submissions',
          filter: `match_id=eq.${params.id}`,
        },
        (payload) => {
          console.log('Score submission update received:', payload)
          // Reload score submissions and match data
          loadScoreSubmissions()
          loadMatch()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'score_verification_actions',
          filter: `match_id=eq.${params.id}`,
        },
        (payload) => {
          console.log('Score verification action received:', payload)
          // Reload score submissions and match data
          loadScoreSubmissions()
          loadMatch()
        }
      )
      .subscribe()

    setRealtimeChannel(channel)

    // Cleanup function
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }

  const handleToggleReady = async () => {
    if (!hasParticipantAccess || !currentParticipant) return
    
    setIsMarkingReady(true)
    try {
      const isCurrentlyReady = currentParticipant.id === match.participant1_id ? participant1Ready : participant2Ready
      
      const response = await fetch(`/api/matches/${params.id}/ready`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          credentials: 'include',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        },
        body: JSON.stringify({ ready: !isCurrentlyReady })
      })
      
      const result = await response.json()
      
      console.log('Ready API response:', result)
      
      if (result.success) {
        console.log('Ready status updated:', result.message)
        // Fallback: manually reload match data since real-time isn't working
        setTimeout(() => {
          loadMatch()
        }, 500)
      } else {
        console.error('Failed to update ready status:', result.error)
        alert('Failed to update ready status: ' + result.error)
      }
    } catch (error) {
      console.error('Failed to update ready status:', error)
      alert('Failed to update ready status. Please try again.')
    } finally {
      setIsMarkingReady(false)
    }
  }

  const handleSubmitScore = async () => {
    if (!hasParticipantAccess || !currentParticipant) return
    
    setIsSubmittingScore(true)
    try {
      const response = await fetch(`/api/matches/${params.id}/score`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          credentials: 'include',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        },
        body: JSON.stringify({ 
          participant1_score: submissionScores.participant1,
          participant2_score: submissionScores.participant2,
          notes: submissionNotes
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        console.log('Score submitted successfully:', result.message)
        alert('Score submitted for verification!')
        // Reset form
        setSubmissionScores({ participant1: 0, participant2: 0 })
        setSubmissionNotes('')
        // Reload match data to show updated status
        setTimeout(() => {
          loadMatch()
          loadScoreSubmissions()
        }, 500)
      } else {
        console.error('Failed to submit score:', result.error)
        alert('Failed to submit score: ' + result.error)
      }
    } catch (error) {
      console.error('Failed to submit score:', error)
      alert('Failed to submit score. Please try again.')
    } finally {
      setIsSubmittingScore(false)
    }
  }

  const loadScoreSubmissions = async () => {
    try {
      const response = await fetch(`/api/matches/${params.id}/score`, {
        headers: {
          credentials: 'include',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setScoreSubmissions(result.submissions || [])
        // Set current submission (most recent pending one)
        const pending = result.submissions?.find(s => s.status === 'pending')
        setCurrentSubmission(pending || null)
      }
    } catch (error) {
      console.error('Failed to load score submissions:', error)
    }
  }

  const handleVerifyScore = async (scoreSubmissionId, actionType, notes = null) => {
    try {
      const response = await fetch(`/api/matches/${params.id}/score/verify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          credentials: 'include',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        },
        body: JSON.stringify({ 
          score_submission_id: scoreSubmissionId,
          action_type: actionType,
          notes
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        console.log('Score verification action successful:', result.message)
        alert(`Score ${actionType} successful!`)
        // Reload match data and submissions
        setTimeout(() => {
          loadMatch()
          loadScoreSubmissions()
        }, 500)
      } else {
        console.error('Failed to verify score:', result.error)
        alert('Failed to verify score: ' + result.error)
      }
    } catch (error) {
      console.error('Failed to verify score:', error)
      alert('Failed to verify score. Please try again.')
    }
  }

  const handleCreatorFinalizeScore = async () => {
    if (!isTournamentCreator) return
    
    setReportingScore(true)
    try {
      // Create a score submission as tournament creator and finalize it immediately
      const submitResponse = await fetch(`/api/matches/${params.id}/score`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          credentials: 'include'
        },
        body: JSON.stringify({ 
          participant1_score: scores.participant1,
          participant2_score: scores.participant2,
          notes: 'Tournament creator direct score entry'
        })
      })
      
      const submitResult = await submitResponse.json()
      
      if (submitResult.success) {
        // Immediately finalize the score submission
        const finalizeResponse = await fetch(`/api/matches/${params.id}/score/verify`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            credentials: 'include'
          },
          body: JSON.stringify({ 
            score_submission_id: submitResult.scoreSubmission.id,
            action_type: 'creator_finalize',
            notes: 'Tournament creator direct finalization'
          })
        })
        
        const finalizeResult = await finalizeResponse.json()
        
        if (finalizeResult.success) {
          console.log('Score finalized successfully by tournament creator')
          alert('Match score finalized!')
          // Reload match data
          setTimeout(() => {
            loadMatch()
            loadScoreSubmissions()
          }, 500)
        } else {
          console.error('Failed to finalize score:', finalizeResult.error)
          alert('Failed to finalize score: ' + finalizeResult.error)
        }
      } else {
        console.error('Failed to submit score:', submitResult.error)
        alert('Failed to submit score: ' + submitResult.error)
      }
    } catch (error) {
      console.error('Failed to finalize score:', error)
      alert('Failed to finalize score. Please try again.')
    } finally {
      setReportingScore(false)
    }
  }

  const handleStartMatch = async () => {
    if (!isTournamentCreator) return
    
    try {
      const response = await fetch(`/api/matches/${params.id}/start`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          credentials: 'include'
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setShowStartMatchModal(false)
        // Update will come via real-time subscription
        console.log(result.message)
      } else {
        console.error('Failed to start match:', result.error)
        alert('Failed to start match: ' + result.error)
      }
    } catch (error) {
      console.error('Failed to start match:', error)
      alert('Failed to start match. Please try again.')
    }
  }

  const handleMakeSelection = async (selectionData) => {
    if (!hasParticipantAccess || !currentPhase || !canMakeSelection()) return
    
    try {
      const response = await fetch(`/api/matches/${params.id}/phases/${currentPhase.id}/select`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(selectionData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        setSelections(result.selections)
        setCurrentPhase(result.currentPhase)
        setTimeRemaining(result.timeRemaining || 0)
      } else {
        console.error('Failed to make selection:', result.error)
      }
    } catch (error) {
      console.error('Failed to make selection:', error)
    }
  }

  const handleSkipPhase = async () => {
    if (!hasParticipantAccess || !currentPhase?.is_optional) return
    
    try {
      const response = await fetch(`/api/matches/${params.id}/phases/${currentPhase.id}/skip`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${accessToken}`
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setCurrentPhase(result.currentPhase)
        setTimeRemaining(result.timeRemaining || 0)
      }
    } catch (error) {
      console.error('Failed to skip phase:', error)
    }
  }

  const handlePhaseTimeout = async () => {
    // Handle automatic phase progression when time runs out
    try {
      const response = await fetch(`/api/matches/${params.id}/phases/${currentPhase.id}/timeout`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${accessToken}`
        }
      })
      
      if (response.ok) {
        loadMatch() // Reload match state
      }
    } catch (error) {
      console.error('Failed to handle phase timeout:', error)
    }
  }

  const canMakeSelection = () => {
    if (!currentPhase || !hasParticipantAccess || !currentParticipant) return false
    
    // Check if it's this participant's turn
    return currentPhase.current_turn_participant_id === currentParticipant.id ||
           !currentPhase.turn_based // If not turn-based, anyone can select
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const updateScore = (participant, increment) => {
    const maxWins = getMaxWins()
    setScores(prev => {
      const newScores = { ...prev }
      if (increment) {
        if (newScores[participant] < maxWins) {
          newScores[participant] = Math.min(newScores[participant] + 1, maxWins)
        }
      } else {
        newScores[participant] = Math.max(newScores[participant] - 1, 0)
      }
      return newScores
    })
  }

  const getMaxWins = () => {
    switch (match?.match_format) {
      case 'bo3': return 2
      case 'bo5': return 3
      case 'bo1':
      default: return 1
    }
  }

  const getWinner = () => {
    const maxWins = getMaxWins()
    if (scores.participant1 === maxWins) return match.participant1_id
    if (scores.participant2 === maxWins) return match.participant2_id
    return null
  }

  const handleReportScore = async () => {
    const winner = getWinner()
    if (!winner || !isTournamentCreator) return

    setReportingScore(true)
    try {
      const response = await fetch(`/api/matches/${params.id}/score`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          credentials: 'include'
        },
        body: JSON.stringify({
          score: scores,
          winner_id: winner
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setMatch(prev => ({ 
          ...prev, 
          status: 'completed',
          winner_id: winner,
          score: scores,
          completed_at: new Date().toISOString()
        }))
        setShowReportScoreModal(false)
      } else {
        console.error('Failed to report score:', result.error)
      }
    } catch (error) {
      console.error('Failed to report score:', error)
    } finally {
      setReportingScore(false)
    }
  }

  const generateAccessLinks = async () => {
    try {
      const response = await fetch(`/api/matches/${params.id}/generate-access-links`, {
        method: 'POST',
        credentials: 'include'
      })
      
      const result = await response.json()
      
      if (result.success) {
        console.log('Access links generated successfully')
        return true
      } else {
        console.error('Failed to generate access links:', result.error)
        return false
      }
    } catch (error) {
      console.error('Failed to generate access links:', error)
      return false
    }
  }

  const copyAccessLink = async (participantId) => {
    // Get the access link for this participant
    try {
      let response = await fetch(`/api/matches/${params.id}/access-link/${participantId}`, {
        credentials: 'include'
      })
      
      let result = await response.json()
      
      // If no access link exists, try to generate them
      if (!result.success && result.error.includes('No active access link found')) {
        console.log('No access links found, generating...')
        const generated = await generateAccessLinks()
        if (generated) {
          // Try again after generating
          response = await fetch(`/api/matches/${params.id}/access-link/${participantId}`, {
            credentials: 'include'
          })
          result = await response.json()
        }
      }
      
      if (result.success && result.accessLink) {
        const fullUrl = `${window.location.origin}/match/${params.id}?token=${result.accessLink.access_token}`
        await navigator.clipboard.writeText(fullUrl)
        setCopySuccess(participantId)
        setTimeout(() => setCopySuccess(false), 2000)
      } else {
        console.error('Failed to get access link:', result.error)
        alert('Failed to copy access link. Please try again.')
      }
    } catch (error) {
      console.error('Failed to copy access link:', error)
      alert('Failed to copy access link. Please try again.')
    }
  }

  const getPhaseProgress = () => {
    if (!phases.length) return 0
    const completedPhases = phases.filter(p => p.phase_status === 'completed').length
    return Math.round((completedPhases / phases.length) * 100)
  }

  const isMyTurn = () => {
    return currentPhase && hasParticipantAccess && 
           currentPhase.current_turn_participant_id === currentParticipant?.id
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Gamepad2 className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading match...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link href="/tournaments">
            <Button>Browse Tournaments</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Match Not Found</h1>
          <p className="text-muted-foreground mb-4">The match you're looking for doesn't exist.</p>
          <Link href="/tournaments">
            <Button>Browse Tournaments</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href={`/tournament/${tournament?.id}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tournament
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">
                Match {match.match_number}
              </h1>
              <p className="text-muted-foreground">{tournament?.name}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-lg px-3 py-1">
              {match.status}
            </Badge>
            {isTournamentCreator && (
              <Badge variant="default" className="flex items-center bg-amber-600">
                <Crown className="h-3 w-3 mr-1" />
                Tournament Creator
              </Badge>
            )}
            {hasParticipantAccess && !isTournamentCreator && (
              <Badge variant="default" className="flex items-center">
                <Users className="h-3 w-3 mr-1" />
                Participant
              </Badge>
            )}
            {isSpectator && !isTournamentCreator && !hasParticipantAccess && (
              <Badge variant="secondary" className="flex items-center">
                <Eye className="h-3 w-3 mr-1" />
                Spectator
              </Badge>
            )}
            {isTournamentCreator && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAccessLinksModal(true)}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Access Links
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Match Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Participants */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Participants</CardTitle>
                  <div className="flex items-center space-x-2">
                    {match.status === 'pending' && hasParticipantAccess && !isTournamentCreator && (
                      <Button 
                        onClick={handleToggleReady}
                        disabled={isMarkingReady}
                        variant={currentParticipant?.id === match.participant1_id ? 
                          (participant1Ready ? "default" : "outline") : 
                          (participant2Ready ? "default" : "outline")
                        }
                      >
                        {isMarkingReady ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        {currentParticipant?.id === match.participant1_id ? 
                          (participant1Ready ? 'Ready!' : 'Mark Ready') : 
                          (participant2Ready ? 'Ready!' : 'Mark Ready')
                        }
                      </Button>
                    )}
                    {match.status === 'pending' && isTournamentCreator && (
                      <Button onClick={() => setShowStartMatchModal(true)}>
                        <Play className="h-4 w-4 mr-2" />
                        Force Start
                      </Button>
                    )}
                  </div>
                </div>
                {match.status === 'pending' && (participant1Ready || participant2Ready) && (
                  <div className="text-sm text-muted-foreground">
                    {participant1Ready && participant2Ready ? (
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Both participants ready - Starting match...</span>
                      </div>
                    ) : (
                      <span>
                        Waiting for {!participant1Ready && !participant2Ready ? 'both participants' :
                                   !participant1Ready ? match.participant1?.participant_name :
                                   match.participant2?.participant_name} to ready up
                      </span>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {/* Participant 1 */}
                  <Card className={`${isMyTurn() && currentParticipant?.id === match.participant1_id ? 'ring-2 ring-primary' : ''} ${participant1Ready ? 'ring-2 ring-green-500' : ''}`}>
                    <CardContent className="p-4 text-center">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Users className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg">
                        {match.participant1?.participant_name || 'TBD'}
                      </h3>
                      <div className="space-y-1 mt-2">
                        {match.participant1_id === currentParticipant?.id && (
                          <Badge className="bg-blue-600">You</Badge>
                        )}
                        {participant1Ready && match.status === 'pending' && (
                          <Badge className="bg-green-600">Ready!</Badge>
                        )}
                        {match.winner_id === match.participant1_id && (
                          <Badge className="bg-green-600">Winner</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Participant 2 */}
                  <Card className={`${isMyTurn() && currentParticipant?.id === match.participant2_id ? 'ring-2 ring-primary' : ''} ${participant2Ready ? 'ring-2 ring-green-500' : ''}`}>
                    <CardContent className="p-4 text-center">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Users className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg">
                        {match.participant2?.participant_name || 'TBD'}
                      </h3>
                      <div className="space-y-1 mt-2">
                        {match.participant2_id === currentParticipant?.id && (
                          <Badge className="bg-blue-600">You</Badge>
                        )}
                        {participant2Ready && match.status === 'pending' && (
                          <Badge className="bg-green-600">Ready!</Badge>
                        )}
                        {match.winner_id === match.participant2_id && (
                          <Badge className="bg-green-600">Winner</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Participant Score Submission */}
            {match.status === 'in_progress' && hasParticipantAccess && !isTournamentCreator && 
             !scoreSubmissions.some(sub => sub.submitted_by === currentParticipant?.id && sub.status === 'pending') && (
              <Card>
                <CardHeader>
                  <CardTitle>Submit Match Score</CardTitle>
                  <CardDescription>
                    Submit the match results for verification
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center space-y-2">
                        <h3 className="font-semibold">
                          {match.participant1?.participant_name || 'TBD'}
                        </h3>
                        <input
                          type="number"
                          min="0"
                          className="w-full text-center text-2xl font-bold border rounded p-2"
                          value={submissionScores.participant1}
                          onChange={(e) => setSubmissionScores(prev => ({
                            ...prev,
                            participant1: parseInt(e.target.value) || 0
                          }))}
                        />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="font-semibold">
                          {match.participant2?.participant_name || 'TBD'}
                        </h3>
                        <input
                          type="number"
                          min="0"
                          className="w-full text-center text-2xl font-bold border rounded p-2"
                          value={submissionScores.participant2}
                          onChange={(e) => setSubmissionScores(prev => ({
                            ...prev,
                            participant2: parseInt(e.target.value) || 0
                          }))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Notes (optional)</label>
                      <textarea
                        className="w-full border rounded p-2"
                        rows="2"
                        placeholder="Add any notes about the match..."
                        value={submissionNotes}
                        onChange={(e) => setSubmissionNotes(e.target.value)}
                      />
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={handleSubmitScore}
                      disabled={isSubmittingScore}
                    >
                      {isSubmittingScore ? 'Submitting...' : 'Submit Score for Verification'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Already Submitted Message */}
            {match.status === 'in_progress' && hasParticipantAccess && !isTournamentCreator && 
             scoreSubmissions.some(sub => sub.submitted_by === currentParticipant?.id && sub.status === 'pending') && (
              <Card>
                <CardHeader>
                  <CardTitle>Score Submitted</CardTitle>
                  <CardDescription>
                    You have already submitted a score for this match. Waiting for verification.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      ⏳ Awaiting Verification
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Score Verification Timeline */}
            {(match.status === 'in_progress' || match.score_submission_status === 'pending_verification' || match.score_submission_status === 'disputed') && scoreSubmissions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Score Verification</span>
                    {match.score_submission_status === 'pending_verification' && (
                      <Badge variant="outline">Pending Verification</Badge>
                    )}
                    {match.score_submission_status === 'disputed' && (
                      <Badge variant="destructive">Disputed</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {isTournamentCreator ? 'Monitor the score verification process' : 'Track score submissions and verifications'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {scoreSubmissions.map((submission, index) => (
                      <div key={submission.id} className="border rounded p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="font-semibold">
                              {submission.submitted_by_participant?.participant_name} submitted:
                            </div>
                            <Badge variant={submission.status === 'pending' ? 'outline' : 
                                           submission.status === 'final' ? 'default' : 'destructive'}>
                              {submission.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(submission.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <div className="font-medium">{match.participant1?.participant_name}</div>
                            <div className="text-2xl font-bold">{submission.participant1_score}</div>
                          </div>
                          <div>
                            <div className="font-medium">{match.participant2?.participant_name}</div>
                            <div className="text-2xl font-bold">{submission.participant2_score}</div>
                          </div>
                        </div>
                        
                        {submission.notes && (
                          <div className="text-sm bg-gray-50 p-2 rounded">
                            <strong>Notes:</strong> {submission.notes}
                          </div>
                        )}
                        
                        {/* Verification Actions */}
                        {submission.verification_actions && submission.verification_actions.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-sm font-medium">Actions:</div>
                            {submission.verification_actions.map((action, actionIndex) => (
                              <div key={action.id} className="text-sm bg-blue-50 p-2 rounded flex items-center justify-between">
                                <span>
                                  <strong>{action.participant?.participant_name || 'Tournament Creator'}</strong> {action.action_type}
                                  {action.notes && `: ${action.notes}`}
                                </span>
                                <span className="text-gray-500">
                                  {new Date(action.created_at).toLocaleTimeString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Action Buttons for Current Submission */}
                        {submission.status === 'pending' && hasParticipantAccess && !isTournamentCreator && 
                         currentParticipant && submission.submitted_by !== currentParticipant.id && (
                          <div className="flex space-x-2">
                            <Button 
                              size="sm"
                              onClick={() => handleVerifyScore(submission.id, 'accept')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Accept Score
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setShowCounterProposeModal(submission)}
                            >
                              Dispute & Counter-Propose
                            </Button>
                          </div>
                        )}
                        
                        {/* Tournament Creator Override */}
                        {submission.status === 'pending' && isTournamentCreator && (
                          <div className="flex space-x-2">
                            <Button 
                              size="sm"
                              onClick={() => handleVerifyScore(submission.id, 'creator_finalize')}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              Finalize This Score
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tournament Creator Score Input */}
            {match.status === 'in_progress' && isTournamentCreator && (
              <Card>
                <CardHeader>
                  <CardTitle>Tournament Creator - Set Final Score</CardTitle>
                  <CardDescription>
                    Set the final match score directly (bypasses participant verification)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center space-y-2">
                        <h3 className="font-semibold">
                          {match.participant1?.participant_name || 'TBD'}
                        </h3>
                        <input
                          type="number"
                          min="0"
                          className="w-full text-center text-2xl font-bold border rounded p-2"
                          value={scores.participant1}
                          onChange={(e) => setScores(prev => ({
                            ...prev,
                            participant1: parseInt(e.target.value) || 0
                          }))}
                        />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="font-semibold">
                          {match.participant2?.participant_name || 'TBD'}
                        </h3>
                        <input
                          type="number"
                          min="0"
                          className="w-full text-center text-2xl font-bold border rounded p-2"
                          value={scores.participant2}
                          onChange={(e) => setScores(prev => ({
                            ...prev,
                            participant2: parseInt(e.target.value) || 0
                          }))}
                        />
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={handleCreatorFinalizeScore}
                      disabled={reportingScore}
                    >
                      {reportingScore ? 'Finalizing...' : 'Finalize Match Score'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Final Score Display */}
            {match.status === 'completed' && (match.participant1_score !== null || match.participant2_score !== null) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5" />
                    <span>Final Score</span>
                  </CardTitle>
                  <CardDescription>
                    Match completed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center space-y-3">
                      <h3 className="font-semibold text-lg">
                        {match.participant1?.participant_name || 'TBD'}
                      </h3>
                      <div className="text-6xl font-bold">
                        {match.participant1_score ?? 0}
                      </div>
                      {match.winner_id === match.participant1_id && (
                        <Badge className="bg-green-600 text-lg px-4 py-2">🏆 Winner!</Badge>
                      )}
                    </div>
                    <div className="text-center space-y-3">
                      <h3 className="font-semibold text-lg">
                        {match.participant2?.participant_name || 'TBD'}
                      </h3>
                      <div className="text-6xl font-bold">
                        {match.participant2_score ?? 0}
                      </div>
                      {match.winner_id === match.participant2_id && (
                        <Badge className="bg-green-600 text-lg px-4 py-2">🏆 Winner!</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current Phase */}
            {currentPhase && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{currentPhase.phase_name}</span>
                        <Badge variant={currentPhase.phase_type === 'pick' ? 'default' : 'destructive'}>
                          {currentPhase.phase_type}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {isMyTurn() && canMakeSelection() ? 'Your turn to make a selection' : 
                         currentPhase.turn_based ? `Waiting for ${currentPhase.current_turn_participant?.participant_name || 'participant'}` :
                         'Make your selection'}
                      </CardDescription>
                    </div>
                    
                    {timeRemaining > 0 && (
                      <div className="text-right">
                        <div className="flex items-center space-x-2 text-lg font-mono">
                          <Timer className="h-5 w-5" />
                          <span className={timeRemaining <= 10 ? 'text-red-600' : ''}>
                            {formatTime(timeRemaining)}
                          </span>
                        </div>
                        <Progress 
                          value={(timeRemaining / (currentPhase.time_limit_seconds || 30)) * 100} 
                          className="w-32 mt-1"
                        />
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Selection Interface */}
                  <PhaseSelectionInterface 
                    phase={currentPhase}
                    canSelect={canMakeSelection()}
                    onSelect={handleMakeSelection}
                    selections={selections[currentPhase.id] || []}
                    gameType={tournament?.game}
                  />
                  
                  {currentPhase.is_optional && hasParticipantAccess && (
                    <div className="mt-4 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        onClick={handleSkipPhase}
                        className="w-full"
                      >
                        Skip Phase
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Score Reporting (for completed phases or match end) */}
            {match.status === 'ready_for_score' && hasParticipantAccess && (
              <Card>
                <CardHeader>
                  <CardTitle>Match Complete</CardTitle>
                  <CardDescription>
                    All phases completed. Report the match score.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    onClick={() => setShowReportScoreModal(true)}
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Report Score
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Match Progress */}
            {phases.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Match Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Overall Progress</span>
                        <span>{getPhaseProgress()}%</span>
                      </div>
                      <Progress value={getPhaseProgress()} />
                    </div>
                    
                    <div className="space-y-2">
                      {phases.map((phase, index) => (
                        <div key={phase.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              phase.phase_status === 'completed' ? 'bg-green-500' :
                              phase.phase_status === 'active' ? 'bg-blue-500' :
                              'bg-gray-300'
                            }`} />
                            <span className={phase.phase_status === 'active' ? 'font-semibold' : ''}>
                              {phase.phase_name}
                            </span>
                          </div>
                          <Badge 
                            variant={phase.phase_type === 'pick' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {phase.phase_type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Match Info */}
            <Card>
              <CardHeader>
                <CardTitle>Match Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Game:</span>
                  <span className="font-medium">{tournament?.game}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Format:</span>
                  <span className="font-medium">{match.match_format}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Round:</span>
                  <span className="font-medium">{match.round}</span>
                </div>
                {match.scheduled_time && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scheduled:</span>
                    <span className="font-medium">
                      {new Date(match.scheduled_time).toLocaleString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selection History */}
            <SelectionHistory 
              phases={phases}
              selections={selections}
              participants={{
                [match.participant1_id]: match.participant1,
                [match.participant2_id]: match.participant2
              }}
            />
          </div>
        </div>
      </div>

      {/* Start Match Modal */}
      {showStartMatchModal && (
        <Dialog open={showStartMatchModal} onOpenChange={setShowStartMatchModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start Match</DialogTitle>
              <DialogDescription>
                Are you ready to begin the match? This will start the first phase if configured.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowStartMatchModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleStartMatch}>
                <Play className="h-4 w-4 mr-2" />
                Start Match
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Report Score Modal */}
      {showReportScoreModal && (
        <Dialog open={showReportScoreModal} onOpenChange={setShowReportScoreModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Final Score</DialogTitle>
              <DialogDescription>
                Confirm the final match score. This will complete the match and advance the winner.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold">
                  {match.participant1?.participant_name || 'TBD'} {scores.participant1} - {scores.participant2} {match.participant2?.participant_name || 'TBD'}
                </div>
                <div className="text-lg text-green-600 font-semibold">
                  Winner: {getWinner() === match.participant1_id ? match.participant1?.participant_name : match.participant2?.participant_name}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowReportScoreModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleReportScore} disabled={reportingScore}>
                {reportingScore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Reporting...
                  </>
                ) : (
                  <>
                    <Trophy className="h-4 w-4 mr-2" />
                    Confirm Score
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Access Links Modal */}
      {showAccessLinksModal && (
        <Dialog open={showAccessLinksModal} onOpenChange={setShowAccessLinksModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Match Access Links</DialogTitle>
              <DialogDescription>
                Copy these links to send to participants so they can access the match.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Participant 1 Link */}
              {match.participant1_id && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {match.participant1?.participant_name || 'Participant 1'} Access Link
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => copyAccessLink(match.participant1_id)}
                      className="flex-1 justify-start"
                    >
                      {copySuccess === match.participant1_id ? (
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      Copy Link for {match.participant1?.participant_name}
                    </Button>
                  </div>
                </div>
              )}

              {/* Participant 2 Link */}
              {match.participant2_id && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {match.participant2?.participant_name || 'Participant 2'} Access Link
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => copyAccessLink(match.participant2_id)}
                      className="flex-1 justify-start"
                    >
                      {copySuccess === match.participant2_id ? (
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      Copy Link for {match.participant2?.participant_name}
                    </Button>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> These links provide participant access to this match. Share them securely with the respective participants.
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => setShowAccessLinksModal(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// Phase Selection Interface Component
function PhaseSelectionInterface({ phase, canSelect, onSelect, selections, gameType }) {
  const [selectedItem, setSelectedItem] = useState('')
  
  // This is a flexible selection interface that can be customized per game
  const getSelectionOptions = () => {
    // For now, we'll use a generic text input, but this can be expanded
    // to include game-specific character/champion/agent selectors
    switch (gameType) {
      case 'league_of_legends':
        return (
          <ChampionSelector 
            onSelect={(champion) => setSelectedItem(champion)}
            selected={selectedItem}
            bannedChampions={selections.filter(s => s.selection_type === 'ban')}
          />
        )
      case 'valorant':
        return (
          <AgentSelector 
            onSelect={(agent) => setSelectedItem(agent)}
            selected={selectedItem}
            bannedAgents={selections.filter(s => s.selection_type === 'ban')}
          />
        )
      default:
        return (
          <div className="space-y-4">
            <Label htmlFor="selection">
              {phase.phase_type === 'ban' ? 'Ban Selection' : 'Pick Selection'}
            </Label>
            <Input
              id="selection"
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              placeholder={`Enter ${phase.phase_type} selection...`}
              disabled={!canSelect}
            />
          </div>
        )
    }
  }
  
  const handleSubmitSelection = () => {
    if (!selectedItem || !canSelect) return
    
    onSelect({
      selection_type: phase.phase_type,
      selection_data: { item: selectedItem },
      timestamp: new Date().toISOString()
    })
    
    setSelectedItem('')
  }
  
  return (
    <div className="space-y-4">
      {getSelectionOptions()}
      
      {/* Current selections display */}
      {selections.length > 0 && (
        <div className="space-y-2">
          <Label>Current {phase.phase_type}s:</Label>
          <div className="flex flex-wrap gap-2">
            {selections.map((selection, index) => (
              <Badge key={index} variant="outline">
                {selection.selection_data?.item || 'Unknown'}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {canSelect && (
        <Button 
          onClick={handleSubmitSelection}
          disabled={!selectedItem}
          className="w-full"
        >
          <Target className="h-4 w-4 mr-2" />
          Confirm {phase.phase_type}
        </Button>
      )}
    </div>
  )
}

// Placeholder components for game-specific selectors
function ChampionSelector({ onSelect, selected, bannedChampions }) {
  // TODO: Implement League of Legends champion selector
  const [searchTerm, setSearchTerm] = useState('')
  
  return (
    <div className="space-y-2">
      <Label>Select Champion</Label>
      <Input
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value)
          onSelect(e.target.value)
        }}
        placeholder="Search champions..."
      />
    </div>
  )
}

function AgentSelector({ onSelect, selected, bannedAgents }) {
  // TODO: Implement Valorant agent selector
  const [searchTerm, setSearchTerm] = useState('')
  
  return (
    <div className="space-y-2">
      <Label>Select Agent</Label>
      <Input
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value)
          onSelect(e.target.value)
        }}
        placeholder="Search agents..."
      />
    </div>
  )
}

// Selection History Component
function SelectionHistory({ phases, selections, participants }) {
  if (!phases.length || !Object.keys(selections).length) {
    return null
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Selection History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {phases
            .filter(p => p.phase_status === 'completed')
            .map(phase => (
            <div key={phase.id} className="space-y-2">
              <div className="flex items-center space-x-2">
                <Badge variant={phase.phase_type === 'pick' ? 'default' : 'destructive'}>
                  {phase.phase_type}
                </Badge>
                <span className="font-medium text-sm">{phase.phase_name}</span>
              </div>
              
              {selections[phase.id]?.map((selection, index) => (
                <div key={index} className="ml-4 flex items-center justify-between text-sm">
                  <span>{participants[selection.participant_id]?.participant_name}</span>
                  <Badge variant="outline">
                    {selection.selection_data?.item || 'Unknown'}
                  </Badge>
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}