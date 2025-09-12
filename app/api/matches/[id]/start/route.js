import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Start a match and initialize phases
export async function POST(request, { params }) {
  try {
    const supabase = await createClient()
    const { id: matchId } = await params
    const authHeader = request.headers.get('authorization')
    const accessToken = authHeader?.replace('Bearer ', '')

    // Get match details
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

    // Check permissions
    let canStart = false
    
    if (accessToken) {
      // Check if participant has access
      const { data: privilege } = await supabase
        .from('match_participant_privileges')
        .select('*')
        .eq('match_id', matchId)
        .eq('access_token', accessToken)
        .eq('is_active', true)
        .single()
        
      canStart = !!privilege
    } else {
      // Check if user is tournament creator
      const { data: { user } } = await supabase.auth.getUser()
      canStart = user && match.tournament.creator_id === user.id
    }

    if (!canStart) {
      return NextResponse.json({ 
        success: false, 
        error: 'You do not have permission to start this match' 
      }, { status: 403 })
    }

    // Check if match can be started
    if (match.status !== 'pending') {
      return NextResponse.json({ 
        success: false, 
        error: 'Match has already started or is completed' 
      }, { status: 400 })
    }

    // Update match status
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .eq('id', matchId)

    if (updateError) {
      console.error('Failed to start match:', updateError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to start match' 
      }, { status: 500 })
    }

    // Initialize match phases
    const { error: phasesError } = await supabase.rpc('initialize_match_phases', {
      match_uuid: matchId
    })

    if (phasesError) {
      console.error('Failed to initialize match phases:', phasesError)
      // Continue anyway - phases are optional
    }

    // Generate access tokens for participants if not already done
    const { error: tokensError } = await supabase.rpc('generate_match_access_tokens', {
      match_uuid: matchId
    })

    if (tokensError) {
      console.error('Failed to generate access tokens:', tokensError)
      // Continue anyway
    }

    // Advance to first phase if any exist
    const { data: firstPhaseId } = await supabase.rpc('advance_match_phase', {
      match_uuid: matchId
    })

    // Create match update event
    await supabase
      .from('match_updates')
      .insert({
        match_id: matchId,
        update_type: 'match_started',
        update_data: { started_at: new Date().toISOString() },
        participant_id: null
      })

    return NextResponse.json({
      success: true,
      match: {
        ...match,
        status: 'in_progress',
        started_at: new Date().toISOString()
      },
      firstPhaseId
    })
  } catch (error) {
    console.error('Start match error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}