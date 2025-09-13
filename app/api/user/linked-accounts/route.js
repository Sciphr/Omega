import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

// Get user's linked accounts
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    const { data: linkedAccounts, error } = await supabase
      .from('user_linked_accounts')
      .select(`
        *,
        game_profiles (*)
      `)
      .eq('user_id', user.id)
      .order('linked_at', { ascending: false })

    if (error) {
      console.error('Error fetching linked accounts:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch linked accounts' 
      }, { status: 500 })
    }

    // Remove sensitive data before sending to client
    const sanitizedAccounts = linkedAccounts.map(account => ({
      ...account,
      access_token: undefined,
      refresh_token: undefined
    }))

    return NextResponse.json({
      success: true,
      linkedAccounts: sanitizedAccounts
    })

  } catch (error) {
    console.error('Linked accounts API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Update linked account settings
export async function PUT(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    const { accountId, is_public } = await request.json()

    const { error } = await supabase
      .from('user_linked_accounts')
      .update({ 
        is_public,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId)
      .eq('user_id', user.id) // Ensure user owns this account

    if (error) {
      console.error('Error updating linked account:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update account settings' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Account settings updated'
    })

  } catch (error) {
    console.error('Update linked account API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Unlink an account
export async function DELETE(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('id')

    if (!accountId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Account ID required' 
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_linked_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', user.id) // Ensure user owns this account

    if (error) {
      console.error('Error unlinking account:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to unlink account' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Account unlinked successfully'
    })

  } catch (error) {
    console.error('Unlink account API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}