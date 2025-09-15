import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Search teams with filters and sorting
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Extract search parameters
    const search = searchParams.get('search') || ''
    const game = searchParams.get('game') || ''
    const sortBy = searchParams.get('sortBy') || 'performance_rating' // 'performance_rating', 'win_rate', 'tournaments_won', 'last_active'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build the query using the team_leaderboard view
    let query = supabase
      .from('team_leaderboard')
      .select('*')

    // Apply search filter
    if (search.trim()) {
      query = query.or(`name.ilike.%${search.trim()}%,captain_name.ilike.%${search.trim()}%`)
    }

    // Apply game filter
    if (game.trim()) {
      query = query.eq('game', game.trim())
    }

    // Apply sorting
    const validSortFields = ['performance_rating', 'win_rate', 'tournaments_won', 'tournaments_played', 'last_active']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'performance_rating'
    const order = sortOrder === 'asc' ? { ascending: true } : { ascending: false }

    query = query.order(sortField, { ...order, nullsLast: true })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: teams, error, count } = await query

    if (error) {
      console.error('Error searching teams:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to search teams'
      }, { status: 500 })
    }

    // Get total count for pagination (separate query needed)
    let countQuery = supabase
      .from('team_leaderboard')
      .select('*', { count: 'exact', head: true })

    if (search.trim()) {
      countQuery = countQuery.or(`name.ilike.%${search.trim()}%,captain_name.ilike.%${search.trim()}%`)
    }
    if (game.trim()) {
      countQuery = countQuery.eq('game', game.trim())
    }

    const { count: totalCount } = await countQuery

    return NextResponse.json({
      success: true,
      teams: teams || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
        hasNext: page * limit < (totalCount || 0),
        hasPrev: page > 1
      },
      filters: {
        search,
        game,
        sortBy: sortField,
        sortOrder
      }
    })

  } catch (error) {
    console.error('Team search error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Get available games for filtering
export async function POST(request) {
  try {
    const supabase = await createClient()

    // Get distinct games from user_teams
    const { data: games, error } = await supabase
      .from('user_teams')
      .select('game')
      .not('game', 'is', null)
      .order('game')

    if (error) {
      console.error('Error fetching games:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch games'
      }, { status: 500 })
    }

    // Extract unique games
    const uniqueGames = [...new Set(games.map(g => g.game).filter(Boolean))]

    return NextResponse.json({
      success: true,
      games: uniqueGames
    })

  } catch (error) {
    console.error('Get games error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}