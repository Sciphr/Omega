import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { TournamentService } from '@/lib/database'

// Register a team for tournament
export async function POST(request, { params }) {
  try {
    const supabase = await createClient()
    const { id: tournamentId } = await params

    // Get current user (must be team captain)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    const body = await request.json()
    const { user_team_id, roster_assignments, password } = body

    // Validate input
    if (!user_team_id || !roster_assignments || !Array.isArray(roster_assignments)) {
      return NextResponse.json({
        success: false,
        error: 'Team ID and roster assignments are required'
      }, { status: 400 })
    }

    // Validate roster assignments is not empty
    if (roster_assignments.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'At least one team member is required'
      }, { status: 400 })
    }

    // Get tournament details
    const tournamentResult = await TournamentService.getTournament(tournamentId)
    if (!tournamentResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: tournamentResult.error 
      }, { status: 404 })
    }

    const tournament = tournamentResult.tournament

    // Validate tournament status
    if (tournament.status !== 'registration') {
      return NextResponse.json({
        success: false,
        error: 'Tournament registration is closed'
      }, { status: 400 })
    }

    // Validate team size requirements
    const requiredTeamSize = tournament.team_size || 5 // Default to 5 if not set
    if (roster_assignments.length < requiredTeamSize) {
      return NextResponse.json({
        success: false,
        error: `Team must have at least ${requiredTeamSize} members. Current roster has ${roster_assignments.length} members.`
      }, { status: 400 })
    }

    if (roster_assignments.length > requiredTeamSize) {
      return NextResponse.json({
        success: false,
        error: `Team cannot have more than ${requiredTeamSize} members. Current roster has ${roster_assignments.length} members.`
      }, { status: 400 })
    }

    // Validate password if required
    if (tournament.password_hash && password) {
      // TODO: Add password validation logic
    }

    // Get user team details and verify captain
    const { data: userTeam, error: teamError } = await supabase
      .from('user_teams')
      .select('*')
      .eq('id', user_team_id)
      .eq('captain_id', user.id)
      .single()

    if (teamError || !userTeam) {
      return NextResponse.json({ 
        success: false, 
        error: 'Team not found or you are not the captain' 
      }, { status: 403 })
    }

    // Create tournament team entry
    const { data: tournamentTeam, error: tournamentTeamError } = await supabase
      .from('teams')
      .insert({
        tournament_id: tournamentId,
        name: userTeam.name,
        tag: userTeam.tag || null,
        captain_id: user.id,
        captain_name: user.email?.split('@')[0] || 'Captain',
        user_team_id: user_team_id,
        status: 'active'
      })
      .select()
      .single()

    if (tournamentTeamError) {
      console.error('Error creating tournament team:', tournamentTeamError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to register team' 
      }, { status: 500 })
    }

    // Create participant entries for each roster member
    const participantPromises = roster_assignments.map(async (member) => {
      let finalUserId = member.user_id

      if (!finalUserId) {
        // Create a temporary/guest user record using service client to bypass RLS
        const serviceClient = createServiceClient()
        const { data: guestUser, error: guestError } = await serviceClient
          .from('users')
          .insert({
            username: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@temp.local`,
            display_name: member.participant_name,
            is_verified: false
          })
          .select()
          .single()

        if (guestError) throw guestError
        finalUserId = guestUser.id
      }

      const participantData = {
        tournament_id: tournamentId,
        team_id: tournamentTeam.id,
        user_id: finalUserId,
        participant_name: member.participant_name,
        participant_type: 'team',
        email: member.email || null,
        receives_match_access: member.receives_match_access || false,
        contact_method: member.email ? 'email' : 'none',
        status: 'active'
      }

      const { data, error } = await supabase
        .from('participants')
        .insert(participantData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to add participant ${member.participant_name}: ${error.message}`)
      }

      return data
    })

    const participants = await Promise.all(participantPromises)

    // Update tournament participant count
    await supabase
      .from('tournaments')
      .update({ 
        current_participants: (tournament.current_participants || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', tournamentId)

    return NextResponse.json({
      success: true,
      tournament_team: tournamentTeam,
      participants: participants
    })

  } catch (error) {
    console.error('Team registration error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}