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