import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { TournamentService } from '@/lib/database'
import { supabase } from '@/lib/supabase'

export const useTournamentStore = create(
  subscribeWithSelector((set, get) => ({
    // State
    tournaments: [],
    currentTournament: null,
    participants: [],
    matches: [],
    loading: false,
    error: null,
    realTimeSubscriptions: new Map(),

    // Actions
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    
    // Tournament CRUD operations
    createTournament: async (tournamentData) => {
      set({ loading: true, error: null })
      try {
        const response = await fetch('/api/tournaments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tournamentData),
        })

        const result = await response.json()
        
        if (result.success) {
          set(state => ({
            tournaments: [result.tournament, ...state.tournaments],
            loading: false
          }))
          return result
        } else {
          set({ error: result.error, loading: false })
          return result
        }
      } catch (error) {
        set({ error: error.message, loading: false })
        return { success: false, error: error.message }
      }
    },

    fetchTournaments: async (filters = {}) => {
      set({ loading: true, error: null })
      try {
        const params = new URLSearchParams()
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value)
        })
        
        const response = await fetch(`/api/tournaments?${params}`)
        const result = await response.json()
        
        if (result.success) {
          set({ tournaments: result.tournaments, loading: false })
        } else {
          set({ error: result.error, loading: false })
        }
        
        return result
      } catch (error) {
        set({ error: error.message, loading: false })
        return { success: false, error: error.message }
      }
    },

    fetchTournament: async (tournamentId) => {
      set({ loading: true, error: null })
      try {
        const result = await TournamentService.getTournament(tournamentId)
        
        if (result.success) {
          set({
            currentTournament: result.tournament,
            participants: result.tournament.participants || [],
            matches: result.tournament.matches || [],
            loading: false
          })
          
          // Setup real-time subscription
          get().subscribeToTournament(tournamentId)
        } else {
          set({ error: result.error, loading: false })
        }
        
        return result
      } catch (error) {
        set({ error: error.message, loading: false })
        return { success: false, error: error.message }
      }
    },

    updateTournament: async (tournamentId, updates) => {
      set({ loading: true, error: null })
      try {
        const result = await TournamentService.updateTournament(tournamentId, updates)
        
        if (result.success) {
          set(state => ({
            currentTournament: state.currentTournament 
              ? { ...state.currentTournament, ...updates }
              : null,
            tournaments: state.tournaments.map(t => 
              t.id === tournamentId ? { ...t, ...updates } : t
            ),
            loading: false
          }))
        } else {
          set({ error: result.error, loading: false })
        }
        
        return result
      } catch (error) {
        set({ error: error.message, loading: false })
        return { success: false, error: error.message }
      }
    },

    deleteTournament: async (tournamentId) => {
      set({ loading: true, error: null })
      try {
        const result = await TournamentService.deleteTournament(tournamentId)
        
        if (result.success) {
          set(state => ({
            tournaments: state.tournaments.filter(t => t.id !== tournamentId),
            currentTournament: state.currentTournament?.id === tournamentId 
              ? null 
              : state.currentTournament,
            loading: false
          }))
          
          get().unsubscribeFromTournament(tournamentId)
        } else {
          set({ error: result.error, loading: false })
        }
        
        return result
      } catch (error) {
        set({ error: error.message, loading: false })
        return { success: false, error: error.message }
      }
    },

    // Participant management
    joinTournament: async (tournamentId, participantData, password) => {
      set({ loading: true, error: null })
      try {
        const result = await TournamentService.joinTournament(
          tournamentId, 
          participantData, 
          password
        )
        
        if (result.success) {
          set(state => ({
            participants: [...state.participants, result.participant],
            currentTournament: state.currentTournament 
              ? { 
                  ...state.currentTournament, 
                  current_participants: state.currentTournament.current_participants + 1 
                }
              : null,
            loading: false
          }))
        } else {
          set({ error: result.error, loading: false })
        }
        
        return result
      } catch (error) {
        set({ error: error.message, loading: false })
        return { success: false, error: error.message }
      }
    },

    addParticipant: async (tournamentId, participantData) => {
      // Similar to joinTournament but for admin adding participants
      return get().joinTournament(tournamentId, participantData)
    },

    removeParticipant: async (tournamentId, participantId) => {
      set({ loading: true, error: null })
      try {
        const { error } = await supabase
          .from('participants')
          .delete()
          .eq('id', participantId)
          .eq('tournament_id', tournamentId)

        if (error) throw error

        set(state => ({
          participants: state.participants.filter(p => p.id !== participantId),
          currentTournament: state.currentTournament 
            ? { 
                ...state.currentTournament, 
                current_participants: state.currentTournament.current_participants - 1 
              }
            : null,
          loading: false
        }))
        
        return { success: true }
      } catch (error) {
        set({ error: error.message, loading: false })
        return { success: false, error: error.message }
      }
    },

    updateParticipant: async (participantId, updates) => {
      set({ loading: true, error: null })
      try {
        const { error } = await supabase
          .from('participants')
          .update(updates)
          .eq('id', participantId)

        if (error) throw error

        set(state => ({
          participants: state.participants.map(p => 
            p.id === participantId ? { ...p, ...updates } : p
          ),
          loading: false
        }))
        
        return { success: true }
      } catch (error) {
        set({ error: error.message, loading: false })
        return { success: false, error: error.message }
      }
    },

    // Tournament operations
    startTournament: async (tournamentId) => {
      set({ loading: true, error: null })
      try {
        const result = await TournamentService.startTournament(tournamentId)
        
        if (result.success) {
          // Refetch tournament data to get updated matches
          await get().fetchTournament(tournamentId)
        } else {
          set({ error: result.error, loading: false })
        }
        
        return result
      } catch (error) {
        set({ error: error.message, loading: false })
        return { success: false, error: error.message }
      }
    },

    reportMatchScore: async (matchId, scoreData) => {
      set({ loading: true, error: null })
      try {
        const result = await TournamentService.reportMatchScore(matchId, scoreData)
        
        if (result.success) {
          // Update match in local state
          set(state => ({
            matches: state.matches.map(m => 
              m.id === matchId 
                ? { 
                    ...m, 
                    score: scoreData.score,
                    winner_id: scoreData.winnerId,
                    status: 'completed',
                    completed_at: new Date().toISOString()
                  }
                : m
            ),
            loading: false
          }))
        } else {
          set({ error: result.error, loading: false })
        }
        
        return result
      } catch (error) {
        set({ error: error.message, loading: false })
        return { success: false, error: error.message }
      }
    },

    resetMatch: async (matchId) => {
      set({ loading: true, error: null })
      try {
        const { error } = await supabase
          .from('matches')
          .update({
            score: null,
            winner_id: null,
            status: 'pending',
            completed_at: null
          })
          .eq('id', matchId)

        if (error) throw error

        set(state => ({
          matches: state.matches.map(m => 
            m.id === matchId 
              ? { 
                  ...m, 
                  score: null,
                  winner_id: null,
                  status: 'pending',
                  completed_at: null
                }
              : m
          ),
          loading: false
        }))
        
        return { success: true }
      } catch (error) {
        set({ error: error.message, loading: false })
        return { success: false, error: error.message }
      }
    },

    // Real-time subscriptions
    subscribeToTournament: (tournamentId) => {
      const subscriptions = get().realTimeSubscriptions
      
      // Don't create duplicate subscriptions
      if (subscriptions.has(tournamentId)) {
        return
      }

      const tournamentSubscription = supabase
        .channel(`tournament-${tournamentId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${tournamentId}`
        }, (payload) => {
          if (payload.eventType === 'UPDATE') {
            set(state => ({
              currentTournament: state.currentTournament?.id === tournamentId
                ? { ...state.currentTournament, ...payload.new }
                : state.currentTournament
            }))
          }
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `tournament_id=eq.${tournamentId}`
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            set(state => ({
              participants: [...state.participants, payload.new]
            }))
          } else if (payload.eventType === 'UPDATE') {
            set(state => ({
              participants: state.participants.map(p => 
                p.id === payload.new.id ? { ...p, ...payload.new } : p
              )
            }))
          } else if (payload.eventType === 'DELETE') {
            set(state => ({
              participants: state.participants.filter(p => p.id !== payload.old.id)
            }))
          }
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${tournamentId}`
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            set(state => ({
              matches: [...state.matches, payload.new]
            }))
          } else if (payload.eventType === 'UPDATE') {
            set(state => ({
              matches: state.matches.map(m => 
                m.id === payload.new.id ? { ...m, ...payload.new } : m
              )
            }))
          }
        })
        .subscribe()

      subscriptions.set(tournamentId, tournamentSubscription)
      set({ realTimeSubscriptions: subscriptions })
    },

    unsubscribeFromTournament: (tournamentId) => {
      const subscriptions = get().realTimeSubscriptions
      const subscription = subscriptions.get(tournamentId)
      
      if (subscription) {
        supabase.removeChannel(subscription)
        subscriptions.delete(tournamentId)
        set({ realTimeSubscriptions: subscriptions })
      }
    },

    unsubscribeFromAll: () => {
      const subscriptions = get().realTimeSubscriptions
      
      subscriptions.forEach((subscription) => {
        supabase.removeChannel(subscription)
      })
      
      set({ realTimeSubscriptions: new Map() })
    },

    // Cleanup
    cleanup: () => {
      get().unsubscribeFromAll()
      set({
        tournaments: [],
        currentTournament: null,
        participants: [],
        matches: [],
        loading: false,
        error: null
      })
    }
  }))
)