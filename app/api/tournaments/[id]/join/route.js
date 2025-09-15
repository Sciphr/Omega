import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { TournamentService } from '@/lib/database'

export async function POST(request, { params }) {
  try {
    const supabase = await createClient()
    const { id } = await params
    
    // Get current user (optional for guest participation)
    const { data: { user } } = await supabase.auth.getUser()

    const { participantName, password, participantType, teamId, roster } = await request.json()

    if (!participantName) {
      return NextResponse.json({
        success: false,
        error: 'Participant name is required'
      }, { status: 400 })
    }

    // For team tournaments, validate team and roster
    if (participantType === 'team') {
      if (!teamId) {
        return NextResponse.json({
          success: false,
          error: 'Team ID is required for team tournaments'
        }, { status: 400 })
      }

      if (!roster || !Array.isArray(roster) || roster.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Team roster is required for team tournaments'
        }, { status: 400 })
      }

      // Verify user is team captain
      const { data: team } = await supabase
        .from('teams')
        .select('captain_id, name, members')
        .eq('id', teamId)
        .single()

      if (!team || team.captain_id !== user?.id) {
        return NextResponse.json({
          success: false,
          error: 'Only team captains can register their team for tournaments'
        }, { status: 403 })
      }

      // Verify all roster members are team members
      for (const memberId of roster) {
        if (!team.members.includes(memberId)) {
          return NextResponse.json({
            success: false,
            error: 'All roster members must be part of the team'
          }, { status: 400 })
        }
      }
    }

    const participantData = {
      participantName,
      userId: user?.id || null,
      participantType: participantType || 'individual',
      teamId: teamId || null,
      roster: roster || null
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