import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

// Platform OAuth configurations (same as before)
const OAUTH_CONFIGS = {
  discord: {
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userUrl: 'https://discord.com/api/users/@me',
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET
  }
}

// Handle OAuth callback
export async function GET(request, { params }) {
  try {
    const { platform } = await params
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    
    const serviceSupabase = createServiceClient()

    if (error) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?linking_error=${encodeURIComponent(error)}`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?linking_error=missing_parameters`)
    }

    // Verify state token and get linking session
    const { data: session, error: sessionError } = await serviceSupabase
      .from('account_linking_sessions')
      .select('*')
      .eq('state_token', state)
      .eq('platform', platform)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (sessionError || !session) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?linking_error=invalid_session`)
    }

    const config = OAUTH_CONFIGS[platform]
    if (!config) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?linking_error=unsupported_platform`)
    }

    // Handle Steam OpenID (different flow)
    if (platform === 'steam') {
      return handleSteamCallback(request, session, serviceSupabase)
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/link/${platform}/callback`
      })
    })

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text())
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?linking_error=token_exchange_failed`)
    }

    const tokenData = await tokenResponse.json()

    // Get user info from platform
    const userResponse = await fetch(config.userUrl, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    if (!userResponse.ok) {
      console.error('User info fetch failed:', await userResponse.text())
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?linking_error=user_info_failed`)
    }

    const userData = await userResponse.json()

    // Store linked account
    const linkedAccountData = {
      user_id: session.user_id,
      platform,
      platform_user_id: userData.id || userData.puuid,
      platform_username: userData.username || userData.gameName || userData.global_name,
      platform_data: userData,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: tokenData.expires_in ? 
        new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
      verified: true
    }

    const { error: linkError } = await serviceSupabase
      .from('user_linked_accounts')
      .upsert(linkedAccountData, {
        onConflict: 'user_id,platform'
      })

    if (linkError) {
      console.error('Error saving linked account:', linkError)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?linking_error=save_failed`)
    }

    // Clean up session
    await serviceSupabase
      .from('account_linking_sessions')
      .delete()
      .eq('id', session.id)

    // Redirect back to profile with success
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?linking_success=${platform}`)

  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?linking_error=internal_error`)
  }
}

async function handleSteamCallback(request, session, serviceSupabase) {
  const { searchParams } = new URL(request.url)
  
  // Steam OpenID verification
  const openidParams = {}
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith('openid.')) {
      openidParams[key] = value
    }
  }

  // Verify with Steam
  openidParams['openid.mode'] = 'check_authentication'
  
  const verifyResponse = await fetch('https://steamcommunity.com/openid/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(openidParams)
  })

  const verifyText = await verifyResponse.text()
  
  if (!verifyText.includes('is_valid:true')) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?linking_error=steam_verification_failed`)
  }

  // Extract Steam ID
  const identity = openidParams['openid.identity']
  const steamId = identity.split('/').pop()

  // Get Steam user info
  const steamResponse = await fetch(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${process.env.STEAM_API_KEY}&steamids=${steamId}`
  )

  const steamData = await steamResponse.json()
  const player = steamData.response?.players?.[0]

  if (!player) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?linking_error=steam_user_info_failed`)
  }

  // Store linked account
  const linkedAccountData = {
    user_id: session.user_id,
    platform: 'steam',
    platform_user_id: steamId,
    platform_username: player.personaname,
    platform_data: player,
    verified: true
  }

  const { error: linkError } = await serviceSupabase
    .from('user_linked_accounts')
    .upsert(linkedAccountData, {
      onConflict: 'user_id,platform'
    })

  if (linkError) {
    console.error('Error saving Steam account:', linkError)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?linking_error=save_failed`)
  }

  // Clean up session
  await serviceSupabase
    .from('account_linking_sessions')
    .delete()
    .eq('id', session.id)

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?linking_success=steam`)
}