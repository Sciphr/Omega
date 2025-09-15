import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Search players with filters and sorting
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Extract search parameters
    const search = searchParams.get('search') || ''
    const game = searchParams.get('game') || ''
    const sortBy = searchParams.get('sortBy') || 'performance_rating' // 'performance_rating', 'win_rate', 'tournaments_won', 'kda_ratio', 'last_active'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build the query using the player_leaderboard view or join tables
    let query = supabase
      .from('users')
      .select(`
        id,
        username,
        display_name,
        email,
        player_stats (
          user_id,
          game_id,
          performance_rating,
          win_rate,
          tournaments_played,
          tournaments_won,
          kda_ratio,
          preferred_role,
          last_active,
          total_kills,
          total_deaths,
          total_assists,
          mvp_awards
        ),
        user_game_profiles (
          game_id,
          display_name,
          rank
        )
      `)

    // Apply search filter
    if (search.trim()) {
      query = query.or(`username.ilike.%${search.trim()}%,display_name.ilike.%${search.trim()}%`)
    }

    // Apply sorting - for now, sort by username since we can't easily sort by player_stats fields without inner join
    const ascending = sortOrder === 'asc'
    query = query.order('username', { ascending, nullsLast: true })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: players, error, count } = await query

    if (error) {
      console.error('Error searching players:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to search players'
      }, { status: 500 })
    }

    // Transform data to flatten player_stats and add game_profile
    const transformedPlayers = players?.map(player => {
      // Filter stats by game if specified, otherwise get the first stats record or best performance
      let stats = null
      if (game.trim() && player.player_stats?.length > 0) {
        stats = player.player_stats.find(s => s.game_id === game.trim())
      } else if (player.player_stats?.length > 0) {
        // Get stats with highest performance rating
        stats = player.player_stats.reduce((prev, current) =>
          (prev.performance_rating || 0) > (current.performance_rating || 0) ? prev : current
        )
      }

      const gameProfile = player.user_game_profiles?.find(gp => gp.game_id === stats?.game_id)

      return {
        user_id: player.id,
        username: player.username,
        display_name: player.display_name,
        email: player.email,
        game_id: stats?.game_id,
        performance_rating: stats?.performance_rating,
        win_rate: stats?.win_rate,
        tournaments_played: stats?.tournaments_played,
        tournaments_won: stats?.tournaments_won,
        kda_ratio: stats?.kda_ratio,
        preferred_role: stats?.preferred_role,
        last_active: stats?.last_active,
        total_kills: stats?.total_kills,
        total_deaths: stats?.total_deaths,
        total_assists: stats?.total_assists,
        mvp_awards: stats?.mvp_awards,
        game_profile: gameProfile
      }
    }) || []

    // Filter out players who don't match the game filter (if specified)
    const filteredPlayers = game.trim()
      ? transformedPlayers.filter(p => p.game_id === game.trim() || !p.game_id) // Include players with no stats when filtering by game
      : transformedPlayers

    // Get total count for pagination (simplified for now)
    let countQuery = supabase
      .from('users')
      .select('id', { count: 'exact', head: true })

    if (search.trim()) {
      countQuery = countQuery.or(`username.ilike.%${search.trim()}%,display_name.ilike.%${search.trim()}%`)
    }

    const { count: totalCount } = await countQuery

    return NextResponse.json({
      success: true,
      players: filteredPlayers,
      pagination: {
        page,
        limit,
        total: filteredPlayers.length, // Use filtered count for now
        totalPages: Math.ceil(filteredPlayers.length / limit),
        hasNext: page * limit < filteredPlayers.length,
        hasPrev: page > 1
      },
      filters: {
        search,
        game,
        sortBy: 'username', // Updated to reflect actual sorting
        sortOrder
      }
    })

  } catch (error) {
    console.error('Player search error:', error)
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

    // Get distinct games from player_stats
    const { data: games, error } = await supabase
      .from('player_stats')
      .select('game_id')
      .not('game_id', 'is', null)
      .order('game_id')

    if (error) {
      console.error('Error fetching games:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch games'
      }, { status: 500 })
    }

    // Extract unique games
    const uniqueGames = [...new Set(games.map(g => g.game_id).filter(Boolean))]

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