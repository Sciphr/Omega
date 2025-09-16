import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { AchievementService } from '@/lib/achievement-service'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const includeProgress = searchParams.get('includeProgress') === 'true'
    const category = searchParams.get('category')

    const supabase = await createClient()

    if (userId) {
      // Get user's achievements
      const result = await AchievementService.getUserAchievements(userId, includeProgress)

      if (result.success) {
        return NextResponse.json({
          success: true,
          achievements: result.achievements,
          progress: result.progress || []
        })
      } else {
        return NextResponse.json({
          success: false,
          error: result.error
        }, { status: 400 })
      }
    } else {
      // Get all achievements
      let query = supabase
        .from('achievements')
        .select('*')
        .order('category', { ascending: true })
        .order('tier', { ascending: true })

      if (category && category !== 'all') {
        query = query.eq('category', category)
      }

      const { data: achievements, error } = await query

      if (error) throw error

      return NextResponse.json({
        success: true,
        achievements: achievements || []
      })
    }
  } catch (error) {
    console.error('Achievements API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'initialize':
        // Initialize achievements in database (admin only)
        const initResult = await AchievementService.initializeAchievements()
        return NextResponse.json(initResult)

      case 'feature_achievement':
        // Feature/unfeature an achievement on user's profile
        const { achievementId, featured } = body

        const { error: featureError } = await supabase
          .from('user_achievements')
          .update({ is_featured: featured })
          .eq('user_id', user.id)
          .eq('achievement_id', achievementId)

        if (featureError) throw featureError

        return NextResponse.json({
          success: true,
          message: `Achievement ${featured ? 'featured' : 'unfeatured'} successfully`
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Achievements POST API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}