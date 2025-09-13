import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

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
        error: 'Only tournament creators can generate access links' 
      }, { status: 403 })
    }

    // Deactivate any existing links for this match
    await supabase
      .from('match_participant_privileges')
      .update({ is_active: false })
      .eq('match_id', matchId)

    // Generate new access links
    const accessLinksToCreate = []
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

    if (match.participant1_id) {
      accessLinksToCreate.push({
        match_id: matchId,
        participant_id: match.participant1_id,
        access_token: crypto.randomUUID().replace(/-/g, ''),
        expires_at: expiresAt.toISOString(),
        is_active: true,
        created_at: new Date().toISOString()
      })
    }
    
    if (match.participant2_id) {
      accessLinksToCreate.push({
        match_id: matchId,
        participant_id: match.participant2_id,
        access_token: crypto.randomUUID().replace(/-/g, ''),
        expires_at: expiresAt.toISOString(),
        is_active: true,
        created_at: new Date().toISOString()
      })
    }

    if (accessLinksToCreate.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No participants found to generate links for' 
      }, { status: 400 })
    }

    // Insert new access links
    const { data: createdLinks, error: createError } = await supabase
      .from('match_participant_privileges')
      .insert(accessLinksToCreate)
      .select('*')

    if (createError) {
      console.error('Error creating access links:', createError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to generate access links' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Access links generated successfully',
      links_created: createdLinks.length
    })

  } catch (error) {
    console.error('Generate access links error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}