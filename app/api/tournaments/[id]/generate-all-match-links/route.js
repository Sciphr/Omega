import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { randomBytes } from 'crypto'

export async function POST(request, { params }) {
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
        error: 'Only tournament creators can generate match links' 
      }, { status: 403 })
    }

    if (tournament.status !== 'in_progress') {
      return NextResponse.json({ 
        success: false, 
        error: 'Match links can only be generated for tournaments in progress' 
      }, { status: 400 })
    }

    // Get all matches with participants
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        *,
        participant1:participants!matches_participant1_id_fkey(*),
        participant2:participants!matches_participant2_id_fkey(*)
      `)
      .eq('tournament_id', tournamentId)

    if (matchesError || !matches) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch tournament matches' 
      }, { status: 500 })
    }

    // Generate access links for all matches
    const accessLinksToCreate = []
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

    matches.forEach(match => {
      if (match.participant1_id) {
        accessLinksToCreate.push({
          match_id: match.id,
          participant_id: match.participant1_id,
          access_token: randomBytes(32).toString('hex'),
          expires_at: expiresAt.toISOString(),
          is_active: true,
          created_at: new Date().toISOString()
        })
      }
      
      if (match.participant2_id) {
        accessLinksToCreate.push({
          match_id: match.id,
          participant_id: match.participant2_id,
          access_token: randomBytes(32).toString('hex'),
          expires_at: expiresAt.toISOString(),
          is_active: true,
          created_at: new Date().toISOString()
        })
      }
    })

    if (accessLinksToCreate.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No participants found to generate links for' 
      }, { status: 400 })
    }

    // First, deactivate any existing links
    await supabase
      .from('match_participant_privileges')
      .update({ is_active: false })
      .in('match_id', matches.map(m => m.id))

    // Insert new access links
    const { data: createdLinks, error: createError } = await supabase
      .from('match_participant_privileges')
      .insert(accessLinksToCreate)
      .select(`
        *,
        participant:participants(*)
      `)

    if (createError) {
      console.error('Error creating access links:', createError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to generate access links' 
      }, { status: 500 })
    }

    // Group links by match_id for easier frontend consumption
    const linksByMatch = {}
    createdLinks.forEach(link => {
      if (!linksByMatch[link.match_id]) {
        linksByMatch[link.match_id] = []
      }
      linksByMatch[link.match_id].push(link)
    })

    return NextResponse.json({
      success: true,
      access_links: linksByMatch,
      total_links: createdLinks.length
    })

  } catch (error) {
    console.error('Generate match links error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}