/**
 * Roster Limit Utilities
 * 
 * Manages roster size limits (20 total players + tokens)
 * Prevents lineup changes when over limit
 * Allows pack purchases even when over limit
 */

export const ROSTER_LIMIT = 20;

/**
 * Calculate total roster count (players + tokens)
 * @param {Object} inventory - Inventory object with players and tokens arrays
 * @returns {number} Total count of players and tokens
 */
export function getRosterCount(inventory) {
  if (!inventory) return 0;
  
  const playerCount = inventory.players?.length || 0;
  const tokenCount = inventory.tokens?.length || 0;
  
  return playerCount + tokenCount;
}

/**
 * Check if roster is over the limit
 * @param {Object} inventory - Inventory object with players and tokens arrays
 * @returns {boolean} True if over limit
 */
export function isOverRosterLimit(inventory) {
  return getRosterCount(inventory) > ROSTER_LIMIT;
}

/**
 * Calculate how many items over the limit
 * @param {Object} inventory - Inventory object with players and tokens arrays
 * @returns {number} Number of items over limit (0 if under/at limit)
 */
export function getOverLimitCount(inventory) {
  const count = getRosterCount(inventory);
  return Math.max(0, count - ROSTER_LIMIT);
}

/**
 * Get remaining roster space
 * @param {Object} inventory - Inventory object with players and tokens arrays
 * @returns {number} Number of spots available (0 if at/over limit)
 */
export function getRemainingRosterSpace(inventory) {
  const count = getRosterCount(inventory);
  return Math.max(0, ROSTER_LIMIT - count);
}

/**
 * Get roster status message
 * @param {Object} inventory - Inventory object with players and tokens arrays
 * @returns {Object} Status object with message, color, and severity
 */
export function getRosterStatus(inventory) {
  const count = getRosterCount(inventory);
  const overCount = getOverLimitCount(inventory);
  const remaining = getRemainingRosterSpace(inventory);
  
  if (overCount > 0) {
    return {
      message: `Roster Over Limit! ${count}/${ROSTER_LIMIT} (${overCount} over)`,
      shortMessage: `${count}/${ROSTER_LIMIT}`,
      color: 'red',
      severity: 'error',
      isOverLimit: true
    };
  }
  
  if (remaining <= 2) {
    return {
      message: `Roster Nearly Full: ${count}/${ROSTER_LIMIT} (${remaining} spots left)`,
      shortMessage: `${count}/${ROSTER_LIMIT}`,
      color: 'yellow',
      severity: 'warning',
      isOverLimit: false
    };
  }
  
  return {
    message: `Roster: ${count}/${ROSTER_LIMIT} (${remaining} spots available)`,
    shortMessage: `${count}/${ROSTER_LIMIT}`,
    color: 'green',
    severity: 'info',
    isOverLimit: false
  };
}

/**
 * Get user-friendly error message for blocked actions
 * @returns {string} Error message to display
 */
export function getRosterLimitErrorMessage() {
  return `Your roster is over the ${ROSTER_LIMIT} card limit. Please sell cards to get back to ${ROSTER_LIMIT} or fewer before making lineup changes or applying tokens.`;
}

/**
 * Check if lineup changes should be blocked
 * @param {Object} inventory - Inventory object with players and tokens arrays
 * @returns {boolean} True if changes should be blocked
 */
export function shouldBlockLineupChanges(inventory) {
  return isOverRosterLimit(inventory);
}

/**
 * Check if token applications should be blocked
 * @param {Object} inventory - Inventory object with players and tokens arrays
 * @returns {boolean} True if token actions should be blocked
 */
export function shouldBlockTokenActions(inventory) {
  return isOverRosterLimit(inventory);
}
