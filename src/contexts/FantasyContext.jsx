import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../services/supabase';
import { getUserInventory } from '../services/supabase';
import { EMPTY_LINEUP, createEmptyLineup, getBaselineProjection } from '../constants/lineup';
import { useLineupStats } from '../hooks/fantasy/useLineupStats';

const FantasyContext = createContext(null);

export function FantasyProvider({ children, user, activeTeam }) {
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
  
  // Inventory state - initialize with empty structure to prevent null errors
  const [inventory, setInventory] = useState({ players: [], tokens: [] });
  
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
          .select('*')
          .eq('is_active', true)
          .single();
        
        if (error) throw error;
        
        setCurrentWeek({
          week: data.current_week,
          year: data.season_year
        });
      } catch (err) {
        console.error('Error loading current week:', err);
      }
    };
    
    loadCurrentWeek();
  }, []); // Run once on mount

  // Clear ALL data when switching teams to prevent stale data flash
  useEffect(() => {
    console.log('🔄 [FantasyContext] Active team changed, clearing ALL data. Team:', activeTeam?.team_name, 'Week:', activeTeam?.current_week);
    // Clear everything to prevent any stale data from showing during team switch
    setLiveGameData(new Map());
    setProjections(new Map());
    setLineup(createEmptyLineup());
    setInventory({ players: [], tokens: [] });
    setLoading(true); // Set loading state while switching
  }, [activeTeam?.id]); // Clear when team changes

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
        console.error('Error loading season config:', seasonError);
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
        console.log('🎮 [FantasyContext] Team hasnt started yet (starts week', activeTeam.current_week, ') - clearing game data');
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
        console.error('Error loading games:', gamesError);
        return;
      }
      
      if (!gamesData || gamesData.length === 0) {
        console.log('🎮 [FantasyContext] No games found for current week');
        return;
      }
      
      // Check if any games have started for current week
      const hasGamesStarted = gamesData.some(g => g.game_status === 'live' || g.game_status === 'halftime' || g.game_status === 'final');
      
      // If no games started yet, show previous week's final stats
      let displayWeek = weekNumber;
      let displayGames = gamesData;
      
      if (!hasGamesStarted && weekNumber > 1) {
        console.log('🎮 [FantasyContext] No games started yet, loading previous week stats');
        displayWeek = weekNumber - 1;
        
        const { data: previousWeekGames, error: prevError } = await supabase
          .from('game_scores')
          .select('*')
          .eq('week_number', displayWeek)
          .eq('season_year', seasonYear)
          .eq('game_status', 'final');
        
        if (!prevError && previousWeekGames) {
          displayGames = previousWeekGames;
        }
      }
      
      // Load player stats for display week
      const gameIds = displayGames.map(g => g.game_id);
      
      console.log(`🎮 [FantasyContext] Loading stats for Week ${displayWeek}, game IDs:`, gameIds);
      
      const { data: statsData, error: statsError } = await supabase
        .from('player_game_stats')
        .select(`
          *,
          player_cards!inner(player_id)
        `)
        .in('game_id', gameIds);
      
      if (statsError) {
        console.error('Error loading player stats:', statsError);
        return;
      }
      
      // Build live game data map
      const gameDataMap = new Map();
      
      statsData?.forEach(stat => {
        const playerId = stat.player_cards.player_id;
        const game = displayGames.find(g => g.game_id === stat.game_id);
        
        if (game) {
          gameDataMap.set(playerId, {
            gameStatus: game.game_status,
            gameTime: game.time_remaining,
            quarter: game.quarter,
            currentPoints: stat.fantasy_points || 0,
            stats: stat.stats,
            lastUpdated: stat.last_updated,
            weekNumber: teamWeek // Add week number for validation
          });
        }
      });
      
      setLiveGameData(gameDataMap);
      console.log('🎮 [FantasyContext] Live game data loaded:', gameDataMap.size, 'players');
    } catch (err) {
      console.error('Error loading live game data:', err);
    }
  }, [currentWeek]); // Include currentWeek as dependency

  // Load inventory and lineup
  const loadInventory = useCallback(async () => {
    if (!user?.id || !activeTeam?.id) {
      console.log('⏸️ [FantasyContext] No user or active team');
      setLoading(false);
      return;
    }
    
    try {
      console.log('📦 [FantasyContext] Loading inventory for team:', activeTeam.id);
      const data = await getUserInventory(user.id, activeTeam.id);
      setInventory(data);
      
      // Build lineup from inventory
      const newLineup = createEmptyLineup();
      
      data.players.forEach(player => {
        if (player.is_in_lineup && player.lineup_position) {
          newLineup[player.lineup_position] = player;
        } else if (!player.is_in_lineup) {
          newLineup.BENCH.push(player);
        }
      });
      
      setLineup(newLineup);
      console.log('✅ [FantasyContext] Lineup loaded');
      
      // Load projections from database
      if (currentWeek) {
        const isSimulated = false; // We're in real NFL mode
        
        console.log('📊 [FantasyContext] Loading projections for week:', currentWeek.week);
        
        const { data: projectionsData, error: projError } = await supabase
          .from('weekly_projections')
          .select('*')
          .eq('week_number', currentWeek.week)
          .eq('season_year', currentWeek.year)
          .eq('is_simulated', isSimulated);
        
        if (projError) {
          console.error('Error loading projections:', projError);
        }
        
        const dbProjections = new Map();
        
        data.players.forEach(p => {
          const weeklyProj = projectionsData?.find(
            proj => proj.player_card_id === p.player_card_id
          );
          
          if (weeklyProj) {
            const seasonAvg = weeklyProj.season_average || 0;
            const gamesPlayed = weeklyProj.games_played || 0;
            
            dbProjections.set(p.player_card.player_id, {
              projected: weeklyProj.projected_points || 0,
              seasonAvg: seasonAvg,
              gamesPlayed: gamesPlayed,
              injuryStatus: p.player_card.injury_status || 'healthy',
              isFromDatabase: true
            });
          } else {
            // Fallback to baseline if no projection exists
            const baseline = getBaselineProjection(p.player_card.position);
            
            dbProjections.set(p.player_card.player_id, {
              projected: baseline,
              seasonAvg: baseline,
              gamesPlayed: 0,
              injuryStatus: p.player_card.injury_status || 'healthy',
              isFromDatabase: false
            });
          }
        });
        
        setProjections(dbProjections);
        console.log('⚡ [FantasyContext] Projections loaded:', dbProjections.size, 'players', isSimulated ? '(SIMULATED)' : '(REAL)');
      }
      
      // Load live game data
      await loadLiveGameData(data);
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading inventory:', err);
      setLoading(false);
    }
  }, [user?.id, activeTeam?.id, currentWeek?.week, currentWeek?.year]); // Use primitive values

  // Initial load
  // Initial load
  useEffect(() => {
    if (!user?.id || !activeTeam?.id) return;
    loadInventory();
  }, [user?.id, activeTeam?.id]); // Direct dependencies only

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
          console.log('🔄 [FantasyContext] Game score update:', payload);
          // Full reload on game status changes (affects multiple players)
          loadLiveGameData(inventory);
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
          filter: `player_card_id=in.(${playerCardIds.join(',')})` // Only user's players
        },
        async (payload) => {
          console.log('🔄 [FantasyContext] Player stats update (user player only):', payload);
          
          // Incremental update - get player_id from player_cards table
          if (payload.new?.player_card_id) {
            const { data: playerCard } = await supabase
              .from('player_cards')
              .select('player_id')
              .eq('id', payload.new.player_card_id)
              .single();
            
            if (playerCard) {
              // Update just this player's data
              setLiveGameData(prev => {
                const updated = new Map(prev);
                const existing = updated.get(playerCard.player_id) || {};
                updated.set(playerCard.player_id, {
                  ...existing,
                  currentPoints: payload.new.fantasy_points || 0
                });
                console.log('📊 [FantasyContext] Incremental update for player:', playerCard.player_id);
                return updated;
              });
            }
          }
        }
      )
      .subscribe();
    
    channelsRef.current.push(gamesChannel, statsChannel);
    
    // Cleanup on unmount
    return () => {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [user?.id, currentWeek?.week, currentWeek?.year, inventory?.players?.length]); // Use primitive values to prevent stale closures

  // Calculate derived lineup statistics using custom hook
  const lineupStats = useLineupStats(lineup, projections, liveGameData);

  const value = {
    lineup,
    setLineup,
    projections,
    setProjections,
    liveGameData,
    setLiveGameData,
    currentWeek,
    inventory,
    setInventory,
    loading,
    loadInventory,
    loadLiveGameData,
    // Derived stats (always up-to-date)
    lineupStats
  };

  return (
    <FantasyContext.Provider value={value}>
      {children}
    </FantasyContext.Provider>
  );
}

FantasyProvider.propTypes = {
  children: PropTypes.node.isRequired,
  user: PropTypes.object,
  activeTeam: PropTypes.object
};

export function useFantasy() {
  const context = useContext(FantasyContext);
  if (!context) {
    throw new Error('useFantasy must be used within a FantasyProvider');
  }
  return context;
}