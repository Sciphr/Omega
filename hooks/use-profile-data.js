import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/lib/api'

// Query keys
export const queryKeys = {
  tournaments: (userId) => ['tournaments', userId],
  games: (userId) => ['games', userId], 
  teams: (userId) => ['teams', userId],
  linkedAccounts: (userId) => ['linkedAccounts', userId],
}

// Custom hooks for profile data
export function useUserTournaments() {
  const { user } = useAuthStore()
  
  return useQuery({
    queryKey: queryKeys.tournaments(user?.id),
    queryFn: api.fetchUserTournaments,
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - tournaments don't change that often
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  })
}

export function useUserGames() {
  const { user } = useAuthStore()
  
  return useQuery({
    queryKey: queryKeys.games(user?.id),
    queryFn: api.fetchUserGames,
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  })
}

export function useUserTeams() {
  const { user } = useAuthStore()
  
  return useQuery({
    queryKey: queryKeys.teams(user?.id),
    queryFn: api.fetchUserTeams,
    enabled: !!user?.id,
    staleTime: 3 * 60 * 1000, // 3 minutes - teams change somewhat frequently
    gcTime: 8 * 60 * 1000,
  })
}

export function useLinkedAccounts() {
  const { user } = useAuthStore()
  
  return useQuery({
    queryKey: queryKeys.linkedAccounts(user?.id),
    queryFn: api.fetchLinkedAccounts,
    enabled: !!user?.id,
    staleTime: 15 * 60 * 1000, // 15 minutes - linked accounts rarely change
    gcTime: 20 * 60 * 1000,
  })
}

// Combined hook for all profile data
export function useProfileData() {
  const tournaments = useUserTournaments()
  const games = useUserGames()
  const teams = useUserTeams()
  const linkedAccounts = useLinkedAccounts()

  return {
    tournaments,
    games,
    teams,
    linkedAccounts,
    // Combined loading state
    isLoading: tournaments.isLoading || games.isLoading || teams.isLoading || linkedAccounts.isLoading,
    // Combined error state
    error: tournaments.error || games.error || teams.error || linkedAccounts.error,
    // Refetch all data
    refetchAll: () => Promise.all([
      tournaments.refetch(),
      games.refetch(),
      teams.refetch(),
      linkedAccounts.refetch(),
    ])
  }
}