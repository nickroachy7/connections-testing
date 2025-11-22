/**
 * Lineup Position Constants
 * 
 * Single source of truth for all lineup position definitions
 */

// Lineup positions
export const LINEUP_POSITIONS = {
  QB: 'QB',
  RB1: 'RB1',
  RB2: 'RB2',
  WR1: 'WR1',
  WR2: 'WR2',
  WR3: 'WR3',
  TE: 'TE',
  FLEX: 'FLEX',
  BENCH: 'BENCH'
};

// Starting positions (non-bench)
export const STARTING_POSITIONS = [
  LINEUP_POSITIONS.QB,
  LINEUP_POSITIONS.RB1,
  LINEUP_POSITIONS.RB2,
  LINEUP_POSITIONS.WR1,
  LINEUP_POSITIONS.WR2,
  LINEUP_POSITIONS.WR3,
  LINEUP_POSITIONS.TE,
  LINEUP_POSITIONS.FLEX
];

// Empty lineup template
export const EMPTY_LINEUP = {
  [LINEUP_POSITIONS.QB]: null,
  [LINEUP_POSITIONS.RB1]: null,
  [LINEUP_POSITIONS.RB2]: null,
  [LINEUP_POSITIONS.WR1]: null,
  [LINEUP_POSITIONS.WR2]: null,
  [LINEUP_POSITIONS.WR3]: null,
  [LINEUP_POSITIONS.TE]: null,
  [LINEUP_POSITIONS.FLEX]: null,
  [LINEUP_POSITIONS.BENCH]: []
};

// Position display names
export const POSITION_NAMES = {
  QB: 'Quarterback',
  RB: 'Running Back',
  WR: 'Wide Receiver',
  TE: 'Tight End',
  FLEX: 'Flex'
};

// Position abbreviations
export const POSITION_ABBREVIATIONS = {
  'Quarterback': 'QB',
  'Running Back': 'RB',
  'Wide Receiver': 'WR',
  'Tight End': 'TE'
};

// Valid FLEX positions
export const FLEX_ELIGIBLE_POSITIONS = ['RB', 'WR', 'TE'];

// Baseline projections by position
export const BASELINE_PROJECTIONS = {
  'Quarterback': 18,
  'Running Back': 12,
  'Wide Receiver': 10,
  'Tight End': 8,
};

/**
 * Get baseline projection for a position
 * @param {string} position - Position name
 * @returns {number} Baseline projection
 */
export function getBaselineProjection(position) {
  return BASELINE_PROJECTIONS[position] || 8;
}

/**
 * Create a new empty lineup
 * @returns {Object} Empty lineup object
 */
export function createEmptyLineup() {
  return {
    ...EMPTY_LINEUP,
    [LINEUP_POSITIONS.BENCH]: [] // Ensure BENCH is a new array
  };
}

/**
 * Check if position is a starting position
 * @param {string} position - Position to check
 * @returns {boolean} True if starting position
 */
export function isStartingPosition(position) {
  return STARTING_POSITIONS.includes(position);
}

/**
 * Check if position can play FLEX
 * @param {string} position - Player's position
 * @returns {boolean} True if eligible for FLEX
 */
export function isFlexEligible(position) {
  return FLEX_ELIGIBLE_POSITIONS.includes(position);
}
