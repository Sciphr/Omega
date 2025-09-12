import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ 
        success: false, 
        error: 'Query must be at least 2 characters long' 
      }, { status: 400 })
    }

    // Search users by username, display_name, or email
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, display_name, email')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10)

    if (error) {
      console.error('Failed to search users:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to search users' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      users: users || []
    })
  } catch (error) {
    console.error('User search error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}