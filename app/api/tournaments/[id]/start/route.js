import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { TournamentService } from '@/lib/database'
import { cookies } from 'next/headers'

// Start a tournament
export async function POST(request, { params }) {
  try {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )
    
    const { id: tournamentId } = await params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('Auth debug:', { 
      user: user?.id, 
      authError, 
      cookies: cookieStore.getAll().map(c => c.name)
    })
    
    if (authError || !user) {
      console.log('Authentication failed:', authError)
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    // Start the tournament using the database service
    const result = await TournamentService.startTournament(tournamentId, user.id)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        bracket: result.bracket
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Start tournament error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}