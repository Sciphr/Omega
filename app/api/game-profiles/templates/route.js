import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Get user's templates and public templates
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const gameProfileId = searchParams.get('game_profile_id')
    const includePublic = searchParams.get('include_public') === 'true'

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      // If not authenticated, only return public templates
      if (includePublic) {
        let query = supabase
          .from('game_profile_templates')
          .select(`
            id,
            game_profile_id,
            name,
            description,
            is_public,
            configuration,
            usage_count,
            created_at,
            game_profile:game_profiles(name, game_key)
          `)
          .eq('is_public', true)

        if (gameProfileId) {
          query = query.eq('game_profile_id', gameProfileId)
        }

        query = query.order('usage_count', { ascending: false })

        const { data: templates, error } = await query

        if (error) {
          console.error('Error fetching public templates:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to fetch templates'
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          templates: templates || []
        })
      } else {
        return NextResponse.json({
          success: false,
          error: 'Authentication required'
        }, { status: 401 })
      }
    }

    // Build query for authenticated user
    let whereClause = `creator_id.eq.${user.id}`
    if (includePublic) {
      whereClause = `creator_id.eq.${user.id},is_public.eq.true`
    }

    let query = supabase
      .from('game_profile_templates')
      .select(`
        id,
        game_profile_id,
        creator_id,
        name,
        description,
        is_public,
        configuration,
        usage_count,
        created_at,
        updated_at,
        game_profile:game_profiles(name, game_key)
      `)
      .or(whereClause)

    if (gameProfileId) {
      query = query.eq('game_profile_id', gameProfileId)
    }

    query = query.order('created_at', { ascending: false })

    const { data: templates, error } = await query

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch templates'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      templates: templates || []
    })

  } catch (error) {
    console.error('Get templates error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Save a tournament template
export async function POST(request) {
  try {
    const supabase = await createClient()
    const templateData = await request.json()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required to save templates'
      }, { status: 401 })
    }

    const {
      gameProfileId,
      name,
      description,
      isPublic,
      configuration
    } = templateData

    // Validate required fields
    if (!gameProfileId || !name || !configuration) {
      return NextResponse.json({
        success: false,
        error: 'Game profile ID, name, and configuration are required'
      }, { status: 400 })
    }

    // Check if user already has a template with this name
    const { data: existingTemplate } = await supabase
      .from('game_profile_templates')
      .select('id')
      .eq('creator_id', user.id)
      .eq('name', name.trim())
      .single()

    if (existingTemplate) {
      return NextResponse.json({
        success: false,
        error: 'You already have a template with this name'
      }, { status: 400 })
    }

    // Verify game profile exists
    const { data: gameProfile } = await supabase
      .from('game_profiles')
      .select('id')
      .eq('id', gameProfileId)
      .single()

    if (!gameProfile) {
      return NextResponse.json({
        success: false,
        error: 'Invalid game profile'
      }, { status: 400 })
    }

    const { data: template, error: templateError } = await supabase
      .from('game_profile_templates')
      .insert({
        game_profile_id: gameProfileId,
        creator_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        is_public: isPublic || false,
        configuration: configuration
      })
      .select(`
        id,
        game_profile_id,
        creator_id,
        name,
        description,
        is_public,
        configuration,
        usage_count,
        created_at,
        game_profile:game_profiles(name, game_key)
      `)
      .single()

    if (templateError) {
      console.error('Error creating template:', templateError)
      return NextResponse.json({
        success: false,
        error: 'Failed to create template: ' + templateError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      template
    })

  } catch (error) {
    console.error('Create template error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}