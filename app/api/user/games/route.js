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

    // Get user's game profiles
    const { data: gameProfiles, error } = await supabase
      .from('user_game_profiles')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching game profiles:', error);
      // If table doesn't exist, return empty array
      if (error.code === '42P01' || error.code === 'PGRST205') {
        console.log('User game profiles table does not exist, returning empty array');
        return NextResponse.json({ gameProfiles: [] });
      }
      return NextResponse.json({ error: 'Failed to fetch game profiles' }, { status: 500 });
    }

    return NextResponse.json({ gameProfiles });
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
    const { game_id, display_name, rank } = body;

    if (!game_id || !display_name) {
      return NextResponse.json({ error: 'game_id and display_name are required' }, { status: 400 });
    }

    // Check if user already has a profile for this game
    const { data: existing } = await supabase
      .from('user_game_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('game_id', game_id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'You already have a profile for this game' }, { status: 400 });
    }

    // Create new game profile
    const { data: gameProfile, error } = await supabase
      .from('user_game_profiles')
      .insert({
        user_id: user.id,
        game_id,
        display_name,
        rank
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating game profile:', error);
      return NextResponse.json({ error: 'Failed to create game profile' }, { status: 500 });
    }

    return NextResponse.json({ gameProfile }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
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
    const { id, display_name, rank } = body;

    if (!id) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    // Update game profile (only if user owns it)
    const { data: gameProfile, error } = await supabase
      .from('user_game_profiles')
      .update({
        display_name,
        rank,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns this profile
      .select()
      .single();

    if (error) {
      console.error('Error updating game profile:', error);
      return NextResponse.json({ error: 'Failed to update game profile' }, { status: 500 });
    }

    if (!gameProfile) {
      return NextResponse.json({ error: 'Game profile not found or you do not have permission to update it' }, { status: 404 });
    }

    return NextResponse.json({ gameProfile });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    // Delete game profile (only if user owns it)
    const { error } = await supabase
      .from('user_game_profiles')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Ensure user owns this profile

    if (error) {
      console.error('Error deleting game profile:', error);
      return NextResponse.json({ error: 'Failed to delete game profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}