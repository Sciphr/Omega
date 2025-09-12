import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request, { params }) {
  try {
    const supabase = await createClient()
    const { participantName, userId, seed } = await request.json()
    const { id: tournamentId } = await params

    if (!participantName?.trim()) {
      return NextResponse.json({ 
        success: false, 
        error: 'Participant name is required' 
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

    // Check if tournament is full
    const { data: existingParticipants } = await supabase
      .from('participants')
      .select('id')
      .eq('tournament_id', tournamentId)

    if (existingParticipants?.length >= tournament.max_participants) {
      return NextResponse.json({ 
        success: false, 
        error: 'Tournament is full' 
      }, { status: 400 })
    }

    // Check if user is already a participant (if userId provided)
    if (userId) {
      const { data: existingParticipant } = await supabase
        .from('participants')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)
        .single()

      if (existingParticipant) {
        return NextResponse.json({ 
          success: false, 
          error: 'User is already a participant' 
        }, { status: 400 })
      }
    }

    // Prepare participant data based on constraint: either user_id OR team_id must be non-null
    const participantData = {
      tournament_id: tournamentId,
      participant_name: participantName.trim(),
      participant_type: 'individual',
      seed: seed || null,
      status: 'active'
    }

    if (userId) {
      // Registered user
      participantData.user_id = userId
      participantData.team_id = null
    } else {
      // Manual participant - both user_id and team_id can be null with the new constraint
      participantData.user_id = null
      participantData.team_id = null
      participantData.participant_type = 'manual'
    }

    // Add participant
    const { data: participant, error: insertError } = await supabase
      .from('participants')
      .insert(participantData)
      .select()
      .single()

    if (insertError) {
      console.error('Failed to add participant:', insertError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to add participant' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      participant: {
        id: participant.id,
        participantName: participant.participant_name,
        userId: participant.user_id,
        seed: participant.seed,
        status: participant.status
      }
    })
  } catch (error) {
    console.error('Add participant error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}