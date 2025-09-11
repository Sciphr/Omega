import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

export async function GET(request) {
  try {
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

    // Get teams user leads
    const { data: ledTeams, error: ledError } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        description,
        game,
        max_members,
        is_public,
        created_at,
        updated_at,
        team_members!inner (
          user_id,
          role,
          joined_at
        )
      `)
      .eq('leader_id', user.id)
      .order('created_at', { ascending: false });

    if (ledError) {
      console.error('Error fetching led teams:', ledError);
      // If table doesn't exist, return empty array
      if (ledError.code === '42P01') {
        console.log('Teams table does not exist, returning empty arrays');
        return NextResponse.json({ ledTeams: [], memberTeams: [] });
      }
      return NextResponse.json({ error: 'Failed to fetch led teams' }, { status: 500 });
    }

    // Get teams user is a member of (but not leader)
    const { data: memberTeams, error: memberError } = await supabase
      .from('team_members')
      .select(`
        team_id,
        role,
        joined_at,
        teams!inner (
          id,
          name,
          description,
          game,
          max_members,
          is_public,
          created_at,
          updated_at,
          leader_id
        )
      `)
      .eq('user_id', user.id)
      .neq('teams.leader_id', user.id) // Exclude teams where user is leader
      .order('joined_at', { ascending: false });

    if (memberError) {
      console.error('Error fetching member teams:', memberError);
      // If table doesn't exist, continue with empty member teams
      if (memberError.code !== '42P01') {
        return NextResponse.json({ error: 'Failed to fetch member teams' }, { status: 500 });
      }
    }

    // Format the member teams data
    const formattedMemberTeams = memberTeams?.map(m => ({
      ...m.teams,
      membership: {
        role: m.role,
        joined_at: m.joined_at
      },
      user_role: 'member'
    })) || [];

    // Add user role to led teams
    const formattedLedTeams = ledTeams?.map(t => ({
      ...t,
      user_role: 'leader'
    })) || [];

    return NextResponse.json({
      ledTeams: formattedLedTeams,
      memberTeams: formattedMemberTeams
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
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
    const { name, description, game, max_members = 5, is_public = false } = body;

    if (!name || !game) {
      return NextResponse.json({ error: 'name and game are required' }, { status: 400 });
    }

    // Create new team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name,
        description,
        game,
        max_members,
        is_public,
        leader_id: user.id
      })
      .select()
      .single();

    if (teamError) {
      console.error('Error creating team:', teamError);
      return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
    }

    // Add creator as team member with leader role
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: 'leader'
      });

    if (memberError) {
      console.error('Error adding leader to team members:', memberError);
      // If we can't add the leader as a member, delete the team to maintain consistency
      await supabase.from('teams').delete().eq('id', team.id);
      return NextResponse.json({ error: 'Failed to create team membership' }, { status: 500 });
    }

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}