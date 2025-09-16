import { createClient as createServerClient } from './supabase-server'
import { ACHIEVEMENT_REQUIREMENT_TYPES, SAMPLE_ACHIEVEMENTS } from './achievement-schema'

export class AchievementService {
  // Initialize achievements in database (run once during setup)
  static async initializeAchievements() {
    try {
      const supabase = await createServerClient()

      // Insert sample achievements if they don't exist
      for (const achievement of SAMPLE_ACHIEVEMENTS) {
        const { data: existing, error: checkError } = await supabase
          .from('achievements')
          .select('id')
          .eq('slug', achievement.slug)
          .single()

        if (checkError && checkError.code === 'PGRST116') {
          // Achievement doesn't exist, create it
          const { error: insertError } = await supabase
            .from('achievements')
            .insert({
              slug: achievement.slug,
              name: achievement.name,
              description: achievement.description,
              category: achievement.category,
              tier: achievement.tier,
              icon_emoji: achievement.icon_emoji,
              points: achievement.points,
              requirements: achievement.requirements,
              game_id: achievement.game_id || null
            })

          if (insertError) {
            console.error(`Error creating achievement ${achievement.slug}:`, insertError)
          } else {
            console.log(`Created achievement: ${achievement.name}`)
          }
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error initializing achievements:', error)
      return { success: false, error: error.message }
    }
  }

  // Track tournament participation
  static async trackTournamentParticipation(userId, tournamentData) {
    try {
      await this.checkAchievements(userId, 'tournament_participation', {
        tournament_id: tournamentData.id,
        tournament_name: tournamentData.name,
        game: tournamentData.game
      })
    } catch (error) {
      console.error('Error tracking tournament participation:', error)
    }
  }

  // Track tournament win
  static async trackTournamentWin(userId, tournamentData, isUndefeated = false) {
    try {
      const context = {
        tournament_id: tournamentData.id,
        tournament_name: tournamentData.name,
        game: tournamentData.game,
        participant_count: tournamentData.participants?.length || 0
      }

      await this.checkAchievements(userId, 'tournament_wins', context)

      // Check for perfect tournament (undefeated)
      if (isUndefeated) {
        await this.checkAchievements(userId, 'perfect_tournament', context)
      }
    } catch (error) {
      console.error('Error tracking tournament win:', error)
    }
  }

  // Track match win (for win streaks)
  static async trackMatchWin(userId, matchData, tournamentData) {
    try {
      const context = {
        match_id: matchData.id,
        tournament_id: tournamentData.id,
        game: tournamentData.game
      }

      await this.incrementProgress(userId, 'win_streak', 1, context)
      await this.checkAchievements(userId, 'win_streak', context)
    } catch (error) {
      console.error('Error tracking match win:', error)
    }
  }

  // Track match loss (reset win streak)
  static async trackMatchLoss(userId, matchData, tournamentData) {
    try {
      await this.resetProgress(userId, 'win_streak')
    } catch (error) {
      console.error('Error tracking match loss:', error)
    }
  }

  // Track comeback victory
  static async trackComebackVictory(userId, matchData, tournamentData, scoreDeficitPercentage) {
    try {
      const context = {
        match_id: matchData.id,
        tournament_id: tournamentData.id,
        game: tournamentData.game,
        score_deficit_percentage: scoreDeficitPercentage
      }

      await this.checkAchievements(userId, 'comeback_victory', context)
    } catch (error) {
      console.error('Error tracking comeback victory:', error)
    }
  }

  // Track tournament creation
  static async trackTournamentCreation(userId, tournamentData) {
    try {
      const context = {
        tournament_id: tournamentData.id,
        tournament_name: tournamentData.name,
        game: tournamentData.game
      }

      await this.checkAchievements(userId, 'tournament_creation', context)
    } catch (error) {
      console.error('Error tracking tournament creation:', error)
    }
  }

  // Core achievement checking logic
  static async checkAchievements(userId, eventType, context = {}) {
    try {
      const supabase = await createServerClient()

      // Get all achievements that could be triggered by this event
      const { data: achievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .contains('requirements', { type: eventType })

      if (achievementsError) throw achievementsError

      for (const achievement of achievements) {
        // Check if user already has this achievement
        const { data: existingAchievement, error: existingError } = await supabase
          .from('user_achievements')
          .select('id')
          .eq('user_id', userId)
          .eq('achievement_id', achievement.id)
          .single()

        if (existingError && existingError.code !== 'PGRST116') {
          console.error('Error checking existing achievement:', existingError)
          continue
        }

        if (existingAchievement) {
          continue // User already has this achievement
        }

        // Check if achievement requirements are met
        const requirementsMet = await this.checkRequirements(userId, achievement, context)

        if (requirementsMet) {
          await this.awardAchievement(userId, achievement, context)
        }
      }
    } catch (error) {
      console.error('Error checking achievements:', error)
    }
  }

  // Check if achievement requirements are met
  static async checkRequirements(userId, achievement, context) {
    try {
      const requirements = achievement.requirements
      const supabase = await createServerClient()

      switch (requirements.type) {
        case ACHIEVEMENT_REQUIREMENT_TYPES.TOURNAMENT_PARTICIPATION:
          const { count: participationCount } = await supabase
            .from('participants')
            .select('id', { count: 'exact' })
            .eq('user_id', userId)

          return participationCount >= requirements.count

        case ACHIEVEMENT_REQUIREMENT_TYPES.TOURNAMENT_WINS:
          const { count: winCount } = await supabase
            .from('tournaments')
            .select('id', { count: 'exact' })
            .eq('declared_winner_id', userId)
            .eq('status', 'completed')

          return winCount >= requirements.count

        case ACHIEVEMENT_REQUIREMENT_TYPES.WIN_STREAK:
          const currentStreak = await this.getProgress(userId, 'win_streak')
          return currentStreak >= requirements.count

        case ACHIEVEMENT_REQUIREMENT_TYPES.PERFECT_TOURNAMENT:
          // This is checked when tournament is won with undefeated flag
          return context.tournament_id && requirements.count === 1

        case ACHIEVEMENT_REQUIREMENT_TYPES.TOURNAMENT_CREATION:
          const { count: createdCount } = await supabase
            .from('tournaments')
            .select('id', { count: 'exact' })
            .eq('creator_id', userId)

          return createdCount >= requirements.count

        case ACHIEVEMENT_REQUIREMENT_TYPES.COMEBACK_VICTORY:
          return context.score_deficit_percentage >= requirements.score_deficit_percentage

        default:
          return false
      }
    } catch (error) {
      console.error('Error checking requirements:', error)
      return false
    }
  }

  // Award achievement to user
  static async awardAchievement(userId, achievement, context) {
    try {
      const supabase = await createServerClient()

      const { error: awardError } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievement.id,
          context_data: context,
          unlocked_at: new Date().toISOString()
        })

      if (awardError) throw awardError

      console.log(`🏆 Achievement unlocked for user ${userId}: ${achievement.name}`)

      // You could add notification system here
      // await this.sendAchievementNotification(userId, achievement)

      return { success: true, achievement }
    } catch (error) {
      console.error('Error awarding achievement:', error)
      return { success: false, error: error.message }
    }
  }

  // Increment progress for an achievement type
  static async incrementProgress(userId, progressKey, increment, context = {}) {
    try {
      const supabase = await createServerClient()

      const { data: existing, error: getError } = await supabase
        .from('achievement_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('progress_key', progressKey)
        .single()

      if (getError && getError.code !== 'PGRST116') throw getError

      if (existing) {
        // Update existing progress
        const { error: updateError } = await supabase
          .from('achievement_progress')
          .update({
            progress_value: existing.progress_value + increment,
            metadata: { ...existing.metadata, ...context },
            last_updated: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (updateError) throw updateError
      } else {
        // Create new progress entry
        const { error: insertError } = await supabase
          .from('achievement_progress')
          .insert({
            user_id: userId,
            progress_key: progressKey,
            progress_value: increment,
            metadata: context
          })

        if (insertError) throw insertError
      }
    } catch (error) {
      console.error('Error incrementing progress:', error)
    }
  }

  // Get current progress for a key
  static async getProgress(userId, progressKey) {
    try {
      const supabase = await createServerClient()

      const { data, error } = await supabase
        .from('achievement_progress')
        .select('progress_value')
        .eq('user_id', userId)
        .eq('progress_key', progressKey)
        .single()

      if (error && error.code === 'PGRST116') return 0
      if (error) throw error

      return data.progress_value || 0
    } catch (error) {
      console.error('Error getting progress:', error)
      return 0
    }
  }

  // Reset progress for a key
  static async resetProgress(userId, progressKey) {
    try {
      const supabase = await createServerClient()

      const { error } = await supabase
        .from('achievement_progress')
        .update({
          progress_value: 0,
          last_updated: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('progress_key', progressKey)

      if (error) throw error
    } catch (error) {
      console.error('Error resetting progress:', error)
    }
  }

  // Get user's achievements
  static async getUserAchievements(userId, includeProgress = false) {
    try {
      const supabase = await createServerClient()

      const { data: userAchievements, error } = await supabase
        .from('user_achievements')
        .select(`
          id,
          unlocked_at,
          is_featured,
          context_data,
          achievements:achievement_id (
            slug,
            name,
            description,
            category,
            tier,
            icon_emoji,
            points
          )
        `)
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false })

      if (error) throw error

      let progressData = []
      if (includeProgress) {
        const { data: progress, error: progressError } = await supabase
          .from('achievement_progress')
          .select('*')
          .eq('user_id', userId)

        if (progressError) throw progressError
        progressData = progress
      }

      return {
        success: true,
        achievements: userAchievements,
        progress: progressData
      }
    } catch (error) {
      console.error('Error getting user achievements:', error)
      return { success: false, error: error.message }
    }
  }

  // Get achievement leaderboard
  static async getAchievementLeaderboard(limit = 50) {
    try {
      const supabase = await createServerClient()

      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          user_id,
          users!inner (username, display_name),
          achievements!inner (points)
        `)
        .order('achievements.points', { ascending: false })
        .limit(limit)

      if (error) throw error

      // Group by user and sum points
      const leaderboard = data.reduce((acc, item) => {
        const userId = item.user_id
        if (!acc[userId]) {
          acc[userId] = {
            user_id: userId,
            username: item.users.username,
            display_name: item.users.display_name,
            total_points: 0,
            achievement_count: 0
          }
        }
        acc[userId].total_points += item.achievements.points
        acc[userId].achievement_count += 1
        return acc
      }, {})

      const sortedLeaderboard = Object.values(leaderboard)
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, limit)

      return { success: true, leaderboard: sortedLeaderboard }
    } catch (error) {
      console.error('Error getting achievement leaderboard:', error)
      return { success: false, error: error.message }
    }
  }
}