import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    // Get current user (if any)
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    // Get team details with members
    const { data: team, error } = await supabase
      .from('user_teams')
      .select(`
        *,
        team_members (
          id,
          user_id,
          role,
          joined_at,
          display_name,
          email,
          is_registered
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching team:', error)
      return NextResponse.json({
        success: false,
        error: 'Team not found'
      }, { status: 404 })
    }

    // Check access permissions
    if (!team.is_public) {
      // For private teams, user must be logged in and be a team member
      if (!currentUser) {
        return NextResponse.json({
          success: false,
          error: 'Team not found'
        }, { status: 404 })
      }

      // Check if user is a team member or captain
      const isMember = team.team_members?.some(member => member.user_id === currentUser.id) ||
                      team.captain_id === currentUser.id

      if (!isMember) {
        return NextResponse.json({
          success: false,
          error: 'Team not found'
        }, { status: 404 })
      }
    }

    if (team && team.team_members) {
      // Check if captain is already in team members
      const captainIsMember = team.team_members.some(m => m.user_id === team.captain_id);

      // If captain is not a member, add them (for backward compatibility)
      if (!captainIsMember && team.captain_id) {
        team.team_members.unshift({
          id: `captain-${team.captain_id}`,
          user_id: team.captain_id,
          role: 'leader',
          joined_at: team.created_at,
          is_registered: true
        });
      }

      // For registered users, fetch their display names, game profiles, and player stats
      const registeredMembers = team.team_members.filter(m => m.is_registered && m.user_id);

      if (registeredMembers.length > 0) {
        const userIds = registeredMembers.map(m => m.user_id);

        // Use service client for user lookup to bypass RLS
        const serviceSupabase = createSupabaseClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { data: users, error: usersError } = await serviceSupabase
          .from('users')
          .select('id, display_name, username, email')
          .in('id', userIds);

        // Fetch game profiles for team members
        const { data: gameProfiles } = await serviceSupabase
          .from('user_game_profiles')
          .select('*')
          .in('user_id', userIds)
          .eq('game_id', team.game);

        // Fetch player stats for team members
        const { data: playerStats } = await serviceSupabase
          .from('player_stats')
          .select('*')
          .in('user_id', userIds)
          .eq('game_id', team.game);

        // Merge user data with team members
        team.team_members = team.team_members.map(member => {
          if (member.is_registered && member.user_id) {
            const userData = users?.find(u => u.id === member.user_id);
            const gameProfile = gameProfiles?.find(gp => gp.user_id === member.user_id);
            const stats = playerStats?.find(ps => ps.user_id === member.user_id);

            return {
              ...member,
              display_name: userData?.display_name || userData?.username || member.display_name || 'User',
              email: userData?.email || member.email,
              username: userData?.username,
              game_profile: gameProfile,
              player_stats: stats
            };
          }
          return member;
        });
      }
    }

    // Fetch team performance stats
    let teamStats = null;
    if (team?.game) {
      const { data: stats } = await supabase
        .from('team_stats')
        .select('*')
        .eq('team_id', id)
        .eq('game_id', team.game)
        .single();
      teamStats = stats;
    }

    // Fetch recent tournament results
    const { data: tournamentResults } = await supabase
      .from('team_tournament_results')
      .select(`
        *,
        tournament:tournaments(
          id,
          name
        )
      `)
      .eq('team_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get captain name
    let captainName = 'Unknown';
    if (team?.captain_id) {
      const serviceSupabase = createSupabaseClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const { data: captain } = await serviceSupabase
        .from('users')
        .select('display_name, username')
        .eq('id', team.captain_id)
        .single();

      if (captain) {
        captainName = captain.display_name || captain.username;
      }
    }

    // Add computed fields to team
    if (team) {
      team.member_details = team.team_members || [];
      team.stats = teamStats;
      team.tournament_results = tournamentResults?.map(result => ({
        ...result,
        tournament_name: result.tournament?.name || 'Unknown Tournament'
      })) || [];
      team.captain_name = captainName;
    }

    if (error) {
      console.error('Error fetching team:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      team
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create client with user token for authentication
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { name, max_members, is_public } = body;

    // Verify user is the team leader
    const { data: team, error: teamError } = await supabase
      .from('user_teams')
      .select('captain_id')
      .eq('id', id)
      .single();

    if (teamError) {
      console.error('Error fetching team:', teamError);
      if (teamError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
    }

    if (team.captain_id !== user.id) {
      return NextResponse.json({ error: 'Only team leaders can update team details' }, { status: 403 });
    }

    // Update team
    const { data: updatedTeam, error: updateError } = await supabase
      .from('user_teams')
      .update({
        name,
        max_members,
        is_public,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating team:', updateError);
      return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
    }

    return NextResponse.json({ team: updatedTeam });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create client with user token for authentication
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify user is the team leader
    const { data: team, error: teamError } = await supabase
      .from('user_teams')
      .select('captain_id')
      .eq('id', id)
      .single();

    if (teamError) {
      console.error('Error fetching team:', teamError);
      if (teamError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
    }

    if (team.captain_id !== user.id) {
      return NextResponse.json({ error: 'Only team leaders can delete teams' }, { status: 403 });
    }

    // Delete team (this will cascade delete team members due to foreign key constraints)
    const { error: deleteError } = await supabase
      .from('user_teams')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting team:', deleteError);
      return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}