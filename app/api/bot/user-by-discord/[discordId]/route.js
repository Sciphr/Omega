import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request, { params }) {
  try {
    const { discordId } = params;

    if (!discordId) {
      return NextResponse.json({ error: 'Discord ID is required' }, { status: 400 });
    }

    // Create service role client for bot access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find user by Discord ID in linked accounts
    const { data: linkedAccount, error: linkedError } = await supabase
      .from('user_linked_accounts')
      .select(`
        user_id,
        platform_username,
        verified,
        users (
          id,
          username,
          email,
          display_name,
          created_at,
          updated_at
        )
      `)
      .eq('platform', 'discord')
      .eq('platform_user_id', discordId)
      .single();

    if (linkedError || !linkedAccount) {
      return NextResponse.json({
        user: null,
        linked: false,
        message: 'Discord account not linked to any Omega user'
      });
    }

    const user = linkedAccount.users;
    if (!user) {
      return NextResponse.json({
        user: null,
        linked: false,
        message: 'Linked account found but user data is missing'
      });
    }

    // Return user data (no sensitive information)
    const safeUserData = {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      created_at: user.created_at,
      discord_username: linkedAccount.platform_username,
      discord_verified: linkedAccount.verified
    };

    return NextResponse.json({
      user: safeUserData,
      linked: true,
      // Note: We're not providing auth token for security reasons
      // If the bot needs authenticated data, implement a separate bot authentication system
      authToken: null
    });

  } catch (error) {
    console.error('Bot API Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      user: null,
      linked: false
    }, { status: 500 });
  }
}