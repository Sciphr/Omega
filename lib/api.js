import { useAuthStore } from '@/stores/auth-store'

// Helper function to get auth headers
export const getAuthHeaders = () => {
  const { session } = useAuthStore.getState()
  if (!session?.access_token) {
    throw new Error('No auth token available')
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  }
}

// API functions for React Query
export const api = {
  // Fetch user tournaments
  async fetchUserTournaments() {
    const headers = getAuthHeaders()
    const response = await fetch('/api/user/tournaments', { headers })
    if (!response.ok) {
      throw new Error(`Failed to fetch tournaments: ${response.status}`)
    }
    const data = await response.json()
    return data.tournaments || []
  },

  // Fetch user games/profiles
  async fetchUserGames() {
    const headers = getAuthHeaders()
    const response = await fetch('/api/user/games', { headers })
    if (!response.ok) {
      throw new Error(`Failed to fetch games: ${response.status}`)
    }
    const data = await response.json()
    // Transform to match component structure
    const transformedGames = data.gameProfiles?.map(profile => ({
      id: profile.id,
      gameId: profile.game_id,
      displayName: profile.display_name,
      rank: profile.rank,
      notes: profile.notes
    })) || []
    return transformedGames
  },

  // Fetch user teams
  async fetchUserTeams() {
    const headers = getAuthHeaders()
    const response = await fetch('/api/teams', { headers })
    if (!response.ok) {
      throw new Error(`Failed to fetch teams: ${response.status}`)
    }
    const data = await response.json()
    // Transform teams data to match component structure
    const allTeams = (data.teams || []).map(team => ({
      id: team.id,
      name: team.name,
      game: team.game,
      role: team.captain_id === useAuthStore.getState().user?.id ? 'leader' : 'member',
      members: (team.member_details?.length || 1) - 1, // Subtract 1 to exclude captain (match team detail page)
      created_at: team.created_at
    }))
    return allTeams
  },

  // Fetch linked accounts
  async fetchLinkedAccounts() {
    const headers = getAuthHeaders()
    const response = await fetch('/api/user/linked-accounts', { headers })
    if (!response.ok) {
      throw new Error(`Failed to fetch linked accounts: ${response.status}`)
    }
    const data = await response.json()
    return data.linkedAccounts || []
  }
}