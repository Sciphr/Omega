import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function PUT(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Create client with user token for authentication
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 })
    }

    // Create service client with admin privileges  
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    // Verify current password using a completely separate client instance
    let passwordValid = false
    try {
      const testClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
      
      const { data, error } = await testClient.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      })

      if (data.user && !error) {
        passwordValid = true
        // Immediately sign out to clean up
        await testClient.auth.signOut()
      }
    } catch (verifyError) {
      console.log('Password verification failed:', verifyError)
      passwordValid = false
    }

    if (!passwordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    console.log('Attempting to update password for user:', user.id)

    // Update password using admin API
    const { data: updateData, error: updateError } = await serviceClient.auth.admin.updateUserById(user.id, {
      password: newPassword
    })

    console.log('Update result:', { updateData, updateError })

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update password',
        details: updateError.message 
      }, { status: 500 })
    }

    // Create a fresh session with the new password
    try {
      const freshClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      
      const { data: newSessionData, error: newSessionError } = await freshClient.auth.signInWithPassword({
        email: user.email,
        password: newPassword
      })

      if (newSessionData.session && !newSessionError) {
        return NextResponse.json({ 
          success: true,
          message: 'Password updated successfully',
          newSession: newSessionData.session
        })
      } else {
        console.warn('Could not create new session:', newSessionError)
        return NextResponse.json({ 
          success: true,
          message: 'Password updated successfully - please sign in again'
        })
      }
    } catch (sessionError) {
      console.warn('Could not generate new session:', sessionError)
      return NextResponse.json({ 
        success: true,
        message: 'Password updated successfully - please sign in again' 
      })
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}