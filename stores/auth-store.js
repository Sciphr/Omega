import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useAuthStore = create((set, get) => ({
  // State
  user: null,
  session: null,
  loading: true,
  initialized: false,

  // Actions
  initialize: async () => {
    try {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession()
      
      set({ 
        session, 
        user: session?.user || null, 
        loading: false,
        initialized: true 
      })

      // Listen for auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session?.user)
        set({ 
          session, 
          user: session?.user || null,
          loading: false 
        })
      })
    } catch (error) {
      console.error('Auth initialization error:', error)
      set({ loading: false, initialized: true })
    }
  },

  signUp: async (email, password, userData = {}) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      })

      if (error) throw error

      // Immediately set the user state if sign up was successful
      console.log('Sign up response:', data)
      if (data.user && data.session) {
        console.log('Setting user state after signup:', data.user)
        set({ 
          user: data.user, 
          session: data.session, 
          loading: false 
        })
      } else {
        console.log('No session after signup, user may need to confirm email')
        set({ loading: false })
      }

      return { success: true, data }
    } catch (error) {
      set({ loading: false })
      return { success: false, error: error.message }
    }
  },

  signIn: async (email, password) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      // Immediately set the user state if sign in was successful
      console.log('Sign in response:', data)
      if (data.user && data.session) {
        console.log('Setting user state after signin:', data.user)
        set({ 
          user: data.user, 
          session: data.session, 
          loading: false 
        })
      } else {
        console.log('No session after signin')
        set({ loading: false })
      }

      return { success: true, data }
    } catch (error) {
      set({ loading: false })
      return { success: false, error: error.message }
    }
  },

  signOut: async () => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      set({ user: null, session: null, loading: false })
      return { success: true }
    } catch (error) {
      set({ loading: false })
      return { success: false, error: error.message }
    }
  },

  resetPassword: async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  updateProfile: async (updates) => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.updateUser({
        data: updates
      })

      if (error) throw error

      set({ loading: false })
      return { success: true }
    } catch (error) {
      set({ loading: false })
      return { success: false, error: error.message }
    }
  }
}))