import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../services/supabase';

/**
 * useLeagueContext Hook
 * 
 * Fetches and manages league-specific context for a team.
 * Returns league membership, contest config, and league-specific stats.
 * 
 * Uses module-level caching to persist data across component mounts,
 * preventing refetches when navigating between pages.
 * 
 * For teams in a private league:
 * - Uses league_teams for wins/losses/lives
 * - Uses league_contest_config for scoring/elimination rules
 * - Calculates league-specific median from league members
 */

// Module-level cache to persist across component mounts
const leagueCache = {
  data: null,
  teamId: null,
  timestamp: null
};

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

// Helper to check if cache is valid for a given teamId
function isCacheValidForTeam(teamId) {
  if (!leagueCache.data || !leagueCache.timestamp) return false;
  if (leagueCache.teamId !== teamId) return false;
  const age = Date.now() - leagueCache.timestamp;
  return age < STALE_TIME;
}

export function useLeagueContext(teamId) {
  // Initialize from cache if valid for this team
  const cacheValid = isCacheValidForTeam(teamId);
  
  const [leagueContext, setLeagueContext] = useState(() => 
    cacheValid ? leagueCache.data.leagueContext : null
  );
  const [leagueMembers, setLeagueMembers] = useState(() => 
    cacheValid ? leagueCache.data.leagueMembers : []
  );
  const [loading, setLoading] = useState(!cacheValid);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  const mountedRef = useRef(true);

  // Check if cache is valid (using the helper)
  const isCacheValid = useCallback(() => {
    return isCacheValidForTeam(teamId);
  }, [teamId]);

  // Fetch league membership and config for the team
  const fetchLeagueContext = useCallback(async (forceRefresh = false) => {
    console.log('🏆 [useLeagueContext] Fetching for teamId:', teamId);
    
    if (!teamId) {
      console.log('🏆 [useLeagueContext] No teamId, skipping');
      setLeagueContext(null);
      setLoading(false);
      return;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh && isCacheValid()) {
      console.log('🎯 [useLeagueContext] Using cached data');
      setLeagueContext(leagueCache.data.leagueContext);
      setLeagueMembers(leagueCache.data.leagueMembers);
      setLoading(false);
      return;
    }

    // Show loading state only if no cached data
    if (!leagueCache.data) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    
    setError(null);

    try {

      // Check if team is in any active league
      const { data: leagueTeam, error: leagueTeamError } = await supabase
        .from('league_teams')
        .select(`
          *,
          league:leagues(
            id,
            name,
            commissioner_id,
            status
          )
        `)
        .eq('team_id', teamId)
        .eq('is_active', true)
        .maybeSingle();
      
      console.log('🏆 [useLeagueContext] League team data:', leagueTeam, 'error:', leagueTeamError);

      if (leagueTeamError) throw leagueTeamError;

      // Team is not in any league
      if (!leagueTeam) {
        setLeagueContext(null);
        setLeagueMembers([]);
        setLoading(false);
        return;
      }

      // Fetch the league contest config
      const { data: contestConfig, error: configError } = await supabase
        .from('league_contest_config')
        .select('*')
        .eq('league_id', leagueTeam.league_id)
        .single();

      if (configError && configError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is okay for older leagues
        console.warn('Error fetching contest config:', configError);
      }

      // Fetch all active league members for median calculation
      const { data: members, error: membersError } = await supabase
        .from('league_teams')
        .select(`
          team_id,
          league_wins,
          league_losses,
          league_lives,
          is_active,
          team:teams(
            id,
            team_name,
            user_id
          )
        `)
        .eq('league_id', leagueTeam.league_id)
        .eq('is_active', true);

      if (membersError) throw membersError;

      setLeagueMembers(members || []);

      // Build the league context object
      const context = {
        // League team stats (for this specific team)
        leagueTeamId: leagueTeam.id,
        leagueId: leagueTeam.league_id,
        leagueWins: leagueTeam.league_wins || 0,
        leagueLosses: leagueTeam.league_losses || 0,
        leagueLives: leagueTeam.league_lives || 0,
        restartCount: leagueTeam.restart_count || 0,
        eliminatedAt: leagueTeam.eliminated_at,
        
        // League info
        league: leagueTeam.league,
        
        // Contest config (with defaults)
        contestConfig: contestConfig || {
          scoring_type: 'half_ppr',
          win_condition: 'median',
          elimination_type: 'strike',
          max_losses: 3,
          restart_allowed: false,
          max_restarts: null,
          total_weeks: 18,
          start_week: 1
        },
        
        // Member count for display
        memberCount: members?.length || 0,
        
        // Is this team in a private league?
        isInLeague: true
      };
      
      console.log('🏆 [useLeagueContext] Built context:', context);

      if (!mountedRef.current) return;

      // Update cache
      leagueCache.data = {
        leagueContext: context,
        leagueMembers: members || []
      };
      leagueCache.teamId = teamId;
      leagueCache.timestamp = Date.now();

      // Update state
      setLeagueContext(context);
      setLeagueMembers(members || []);
      
    } catch (err) {
      console.error('Error fetching league context:', err);
      if (mountedRef.current) {
        setError(err);
        setLeagueContext(null);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [teamId, isCacheValid]);

  // Calculate league-specific median from member scores
  const calculateLeagueMedian = useCallback(async (weekNumber, seasonYear) => {
    if (!leagueContext?.leagueId || !weekNumber || !seasonYear) {
      return null;
    }

    try {
      // Get team IDs of all active league members
      const teamIds = leagueMembers
        .filter(m => m.is_active)
        .map(m => m.team_id);

      if (teamIds.length === 0) return null;

      // Fetch weekly lineups for all league members
      const { data: lineups, error } = await supabase
        .from('weekly_lineups')
        .select('team_id, total_points, status')
        .in('team_id', teamIds)
        .eq('week_number', weekNumber)
        .eq('season_year', seasonYear)
        .in('status', ['active', 'completed']);

      if (error) throw error;

      if (!lineups || lineups.length === 0) return null;

      // Calculate median from scores
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
      console.error('Error calculating league median:', err);
      return null;
    }
  }, [leagueContext?.leagueId, leagueMembers]);

  // Calculate projected league median (before games start)
  const calculateProjectedLeagueMedian = useCallback(async () => {
    if (!leagueContext?.leagueId) return null;

    try {
      const teamIds = leagueMembers
        .filter(m => m.is_active)
        .map(m => m.team_id);

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
          if (teamProjected > 0) projections.push(teamProjected);
        }
      }

      if (projections.length === 0) return null;

      projections.sort((a, b) => a - b);
      const mid = Math.floor(projections.length / 2);
      const median = projections.length % 2 === 0
        ? (projections[mid - 1] + projections[mid]) / 2
        : projections[mid];

      return {
        median: Math.round(median * 10) / 10,
        totalTeams: projections.length,
        projections
      };
    } catch (err) {
      console.error('Error calculating projected league median:', err);
      return null;
    }
  }, [leagueContext?.leagueId, leagueMembers]);

  // Invalidate cache and force refresh
  const invalidateCache = useCallback(() => {
    leagueCache.timestamp = null;
    return fetchLeagueContext(true);
  }, [fetchLeagueContext]);

  // Initial load - use cache if valid
  useEffect(() => {
    mountedRef.current = true;
    
    // If cache is valid for this team, use it immediately
    if (isCacheValid()) {
      setLeagueContext(leagueCache.data.leagueContext);
      setLeagueMembers(leagueCache.data.leagueMembers);
      setLoading(false);
    } else {
      fetchLeagueContext();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [teamId]); // Only re-run when teamId changes

  return {
    leagueContext,
    leagueMembers,
    loading,
    isRefreshing,
    error,
    refetch: fetchLeagueContext,
    invalidateCache,
    calculateLeagueMedian,
    calculateProjectedLeagueMedian,
    // Convenience getters
    isInLeague: !!leagueContext?.isInLeague,
    leagueName: leagueContext?.league?.name || null,
    leagueWins: leagueContext?.leagueWins || 0,
    leagueLosses: leagueContext?.leagueLosses || 0,
    leagueLives: leagueContext?.leagueLives || 0,
    winCondition: leagueContext?.contestConfig?.win_condition || 'median',
    eliminationType: leagueContext?.contestConfig?.elimination_type || 'strike'
  };
}

// Export cache invalidation for external use
export function invalidateLeagueCache() {
  leagueCache.timestamp = null;
}
