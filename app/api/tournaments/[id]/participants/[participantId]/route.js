import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient()
    const { id: tournamentId, participantId } = await params

    // Check if tournament exists
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

    // Check if participant exists
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('*')
      .eq('id', participantId)
      .eq('tournament_id', tournamentId)
      .single()

    if (participantError || !participant) {
      return NextResponse.json({ 
        success: false, 
        error: 'Participant not found' 
      }, { status: 404 })
    }

    // Get the display_order of the participant being removed
    const removedDisplayOrder = participant.display_order

    // Remove participant
    const { error: deleteError } = await supabase
      .from('participants')
      .delete()
      .eq('id', participantId)
      .eq('tournament_id', tournamentId)

    if (deleteError) {
      console.error('Failed to remove participant:', deleteError)
      return NextResponse.json({
        success: false,
        error: 'Failed to remove participant'
      }, { status: 500 })
    }

    // Renumber display_order for remaining participants
    // All participants with display_order > removedDisplayOrder should be decremented by 1
    if (removedDisplayOrder) {
      // Get all participants that need renumbering
      const { data: participantsToRenumber, error: fetchError } = await supabase
        .from('participants')
        .select('id, display_order')
        .eq('tournament_id', tournamentId)
        .gt('display_order', removedDisplayOrder)

      if (!fetchError && participantsToRenumber?.length > 0) {
        // Update each participant's display_order
        const updatePromises = participantsToRenumber.map(p =>
          supabase
            .from('participants')
            .update({ display_order: p.display_order - 1 })
            .eq('id', p.id)
        )

        const results = await Promise.all(updatePromises)
        const renumberErrors = results.filter(result => result.error)

        if (renumberErrors.length > 0) {
          console.error('Some participants failed to renumber:', renumberErrors)
          // Don't fail the request if renumbering fails, just log it
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Participant removed successfully'
    })
  } catch (error) {
    console.error('Remove participant error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}