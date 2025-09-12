import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Update tournament phase
export async function PUT(request, { params }) {
  try {
    const supabase = await createClient()
    const { id: tournamentId, phaseId } = await params
    const updates = await request.json()

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

    // Verify phase belongs to tournament
    const { data: phase, error: phaseError } = await supabase
      .from('tournament_phases')
      .select('*')
      .eq('id', phaseId)
      .eq('tournament_id', tournamentId)
      .single()

    if (phaseError || !phase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Phase not found' 
      }, { status: 404 })
    }

    // Update phase
    const { data: updatedPhase, error: updateError } = await supabase
      .from('tournament_phases')
      .update(updates)
      .eq('id', phaseId)
      .eq('tournament_id', tournamentId)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update tournament phase:', updateError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update tournament phase' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      phase: updatedPhase
    })
  } catch (error) {
    console.error('Update tournament phase error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Delete tournament phase
export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient()
    const { id: tournamentId, phaseId } = await params

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

    // Verify phase belongs to tournament
    const { data: phase, error: phaseError } = await supabase
      .from('tournament_phases')
      .select('*')
      .eq('id', phaseId)
      .eq('tournament_id', tournamentId)
      .single()

    if (phaseError || !phase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Phase not found' 
      }, { status: 404 })
    }

    // Delete phase
    const { error: deleteError } = await supabase
      .from('tournament_phases')
      .delete()
      .eq('id', phaseId)
      .eq('tournament_id', tournamentId)

    if (deleteError) {
      console.error('Failed to delete tournament phase:', deleteError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete tournament phase' 
      }, { status: 500 })
    }

    // Reorder remaining phases
    const { data: remainingPhases, error: remainingError } = await supabase
      .from('tournament_phases')
      .select('id, phase_order')
      .eq('tournament_id', tournamentId)
      .order('phase_order')

    if (!remainingError && remainingPhases) {
      const updates = remainingPhases.map((p, index) => ({
        id: p.id,
        phase_order: index + 1
      }))

      for (const update of updates) {
        await supabase
          .from('tournament_phases')
          .update({ phase_order: update.phase_order })
          .eq('id', update.id)
      }
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Delete tournament phase error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}