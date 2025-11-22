/**
 * Custom hooks for Supabase data operations
 * 
 * Common patterns for loading data from Supabase tables
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';

/**
 * Hook for loading current NFL week from config
 * @returns {Object} { currentWeek, loading, error, refetch }
 */
export function useCurrentWeek() {
  const [currentWeek, setCurrentWeek] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCurrentWeek = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('nfl_season_config')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (fetchError) throw fetchError;
      
      setCurrentWeek({
        week: data.current_week,
        year: data.season_year
      });
    } catch (err) {
      console.error('Error loading current week:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentWeek();
  }, [loadCurrentWeek]);

  return { currentWeek, loading, error, refetch: loadCurrentWeek };
}

/**
 * Hook for loading weekly global stats
 * @param {number} weekNumber - Week number
 * @param {number} seasonYear - Season year
 * @returns {Object} { globalStats, loading, error }
 */
export function useGlobalStats(weekNumber, seasonYear) {
  const [globalStats, setGlobalStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!weekNumber || !seasonYear) {
      setLoading(false);
      return;
    }

    const loadGlobalStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error: fetchError } = await supabase
          .from('weekly_global_stats')
          .select('*')
          .eq('week_number', weekNumber)
          .eq('season_year', seasonYear)
          .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }
        
        setGlobalStats(data || null);
      } catch (err) {
        console.error('Error loading global stats:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadGlobalStats();
  }, [weekNumber, seasonYear]);

  return { globalStats, loading, error };
}

/**
 * Hook for loading teams with filtering
 * @param {Object} filters - Filter options { isActive, isBot, simulatedSeasonId }
 * @returns {Object} { teams, loading, error, refetch }
 */
export function useTeams(filters = {}) {
  const { isActive = true, isBot, simulatedSeasonId } = filters;
  
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('teams')
        .select(`
          id,
          team_name,
          team_image_url,
          is_bot,
          wins,
          losses,
          total_points,
          current_week,
          contest_type_id,
          simulated_season_id,
          is_active,
          user:users(
            id,
            username,
            avatar_url
          )
        `);
      
      if (isActive !== undefined) {
        query = query.eq('is_active', isActive);
      }
      
      if (isBot !== undefined) {
        query = query.eq('is_bot', isBot);
      }
      
      if (simulatedSeasonId === null) {
        query = query.is('simulated_season_id', null);
      } else if (simulatedSeasonId !== undefined) {
        query = query.eq('simulated_season_id', simulatedSeasonId);
      }
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      setTeams(data || []);
    } catch (err) {
      console.error('Error loading teams:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [isActive, isBot, simulatedSeasonId]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  return { teams, loading, error, refetch: loadTeams };
}

/**
 * Hook for loading weekly lineups
 * @param {Array} teamIds - Array of team IDs
 * @param {number} weekNumber - Week number
 * @param {number} seasonYear - Season year
 * @returns {Object} { lineups, loading, error }
 */
export function useWeeklyLineups(teamIds, weekNumber, seasonYear) {
  const [lineups, setLineups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!teamIds || teamIds.length === 0 || !weekNumber || !seasonYear) {
      setLoading(false);
      return;
    }

    const loadLineups = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error: fetchError } = await supabase
          .from('weekly_lineups')
          .select('*')
          .in('team_id', teamIds)
          .eq('week_number', weekNumber)
          .eq('season_year', seasonYear);
        
        if (fetchError) throw fetchError;
        
        setLineups(data || []);
      } catch (err) {
        console.error('Error loading weekly lineups:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadLineups();
  }, [teamIds?.join(','), weekNumber, seasonYear]);

  return { lineups, loading, error };
}

/**
 * Hook for subscribing to Supabase realtime changes
 * @param {string} table - Table name
 * @param {Function} onUpdate - Callback when data changes
 * @param {Object} filter - Filter criteria
 */
export function useRealtimeSubscription(table, onUpdate, filter = null) {
  const channelRef = useRef(null);

  useEffect(() => {
    if (!table || !onUpdate) return;

    // Create channel
    let channel = supabase.channel(`${table}_changes`);
    
    // Add filter if provided
    if (filter) {
      channel = channel.on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table,
          filter: filter
        },
        onUpdate
      );
    } else {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        onUpdate
      );
    }
    
    channel.subscribe();
    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, onUpdate, filter]);
}
