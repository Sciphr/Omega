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
    // Check for authorization header first
    const authHeader = request.headers.get('authorization')
    let user = null
    let supabase = null

    if (authHeader) {
      // Use Authorization header approach (like teams API)
      const token = authHeader.replace('Bearer ', '')
      const { createClient } = await import('@supabase/supabase-js')
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      )
      
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid authentication token' 
        }, { status: 401 })
      }
      user = authUser
    } else {
      // Fall back to cookie-based authentication
      supabase = await createClient()
      const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !cookieUser) {
        return NextResponse.json({ 
          success: false, 
          error: 'Authentication required to create tournaments. Please sign in or create an account.' 
        }, { status: 401 })
      }
      user = cookieUser
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