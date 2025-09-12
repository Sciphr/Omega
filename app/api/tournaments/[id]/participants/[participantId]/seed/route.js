import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function PUT(request, { params }) {
  try {
    const supabase = await createClient()
    const { id: tournamentId, participantId } = await params
    const { seed } = await request.json()

    // Validate seed
    if (typeof seed !== 'number' || seed < 1) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid seed number' 
      }, { status: 400 })
    }

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

    // Check if participant exists and belongs to this tournament
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

    // Check if seed is already taken by another participant
    const { data: existingParticipant, error: seedCheckError } = await supabase
      .from('participants')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('seed', seed)
      .neq('id', participantId)
      .single()

    if (seedCheckError && seedCheckError.code !== 'PGRST116') {
      console.error('Seed check error:', seedCheckError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to check seed availability' 
      }, { status: 500 })
    }

    if (existingParticipant) {
      return NextResponse.json({ 
        success: false, 
        error: 'Seed is already assigned to another participant' 
      }, { status: 400 })
    }

    // Update participant seed
    const { data: updatedParticipant, error: updateError } = await supabase
      .from('participants')
      .update({ seed })
      .eq('id', participantId)
      .eq('tournament_id', tournamentId)
      .select('id, participant_name, participant_type, seed, status, user_id, team_id, joined_at')
      .single()

    if (updateError) {
      console.error('Failed to update participant seed:', updateError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update participant seed' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      participant: updatedParticipant
    })
  } catch (error) {
    console.error('Update participant seed error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Remove seed (set to null)
export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient()
    const { id: tournamentId, participantId } = await params

    // Update participant to remove seed
    const { data: updatedParticipant, error: updateError } = await supabase
      .from('participants')
      .update({ seed: null })
      .eq('id', participantId)
      .eq('tournament_id', tournamentId)
      .select('id, participant_name, participant_type, seed, status, user_id, team_id, joined_at')
      .single()

    if (updateError) {
      console.error('Failed to remove participant seed:', updateError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to remove participant seed' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      participant: updatedParticipant
    })
  } catch (error) {
    console.error('Remove participant seed error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}