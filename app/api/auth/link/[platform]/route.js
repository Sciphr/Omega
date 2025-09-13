import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

// Platform OAuth configurations
const OAUTH_CONFIGS = {
  discord: {
    authUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userUrl: 'https://discord.com/api/users/@me',
    scopes: 'identify',
    clientId: process.env.DISCORD_CLIENT_ID
  }
}

// Start OAuth linking flow
export async function GET(request, { params }) {
  try {
    const { platform } = await params
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    const config = OAUTH_CONFIGS[platform]
    if (!config) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unsupported platform' 
      }, { status: 400 })
    }

    // Generate state token for CSRF protection
    const stateToken = crypto.randomUUID()
    
    // Store linking session
    const { error: sessionError } = await serviceSupabase
      .from('account_linking_sessions')
      .insert({
        user_id: user.id,
        platform,
        state_token: stateToken,
        oauth_state: { redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/link/${platform}/callback` }
      })

    if (sessionError) {
      console.error('Error creating linking session:', sessionError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to start linking process' 
      }, { status: 500 })
    }

    if (config.isOpenId) {
      // Steam OpenID flow
      const params = new URLSearchParams({
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/link/steam/callback?state=${stateToken}`,
        'openid.realm': process.env.NEXT_PUBLIC_APP_URL,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
      })
      
      return NextResponse.redirect(`${config.authUrl}?${params.toString()}`)
    } else {
      // Standard OAuth2 flow
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/link/${platform}/callback`,
        response_type: 'code',
        scope: config.scopes,
        state: stateToken
      })
      
      return NextResponse.redirect(`${config.authUrl}?${params.toString()}`)
    }

  } catch (error) {
    console.error('OAuth linking start error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}