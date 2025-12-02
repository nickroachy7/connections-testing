import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSupabase } from '../hooks/useSupabase';

const FantasyContext = createContext();

export const useFantasy = () => {
  const context = useContext(FantasyContext);
  if (!context) {
    throw new Error('useFantasy must be used within a FantasyProvider');
  }
  return context;
};

export const FantasyProvider = ({ children }) => {
  const { user } = useAuth();
  const { supabase } = useSupabase();
  const [activeTeam, setActiveTeam] = useState(null);
  const [lineup, setLineup] = useState([]);
  const [inventory, setInventory] = useState({ players: [], tokens: [] });
  const [projections, setProjections] = useState(new Map());
  const [liveGameData, setLiveGameData] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(null);

  // Sync inventory from external updates (like loaders)
  const syncInventory = useCallback((newInventory) => {
    console.log('🔄 [FantasyContext] Syncing inventory from loader:', newInventory?.players?.length, 'players');
    setInventory(prev => ({
      players: newInventory?.players || prev.players,
      tokens: newInventory?.tokens || prev.tokens
    }));
  }, []);

  // Load current NFL week from season config
  useEffect(() => {
    const fetchCurrentWeek = async () => {
      try {
        const { data, error } = await supabase
          .from('nfl_season_config')
          .select('*')
          .eq('is_current', true)
          .single();

        if (error) {
          console.error('Error fetching current week:', error);
          return;
        }

        setCurrentWeek(data);
      } catch (err) {
        console.error('Error in fetchCurrentWeek:', err);
      }
    };

    fetchCurrentWeek();

    // Subscribe to season config changes
    const subscription = supabase
      .channel('season_config_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nfl_season_config',
          filter: 'is_current=eq.true'
        },
        (payload) => {
          setCurrentWeek(payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Load active team for user
  useEffect(() => {
    if (!user?.id) return;

    const fetchActiveTeam = async () => {
      try {
        const { data, error } = await supabase
          .from('user_teams')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching active team:', error);
          return;
        }

        setActiveTeam(data);
      } catch (err) {
        console.error('Error in fetchActiveTeam:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveTeam();
  }, [user?.id, supabase]);

  // Load live game data with real-time updates
  const loadLiveGameData = useCallback(async () => {
    if (!activeTeam?.id || !currentWeek?.week) return;

    console.log('🎮 [FantasyContext] loadLiveGameData called');
    const teamWeek = activeTeam.current_week || currentWeek.week;
    const seasonYear = currentWeek.year;

    console.log('🎮 [FantasyContext] NFL week:', currentWeek.week, 'Team current_week:', activeTeam.current_week);
    console.log('🎮 [FantasyContext] Loading game data for team week:', teamWeek);

    try {
      // Get all player cards for this team to know which games to track
      const { data: playersData, error: playersError } = await supabase
        .from('team_player_cards')
        .select(`
          player_card:player_cards!inner(
            player_id,
            team_abbreviation
          )
        `)
        .eq('team_id', activeTeam.id);

      if (playersError) {
        console.error('Error loading team players:', playersError);
        return;
      }

      // Get all games for this week
      const { data: gamesData, error: gamesError } = await supabase
        .from('game_scores')
        .select('*')
        .eq('week', teamWeek)
        .eq('season_year', seasonYear);

      console.log('🎮 [FantasyContext] Games query result:', {
        teamWeek,
        seasonYear,
        gamesCount: gamesData?.length,
        error: gamesError
      });

      if (gamesError) {
        console.error('Error loading games:', gamesError);
        return;
      }

      if (!gamesData || gamesData.length === 0) {
        console.log('🎮 [FantasyContext] No games found for this week');
        return;
      }

      // Filter to games that involve our players' teams
      const teamAbbrs = [...new Set(playersData.map(p => p.player_card.team_abbreviation))];
      const displayGames = gamesData.filter(game =>
        teamAbbrs.includes(game.home_team) || teamAbbrs.includes(game.away_team)
      );

      if (displayGames.length === 0) {
        console.log('🎮 [FantasyContext] No games found for player teams');
        return;
      }

      const gameIds = displayGames.map(g => g.game_id);
      console.log('🎮 [FantasyContext] Loading stats for Week', teamWeek, ', game IDs:', gameIds);

      // Load player game stats for these games
      const { data: statsData, error: statsError } = await supabase
        .from('player_game_stats')
        .select(`
          player_id,
          game_id,
          fantasy_points,
          stats,
          last_updated,
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
          // Find player's team to determine if home/away
          const playerTeam = playersData?.find(p => p.player_card.player_id === playerId)?.player_card.team_abbreviation;
          const isHome = game.home_team === playerTeam;
          const opponent = isHome ? game.away_team : game.home_team;
          
          gameDataMap.set(playerId, {
            gameStatus: game.game_status,
            gameTime: game.time_remaining,
            quarter: game.quarter,
            currentPoints: stat.fantasy_points || 0,
            stats: stat.stats,
            lastUpdated: stat.last_updated,
            weekNumber: teamWeek,
            homeTeam: game.home_team,
            awayTeam: game.away_team,
            homeScore: game.home_score,
            awayScore: game.away_score,
            gameStartTime: game.game_start_time,
            opponent: opponent,
            isHome: isHome
          });
        }
      });
      
      // Also add game info for all players whose teams have games (even without stats)
      if (playersData && playersData.length > 0) {
        for (const playerCard of playersData) {
          // Skip if we already have data for this player
          if (gameDataMap.has(playerCard.player_card.player_id)) continue;
          
          const playerTeamAbbr = playerCard.player_card.team_abbreviation;
          
          // Find if this player's team has a game this week
          const teamGame = displayGames.find(g => 
            g.home_team === playerTeamAbbr || g.away_team === playerTeamAbbr
          );
          
          if (teamGame) {
            const isHome = teamGame.home_team === playerTeamAbbr;
            const opponent = isHome ? teamGame.away_team : teamGame.home_team;
            
            gameDataMap.set(playerCard.player_card.player_id, {
              gameStatus: teamGame.game_status,
              currentPoints: 0,
              quarter: teamGame.quarter,
              timeRemaining: teamGame.time_remaining,
              gameStartTime: teamGame.game_start_time,
              homeTeam: teamGame.home_team,
              awayTeam: teamGame.away_team,
              homeScore: teamGame.home_score,
              awayScore: teamGame.away_score,
              opponent: opponent,
              isHome: isHome,
              weekNumber: teamWeek
            });
          }
        }
      }
      
      setLiveGameData(gameDataMap);
      console.log('🎮 [FantasyContext] Live game data loaded:', gameDataMap.size, 'players');
    } catch (err) {
      console.error('Error loading live game data:', err);
    }
  }, [activeTeam?.current_week, supabase, activeTeam?.id, currentWeek?.week, currentWeek?.year]);

  // Load projections from player_cards
  const loadProjectionsAndGameData = useCallback(async () => {
    if (!activeTeam?.id || !currentWeek?.week) return;

    try {
      const { data, error } = await supabase
        .from('team_player_cards')
        .select(`
          player_card:player_cards!inner(
            player_id,
            weekly_projected_points
          )
        `)
        .eq('team_id', activeTeam.id);

      if (error) throw error;

      const projectionsMap = new Map();
      data?.forEach(item => {
        const weekProjection = item.player_card.weekly_projected_points?.find(
          p => p.week === currentWeek.week && p.year === currentWeek.year
        );
        if (weekProjection) {
          projectionsMap.set(item.player_card.player_id, weekProjection.projected_points);
        }
      });

      setProjections(projectionsMap);
      console.log('📊 [FantasyContext] Projections loaded from player_cards:', projectionsMap.size, 'players');

      // Load live game data after projections
      loadLiveGameData();
    } catch (err) {
      console.error('Error loading projections:', err);
    }
  }, [currentWeek?.week, currentWeek?.year, activeTeam?.id, supabase, loadLiveGameData]);

  // Load inventory (player cards and tokens)
  const loadInventory = useCallback(async () => {
    if (!activeTeam?.id) return;

    try {
      const { data: playerData, error: playerError } = await supabase
        .from('team_player_cards')
        .select(`
          player_card:player_cards!inner(*)
        `)
        .eq('team_id', activeTeam.id);

      if (playerError) throw playerError;

      const { data: tokenData, error: tokenError } = await supabase
        .from('team_tokens')
        .select('*')
        .eq('team_id', activeTeam.id);

      if (tokenError) throw tokenError;

      const newInventory = {
        players: playerData?.map(item => item.player_card) || [],
        tokens: tokenData || []
      };

      setInventory(newInventory);
    } catch (err) {
      console.error('Error loading inventory:', err);
    }
  }, [activeTeam?.id, supabase]);

  // Main effect: Rebuild lineup when inventory/week changes
  useEffect(() => {
    if (!activeTeam?.id || !currentWeek?.week || !inventory?.players?.length) return;

    const rebuildLineup = async () => {
      try {
        const { data, error } = await supabase
          .from('weekly_lineups')
          .select('lineup_data')
          .eq('team_id', activeTeam.id)
          .eq('week', activeTeam.current_week || currentWeek.week)
          .eq('season_year', currentWeek.year)
          .maybeSingle();

        if (error) throw error;

        if (data?.lineup_data) {
          setLineup(data.lineup_data);
        }
      } catch (err) {
        console.error('Error rebuilding lineup:', err);
      }
    };

    rebuildLineup();
    loadInventory();
    loadProjectionsAndGameData();
  }, [activeTeam?.id, activeTeam?.current_week, currentWeek?.week, currentWeek?.year, inventory?.players?.length, supabase, loadInventory, loadProjectionsAndGameData]);

  // Subscribe to real-time game updates
  useEffect(() => {
    if (!activeTeam?.id || !currentWeek?.week) return;

    const teamWeek = activeTeam.current_week || currentWeek.week;

    // Subscribe to game_scores changes
    const gamesChannel = supabase
      .channel('game_scores_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_scores',
          filter: `week=eq.${teamWeek}`
        },
        () => {
          loadLiveGameData();
        }
      )
      .subscribe();

    // Subscribe to player_game_stats changes
    const statsChannel = supabase
      .channel('player_stats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_game_stats'
        },
        () => {
          loadLiveGameData();
        }
      )
      .subscribe();

    return () => {
      gamesChannel.unsubscribe();
      statsChannel.unsubscribe();
    };
  }, [activeTeam?.id, activeTeam?.current_week, currentWeek?.week, supabase, loadLiveGameData]);

  const value = {
    activeTeam,
    setActiveTeam,
    lineup,
    setLineup,
    inventory,
    setInventory,
    syncInventory,
    projections,
    liveGameData,
    loading,
    currentWeek,
    loadInventory,
    loadLiveGameData
  };

  return (
    <FantasyContext.Provider value={value}>
      {children}
    </FantasyContext.Provider>
  );
};
