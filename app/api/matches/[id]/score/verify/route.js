import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

// Handle score verification actions (accept/deny/counter-propose)
export async function POST(request, { params }) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()
    const { id: matchId } = await params
    const { score_submission_id, action_type, participant1_score, participant2_score, notes } = await request.json()

    console.log('Score verification API called:', { 
      matchId, 
      score_submission_id, 
      action_type, 
      participant1_score, 
      participant2_score, 
      notes 
    })

    // Get current user or participant via access token
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Get match details with participants
    const { data: match, error: matchError } = await serviceSupabase
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

    // Determine who is making the request
    let participantId = null
    let isTournamentCreator = false

    // Check if user is tournament creator
    if (user && match.tournament.creator_id === user.id) {
      isTournamentCreator = true
    }

    // Check via access token first
    const accessToken = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (accessToken) {
      const { data: privilege, error: privilegeError } = await serviceSupabase
        .from('match_participant_privileges')
        .select('participant_id')
        .eq('match_id', matchId)
        .eq('access_token', accessToken)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .single()

      if (privilege) {
        participantId = privilege.participant_id
      }
    }

    // Check via authenticated user if no token access
    if (!participantId && user) {
      if (match.participant1?.user_id === user.id) {
        participantId = match.participant1_id
      } else if (match.participant2?.user_id === user.id) {
        participantId = match.participant2_id
      }
    }

    if (!participantId && !isTournamentCreator) {
      return NextResponse.json({ 
        success: false, 
        error: 'Not authorized to verify scores for this match' 
      }, { status: 403 })
    }

    // Get the score submission being verified
    const { data: scoreSubmission, error: submissionError } = await serviceSupabase
      .from('score_submissions')
      .select('*')
      .eq('id', score_submission_id)
      .single()

    if (submissionError || !scoreSubmission) {
      return NextResponse.json({ 
        success: false, 
        error: 'Score submission not found' 
      }, { status: 404 })
    }

    let actionResult = null

    if (action_type === 'accept') {
      // Create acceptance action
      const { data: verificationAction, error: actionError } = await serviceSupabase
        .from('score_verification_actions')
        .insert({
          score_submission_id,
          match_id: matchId,
          participant_id: participantId,
          action_type: 'accept',
          notes: notes || null,
          created_by: user?.id || null
        })
        .select()
        .single()

      if (actionError) {
        console.error('Error creating verification action:', actionError)
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to create verification action: ' + actionError.message 
        }, { status: 500 })
      }

      actionResult = verificationAction
      
    } else if (action_type === 'dispute' || action_type === 'counter_propose') {
      // Create dispute action
      const { data: verificationAction, error: actionError } = await serviceSupabase
        .from('score_verification_actions')
        .insert({
          score_submission_id,
          match_id: matchId,
          participant_id: participantId,
          action_type: 'dispute',
          notes: notes || null,
          created_by: user?.id || null
        })
        .select()
        .single()

      if (actionError) {
        console.error('Error creating dispute action:', actionError)
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to create dispute action: ' + actionError.message 
        }, { status: 500 })
      }

      // If counter-proposing, create a new score submission
      if (action_type === 'counter_propose' && participant1_score !== undefined && participant2_score !== undefined) {
        const { data: counterSubmission, error: counterError } = await serviceSupabase
          .from('score_submissions')
          .insert({
            match_id: matchId,
            submitted_by: participantId,
            participant1_score: parseInt(participant1_score),
            participant2_score: parseInt(participant2_score),
            status: 'pending',
            submission_type: 'counter',
            notes: notes || null
          })
          .select()
          .single()

        if (counterError) {
          console.error('Error creating counter submission:', counterError)
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to create counter submission: ' + counterError.message 
          }, { status: 500 })
        }

        // Update match to track the new current submission
        await serviceSupabase
          .from('matches')
          .update({
            current_score_submission_id: counterSubmission.id,
            score_submission_status: 'disputed',
            updated_at: new Date().toISOString()
          })
          .eq('id', matchId)

        actionResult = { verificationAction, counterSubmission }
      } else {
        // Mark match as disputed
        await serviceSupabase
          .from('matches')
          .update({
            score_submission_status: 'disputed',
            updated_at: new Date().toISOString()
          })
          .eq('id', matchId)

        actionResult = verificationAction
      }
      
    } else if (action_type === 'creator_finalize' && isTournamentCreator) {
      // Tournament creator finalizes the score
      const { data: verificationAction, error: actionError } = await serviceSupabase
        .from('score_verification_actions')
        .insert({
          score_submission_id,
          match_id: matchId,
          participant_id: null, // Creator action
          action_type: 'creator_finalize',
          notes: notes || null,
          created_by: user?.id || null
        })
        .select()
        .single()

      if (actionError) {
        console.error('Error creating creator finalize action:', actionError)
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to create creator finalize action: ' + actionError.message 
        }, { status: 500 })
      }

      actionResult = verificationAction
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid action type' 
      }, { status: 400 })
    }

    console.log('Score verification action created successfully:', actionResult)

    return NextResponse.json({
      success: true,
      message: `Score ${action_type} action completed`,
      actionResult
    })

  } catch (error) {
    console.error('Score verification error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}