/**
 * Custom hook for fetching data from Supabase
 * 
 * Handles loading state, error handling, and cleanup
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for fetching data with loading and error states
 * @param {Function} fetchFunction - Async function that fetches data
 * @param {Array} dependencies - Dependencies array for useEffect
 * @param {Object} options - Options { enabled, onSuccess, onError }
 * @returns {Object} { data, loading, error, refetch }
 */
export function useQuery(fetchFunction, dependencies = [], options = {}) {
  const { enabled = true, onSuccess, onError } = options;
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await fetchFunction();
      
      if (isMountedRef.current) {
        setData(result);
        if (onSuccess) onSuccess(result);
      }
    } catch (err) {
      console.error('Query error:', err);
      if (isMountedRef.current) {
        setError(err);
        if (onError) onError(err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchFunction, enabled, onSuccess, onError]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();
    
    return () => {
      isMountedRef.current = false;
    };
  }, dependencies);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}

/**
 * Hook for loading leaderboard data
 * @param {Object} activeTeam - Active team object
 * @param {string} userId - User ID
 * @param {string} sortBy - Sort criteria
 * @returns {Object} Leaderboard data and state
 */
export function useLeaderboard(activeTeam, userId, sortBy = 'season') {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [globalStats, setGlobalStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLeaderboard = useCallback(async () => {
    // Implementation would go here - extracted from LeaderboardWidget
    // This is a placeholder to show the pattern
    console.log('Loading leaderboard:', { activeTeam, userId, sortBy });
  }, [activeTeam?.id, sortBy]);

  useEffect(() => {
    if (activeTeam?.id) {
      loadLeaderboard();
    }
  }, [activeTeam?.id, sortBy, loadLeaderboard]);

  return {
    leaderboardData,
    currentWeek,
    globalStats,
    loading,
    error,
    refetch: loadLeaderboard
  };
}

/**
 * Hook for loading user's recent activity
 * @param {string} teamId - Team ID
 * @param {string} userId - User ID
 * @param {number} limit - Number of activities to load
 * @returns {Object} Activities data and state
 */
export function useRecentActivity(teamId, userId, limit = 10) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadActivity = useCallback(async () => {
    // Implementation would go here - extracted from RecentActivityFeed
    console.log('Loading activity:', { teamId, userId, limit });
  }, [teamId, userId, limit]);

  useEffect(() => {
    if (teamId || userId) {
      loadActivity();
    }
  }, [teamId, userId, loadActivity]);

  return {
    activities,
    loading,
    error,
    refetch: loadActivity
  };
}
