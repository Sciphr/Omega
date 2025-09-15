import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Get all active game profiles
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const gameKey = searchParams.get('game')

    let query = supabase
      .from('game_profiles')
      .select(`
        id,
        game_key,
        game,
        description,
        is_active,
        default_team_size,
        supports_individual,
        supports_team,
        settings,
        maps,
        draft_types,
        phase_templates
      `)
      .eq('is_active', true)

    if (gameKey) {
      query = query.eq('game_key', gameKey)
    }

    query = query.order('game')

    const { data: profiles, error } = await query

    if (error) {
      console.error('Error fetching game profiles:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch game profiles'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      profiles: profiles || []
    })

  } catch (error) {
    console.error('Game profiles API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Create a custom game profile (admin only for now)
export async function POST(request) {
  try {
    const supabase = await createClient()
    const profileData = await request.json()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    // For now, only allow certain users to create game profiles
    // In production, you might want to add an admin role check

    const { data: profile, error: profileError } = await supabase
      .from('game_profiles')
      .insert({
        game_key: profileData.gameKey,
        game: profileData.game,
        description: profileData.description,
        default_team_size: profileData.defaultTeamSize || 1,
        supports_individual: profileData.supportsIndividual !== false,
        supports_team: profileData.supportsTeam !== false,
        settings: profileData.settings || {},
        maps: profileData.maps || [],
        draft_types: profileData.draftTypes || [],
        phase_templates: profileData.phaseTemplates || []
      })
      .select()
      .single()

    if (profileError) {
      console.error('Error creating game profile:', profileError)
      return NextResponse.json({
        success: false,
        error: 'Failed to create game profile: ' + profileError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      profile
    })

  } catch (error) {
    console.error('Create game profile error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}