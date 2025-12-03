/**
 * Centralized Color Constants
 * 
 * Single source of truth for all color-related values used in components.
 * Import these instead of defining colors inline.
 */

// Position colors - used for lineup position badges
export const POSITION_COLORS = {
  QB: {
    bg: 'bg-red-600',
    text: 'text-white',
    border: 'border-red-600',
    classes: 'bg-red-600 text-white'
  },
  RB: {
    bg: 'bg-primary-green-600',
    text: 'text-white',
    border: 'border-primary-green-600',
    classes: 'bg-primary-green-600 text-white'
  },
  RB1: {
    bg: 'bg-primary-green-600',
    text: 'text-white',
    border: 'border-primary-green-600',
    classes: 'bg-primary-green-600 text-white'
  },
  RB2: {
    bg: 'bg-primary-green-600',
    text: 'text-white',
    border: 'border-primary-green-600',
    classes: 'bg-primary-green-600 text-white'
  },
  WR: {
    bg: 'bg-blue-600',
    text: 'text-white',
    border: 'border-blue-600',
    classes: 'bg-blue-600 text-white'
  },
  WR1: {
    bg: 'bg-blue-600',
    text: 'text-white',
    border: 'border-blue-600',
    classes: 'bg-blue-600 text-white'
  },
  WR2: {
    bg: 'bg-blue-600',
    text: 'text-white',
    border: 'border-blue-600',
    classes: 'bg-blue-600 text-white'
  },
  WR3: {
    bg: 'bg-blue-600',
    text: 'text-white',
    border: 'border-blue-600',
    classes: 'bg-blue-600 text-white'
  },
  TE: {
    bg: 'bg-purple-600',
    text: 'text-white',
    border: 'border-purple-600',
    classes: 'bg-purple-600 text-white'
  },
  FLEX: {
    bg: 'bg-yellow-600',
    text: 'text-black',
    border: 'border-yellow-600',
    classes: 'bg-yellow-600 text-black'
  },
  SUPERFLEX: {
    bg: 'bg-pink-600',
    text: 'text-white',
    border: 'border-pink-600',
    classes: 'bg-pink-600 text-white'
  },
  SFLX: {
    bg: 'bg-pink-600',
    text: 'text-white',
    border: 'border-pink-600',
    classes: 'bg-pink-600 text-white'
  },
  BN: {
    bg: 'bg-primary-black-700',
    text: 'text-primary-black-300',
    border: 'border-primary-black-700',
    classes: 'bg-primary-black-700 text-primary-black-300'
  },
  BENCH: {
    bg: 'bg-primary-black-700',
    text: 'text-primary-black-300',
    border: 'border-primary-black-700',
    classes: 'bg-primary-black-700 text-primary-black-300'
  }
};

// Default fallback for unknown positions
const DEFAULT_POSITION_COLOR = {
  bg: 'bg-primary-black-600',
  text: 'text-white',
  border: 'border-primary-black-600',
  classes: 'bg-primary-black-600 text-white'
};

/**
 * Get position color configuration
 * @param {string} position - Position key (QB, RB, WR, etc.)
 * @returns {object} Color configuration with bg, text, border, classes
 */
export function getPositionColor(position) {
  if (!position) return DEFAULT_POSITION_COLOR;
  const upperPosition = position.toUpperCase().replace(/\d/g, '');
  return POSITION_COLORS[position?.toUpperCase()] || 
         POSITION_COLORS[upperPosition] || 
         DEFAULT_POSITION_COLOR;
}

/**
 * Get position color classes (combined bg + text)
 * @param {string} position - Position key
 * @param {boolean} isLocked - Whether the position is locked (uses dimmed styling)
 * @returns {string} Tailwind classes string
 */
export function getPositionColorClasses(position, isLocked = false) {
  const config = getPositionColor(position);
  
  if (isLocked) {
    // Locked state: grey background with position-colored text
    const textColorMap = {
      QB: 'text-red-400',
      RB: 'text-primary-green-400',
      RB1: 'text-primary-green-400',
      RB2: 'text-primary-green-400',
      WR: 'text-blue-400',
      WR1: 'text-blue-400',
      WR2: 'text-blue-400',
      WR3: 'text-blue-400',
      TE: 'text-purple-400',
      FLEX: 'text-yellow-400',
      SUPERFLEX: 'text-pink-400',
      SFLX: 'text-pink-400'
    };
    const textColor = textColorMap[position?.toUpperCase()] || 'text-primary-black-300';
    return `bg-primary-black-700 ${textColor}`;
  }
  
  return config.classes;
}

// Tier badge colors
export const TIER_COLORS = {
  all_star: {
    bg: 'bg-purple-500',
    text: 'text-white',
    border: 'border-purple-500',
    initial: 'A'
  },
  starter: {
    bg: 'bg-blue-500',
    text: 'text-white',
    border: 'border-blue-500',
    initial: 'S'
  },
  role_player: {
    bg: 'bg-green-500',
    text: 'text-white',
    border: 'border-green-500',
    initial: 'R'
  },
  base: {
    bg: 'bg-gray-500',
    text: 'text-white',
    border: 'border-gray-500',
    initial: 'B'
  }
};

/**
 * Get tier color configuration
 * @param {string} tier - Tier key
 * @returns {object} Color configuration
 */
export function getTierColor(tier) {
  return TIER_COLORS[tier] || TIER_COLORS.base;
}

// Game status colors
export const STATUS_COLORS = {
  live: 'text-primary-green-400',
  halftime: 'text-primary-green-400',
  final: 'text-primary-black-400',
  scheduled: 'text-primary-black-400',
  pregame: 'text-primary-black-400'
};

/**
 * Get game status color class
 * @param {string} status - Game status
 * @returns {string} Tailwind color class
 */
export function getStatusColor(status) {
  if (!status) return STATUS_COLORS.scheduled;
  return STATUS_COLORS[status.toLowerCase()] || STATUS_COLORS.scheduled;
}

// Injury status colors
export const INJURY_COLORS = {
  Out: 'bg-red-500 text-white',
  Doubtful: 'bg-orange-500 text-white',
  Questionable: 'bg-yellow-500 text-black',
  Probable: 'bg-blue-500 text-white',
  'Injured Reserve': 'bg-red-700 text-white'
};

/**
 * Get injury status color classes
 * @param {string} status - Injury status
 * @returns {string} Tailwind classes
 */
export function getInjuryColor(status) {
  return INJURY_COLORS[status] || 'bg-gray-500 text-white';
}

// Token rarity colors
export const RARITY_COLORS = {
  Legendary: {
    gradient: 'from-yellow-500 to-yellow-600',
    text: 'text-yellow-400',
    bg: 'bg-yellow-500'
  },
  Epic: {
    gradient: 'from-purple-500 to-purple-600',
    text: 'text-purple-400',
    bg: 'bg-purple-500'
  },
  Rare: {
    gradient: 'from-blue-500 to-blue-600',
    text: 'text-blue-400',
    bg: 'bg-blue-500'
  },
  Common: {
    gradient: 'from-gray-500 to-gray-600',
    text: 'text-primary-black-400',
    bg: 'bg-gray-500'
  }
};

/**
 * Get rarity color configuration
 * @param {string} rarity - Rarity level
 * @returns {object} Color configuration
 */
export function getRarityColor(rarity) {
  return RARITY_COLORS[rarity] || RARITY_COLORS.Common;
}
