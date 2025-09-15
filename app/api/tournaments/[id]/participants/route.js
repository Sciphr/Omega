import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

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

    // Get the next display_order for this tournament
    const { data: maxOrderResult } = await supabase
      .from('participants')
      .select('display_order')
      .eq('tournament_id', tournamentId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const nextDisplayOrder = (maxOrderResult?.display_order) ? maxOrderResult.display_order + 1 : 1

    // Handle user_id requirement (constraint requires either user_id OR team_id to be non-null)
    let finalUserId = userId

    if (!finalUserId) {
      // Create a temporary/guest user record using service client to bypass RLS
      const serviceClient = createServiceClient()
      const { data: guestUser, error: guestError } = await serviceClient
        .from('users')
        .insert({
          username: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@temp.local`,
          display_name: participantName.trim(),
          is_verified: false
        })
        .select()
        .single()

      if (guestError) throw guestError
      finalUserId = guestUser.id
    }

    // Prepare participant data
    const participantData = {
      tournament_id: tournamentId,
      participant_name: participantName.trim(),
      participant_type: 'individual',
      seed: seed || null,
      status: 'active',
      display_order: nextDisplayOrder,
      user_id: finalUserId,
      team_id: null
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
        participant_name: participant.participant_name, // Include both for compatibility
        userId: participant.user_id,
        user_id: participant.user_id,
        team_id: participant.team_id,
        participant_type: participant.participant_type,
        seed: participant.seed,
        status: participant.status,
        joined_at: participant.joined_at
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