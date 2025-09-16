import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { handleTournamentAdjustment } from '@/lib/smart-seeding'

export async function POST(request, { params }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const tournamentId = params.id
    const adjustmentData = await request.json()

    // Validate required fields
    if (!adjustmentData.adjustmentType || !adjustmentData.participantId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: adjustmentType, participantId'
      }, { status: 400 })
    }

    // Get tournament details
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single()

    if (tournamentError) {
      return NextResponse.json({
        success: false,
        error: 'Tournament not found'
      }, { status: 404 })
    }

    // Verify permissions
    if (tournament.creator_id !== user.id) {
      return NextResponse.json({
        success: false,
        error: 'Only tournament creator can make adjustments'
      }, { status: 403 })
    }

    // Get current participants and matches
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('*')
      .eq('tournament_id', tournamentId)

    if (participantsError) {
      throw new Error('Failed to get participants')
    }

    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)

    if (matchesError) {
      throw new Error('Failed to get matches')
    }

    // Handle the adjustment
    const adjustmentResult = await handleTournamentAdjustment(
      tournament,
      participants,
      matches,
      adjustmentData
    )

    if (!adjustmentResult.success) {
      return NextResponse.json({
        success: false,
        error: adjustmentResult.error
      }, { status: 400 })
    }

    // Apply the adjustments to the database
    const { adjustedParticipants, adjustedMatches, bracketData } = adjustmentResult

    // Update participants
    if (adjustedParticipants?.length > 0) {
      for (const participant of adjustedParticipants) {
        const { error: updateError } = await supabase
          .from('participants')
          .update({
            status: participant.status,
            eliminated_at: participant.eliminated_at,
            updated_at: new Date().toISOString()
          })
          .eq('id', participant.id)

        if (updateError) {
          console.error('Error updating participant:', updateError)
        }
      }
    }

    // Update matches
    if (adjustedMatches?.length > 0) {
      for (const match of adjustedMatches) {
        if (match.action === 'update') {
          const { error: updateError } = await supabase
            .from('matches')
            .update({
              participant1_id: match.participant1_id,
              participant2_id: match.participant2_id,
              status: match.status,
              updated_at: new Date().toISOString()
            })
            .eq('id', match.id)

          if (updateError) {
            console.error('Error updating match:', updateError)
          }
        } else if (match.action === 'create') {
          const { error: createError } = await supabase
            .from('matches')
            .insert({
              id: match.id,
              tournament_id: tournamentId,
              round: match.round,
              match_number: match.match_number,
              bracket_type: match.bracket_type,
              participant1_id: match.participant1_id,
              participant2_id: match.participant2_id,
              status: match.status,
              match_format: match.match_format || tournament.settings?.matchFormat || 'bo1'
            })

          if (createError) {
            console.error('Error creating match:', createError)
          }
        }
      }
    }

    // Update tournament bracket data
    if (bracketData) {
      const { error: bracketError } = await supabase
        .from('tournaments')
        .update({
          bracket_data: bracketData,
          updated_at: new Date().toISOString()
        })
        .eq('id', tournamentId)

      if (bracketError) {
        console.error('Error updating bracket data:', bracketError)
      }
    }

    // Record the adjustment event
    const { error: eventError } = await supabase
      .from('match_events')
      .insert({
        match_id: null, // Tournament-level event
        event_type: 'tournament_adjustment',
        participant_id: adjustmentData.participantId,
        event_data: {
          adjustmentType: adjustmentData.adjustmentType,
          reason: adjustmentData.reason,
          timestamp: new Date().toISOString()
        },
        created_by: user.id
      })

    if (eventError) {
      console.error('Error recording adjustment event:', eventError)
    }

    return NextResponse.json({
      success: true,
      message: `Tournament adjusted successfully for ${adjustmentData.adjustmentType}`,
      adjustmentSummary: adjustmentResult.adjustmentSummary
    })

  } catch (error) {
    console.error('Tournament adjustment error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}