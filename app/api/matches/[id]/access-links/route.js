import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Generate secure access links for match participants
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

    // Check if user is tournament creator
    if (match.tournament.creator_id !== user.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only tournament creator can generate access links' 
      }, { status: 403 })
    }

    // Generate access tokens for participants
    const { error: tokensError } = await supabase.rpc('generate_match_access_tokens', {
      match_uuid: matchId
    })

    if (tokensError) {
      console.error('Failed to generate access tokens:', tokensError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to generate access tokens' 
      }, { status: 500 })
    }

    // Get the generated tokens
    const { data: privileges, error: privilegesError } = await supabase
      .from('match_participant_privileges')
      .select(`
        *,
        participant:participants(*)
      `)
      .eq('match_id', matchId)
      .eq('is_active', true)

    if (privilegesError) {
      console.error('Failed to get access tokens:', privilegesError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to retrieve access tokens' 
      }, { status: 500 })
    }

    // Generate access links
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3200'
    const accessLinks = privileges.map(privilege => ({
      participant: privilege.participant,
      accessLink: `${baseUrl}/match/${matchId}?token=${privilege.access_token}`,
      expires_at: privilege.expires_at
    }))

    return NextResponse.json({
      success: true,
      accessLinks,
      match: {
        id: match.id,
        match_number: match.match_number,
        tournament_name: match.tournament.name
      }
    })
  } catch (error) {
    console.error('Generate access links error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Get existing access links for a match
export async function GET(request, { params }) {
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

    // Check if user is tournament creator
    if (match.tournament.creator_id !== user.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only tournament creator can view access links' 
      }, { status: 403 })
    }

    // Get existing access tokens
    const { data: privileges, error: privilegesError } = await supabase
      .from('match_participant_privileges')
      .select(`
        *,
        participant:participants(*)
      `)
      .eq('match_id', matchId)
      .eq('is_active', true)

    if (privilegesError) {
      console.error('Failed to get access tokens:', privilegesError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to retrieve access tokens' 
      }, { status: 500 })
    }

    // Generate access links
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3200'
    const accessLinks = privileges.map(privilege => ({
      participant: privilege.participant,
      accessLink: `${baseUrl}/match/${matchId}?token=${privilege.access_token}`,
      expires_at: privilege.expires_at,
      last_used_at: privilege.last_used_at
    }))

    return NextResponse.json({
      success: true,
      accessLinks,
      match: {
        id: match.id,
        match_number: match.match_number,
        tournament_name: match.tournament.name
      }
    })
  } catch (error) {
    console.error('Get access links error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}