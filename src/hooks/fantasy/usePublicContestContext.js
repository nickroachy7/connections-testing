import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../services/supabase';

/**
 * usePublicContestContext Hook
 * 
 * Fetches and manages public contest context for a public team.
 * Returns contest entry, opponent info (for H2H), and contest-specific stats.
 * 
 * For public teams in a public contest:
 * - Uses public_contest_entries to find current week entry
 * - Calculates contest-specific median from entrants
 * - For H2H: returns opponent info and their score
 * - For Top Points: returns current rank among entrants
 * 
 * Auto-refresh features:
 * - Refetches when route changes (user navigates between pages)
 * - Refetches when page visibility changes (user returns to tab)
 * - Optional polling interval for live score updates
 */
export function usePublicContestContext(teamId, options = {}) {
  const { pollInterval = null } = options; // Optional polling interval in ms
  const location = useLocation();
  
  const [contestContext, setContestContext] = useState(null);
  const [contestEntries, setContestEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastFetchRef = useRef(null);
  const lastPathnameRef = useRef(null);

  // Fetch contest entry and context for the team's eligible week
  const fetchContestContext = useCallback(async () => {
    console.log('🎮 [usePublicContestContext] Fetching for teamId:', teamId);
    
    if (!teamId) {
      console.log('🎮 [usePublicContestContext] No teamId, skipping');
      setContestContext(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

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
      
      // Determine which week to look for contest entries
      // If team starts in a future week, check that week's entries
      const eligibleWeek = (teamStartWeek && teamStartWeek > nflCurrentWeek) 
        ? teamStartWeek 
        : nflCurrentWeek;

      console.log('🎮 [usePublicContestContext] NFL week:', nflCurrentWeek, 'Team start week:', teamStartWeek, 'Eligible week:', eligibleWeek);

      // Check if team has an entry in any public contest for their eligible week
      // First try with week/season filter on the entry
      let { data: entry, error: entryError } = await supabase
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
            template:public_contest_templates(
              icon,
              difficulty
            )
          )
        `)
        .eq('team_id', teamId)
        .eq('week', eligibleWeek)
        .eq('season', currentSeason)
        .maybeSingle();

      console.log('🎮 [usePublicContestContext] Entry query result:', { entry, entryError });

      // If no entry found with week/season on entry, try filtering by contest week/season
      if (!entry && !entryError) {
        console.log('🎮 [usePublicContestContext] No entry with week filter, trying contest filter...');
        const { data: entryByContest, error: contestError } = await supabase
          .from('public_contest_entries')
          .select(`
            *,
            contest:public_contests!inner(
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
              template:public_contest_templates(
                icon,
                difficulty
              )
            )
          `)
          .eq('team_id', teamId)
          .eq('contest.week', eligibleWeek)
          .eq('contest.season', currentSeason)
          .maybeSingle();
        
        console.log('🎮 [usePublicContestContext] Contest filter result:', { entryByContest, contestError });
        
        if (!contestError && entryByContest) {
          entry = entryByContest;
        }
      }

      if (entryError) throw entryError;

      // Team is not in any public contest this week
      if (!entry || !entry.contest) {
        console.log('🎮 [usePublicContestContext] No contest entry found');
        setContestContext(null);
        setContestEntries([]);
        setLoading(false);
        return;
      }

      const contest = entry.contest;
      console.log('🎮 [usePublicContestContext] Found contest:', contest.name);

      // Fetch all entries for this contest (for median calc and H2H)
      // Use explicit FK reference to avoid ambiguity with h2h_opponent_id
      const { data: allEntries, error: entriesError } = await supabase
        .from('public_contest_entries')
        .select(`
          id,
          team_id,
          user_id,
          final_score,
          beat_median,
          final_rank,
          h2h_opponent_id,
          h2h_result,
          team:teams!public_contest_entries_team_id_fkey(
            id,
            team_name,
            team_image_url,
            user_id
          )
        `)
        .eq('contest_id', contest.id);

      if (entriesError) throw entriesError;

      setContestEntries(allEntries || []);

      // For H2H contests, find opponent
      let opponentEntry = null;
      let opponentData = null;
      
      if (contest.win_condition === 'h2h' && entry.h2h_opponent_id) {
        opponentEntry = allEntries?.find(e => e.team_id === entry.h2h_opponent_id);
        if (opponentEntry) {
          opponentData = {
            teamId: opponentEntry.team_id,
            teamName: opponentEntry.team?.team_name || 'Opponent',
            teamImage: opponentEntry.team?.team_image_url,
            finalScore: opponentEntry.final_score
          };
        }
      }

      // Build the context object
      const context = {
        // Entry info
        entryId: entry.id,
        contestId: contest.id,
        week: entry.week,
        season: entry.season,
        
        // Results (populated after week finalizes)
        finalScore: entry.final_score,
        beatMedian: entry.beat_median,
        finalRank: entry.final_rank,
        h2hResult: entry.h2h_result,
        
        // Contest info
        contest: {
          id: contest.id,
          name: contest.name,
          description: contest.description,
          status: contest.status,
          maxEntries: contest.max_entries,
          currentEntries: contest.current_entries,
          scoringType: contest.scoring_type,
          winCondition: contest.win_condition,
          template: contest.template
        },
        
        // H2H specific (if applicable)
        opponent: opponentData,
        
        // Entrant count
        entrantCount: allEntries?.length || 0,
        
        // Week info
        contestWeek: contest.week,
        nflCurrentWeek,
        isFutureWeek: contest.week > nflCurrentWeek,
        
        // Week status (for the NFL current week, not necessarily the contest week)
        weekStatus,
        isLive: weekStatus === 'live' && contest.week === nflCurrentWeek,
        isFinal: weekStatus === 'finalized' && contest.week === nflCurrentWeek,
        isUpcoming: contest.week > nflCurrentWeek,
        
        // Is this team in a public contest?
        isInContest: true
      };

      console.log('🎮 [usePublicContestContext] Built context:', context);
      setContestContext(context);

    } catch (err) {
      console.error('Error fetching public contest context:', err);
      setError(err);
      setContestContext(null);
    } finally {
      setLoading(false);
      lastFetchRef.current = Date.now();
    }
  }, [teamId]);

  // Calculate contest median from entrant scores
  const calculateContestMedian = useCallback(async () => {
    if (!contestContext?.contestId) return null;

    try {
      // Get current scores from weekly_lineups for all entrants
      const teamIds = contestEntries.map(e => e.team_id);
      
      if (teamIds.length === 0) return null;

      const { data: lineups, error } = await supabase
        .from('weekly_lineups')
        .select('team_id, total_points, status')
        .in('team_id', teamIds)
        .eq('week_number', contestContext.week)
        .eq('season_year', contestContext.season)
        .in('status', ['active', 'completed']);

      if (error) throw error;

      if (!lineups || lineups.length === 0) return null;

      const scores = lineups
        .map(l => parseFloat(l.total_points || 0))
        .filter(s => s > 0)
        .sort((a, b) => a - b);

      if (scores.length === 0) return null;

      const mid = Math.floor(scores.length / 2);
      const median = scores.length % 2 === 0
        ? (scores[mid - 1] + scores[mid]) / 2
        : scores[mid];

      return {
        median: Math.round(median * 10) / 10,
        totalTeams: scores.length,
        scores
      };
    } catch (err) {
      console.error('Error calculating contest median:', err);
      return null;
    }
  }, [contestContext?.contestId, contestContext?.week, contestContext?.season, contestEntries]);

  // Calculate projected contest median (before games start)
  const calculateProjectedContestMedian = useCallback(async () => {
    if (!contestContext?.contestId) return null;

    try {
      const teamIds = contestEntries.map(e => e.team_id);
      
      if (teamIds.length === 0) return null;

      // Get projected points for each team's lineup
      const projections = [];

      for (const teamId of teamIds) {
        const { data: lineup } = await supabase
          .from('user_inventory')
          .select('player_cards!inner(weekly_projected_points, projected_points)')
          .eq('team_id', teamId)
          .eq('is_in_lineup', true);

        if (lineup?.length) {
          const teamProjected = lineup.reduce((sum, player) => {
            const proj = player.player_cards?.weekly_projected_points || 
                        player.player_cards?.projected_points || 0;
            return sum + parseFloat(proj);
          }, 0);
          if (teamProjected > 0) projections.push({ teamId, projection: teamProjected });
        }
      }

      if (projections.length === 0) return null;

      const sortedProjections = projections.map(p => p.projection).sort((a, b) => a - b);
      const mid = Math.floor(sortedProjections.length / 2);
      const median = sortedProjections.length % 2 === 0
        ? (sortedProjections[mid - 1] + sortedProjections[mid]) / 2
        : sortedProjections[mid];

      return {
        median: Math.round(median * 10) / 10,
        totalTeams: projections.length,
        projections
      };
    } catch (err) {
      console.error('Error calculating projected contest median:', err);
      return null;
    }
  }, [contestContext?.contestId, contestEntries]);

  // Get H2H opponent's current/projected score
  const getOpponentScore = useCallback(async () => {
    if (!contestContext?.opponent?.teamId) return null;

    try {
      const opponentId = contestContext.opponent.teamId;
      
      // First check for live/final score in weekly_lineups
      const { data: lineup, error } = await supabase
        .from('weekly_lineups')
        .select('total_points, status')
        .eq('team_id', opponentId)
        .eq('week_number', contestContext.week)
        .eq('season_year', contestContext.season)
        .maybeSingle();

      if (!error && lineup?.total_points) {
        return {
          score: parseFloat(lineup.total_points || 0),
          isLive: lineup.status === 'active',
          isFinal: lineup.status === 'completed'
        };
      }

      // Fall back to projected points from inventory
      const { data: inventory } = await supabase
        .from('user_inventory')
        .select('player_cards!inner(weekly_projected_points, projected_points)')
        .eq('team_id', opponentId)
        .eq('is_in_lineup', true);

      if (inventory?.length) {
        const projected = inventory.reduce((sum, player) => {
          const proj = player.player_cards?.weekly_projected_points || 
                      player.player_cards?.projected_points || 0;
          return sum + parseFloat(proj);
        }, 0);

        return {
          score: Math.round(projected * 10) / 10,
          isLive: false,
          isFinal: false,
          isProjected: true
        };
      }

      return null;
    } catch (err) {
      console.error('Error getting opponent score:', err);
      return null;
    }
  }, [contestContext?.opponent?.teamId, contestContext?.week, contestContext?.season]);

  // Calculate current rank in top_points contest
  const getCurrentRank = useCallback(async (myScore) => {
    if (!contestContext?.contestId || contestContext?.contest?.winCondition !== 'top_points') {
      return null;
    }

    try {
      const teamIds = contestEntries.map(e => e.team_id);
      
      if (teamIds.length === 0) return null;

      // Get all team scores
      const { data: lineups, error } = await supabase
        .from('weekly_lineups')
        .select('team_id, total_points')
        .in('team_id', teamIds)
        .eq('week_number', contestContext.week)
        .eq('season_year', contestContext.season);

      if (error) throw error;

      // Build score list
      const scores = teamIds.map(tid => {
        const lineup = lineups?.find(l => l.team_id === tid);
        return {
          teamId: tid,
          score: lineup ? parseFloat(lineup.total_points || 0) : 0
        };
      });

      // Sort by score descending
      scores.sort((a, b) => b.score - a.score);

      // Find my rank
      const myRankIndex = scores.findIndex(s => s.teamId === teamId);
      
      return {
        rank: myRankIndex + 1,
        totalEntrants: scores.length,
        scores
      };
    } catch (err) {
      console.error('Error calculating rank:', err);
      return null;
    }
  }, [contestContext?.contestId, contestContext?.contest?.winCondition, contestContext?.week, contestContext?.season, contestEntries, teamId]);

  // Fetch on mount and when teamId changes
  useEffect(() => {
    fetchContestContext();
  }, [fetchContestContext]);

  // Route-change refetch: when user navigates between pages, refetch
  // This catches cases where user joins a contest on /contests and navigates back
  useEffect(() => {
    if (!teamId) return;
    
    // Skip the initial mount (handled by the above useEffect)
    if (lastPathnameRef.current === null) {
      lastPathnameRef.current = location.pathname;
      return;
    }
    
    // Only refetch if the pathname actually changed
    if (lastPathnameRef.current !== location.pathname) {
      lastPathnameRef.current = location.pathname;
      console.log('🎮 [usePublicContestContext] Route changed, refetching...', location.pathname);
      fetchContestContext();
    }
  }, [location.pathname, fetchContestContext, teamId]);

  // Visibility-based refetch: when user returns to the tab/page, refetch
  // This catches cases where user joins a contest on another page and comes back
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && teamId) {
        // Only refetch if it's been more than 2 seconds since last fetch
        // to avoid double-fetching on initial page load
        const now = Date.now();
        if (!lastFetchRef.current || now - lastFetchRef.current > 2000) {
          console.log('🎮 [usePublicContestContext] Visibility changed to visible, refetching...');
          fetchContestContext();
        }
      }
    };

    // Focus event catches in-app navigation better than visibility
    const handleFocus = () => {
      if (teamId) {
        const now = Date.now();
        if (!lastFetchRef.current || now - lastFetchRef.current > 2000) {
          console.log('🎮 [usePublicContestContext] Window focused, refetching...');
          fetchContestContext();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchContestContext, teamId]);

  // Optional polling interval for live score updates
  useEffect(() => {
    if (!pollInterval || pollInterval < 5000) return; // Minimum 5 second interval
    
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible' && teamId) {
        console.log('🎮 [usePublicContestContext] Polling refetch...');
        fetchContestContext();
      }
    }, pollInterval);

    return () => clearInterval(intervalId);
  }, [fetchContestContext, pollInterval, teamId]);

  return {
    contestContext,
    contestEntries,
    loading,
    error,
    refetch: fetchContestContext,
    calculateContestMedian,
    calculateProjectedContestMedian,
    getOpponentScore,
    getCurrentRank,
    // Convenience getters
    isInContest: !!contestContext?.isInContest,
    contestName: contestContext?.contest?.name || null,
    winCondition: contestContext?.contest?.winCondition || 'median',
    opponent: contestContext?.opponent || null,
    entrantCount: contestContext?.entrantCount || 0,
    maxEntries: contestContext?.contest?.maxEntries || null,
    contestWeek: contestContext?.contestWeek || null,
    isUpcoming: contestContext?.isUpcoming || false
  };
}
