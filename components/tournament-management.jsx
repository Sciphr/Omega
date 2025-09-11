'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { 
  Users, 
  Settings, 
  Play, 
  Pause, 
  UserPlus, 
  UserMinus, 
  Trophy, 
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  RotateCcw
} from 'lucide-react'
import { TOURNAMENT_STATUS, PARTICIPANT_STATUS, MATCH_STATUS } from '@/lib/types'

export function TournamentManagement({ 
  tournament, 
  participants, 
  matches, 
  onUpdateTournament,
  onStartTournament,
  onAddParticipant,
  onRemoveParticipant,
  onUpdateParticipant,
  onResetMatch,
  onDeleteTournament
}) {
  const [activeTab, setActiveTab] = useState('overview')
  const [showAddParticipant, setShowAddParticipant] = useState(false)
  const [newParticipantName, setNewParticipantName] = useState('')

  const activeParticipants = participants?.filter(p => p.status === PARTICIPANT_STATUS.ACTIVE) || []
  const eliminatedParticipants = participants?.filter(p => p.status === PARTICIPANT_STATUS.ELIMINATED) || []
  const pendingMatches = matches?.filter(m => m.status === MATCH_STATUS.PENDING) || []
  const completedMatches = matches?.filter(m => m.status === MATCH_STATUS.COMPLETED) || []
  const inProgressMatches = matches?.filter(m => m.status === MATCH_STATUS.IN_PROGRESS) || []

  const canStartTournament = tournament?.status === TOURNAMENT_STATUS.REGISTRATION && 
                            activeParticipants.length >= 4

  const handleAddParticipant = async () => {
    if (!newParticipantName.trim()) return

    try {
      await onAddParticipant({
        participantName: newParticipantName.trim()
      })
      setNewParticipantName('')
      setShowAddParticipant(false)
    } catch (error) {
      console.error('Failed to add participant:', error)
    }
  }

  const handleStartTournament = async () => {
    try {
      await onStartTournament()
    } catch (error) {
      console.error('Failed to start tournament:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Tournament Management</h2>
          <p className="text-muted-foreground">Manage participants, matches, and tournament settings</p>
        </div>
        
        <div className="flex space-x-2">
          {canStartTournament && (
            <Button onClick={handleStartTournament} size="lg">
              <Play className="h-4 w-4 mr-2" />
              Start Tournament
            </Button>
          )}
          
          {tournament?.status === TOURNAMENT_STATUS.IN_PROGRESS && (
            <Button variant="outline">
              <Pause className="h-4 w-4 mr-2" />
              Pause Tournament
            </Button>
          )}
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="lg">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Tournament
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the tournament
                  and all associated data including participants and matches.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDeleteTournament} className="bg-red-600 hover:bg-red-700">
                  Delete Tournament
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{activeParticipants.length}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">{pendingMatches.length}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Play className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{inProgressMatches.length}</div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{completedMatches.length}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab 
            tournament={tournament} 
            participants={participants}
            matches={matches}
          />
        </TabsContent>

        <TabsContent value="participants" className="space-y-6">
          <ParticipantsTab 
            participants={participants}
            tournament={tournament}
            onAddParticipant={onAddParticipant}
            onRemoveParticipant={onRemoveParticipant}
            onUpdateParticipant={onUpdateParticipant}
          />
        </TabsContent>

        <TabsContent value="matches" className="space-y-6">
          <MatchesTab 
            matches={matches}
            tournament={tournament}
            onResetMatch={onResetMatch}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <SettingsTab 
            tournament={tournament}
            onUpdateTournament={onUpdateTournament}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function OverviewTab({ tournament, participants, matches }) {
  const progressPercentage = tournament ? 
    (tournament.current_participants / tournament.max_participants) * 100 : 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tournament Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Status</span>
            <Badge variant={tournament?.status === 'in_progress' ? 'default' : 'secondary'}>
              {tournament?.status?.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Participants</span>
              <span>{tournament?.current_participants || 0} / {tournament?.max_participants || 0}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Format</span>
            <span className="capitalize">{tournament?.format?.replace('_', ' ')}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Game</span>
            <span>{tournament?.game}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-sm">
              <div className="flex items-center justify-between">
                <span>Tournament created</span>
                <span className="text-muted-foreground">
                  {tournament?.created_at && new Date(tournament.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            {tournament?.started_at && (
              <div className="text-sm">
                <div className="flex items-center justify-between">
                  <span>Tournament started</span>
                  <span className="text-muted-foreground">
                    {new Date(tournament.started_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
            
            {!tournament?.started_at && tournament?.status === 'registration' && (
              <div className="text-sm text-muted-foreground">
                Waiting for tournament to start...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {tournament?.status === 'registration' && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span>Pre-Tournament Checklist</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckCircle className={`h-4 w-4 ${(tournament?.current_participants || 0) >= 4 ? 'text-green-600' : 'text-muted-foreground'}`} />
                <span className="text-sm">At least 4 participants registered</span>
                <Badge variant="outline">
                  {tournament?.current_participants || 0} / 4 minimum
                </Badge>
              </div>
              
              <div className="flex items-center space-x-3">
                <CheckCircle className={`h-4 w-4 ${tournament?.settings?.rules ? 'text-green-600' : 'text-muted-foreground'}`} />
                <span className="text-sm">Tournament rules defined</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <CheckCircle className={`h-4 w-4 ${tournament?.settings?.match_format ? 'text-green-600' : 'text-muted-foreground'}`} />
                <span className="text-sm">Match format configured</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ParticipantsTab({ participants, tournament, onAddParticipant, onRemoveParticipant, onUpdateParticipant }) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newParticipantName, setNewParticipantName] = useState('')

  const activeParticipants = participants?.filter(p => p.status === PARTICIPANT_STATUS.ACTIVE) || []
  const eliminatedParticipants = participants?.filter(p => p.status === PARTICIPANT_STATUS.ELIMINATED) || []

  const handleAddParticipant = async () => {
    if (!newParticipantName.trim()) return

    try {
      await onAddParticipant({
        participantName: newParticipantName.trim()
      })
      setNewParticipantName('')
      setShowAddDialog(false)
    } catch (error) {
      console.error('Failed to add participant:', error)
    }
  }

  const canAddParticipants = tournament?.status === TOURNAMENT_STATUS.REGISTRATION &&
                            (tournament?.current_participants || 0) < (tournament?.max_participants || 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Manage Participants</h3>
          <p className="text-muted-foreground">Add, remove, or modify tournament participants</p>
        </div>
        
        {canAddParticipants && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Participant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Participant</DialogTitle>
                <DialogDescription>
                  Add a new participant to the tournament
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="participantName">Participant Name</Label>
                  <Input
                    id="participantName"
                    value={newParticipantName}
                    onChange={(e) => setNewParticipantName(e.target.value)}
                    placeholder="Enter participant name"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddParticipant}>
                    Add Participant
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Participants ({activeParticipants.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {activeParticipants.length > 0 ? (
            <div className="space-y-3">
              {activeParticipants.map((participant) => (
                <ParticipantCard 
                  key={participant.id} 
                  participant={participant}
                  canRemove={tournament?.status === TOURNAMENT_STATUS.REGISTRATION}
                  onRemove={() => onRemoveParticipant(participant.id)}
                  onUpdate={onUpdateParticipant}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No active participants
            </div>
          )}
        </CardContent>
      </Card>

      {eliminatedParticipants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Eliminated Participants ({eliminatedParticipants.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {eliminatedParticipants.map((participant) => (
                <ParticipantCard 
                  key={participant.id} 
                  participant={participant}
                  canRemove={false}
                  onUpdate={onUpdateParticipant}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ParticipantCard({ participant, canRemove, onRemove, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(participant.participant_name)

  const handleUpdate = async () => {
    if (editName.trim() !== participant.participant_name) {
      await onUpdate(participant.id, { participant_name: editName.trim() })
    }
    setIsEditing(false)
  }

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
          <span className="text-sm font-medium">{participant.seed || '?'}</span>
        </div>
        <div>
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleUpdate}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
              className="w-48"
            />
          ) : (
            <div>
              <div className="font-medium">{participant.participant_name}</div>
              {participant.eliminated_at && (
                <div className="text-xs text-muted-foreground">
                  Eliminated {new Date(participant.eliminated_at).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
        </div>
        <Badge variant={participant.status === 'active' ? 'default' : 'secondary'}>
          {participant.status}
        </Badge>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
          <Edit className="h-4 w-4" />
        </Button>
        {canRemove && (
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <UserMinus className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

function MatchesTab({ matches, tournament, onResetMatch }) {
  const pendingMatches = matches?.filter(m => m.status === MATCH_STATUS.PENDING) || []
  const completedMatches = matches?.filter(m => m.status === MATCH_STATUS.COMPLETED) || []

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Match Management</h3>
        <p className="text-muted-foreground">Monitor and manage tournament matches</p>
      </div>

      {pendingMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Matches ({pendingMatches.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingMatches.map((match) => (
                <MatchCard 
                  key={match.id} 
                  match={match}
                  canReset={false}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {completedMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed Matches ({completedMatches.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedMatches.map((match) => (
                <MatchCard 
                  key={match.id} 
                  match={match}
                  canReset={true}
                  onReset={() => onResetMatch(match.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!matches || matches.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No matches available. Start the tournament to generate matches.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MatchCard({ match, canReset, onReset }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center space-x-4">
          <div className="text-sm font-medium">
            Round {match.round} - Match {match.match_number}
          </div>
          <Badge variant={match.status === 'completed' ? 'default' : 'secondary'}>
            {match.status}
          </Badge>
        </div>
        
        <div className="mt-2 text-sm space-y-1">
          <div className={`flex items-center justify-between ${
            match.winner_id === match.participant1_id ? 'font-bold' : ''
          }`}>
            <span>{match.participant1?.participant_name || 'TBD'}</span>
            {match.score && (
              <span className="font-mono">
                {match.score[match.participant1_id] || '0'}
              </span>
            )}
          </div>
          
          <div className={`flex items-center justify-between ${
            match.winner_id === match.participant2_id ? 'font-bold' : ''
          }`}>
            <span>{match.participant2?.participant_name || 'TBD'}</span>
            {match.score && (
              <span className="font-mono">
                {match.score[match.participant2_id] || '0'}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {canReset && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

function SettingsTab({ tournament, onUpdateTournament }) {
  // Settings management implementation would go here
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tournament Settings</CardTitle>
        <CardDescription>
          Configure tournament rules and settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Settings panel coming soon...
        </p>
      </CardContent>
    </Card>
  )
}