import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { TournamentService } from '@/lib/database'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    
    const result = await TournamentService.getTournament(id)
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        tournament: result.tournament 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 404 })
    }
  } catch (error) {
    console.error('Tournament GET API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
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

    const updates = await request.json()
    
    const result = await TournamentService.updateTournament(id, updates, user.id)
    
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
    console.error('Tournament PUT API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
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

    const result = await TournamentService.deleteTournament(id, user.id)
    
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
    console.error('Tournament DELETE API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}