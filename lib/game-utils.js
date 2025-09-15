import { GAME_TEMPLATES } from './types'

/**
 * Get user-friendly game name from game ID
 * @param {string} gameId - Game identifier like 'league_of_legends'
 * @returns {string} - User-friendly name like 'League of Legends'
 */
export function getGameDisplayName(gameId) {
  if (!gameId) return 'Unknown Game'

  // Find the game template
  const gameTemplate = Object.values(GAME_TEMPLATES).find(g => g.id === gameId)

  if (gameTemplate) {
    return gameTemplate.name
  }

  // Fallback: convert snake_case to Title Case
  return gameId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Get all available games for dropdowns
 * @returns {Array} - Array of {id, name} objects
 */
export function getAvailableGames() {
  return Object.values(GAME_TEMPLATES).map(game => ({
    id: game.id,
    name: game.name
  }))
}