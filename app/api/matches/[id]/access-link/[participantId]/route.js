import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request, { params }) {
  try {
    const supabase = await createClient()
    const { id: matchId, participantId } = await params

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
        tournament:tournaments(*)
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
        error: 'Only tournament creators can access match links' 
      }, { status: 403 })
    }

    // Get existing access link for this participant
    const { data: accessLink, error: linkError } = await supabase
      .from('match_participant_privileges')
      .select('*')
      .eq('match_id', matchId)
      .eq('participant_id', participantId)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (linkError || !accessLink) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active access link found. Please generate match links first.' 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      accessLink: accessLink
    })

  } catch (error) {
    console.error('Get access link error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}