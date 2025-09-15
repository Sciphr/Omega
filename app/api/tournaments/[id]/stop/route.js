import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { TournamentService } from '@/lib/database'

export async function POST(request, { params }) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    // Get optional declared winner from request body
    const body = await request.json().catch(() => ({}))
    const { declaredWinnerId } = body

    const result = await TournamentService.stopTournament(id, user.id, declaredWinnerId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        declaredWinner: result.declaredWinner
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: result.error.includes('permission') ? 403 : 400 })
    }
  } catch (error) {
    console.error('Tournament stop API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}