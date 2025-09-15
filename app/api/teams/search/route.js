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

    // Get current user to check for private team access
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    let query
    let teams
    let error

    if (currentUser) {
      // For authenticated users, get both public teams and private teams they're members of
      // First get all teams with expanded data, then filter in memory
      const { data: allTeams, error: teamsError } = await supabase
        .from('user_teams')
        .select(`
          id,
          name,
          game,
          is_public,
          captain_id,
          created_at,
          team_stats!left (
            performance_rating,
            win_rate,
            tournaments_played,
            tournaments_won,
            total_wins,
            total_losses,
            average_placement,
            last_active
          ),
          captain:users!captain_id (
            display_name
          ),
          team_members!left (
            user_id
          )
        `)

      if (teamsError) {
        throw teamsError
      }

      // Filter teams: show public teams + private teams where user is member/captain
      const accessibleTeams = allTeams?.filter(team => {
        if (team.is_public) return true

        // Check if user is captain or member of private team
        const isCaptain = team.captain_id === currentUser.id
        const isMember = team.team_members?.some(member => member.user_id === currentUser.id)

        return isCaptain || isMember
      }) || []

      // Transform to match leaderboard format
      teams = accessibleTeams.map(team => ({
        id: team.id,
        name: team.name,
        game: team.game,
        captain_id: team.captain_id,
        captain_name: team.captain?.display_name || 'Unknown',
        performance_rating: team.team_stats?.[0]?.performance_rating || null,
        win_rate: team.team_stats?.[0]?.win_rate || null,
        tournaments_played: team.team_stats?.[0]?.tournaments_played || 0,
        tournaments_won: team.team_stats?.[0]?.tournaments_won || 0,
        total_wins: team.team_stats?.[0]?.total_wins || 0,
        total_losses: team.team_stats?.[0]?.total_losses || 0,
        average_placement: team.team_stats?.[0]?.average_placement || null,
        last_active: team.team_stats?.[0]?.last_active || null
      }))

    } else {
      // For unauthenticated users, only show public teams via leaderboard view
      query = supabase
        .from('team_leaderboard')
        .select('*')
    }

    // If using leaderboard view (unauthenticated), apply filters to query
    if (!currentUser && query) {
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

      const { data: queryResults, error: queryError } = await query
      teams = queryResults
      error = queryError
    } else if (currentUser) {
      // For authenticated users, apply filters to the teams array in memory
      let filteredTeams = teams

      // Apply search filter
      if (search.trim()) {
        const searchLower = search.trim().toLowerCase()
        filteredTeams = filteredTeams.filter(team =>
          team.name.toLowerCase().includes(searchLower) ||
          team.captain_name?.toLowerCase().includes(searchLower)
        )
      }

      // Apply game filter
      if (game.trim()) {
        filteredTeams = filteredTeams.filter(team => team.game === game.trim())
      }

      // Apply sorting
      const validSortFields = ['performance_rating', 'win_rate', 'tournaments_won', 'tournaments_played', 'last_active']
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'performance_rating'
      const ascending = sortOrder === 'asc'

      filteredTeams.sort((a, b) => {
        const aVal = a[sortField] ?? (ascending ? Infinity : -Infinity)
        const bVal = b[sortField] ?? (ascending ? Infinity : -Infinity)
        return ascending ? aVal - bVal : bVal - aVal
      })

      // Apply pagination
      const total = filteredTeams.length
      teams = filteredTeams.slice(offset, offset + limit)
    }

    if (error) {
      console.error('Error searching teams:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to search teams'
      }, { status: 500 })
    }

    // Calculate pagination based on the approach used
    let totalCount = 0
    if (!currentUser) {
      // For unauthenticated users, get count from leaderboard view
      let countQuery = supabase
        .from('team_leaderboard')
        .select('*', { count: 'exact', head: true })

      if (search.trim()) {
        countQuery = countQuery.or(`name.ilike.%${search.trim()}%,captain_name.ilike.%${search.trim()}%`)
      }
      if (game.trim()) {
        countQuery = countQuery.eq('game', game.trim())
      }

      const { count } = await countQuery
      totalCount = count || 0
    } else {
      // For authenticated users, use length of filtered results
      totalCount = teams?.length || 0
    }

    return NextResponse.json({
      success: true,
      teams: teams || [],
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      },
      filters: {
        search,
        game,
        sortBy,
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