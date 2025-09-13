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

    // Get teams user leads (try user_teams first, fallback to tournament teams)
    let { data: ledTeams, error: ledError } = await supabase
      .from('user_teams')
      .select(`
        id,
        name,
        game,
        max_members,
        is_public,
        captain_id,
        created_at,
        updated_at
      `)
      .eq('captain_id', user.id)
      .order('created_at', { ascending: false });
    
    // If user_teams doesn't exist, try tournament teams
    if (ledError && (ledError.code === '42P01' || ledError.code === 'PGRST205')) {
      ({ data: ledTeams, error: ledError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          tag,
          tournament_id,
          captain_id,
          captain_name,
          roster,
          seed,
          status,
          created_at,
          updated_at
        `)
        .eq('captain_id', user.id)
        .order('created_at', { ascending: false }));
    }

    if (ledError) {
      console.error('Error fetching led teams:', ledError);
      // If table doesn't exist or relationship missing or column missing, return empty array
      if (ledError.code === '42P01' || ledError.code === 'PGRST200' || ledError.code === '42703') {
        console.log('Teams table does not exist, relationship missing, or column missing, returning empty arrays');
        return NextResponse.json({ ledTeams: [], memberTeams: [] });
      }
      return NextResponse.json({ error: 'Failed to fetch led teams' }, { status: 500 });
    }

    // Get teams user is a member of (but not leader) - skip if team_members table doesn't exist
    let memberTeams = [];

    // Format the member teams data (empty since team_members table doesn't exist)
    const formattedMemberTeams = [];

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
    const { name, game, max_members = 5, is_public = false } = body;

    if (!name || !game) {
      return NextResponse.json({ error: 'name and game are required' }, { status: 400 });
    }

    // Create new team
    const { data: team, error: teamError } = await supabase
      .from('user_teams')
      .insert({
        name,
        game,
        max_members,
        is_public,
        captain_id: user.id
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
      await supabase.from('user_teams').delete().eq('id', team.id);
      return NextResponse.json({ error: 'Failed to create team membership' }, { status: 500 });
    }

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}