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

    const scoreData = await request.json()
    
    if (!scoreData.score || !scoreData.winnerId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Score and winner ID are required' 
      }, { status: 400 })
    }

    const result = await TournamentService.reportMatchScore(id, scoreData, user.id)
    
    if (result.success) {
      return NextResponse.json({ 
        success: true 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: result.error.includes('permission') ? 403 : 400 })
    }
  } catch (error) {
    console.error('Match score API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}