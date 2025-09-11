import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { TournamentService } from '@/lib/database'

export async function POST(request, { params }) {
  try {
    const supabase = await createClient()
    const { id } = await params
    
    // Get current user (optional for guest participation)
    const { data: { user } } = await supabase.auth.getUser()

    const { participantName, password } = await request.json()
    
    if (!participantName) {
      return NextResponse.json({ 
        success: false, 
        error: 'Participant name is required' 
      }, { status: 400 })
    }

    const participantData = {
      participantName,
      userId: user?.id || null
    }

    const result = await TournamentService.joinTournament(id, participantData, password)
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        participant: result.participant 
      }, { status: 201 })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Tournament join API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}