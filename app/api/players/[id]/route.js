import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Get player profile by ID with game profiles, stats, and tournament history
export async function GET(request, { params }) {
  try {
    const supabase = await createClient()
    const { id: playerId } = await params
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get('game')

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(playerId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid player ID format'
      }, { status: 400 })
    }

    // Fetch player basic info from our custom users table
    const { data: player, error: playerError } = await supabase
      .from('users')
      .select(`
        id,
        username,
        display_name,
        email,
        created_at
      `)
      .eq('id', playerId)
      .single()

    if (playerError) {
      console.error('Error fetching player:', playerError)
      // Check if it's a "not found" error vs other database errors
      if (playerError.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Player not found'
        }, { status: 404 })
      } else {
        return NextResponse.json({
          success: false,
          error: 'Database error'
        }, { status: 500 })
      }
    }

    // Fetch all game profiles for this player
    const { data: gameProfiles, error: profilesError } = await supabase
      .from('user_game_profiles')
      .select('*')
      .eq('user_id', playerId)

    if (profilesError) {
      console.error('Error fetching game profiles:', profilesError)
    }

    // Fetch player stats (if gameId specified, get that specific game, otherwise get all)
    let statsQuery = supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', playerId)

    if (gameId) {
      statsQuery = statsQuery.eq('game_id', gameId)
    }

    const { data: playerStats, error: statsError } = await statsQuery

    if (statsError) {
      console.error('Error fetching player stats:', statsError)
    }

    // Get the primary stats record (either specified game or highest performance rating)
    let primaryStats = null
    let currentGame = null
    if (playerStats && playerStats.length > 0) {
      if (gameId) {
        primaryStats = playerStats.find(s => s.game_id === gameId)
        currentGame = gameId
      } else {
        // Get the game with highest performance rating
        primaryStats = playerStats.reduce((prev, current) =>
          (prev.performance_rating || 0) > (current.performance_rating || 0) ? prev : current
        )
        currentGame = primaryStats?.game_id
      }
    }

    // Get current game profile
    const currentGameProfile = gameProfiles?.find(gp => gp.game_id === currentGame)

    // Fetch tournament results for the player
    let tournamentQuery = supabase
      .from('player_tournament_results')
      .select(`
        *,
        tournament:tournaments(
          id,
          name
        )
      `)
      .eq('user_id', playerId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (currentGame) {
      // If we have a current game, try to get tournaments from that game
      const { data: tournamentsByGame } = await supabase
        .from('player_tournament_results')
        .select(`
          *,
          tournament:tournaments!inner(
            id,
            name,
            game
          )
        `)
        .eq('user_id', playerId)
        .eq('tournament.game', currentGame)
        .order('created_at', { ascending: false })
        .limit(10)

      if (tournamentsByGame && tournamentsByGame.length > 0) {
        tournamentQuery = supabase
          .from('player_tournament_results')
          .select(`
            *,
            tournament:tournaments!inner(
              id,
              name,
              game
            )
          `)
          .eq('user_id', playerId)
          .eq('tournament.game', currentGame)
          .order('created_at', { ascending: false })
          .limit(10)
      }
    }

    const { data: tournamentResults } = await tournamentQuery

    // Format tournament results
    const formattedResults = tournamentResults?.map(result => ({
      ...result,
      tournament_name: result.tournament?.name || 'Unknown Tournament'
    })) || []

    // Construct response
    const playerData = {
      id: player.id,
      username: player.username,
      display_name: player.display_name,
      email: player.email,
      created_at: player.created_at,
      current_game: currentGame,
      game_profile: currentGameProfile,
      game_profiles: gameProfiles || [],
      stats: primaryStats,
      all_stats: playerStats || [],
      tournament_results: formattedResults
    }

    return NextResponse.json({
      success: true,
      player: playerData
    })

  } catch (error) {
    console.error('Player profile error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}