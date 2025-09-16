import { NextResponse } from 'next/server'
import { AchievementService } from '@/lib/achievement-service'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit')) || 50
    const category = searchParams.get('category')

    const result = await AchievementService.getAchievementLeaderboard(limit)

    if (result.success) {
      return NextResponse.json({
        success: true,
        leaderboard: result.leaderboard
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Achievement leaderboard API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}