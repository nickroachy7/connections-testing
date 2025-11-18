import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useRevalidator, useOutletContext } from 'react-router-dom';
import { getUserInventory, quickSellCard, supabase } from '../services/supabase';
import { calculateBatchProjections, getInstantBaselineProjections } from '../utils/projections';
import { shouldBlockLineupChanges, shouldBlockTokenActions, getRosterLimitErrorMessage } from '../utils/rosterLimits';
import PlayerCard from '../components/PlayerCard';
import LineupGrid from '../components/LineupGrid';
import BenchAndTokensPanel from '../components/BenchAndTokensPanel';
import PlayerSelectionModal from '../components/PlayerSelectionModal';
import RosterLimitBanner from '../components/RosterLimitBanner';
import RosterCount from '../components/RosterCount';
import ContestInfoBanner from '../components/ContestInfoBanner';

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

export default function TeamManager() {
  const { user, profile, teams, activeTeam: initialActiveTeam, inventory: initialInventory } = useOutletContext();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  
  // Team & Inventory state  
  const [activeTeam, setActiveTeam] = useState(initialActiveTeam);
  const [inventory, setInventory] = useState(initialInventory);

  // Handle case where user is null (loader error or not logged in)
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);
  
  // Lineup state
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
  
  // Filters state
  const [filters, setFilters] = useState({
    position: 'all',
    rarity: 'all',
    tokenType: 'all',
    search: ''
  });
  
  // Comparison state
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState([]);
  
  // Bulk actions state
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedForBulkAction, setSelectedForBulkAction] = useState([]);
  
  // UI state
  const [draggedPlayer, setDraggedPlayer] = useState(null);
  const [draggedToken, setDraggedToken] = useState(null);
  const [selling, setSelling] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  
  // Auto-save refs
  const autoSaveTimeoutRef = useRef(null);
  const initialLoadRef = useRef(true);
  
  // Player selection modal state
  const [playerSelectionModal, setPlayerSelectionModal] = useState({
    isOpen: false,
    position: null
  });
  
  // Bench filter state for slot selection
  const [benchFilterPosition, setBenchFilterPosition] = useState(null);
  
  // Projections state
  const [projections, setProjections] = useState(new Map());
  const [loadingProjections, setLoadingProjections] = useState(false);
  
  // Live game data state
  const [liveGameData, setLiveGameData] = useState(new Map());
  const [currentWeek, setCurrentWeek] = useState(null);
  const [syncingGames, setSyncingGames] = useState(false);

  // Function to manually sync games
  const syncGamesFromAPI = async () => {
    setSyncingGames(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-live-stats');
      
      if (error) {
        console.error('Error syncing games:', error);
        alert('Failed to sync games: ' + error.message);
      } else {
        console.log('Games synced successfully:', data);
        alert('Games synced! Reloading...');
        // Reload the live game data
        await loadLiveGameData();
      }
    } catch (err) {
      console.error('Error calling sync function:', err);
      alert('Failed to sync games');
    } finally {
      setSyncingGames(false);
    }
  };

  // Load live game data - NO LONGER depends on inventory in useEffect
  const loadLiveGameData = useCallback(async (inventoryData = null) => {
    console.log('🎮 loadLiveGameData called!');
    try {
      // Use passed inventory data or fall back to state
      const playersData = inventoryData?.players || inventory?.players;
      console.log('Players data available:', playersData?.length || 0);
      
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
      
      console.log('🎮 Using week from config:', weekNumber, 'year:', seasonYear);
      
      setCurrentWeek({ week: weekNumber, year: seasonYear });
      
      // Load games for current week
      const { data: gamesData, error: gamesError } = await supabase
        .from('game_scores')
        .select('*')
        .eq('week_number', weekNumber)
        .eq('season_year', seasonYear);
      
      console.log('Games query result:', { weekNumber, seasonYear, gamesCount: gamesData?.length, error: gamesError });
      
      if (gamesError) throw gamesError;
      
      // If no games found, log a warning
      if (!gamesData || gamesData.length === 0) {
        console.warn(`⚠️ No games found in database for Week ${weekNumber}, ${seasonYear}`);
        console.warn('💡 You need to populate the game_scores table with NFL game data');
        setLiveGameData(new Map());
        return;
      }
      
      // Load player stats for current week
      if (gamesData && gamesData.length > 0) {
        const gameIds = gamesData.map(g => g.game_id);
        
        // Join player_game_stats with player_cards to get player_id
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
        
        console.log('📊 Loaded stats for', statsData?.length || 0, 'player records');
        
        // Debug: Check if Darnold's stats are in the result
        const darnoldStat = statsData?.find(s => s.player_cards?.player_id === '70');
        if (darnoldStat) {
          console.log('🎮 DARNOLD FOUND in statsData:', darnoldStat);
        } else {
          console.log('🎮 DARNOLD NOT FOUND in statsData!');
          console.log('🎮 All player IDs in statsData:', statsData?.map(s => s.player_cards?.player_id).filter(Boolean));
        }
        
        // Create a map of player_id -> game data for players with stats
        const gameDataMap = new Map();
        
        statsData?.forEach(stat => {
          const game = gamesData.find(g => g.game_id === stat.game_id);
          if (game && stat.player_cards) {
            const playerId = stat.player_cards.player_id;
            
            if (playerId === '70') {
              console.log(`🎮 DARNOLD: Adding to gameDataMap with ${stat.fantasy_points} points, status: ${game.game_status}`);
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
        
        // Also check for scheduled games and add player entries for those
        // We need to get players from inventory and match them to teams in scheduled games
        if (playersData && playersData.length > 0) {
          console.log('Processing', playersData.length, 'players for game matching');
          console.log('Available games this week:', gamesData.length);
          
          for (const playerCard of playersData) {
            // Skip if we already have data for this player
            if (gameDataMap.has(playerCard.player_card.player_id)) continue;
            
            const playerTeamAbbr = playerCard.player_card.team_abbreviation;
            
            // Find if this player's team has a game this week
            const teamGame = gamesData.find(g => 
              g.home_team === playerTeamAbbr || g.away_team === playerTeamAbbr
            );
            
            if (teamGame) {
              const isHome = teamGame.home_team === playerTeamAbbr;
              const opponent = isHome ? teamGame.away_team : teamGame.home_team;
              
              console.log(`Found game for ${playerCard.player_card.player_name} (${playerTeamAbbr}): ${isHome ? 'vs' : '@'} ${opponent}, status: ${teamGame.game_status}`);
              
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
                isHome: isHome
              });
            }
          }
        }
        
        setLiveGameData(gameDataMap);
        console.log('Live game data loaded:', gameDataMap.size, 'players with game data');
        
        // Debug: Check if Darnold is in final map
        if (gameDataMap.has('70')) {
          console.log('🎮 DARNOLD FINAL: In gameDataMap with data:', gameDataMap.get('70'));
        } else {
          console.log('🎮 DARNOLD FINAL: NOT in gameDataMap!');
        }
      }
    } catch (err) {
      console.error('Error loading live game data:', err);
    }
  }, []); // Remove inventory from dependencies!

  // Load inventory when active team changes
  const loadInventory = useCallback(async () => {
    if (!activeTeam) return;
    
    try {
      setError('');
      const data = await getUserInventory(user?.id, activeTeam.id);
      setInventory(data);
      
      // Load lineup from inventory FIRST - before projections
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
      
      // Reset initial load flag when loading inventory manually
      initialLoadRef.current = true;
      
      // Calculate projections for all players - USE DATABASE PROJECTIONS
      if (data.players && data.players.length > 0) {
        // Create projections Map directly from database values (instant!)
        const dbProjections = new Map();
        data.players.forEach(p => {
          if (p.player_card) {
            // Parse numeric values from database (they come as strings)
            // Use explicit null checks to preserve 0 values
            const weeklyProjValue = p.player_card.weekly_projected_points != null ? parseFloat(p.player_card.weekly_projected_points) : null;
            const projValue = p.player_card.projected_points != null ? parseFloat(p.player_card.projected_points) : null;
            const weeklyProj = weeklyProjValue ?? projValue ?? getBaselineProjection(p.player_card.position);
            const seasonAvg = parseFloat(p.player_card.season_ppg) || 0;
            const gamesPlayed = parseInt(p.player_card.games_played_season) || 0;
            
            dbProjections.set(p.player_card.player_id, {
              projected: weeklyProj,
              seasonAvg: seasonAvg,
              gamesPlayed: gamesPlayed,
              injuryStatus: p.player_card.injury_status || 'healthy',
              isFromDatabase: true
            });
            
            console.log(`Player ${p.player_card.player_id}: DB value = "${p.player_card.weekly_projected_points}", Parsed = ${weeklyProj}`);
          }
        });
        
        setProjections(dbProjections);
        console.log('⚡ INSTANT projections loaded from database for', dbProjections.size, 'players');
      }
      
      // Load live game data after inventory is loaded
      // Pass the inventory data directly so it's available immediately
      await loadLiveGameData(data);
      
    } catch (err) {
      console.error('Error loading inventory:', err);
      setError('Failed to load inventory');
      setLoadingProjections(false);
    }
  }, [user?.id, activeTeam, loadLiveGameData]);

  // Initial data load from loader - only load live game data
  useEffect(() => {
    if (initialInventory && initialInventory.players.length > 0) {
      // Load lineup from initial inventory
      const startingPlayers = initialInventory.players.filter(p => p.is_in_lineup);
      const bench = initialInventory.players.filter(p => !p.is_in_lineup);
      
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
      
      // Load projections from database (instant!)
      const dbProjections = new Map();
      initialInventory.players.forEach(p => {
        if (p.player_card) {
          // Parse numeric values from database (they come as strings)
          // Use explicit null checks to preserve 0 values
          const weeklyProjValue = p.player_card.weekly_projected_points != null ? parseFloat(p.player_card.weekly_projected_points) : null;
          const projValue = p.player_card.projected_points != null ? parseFloat(p.player_card.projected_points) : null;
          const weeklyProj = weeklyProjValue ?? projValue ?? getBaselineProjection(p.player_card.position);
          const seasonAvg = parseFloat(p.player_card.season_ppg) || 0;
          const gamesPlayed = parseInt(p.player_card.games_played_season) || 0;
          
          dbProjections.set(p.player_card.player_id, {
            projected: weeklyProj,
            seasonAvg: seasonAvg,
            gamesPlayed: gamesPlayed,
            injuryStatus: p.player_card.injury_status || 'healthy',
            isFromDatabase: true
          });
          
          console.log(`Initial Load - Player ${p.player_card.player_id}: DB value = "${p.player_card.weekly_projected_points}", Parsed = ${weeklyProj}`);
        }
      });
      
      setProjections(dbProjections);
      console.log('⚡ INSTANT initial projections loaded from database for', dbProjections.size, 'players');
      
      // Load live game data only once on mount
      loadLiveGameData(initialInventory);
    }
  }, []); // Only run once on mount

  // REMOVED: useEffect for auth redirect - handled by loader
  // REMOVED: useEffect for loading teams - handled by loader
  // REMOVED: useEffect for loading inventory on activeTeam change - now manual

  // Subscribe to live game updates - ONLY if we have a current week
  useEffect(() => {
    if (!user || !currentWeek) return;
    
    // Subscribe to game_scores changes
    const gamesChannel = supabase
      .channel('team-manager-games')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_scores',
          filter: `week_number=eq.${currentWeek.week}`
        },
        (payload) => {
          console.log('Game score update in TeamManager:', payload);
          loadLiveGameData(inventory);
        }
      )
      .subscribe();
    
    // Subscribe to player stats changes
    const statsChannel = supabase
      .channel('team-manager-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_game_stats'
        },
        (payload) => {
          console.log('Player stats update in TeamManager:', payload);
          loadLiveGameData(inventory);
        }
      )
      .subscribe();
    
    // Auto-refresh every 30 seconds - pass current inventory
    const interval = setInterval(() => {
      console.log('⏰ [TeamManager] Auto-refresh interval triggered');
      loadLiveGameData(inventory);
    }, 30000);
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(gamesChannel);
      supabase.removeChannel(statsChannel);
    };
  }, [user, currentWeek]); // Removed loadLiveGameData from dependencies

  // Drag and Drop Handlers for Players
  const handlePlayerDragStart = (e, player, source) => {
    setDraggedPlayer({ player, source });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `player:${player.id}`);
  };



  const handlePlayerDrop = async (e, targetSlot) => {
    console.log('🎯 === PLAYER DROP START ===', { targetSlot, draggedPlayer });
    e.preventDefault();
    
    if (!draggedPlayer) {
      console.log('❌ No dragged player');
      return;
    }
    
    const { player, source } = draggedPlayer;
    
    // Check if player's game is live (even if not locked in DB yet)
    const isPlayerGameLive = () => {
      const gameData = liveGameData?.get(player.player_card.player_id);
      if (!gameData) return false;
      const status = gameData.gameStatus?.toLowerCase();
      return status === 'live' || status === 'halftime';
    };
    
    // Block locked players OR players with live games from being added to lineup
    if ((player.is_locked || isPlayerGameLive()) && targetSlot !== 'BENCH') {
      console.log('❌ Cannot add locked player to lineup:', player.player_card.player_name);
      setError(`${player.player_card.player_name} is locked and cannot be added to lineup (game in progress)`);
      setTimeout(() => setError(''), 3000);
      setDraggedPlayer(null);
      return;
    }
    
    // Check roster limit
    if (shouldBlockLineupChanges(inventory)) {
      setError(getRosterLimitErrorMessage());
      setTimeout(() => setError(''), 5000);
      setDraggedPlayer(null);
      return;
    }
    
    console.log('👤 Processing player:', player.player_card.player_name, 'from', source, 'to', targetSlot);
    
    // Map full position names to abbreviations
    const positionMap = {
      'Quarterback': 'QB',
      'Running Back': 'RB',
      'Wide Receiver': 'WR',
      'Tight End': 'TE',
      'Kicker': 'K',
      'Defense': 'DEF'
    };
    
    const playerPosAbbr = positionMap[player.player_card.position] || player.player_card.position;
    const targetPlayer = lineup[targetSlot];
    
    // Check if this is a swap between two lineup positions
    const isSwap = targetPlayer && targetSlot !== 'BENCH' && source !== 'BENCH' && source !== 'INVENTORY';
    
    if (isSwap) {
      // Get target player's position
      const targetPlayerPosAbbr = positionMap[targetPlayer.player_card.position] || targetPlayer.player_card.position;
      
      // Get source slot abbreviation (remove numbers)
      const sourceSlotAbbr = source.replace(/[0-9]/g, '');
      const targetSlotAbbr = targetSlot.replace(/[0-9]/g, '');
      
      // Check if the dragged player can go in the target slot
      const draggedPlayerFitsTarget = 
        targetSlot === 'FLEX' ? ['RB', 'WR', 'TE'].includes(playerPosAbbr) : targetSlot.startsWith(playerPosAbbr);
      
      // Check if the target player can go in the source slot
      const targetPlayerFitsSource = 
        source === 'FLEX' ? ['RB', 'WR', 'TE'].includes(targetPlayerPosAbbr) : source.startsWith(targetPlayerPosAbbr);
      
      // Can swap if both players fit in each other's slots
      const canSwap = draggedPlayerFitsTarget && targetPlayerFitsSource;
      
      if (canSwap) {
        console.log('🔄 Swapping players with tokens intact:', {
          player: player.player_card.player_name,
          playerPos: playerPosAbbr,
          fromSlot: source,
          toSlot: targetSlot,
          targetPlayer: targetPlayer.player_card.player_name,
          targetPos: targetPlayerPosAbbr
        });
        
        const newLineup = { ...lineup };
        
        // Simple swap - tokens stay with their players
        newLineup[source] = targetPlayer;
        newLineup[targetSlot] = player;
        
        setLineup(newLineup);
        setDraggedPlayer(null);
        setError('');
        return;
      } else {
        // Can't swap - show error message
        setError(`Cannot swap: ${targetPlayer.player_card.player_name} (${targetPlayer.player_card.position}) doesn't fit in ${source} slot`);
        setTimeout(() => setError(''), 3000);
        setDraggedPlayer(null);
        return;
      }
    }
    
    // Validate position (FLEX can accept RB, WR, TE)
    const isValidPosition = 
      targetSlot === 'BENCH' ||
      (targetSlot === 'FLEX' && ['RB', 'WR', 'TE'].includes(playerPosAbbr)) ||
      (targetSlot.startsWith(playerPosAbbr));
    
    if (!isValidPosition) {
      setError(`Cannot place ${player.player_card.position} in ${targetSlot} slot`);
      setTimeout(() => setError(''), 3000);
      setDraggedPlayer(null);
      return;
    }
    
    const newLineup = { ...lineup };
    
    // Handle token removal for players being moved to bench or swapped out
    const handleTokenRemoval = async (playerToCheck) => {
      const appliedToken = inventory?.tokens?.find(t => t.applied_to_player_id === playerToCheck.id && t.is_active);
      if (appliedToken) {
        try {
          await supabase
            .from('user_token_inventory')
            .update({ applied_to_player_id: null, is_active: false })
            .eq('id', appliedToken.id);
          
          // Update token inventory locally
          setInventory(prev => ({
            ...prev,
            tokens: prev.tokens.map(token => 
              token.id === appliedToken.id 
                ? { ...token, applied_to_player_id: null, is_active: false }
                : token
            )
          }));
        } catch (err) {
          console.error('Error removing token from player:', err);
          throw err;
        }
      }
    };
    
    try {
      // Remove player from source and handle token removal
      if (source === 'BENCH') {
        newLineup.BENCH = [...newLineup.BENCH.filter(p => p.id !== player.id)];
      } else if (source === 'INVENTORY') {
        // Player is coming from inventory (not in lineup yet)
        // Remove from bench if exists there
        newLineup.BENCH = [...newLineup.BENCH.filter(p => p.id !== player.id)];
      } else {
        // Player is being moved from a lineup slot - remove token if moving to bench
        if (targetSlot === 'BENCH') {
          await handleTokenRemoval(player);
        }
        newLineup[source] = null;
      }
      
      // If target slot is occupied, swap to bench and remove token from swapped player
      if (newLineup[targetSlot] && targetSlot !== 'BENCH') {
        await handleTokenRemoval(newLineup[targetSlot]);
        newLineup.BENCH = [...newLineup.BENCH, newLineup[targetSlot]];
      }
      
      // Place player in target
      if (targetSlot === 'BENCH') {
        newLineup.BENCH = [...newLineup.BENCH, player];
      } else {
        newLineup[targetSlot] = player;
        // Clear filter if player was dropped into a filtered position
        if (benchFilterPosition && targetSlot === benchFilterPosition) {
          setBenchFilterPosition(null);
        }
      }
      
      setLineup(newLineup);
      setDraggedPlayer(null);
      setError('');
      
    } catch (err) {
      console.error('Error during player drop:', err);
      setError('Failed to move player - token removal failed');
      setTimeout(() => setError(''), 3000);
      setDraggedPlayer(null);
    }
  };

  // Drag and Drop Handlers for Tokens
  const handleTokenDragStart = (e, token) => {
    console.log('🎯 Token drag started:', token.token_card.token_name, 'ID:', token.id);
    setDraggedToken(token);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', `token:${token.id}`);
    console.log('🎯 Token data set:', `token:${token.id}`);
    
    // Also store in window for debugging
    window.currentDraggedToken = token;
  };

  const handleTokenDrop = async (e, player) => {
    console.log('🎯 Token drop attempt on player:', player?.player_card?.player_name);
    console.log('🎯 Dragged token (state):', draggedToken?.token_card?.token_name);
    console.log('🎯 Dragged token (window):', window.currentDraggedToken?.token_card?.token_name);
    console.log('🎯 Player locked:', player?.is_locked);
    
    e.preventDefault();
    e.stopPropagation();
    
    const tokenToUse = draggedToken || window.currentDraggedToken;
    
    if (!tokenToUse || !player || player.is_locked) {
      console.log('❌ Token drop blocked:', { tokenToUse: !!tokenToUse, player: !!player, isLocked: player?.is_locked });
      return;
    }
    
    // Check roster limit
    if (shouldBlockTokenActions(inventory)) {
      setError(getRosterLimitErrorMessage());
      setTimeout(() => setError(''), 5000);
      setDraggedToken(null);
      window.currentDraggedToken = null;
      return;
    }
    
    try {
      await supabase
        .from('user_token_inventory')
        .update({
          applied_to_player_id: player.id,
          is_active: true
        })
        .eq('id', tokenToUse.id);
      
      // Update token inventory locally instead of calling loadInventory
      setInventory(prev => ({
        ...prev,
        tokens: prev.tokens.map(token => 
          token.id === tokenToUse.id 
            ? { ...token, applied_to_player_id: player.id, is_active: true }
            : token
        )
      }));
      
      setDraggedToken(null);
      window.currentDraggedToken = null;
      
      // Trigger auto-save after token application
      triggerAutoSave();
    } catch (err) {
      console.error('Error applying token:', err);
      setError('Failed to apply token');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Save lineup
  const handleSaveLineup = async (isAutoSave = false) => {
    if (!activeTeam) return;
    
    if (isAutoSave) {
      setAutoSaving(true);
    } else {
      setSaving(true);
    }
    setError('');
    
    try {
      const updates = [];
      
      // Update starting lineup
      Object.entries(lineup).forEach(([position, player]) => {
        if (player && position !== 'BENCH') {
          updates.push({
            id: player.id,
            is_in_lineup: true,
            lineup_position: position
          });
        }
      });
      
      // Update bench
      lineup.BENCH.forEach(player => {
        updates.push({
          id: player.id,
          is_in_lineup: false,
          lineup_position: null
        });
      });
      
      // Batch update
      for (const update of updates) {
        await supabase
          .from('user_player_inventory')
          .update({
            is_in_lineup: update.is_in_lineup,
            lineup_position: update.lineup_position
          })
          .eq('id', update.id);
      }
    } catch (err) {
      console.error('Error saving lineup:', err);
      if (!isAutoSave) {
        setError(err.message || 'Failed to save lineup');
      }
    } finally {
      if (isAutoSave) {
        setAutoSaving(false);
      } else {
        setSaving(false);
      }
    }
  };

  // Debounced auto-save function
  const triggerAutoSave = useCallback(() => {
    if (!activeTeam) return;
    
    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set new timeout to save after 1 second of no changes
    autoSaveTimeoutRef.current = setTimeout(() => {
      handleSaveLineup(true);
    }, 1000);
  }, [activeTeam, lineup]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save whenever lineup changes (after initial load)
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    
    if (activeTeam) {
      triggerAutoSave();
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [lineup, triggerAutoSave, activeTeam]);

  // Quick sell handler
  const handleQuickSell = async (inventoryId, cardType, baseValue) => {
    if (!window.confirm(`Are you sure you want to sell this card for ${baseValue} coins?`)) {
      return;
    }

    setSelling(prev => ({ ...prev, [inventoryId]: true }));
    setError('');

    try {
      const result = await quickSellCard(inventoryId, cardType);
      
      await loadInventory();
    } catch (err) {
      console.error('Error selling card:', err);
      setError(err.message || 'Failed to sell card');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSelling(prev => ({ ...prev, [inventoryId]: false }));
    }
  };

  // Remove token from player
  const handleRemoveToken = async (tokenId) => {
    try {
      await supabase
        .from('user_token_inventory')
        .update({ applied_to_player_id: null, is_active: false })
        .eq('id', tokenId);
      
      // Update token inventory locally instead of calling loadInventory
      setInventory(prev => ({
        ...prev,
        tokens: prev.tokens.map(token => 
          token.id === tokenId 
            ? { ...token, applied_to_player_id: null, is_active: false }
            : token
        )
      }));
    } catch (err) {
      console.error('Error removing token:', err);
      setError('Failed to remove token');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Handle click-to-add player - now filters bench instead of opening modal
  const handleClickToAdd = (position) => {
    setBenchFilterPosition(position);
    // Scroll to bench section smoothly with centered positioning
    setTimeout(() => {
      const benchSection = document.querySelector('[data-bench-section]');
      if (benchSection) {
        benchSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100); // Small delay to ensure state updates first
  };

  // Handle moving a player from bench to a specific slot
  const handleMoveToSlot = async (player, targetPosition) => {
    if (!targetPosition) return;
    
    // Check if player's game is live (even if not locked in DB yet)
    const gameData = liveGameData?.get(player.player_card.player_id);
    const isGameLive = gameData && (gameData.gameStatus?.toLowerCase() === 'live' || gameData.gameStatus?.toLowerCase() === 'halftime');
    
    // Block locked players OR players with live games from being added to lineup
    if (player.is_locked || isGameLive) {
      setError(`${player.player_card.player_name} is locked and cannot be added to lineup (game in progress)`);
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    // Check roster limit
    if (shouldBlockLineupChanges(inventory)) {
      setError(getRosterLimitErrorMessage());
      setTimeout(() => setError(''), 5000);
      return;
    }
    
    const newLineup = { ...lineup };
    
    // Remove player from bench
    newLineup.BENCH = newLineup.BENCH.filter(p => p.id !== player.id);
    
    // If target slot is occupied, swap to bench and remove token from swapped player
    if (newLineup[targetPosition]) {
      const swappedPlayer = newLineup[targetPosition];
      const appliedToken = inventory?.tokens?.find(t => t.applied_to_player_id === swappedPlayer.id && t.is_active);
      
      if (appliedToken) {
        try {
          await supabase
            .from('user_token_inventory')
            .update({ applied_to_player_id: null, is_active: false })
            .eq('id', appliedToken.id);
          
          // Update token inventory locally
          setInventory(prev => ({
            ...prev,
            tokens: prev.tokens.map(token => 
              token.id === appliedToken.id 
                ? { ...token, applied_to_player_id: null, is_active: false }
                : token
            )
          }));
        } catch (err) {
          console.error('Error removing token from swapped player:', err);
          setError('Failed to remove token from player');
          setTimeout(() => setError(''), 3000);
          return;
        }
      }
      
      newLineup.BENCH = [...newLineup.BENCH, swappedPlayer];
    }
    
    // Place player in target position
    newLineup[targetPosition] = player;
    
    setLineup(newLineup);
    setBenchFilterPosition(null); // Clear the filter after moving
  };

  // Handle player selection from modal
  const handleSelectPlayer = (player) => {
    const position = playerSelectionModal.position;
    
    if (!position) return;
    
    // Check if player's game is live (even if not locked in DB yet)
    const gameData = liveGameData?.get(player.player_card.player_id);
    const isGameLive = gameData && (gameData.gameStatus?.toLowerCase() === 'live' || gameData.gameStatus?.toLowerCase() === 'halftime');
    
    // Block locked players OR players with live games from being added to lineup
    if (player.is_locked || isGameLive) {
      setError(`${player.player_card.player_name} is locked and cannot be added to lineup (game in progress)`);
      setTimeout(() => setError(''), 3000);
      setPlayerSelectionModal({ isOpen: false, position: null });
      return;
    }
    
    // Check roster limit
    if (shouldBlockLineupChanges(inventory)) {
      setError(getRosterLimitErrorMessage());
      setTimeout(() => setError(''), 5000);
      setPlayerSelectionModal({ isOpen: false, position: null });
      return;
    }
    
    const newLineup = { ...lineup };
    
    // Remove player from bench if exists there
    newLineup.BENCH = newLineup.BENCH.filter(p => p.id !== player.id);
    
    // If target slot is occupied, swap to bench
    if (newLineup[position] && position !== 'BENCH') {
      newLineup.BENCH = [...newLineup.BENCH, newLineup[position]];
    }
    
    // Place player in target position
    if (position === 'BENCH') {
      newLineup.BENCH = [...newLineup.BENCH, player];
    } else {
      newLineup[position] = player;
    }
    
    setLineup(newLineup);
    setPlayerSelectionModal({ isOpen: false, position: null });
  };

  // Handle remove player from lineup slot
  const handleRemovePlayer = async (position) => {
    const player = lineup[position];
    if (!player) return;
    
    // Check if player has an applied token and remove it
    const appliedToken = inventory?.tokens?.find(t => t.applied_to_player_id === player.id && t.is_active);
    if (appliedToken) {
      try {
        await supabase
          .from('user_token_inventory')
          .update({ applied_to_player_id: null, is_active: false })
          .eq('id', appliedToken.id);
        
        // Update token inventory locally instead of calling loadInventory
        setInventory(prev => ({
          ...prev,
          tokens: prev.tokens.map(token => 
            token.id === appliedToken.id 
              ? { ...token, applied_to_player_id: null, is_active: false }
              : token
          )
        }));
      } catch (err) {
        console.error('Error removing token from player:', err);
        setError('Failed to remove token from player');
        setTimeout(() => setError(''), 3000);
        return; // Don't remove player if token removal fails
      }
    }
    
    const newLineup = { ...lineup };
    newLineup[position] = null;
    newLineup.BENCH = [...newLineup.BENCH, player];
    
    setLineup(newLineup);
  };

  // Get available players for a position
  const getAvailablePlayersForPosition = (position) => {
    if (!inventory?.players) return [];
    
    // Map position to allowed player positions
    const positionMap = {
      'QB': ['Quarterback'],
      'RB1': ['Running Back'],
      'RB2': ['Running Back'],
      'WR1': ['Wide Receiver'],
      'WR2': ['Wide Receiver'],
      'WR3': ['Wide Receiver'],
      'TE': ['Tight End'],
      'FLEX': ['Running Back', 'Wide Receiver', 'Tight End']
    };
    
    const allowedPositions = positionMap[position] || [];
    
    return inventory.players.filter(player => {
      // Exclude players already in lineup
      if (player.is_in_lineup) return false;
      
      // Exclude locked players (game in progress)
      if (player.is_locked) return false;
      
      // Exclude players whose games are live (even if not locked in DB yet)
      const gameData = liveGameData?.get(player.player_card.player_id);
      if (gameData) {
        const status = gameData.gameStatus?.toLowerCase();
        if (status === 'live' || status === 'halftime') return false;
      }
      
      // Check if player's position is allowed
      return allowedPositions.includes(player.player_card.position);
    });
  };

  // Comparison mode handlers
  const toggleComparison = (player) => {
    if (selectedForComparison.find(p => p.id === player.id)) {
      setSelectedForComparison(selectedForComparison.filter(p => p.id !== player.id));
    } else if (selectedForComparison.length < 3) {
      setSelectedForComparison([...selectedForComparison, player]);
    } else {
      setError('Maximum 3 cards for comparison');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Bulk action handlers
  const toggleBulkSelect = (player) => {
    if (selectedForBulkAction.find(p => p.id === player.id)) {
      setSelectedForBulkAction(selectedForBulkAction.filter(p => p.id !== player.id));
    } else {
      setSelectedForBulkAction([...selectedForBulkAction, player]);
    }
  };

  const handleBulkQuickSell = async () => {
    const totalValue = selectedForBulkAction.reduce((sum, p) => sum + p.player_card.base_value, 0);
    
    if (!window.confirm(`Sell ${selectedForBulkAction.length} cards for ${totalValue} coins total?`)) {
      return;
    }

    setSelling(prev => ({ ...prev, bulk: true }));
    setError('');

    try {
      let totalCoins = 0;
      
      for (const player of selectedForBulkAction) {
        const result = await quickSellCard(player.id, 'player', player.player_card.base_value);
        totalCoins += result.coins_earned;
      }
      
      setSelectedForBulkAction([]);
      setBulkSelectMode(false);
      await loadInventory();
    } catch (err) {
      console.error('Error bulk selling:', err);
      setError(err.message || 'Failed to sell cards');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSelling(prev => ({ ...prev, bulk: false }));
    }
  };

  // Filter players
  const filteredPlayers = inventory.players.filter(player => {
    const matchesPosition = filters.position === 'all' || player.player_card.position === filters.position;
    const matchesSearch = filters.search === '' || 
      player.player_card.player_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      player.player_card.team_abbreviation.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesPosition && matchesSearch;
  });

  // Filter tokens
  const filteredTokens = inventory.tokens.filter(token => {
    const matchesType = filters.tokenType === 'all' || token.token_card.token_type === filters.tokenType;
    const matchesSearch = filters.search === '' || 
      token.token_card.token_name.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesType && matchesSearch;
  });

  // Get available (unapplied) tokens
  const availableTokens = inventory.tokens?.filter(t => !t.is_active) || [];

  // Utility functions
  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'legendary': return 'bg-yellow-600 text-yellow-100 border-yellow-500';
      case 'epic': return 'bg-purple-600 text-purple-100 border-purple-500';
      case 'rare': return 'bg-blue-600 text-blue-100 border-blue-500';
      default: return 'bg-gray-600 text-gray-100 border-gray-500';
    }
  };

  const getRarityGlow = (rarity) => {
    switch (rarity) {
      case 'legendary': return 'shadow-glow-yellow';
      case 'epic': return 'shadow-glow-purple';
      case 'rare': return 'shadow-glow-blue';
      default: return '';
    }
  };

  const getGameStatusBadge = (playerId) => {
    const gameData = liveGameData.get(playerId);
    if (!gameData) return null;
    
    const { gameStatus, currentPoints, quarter, timeRemaining, gameStartTime, homeTeam, awayTeam, opponent, isHome } = gameData;
    
    switch (gameStatus) {
      case 'live':
        return (
          <div className="flex items-center gap-1 text-xs">
            <span className="px-2 py-0.5 bg-green-600 text-green-100 rounded-full font-semibold">
              🔴 LIVE
            </span>
            <span className="text-primary-green-400 font-bold">{currentPoints.toFixed(1)} pts</span>
          </div>
        );
      case 'halftime':
        return (
          <div className="flex items-center gap-1 text-xs">
            <span className="px-2 py-0.5 bg-yellow-600 text-yellow-100 rounded-full font-semibold">
              ⏸️ HT
            </span>
            <span className="text-primary-green-400 font-bold">{currentPoints.toFixed(1)} pts</span>
          </div>
        );
      case 'final':
        return (
          <div className="flex items-center gap-1 text-xs">
            <span className="px-2 py-0.5 bg-gray-600 text-gray-100 rounded-full font-semibold">
              ✅ FINAL
            </span>
            <span className="text-primary-green-400 font-bold">{currentPoints.toFixed(1)} pts</span>
          </div>
        );
      case 'scheduled':
        const startTime = new Date(gameStartTime);
        const now = new Date();
        const hoursUntil = Math.round((startTime - now) / (1000 * 60 * 60));
        
        // Format game time
        const gameTimeStr = startTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        const gameDateStr = startTime.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
        
        return (
          <div className="text-xs space-y-1">
            <div className="flex items-center justify-between text-primary-black-400">
              <span className="font-semibold">
                {isHome ? 'vs' : '@'} {opponent || 'TBD'}
              </span>
            </div>
            <div className="text-primary-black-500">
              📅 {gameDateStr} • {gameTimeStr}
            </div>
            {hoursUntil > 0 && hoursUntil < 48 && (
              <div className="text-primary-green-400 font-semibold">
                ⏰ {hoursUntil}h until kickoff
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Handle drop outside lineup slots - automatically move to bench
  const handleDropOutside = async (e) => {
    // Only handle if we're not dropping on a specific lineup slot or bench panel
    // Check if the drop target is within a lineup slot or bench section
    const target = e.target;
    const isInLineupSlot = target.closest('[data-lineup-slot]');
    const isInBenchSection = target.closest('[data-bench-section]');
    
    if (isInLineupSlot || isInBenchSection) {
      // Let the specific handlers deal with this
      return;
    }
    
    // Check if we have a dragged player from lineup
    if (draggedPlayer && draggedPlayer.source !== 'BENCH' && draggedPlayer.source !== 'INVENTORY') {
      console.log('🎯 Player dropped outside lineup - moving to bench');
      await handlePlayerDrop(e, 'BENCH');
    }
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary-black-50 text-xl">Redirecting...</div>
      </div>
    );
  }

  if (error && !activeTeam) {
    return (
      <div className="container-modern py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-900/50 border border-red-600 rounded-xl p-6 text-center">
            <p className="text-red-300 mb-4">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 py-2 px-6 rounded-lg font-semibold transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render functions will be added next...
  
  return (
    <>
      <div 
        className="bg-dk-black-primary"
        onDragOver={(e) => {
          // Allow dropping anywhere on the page
          if (draggedPlayer && draggedPlayer.source !== 'BENCH' && draggedPlayer.source !== 'INVENTORY') {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }
        }}
        onDrop={handleDropOutside}
      >
        {/* Team Selector & Alerts Section - Only shown when needed */}
        {(error) && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 mb-6" aria-label="Alerts">
            {/* Team Selector - Removed */}

            {/* Alerts */}
            {error && (
              <div className="p-4 bg-red-900/50 border border-red-600 text-red-300 rounded-lg">
                {error}
              </div>
            )}
          </section>
        )}

        {/* Starting Lineup Display Section */}
        <section className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-0 ${error ? 'mt-0' : 'mt-6'}`} aria-label="Starting Lineup">
          {/* Contest Info Banner */}
          {activeTeam && (
            <div className="mb-6">
              <ContestInfoBanner team={activeTeam} />
            </div>
          )}
          
          <LineupGrid
            lineup={lineup}
            onPlayerDrop={handlePlayerDrop}
            onPlayerDragStart={handlePlayerDragStart}
            onTokenDrop={handleTokenDrop}
            onClickToAdd={handleClickToAdd}
            onRemovePlayer={handleRemovePlayer}
            liveGameData={liveGameData}
            projections={projections}
            inventory={inventory}
            onRemoveToken={handleRemoveToken}
            autoSaving={autoSaving}
            filterPosition={benchFilterPosition}
          />
        </section>
      </div>

      {/* Bench and Inventory Section - Separate section for reserves */}
      <section aria-label="Bench and Tokens Inventory" className="mt-6">
        {/* Roster Limit Warning - Above Bench/Tokens */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <RosterLimitBanner inventory={inventory} showDetails={true} />
        </div>
        
        {/* Unified Bench and Tokens Panel - Full Width */}
        <BenchAndTokensPanel
          benchPlayers={lineup.BENCH}
          availableTokens={availableTokens}
          onPlayerDragStart={handlePlayerDragStart}
          onTokenDragStart={handleTokenDragStart}
          onPlayerDrop={(e) => handlePlayerDrop(e, 'BENCH')}
          liveGameData={liveGameData}
          projections={projections}
          inventory={inventory}
          onRemoveToken={handleRemoveToken}
          filterPosition={benchFilterPosition}
          onMoveToSlot={handleMoveToSlot}
          onClearFilter={() => setBenchFilterPosition(null)}
        />
      </section>

      {/* Player Selection Modal */}
      <PlayerSelectionModal
        isOpen={playerSelectionModal.isOpen}
        onClose={() => setPlayerSelectionModal({ isOpen: false, position: null })}
        position={playerSelectionModal.position}
        availablePlayers={getAvailablePlayersForPosition(playerSelectionModal.position)}
        onSelectPlayer={handleSelectPlayer}
        liveGameData={liveGameData}
        projections={projections}
        inventory={inventory}
      />
    </>
  );
}