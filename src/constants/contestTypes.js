/**
 * Contest Type Constants
 * 
 * Centralized configuration for contest types including icons, colors, and labels.
 * Each contest type has a distinct color for easy visual identification.
 */

import { Target, Swords, TrendingUp, Crown, Zap } from 'lucide-react';

/**
 * Contest win condition configurations
 * Each type has:
 * - icon: Lucide icon component
 * - label: Full display name
 * - shortLabel: Abbreviated name for compact displays
 * - winText: Description of how to win
 * - color: Tailwind text color class
 * - bgColor: Tailwind background color class (with opacity)
 * - borderColor: Tailwind border color class
 * - iconColorHex: Hex color for icon (for inline styles if needed)
 */
export const CONTEST_TYPES = {
  median: {
    icon: Target,
    label: 'Beat Median',
    shortLabel: 'Median',
    winText: 'Beat the median score to win',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    iconColorHex: '#60A5FA'
  },
  h2h: {
    icon: Swords,
    label: 'Head-to-Head',
    shortLabel: 'H2H',
    winText: 'Outscore your opponent to win',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    iconColorHex: '#FB923C'
  },
  top_points: {
    icon: Crown,
    label: 'Top Score',
    shortLabel: 'Top Score',
    winText: 'Highest score wins',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    iconColorHex: '#FACC15'
  },
  survivor: {
    icon: Zap,
    label: 'Survivor',
    shortLabel: 'Survivor',
    winText: 'Last team standing wins',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30',
    iconColorHex: '#A78BFA'
  }
};

/**
 * Get contest type configuration
 * @param {string} winCondition - The win condition key (median, h2h, top_points, survivor)
 * @returns {Object} Contest type configuration object
 */
export function getContestTypeConfig(winCondition) {
  return CONTEST_TYPES[winCondition] || CONTEST_TYPES.median;
}

/**
 * Scoring format configurations
 */
export const SCORING_FORMATS = {
  ppr: {
    label: 'Full PPR',
    shortLabel: 'PPR',
    description: '1 point per reception'
  },
  full_ppr: {
    label: 'Full PPR',
    shortLabel: 'PPR',
    description: '1 point per reception'
  },
  half_ppr: {
    label: 'Half PPR',
    shortLabel: '0.5 PPR',
    description: '0.5 points per reception'
  },
  halfppr: {
    label: 'Half PPR',
    shortLabel: '0.5 PPR',
    description: '0.5 points per reception'
  },
  standard: {
    label: 'Standard',
    shortLabel: 'STD',
    description: 'No points per reception'
  }
};

/**
 * Get scoring format configuration
 * @param {string} format - The scoring format key
 * @returns {Object} Scoring format configuration object
 */
export function getScoringFormatConfig(format) {
  return SCORING_FORMATS[format] || SCORING_FORMATS.ppr;
}

/**
 * Contest status configurations
 */
export const CONTEST_STATUSES = {
  open: {
    label: 'Open',
    color: 'text-primary-green-400',
    bgColor: 'bg-primary-green-500/20'
  },
  locked: {
    label: 'Locked',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20'
  },
  live: {
    label: 'Live',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    pulse: true
  },
  final: {
    label: 'Final',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20'
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-primary-black-400',
    bgColor: 'bg-primary-black-700'
  }
};

/**
 * Week/Game status for scoring sections
 */
export const WEEK_STATUSES = {
  'pre-game': {
    label: 'Pre-Game',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20'
  },
  live: {
    label: 'Live',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    pulse: true
  },
  final: {
    label: 'Final',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20'
  }
};

/**
 * Get week status configuration
 * @param {boolean} isLive 
 * @param {boolean} isFinal 
 * @param {boolean} isUpcoming 
 * @returns {Object} Week status configuration
 */
export function getWeekStatusConfig(isLive, isFinal, isUpcoming) {
  if (isFinal) return WEEK_STATUSES.final;
  if (isLive) return WEEK_STATUSES.live;
  return WEEK_STATUSES['pre-game'];
}
