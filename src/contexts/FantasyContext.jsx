import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../services/supabase';
import { getUserInventory } from '../services/supabase';
import { EMPTY_LINEUP, createEmptyLineup } from '../constants/lineup';
import { useLineupStats } from '../hooks/fantasy/useLineupStats';

const FantasyContext = createContext(null);

export function FantasyProvider({ children, user, activeTeam, initialInventory }) {
  // Track previous team ID to detect team changes BEFORE render
  const prevTeamIdRef = useRef(null);
  const isTeamChanging = prevTeamIdRef.current !== null && prevTeamIdRef.current !== activeTeam?.id;
  
  // Update ref AFTER we've detected the change
  useEffect(() => {
    prevTeamIdRef.current = activeTeam?.id;
  }, [activeTeam?.id]);
  
  // Lineup state - shared across all pages
  const [lineup, setLineup] = useState(createEmptyLineup());

  // Projections state - shared across all pages
  const [projections, setProjections] = useState(new Map());
  
  // Live game data - shared across all pages
  const [liveGameData, setLiveGameData] = useState(new Map());
  
  // Current week - initialize immediately
  const [currentWeek, setCurrentWeek] = useState(null);
  
  // Week status from nfl_season_config (not_started, live, finalized)
  const [weekStatus, setWeekStatus] = useState('not_started');
  
  // Game counts for UI display
  const [gameCounts, setGameCounts] = useState({ scheduled: 0, live: 0, final: 0, total: 0 });
  
  // Global median score for comparison
  const [globalMedian, setGlobalMedian] = useState(0);
  
  // Inventory state - initialize with loader data to prevent API call
  const [inventory, setInventory] = useState(initialInventory || { players: [], tokens: [] });
  
  // Loading states
  const [loading, setLoading] = useState(true);
  
  // Refs for subscriptions
  const channelsRef = useRef([]);

  // Load current week immediately on mount (synchronous query)
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
          setCurrentWeek({
            week: data.current_week,
            year: data.season_year
          });
          setWeekStatus(data.week_status || 'not_started');
          setGameCounts({
            scheduled: (data.games_total || 0) - (data.games_completed || 0) - (data.games_in_progress || 0),
            live: data.games_in_progress || 0,
            final: data.games_completed || 0,
            total: data.games_total || 0
          });
          
          // Also load global median
          const { data: globalStats } = await supabase
            .from('weekly_global_stats')
            .select('median_score')
            .eq('week_number', data.current_week)
            .eq('season_year', data.season_year)
            .single();
          
          if (globalStats) {
            setGlobalMedian(globalStats.median_score || 0);
          }
        }
      } catch (err) {
        console.error('Error loading current week:', err);
      }
    };
    
    loadCurrentWeek();
  }, []); // Run once on mount

  // Sync inventory when initialInventory changes (team switch or revalidation)
  useEffect(() => {
    if (initialInventory && initialInventory.players) {
      console.log('🔄 [FantasyContext] Syncing inventory from loader:', initialInventory.players.length, 'players');
      setInventory(initialInventory);
    }
  }, [initialInventory]);

  // Load live game data
  const loadLiveGameData = useCallback(async (inventoryData = null) => {
    console.log('🎮 [FantasyContext] loadLiveGameData called');
    try {
      const playersData = inventoryData?.players || inventory?.players;
      
      // Get current week from nfl_season_config table
      const { data: seasonConfig, error: seasonError } = await supabase
        .from('nfl_season_config')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (seasonError) {
        console.error('🎮 [FantasyContext] Error getting season config:', seasonError);
        return;
      }
      
      const weekNumber = seasonConfig.current_week;
      const seasonYear = seasonConfig.season_year;
      
      console.log('🎮 [FantasyContext] NFL week:', weekNumber, 'Team current_week:', activeTeam?.current_week);
      
      setCurrentWeek({ week: weekNumber, year: seasonYear });
      
      // CRITICAL FIX: Load games for the TEAM's current week, not the NFL's current week
      // This prevents showing stale data when team is behind/ahead of real NFL schedule
      const teamWeek = activeTeam?.current_week || weekNumber;
      
      // If team hasn't started yet (team.current_week > NFL week), don't load any game data
      if (activeTeam?.current_week && activeTeam.current_week > weekNumber) {
        console.log('🎮 [FantasyContext] Team ahead of NFL schedule. Skipping live game data.');
        setLiveGameData(new Map());
        return;
      }
      
      console.log('🎮 [FantasyContext] Loading game data for team week:', teamWeek);
      
      // Load games for TEAM's current week (not NFL's current week)
      const { data: gamesData, error: gamesError } = await supabase
        .from('game_scores')
        .select('*')
        .eq('week_number', teamWeek)
        .eq('season_year', seasonYear);
      
      if (gamesError) {
        console.error('🎮 [FantasyContext] Error loading games:', gamesError);
        return;
      }
      
      if (!gamesData || gamesData.length === 0) {
        console.log('🎮 [FantasyContext] No games found for week', teamWeek);
        setLiveGameData(new Map());
        return;
      }
      
      // Check if any games have started for current week
      const hasGamesStarted = gamesData.some(g => g.game_status === 'live' || g.game_status === 'halftime' || g.game_status === 'final');
      
      // If no games started yet, show previous week's final stats
      let displayWeek = weekNumber;
      let displayGames = gamesData;
      
      if (!hasGamesStarted && weekNumber > 1) {
        console.log('🎮 [FantasyContext] No live games yet, loading previous week stats');
        const prevWeek = weekNumber - 1;
        const { data: prevGames } = await supabase
          .from('game_scores')
          .select('*')
          .eq('week_number', prevWeek)
          .eq('season_year', seasonYear)
          .eq('game_status', 'final');
        
        if (prevGames && prevGames.length > 0) {
          displayWeek = prevWeek;
          displayGames = prevGames;
        }
      }
      
      // Load player stats for display week
      const gameIds = displayGames.map(g => g.game_id);
      
      console.log(`🎮 [FantasyContext] Loading stats for Week ${displayWeek}, game IDs:`, gameIds);
      
      const { data: statsData, error: statsError } = await supabase
        .from('player_game_stats')
        .select('*')
        .in('game_id', gameIds);
      
      if (statsError) {
        console.error('🎮 [FantasyContext] Error loading stats:', statsError);
        return;
      }
      
      // Build game data map
      const gameDataMap = new Map();
      const gameStatusMap = new Map(displayGames.map(g => [g.game_id, g.game_status]));
      
      (playersData || []).forEach(player => {
        const playerId = player.player_card?.player_id;
        if (!playerId) return;
        
        // Find stats for this player
        const playerStats = statsData?.find(s => s.player_card_id === player.player_card_id);
        
        if (playerStats) {
          gameDataMap.set(playerId, {
            currentPoints: parseFloat(playerStats.fantasy_points || 0),
            gameStatus: gameStatusMap.get(playerStats.game_id) || 'scheduled',
            stats: playerStats.stats || {},
            gameId: playerStats.game_id
          });
        } else {
          // No stats yet - game not started or player didn't play
          gameDataMap.set(playerId, {
            currentPoints: 0,
            gameStatus: 'scheduled',
            stats: {},
            gameId: null
          });
        }
      });
      
      setLiveGameData(gameDataMap);
      console.log('🎮 [FantasyContext] Live game data loaded:', gameDataMap.size, 'players');
    } catch (err) {
      console.error('Error loading live game data:', err);
    }
  }, [activeTeam?.current_week, inventory?.players]); // Stable primitive dependencies only

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
      setLoading(false);
    } catch (err) {
      console.error('Error loading projections:', err);
      setLoading(false);
    }
  }, [currentWeek?.week, currentWeek?.year]); // Stable primitive dependencies

  // Load inventory and lineup (only called when explicitly needed, e.g., after pack opening)
  const loadInventory = useCallback(async () => {
    if (!user?.id || !activeTeam?.id) {
      console.log('⏸️ [FantasyContext] No user or active team');
      return;
    }
    
    try {
      setLoading(true);
      console.log('📦 [FantasyContext] Loading inventory for team:', activeTeam.id);
      
      const inventoryData = await getUserInventory(activeTeam.id);
      
      if (!inventoryData) {
        console.error('No inventory data returned');
        setLoading(false);
        return;
      }
      
      setInventory(inventoryData);
      console.log('📦 [FantasyContext] Inventory loaded:', inventoryData.players?.length, 'players');
      
      // Load projections and game data
      await loadProjectionsAndGameData(inventoryData);
      await loadLiveGameData(inventoryData);
    } catch (err) {
      console.error('Error in loadInventory:', err);
      setLoading(false);
    }
  }, [user?.id, activeTeam?.id]); // No function dependencies to avoid loops

  // Load projections and game data from initial inventory on mount
  // AND rebuild lineup whenever inventory changes (including lineup position changes)
  useEffect(() => {
    if (!user?.id || !activeTeam?.id || !currentWeek || !inventory?.players?.length) return;
    
    // Build lineup from inventory (no BENCH array)
    const newLineup = createEmptyLineup();
    
    inventory.players.forEach(player => {
      if (player.is_in_lineup && player.lineup_position) {
        newLineup[player.lineup_position] = player;
      }
    });
    
    setLineup(newLineup);
    
    // Load projections and game data from inventory
    loadProjectionsAndGameData(inventory);
    loadLiveGameData(inventory);
  }, [currentWeek?.week, inventory, user?.id, activeTeam?.id]); // Removed function dependencies

  // Subscribe to live updates
  useEffect(() => {
    if (!user || !currentWeek || !inventory?.players || inventory.players.length === 0) return;
    
    // Clean up old subscriptions
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];
    
    // Subscribe to game_scores changes for current week
    const gamesChannel = supabase
      .channel('fantasy-context-games')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_scores',
          filter: `week_number=eq.${currentWeek.week}`
        },
        (payload) => {
          console.log('🔄 [FantasyContext] Game updated:', payload);
          // Reload game data when any game updates
          loadLiveGameData();
        }
      )
      .subscribe();
    
    // Get player_card_ids from user's inventory
    const playerCardIds = inventory.players.map(p => p.player_card_id);
    
    // Subscribe to player stats changes - ONLY for user's players
    const statsChannel = supabase
      .channel('fantasy-context-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_game_stats',
          filter: `player_card_id=in.(${playerCardIds.join(',')})` 
        },
        async (payload) => {
          console.log('🔄 [FantasyContext] Player stat updated:', payload.new);
          
          // Find the player in inventory to get their player_id
          const inventoryPlayer = inventory.players.find(
            p => p.player_card_id === payload.new.player_card_id
          );
          
          if (!inventoryPlayer) return;
          
          const playerId = inventoryPlayer.player_card.player_id;
          
          // Get game status
          const { data: game } = await supabase
            .from('game_scores')
            .select('game_status')
            .eq('game_id', payload.new.game_id)
            .single();
          
          // Update live game data for this player
          setLiveGameData(prev => {
            const updated = new Map(prev);
            updated.set(playerId, {
              currentPoints: parseFloat(payload.new.fantasy_points || 0),
              gameStatus: game?.game_status || 'scheduled',
              stats: payload.new.stats || {},
              gameId: payload.new.game_id
            });
            return updated;
          });
        }
      )
      .subscribe();
    
    channelsRef.current.push(gamesChannel, statsChannel);
    
    // Subscribe to nfl_season_config for week status changes
    const configChannel = supabase
      .channel('fantasy-context-config')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'nfl_season_config',
          filter: 'is_active=eq.true'
        },
        (payload) => {
          console.log('🔄 [FantasyContext] Week config update:', payload.new.week_status);
          setWeekStatus(payload.new.week_status || 'not_started');
          setGameCounts({
            scheduled: (payload.new.games_total || 0) - (payload.new.games_completed || 0) - (payload.new.games_in_progress || 0),
            live: payload.new.games_in_progress || 0,
            final: payload.new.games_completed || 0,
            total: payload.new.games_total || 0
          });
          
          // If week advanced, update currentWeek
          if (payload.new.current_week !== currentWeek?.week) {
            console.log('🔄 [FantasyContext] Week advanced to:', payload.new.current_week);
            setCurrentWeek({
              week: payload.new.current_week,
              year: payload.new.season_year
            });
          }
        }
      )
      .subscribe();
    
    // Subscribe to weekly_global_stats for median updates
    const globalStatsChannel = supabase
      .channel('fantasy-context-global-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weekly_global_stats',
          filter: `week_number=eq.${currentWeek.week}`
        },
        (payload) => {
          console.log('🔄 [FantasyContext] Global stats update:', payload.new?.median_score);
          if (payload.new?.median_score !== undefined) {
            setGlobalMedian(payload.new.median_score);
          }
        }
      )
      .subscribe();
    
    channelsRef.current.push(configChannel, globalStatsChannel);
    
    // Cleanup on unmount
    return () => {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [user?.id, currentWeek?.week, currentWeek?.year, inventory?.players?.length]); // Use primitive values to prevent stale closures

  // Update inventory with proper state management
  const updateInventory = useCallback((updater) => {
    setInventory(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      console.log('🔄 [FantasyContext] Inventory updated:', updated.players?.length, 'players');
      return updated;
    });
  }, []);

  // Calculate derived lineup statistics using custom hook
  const lineupStats = useLineupStats(lineup, projections, liveGameData);

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

FantasyProvider.propTypes = {
  children: PropTypes.node.isRequired,
  user: PropTypes.object,
  activeTeam: PropTypes.object,
  initialInventory: PropTypes.object
};

export function useFantasy() {
  const context = useContext(FantasyContext);  
  if (!context) {
    throw new Error('useFantasy must be used within a FantasyProvider');
  }
  return context;
}
