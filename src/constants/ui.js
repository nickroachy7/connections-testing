/**
 * UI-related constants
 * 
 * Rank colors, activity icons, and other UI constants
 */

// Rank colors for leaderboard
export const RANK_COLORS = {
  1: 'text-yellow-400', // Gold
  2: 'text-gray-300',   // Silver
  3: 'text-orange-400', // Bronze
  DEFAULT: 'text-primary-black-300'
};

/**
 * Get color class for a rank
 * @param {number} rank - Leaderboard rank
 * @returns {string} Tailwind color class
 */
export function getRankColor(rank) {
  return RANK_COLORS[rank] || RANK_COLORS.DEFAULT;
}

// Activity type icons
export const ACTIVITY_ICONS = {
  pack_purchase: '📦',
  quick_sell: '💰',
  starter_pack: '🎁',
  reward: '🏆',
  DEFAULT: '📝'
};

/**
 * Get icon for activity type
 * @param {string} type - Activity type
 * @returns {string} Emoji icon
 */
export function getActivityIcon(type) {
  return ACTIVITY_ICONS[type] || ACTIVITY_ICONS.DEFAULT;
}

// Position filter options
export const POSITION_FILTERS = ['all', 'QB', 'RB', 'WR', 'TE'];

// Sort options for players
export const PLAYER_SORT_OPTIONS = {
  NAME: 'name',
  POSITION: 'position',
  TEAM: 'team',
  JERSEY: 'jersey',
  FANTASY: 'fantasy'
};

// Leaderboard sort options
export const LEADERBOARD_SORT_OPTIONS = {
  WEEK: 'week',
  PROJECTED: 'projected',
  SEASON: 'season',
  WINS: 'wins'
};

// Loading messages
export const LOADING_MESSAGES = {
  DEFAULT: 'Loading...',
  PLAYERS: 'Loading players...',
  TEAM: 'Loading team...',
  LEADERBOARD: 'Loading leaderboard...',
  INVENTORY: 'Loading inventory...',
  ACTIVITY: 'Loading activity...'
};

// Empty state messages
export const EMPTY_STATE_MESSAGES = {
  NO_PLAYERS: 'No players found',
  NO_ACTIVITY: 'No recent activity',
  NO_TEAMS: 'No teams found',
  NO_RESULTS: 'No results found'
};

// Cache duration constants
export const CACHE_DURATION = {
  SHORT: 1 * 60 * 1000,   // 1 minute
  MEDIUM: 5 * 60 * 1000,  // 5 minutes
  LONG: 15 * 60 * 1000    // 15 minutes
};
