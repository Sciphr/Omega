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
        started_at,
        completed_at,
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
      .from('participants')
      .select(`
        tournament_id,
        joined_at,
        status,
        eliminated_at,
        tournaments!participants_tournament_id_fkey (
          id,
          name,
          game,
          status,
          format,
          max_participants,
          started_at,
          completed_at,
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
      if (participatedError.code === '42P01' || participatedError.code === 'PGRST205') {
        console.log('Participants table does not exist or missing, using empty array');
      } else {
        return NextResponse.json({ error: 'Failed to fetch participated tournaments' }, { status: 500 });
      }
    }

    // Format the participated tournaments data
    const formattedParticipated = participatedTournaments?.map(p => ({
      ...p.tournaments,
      participation: {
        joined_at: p.joined_at,
        status: p.status,
        eliminated_at: p.eliminated_at
      },
      role: 'participant'
    })) || [];

    // Add role to created tournaments
    const formattedCreated = createdTournaments?.map(t => ({
      ...t,
      role: 'creator'
    })) || [];

    // Deduplicate tournaments (creator + participant) and merge roles
    const tournamentMap = new Map();

    // Add created tournaments first
    formattedCreated.forEach(tournament => {
      tournamentMap.set(tournament.id, tournament);
    });

    // Add participated tournaments, merging with created ones if they exist
    formattedParticipated.forEach(tournament => {
      const existing = tournamentMap.get(tournament.id);
      if (existing) {
        // Tournament exists in both lists - user is both creator and participant
        tournamentMap.set(tournament.id, {
          ...existing,
          role: 'creator', // Prioritize creator role
          participation: tournament.participation // Add participation data
        });
      } else {
        // New tournament - user is only participant
        tournamentMap.set(tournament.id, tournament);
      }
    });

    // Convert back to array and sort by most recent activity
    const allTournaments = Array.from(tournamentMap.values())
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