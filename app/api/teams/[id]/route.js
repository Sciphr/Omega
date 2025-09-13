import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    // Create public client for reading team data (teams can be viewed publicly)
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

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

      // For registered users, fetch their display names from the users table
      const registeredMembers = team.team_members.filter(m => m.is_registered && m.user_id);
      
      if (registeredMembers.length > 0) {
        const userIds = registeredMembers.map(m => m.user_id);
        
        // Use service client for user lookup to bypass RLS
        const serviceSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { data: users, error: usersError } = await serviceSupabase
          .from('users')
          .select('id, display_name, username, email')
          .in('id', userIds);

        // Merge user data with team members
        team.team_members = team.team_members.map(member => {
          if (member.is_registered && member.user_id) {
            const userData = users?.find(u => u.id === member.user_id);
            return {
              ...member,
              display_name: userData?.display_name || userData?.username || member.display_name || 'User',
              email: userData?.email || member.email
            };
          }
          return member;
        });
      }
    }

    if (error) {
      console.error('Error fetching team:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
    }

    return NextResponse.json({ team });
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