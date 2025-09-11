import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

export async function GET(request, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    // Create public client for reading team data (teams can be viewed publicly)
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    // Get team details with members
    const { data: team, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members (
          user_id,
          role,
          joined_at,
          users (
            id,
            email,
            user_metadata
          )
        )
      `)
      .eq('id', id)
      .single();

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
    const { id } = params;

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
    const { name, description, max_members, is_public } = body;

    // Verify user is the team leader
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('leader_id')
      .eq('id', id)
      .single();

    if (teamError) {
      console.error('Error fetching team:', teamError);
      if (teamError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
    }

    if (team.leader_id !== user.id) {
      return NextResponse.json({ error: 'Only team leaders can update team details' }, { status: 403 });
    }

    // Update team
    const { data: updatedTeam, error: updateError } = await supabase
      .from('teams')
      .update({
        name,
        description,
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
    const { id } = params;

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
      .from('teams')
      .select('leader_id')
      .eq('id', id)
      .single();

    if (teamError) {
      console.error('Error fetching team:', teamError);
      if (teamError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
    }

    if (team.leader_id !== user.id) {
      return NextResponse.json({ error: 'Only team leaders can delete teams' }, { status: 403 });
    }

    // Delete team (this will cascade delete team members due to foreign key constraints)
    const { error: deleteError } = await supabase
      .from('teams')
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