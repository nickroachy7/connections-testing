import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { getTeamContestEntryStatus } from '../../services/contestService';

/**
 * useMultipleContests Hook
 * 
 * Fetches all contest entries for a team for their eligible week.
 * Supports switching between multiple contests with swipe gestures.
 * Includes all contest-specific data needed for TeamScoreBanner rendering.
 * 
 * Uses module-level caching to persist data across component mounts,
 * preventing refetches when navigating between pages.
 */

// Module-level cache to persist across component mounts
const multiContestCache = {
  data: null,
  teamId: null,
  week: null,
  timestamp: null
};

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

// Helper to check if cache is valid for a given teamId
function isCacheValidForTeam(teamId) {
  if (!multiContestCache.data || !multiContestCache.timestamp) return false;
  if (multiContestCache.teamId !== teamId) return false;
  const age = Date.now() - multiContestCache.timestamp;
  return age < STALE_TIME;
}

export function useMultipleContests(teamId) {
  // Initialize from cache if valid for this team
  const cacheValid = isCacheValidForTeam(teamId);
  
  const [contests, setContests] = useState(() => 
    cacheValid ? multiContestCache.data.contests : []
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(!cacheValid);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [weekData, setWeekData] = useState(() => 
    cacheValid ? multiContestCache.data.weekData : null
  );
  const [entryStatus, setEntryStatus] = useState(() => 
    cacheValid ? multiContestCache.data.entryStatus : null
  );
  
  const mountedRef = useRef(true);

  // Check if cache is valid (using the helper)
  const isCacheValid = useCallback(() => {
    return isCacheValidForTeam(teamId);
  }, [teamId]);

  const fetchContests = useCallback(async (forceRefresh = false) => {
    if (!teamId) {
      setContests([]);
      setLoading(false);
      return;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh && isCacheValid()) {
      console.log('🎯 [useMultipleContests] Using cached data');
      setContests(multiContestCache.data.contests);
      setWeekData(multiContestCache.data.weekData);
      setEntryStatus(multiContestCache.data.entryStatus);
      setLoading(false);
      return;
    }

    // Show loading state only if no cached data
    if (!multiContestCache.data) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    
    setError(null);

    try {

      // Get current NFL week and team info
      const [configResult, teamResult] = await Promise.all([
        supabase
          .from('nfl_season_config')
          .select('current_week, season_year, week_status')
          .eq('is_active', true)
          .single(),
        supabase
          .from('teams')
          .select('current_week')
          .eq('id', teamId)
          .single()
      ]);

      if (configResult.error) throw configResult.error;

      const nflCurrentWeek = configResult.data.current_week;
      const currentSeason = configResult.data.season_year;
      const weekStatus = configResult.data.week_status;
      const teamStartWeek = teamResult.data?.current_week;
      
      // Determine eligible week
      const eligibleWeek = (teamStartWeek && teamStartWeek > nflCurrentWeek) 
        ? teamStartWeek 
        : nflCurrentWeek;

      // Determine live/final state
      const isLive = weekStatus === 'live';
      const isFinal = weekStatus === 'finalized';

      setWeekData({ nflCurrentWeek, currentSeason, weekStatus, eligibleWeek, isLive, isFinal });

      // Fetch entry status (lives remaining)
      const statusResult = await getTeamContestEntryStatus(teamId, eligibleWeek, currentSeason);
      if (statusResult.data) {
        setEntryStatus(statusResult.data);
      }

      // Fetch ALL entries for this team
      const { data: allEntries, error: entriesError } = await supabase
        .from('public_contest_entries')
        .select(`
          *,
          contest:public_contests(
            id,
            name,
            description,
            week,
            season,
            status,
            max_entries,
            current_entries,
            scoring_type,
            win_condition,
            entry_cost,
            coin_reward,
            template:public_contest_templates(
              icon,
              difficulty
            )
          )
        `)
        .eq('team_id', teamId);

      if (entriesError) throw entriesError;

      // Filter to eligible week's contests
      const weekEntries = (allEntries || []).filter(entry => 
        entry.contest?.week === eligibleWeek && 
        entry.contest?.season === currentSeason
      );

      console.log('🎯 [useMultipleContests] Found', weekEntries.length, 'contests for week', eligibleWeek);

      // Build contest data with additional info (median, opponent, rank, etc.)
      const contestData = await Promise.all(weekEntries.map(async (entry) => {
        const contest = entry.contest;
        const winCondition = contest.win_condition;
        
        // Fetch all entries for this specific contest (for median/rank calc)
        const { data: contestEntries } = await supabase
          .from('public_contest_entries')
          .select(`
            id,
            team_id,
            final_score,
            team:teams!public_contest_entries_team_id_fkey(
              id,
              team_name
            )
          `)
          .eq('contest_id', contest.id);

        // Calculate contest median from actual scores (if finalized/live)
        let contestMedian = null;
        let contestRank = null;
        let opponentName = null;
        let opponentScore = null;

        if (contestEntries && contestEntries.length > 0) {
          // For median calculation - use final_score from entries
          if (winCondition === 'median' && (isLive || isFinal)) {
            const scores = contestEntries
              .map(e => e.final_score)
              .filter(s => s != null && s > 0)
              .sort((a, b) => a - b);
            
            if (scores.length > 0) {
              const mid = Math.floor(scores.length / 2);
              contestMedian = scores.length % 2 !== 0
                ? scores[mid]
                : (scores[mid - 1] + scores[mid]) / 2;
            }
          }

          // For top_points - calculate rank
          if (winCondition === 'top_points' && entry.final_score) {
            const scoresAbove = contestEntries.filter(e => 
              e.final_score > entry.final_score
            ).length;
            contestRank = scoresAbove + 1;
          }

          // For H2H - find opponent
          if (winCondition === 'h2h') {
            // H2H pairing logic: entries are paired in order of entry
            const sortedEntries = [...contestEntries].sort((a, b) => 
              new Date(a.created_at) - new Date(b.created_at)
            );
            const myIndex = sortedEntries.findIndex(e => e.team_id === teamId);
            const opponentIndex = myIndex % 2 === 0 ? myIndex + 1 : myIndex - 1;
            
            if (opponentIndex >= 0 && opponentIndex < sortedEntries.length) {
              const opponent = sortedEntries[opponentIndex];
              opponentName = opponent.team?.team_name || 'Opponent';
              opponentScore = opponent.final_score || 0;
            }
          }
        }

        const isUpcoming = eligibleWeek > nflCurrentWeek || weekStatus === 'building' || weekStatus === 'locked';

        return {
          id: entry.id,
          entry,
          contest,
          contestId: contest.id, // Added for navigation
          contestEntries: contestEntries || [],
          entrantCount: contestEntries?.length || 0,
          weekStatus,
          eligibleWeek,
          isUpcoming,
          isLive,
          isFinal,
          // Contest-specific calculated values
          contestMedian,
          contestRank,
          opponentName,
          opponentScore,
          // Key props for TeamScoreBanner
          contestName: contest.name,
          winCondition: contest.win_condition,
          maxEntries: contest.max_entries,
          // Stakes - Risk/Reward
          entryCost: contest.entry_cost || 1,
          coinReward: contest.coin_reward || 50
        };
      }));

      if (!mountedRef.current) return;

      // Update cache
      const newWeekData = { nflCurrentWeek, currentSeason, weekStatus, eligibleWeek, isLive, isFinal };
      multiContestCache.data = {
        contests: contestData,
        weekData: newWeekData,
        entryStatus: statusResult.data
      };
      multiContestCache.teamId = teamId;
      multiContestCache.week = eligibleWeek;
      multiContestCache.timestamp = Date.now();

      // Update state
      setContests(contestData);
      setWeekData(newWeekData);
      
      console.log('✅ [useMultipleContests] Data loaded:', contestData.length, 'contests for week', eligibleWeek);
    } catch (err) {
      console.error('Error fetching multiple contests:', err);
      if (mountedRef.current) {
        setError(err);
        setContests([]);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [teamId, isCacheValid]); // Only refetch when teamId changes

  // Invalidate cache and force refresh
  const invalidateCache = useCallback(() => {
    multiContestCache.timestamp = null;
    return fetchContests(true);
  }, [fetchContests]);

  // Initial load - use cache if valid
  useEffect(() => {
    mountedRef.current = true;
    
    // If cache is valid for this team, use it immediately
    if (isCacheValid()) {
      setContests(multiContestCache.data.contests);
      setWeekData(multiContestCache.data.weekData);
      setEntryStatus(multiContestCache.data.entryStatus);
      setLoading(false);
    } else {
      fetchContests();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [teamId]); // Only re-run when teamId changes
  
  // Entry status derived values
  const canEnterMore = entryStatus?.can_enter_more ?? false;
  const livesRemaining = entryStatus?.lives_remaining ?? 3;
  const entriesThisWeek = entryStatus?.entries_count ?? contests.length;
  const remainingEntries = entryStatus?.remaining_entries ?? (livesRemaining - entriesThisWeek);
  
  // Calculate max valid index (includes "Enter More" slide if applicable)
  const hasEnterMoreSlide = canEnterMore && remainingEntries > 0;
  const maxIndex = contests.length + (hasEnterMoreSlide ? 1 : 0) - 1;
  
  // Reset selectedIndex if it's out of bounds after data loads
  useEffect(() => {
    if (contests.length > 0 && selectedIndex > maxIndex) {
      setSelectedIndex(0);
    }
  }, [contests.length, selectedIndex, maxIndex]);

  // Navigation functions
  const nextContest = useCallback(() => {
    const totalSlides = contests.length + (hasEnterMoreSlide ? 1 : 0);
    if (totalSlides > 1) {
      setSelectedIndex((prev) => (prev + 1) % totalSlides);
    }
  }, [contests.length, hasEnterMoreSlide]);

  const prevContest = useCallback(() => {
    const totalSlides = contests.length + (hasEnterMoreSlide ? 1 : 0);
    if (totalSlides > 1) {
      setSelectedIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    }
  }, [contests.length, hasEnterMoreSlide]);

  const goToContest = useCallback((index) => {
    const totalSlides = contests.length + (hasEnterMoreSlide ? 1 : 0);
    if (index >= 0 && index < totalSlides) {
      setSelectedIndex(index);
    }
  }, [contests.length, hasEnterMoreSlide]);

  const currentContest = contests[selectedIndex] || null;

  return {
    contests,
    currentContest,
    selectedIndex,
    setSelectedIndex,
    totalContests: contests.length,
    hasMultiple: contests.length > 1,
    loading,
    isRefreshing,
    error,
    weekData,
    refetch: fetchContests,
    invalidateCache,
    nextContest,
    prevContest,
    goToContest,
    // Entry status
    canEnterMore,
    livesRemaining,
    entriesThisWeek,
    remainingEntries,
    // Convenience getters for current contest
    isInContest: !!currentContest,
    contestName: currentContest?.contestName || null,
    winCondition: currentContest?.winCondition || 'median',
    entrantCount: currentContest?.entrantCount || 0,
    maxEntries: currentContest?.maxEntries || null,
    contestWeek: currentContest?.eligibleWeek || null,
    isUpcoming: currentContest?.isUpcoming || false,
    contestMedian: currentContest?.contestMedian || null,
    contestRank: currentContest?.contestRank || null,
    opponentName: currentContest?.opponentName || null,
    opponentScore: currentContest?.opponentScore || null
  };
}

// Export cache invalidation for external use
export function invalidateMultiContestCache() {
  multiContestCache.timestamp = null;
}
