import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET(request, { params }) {
  try {
    const { id } = await params

    // Create service client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // First, get the tournament status
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('status, name')
      .eq('id', id)
      .single()

    if (tournamentError) {
      console.error('Error fetching tournament:', tournamentError)
      return NextResponse.json({ 
        success: false, 
        error: 'Tournament not found' 
      }, { status: 404 })
    }

    // Debug: Log the tournament status
    console.log('Tournament data:', tournament)

    // Fetch participants ordered by final_position (for completed tournaments)
    // or by seed (for in-progress tournaments)
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('*')
      .eq('tournament_id', id)
      .order('final_position', { ascending: true, nullsLast: true })
      .order('seed', { ascending: true })

    if (participantsError) {
      console.error('Error fetching participants:', participantsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch participants' 
      }, { status: 500 })
    }

    // Fetch match data to calculate win/loss records
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', id)

    // Debug match data
    console.log('Matches query error:', matchesError)
    console.log('Matches data:', matches)

    // Note: matches might not exist yet or table might not be created
    // This is okay - we'll just show 0-0 records
    const matchData = matches || []

    // Calculate win/loss records for each participant
    const calculateMatchRecord = (participantId) => {
      let wins = 0
      let losses = 0

      matchData.forEach(match => {
        // Use correct field names from the matches table
        if (match.participant1_id === participantId || match.participant2_id === participantId) {
          if (match.winner_id === participantId) {
            wins++
          } else if (match.winner_id && match.status === 'completed') {
            losses++
          }
        }
      })

      return { wins, losses }
    }

    // Then fetch user data separately for each participant (if they have user_id)
    const standings = []
    for (const participant of participants) {
      let userData = null
      
      // Only fetch user data if participant has a user_id (registered users)
      if (participant.user_id) {
        const { data: fetchedUserData, error: userError } = await supabase
          .from('users')
          .select('display_name, username, email')
          .eq('id', participant.user_id)
          .single()
        
        userData = fetchedUserData
      }

      standings.push({
        ...participant,
        user_data: userData
      })
    }

    // Transform the data for the frontend
    const isCompleted = tournament.status === 'completed'
    console.log('Tournament status:', tournament.status, 'isCompleted:', isCompleted)
    
    const transformedStandings = standings.map((participant, index) => {
      const matchRecord = calculateMatchRecord(participant.id)
      console.log(`Participant ${participant.participant_name} (${participant.id}):`, matchRecord)
      
      return {
        user_id: participant.user_id,
        user_name: participant.user_data?.display_name || 
                   participant.user_data?.username || 
                   participant.participant_name || 
                   'Anonymous',
        // Use actual final_position if it exists, otherwise use index + 1
        final_position: participant.final_position || (index + 1),
        score: participant.final_score || 0,
        // Use calculated match records from actual matches
        matches_won: matchRecord.wins,
        matches_lost: matchRecord.losses,
        prize: participant.prize || null,
        eliminated_at: participant.eliminated_at,
        participant_type: participant.participant_type,
        // Use tournament status instead of checking final_position
        is_completed: isCompleted,
        seed: participant.seed
      }
    })

    return NextResponse.json({
      success: true,
      standings: transformedStandings,
      tournament: {
        name: tournament.name,
        status: tournament.status,
        is_completed: isCompleted
      }
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}