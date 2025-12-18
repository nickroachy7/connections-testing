import { useCallback } from 'react';

/**
 * useLeagueContext Hook
 * 
 * Previously managed league-specific context for private/franchise teams.
 * Now returns empty/default values since franchise mode has been removed.
 * 
 * Kept as a stub to avoid breaking components that still import it.
 * All DFS teams are now public-only.
 */

export function useLeagueContext(teamId) {
  // Always return "not in league" state since franchise mode is removed
  return {
    leagueContext: null,
    leagueMembers: [],
    loading: false,
    isRefreshing: false,
    error: null,
    refetch: useCallback(() => Promise.resolve(), []),
    invalidateCache: useCallback(() => Promise.resolve(), []),
    calculateLeagueMedian: useCallback(() => Promise.resolve(null), []),
    calculateProjectedLeagueMedian: useCallback(() => Promise.resolve(null), []),
    // Convenience getters - all false/default since no leagues
    isInLeague: false,
    leagueName: null,
    leagueWins: 0,
    leagueLosses: 0,
    leagueLives: 0,
    winCondition: 'median',
    eliminationType: 'strike'
  };
}

// Export cache invalidation for external use (stub)
export function invalidateLeagueCache() {
  // No-op since franchise mode removed
}
