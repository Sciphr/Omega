import { createClient as createServerClient } from './supabase-server'
import { BracketGenerator, TournamentManager } from './bracket-utils'
import { validateTournamentPassword } from './validations'

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
          participants (
            id,
            participant_name,
            participant_type,
            seed,
            status,
            user_id,
            team_id,
            joined_at
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
          participants (count)
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

      // Create participant record
      const participant = {
        tournament_id: tournamentId,
        user_id: participantData.userId || null,
        participant_name: participantData.participantName,
        participant_type: 'individual',
        status: 'active'
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
        participant: data
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

      let bracket
      if (tournament.format === 'single_elimination') {
        bracket = BracketGenerator.generateSingleElimination(seededParticipants)
      } else if (tournament.format === 'double_elimination') {
        bracket = BracketGenerator.generateDoubleElimination(seededParticipants)
      }

      // Create matches in database
      const matches = []
      bracket.rounds.forEach(round => {
        round.matches.forEach(match => {
          matches.push({
            id: crypto.randomUUID(),
            tournament_id: tournamentId,
            round: round.roundNumber,
            match_number: match.matchNumber,
            participant1_id: match.participant1?.id || null,
            participant2_id: match.participant2?.id || null,
            winner_id: match.winner || null,
            status: match.status,
            match_format: tournament.settings?.matchFormat || 'bo1'
          })
        })
      })

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
      // Verify permissions
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

      const { error: deleteError } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId)

      if (deleteError) throw deleteError

      return { success: true }
    } catch (error) {
      console.error('Failed to delete tournament:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}