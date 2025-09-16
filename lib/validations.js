import { z } from 'zod'
import { TOURNAMENT_FORMAT, TOURNAMENT_TYPE, PARTICIPATION_TYPE, SEEDING_TYPE, MATCH_FORMAT, GAME_TEMPLATES, ROUND_ROBIN_TYPE, GROUP_CREATION_METHOD } from './types'

// Tournament validation schemas
export const createTournamentSchema = z.object({
  name: z.string()
    .min(3, 'Tournament name must be at least 3 characters')
    .max(100, 'Tournament name cannot exceed 100 characters'),
  description: z.string()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional(),
  game: z.enum(Object.values(GAME_TEMPLATES).map(g => g.id)),
  format: z.enum(Object.values(TOURNAMENT_FORMAT)),
  tournamentType: z.enum(Object.values(TOURNAMENT_TYPE)),
  teamSize: z.number()
    .min(1, 'Team size must be at least 1')
    .max(20, 'Team size cannot exceed 20 players'),
  maxParticipants: z.number()
    .min(4, 'Minimum 4 participants required')
    .max(128, 'Maximum 128 participants allowed'),
  participationType: z.enum(Object.values(PARTICIPATION_TYPE)),
  seedingType: z.enum(Object.values(SEEDING_TYPE)),
  // Round robin specific fields
  roundRobinType: z.enum(Object.values(ROUND_ROBIN_TYPE)).optional(),
  groupCount: z.number().min(2).max(8).optional(),
  groupCreationMethod: z.enum(Object.values(GROUP_CREATION_METHOD)).optional(),
  password: z.string()
    .min(4, 'Password must be at least 4 characters')
    .optional()
    .or(z.literal('')),
  isPublic: z.boolean().default(true),
  creatorName: z.string()
    .min(2, 'Creator name must be at least 2 characters')
    .max(50, 'Creator name cannot exceed 50 characters')
    .optional(),
  settings: z.object({
    matchFormat: z.enum(Object.values(MATCH_FORMAT)),
    allowForfeits: z.boolean().default(true),
    autoAdvance: z.boolean().default(false),
    scoreConfirmationRequired: z.boolean().default(true),
    checkInRequired: z.boolean().default(false),
    checkInDeadline: z.date().optional().nullable(),
    registrationDeadline: z.date().optional().nullable(),
    startTime: z.date().optional().nullable(),
    rules: z.string().max(2000, 'Rules cannot exceed 2000 characters').optional(),
    prizeInfo: z.string().max(500, 'Prize info cannot exceed 500 characters').optional(),
    // Draft/Ban Settings
    enableDraftBan: z.boolean().default(false),
    draftBanSettings: z.object({
      enableBans: z.boolean().default(true),
      enableDrafts: z.boolean().default(true),
      bansPerSide: z.number().min(0).max(10).default(3),
      draftsPerSide: z.number().min(1).max(10).default(5),
      banTimer: z.number().min(10).max(120).default(30), // seconds
      draftTimer: z.number().min(10).max(120).default(30), // seconds
      alternatingOrder: z.boolean().default(true),
      customPhases: z.array(z.object({
        type: z.enum(['ban', 'draft']),
        count: z.number().min(1).max(5),
        side: z.enum(['team1', 'team2', 'alternating']).optional()
      })).optional()
    }).optional()
  }).optional()
})

export const joinTournamentSchema = z.object({
  participantName: z.string()
    .min(2, 'Participant name must be at least 2 characters')
    .max(50, 'Participant name cannot exceed 50 characters'),
  password: z.string().optional()
})

export const createTeamSchema = z.object({
  name: z.string()
    .min(2, 'Team name must be at least 2 characters')
    .max(50, 'Team name cannot exceed 50 characters'),
  tag: z.string()
    .min(2, 'Team tag must be at least 2 characters')
    .max(5, 'Team tag cannot exceed 5 characters')
    .optional(),
  captainName: z.string()
    .min(2, 'Captain name must be at least 2 characters')
    .max(50, 'Captain name cannot exceed 50 characters')
})

export const updateScoreSchema = z.object({
  matchId: z.string().uuid('Invalid match ID'),
  score: z.record(z.any()), // Flexible score format
  winnerId: z.string().uuid('Invalid winner ID').optional()
})

export const reportMatchResultSchema = z.object({
  matchId: z.string().uuid('Invalid match ID'),
  winnerId: z.string().uuid('Invalid winner ID'),
  score: z.record(z.any()),
  forfeit: z.boolean().default(false),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional()
})

export const draftBanEventSchema = z.object({
  matchId: z.string().uuid('Invalid match ID'),
  eventType: z.enum(['draft_pick', 'draft_ban']),
  participantId: z.string().uuid('Invalid participant ID'),
  selection: z.string().min(1, 'Selection is required'),
  phase: z.number().min(0),
  order: z.number().min(0)
})

export const userRegistrationSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  email: z.string()
    .email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  displayName: z.string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name cannot exceed 50 characters')
    .optional()
})

export const userLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

export const updateProfileSchema = z.object({
  displayName: z.string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name cannot exceed 50 characters')
    .optional(),
  gameRankings: z.record(z.object({
    rank: z.string(),
    tier: z.string().optional(),
    lp: z.number().optional(),
    verified: z.boolean().default(false)
  })).optional()
})

// Validation helper functions
export function validateTournamentPassword(password, hashedPassword) {
  if (!hashedPassword) return true // No password required
  // In a real app, you'd use proper password hashing
  return password === hashedPassword
}

export function validateParticipantCount(format, participantCount) {
  if (participantCount < 4) return false
  if (format === TOURNAMENT_FORMAT.SINGLE_ELIMINATION) {
    return participantCount <= 128
  }
  if (format === TOURNAMENT_FORMAT.DOUBLE_ELIMINATION) {
    return participantCount <= 64 // Double elim needs more matches
  }
  if (format === TOURNAMENT_FORMAT.ROUND_ROBIN) {
    return participantCount <= 32 // Round robin has O(n²) matches
  }
  return false
}

export function validateMatchScore(game, score) {
  const template = GAME_TEMPLATES[game]
  if (!template) return false
  
  // Basic validation - can be expanded per game
  if (typeof score !== 'object') return false
  
  // Ensure score has participant data
  const keys = Object.keys(score)
  return keys.length >= 2
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') return input
  
  // Remove potentially harmful characters
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim()
}