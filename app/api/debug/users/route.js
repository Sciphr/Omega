import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request) {
  try {
    const supabase = await createClient()

    // Try with service role key to bypass RLS
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    console.log('Testing both clients...')

    // Test regular client
    const { data: users1, error: error1 } = await supabase
      .from('users')
      .select('id, username, display_name, email, created_at')
      .limit(5)

    // Test service client
    const { data: users2, error: error2 } = await serviceSupabase
      .from('users')
      .select('id, username, display_name, email, created_at')
      .limit(5)

    console.log('Debug users query:', {
      regularClient: { usersCount: users1?.length || 0, error: error1 },
      serviceClient: { usersCount: users2?.length || 0, error: error2 },
      sample: users2?.[0]
    })

    return NextResponse.json({
      success: true,
      regularClient: { users: users1 || [], error: error1 },
      serviceClient: { users: users2 || [], error: error2 }
    })
  } catch (error) {
    console.error('Debug users error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}