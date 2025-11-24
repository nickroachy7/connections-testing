import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getUserInventory, quickSellCard, supabase } from '../services/supabase';
import { calculatePlayerSellValue, calculateTokenSellValue } from '../utils/sellValueCalculator';
import InventoryPanel from '../components/InventoryPanel';
import RosterLimitBanner from '../components/RosterLimitBanner';
import RosterCount from '../components/RosterCount';

export default function Inventory() {
  const { user, profile, activeTeam, inventory: loaderInventory, refreshProfile } = useOutletContext();
  const [inventory, setInventory] = useState(loaderInventory || { players: [], tokens: [] });
  const [filters, setFilters] = useState({
    position: 'all',
    rarity: 'all',
    tokenType: 'all',
    search: ''
  });
  const [selling, setSelling] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [projections, setProjections] = useState(new Map());
  const [loadingProjections, setLoadingProjections] = useState(false);
  const [liveGameData, setLiveGameData] = useState(new Map());
  const [currentWeek, setCurrentWeek] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

  // Load live game data
  const loadLiveGameData = useCallback(async (inventoryData = null) => {
    console.log('🎮 Inventory loadLiveGameData called!');
    try {
      // Use passed inventory data or fall back to state
      const playersData = inventoryData?.players || inventory?.players;
      console.log('Players data available:', playersData?.length || 0);
      
      // Calculate current week
      const today = new Date();
      const seasonYear = today.getFullYear();
      const weekNumber = Math.floor((today.getTime() - new Date(seasonYear, 8, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
      
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
        
        // Create a map of player_id -> game data for players with stats
        const gameDataMap = new Map();
        
        statsData?.forEach(stat => {
          const game = gamesData.find(g => g.game_id === stat.game_id);
          if (game && stat.player_cards) {
            const playerId = stat.player_cards.player_id;
            
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
      }
    } catch (err) {
      console.error('Error loading live game data:', err);
    }
  }, []);

  const loadInventory = useCallback(async () => {
    if (!user?.id || !activeTeam?.id) return;
    
    try {
      setError('');
      const data = await getUserInventory(user.id, activeTeam.id);
      setInventory(data);
      
      // Calculate projections for all players - USE DATABASE PROJECTIONS (same as TeamManager)
      if (data.players && data.players.length > 0) {
        setLoadingProjections(true);
        
        // Create projections Map directly from database values (instant!)
        const dbProjections = new Map();
        data.players.forEach(p => {
          if (p.player_card) {
            // Parse numeric values from database (they come as strings)
            // Use explicit null checks to preserve 0 values
            const weeklyProjValue = p.player_card.weekly_projected_points != null ? parseFloat(p.player_card.weekly_projected_points) : null;
            const projValue = p.player_card.projected_points != null ? parseFloat(p.player_card.projected_points) : null;
            const weeklyProj = weeklyProjValue ?? projValue ?? getBaselineProjection(p.player_card.position);
            
            dbProjections.set(p.player_card.player_id, {
              projected: weeklyProj,
              source: weeklyProjValue != null ? 'weekly_db' : (projValue != null ? 'season_db' : 'baseline')
            });
          }
        });
        setProjections(dbProjections);
        setLoadingProjections(false);
      }
      
      // Load live game data after inventory is loaded
      await loadLiveGameData(data);
    } catch (err) {
      console.error('Error loading inventory:', err);
      setError('Failed to load inventory');
      setLoadingProjections(false);
    }
  }, [user?.id, activeTeam?.id, loadLiveGameData]);
  
  // Helper function for baseline projections (same as TeamManager)
  const getBaselineProjection = (position) => {
    const baselines = {
      'Quarterback': 18,
      'Running Back': 12,
      'Wide Receiver': 10,
      'Tight End': 8,
    };
    return baselines[position] || 8;
  };

  // Load inventory when component mounts or activeTeam changes
  useEffect(() => {
    if (user && activeTeam) {
      loadInventory();
    }
  }, [user, activeTeam?.id, loadInventory]);

  // Subscribe to live game updates - ONLY if we have a current week
  useEffect(() => {
    if (!user || !currentWeek) return;
    
    // Subscribe to game_scores changes
    const gamesChannel = supabase
      .channel('inventory-games')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_scores',
          filter: `week_number=eq.${currentWeek.week}`
        },
        (payload) => {
          console.log('Game score update in Inventory:', payload);
          loadLiveGameData(inventory);
        }
      )
      .subscribe();
    
    // Subscribe to player stats changes
    const statsChannel = supabase
      .channel('inventory-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_game_stats'
        },
        (payload) => {
          console.log('Player stats update in Inventory:', payload);
          loadLiveGameData(inventory);
        }
      )
      .subscribe();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadLiveGameData(inventory);
    }, 30000);
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(gamesChannel);
      supabase.removeChannel(statsChannel);
    };
  }, [user, currentWeek]);

  const handleQuickSell = async (inventoryId, cardType, baseValue, skipConfirm = false) => {
    if (!skipConfirm && !window.confirm(`Are you sure you want to sell this card for ${baseValue} coins?`)) {
      return;
    }

    setSelling(prev => ({ ...prev, [inventoryId]: true }));
    setError('');
    setSuccess('');

    try {
      const result = await quickSellCard(inventoryId, cardType);
      setSuccess(`Card sold for ${result.coins_earned} coins! New balance: ${result.new_balance}`);
      
      // Remove sold item from inventory
      if (cardType === 'player') {
        setInventory(prev => ({
          ...prev,
          players: prev.players.filter(p => p.id !== inventoryId)
        }));
      } else {
        setInventory(prev => ({
          ...prev,
          tokens: prev.tokens.filter(t => t.id !== inventoryId)
        }));
      }
    } catch (err) {
      console.error('Error selling card:', err);
      setError(err.message || 'Failed to sell card');
    } finally {
      setSelling(prev => ({ ...prev, [inventoryId]: false }));
    }
  };

  const filteredTokens = inventory.tokens.filter(token => {
    const matchesType = filters.tokenType === 'all' || token.token_card.token_type === filters.tokenType;
    const matchesRarity = filters.rarity === 'all' || token.token_card.rarity === filters.rarity;
    const matchesSearch = filters.search === '' || 
      token.token_card.token_name.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesType && matchesRarity && matchesSearch;
  });

  if (!user || !profile || !activeTeam) {
    return null;
  }

  return (
    <>
      {/* Alerts and Team Selector - Only shown when needed */}
      {(error || success) && (
        <div className="max-w-7xl mx-auto mt-3 sm:mt-6 mb-3 sm:mb-6 px-2 sm:px-4">
            {/* Team Selector - Removed */}

            {/* Alerts */}
            {error && (
              <div className="p-3 sm:p-4 bg-red-900/50 border border-red-600 text-red-300 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="p-3 sm:p-4 bg-green-900/50 border border-green-600 text-green-300 rounded-lg text-sm">
                {success}
              </div>
            )}
        </div>
      )}

      <div className="min-h-screen bg-primary-black-950">
        <div className="max-w-7xl mx-auto py-3 sm:py-8">
          {/* Page Header */}
          <div className="mb-3 sm:mb-4 px-2 sm:px-4 py-2 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-shrink">
                <h1 className="text-sm sm:text-xl font-bold text-primary-black-50">Inventory</h1>
                <p className="text-[10px] sm:text-xs text-primary-black-400 mt-0.5">Roster: {inventory.players?.length || 0}/20</p>
              </div>
              
              {/* Filter Tabs and View Toggle */}
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                {/* View Toggle Buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 sm:p-2 rounded border transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-primary-green-500/20 border-primary-green-500 text-primary-green-400'
                        : 'bg-primary-black-800 border-primary-black-600 text-primary-black-400 hover:border-primary-black-500 hover:text-primary-black-300'
                    }`}
                    title="Grid View"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 sm:p-2 rounded border transition-colors ${
                      viewMode === 'list'
                        ? 'bg-primary-green-500/20 border-primary-green-500 text-primary-green-400'
                        : 'bg-primary-black-800 border-primary-black-600 text-primary-black-400 hover:border-primary-black-500 hover:text-primary-black-300'
                    }`}
                    title="List View"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>
                
                {/* Filter Tabs */}
                <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                <button
                  onClick={() => setFilters({ position: 'all', rarity: 'all', tokenType: 'all', search: '' })}
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-sm font-semibold transition-all ${
                    filters.tokenType === 'all'
                      ? 'bg-primary-green-500 text-white'
                      : 'bg-primary-black-800 text-primary-black-300 hover:bg-primary-black-700'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilters({ position: 'all', rarity: 'all', tokenType: 'none', search: '' })}
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-sm font-semibold transition-all ${
                    filters.tokenType === 'none'
                      ? 'bg-primary-green-500 text-white'
                      : 'bg-primary-black-800 text-primary-black-300 hover:bg-primary-black-700'
                  }`}
                >
                  Players
                </button>
                <button
                  onClick={() => setFilters({ position: 'all', rarity: 'all', tokenType: 'tokens-only', search: '' })}
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-sm font-semibold transition-all ${
                    filters.tokenType === 'tokens-only'
                      ? 'bg-primary-green-500 text-white'
                      : 'bg-primary-black-800 text-primary-black-300 hover:bg-primary-black-700'
                  }`}
                >
                  Tokens
                </button>
              </div>
              </div>
            </div>
          </div>

          {/* Inventory Panel Section */}
          <div className={error || success ? 'mt-0' : 'mt-3 sm:mt-6'}>
            <InventoryPanel
              players={inventory.players}
              tokens={inventory.tokens}
              projections={projections}
              loadingProjections={loadingProjections}
              liveGameData={liveGameData}
              onQuickSell={handleQuickSell}
              onBulkSellComplete={loadInventory}
              onReloadProfile={refreshProfile}
              selling={selling}
              filters={filters}
              onFilterChange={setFilters}
              inventory={inventory}
              viewMode={viewMode}
            />
          </div>
        </div>
      </div>
    </>
  );
}
