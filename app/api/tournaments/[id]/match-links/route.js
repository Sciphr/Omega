import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request, { params }) {
  try {
    const supabase = await createClient()
    const { id: tournamentId } = await params

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    // Get tournament and verify creator
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

    if (tournament.creator_id !== user.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only tournament creators can access match links' 
      }, { status: 403 })
    }

    if (tournament.status !== 'in_progress') {
      return NextResponse.json({ 
        success: false, 
        error: 'Match links are only available for tournaments in progress' 
      }, { status: 400 })
    }

    // Get all matches with participant details
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        *,
        participant1:participants!matches_participant1_id_fkey(*),
        participant2:participants!matches_participant2_id_fkey(*)
      `)
      .eq('tournament_id', tournamentId)
      .order('round', { ascending: true })
      .order('match_number', { ascending: true })

    if (matchesError) {
      console.error('Error fetching matches:', matchesError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch matches' 
      }, { status: 500 })
    }

    // Get all existing access links
    const { data: accessLinks, error: linksError } = await supabase
      .from('match_participant_privileges')
      .select(`
        *,
        participant:participants(*)
      `)
      .in('match_id', matches.map(m => m.id))
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())

    if (linksError) {
      console.error('Error fetching access links:', linksError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch access links' 
      }, { status: 500 })
    }

    // Group access links by match_id
    const linksByMatch = {}
    accessLinks.forEach(link => {
      if (!linksByMatch[link.match_id]) {
        linksByMatch[link.match_id] = []
      }
      linksByMatch[link.match_id].push(link)
    })

    return NextResponse.json({
      success: true,
      matches: matches || [],
      access_links: linksByMatch
    })

  } catch (error) {
    console.error('Get match links error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}