import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { supabase, getUserInventory } from '../services/supabase';

const FantasyContext = createContext(null);

// Helper function for baseline projections
function getBaselineProjection(position) {
  const baselines = {
    'Quarterback': 18,
    'Running Back': 12,
    'Wide Receiver': 10,
    'Tight End': 8,
  };
  return baselines[position] || 8;
}

export function FantasyProvider({ children, user, activeTeam }) {
  // Lineup state - shared across all pages
  const [lineup, setLineup] = useState({
    QB: null,
    RB1: null,
    RB2: null,
    WR1: null,
    WR2: null,
    WR3: null,
    TE: null,
    FLEX: null,
    BENCH: []
  });

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
        const { data: seasonConfig } = await supabase
          .from('nfl_season_config')
          .select('current_week, season_year')
          .eq('is_active', true)
          .single();
        
        if (seasonConfig) {
          setCurrentWeek({ week: seasonConfig.current_week, year: seasonConfig.season_year });
          console.log('📅 [FantasyContext] Current week loaded immediately:', seasonConfig.current_week);
        }
      } catch (err) {
        console.error('Error loading current week:', err);
      }
    };
    
    loadCurrentWeek();
  }, []); // Run once on mount

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
        console.error('[FantasyContext] Error loading season config:', seasonError);
        return;
      }
      
      const weekNumber = seasonConfig.current_week;
      const seasonYear = seasonConfig.season_year;
      
      console.log('🎮 [FantasyContext] Using week from config:', weekNumber, 'year:', seasonYear);
      
      setCurrentWeek({ week: weekNumber, year: seasonYear });
      
      // Load games for current week
      const { data: gamesData, error: gamesError } = await supabase
        .from('game_scores')
        .select('*')
        .eq('week_number', weekNumber)
        .eq('season_year', seasonYear);
      
      if (gamesError) throw gamesError;
      
      if (!gamesData || gamesData.length === 0) {
        console.warn(`⚠️ No games found for Week ${weekNumber}, ${seasonYear}`);
        setLiveGameData(new Map());
        return;
      }
      
      // Check if any games have started for current week
      const hasGamesStarted = gamesData.some(g => g.game_status === 'live' || g.game_status === 'halftime' || g.game_status === 'final');
      
      // If no games started yet, show previous week's final stats
      let displayWeek = weekNumber;
      let displayGames = gamesData;
      
      if (!hasGamesStarted && weekNumber > 1) {
        console.log('🎮 [FantasyContext] No games started yet - loading previous week stats');
        const { data: prevGamesData, error: prevGamesError } = await supabase
          .from('game_scores')
          .select('*')
          .eq('week_number', weekNumber - 1)
          .eq('season_year', seasonYear);
        
        if (!prevGamesError && prevGamesData && prevGamesData.length > 0) {
          // Only use previous week if it has final games
          const hasFinalGames = prevGamesData.some(g => g.game_status === 'final');
          if (hasFinalGames) {
            displayWeek = weekNumber - 1;
            displayGames = prevGamesData;
            console.log(`🎮 [FantasyContext] Showing Week ${displayWeek} final stats until Week ${weekNumber} games start`);
          }
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
      }
      
      console.log('🎮 [FantasyContext] Loaded stats for', statsData?.length || 0, 'players');
      
      // Debug: Check if Darnold's stats are in the result
      const darnoldStat = statsData?.find(s => s.player_cards?.player_id === '70');
      if (darnoldStat) {
        console.log('🎮 [FantasyContext] Found Darnold in statsData:', darnoldStat);
      } else {
        console.log('🎮 [FantasyContext] Darnold NOT in statsData!');
      }
      
      // Create a map of player_id -> game data
      const gameDataMap = new Map();
      
      statsData?.forEach(stat => {
        const game = displayGames.find(g => g.game_id === stat.game_id);
        if (game && stat.player_cards) {
          const playerId = stat.player_cards.player_id;
          
          // Debug for Sam Darnold
          if (playerId === '70') {
            console.log('🎮 [FantasyContext] Found stats for Darnold (70):', {
              gameId: stat.game_id,
              fantasyPoints: stat.fantasy_points,
              gameStatus: game.game_status
            });
          }
          
          gameDataMap.set(playerId, {
            gameStatus: game.game_status,
            currentPoints: stat.fantasy_points || 0,
            quarter: game.quarter,
            timeRemaining: game.time_remaining,
            gameStartTime: game.game_start_time,
            homeTeam: game.home_team,
            awayTeam: game.away_team,
            homeScore: game.home_score,
            awayScore: game.away_score
          });
        }
      });
      
      // Add scheduled games (only for current week, not previous week)
      // Also add players whose games finished but have no stats (0 points)
      if (playersData && playersData.length > 0) {
        for (const playerCard of playersData) {
          if (gameDataMap.has(playerCard.player_card.player_id)) continue;
          
          const playerTeamAbbr = playerCard.player_card.team_abbreviation;
          const teamGame = displayGames.find(g => 
            g.home_team === playerTeamAbbr || g.away_team === playerTeamAbbr
          );
          
          // Debug for Sam Darnold
          if (playerCard.player_card.player_id === '70') {
            console.log('🎮 [FantasyContext] Processing Darnold in scheduled games loop:', {
              alreadyHasGameData: gameDataMap.has('70'),
              teamAbbr: playerTeamAbbr,
              foundGame: !!teamGame,
              gameName: teamGame ? `${teamGame.home_team} vs ${teamGame.away_team}` : 'none'
            });
          }
          
          if (teamGame) {
            const isHome = teamGame.home_team === playerTeamAbbr;
            const opponent = isHome ? teamGame.away_team : teamGame.home_team;
            
            // For games that are final/live, set currentPoints to 0 (player has no stats)
            // For scheduled games, don't set currentPoints
            const isFinalOrLive = teamGame.game_status === 'final' || teamGame.game_status === 'live' || teamGame.game_status === 'halftime';
            
            gameDataMap.set(playerCard.player_card.player_id, {
              gameStatus: teamGame.game_status,
              currentPoints: isFinalOrLive ? 0 : undefined,
              quarter: teamGame.quarter,
              timeRemaining: teamGame.time_remaining,
              gameStartTime: teamGame.game_start_time,
              homeTeam: teamGame.home_team,
              awayTeam: teamGame.away_team,
              homeScore: teamGame.home_score,
              awayScore: teamGame.away_score,
              opponent: opponent,
              isHome: isHome
            });
          }
        }
      }
      
      // Final debug for Sam Darnold
      if (gameDataMap.has('70')) {
        console.log('🎮 [FantasyContext] Final gameData for Darnold:', gameDataMap.get('70'));
      } else {
        console.log('🎮 [FantasyContext] NO gameData for Darnold in final map!');
      }
      
      setLiveGameData(gameDataMap);
      console.log('🎮 [FantasyContext] Live game data loaded:', gameDataMap.size, 'players');
    } catch (err) {
      console.error('Error loading live game data:', err);
    }
  }, []); // Removed inventory dependency - we pass it as a parameter instead

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
      
      // Load lineup from inventory
      const startingPlayers = data.players.filter(p => p.is_in_lineup);
      const bench = data.players.filter(p => !p.is_in_lineup);
      
      const newLineup = {
        QB: null,
        RB1: null,
        RB2: null,
        WR1: null,
        WR2: null,
        WR3: null,
        TE: null,
        FLEX: null,
        BENCH: bench
      };
      
      startingPlayers.forEach(player => {
        if (player.lineup_position) {
          newLineup[player.lineup_position] = player;
        }
      });
      
      setLineup(newLineup);
      
      // Load projections from database
      if (data.players && data.players.length > 0) {
        const dbProjections = new Map();
        const isSimulated = data.team?.simulated_season_id != null;
        
        data.players.forEach(p => {
          if (p.player_card) {
            let weeklyProj;
            
            // For simulated seasons, calculate weekly variance projections
            if (isSimulated && currentWeek) {
              const positionMap = {
                'Quarterback': { min: 12, max: 30 },
                'Running Back': { min: 6, max: 22 },
                'Wide Receiver': { min: 4, max: 19 },
                'Tight End': { min: 3, max: 14 }
              };
              
              const range = positionMap[p.player_card.position] || { min: 5, max: 15 };
              const baseAvg = (range.min + range.max) / 2;
              
              // Add weekly variance: ±30% based on player_id + week
              const seed = parseInt(p.player_card.player_id.replace(/-/g, '').substring(0, 8), 16);
              const weekSeed = (seed * 37 + currentWeek.week * 997) % 1000;
              const weekVariance = ((weekSeed % 200) - 100) / 333;
              
              weeklyProj = baseAvg * (1 + weekVariance);
              weeklyProj = Math.max(range.min * 0.7, Math.min(range.max * 1.3, weeklyProj));
            } else {
              // For real seasons, use database values
              const weeklyProjValue = p.player_card.weekly_projected_points != null ? parseFloat(p.player_card.weekly_projected_points) : null;
              const projValue = p.player_card.projected_points != null ? parseFloat(p.player_card.projected_points) : null;
              weeklyProj = weeklyProjValue ?? projValue ?? getBaselineProjection(p.player_card.position);
            }
            
            const seasonAvg = parseFloat(p.player_card.season_ppg) || 0;
            const gamesPlayed = parseInt(p.player_card.games_played_season) || 0;
            
            dbProjections.set(p.player_card.player_id, {
              projected: weeklyProj,
              seasonAvg: seasonAvg,
              gamesPlayed: gamesPlayed,
              injuryStatus: p.player_card.injury_status || 'healthy',
              isFromDatabase: true
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
  }, [user?.id, activeTeam?.id]); // Removed loadLiveGameData dependency to prevent infinite loop

  // Initial load
  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Subscribe to live updates
  useEffect(() => {
    if (!user || !currentWeek || !inventory?.players) return;
    
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
  }, [user, currentWeek, inventory?.players]); // Removed loadLiveGameData to prevent infinite loop

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
    loadLiveGameData
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
