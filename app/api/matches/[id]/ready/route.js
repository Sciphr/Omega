import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function POST(request, { params }) {
  try {
    const supabase = await createClient()
    const { id: matchId } = await params
    const { ready } = await request.json()

    console.log('Ready API called:', { matchId, ready })

    // Debug: Check if we can access the matches table at all
    const { data: testMatch, error: testError } = await supabase
      .from('matches')
      .select('id')
      .limit(1)
    
    console.log('Test matches table access:', { testMatch, testError })

    // Get current user or participant via access token
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Get match details with participants
    const { data: match, error: matchError } = await supabase
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

    // Check if match is in valid state
    if (match.status !== 'pending') {
      return NextResponse.json({ 
        success: false, 
        error: 'Match has already started or completed' 
      }, { status: 400 })
    }

    // Determine which participant is making the request
    let participantId = null
    let participantColumn = null

    // Check via access token first
    const accessToken = request.headers.get('authorization')?.replace('Bearer ', '')
    console.log('Access token:', accessToken ? 'present' : 'missing')
    
    if (accessToken) {
      const { data: privilege, error: privilegeError } = await supabase
        .from('match_participant_privileges')
        .select('participant_id')
        .eq('match_id', matchId)
        .eq('access_token', accessToken)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .single()

      console.log('Privilege lookup:', { privilege, privilegeError })

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
        error: 'Not authorized to mark ready for this match' 
      }, { status: 403 })
    }

    // Determine which participant column to update
    if (participantId === match.participant1_id) {
      participantColumn = 'participant1_ready'
    } else if (participantId === match.participant2_id) {
      participantColumn = 'participant2_ready'
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid participant for this match' 
      }, { status: 403 })
    }

    console.log('Updating participant ready status:', { participantColumn, ready, participantId, matchId })

    // First, let's check if the match exists and see current state
    const { data: currentMatch, error: checkError } = await supabase
      .from('matches')
      .select('id, participant1_ready, participant2_ready, status')
      .eq('id', matchId)
      .single()
    
    console.log('Current match state:', { currentMatch, checkError })

    // Update participant ready status using service client to bypass RLS
    const serviceSupabase = createServiceClient()
    const { data: updatedMatch, error: updateError } = await serviceSupabase
      .from('matches')
      .update({ 
        [participantColumn]: ready,
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating ready status:', updateError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update ready status: ' + updateError.message 
      }, { status: 500 })
    }

    console.log('Ready status updated successfully', { 
      updatedMatch: {
        participant1_ready: updatedMatch?.participant1_ready,
        participant2_ready: updatedMatch?.participant2_ready
      }
    })

    // Log the ready event
    await serviceSupabase
      .from('match_ready_events')
      .insert({
        match_id: matchId,
        participant_id: participantId,
        event_type: ready ? 'ready' : 'unready',
        created_by: user?.id || null
      })

    return NextResponse.json({
      success: true,
      message: `Participant marked as ${ready ? 'ready' : 'not ready'}`
    })

  } catch (error) {
    console.error('Ready status error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}