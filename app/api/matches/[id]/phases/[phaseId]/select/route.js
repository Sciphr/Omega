import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Make a selection in a match phase
export async function POST(request, { params }) {
  try {
    const supabase = await createClient()
    const { id: matchId, phaseId } = await params
    const selectionData = await request.json()
    const authHeader = request.headers.get('authorization')
    const accessToken = authHeader?.replace('Bearer ', '')

    if (!accessToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'Access token required' 
      }, { status: 401 })
    }

    // Verify participant access
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

    if (privilegeError || !privilege) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid or expired access token' 
      }, { status: 403 })
    }

    // Get match phase details
    const { data: matchPhase, error: phaseError } = await supabase
      .from('match_phases')
      .select(`
        *,
        tournament_phase:tournament_phases(*)
      `)
      .eq('id', phaseId)
      .eq('match_id', matchId)
      .single()

    if (phaseError || !matchPhase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Phase not found' 
      }, { status: 404 })
    }

    // Validate phase status
    if (matchPhase.phase_status !== 'active') {
      return NextResponse.json({ 
        success: false, 
        error: 'Phase is not active' 
      }, { status: 400 })
    }

    // Check if it's participant's turn (if turn-based)
    if (matchPhase.tournament_phase.turn_based && 
        matchPhase.current_turn_participant_id !== privilege.participant.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Not your turn' 
      }, { status: 400 })
    }

    // Check if participant has already made maximum selections
    const { data: existingSelections, error: selectionsError } = await supabase
      .from('phase_selections')
      .select('*')
      .eq('match_phase_id', phaseId)
      .eq('participant_id', privilege.participant.id)

    if (selectionsError) {
      console.error('Failed to check existing selections:', selectionsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to validate selection' 
      }, { status: 500 })
    }

    if (existingSelections.length >= matchPhase.tournament_phase.max_selections) {
      return NextResponse.json({ 
        success: false, 
        error: 'Maximum selections reached for this phase' 
      }, { status: 400 })
    }

    // Validate selection data
    if (!selectionData.selection_data || !selectionData.selection_type) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid selection data' 
      }, { status: 400 })
    }

    // Create selection record
    const { data: selection, error: insertError } = await supabase
      .from('phase_selections')
      .insert({
        match_phase_id: phaseId,
        participant_id: privilege.participant.id,
        selection_data: selectionData.selection_data,
        selection_order: existingSelections.length + 1
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create selection:', insertError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to save selection' 
      }, { status: 500 })
    }

    // Get match participants to determine next turn
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('participant1_id, participant2_id')
      .eq('id', matchId)
      .single()

    if (matchError) {
      console.error('Failed to get match participants:', matchError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update turn' 
      }, { status: 500 })
    }

    let nextTurnParticipantId = null
    let phaseComplete = false

    // Check if phase should continue or complete
    const totalSelections = existingSelections.length + 1
    const maxTotalSelections = matchPhase.tournament_phase.max_selections * 2 // Both participants

    if (totalSelections >= maxTotalSelections) {
      // Phase is complete
      phaseComplete = true
    } else if (matchPhase.tournament_phase.turn_based) {
      // Switch to other participant
      nextTurnParticipantId = privilege.participant.id === match.participant1_id 
        ? match.participant2_id 
        : match.participant1_id
    }

    // Update match phase
    if (phaseComplete) {
      await supabase
        .from('match_phases')
        .update({
          phase_status: 'completed',
          completed_at: new Date().toISOString(),
          current_turn_participant_id: null
        })
        .eq('id', phaseId)
    } else if (nextTurnParticipantId) {
      await supabase
        .from('match_phases')
        .update({
          current_turn_participant_id: nextTurnParticipantId,
          time_remaining: matchPhase.tournament_phase.time_limit_seconds
        })
        .eq('id', phaseId)
    }

    // Create match update event
    await supabase
      .from('match_updates')
      .insert({
        match_id: matchId,
        update_type: 'selection_made',
        update_data: {
          phase_id: phaseId,
          participant_id: privilege.participant.id,
          selection: selectionData,
          phase_complete: phaseComplete
        },
        participant_id: privilege.participant.id
      })

    // If phase is complete, try to advance to next phase
    let nextPhase = null
    if (phaseComplete) {
      const { data: nextPhaseId } = await supabase.rpc('advance_match_phase', {
        match_uuid: matchId
      })
      
      if (nextPhaseId) {
        const { data: newPhase } = await supabase
          .from('match_phases')
          .select(`
            *,
            tournament_phase:tournament_phases(*),
            current_turn_participant:participants(*)
          `)
          .eq('id', nextPhaseId)
          .single()
          
        nextPhase = newPhase
      } else {
        // No more phases - match ready for score reporting
        await supabase
          .from('matches')
          .update({ status: 'ready_for_score' })
          .eq('id', matchId)
      }
    }

    // Get updated selections for this phase
    const { data: updatedSelections } = await supabase
      .from('phase_selections')
      .select(`
        *,
        participant:participants(*)
      `)
      .eq('match_phase_id', phaseId)
      .order('selection_order')

    return NextResponse.json({
      success: true,
      selection,
      selections: { [phaseId]: updatedSelections || [] },
      currentPhase: nextPhase,
      timeRemaining: nextPhase?.time_remaining || 0,
      phaseComplete
    })
  } catch (error) {
    console.error('Make selection error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}