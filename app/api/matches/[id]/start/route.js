import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Start a match - tournament creator override
export async function POST(request, { params }) {
  try {
    const supabase = await createClient()
    const { id: matchId } = await params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    // Get match with tournament details
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

    // Verify user is tournament creator
    if (match.tournament.creator_id !== user.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only tournament creators can force start matches' 
      }, { status: 403 })
    }

    // Check if match can be started
    if (match.status !== 'pending') {
      return NextResponse.json({ 
        success: false, 
        error: 'Match has already started or is completed' 
      }, { status: 400 })
    }

    // Start the match (tournament creator override)
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId)

    if (updateError) {
      console.error('Failed to start match:', updateError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to start match' 
      }, { status: 500 })
    }

    // Log the creator start event
    await supabase
      .from('match_ready_events')
      .insert({
        match_id: matchId,
        event_type: 'creator_start',
        created_by: user.id
      })

    return NextResponse.json({
      success: true,
      message: 'Match started by tournament creator',
      match: {
        ...match,
        status: 'in_progress',
        started_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Start match error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}