import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Get user teams with search functionality
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const userId = searchParams.get('user_id')

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    let query = supabase
      .from('user_teams')
      .select(`
        id,
        name,
        description,
        game,
        max_members,
        captain_id,
        created_at,
        captain:users!user_teams_captain_id_fkey(id, username, display_name)
      `)

    // If searching for specific user's teams
    if (userId) {
      query = query.eq('captain_id', userId)
    } else {
      // Default: show teams where user is captain or member
      query = query.or(`captain_id.eq.${user.id}`)
    }

    // Apply search filter if provided
    if (search?.trim()) {
      query = query.ilike('name', `%${search.trim()}%`)
    }

    query = query.order('created_at', { ascending: false })

    const { data: teams, error: teamsError } = await query

    if (teamsError) {
      console.error('Error fetching user teams:', teamsError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch teams'
      }, { status: 500 })
    }

    // Get member details for each team
    const teamsWithMemberDetails = await Promise.all(teams.map(async (team) => {
      // Get team members from team_members table
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          display_name,
          email,
          role,
          is_registered,
          user:users(id, username, display_name, email)
        `)
        .eq('team_id', team.id)

      // Include captain as a member
      const allMembers = [
        {
          id: `captain-${team.captain_id}`,
          user_id: team.captain_id,
          display_name: team.captain.display_name || team.captain.username,
          email: null,
          role: 'captain',
          is_registered: true,
          user: team.captain
        },
        ...(teamMembers || [])
      ]

      return {
        ...team,
        members: allMembers,
        member_count: allMembers.length
      }
    }))

    return NextResponse.json({
      success: true,
      teams: teamsWithMemberDetails
    })

  } catch (error) {
    console.error('Get user teams error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}