import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Get tournament phases
export async function GET(request, { params }) {
  try {
    const supabase = await createClient()
    const { id: tournamentId } = await params

    // Check if tournament exists and user has permission
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single()

    if (tournamentError || !tournament) {
      return NextResponse.json({ 
        success: false, 
        error: 'Tournament not found' 
      }, { status: 404 })
    }

    // Get tournament phases
    const { data: phases, error: phasesError } = await supabase
      .from('tournament_phases')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('phase_order', { ascending: true })

    if (phasesError) {
      console.error('Failed to get tournament phases:', phasesError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to get tournament phases' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      phases: phases || []
    })
  } catch (error) {
    console.error('Get tournament phases error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Create new tournament phase
export async function POST(request, { params }) {
  try {
    const supabase = await createClient()
    const { id: tournamentId } = await params
    const phaseData = await request.json()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    // Check if user is tournament creator
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('creator_id, status')
      .eq('id', tournamentId)
      .single()

    if (tournamentError || !tournament) {
      return NextResponse.json({ 
        success: false, 
        error: 'Tournament not found' 
      }, { status: 404 })
    }

    if (tournament.creator_id !== user.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only tournament creator can manage phases' 
      }, { status: 403 })
    }

    if (tournament.status === 'in_progress') {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot modify phases during active tournament' 
      }, { status: 400 })
    }

    // Validate phase data
    if (!phaseData.phase_name || !phaseData.phase_type) {
      return NextResponse.json({ 
        success: false, 
        error: 'Phase name and type are required' 
      }, { status: 400 })
    }

    // Create phase
    const { data: phase, error: insertError } = await supabase
      .from('tournament_phases')
      .insert({
        tournament_id: tournamentId,
        phase_name: phaseData.phase_name,
        phase_type: phaseData.phase_type,
        phase_order: phaseData.phase_order || 1,
        max_selections: phaseData.max_selections || 1,
        time_limit_seconds: phaseData.time_limit_seconds || 30,
        turn_based: phaseData.turn_based !== false,
        is_optional: phaseData.is_optional || false,
        is_enabled: phaseData.is_enabled !== false
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create tournament phase:', insertError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create tournament phase' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      phase
    })
  } catch (error) {
    console.error('Create tournament phase error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}