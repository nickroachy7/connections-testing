import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { getAvailableContests, getTeamContestEntryStatus, getTeamContestEntries } from '../../services/contestService';

/**
 * useContests Hook
 * 
 * Centralized hook for managing contest data with proper caching.
 * Data persists across page navigations - no refetch on every mount.
 * 
 * Only refetches when:
 * - Team changes (teamId changes)
 * - Force refresh is requested
 * - Data is stale (older than staleTime)
 * - Week/season changes
 * 
 * @param {string} teamId - The active team's ID
 * @param {object} options - Configuration options
 * @param {number} options.staleTime - How long data is considered fresh (ms), default 5 minutes
 */

// Module-level cache to persist across component mounts
const contestCache = {
  data: null,
  teamId: null,
  week: null,
  season: null,
  timestamp: null
};

const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes

// Helper to check if cache is valid for a given teamId
function isCacheValidForTeam(teamId, staleTime = DEFAULT_STALE_TIME) {
  if (!contestCache.data || !contestCache.timestamp) return false;
  if (contestCache.teamId !== teamId) return false;
  const age = Date.now() - contestCache.timestamp;
  return age < staleTime;
}

export function useContests(teamId, teamCurrentWeek = null, options = {}) {
  const { staleTime = DEFAULT_STALE_TIME } = options;
  
  // Initialize from cache if valid for this team
  const cacheValid = isCacheValidForTeam(teamId, staleTime);
  
  const [contests, setContests] = useState(() => 
    cacheValid ? contestCache.data.contests : []
  );
  const [currentEntries, setCurrentEntries] = useState(() => 
    cacheValid ? contestCache.data.currentEntries : []
  );
  const [entryStatus, setEntryStatus] = useState(() => 
    cacheValid ? contestCache.data.entryStatus : null
  );
  const [nflCurrentWeek, setNflCurrentWeek] = useState(() => 
    cacheValid ? contestCache.data.nflCurrentWeek : null
  );
  const [weekStatus, setWeekStatus] = useState(() => 
    cacheValid ? contestCache.data.weekStatus : null
  );
  const [displayWeek, setDisplayWeek] = useState(() => 
    cacheValid ? contestCache.data.displayWeek : null
  );
  const [loading, setLoading] = useState(!cacheValid);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const mountedRef = useRef(true);
  const lastFetchRef = useRef(contestCache.timestamp);

  // Determine which week to show contests for
  const getTeamEligibleWeek = useCallback((nflWeek) => {
    if (!teamId || !nflWeek) return nflWeek;
    
    if (teamCurrentWeek && teamCurrentWeek > nflWeek) {
      return teamCurrentWeek;
    }
    
    return nflWeek;
  }, [teamId, teamCurrentWeek]);

  // Check if cache is valid (using the helper)
  const isCacheValid = useCallback(() => {
    return isCacheValidForTeam(teamId, staleTime);
  }, [teamId, staleTime]);

  // Core data fetching function
  const fetchContests = useCallback(async (forceRefresh = false) => {
    if (!teamId) {
      setContests([]);
      setCurrentEntries([]);
      setLoading(false);
      return;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh && isCacheValid()) {
      console.log('🎯 [useContests] Using cached data');
      setContests(contestCache.data.contests);
      setCurrentEntries(contestCache.data.currentEntries);
      setEntryStatus(contestCache.data.entryStatus);
      setNflCurrentWeek(contestCache.data.nflCurrentWeek);
      setWeekStatus(contestCache.data.weekStatus);
      setDisplayWeek(contestCache.data.displayWeek);
      setLoading(false);
      return;
    }

    // Show loading state only if no cached data
    if (!contestCache.data) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    
    setError(null);

    try {
      // Get current NFL week and config
      const { data: config, error: configError } = await supabase
        .from('nfl_season_config')
        .select('current_week, season_year, week_status')
        .eq('is_active', true)
        .single();

      if (configError) throw configError;
      if (!mountedRef.current) return;

      const nflWeek = config?.current_week;
      const season = config?.season_year;
      const status = config?.week_status;

      // Determine which week to fetch contests for
      const eligibleWeek = getTeamEligibleWeek(nflWeek);

      // Check if week/season changed (invalidates cache)
      if (contestCache.week !== eligibleWeek || contestCache.season !== season) {
        console.log('🔄 [useContests] Week/season changed, fetching fresh data');
      }

      // Fetch contests, entry status, and entries in parallel
      const [contestsResult, statusResult, entriesResult] = await Promise.all([
        getAvailableContests(eligibleWeek),
        getTeamContestEntryStatus(teamId, eligibleWeek, season),
        getTeamContestEntries(teamId, eligibleWeek, season)
      ]);

      if (!mountedRef.current) return;

      if (contestsResult.error) throw contestsResult.error;

      const newData = {
        contests: contestsResult.data || [],
        currentEntries: entriesResult.data || [],
        entryStatus: statusResult.data,
        nflCurrentWeek: nflWeek,
        weekStatus: status,
        displayWeek: eligibleWeek
      };

      // Update cache
      contestCache.data = newData;
      contestCache.teamId = teamId;
      contestCache.week = eligibleWeek;
      contestCache.season = season;
      contestCache.timestamp = Date.now();
      lastFetchRef.current = contestCache.timestamp;

      // Update state
      setContests(newData.contests);
      setCurrentEntries(newData.currentEntries);
      setEntryStatus(newData.entryStatus);
      setNflCurrentWeek(newData.nflCurrentWeek);
      setWeekStatus(newData.weekStatus);
      setDisplayWeek(newData.displayWeek);
      
      console.log('✅ [useContests] Data loaded:', {
        contests: newData.contests.length,
        entries: newData.currentEntries.length,
        week: eligibleWeek
      });
    } catch (err) {
      console.error('❌ [useContests] Error loading contests:', err);
      if (mountedRef.current) {
        setError(err.message || 'Failed to load contests');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [teamId, getTeamEligibleWeek, isCacheValid]);

  // Force refresh function for manual refresh
  const refresh = useCallback(() => {
    return fetchContests(true);
  }, [fetchContests]);

  // Invalidate cache (called after mutations like joining a contest)
  const invalidateCache = useCallback(() => {
    contestCache.timestamp = null;
    return fetchContests(true);
  }, [fetchContests]);

  // Initial load - use cache if valid, otherwise fetch
  useEffect(() => {
    mountedRef.current = true;
    
    // If cache is valid for this team, use it immediately
    if (isCacheValid()) {
      setContests(contestCache.data.contests);
      setCurrentEntries(contestCache.data.currentEntries);
      setEntryStatus(contestCache.data.entryStatus);
      setNflCurrentWeek(contestCache.data.nflCurrentWeek);
      setWeekStatus(contestCache.data.weekStatus);
      setDisplayWeek(contestCache.data.displayWeek);
      setLoading(false);
    } else {
      fetchContests();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [teamId]); // Only re-run when teamId changes

  // Derived values
  const hasEnteredContest = currentEntries.length > 0;
  const canEnterMore = entryStatus?.can_enter_more ?? true;
  const livesRemaining = entryStatus?.lives_remaining ?? 3;
  const entriesThisWeek = entryStatus?.entries_count ?? currentEntries.length;
  const remainingEntries = entryStatus?.remaining_entries ?? (livesRemaining - entriesThisWeek);
  const enteredContestIds = currentEntries.map(e => e.contest_id || e.contest?.id);

  // Contest status
  const isUpcoming = weekStatus === 'building' || weekStatus === 'locked' || 
    (displayWeek && nflCurrentWeek && displayWeek > nflCurrentWeek);
  const isLive = weekStatus === 'live';
  const isFinal = weekStatus === 'final' || weekStatus === 'finalized';
  const isShowingFutureWeek = displayWeek && nflCurrentWeek && displayWeek > nflCurrentWeek;

  return {
    // Data
    contests,
    currentEntries,
    entryStatus,
    nflCurrentWeek,
    weekStatus,
    displayWeek,
    
    // Status
    loading,
    isRefreshing,
    error,
    
    // Derived
    hasEnteredContest,
    canEnterMore,
    livesRemaining,
    entriesThisWeek,
    remainingEntries,
    enteredContestIds,
    isUpcoming,
    isLive,
    isFinal,
    isShowingFutureWeek,
    
    // Actions
    refresh,
    invalidateCache
  };
}

// Export cache invalidation for external use (e.g., after joining a contest)
export function invalidateContestCache() {
  contestCache.timestamp = null;
}
