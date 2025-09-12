'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Trophy, 
  Copy,
  Mail,
  ExternalLink,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function MatchLinksPage() {
  const params = useParams()
  const [tournament, setTournament] = useState(null)
  const [matches, setMatches] = useState([])
  const [matchLinks, setMatchLinks] = useState({})
  const [loading, setLoading] = useState(true)
  const [generatingLinks, setGeneratingLinks] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [copySuccess, setCopySuccess] = useState({})

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    try {
      // Get authentication
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      // Fetch tournament details
      const tournamentResponse = await fetch(`/api/tournaments/${params.id}`)
      const tournamentResult = await tournamentResponse.json()

      if (tournamentResult.success) {
        setTournament(tournamentResult.tournament)

        // Only load matches if tournament has started
        if (tournamentResult.tournament.status === 'in_progress') {
          // Fetch existing match access links
          const linksResponse = await fetch(`/api/tournaments/${params.id}/match-links`)
          const linksResult = await linksResponse.json()

          if (linksResult.success) {
            setMatches(linksResult.matches || [])
            setMatchLinks(linksResult.access_links || {})
          }
        }
      }
    } catch (error) {
      console.error('Error loading tournament data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateAllMatchLinks = async () => {
    setGeneratingLinks(true)
    try {
      const response = await fetch(`/api/tournaments/${params.id}/generate-all-match-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const result = await response.json()

      if (result.success) {
        setMatchLinks(result.access_links)
        alert('All match access links generated successfully!')
      } else {
        alert('Failed to generate match links: ' + result.error)
      }
    } catch (error) {
      console.error('Error generating match links:', error)
      alert('Failed to generate match links. Please try again.')
    } finally {
      setGeneratingLinks(false)
    }
  }

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess({ ...copySuccess, [key]: true })
      setTimeout(() => {
        setCopySuccess({ ...copySuccess, [key]: false })
      }, 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const sendEmailToParticipant = async (participantId, matchId) => {
    try {
      const response = await fetch(`/api/matches/${matchId}/send-access-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_id: participantId })
      })

      const result = await response.json()
      
      if (result.success) {
        alert('Email sent successfully!')
      } else {
        alert('Failed to send email: ' + result.error)
      }
    } catch (error) {
      console.error('Error sending email:', error)
      alert('Failed to send email. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading tournament data...</p>
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Tournament Not Found</h1>
          <Link href="/tournaments">
            <Button>Browse Tournaments</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (tournament.creator_id !== currentUser?.id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">Only the tournament creator can access match links.</p>
          <Link href={`/tournament/${params.id}`}>
            <Button>Back to Tournament</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (tournament.status !== 'in_progress') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Tournament Not Started</h1>
          <p className="text-muted-foreground mb-4">Match links are only available for tournaments in progress.</p>
          <Link href={`/tournament/${params.id}`}>
            <Button>Back to Tournament</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Link href={`/tournament/${params.id}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tournament
              </Button>
            </Link>
          </div>
          
          <h1 className="text-3xl font-bold mb-2">Match Access Links</h1>
          <p className="text-muted-foreground">
            Generate and distribute match access links for <strong>{tournament.name}</strong>
          </p>
        </div>

        {/* Generate Links Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Generate Match Links</CardTitle>
            <CardDescription>
              Create secure access links for all tournament matches. Participants use these links to access their matches.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={generateAllMatchLinks}
              disabled={generatingLinks}
              size="lg"
            >
              {generatingLinks ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Links...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Generate All Match Links
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Match Links Display */}
        {Object.keys(matchLinks).length > 0 && (
          <div className="space-y-6">
            {matches.map((match) => {
              const participant1Links = matchLinks[match.id]?.filter(link => 
                link.participant_id === match.participant1_id
              ) || []
              const participant2Links = matchLinks[match.id]?.filter(link => 
                link.participant_id === match.participant2_id
              ) || []

              return (
                <Card key={match.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Trophy className="h-5 w-5" />
                      <span>Match {match.match_number} - Round {match.round}</span>
                    </CardTitle>
                    <CardDescription>
                      {match.participant1?.participant_name || 'TBD'} vs {match.participant2?.participant_name || 'TBD'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Participant 1 */}
                      {participant1Links.map((link, index) => (
                        <div key={`p1-${index}`} className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4" />
                            <span className="font-medium">
                              {match.participant1?.participant_name || 'Participant 1'}
                            </span>
                          </div>
                          
                          <div className="bg-muted p-3 rounded-lg">
                            <Label className="text-xs text-muted-foreground">Access Link</Label>
                            <div className="flex items-center space-x-2 mt-1">
                              <Input
                                readOnly
                                value={`${window.location.origin}/match/${match.id}?token=${link.access_token}`}
                                className="font-mono text-xs"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(
                                  `${window.location.origin}/match/${match.id}?token=${link.access_token}`,
                                  `p1-${match.id}`
                                )}
                              >
                                {copySuccess[`p1-${match.id}`] ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>

                          {match.participant1?.email && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => sendEmailToParticipant(match.participant1_id, match.id)}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Send Email
                            </Button>
                          )}
                        </div>
                      ))}

                      {/* Participant 2 */}
                      {participant2Links.map((link, index) => (
                        <div key={`p2-${index}`} className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4" />
                            <span className="font-medium">
                              {match.participant2?.participant_name || 'Participant 2'}
                            </span>
                          </div>
                          
                          <div className="bg-muted p-3 rounded-lg">
                            <Label className="text-xs text-muted-foreground">Access Link</Label>
                            <div className="flex items-center space-x-2 mt-1">
                              <Input
                                readOnly
                                value={`${window.location.origin}/match/${match.id}?token=${link.access_token}`}
                                className="font-mono text-xs"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(
                                  `${window.location.origin}/match/${match.id}?token=${link.access_token}`,
                                  `p2-${match.id}`
                                )}
                              >
                                {copySuccess[`p2-${match.id}`] ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>

                          {match.participant2?.email && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => sendEmailToParticipant(match.participant2_id, match.id)}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Send Email
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {Object.keys(matchLinks).length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <ExternalLink className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Match Links Generated</h3>
              <p className="text-muted-foreground mb-4">
                Click "Generate All Match Links" to create secure access links for all tournament matches.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}