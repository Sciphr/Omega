import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Get match details with access control
export async function GET(request, { params }) {
  try {
    const supabase = await createClient()
    const { id: matchId } = await params
    const { searchParams } = new URL(request.url)
    const accessToken = searchParams.get('token')

    // Get match with tournament and participant details
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select(`
        *,
        tournament:tournaments(*),
        participant1:participants!matches_participant1_id_fkey(*),
        participant2:participants!matches_participant2_id_fkey(*)
      `)
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ 
        success: false, 
        error: 'Match not found' 
      }, { status: 404 })
    }

    let hasParticipantAccess = false
    let isSpectator = false
    let currentParticipant = null

    // Check access permissions
    if (accessToken) {
      // Verify participant access token
      const { data: privilege, error: privilegeError } = await supabase
        .from('match_participant_privileges')
        .select(`
          *,
          participant:participants(*)
        `)
        .eq('match_id', matchId)
        .eq('access_token', accessToken)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .single()

      if (!privilegeError && privilege) {
        hasParticipantAccess = true
        currentParticipant = privilege.participant
        
        // Update last used timestamp
        await supabase
          .from('match_participant_privileges')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', privilege.id)
      }
    } else {
      // Check if user is authenticated and has spectator access
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Check if user is tournament creator or has spectator access
        isSpectator = match.tournament.creator_id === user.id || match.tournament.is_public
        
        // Check if user is a participant (fallback if no token provided)
        if (match.participant1?.user_id === user.id) {
          currentParticipant = match.participant1
        } else if (match.participant2?.user_id === user.id) {
          currentParticipant = match.participant2
        }
      } else if (match.tournament.is_public) {
        isSpectator = true
      }
    }

    // If no access at all, deny
    if (!hasParticipantAccess && !isSpectator) {
      return NextResponse.json({ 
        success: false, 
        error: 'Access denied. You need a participant link or the tournament must be public.' 
      }, { status: 403 })
    }

    let phases = []
    let currentPhase = null
    let selections = {}
    let timeRemaining = 0

    // Get match phases if match has started
    if (match.status === 'in_progress' || match.status === 'completed') {
      const { data: matchPhases, error: phasesError } = await supabase
        .from('match_phases')
        .select(`
          *,
          tournament_phase:tournament_phases(*),
          current_turn_participant:participants(*)
        `)
        .eq('match_id', matchId)
        .order('phase_order')

      if (!phasesError && matchPhases) {
        phases = matchPhases
        currentPhase = matchPhases.find(p => p.phase_status === 'active')
        
        if (currentPhase) {
          timeRemaining = currentPhase.time_remaining || 0
        }

        // Get phase selections
        for (const phase of matchPhases) {
          const { data: phaseSelections } = await supabase
            .from('phase_selections')
            .select(`
              *,
              participant:participants(*)
            `)
            .eq('match_phase_id', phase.id)
            .order('selection_order')

          selections[phase.id] = phaseSelections || []
        }
      }
    }

    return NextResponse.json({
      success: true,
      match: {
        ...match,
        participant1: match.participant1,
        participant2: match.participant2
      },
      tournament: match.tournament,
      phases,
      currentPhase,
      selections,
      timeRemaining,
      hasParticipantAccess,
      isSpectator,
      currentParticipant
    })
  } catch (error) {
    console.error('Get match error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}