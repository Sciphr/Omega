import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Create a new team
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { name, members } = await request.json()

    // Get current user (team captain)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required to create teams'
      }, { status: 401 })
    }

    // Validate team name
    if (!name || name.trim().length < 3) {
      return NextResponse.json({
        success: false,
        error: 'Team name must be at least 3 characters long'
      }, { status: 400 })
    }

    // Check if team name already exists for this user
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('name')
      .eq('captain_id', user.id)
      .eq('name', name.trim())
      .single()

    if (existingTeam) {
      return NextResponse.json({
        success: false,
        error: 'You already have a team with this name'
      }, { status: 400 })
    }

    // Ensure user profile exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, username')
      .eq('id', user.id)
      .single()

    if (!existingUser) {
      // Create user profile if it doesn't exist
      const baseUsername = user.user_metadata?.username || user.email.split('@')[0]
      let username = baseUsername
      let attempts = 0

      // Try to find a unique username
      while (attempts < 10) {
        const { data: existingUsername } = await supabase
          .from('users')
          .select('username')
          .eq('username', username)
          .single()

        if (!existingUsername) {
          break // Username is available
        }

        attempts++
        username = `${baseUsername}${attempts}`
      }

      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          username: username,
          display_name: user.user_metadata?.display_name || user.user_metadata?.username || user.email.split('@')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (userError) {
        console.error('Error creating user profile:', userError)
        return NextResponse.json({
          success: false,
          error: 'Failed to create user profile'
        }, { status: 500 })
      }
    }

    // Create team with captain as first member
    const teamMembers = [user.id]
    if (members && Array.isArray(members)) {
      // Add additional members (validate they exist)
      for (const memberId of members) {
        if (memberId !== user.id && !teamMembers.includes(memberId)) {
          const { data: memberExists } = await supabase
            .from('users')
            .select('id')
            .eq('id', memberId)
            .single()

          if (memberExists) {
            teamMembers.push(memberId)
          }
        }
      }
    }

    const { data: team, error: teamError } = await supabase
      .from('user_teams')
      .insert({
        name: name.trim(),
        captain_id: user.id
      })
      .select(`
        id,
        name,
        captain_id,
        created_at,
        captain:users!user_teams_captain_id_fkey(id, username, display_name)
      `)
      .single()

    if (teamError) {
      console.error('Error creating team:', teamError)
      return NextResponse.json({
        success: false,
        error: 'Failed to create team: ' + teamError.message
      }, { status: 500 })
    }

    // Add team members to team_members table (excluding captain who is already in the team)
    if (members && Array.isArray(members) && members.length > 0) {
      const memberInserts = members
        .filter(memberId => memberId !== user.id) // Exclude captain
        .map(memberId => ({
          team_id: team.id,
          user_id: memberId,
          role: 'member'
        }))

      if (memberInserts.length > 0) {
        const { error: memberError } = await supabase
          .from('team_members')
          .insert(memberInserts)

        if (memberError) {
          console.error('Error adding team members:', memberError)
          // Don't fail the whole operation, just log the error
        }
      }
    }

    // Get all team members including captain
    const { data: allMembers } = await supabase
      .from('team_members')
      .select(`
        id,
        user_id,
        role,
        user:users(id, username, display_name)
      `)
      .eq('team_id', team.id)

    // Include captain in member list
    const memberDetails = [
      {
        id: `captain-${team.captain_id}`,
        user_id: team.captain_id,
        role: 'captain',
        user: team.captain
      },
      ...(allMembers || [])
    ]

    return NextResponse.json({
      success: true,
      team: {
        ...team,
        member_details: memberDetails
      }
    })

  } catch (error) {
    console.error('Team creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Get teams for current user
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const includeAll = searchParams.get('include') === 'all'

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
        captain_id,
        created_at,
        updated_at,
        captain:users!user_teams_captain_id_fkey(id, username, display_name)
      `)

    if (!includeAll) {
      // Get teams where user is captain
      const { data: captainTeams, error: captainError } = await query.eq('captain_id', user.id)

      if (captainError) {
        console.error('Error fetching captain teams:', captainError)
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch teams'
        }, { status: 500 })
      }

      // Get teams where user is a member
      const { data: memberTeams, error: memberError } = await supabase
        .from('team_members')
        .select(`
          team:user_teams!inner(
            id,
            name,
            captain_id,
            created_at,
            updated_at,
            captain:users!user_teams_captain_id_fkey(id, username, display_name)
          )
        `)
        .eq('user_id', user.id)

      if (memberError) {
        console.error('Error fetching member teams:', memberError)
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch member teams'
        }, { status: 500 })
      }

      // Combine captain teams and member teams, avoiding duplicates
      const memberTeamData = memberTeams?.map(m => m.team) || []
      const allTeamIds = new Set()
      const combinedTeams = []

      // Add captain teams first
      for (const team of captainTeams || []) {
        if (!allTeamIds.has(team.id)) {
          allTeamIds.add(team.id)
          combinedTeams.push(team)
        }
      }

      // Add member teams
      for (const team of memberTeamData) {
        if (!allTeamIds.has(team.id)) {
          allTeamIds.add(team.id)
          combinedTeams.push(team)
        }
      }

      // Sort by created_at descending
      combinedTeams.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      // Update teams variable to use combined results
      var teams = combinedTeams
    } else {
      const { data: allTeams, error: teamsError } = await query

      if (teamsError) {
        console.error('Error fetching teams:', teamsError)
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch teams'
        }, { status: 500 })
      }

      var teams = allTeams
    }

    // Get member details for each team
    const teamsWithMembers = await Promise.all(teams.map(async (team) => {
      // Get team members from team_members table
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          role,
          user:users(id, username, display_name)
        `)
        .eq('team_id', team.id)

      // Include captain in member list
      const memberDetails = [
        {
          id: `captain-${team.captain_id}`,
          user_id: team.captain_id,
          role: 'captain',
          user: team.captain
        },
        ...(teamMembers || [])
      ]

      return {
        ...team,
        member_details: memberDetails
      }
    }))

    return NextResponse.json({
      success: true,
      teams: teamsWithMembers
    })

  } catch (error) {
    console.error('Get teams error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}