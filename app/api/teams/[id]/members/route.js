import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Add a member to a team
export async function POST(request, { params }) {
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
    const { user_id, display_name, email, is_registered = true } = body;

    // Verify user is the team captain
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
      return NextResponse.json({ error: 'Only team captains can add members' }, { status: 403 });
    }

    // Validate input based on member type
    if (is_registered) {
      if (!user_id) {
        return NextResponse.json({ error: 'user_id is required for registered users' }, { status: 400 });
      }
    } else {
      if (!display_name) {
        return NextResponse.json({ error: 'display_name is required for manual members' }, { status: 400 });
      }
    }

    // Add team member
    const memberData = {
      team_id: id,
      role: 'member',
      is_registered
    };

    if (is_registered) {
      memberData.user_id = user_id;
    } else {
      memberData.display_name = display_name;
      if (email) memberData.email = email;
    }

    const { data: newMember, error: memberError } = await supabase
      .from('team_members')
      .insert(memberData)
      .select()
      .single();

    if (memberError) {
      console.error('Error adding team member:', memberError);
      if (memberError.code === '23505') {
        return NextResponse.json({ error: 'User is already a member of this team' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 });
    }

    return NextResponse.json({ member: newMember }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Remove a member from a team
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('member_id');
    
    if (!id || !memberId) {
      return NextResponse.json({ error: 'Team ID and member ID are required' }, { status: 400 });
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

    // Verify user is the team captain or removing themselves
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select(`
        *,
        user_teams!inner(captain_id)
      `)
      .eq('id', memberId)
      .eq('team_id', id)
      .single();

    if (memberError) {
      console.error('Error fetching member:', memberError);
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const isCaptain = member.user_teams.captain_id === user.id;
    const isRemovingSelf = member.user_id === user.id;

    if (!isCaptain && !isRemovingSelf) {
      return NextResponse.json({ error: 'Only team captains can remove members, or members can remove themselves' }, { status: 403 });
    }

    // Delete team member
    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId);

    if (deleteError) {
      console.error('Error removing team member:', deleteError);
      return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}