import { createClient as createServerClient, createServiceClient } from './supabase-server'
import { BracketGenerator, TournamentManager } from './bracket-utils'
import { validateTournamentPassword } from './validations'
import { MATCH_STATUS } from './types'

export class TournamentService {
  static async createTournament(tournamentData, creatorId = null) {
    try {
      const supabase = await createServerClient()
      // Generate unique tournament ID
      const tournamentId = crypto.randomUUID()
      
      // Prepare tournament record
      const tournament = {
        id: tournamentId,
        name: tournamentData.name,
        description: tournamentData.description || null,
        game: tournamentData.game,
        format: tournamentData.format,
        tournament_type: tournamentData.tournamentType || 'individual',
        team_size: tournamentData.teamSize || 1,
        max_participants: tournamentData.maxParticipants,
        participation_type: tournamentData.participationType,
        seeding_type: tournamentData.seedingType,
        password_hash: tournamentData.password || null,
        creator_id: creatorId,
        creator_name: tournamentData.creatorName || null,
        is_public: tournamentData.isPublic,
        settings: tournamentData.settings || {},
        status: 'registration'
      }

      const { data, error } = await supabase
        .from('tournaments')
        .insert(tournament)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        tournament: data,
        url: `/tournament/${tournamentId}`
      }
    } catch (error) {
      console.error('Failed to create tournament:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  static async getTournament(tournamentId) {
    try {
      const supabase = await createServerClient()
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select(`
          *,
          participants!participants_tournament_id_fkey (
            id,
            participant_name,
            participant_type,
            seed,
            status,
            user_id,
            team_id,
            joined_at,
            display_order
          ),
          matches (
            id,
            round,
            match_number,
            bracket_type,
            participant1_id,
            participant2_id,
            winner_id,
            score,
            participant1_score,
            participant2_score,
            status,
            match_format,
            scheduled_time,
            started_at,
            completed_at
          )
        `)
        .eq('id', tournamentId)
        .single()

      if (tournamentError) throw tournamentError

      return {
        success: true,
        tournament
      }
    } catch (error) {
      console.error('Failed to get tournament:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  static async getTournaments(filters = {}) {
    try {
      const supabase = await createServerClient()
      let query = supabase
        .from('tournaments')
        .select(`
          *,
          participants!participants_tournament_id_fkey (count)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.game) {
        query = query.eq('game', filters.game)
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      
      if (filters.format) {
        query = query.eq('format', filters.format)
      }

      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error

      return {
        success: true,
        tournaments: data
      }
    } catch (error) {
      console.error('Failed to get tournaments:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  static async joinTournament(tournamentId, participantData, password = null) {
    try {
      const supabase = await createServerClient()
      // Get tournament details
      const tournamentResult = await this.getTournament(tournamentId)
      if (!tournamentResult.success) {
        throw new Error(tournamentResult.error)
      }

      const tournament = tournamentResult.tournament
      
      // Validate tournament status
      if (tournament.status !== 'registration') {
        throw new Error('Tournament registration is closed')
      }

      // Check if tournament is full
      if (tournament.participants.length >= tournament.max_participants) {
        throw new Error('Tournament is full')
      }

      // Validate password if required
      if (tournament.password_hash && !validateTournamentPassword(password, tournament.password_hash)) {
        throw new Error('Invalid tournament password')
      }

      // Check participation requirements
      if (tournament.participation_type === 'registered_only' && !participantData.userId) {
        throw new Error('Only registered users can join this tournament')
      }

      // Future: Add validation for participant_format when team tournaments are implemented
      // if (tournament.participant_format === 'team' && participantData.participantType === 'individual') {
      //   throw new Error('This tournament only accepts team participants')
      // }

      // Create participant record
      // For guest users (no userId), we need to create a temporary user record
      // or handle this differently to satisfy the database constraint
      let finalUserId = participantData.userId;

      if (!finalUserId) {
        // Create a temporary/guest user record using service client to bypass RLS
        const serviceClient = createServiceClient()
        const { data: guestUser, error: guestError } = await serviceClient
          .from('users')
          .insert({
            username: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@temp.local`,
            display_name: participantData.participantName,
            is_verified: false
          })
          .select()
          .single()

        if (guestError) throw guestError
        finalUserId = guestUser.id
      }

      // Get the next display_order for this tournament
      const { data: maxOrderResult, error: maxOrderError } = await supabase
        .from('participants')
        .select('display_order')
        .eq('tournament_id', tournamentId)
        .order('display_order', { ascending: false })
        .limit(1)
        .single()

      // Handle case where no participants exist yet (maxOrderError will be PGRST116)
      const nextDisplayOrder = (maxOrderResult?.display_order) ? maxOrderResult.display_order + 1 : 1

      let participant = {
        tournament_id: tournamentId,
        user_id: finalUserId,
        participant_name: participantData.participantName,
        participant_type: participantData.participantType || 'individual', // Allow override, default to individual
        status: 'active',
        display_order: nextDisplayOrder
      }

      let teamTournamentEntry = null

      // Handle team tournament entry
      if (participantData.participantType === 'team' && participantData.teamId && participantData.roster) {
        // Create team tournament entry first
        const { data: entryData, error: entryError } = await supabase
          .from('team_tournament_entries')
          .insert({
            tournament_id: tournamentId,
            team_id: participantData.teamId,
            captain_id: participantData.userId,
            roster: participantData.roster,
            status: 'active'
          })
          .select()
          .single()

        if (entryError) throw entryError
        teamTournamentEntry = entryData

        // Link participant to team tournament entry
        participant.team_tournament_entry_id = entryData.id
        participant.team_id = participantData.teamId
      }

      const { data, error } = await supabase
        .from('participants')
        .insert(participant)
        .select()
        .single()

      if (error) throw error

      // Update tournament participant count
      await supabase
        .from('tournaments')
        .update({ 
          current_participants: tournament.participants.length + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', tournamentId)

      return {
        success: true,
        participant: data,
        teamTournamentEntry
      }
    } catch (error) {
      console.error('Failed to join tournament:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  static async startTournament(tournamentId, userId = null) {
    try {
      const supabase = await createServerClient()
      
      const tournamentResult = await this.getTournament(tournamentId)
      if (!tournamentResult.success) {
        throw new Error(tournamentResult.error)
      }

      const tournament = tournamentResult.tournament

      // Verify permissions
      if (tournament.creator_id !== userId) {
        throw new Error('Only tournament creator can start the tournament')
      }

      // Validate minimum participants
      if (tournament.participants.length < 2) {
        throw new Error('At least 2 participants required to start tournament')
      }

      // Generate bracket
      const activeParticipants = tournament.participants.filter(p => p.status === 'active')
      const seededParticipants = TournamentManager.seedParticipants(
        activeParticipants,
        tournament.seeding_type
      )

      let matches = []
      let bracket = null

      if (tournament.format === 'single_elimination') {
        bracket = BracketGenerator.generateSingleElimination(seededParticipants)

        bracket.rounds.forEach(round => {
          round.matches.forEach(match => {
            matches.push({
              id: crypto.randomUUID(),
              tournament_id: tournamentId,
              round: round.roundNumber,
              match_number: match.matchNumber,
              bracket_type: 'winner',
              participant1_id: match.participant1?.id || null,
              participant2_id: match.participant2?.id || null,
              winner_id: match.winner || null,
              status: match.status,
              match_format: tournament.settings?.matchFormat || 'bo1'
            })
          })
        })

      } else if (tournament.format === 'double_elimination') {
        bracket = BracketGenerator.generateDoubleElimination(seededParticipants)

        // Add winner bracket matches
        bracket.winnerBracket.rounds.forEach(round => {
          round.matches.forEach(match => {
            matches.push({
              id: crypto.randomUUID(),
              tournament_id: tournamentId,
              round: round.roundNumber,
              match_number: match.matchNumber,
              bracket_type: 'winner',
              participant1_id: match.participant1?.id || null,
              participant2_id: match.participant2?.id || null,
              winner_id: match.winner || null,
              status: match.status,
              match_format: tournament.settings?.matchFormat || 'bo1'
            })
          })
        })

        // Add loser bracket matches
        bracket.loserBracket.forEach(round => {
          round.matches.forEach(match => {
            matches.push({
              id: crypto.randomUUID(),
              tournament_id: tournamentId,
              round: round.roundNumber,
              match_number: match.matchNumber,
              bracket_type: 'loser',
              participant1_id: match.participant1?.id || null,
              participant2_id: match.participant2?.id || null,
              winner_id: match.winner || null,
              status: match.status,
              match_format: tournament.settings?.matchFormat || 'bo1'
            })
          })
        })

        // Add grand finals match
        matches.push({
          id: crypto.randomUUID(),
          tournament_id: tournamentId,
          round: 1,
          match_number: 1,
          bracket_type: 'grand_final',
          participant1_id: null, // Winner bracket champion
          participant2_id: null, // Loser bracket champion
          winner_id: null,
          status: MATCH_STATUS.PENDING,
          match_format: tournament.settings?.matchFormat || 'bo1'
        })
      }

      // Insert matches
      const { data: createdMatches, error: matchError } = await supabase
        .from('matches')
        .insert(matches)
        .select('id, participant1_id, participant2_id')

      if (matchError) throw matchError

      // Generate access links for all matches
      const accessLinksToCreate = []
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

      createdMatches.forEach(match => {
        if (match.participant1_id) {
          accessLinksToCreate.push({
            match_id: match.id,
            participant_id: match.participant1_id,
            access_token: crypto.randomUUID().replace(/-/g, ''),
            expires_at: expiresAt.toISOString(),
            is_active: true,
            created_at: new Date().toISOString()
          })
        }
        
        if (match.participant2_id) {
          accessLinksToCreate.push({
            match_id: match.id,
            participant_id: match.participant2_id,
            access_token: crypto.randomUUID().replace(/-/g, ''),
            expires_at: expiresAt.toISOString(),
            is_active: true,
            created_at: new Date().toISOString()
          })
        }
      })

      if (accessLinksToCreate.length > 0) {
        const { error: accessLinksError } = await supabase
          .from('match_participant_privileges')
          .insert(accessLinksToCreate)

        if (accessLinksError) {
          console.error('Error creating access links:', accessLinksError)
          // Don't fail the tournament start if access links fail
        }
      }

      // Update tournament status
      const { error: updateError } = await supabase
        .from('tournaments')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
          bracket_data: bracket,
          updated_at: new Date().toISOString()
        })
        .eq('id', tournamentId)

      if (updateError) throw updateError

      return {
        success: true,
        bracket
      }
    } catch (error) {
      console.error('Failed to start tournament:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  static async reportMatchScore(matchId, scoreData, userId = null) {
    try {
      // Get match details
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select(`
          *,
          tournament:tournaments (*),
          participant1:participants!matches_participant1_id_fkey (*),
          participant2:participants!matches_participant2_id_fkey (*)
        `)
        .eq('id', matchId)
        .single()

      if (matchError) throw matchError

      // Verify permissions
      const canReport = userId === match.tournament.creator_id || 
                       userId === match.participant1?.user_id || 
                       userId === match.participant2?.user_id

      if (!canReport) {
        throw new Error('You do not have permission to report this match score')
      }

      // Validate match status
      if (match.status !== 'pending') {
        throw new Error('Match is not in a valid state for score reporting')
      }

      // Update match
      const { error: updateError } = await supabase
        .from('matches')
        .update({
          score: scoreData.score,
          winner_id: scoreData.winnerId,
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId)

      if (updateError) throw updateError

      // Record match event
      await supabase
        .from('match_events')
        .insert({
          match_id: matchId,
          event_type: 'score_update',
          participant_id: scoreData.winnerId,
          event_data: scoreData,
          created_by: userId
        })

      // Update participant status if eliminated
      const loserId = scoreData.winnerId === match.participant1.id 
        ? match.participant2.id 
        : match.participant1.id

      if (match.tournament.format === 'single_elimination') {
        await supabase
          .from('participants')
          .update({
            status: 'eliminated',
            eliminated_at: new Date().toISOString()
          })
          .eq('id', loserId)
      }

      // Check if tournament is complete
      await this.checkTournamentCompletion(match.tournament_id)

      return {
        success: true
      }
    } catch (error) {
      console.error('Failed to report match score:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  static async checkTournamentCompletion(tournamentId) {
    try {
      const { data: matches, error } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: false })
        .order('match_number', { ascending: false })
        .limit(1)

      if (error) throw error

      // Check if final match is completed
      if (matches.length > 0 && matches[0].status === 'completed') {
        await supabase
          .from('tournaments')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', tournamentId)
      }

      return { success: true }
    } catch (error) {
      console.error('Failed to check tournament completion:', error)
      return { success: false, error: error.message }
    }
  }

  static async updateTournament(tournamentId, updates, userId = null) {
    try {
      // Verify permissions
      const { data: tournament, error: permError } = await supabase
        .from('tournaments')
        .select('creator_id')
        .eq('id', tournamentId)
        .single()

      if (permError) throw permError

      if (tournament.creator_id !== userId) {
        throw new Error('Only tournament creator can update the tournament')
      }

      const { error: updateError } = await supabase
        .from('tournaments')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', tournamentId)

      if (updateError) throw updateError

      return { success: true }
    } catch (error) {
      console.error('Failed to update tournament:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  static async deleteTournament(tournamentId, userId = null) {
    try {
      const supabase = await createServerClient()

      // Verify permissions first with regular client
      const { data: tournament, error: permError } = await supabase
        .from('tournaments')
        .select('creator_id, status')
        .eq('id', tournamentId)
        .single()

      if (permError) throw permError

      if (tournament.creator_id !== userId) {
        throw new Error('Only tournament creator can delete the tournament')
      }

      if (tournament.status === 'in_progress') {
        throw new Error('Cannot delete tournament that is in progress')
      }

      // Use service client with elevated permissions for deletion
      const serviceSupabase = await createServiceClient()

      // Delete tournament (cascade should handle related records)
      const { data: deletedData, error: deleteError } = await serviceSupabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId)
        .select()

      console.log('Delete result:', { deletedData, deleteError })

      if (deleteError) {
        console.error('Delete error details:', deleteError)
        throw deleteError
      }

      if (!deletedData || deletedData.length === 0) {
        throw new Error('Tournament not found or could not be deleted')
      }

      return { success: true }
    } catch (error) {
      console.error('Failed to delete tournament:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  static async stopTournament(tournamentId, userId = null, declaredWinnerId = null) {
    try {
      const supabase = await createServerClient()

      // Verify permissions
      const { data: tournament, error: permError } = await supabase
        .from('tournaments')
        .select('creator_id, status')
        .eq('id', tournamentId)
        .single()

      if (permError) throw permError

      if (tournament.creator_id !== userId) {
        throw new Error('Only tournament creator can stop the tournament')
      }

      if (tournament.status === 'completed' || tournament.status === 'archived') {
        throw new Error('Tournament is already finished')
      }

      // If a winner is declared, verify they're a participant in this tournament
      if (declaredWinnerId) {
        const { data: participant, error: participantError } = await supabase
          .from('participants')
          .select('id')
          .eq('id', declaredWinnerId)
          .eq('tournament_id', tournamentId)
          .eq('status', 'active')
          .single()

        if (participantError || !participant) {
          throw new Error('Declared winner must be an active participant in this tournament')
        }
      }

      // Update tournament with manual stop completion
      const updateData = {
        status: 'completed',
        completion_reason: 'manual_stop',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (declaredWinnerId) {
        updateData.declared_winner_id = declaredWinnerId
      }

      const { error: updateError } = await supabase
        .from('tournaments')
        .update(updateData)
        .eq('id', tournamentId)

      if (updateError) throw updateError

      return {
        success: true,
        declaredWinner: declaredWinnerId ? { id: declaredWinnerId } : null
      }
    } catch (error) {
      console.error('Failed to stop tournament:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}