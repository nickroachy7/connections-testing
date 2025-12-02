import { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { useStorage } from '../hooks/useStorage';
import { EMPTY_LINEUP, createEmptyLineup } from '../constants/lineup';
import { useLineupStats } from '../hooks/fantasy/useLineupStats';

const FantasyContext = createContext();

export function FantasyProvider({ children }) {
  const { user } = useAuth();
  const { getItem, setItem } = useStorage('session');
  const [activeTeam, setActiveTeam] = useState(null);
  const [lineup, setLineup] = useState(createEmptyLineup());
  const [projections, setProjections] = useState(new Map());
  const [liveGameData, setLiveGameData] = useState(new Map());
  const [inventory, setInventory] = useState({ players: [], tokens: [] });
  const [loading, setLoading] = useState(true);

  // Lineup stats hook - calculates projected/live points
  const lineupStats = useLineupStats(lineup, projections, liveGameData);

  // NEW: Realtime state for week status and global stats
  const [currentWeek, setCurrentWeek] = useState(null);
  const [weekStatus, setWeekStatus] = useState('not_started');
  const [nextGameTime, setNextGameTime] = useState(null);
  const [gameCounts, setGameCounts] = useState({ scheduled: 0, live: 0, final: 0, total: 0 });
  const [gamesInProgress, setGamesInProgress] = useState(0);

  // Global median score
  const [globalMedian, setGlobalMedian] = useState(0);

  // Load current week and setup realtime subscriptions
  useEffect(() => {
    const loadCurrentWeek = async () => {
      try {
        const { data, error } = await supabase
          .from('nfl_season_config')
          .select('current_week, season_year, week_status, first_game_time, last_game_time, games_in_progress, games_completed, games_total')
          .eq('is_active', true)
          .single();
        
        if (error) throw error;
        if (data) {
          setCurrentWeek({ week: data.current_week, year: data.season_year });
          setWeekStatus(data.week_status || 'not_started');
          setGameCounts({
            scheduled: (data.games_total || 0) - (data.games_completed || 0) - (data.games_in_progress || 0),
            live: data.games_in_progress || 0,
            final: data.games_completed || 0,
            total: data.games_total || 0
          });
          setNextGameTime(data.first_game_time);
          setGamesInProgress(data.games_in_progress || 0);

          // Load global median for current week
          const { data: globalStats } = await supabase
            .from('weekly_global_stats')
            .select('median_score')
            .eq('week_number', data.current_week)
            .eq('season_year', data.season_year)
            .maybeSingle();
          
          if (globalStats) {
            setGlobalMedian(globalStats.median_score || 0);
          }
        }
      } catch (error) {
        console.error('Error loading current week:', error);
      }
    };
    loadCurrentWeek();
  }, []);

  // Active Team Management
  useEffect(() => {
    if (!user?.id) {
      setActiveTeam(null);
      return;
    }

    const initializeActiveTeam = async () => {
      try {
        const cachedTeamId = getItem('activeTeamId');
        
        if (cachedTeamId) {
          const { data: cachedTeam, error: cachedError } = await supabase
            .from('teams')
            .select('*')
            .eq('id', cachedTeamId)
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();
          
          if (!cachedError && cachedTeam) {
            setActiveTeam(cachedTeam);
            return;
          }
        }
        
        const { data: teams, error } = await supabase
          .from('teams')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (error) throw error;
        
        if (teams && teams.length > 0) {
          setActiveTeam(teams[0]);
          setItem('activeTeamId', teams[0].id);
        } else {
          setActiveTeam(null);
        }
      } catch (error) {
        console.error('Error initializing active team:', error);
        setActiveTeam(null);
      }
    };

    initializeActiveTeam();
  }, [user?.id]);

  const switchTeam = useCallback((newTeam) => {
    setActiveTeam(newTeam);
    setItem('activeTeamId', newTeam.id);
    setLineup(createEmptyLineup());
    setProjections(new Map());
    setLiveGameData(new Map());
  }, [setItem]);

  // Update inventory helper
  const updateInventory = useCallback((updates) => {
    setInventory(prev => ({
      players: updates.players !== undefined ? updates.players : prev.players,
      tokens: updates.tokens !== undefined ? updates.tokens : prev.tokens,
    }));
  }, []);

  // Load live game data for current lineup
  const loadLiveGameData = useCallback(async (inventoryData) => {
    if (!currentWeek || !inventoryData?.players) return;
    
    try {
      const playerIds = inventoryData.players
        .map(p => p.player_card?.player_id)
        .filter(Boolean);
      
      if (playerIds.length === 0) return;

      const { data: gameStats, error } = await supabase
        .from('player_game_stats')
        .select(`
          player_card_id,
          fantasy_points,
          stats,
          game_id,
          game_scores!inner(
            game_status,
            home_team,
            away_team
          )
        `)
        .eq('week_number', currentWeek.week)
        .eq('season_year', currentWeek.year);
      
      if (error) throw error;

      const gameDataMap = new Map();
      
      for (const player of inventoryData.players) {
        const playerId = player.player_card?.player_id;
        if (!playerId) continue;

        const stat = gameStats?.find(s => s.player_card_id === player.player_card_id);
        
        if (stat && stat.game_scores) {
          gameDataMap.set(playerId, {
            currentPoints: parseFloat(stat.fantasy_points || 0),
            gameStatus: stat.game_scores.game_status || 'scheduled',
            stats: stat.stats || {},
            gameId: stat.game_id
          });
        } else {
          gameDataMap.set(playerId, {
            currentPoints: 0,
            gameStatus: 'scheduled',
            stats: {},
            gameId: null
          });
        }
      }
      
      setLiveGameData(gameDataMap);
      console.log('🎮 [FantasyContext] Live game data loaded:', gameDataMap.size, 'players');
    } catch (err) {
      console.error('Error loading live game data:', err);
    }
  }, [currentWeek]);

  // Helper: Load projections and game data (without fetching inventory)
  // FIXED: Removed query to non-existent weekly_projections table
  // Now reads projections directly from player_card.weekly_projected_points (populated by update-projections edge function)
  const loadProjectionsAndGameData = useCallback(async (inventoryData) => {
    if (!currentWeek || !inventoryData?.players) return;
    
    try {
      // Build projections map from inline player_card data
      // player_cards.weekly_projected_points is updated daily by update-projections edge function
      const dbProjections = new Map();
      inventoryData.players.forEach(p => {
        const playerCard = p.player_card;
        if (playerCard) {
          // Use weekly_projected_points from player_cards table (updated by cron)
          const weeklyProjection = parseFloat(playerCard.weekly_projected_points) || 0;
          const seasonAvg = parseFloat(playerCard.season_ppg || playerCard.season_avg_points) || 0;
          const gamesPlayed = playerCard.games_played || playerCard.games_played_season || 0;
          
          dbProjections.set(playerCard.player_id, {
            projected: weeklyProjection,
            seasonAvg: seasonAvg,
            gamesPlayed: gamesPlayed,
            injuryStatus: playerCard.injury_status || 'healthy',
            projectionNotes: playerCard.projection_notes || '',
            isFromDatabase: true
          });
        }
      });
      
      console.log('📊 [FantasyContext] Projections loaded from player_cards:', dbProjections.size, 'players');
      setProjections(dbProjections);
      await loadLiveGameData(inventoryData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading projections:', err);
      setLoading(false);
    }
  }, [currentWeek?.week, currentWeek?.year, loadLiveGameData]);

  // Load inventory and lineup (only called when explicitly needed, e.g., after pack opening)
  const loadInventory = useCallback(async () => {
    if (!user?.id || !activeTeam?.id) {
      console.log('⏸️ [FantasyContext] No user or active team');
      return;
    }

    try {
      setLoading(true);

      const { data: players, error: playersError } = await supabase
        .from('user_player_inventory')
        .select(`
          *,
          player_card:player_cards!inner(*)
        `)
        .eq('team_id', activeTeam.id)
        .order('acquired_at', { ascending: false });

      if (playersError) throw playersError;

      const { data: tokens, error: tokensError } = await supabase
        .from('user_token_inventory')
        .select(`
          *,
          token_card:token_cards!inner(*)
        `)
        .eq('team_id', activeTeam.id)
        .order('acquired_at', { ascending: false });

      if (tokensError) throw tokensError;

      const inventoryData = {
        players: players || [],
        tokens: tokens || []
      };

      setInventory(inventoryData);

      const currentLineup = createEmptyLineup();
      (players || []).forEach(player => {
        if (player.is_in_lineup && player.lineup_position) {
          currentLineup[player.lineup_position] = player;
        }
      });
      setLineup(currentLineup);

      await loadProjectionsAndGameData(inventoryData);
    } catch (error) {
      console.error('Error loading inventory:', error);
      setLoading(false);
    }
  }, [user?.id, activeTeam?.id, loadProjectionsAndGameData]);

  // Load inventory when active team changes
  useEffect(() => {
    if (activeTeam?.id) {
      loadInventory();
    }
  }, [activeTeam?.id]);

  // Setup realtime subscriptions for nfl_season_config changes
  useEffect(() => {
    if (!currentWeek) return;

    const seasonConfigChannel = supabase
      .channel('nfl_season_config_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'nfl_season_config',
          filter: 'is_active=eq.true'
        },
        (payload) => {
          console.log('🔄 [FantasyContext] NFL season config updated:', payload.new);
          setCurrentWeek({ week: payload.new.current_week, year: payload.new.season_year });
          setWeekStatus(payload.new.week_status || 'not_started');
          setGameCounts({
            scheduled: (payload.new.games_total || 0) - (payload.new.games_completed || 0) - (payload.new.games_in_progress || 0),
            live: payload.new.games_in_progress || 0,
            final: payload.new.games_completed || 0,
            total: payload.new.games_total || 0
          });
          setNextGameTime(payload.new.first_game_time);
          setGamesInProgress(payload.new.games_in_progress || 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(seasonConfigChannel);
    };
  }, [currentWeek]);

  // Setup realtime subscriptions for weekly_global_stats changes
  useEffect(() => {
    if (!currentWeek) return;

    const globalStatsChannel = supabase
      .channel('weekly_global_stats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weekly_global_stats',
          filter: `week_number=eq.${currentWeek.week}`
        },
        (payload) => {
          console.log('🔄 [FantasyContext] Weekly global stats updated:', payload.new);
          if (payload.new && payload.new.median_score !== undefined) {
            setGlobalMedian(payload.new.median_score);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalStatsChannel);
    };
  }, [currentWeek]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    lineup,
    setLineup,
    projections,
    setProjections,
    liveGameData,
    setLiveGameData,
    currentWeek,
    weekStatus,
    gameCounts,
    globalMedian,
    inventory,
    setInventory,
    updateInventory,
    loading,
    loadInventory,
    loadLiveGameData,
    lineupStats
  }), [
    lineup,
    setLineup,
    projections,
    setProjections,
    liveGameData,
    setLiveGameData,
    currentWeek,
    weekStatus,
    gameCounts,
    globalMedian,
    inventory,
    setInventory,
    updateInventory,
    loading,
    loadInventory,
    loadLiveGameData,
    lineupStats
  ]);

  return (
    <FantasyContext.Provider value={value}>
      {children}
    </FantasyContext.Provider>
  );
}

export function useFantasy() {
  const context = useContext(FantasyContext);
  if (context === undefined) {
    throw new Error('useFantasy must be used within a FantasyProvider');
  }
  return context;
}

export { FantasyContext };