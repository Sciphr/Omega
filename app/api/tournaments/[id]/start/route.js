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

    const result = await TournamentService.startTournament(id, user.id)
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        bracket: result.bracket 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: result.error.includes('permission') ? 403 : 400 })
    }
  } catch (error) {
    console.error('Tournament start API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}