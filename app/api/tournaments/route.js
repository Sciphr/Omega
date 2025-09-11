import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { TournamentService } from '@/lib/database'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const filters = {
      game: searchParams.get('game'),
      status: searchParams.get('status'), 
      format: searchParams.get('format'),
      search: searchParams.get('search')
    }

    // Remove null values
    Object.keys(filters).forEach(key => {
      if (filters[key] === null) {
        delete filters[key]
      }
    })

    const result = await TournamentService.getTournaments(filters)
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        tournaments: result.tournaments 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Tournament GET API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Get current user - now required for tournament creation
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required to create tournaments. Please sign in or create an account.' 
      }, { status: 401 })
    }

    const tournamentData = await request.json()
    
    // Validate required fields
    if (!tournamentData.name || !tournamentData.game || !tournamentData.maxParticipants) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: name, game, maxParticipants' 
      }, { status: 400 })
    }

    // Add user info to tournament data
    const tournamentWithUser = {
      ...tournamentData,
      creatorName: user.user_metadata?.display_name || user.user_metadata?.username || user.email
    }

    const result = await TournamentService.createTournament(tournamentWithUser, user.id)
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        tournament: result.tournament,
        url: result.url
      }, { status: 201 })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Tournament POST API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}