// Discord Bot Integration Helpers
// This file provides utilities for Discord bot integration

import { createServiceClient } from './supabase-server'

export class DiscordIntegration {
  
  /**
   * Find a user by their Discord ID
   * @param {string} discordUserId - Discord user ID
   * @returns {Object|null} User data with linked accounts
   */
  static async findUserByDiscordId(discordUserId) {
    try {
      const supabase = createServiceClient()
      
      const { data: linkedAccount, error } = await supabase
        .from('user_linked_accounts')
        .select(`
          *,
          user:users(*)
        `)
        .eq('platform', 'discord')
        .eq('platform_user_id', discordUserId)
        .eq('verified', true)
        .single()
      
      if (error || !linkedAccount) {
        return null
      }
      
      return {
        user: linkedAccount.user,
        discordAccount: linkedAccount
      }
    } catch (error) {
      console.error('Error finding user by Discord ID:', error)
      return null
    }
  }

  /**
   * Get all Discord-linked users for a tournament
   * @param {string} tournamentId - Tournament ID
   * @returns {Array} Array of users with Discord accounts
   */
  static async getTournamentDiscordUsers(tournamentId) {
    try {
      const supabase = createServiceClient()
      
      // Get tournament participants
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select(`
          *,
          user:users(*),
          tournament:tournaments(*)
        `)
        .eq('tournament_id', tournamentId)
      
      if (participantsError) {
        console.error('Error fetching participants:', participantsError)
        return []
      }
      
      // Get Discord accounts for these users
      const userIds = participants.map(p => p.user_id).filter(Boolean)
      
      if (userIds.length === 0) {
        return []
      }
      
      const { data: discordAccounts, error: discordError } = await supabase
        .from('user_linked_accounts')
        .select('*')
        .eq('platform', 'discord')
        .eq('verified', true)
        .in('user_id', userIds)
      
      if (discordError) {
        console.error('Error fetching Discord accounts:', discordError)
        return []
      }
      
      // Combine participant and Discord data
      return participants.map(participant => {
        const discordAccount = discordAccounts.find(
          account => account.user_id === participant.user_id
        )
        
        return {
          participant,
          user: participant.user,
          discordAccount: discordAccount || null,
          hasDiscord: !!discordAccount
        }
      }).filter(item => item.hasDiscord) // Only return users with Discord
      
    } catch (error) {
      console.error('Error getting tournament Discord users:', error)
      return []
    }
  }

  /**
   * Get user's active matches that need Discord notifications
   * @param {string} userId - User ID
   * @returns {Array} Array of active matches
   */
  static async getUserActiveMatches(userId) {
    try {
      const supabase = createServiceClient()
      
      const { data: matches, error } = await supabase
        .from('matches')
        .select(`
          *,
          tournament:tournaments(*),
          participant1:participants!matches_participant1_id_fkey(*),
          participant2:participants!matches_participant2_id_fkey(*)
        `)
        .or(`participant1.user_id.eq.${userId},participant2.user_id.eq.${userId}`)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching user matches:', error)
        return []
      }
      
      return matches || []
    } catch (error) {
      console.error('Error getting user active matches:', error)
      return []
    }
  }

  /**
   * Create a Discord embed for match notification
   * @param {Object} match - Match data
   * @param {string} type - Notification type ('ready', 'started', 'completed', etc.)
   * @returns {Object} Discord embed object
   */
  static createMatchEmbed(match, type) {
    const tournament = match.tournament
    const participant1 = match.participant1
    const participant2 = match.participant2
    
    let title, description, color
    
    switch (type) {
      case 'ready_check':
        title = '⏰ Match Ready Check'
        description = `Your match in **${tournament.name}** is ready to start!`
        color = 0x3B82F6 // Blue
        break
        
      case 'match_started':
        title = '🎮 Match Started'
        description = `Your match in **${tournament.name}** has begun!`
        color = 0x10B981 // Green
        break
        
      case 'opponent_ready':
        title = '✅ Opponent Ready'
        description = `Your opponent has marked ready for your match in **${tournament.name}**`
        color = 0x8B5CF6 // Purple
        break
        
      case 'match_completed':
        title = '🏆 Match Completed'
        description = `Your match in **${tournament.name}** has been completed!`
        color = 0xF59E0B // Amber
        break
        
      default:
        title = '📢 Tournament Update'
        description = `Update for your match in **${tournament.name}**`
        color = 0x6B7280 // Gray
    }
    
    const fields = [
      {
        name: 'Tournament',
        value: tournament.name,
        inline: true
      },
      {
        name: 'Match',
        value: `${participant1?.participant_name || 'TBD'} vs ${participant2?.participant_name || 'TBD'}`,
        inline: true
      },
      {
        name: 'Game',
        value: tournament.game || 'Unknown',
        inline: true
      }
    ]
    
    if (match.status === 'completed' && match.winner_id) {
      const winner = match.winner_id === participant1?.id ? participant1 : participant2
      fields.push({
        name: 'Winner',
        value: `🏆 ${winner?.participant_name || 'Unknown'}`,
        inline: false
      })
      
      if (match.participant1_score !== null && match.participant2_score !== null) {
        fields.push({
          name: 'Final Score',
          value: `${match.participant1_score} - ${match.participant2_score}`,
          inline: true
        })
      }
    }
    
    return {
      title,
      description,
      color,
      fields,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Omega Tournament Platform'
      }
    }
  }

  /**
   * Format user mention for Discord
   * @param {string} discordUserId - Discord user ID
   * @returns {string} Discord mention string
   */
  static formatUserMention(discordUserId) {
    return `<@${discordUserId}>`
  }

  /**
   * Get tournament role name for Discord server
   * @param {Object} tournament - Tournament data
   * @returns {string} Role name
   */
  static getTournamentRoleName(tournament) {
    return `Tournament-${tournament.name.replace(/[^a-zA-Z0-9]/g, '-')}`
  }

  /**
   * Log Discord bot activity
   * @param {string} action - Action performed
   * @param {Object} data - Action data
   */
  static async logBotActivity(action, data) {
    try {
      const supabase = createServiceClient()
      
      await supabase
        .from('bot_activity_logs')
        .insert({
          platform: 'discord',
          action,
          data,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Error logging bot activity:', error)
      // Don't throw - logging failures shouldn't break bot functionality
    }
  }
}

// Bot activity log table (optional - for tracking bot usage)
export const createBotActivityTable = `
CREATE TABLE IF NOT EXISTS bot_activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_activity_logs_platform ON bot_activity_logs(platform);
CREATE INDEX IF NOT EXISTS idx_bot_activity_logs_created_at ON bot_activity_logs(created_at);
`