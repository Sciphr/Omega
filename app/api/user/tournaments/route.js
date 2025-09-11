import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

    // Get tournaments user created
    const { data: createdTournaments, error: createdError } = await supabase
      .from('tournaments')
      .select(`
        id,
        name,
        game,
        status,
        format,
        max_participants,
        start_date,
        end_date,
        created_at,
        updated_at
      `)
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (createdError) {
      console.error('Error fetching created tournaments:', createdError);
      // If table doesn't exist, return empty array instead of error
      if (createdError.code === '42P01') {
        console.log('Tournaments table does not exist, returning empty array');
        return NextResponse.json({ tournaments: [] });
      }
      return NextResponse.json({ error: 'Failed to fetch created tournaments' }, { status: 500 });
    }

    // Get tournaments user participated in
    const { data: participatedTournaments, error: participatedError } = await supabase
      .from('tournament_participants')
      .select(`
        tournament_id,
        joined_at,
        placement,
        tournaments!inner (
          id,
          name,
          game,
          status,
          format,
          max_participants,
          start_date,
          end_date,
          created_at,
          updated_at,
          creator_id
        )
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false });

    if (participatedError) {
      console.error('Error fetching participated tournaments:', participatedError);
      // If table doesn't exist, continue with empty array
      if (participatedError.code === '42P01') {
        console.log('Tournament participants table does not exist, using empty array');
      } else {
        return NextResponse.json({ error: 'Failed to fetch participated tournaments' }, { status: 500 });
      }
    }

    // Format the participated tournaments data
    const formattedParticipated = participatedTournaments?.map(p => ({
      ...p.tournaments,
      participation: {
        joined_at: p.joined_at,
        placement: p.placement
      },
      role: 'participant'
    })) || [];

    // Add role to created tournaments
    const formattedCreated = createdTournaments?.map(t => ({
      ...t,
      role: 'creator'
    })) || [];

    // Combine and sort by most recent activity
    const allTournaments = [...formattedCreated, ...formattedParticipated]
      .sort((a, b) => {
        const aDate = a.participation?.joined_at || a.created_at;
        const bDate = b.participation?.joined_at || b.created_at;
        return new Date(bDate) - new Date(aDate);
      });

    return NextResponse.json({ tournaments: allTournaments });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}