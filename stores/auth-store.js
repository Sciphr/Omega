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
      
      // If user is logged in, ensure profile exists in users table
      if (session?.user) {
        try {
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', session.user.id)
            .single()
          
          if (!existingUser) {
            // Create user profile if it doesn't exist
            const baseUsername = session.user.user_metadata?.username || session.user.email.split('@')[0]
            let username = baseUsername
            let attempts = 0
            
            // Try to find a unique username
            while (attempts < 10) {
              const { data: existingUsername } = await supabase
                .from('users')
                .select('username')
                .eq('username', username)
                .single()
              
              if (!existingUsername) {
                break // Username is available
              }
              
              attempts++
              username = `${baseUsername}${attempts}`
            }
            
            await supabase
              .from('users')
              .insert({
                id: session.user.id,
                email: session.user.email,
                username: username,
                display_name: session.user.user_metadata?.display_name || session.user.user_metadata?.username || session.user.email.split('@')[0],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
          }
        } catch (error) {
          console.error('Error ensuring user profile exists:', error)
        }
      }
      
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
        
        // Create user profile in users table
        try {
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              username: userData.username || data.user.email.split('@')[0],
              display_name: userData.display_name || userData.username || data.user.email.split('@')[0],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          
          if (profileError) {
            console.error('Error creating user profile during signup:', profileError)
          }
        } catch (profileError) {
          console.error('Failed to create user profile:', profileError)
        }
        
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