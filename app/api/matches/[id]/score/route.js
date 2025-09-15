import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { TournamentService } from '@/lib/database'

// Submit a score for verification
export async function POST(request, { params }) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()
    const { id: matchId } = await params
    const { participant1_score, participant2_score, notes, action_type, score_data, game_number } = await request.json()

    console.log('Score submission API called:', { matchId, participant1_score, participant2_score, notes, action_type })

    // If this is the old tournament creator direct score system
    if (action_type === 'creator_direct') {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        return NextResponse.json({ 
          success: false, 
          error: 'Authentication required' 
        }, { status: 401 })
      }

      const { score, winner_id } = await request.json()
      
      const result = await TournamentService.reportMatchScore(matchId, { score, winnerId: winner_id }, user.id)
      
      if (result.success) {
        return NextResponse.json({ success: true })
      } else {
        return NextResponse.json({ 
          success: false, 
          error: result.error 
        }, { status: result.error.includes('permission') ? 403 : 400 })
      }
    }

    // New participant score submission system
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

    // Check if match is in valid state for score submission
    if (match.status !== 'in_progress') {
      return NextResponse.json({ 
        success: false, 
        error: 'Match is not in progress' 
      }, { status: 400 })
    }

    // Determine which participant is making the request
    let participantId = null

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

    if (!participantId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Not authorized to submit scores for this match' 
      }, { status: 403 })
    }

    console.log('Score submitted by participant:', participantId)

    // Create score submission
    const submissionData = {
      match_id: matchId,
      submitted_by: participantId,
      participant1_score: parseInt(participant1_score),
      participant2_score: parseInt(participant2_score),
      status: 'pending',
      submission_type: game_number ? 'game_result' : 'initial',
      notes: notes || null
    }

    // Add Best of X specific data
    if (score_data) {
      submissionData.score_data = score_data
      submissionData.game_number = game_number || null
    }

    const { data: scoreSubmission, error: submissionError } = await serviceSupabase
      .from('score_submissions')
      .insert(submissionData)
      .select()
      .single()

    if (submissionError) {
      console.error('Error creating score submission:', submissionError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to submit score: ' + submissionError.message 
      }, { status: 500 })
    }

    // Update match to track current submission
    await serviceSupabase
      .from('matches')
      .update({
        current_score_submission_id: scoreSubmission.id,
        score_submission_status: 'pending_verification',
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId)

    console.log('Score submission created successfully:', scoreSubmission.id)

    return NextResponse.json({
      success: true,
      message: 'Score submitted for verification',
      scoreSubmission
    })

  } catch (error) {
    console.error('Score submission error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Get score submissions and verification history for a match
export async function GET(request, { params }) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()
    const { id: matchId } = await params

    // Get score submissions with verification actions
    const { data: submissions, error: submissionsError } = await serviceSupabase
      .from('score_submissions')
      .select(`
        *,
        submitted_by_participant:participants!score_submissions_submitted_by_fkey(*),
        verification_actions:score_verification_actions(
          *,
          participant:participants(*),
          created_by_user:users(*)
        )
      `)
      .eq('match_id', matchId)
      .order('created_at', { ascending: false })

    if (submissionsError) {
      console.error('Error fetching score submissions:', submissionsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch score submissions' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      submissions: submissions || []
    })

  } catch (error) {
    console.error('Get score submissions error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}