/**
 * Time and date utility functions
 */

/**
 * Format timestamp as "time ago" string
 * @param {string|Date} timestamp - Timestamp to format
 * @returns {string} Human-readable time ago string
 */
export function formatTimeAgo(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
  return new Date(date).toLocaleDateString('en-US', options);
}

/**
 * Format date and time to readable string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date and time string
 */
export function formatDateTime(date) {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/**
 * Check if date is today
 * @param {string|Date} date - Date to check
 * @returns {boolean} True if date is today
 */
export function isToday(date) {
  const today = new Date();
  const checkDate = new Date(date);
  return checkDate.toDateString() === today.toDateString();
}

/**
 * Get week range label (e.g., "Week 1: Sep 7-13")
 * @param {number} weekNumber - NFL week number
 * @param {number} year - Season year
 * @returns {string} Week range label
 */
export function getWeekRangeLabel(weekNumber, year) {
  // This is a simplified version - you might want to add actual NFL schedule dates
  return `Week ${weekNumber}`;
}
