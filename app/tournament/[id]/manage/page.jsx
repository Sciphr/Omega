'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft,
  Settings,
  Plus,
  Trash2,
  Edit,
  GripVertical,
  Timer,
  Users,
  Gamepad2,
  Shield,
  Eye,
  Save,
  X,
  Copy,
  ExternalLink,
  Trophy
} from 'lucide-react'

export default function TournamentManagePage() {
  const params = useParams()
  const router = useRouter()
  const [tournament, setTournament] = useState(null)
  const [phases, setPhases] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [showAddPhaseModal, setShowAddPhaseModal] = useState(false)
  const [editingPhase, setEditingPhase] = useState(null)

  // New phase form data
  const [newPhase, setNewPhase] = useState({
    phase_name: '',
    phase_type: 'pick',
    max_selections: 1,
    time_limit_seconds: 30,
    turn_based: true,
    is_optional: false
  })

  useEffect(() => {
    loadTournament()
    loadPhases()
  }, [params.id])

  const loadTournament = async () => {
    try {
      const response = await fetch(`/api/tournaments/${params.id}`)
      const result = await response.json()
      
      if (result.success) {
        setTournament(result.tournament)
      } else {
        console.error('Failed to load tournament:', result.error)
      }
    } catch (error) {
      console.error('Failed to load tournament:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPhases = async () => {
    try {
      const response = await fetch(`/api/tournaments/${params.id}/phases`)
      const result = await response.json()
      
      if (result.success) {
        setPhases(result.phases || [])
      } else {
        console.error('Failed to load phases:', result.error)
      }
    } catch (error) {
      console.error('Failed to load phases:', error)
    }
  }

  const handleAddPhase = async () => {
    if (!newPhase.phase_name.trim()) return

    try {
      setSaving(true)
      const response = await fetch(`/api/tournaments/${params.id}/phases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPhase,
          phase_order: phases.length + 1
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setPhases([...phases, result.phase])
        setShowAddPhaseModal(false)
        setNewPhase({
          phase_name: '',
          phase_type: 'pick',
          max_selections: 1,
          time_limit_seconds: 30,
          turn_based: true,
          is_optional: false
        })
      } else {
        console.error('Failed to add phase:', result.error)
      }
    } catch (error) {
      console.error('Failed to add phase:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePhase = async (phaseId, updates) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/tournaments/${params.id}/phases/${phaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      const result = await response.json()
      
      if (result.success) {
        setPhases(phases.map(p => p.id === phaseId ? { ...p, ...updates } : p))
      } else {
        console.error('Failed to update phase:', result.error)
      }
    } catch (error) {
      console.error('Failed to update phase:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePhase = async (phaseId) => {
    if (!confirm('Are you sure you want to delete this phase?')) return

    try {
      setSaving(true)
      const response = await fetch(`/api/tournaments/${params.id}/phases/${phaseId}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      
      if (result.success) {
        setPhases(phases.filter(p => p.id !== phaseId))
      } else {
        console.error('Failed to delete phase:', result.error)
      }
    } catch (error) {
      console.error('Failed to delete phase:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleReorderPhases = async (draggedId, targetId) => {
    // Implement drag and drop reordering
    // This would update the phase_order for all affected phases
  }

  const handleTournamentUpdate = async (updates) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/tournaments/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      const result = await response.json()
      
      if (result.success) {
        setTournament(prev => ({ ...prev, ...updates }))
      } else {
        console.error('Failed to update tournament:', result.error)
      }
    } catch (error) {
      console.error('Failed to update tournament:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Settings className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading tournament settings...</p>
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Tournament Not Found</h1>
          <p className="text-muted-foreground mb-4">The tournament you're trying to manage doesn't exist.</p>
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
            <Link href={`/tournament/${params.id}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tournament
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Tournament Settings</h1>
              <p className="text-muted-foreground">{tournament.name}</p>
            </div>
          </div>
          <Badge variant="outline" className="ml-auto">
            {tournament.status}
          </Badge>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="phases">Match Phases</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="permissions">Access Control</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Basic tournament configuration and rules
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Tournament Name</Label>
                    <Input
                      id="name"
                      value={tournament.name}
                      onChange={(e) => setTournament(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter tournament name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="game">Game</Label>
                    <Select 
                      value={tournament.game} 
                      onValueChange={(value) => setTournament(prev => ({ ...prev, game: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select game" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="league_of_legends">League of Legends</SelectItem>
                        <SelectItem value="valorant">Valorant</SelectItem>
                        <SelectItem value="csgo">CS:GO</SelectItem>
                        <SelectItem value="dota2">Dota 2</SelectItem>
                        <SelectItem value="overwatch">Overwatch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    className="w-full min-h-[100px] p-3 border border-input rounded-md bg-background"
                    value={tournament.description || ''}
                    onChange={(e) => setTournament(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your tournament..."
                  />
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleTournamentUpdate({
                      name: tournament.name,
                      game: tournament.game,
                      description: tournament.description
                    })}
                    disabled={saving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="phases">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Match Phases</CardTitle>
                      <CardDescription>
                        Configure draft, pick, and ban phases for matches
                      </CardDescription>
                    </div>
                    <Button onClick={() => setShowAddPhaseModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Phase
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {phases.length === 0 ? (
                    <div className="text-center py-12">
                      <Gamepad2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Match Phases Configured</h3>
                      <p className="text-muted-foreground mb-4">
                        Add pick and ban phases to customize your match experience
                      </p>
                      <Button onClick={() => setShowAddPhaseModal(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Phase
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {phases
                        .sort((a, b) => a.phase_order - b.phase_order)
                        .map((phase, index) => (
                        <Card key={phase.id} className="relative">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                                  <Badge variant="outline">
                                    Phase {index + 1}
                                  </Badge>
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <h4 className="font-semibold">{phase.phase_name}</h4>
                                    <Badge variant={phase.phase_type === 'pick' ? 'default' : 'destructive'}>
                                      {phase.phase_type}
                                    </Badge>
                                    {!phase.is_enabled && (
                                      <Badge variant="secondary">Disabled</Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {phase.max_selections} selection{phase.max_selections !== 1 ? 's' : ''} • 
                                    {phase.time_limit_seconds}s time limit • 
                                    {phase.turn_based ? 'Turn-based' : 'Simultaneous'}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={phase.is_enabled}
                                  onCheckedChange={(checked) => 
                                    handleUpdatePhase(phase.id, { is_enabled: checked })
                                  }
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingPhase(phase)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeletePhase(phase.id)}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {phases.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Phase Preview</CardTitle>
                    <CardDescription>
                      How your match phases will appear to participants
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-center space-x-2 mb-4">
                        <Users className="h-5 w-5 text-primary" />
                        <span className="font-semibold">Match Preview</span>
                      </div>
                      <div className="space-y-2">
                        {phases
                          .filter(p => p.is_enabled)
                          .sort((a, b) => a.phase_order - b.phase_order)
                          .map((phase, index) => (
                          <div key={phase.id} className="flex items-center justify-between p-2 bg-background rounded">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                {index + 1}
                              </Badge>
                              <span className="text-sm font-medium">{phase.phase_name}</span>
                              <Badge 
                                variant={phase.phase_type === 'pick' ? 'default' : 'destructive'}
                                className="text-xs"
                              >
                                {phase.phase_type}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <Timer className="h-3 w-3" />
                              <span>{phase.time_limit_seconds}s</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="matches">
            <MatchManagement tournament={tournament} />
          </TabsContent>

          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle>Access Control</CardTitle>
                <CardDescription>
                  Manage who can participate and spectate matches
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Public Tournament</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow anyone to view this tournament
                    </p>
                  </div>
                  <Switch
                    checked={tournament.is_public}
                    onCheckedChange={(checked) => 
                      handleTournamentUpdate({ is_public: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Match Access Settings</Label>
                  <div className="space-y-4 pl-4 border-l-2 border-muted">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm">Secure Participant Links</Label>
                        <p className="text-sm text-muted-foreground">
                          Generate secure access tokens for match participants
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm">Public Match Viewing</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow spectators to view match progress
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>
                  Advanced tournament configuration options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Real-time Updates</Label>
                  <div className="space-y-4 pl-4 border-l-2 border-muted">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm">WebSocket Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable real-time match updates
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Phase Modal */}
      {showAddPhaseModal && (
        <Dialog open={showAddPhaseModal} onOpenChange={setShowAddPhaseModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Match Phase</DialogTitle>
              <DialogDescription>
                Create a new pick or ban phase for your matches
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phase_name">Phase Name</Label>
                <Input
                  id="phase_name"
                  value={newPhase.phase_name}
                  onChange={(e) => setNewPhase(prev => ({ ...prev, phase_name: e.target.value }))}
                  placeholder="e.g., First Ban, Hero Pick"
                />
              </div>

              <div className="space-y-2">
                <Label>Phase Type</Label>
                <Select 
                  value={newPhase.phase_type} 
                  onValueChange={(value) => setNewPhase(prev => ({ ...prev, phase_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pick">Pick</SelectItem>
                    <SelectItem value="ban">Ban</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_selections">Max Selections</Label>
                  <Input
                    id="max_selections"
                    type="number"
                    min="1"
                    max="10"
                    value={newPhase.max_selections}
                    onChange={(e) => setNewPhase(prev => ({ 
                      ...prev, 
                      max_selections: parseInt(e.target.value) || 1 
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time_limit">Time Limit (seconds)</Label>
                  <Input
                    id="time_limit"
                    type="number"
                    min="10"
                    max="300"
                    value={newPhase.time_limit_seconds}
                    onChange={(e) => setNewPhase(prev => ({ 
                      ...prev, 
                      time_limit_seconds: parseInt(e.target.value) || 30 
                    }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Turn-based</Label>
                  <p className="text-sm text-muted-foreground">
                    Participants alternate selections
                  </p>
                </div>
                <Switch
                  checked={newPhase.turn_based}
                  onCheckedChange={(checked) => setNewPhase(prev => ({ 
                    ...prev, 
                    turn_based: checked 
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Optional</Label>
                  <p className="text-sm text-muted-foreground">
                    Phase can be skipped
                  </p>
                </div>
                <Switch
                  checked={newPhase.is_optional}
                  onCheckedChange={(checked) => setNewPhase(prev => ({ 
                    ...prev, 
                    is_optional: checked 
                  }))}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowAddPhaseModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddPhase}
                  disabled={saving || !newPhase.phase_name.trim()}
                >
                  Add Phase
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// Match Management Component
function MatchManagement({ tournament }) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [accessLinks, setAccessLinks] = useState([])
  const [showAccessLinksModal, setShowAccessLinksModal] = useState(false)

  useEffect(() => {
    loadMatches()
  }, [tournament.id])

  const loadMatches = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournament.id}`)
      const result = await response.json()
      
      if (result.success && result.tournament.matches) {
        setMatches(result.tournament.matches)
      }
    } catch (error) {
      console.error('Failed to load matches:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateAccessLinks = async (matchId) => {
    try {
      const response = await fetch(`/api/matches/${matchId}/access-links`, {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (result.success) {
        setAccessLinks(result.accessLinks)
        setSelectedMatch(result.match)
        setShowAccessLinksModal(true)
      } else {
        console.error('Failed to generate access links:', result.error)
      }
    } catch (error) {
      console.error('Failed to generate access links:', error)
    }
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading matches...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tournament Matches</CardTitle>
          <CardDescription>
            Manage matches and generate participant access links
          </CardDescription>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Matches Yet</h3>
              <p className="text-muted-foreground">
                Matches will appear here once the tournament starts
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => (
                <Card key={match.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">Match {match.match_number}</h4>
                        <div className="text-sm text-muted-foreground">
                          {match.participant1?.participant_name || 'TBD'} vs {match.participant2?.participant_name || 'TBD'}
                        </div>
                        <Badge 
                          variant="outline" 
                          className={
                            match.status === 'completed' ? 'text-green-600 border-green-600' :
                            match.status === 'in_progress' ? 'text-blue-600 border-blue-600' :
                            'text-gray-600 border-gray-600'
                          }
                        >
                          {match.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Link href={`/match/${match.id}`}>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Match
                          </Button>
                        </Link>
                        
                        {(match.participant1_id || match.participant2_id) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateAccessLinks(match.id)}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Participant Links
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Access Links Modal */}
      {showAccessLinksModal && selectedMatch && (
        <Dialog open={showAccessLinksModal} onOpenChange={setShowAccessLinksModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Participant Access Links</DialogTitle>
              <DialogDescription>
                Secure links for Match {selectedMatch.match_number} participants
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">How to use these links:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Send each participant their secure access link</li>
                  <li>• Links expire in 24 hours for security</li>
                  <li>• Participants can view and control match phases</li>
                  <li>• Links work for both registered and manual participants</li>
                </ul>
              </div>

              <div className="space-y-4">
                {accessLinks.map((link, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{link.participant.participant_name}</h4>
                          <div className="text-sm text-muted-foreground">
                            Expires: {new Date(link.expires_at).toLocaleString()}
                          </div>
                          {link.last_used_at && (
                            <div className="text-sm text-green-600">
                              Last used: {new Date(link.last_used_at).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline">Participant</Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Input
                          value={link.accessLink}
                          readOnly
                          className="text-sm font-mono"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(link.accessLink)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(link.accessLink, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setShowAccessLinksModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}