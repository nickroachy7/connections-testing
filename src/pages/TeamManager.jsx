import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useRevalidator, useOutletContext, useLocation } from 'react-router-dom';
import { getUserInventory, quickSellCard, supabase } from '../services/supabase';
import { calculateBatchProjections, getInstantBaselineProjections } from '../utils/projections';
import { shouldBlockLineupChanges, shouldBlockTokenActions, getRosterLimitErrorMessage } from '../utils/rosterLimits';
import { calculatePlayerSellValue, calculateTokenSellValue } from '../utils/sellValueCalculator';
import { useIsMobile } from '../hooks';
import PlayerCard from '../components/PlayerCard';
import LineupGrid from '../components/LineupGrid';
import LineupListView from '../components/LineupListView';
import BenchFilterManager from '../components/BenchFilterManager';
import SwapModal from '../components/ui/SwapModal';
import RosterCount from '../components/RosterCount';
import SellConfirmationModal from '../components/SellConfirmationModal';
import PageHeader from '../components/PageHeader';

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
  const { user, profile, teams, activeTeam: initialActiveTeam, inventory: contextInventory, updateInventory, loadInventory: reloadInventoryFromContext, projections: contextProjections, liveGameData: contextLiveGameData, currentWeek: contextCurrentWeek, lineup: contextLineup, setLineup: setContextLineup, teamStartsNextWeek } = useOutletContext();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  // Team state
  const [activeTeam, setActiveTeam] = useState(initialActiveTeam);
  
  // Use context inventory directly - SINGLE SOURCE OF TRUTH
  const inventory = contextInventory || { players: [], tokens: [] };
  
  // Use context lineup - SINGLE SOURCE OF TRUTH
  const lineup = contextLineup || {
    QB: null,
    RB1: null,
    RB2: null,
    WR1: null,
    WR2: null,
    WR3: null,
    TE: null,
    FLEX: null,
    SUPERFLEX: null
  };
  const setLineup = setContextLineup;

  // Handle case where user is null (loader error or not logged in)
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);
  
  // Update activeTeam when context activeTeam changes (team switching)
  useEffect(() => {
    if (initialActiveTeam) {
      setActiveTeam(initialActiveTeam);
    }
  }, [initialActiveTeam?.id]); // Only depend on the ID to detect actual team changes
  
  // Note: Lineup is now managed by FantasyContext and synced via inventory changes
  // No local lineup state needed - using context lineup directly
  
  // View mode state
  const [lineupViewMode, setLineupViewMode] = useState('grid'); // 'grid', 'horizontal', 'list'
  
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
  
  // UI state
  const [draggedPlayer, setDraggedPlayer] = useState(null);
  const [draggedToken, setDraggedToken] = useState(null);
  const [selling, setSelling] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  
  // Auto-save refs
  const autoSaveTimeoutRef = useRef(null);
  const initialLoadRef = useRef(true);
  const saveLineupRef = useRef(null);
  
  // Bench filter state for slot selection
  const [benchFilterPosition, setBenchFilterPosition] = useState(null);
  
  // Token filter state - when user clicks + on a player card
  const [tokenFilterPlayerId, setTokenFilterPlayerId] = useState(null);
  
  // Selected player/token for slot highlighting
  const [selectedPlayerForSlot, setSelectedPlayerForSlot] = useState(null);
  const [selectedTokenForPlayer, setSelectedTokenForPlayer] = useState(null);
  
  // Roster limit modal state
  const [rosterLimitModal, setRosterLimitModal] = useState({
    isOpen: false,
    currentCount: 0,
    overBy: 0
  });
  
  // UNIFIED SWAP MODAL STATE
  // Modes: 'swap-player' | 'add-player' | 'place-player' | 'select-token' | 'apply-token' | null
  const [swapModal, setSwapModal] = useState({
    isOpen: false,
    mode: null,
    currentPlayer: null,    // For swap-player, place-player, select-token modes
    currentToken: null,     // For apply-token mode
    currentSlot: null       // For swap-player, add-player modes
  });
  
  // Sell confirmation modal state
  const [sellConfirmationModal, setSellConfirmationModal] = useState({
    isOpen: false,
    player: null,
    sellValue: 0,
    cardType: 'player'
  });
  
  // Projections state - use context data
  const projections = contextProjections || new Map();
  
  // Live game data state - use context data
  const liveGameData = contextLiveGameData || new Map();
  
  // Current week - use context data
  const currentWeek = contextCurrentWeek;
  const [syncingGames, setSyncingGames] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false); // Track if current week is finalized (preview next week)

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
        // Reload via context
        if (reloadInventoryFromContext) {
          await reloadInventoryFromContext();
        }
      }
    } catch (err) {
      console.error('Error calling sync function:', err);
      alert('Failed to sync games');
    } finally {
      setSyncingGames(false);
    }
  };

  // REMOVED: loadLiveGameData - now using shared FantasyContext data
  // REMOVED: loadInventory - now handled by context only

  // REMOVED: useEffect for auth redirect - handled by loader
  // REMOVED: useEffect for loading teams - handled by loader
  // REMOVED: useEffect for loading inventory on activeTeam change - now manual
  // REMOVED: Live game data subscriptions - handled by FantasyContext globally
  // REMOVED: Projection loading - now using shared FantasyContext data

  // Derive bench players from inventory (no BENCH in lineup state)
  const benchPlayers = inventory?.players?.filter(p => !p.is_in_lineup) || [];

  // Drag and Drop Handlers for Players
  const handlePlayerDragStart = (e, player, source) => {
    setDraggedPlayer({ player, source });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `player:${player.id}`);
  };



  const handlePlayerDrop = async (e, targetSlot) => {
    console.log('🎯 === PLAYER DROP START ===', { targetSlot, draggedPlayer });
    e.preventDefault?.();
    
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
      const playerCount = inventory?.players?.length || 0;
      const tokenCount = inventory?.tokens?.length || 0;
      const totalCount = playerCount + tokenCount;
      console.error('🚫 Lineup change blocked - Roster over limit:', {
        players: playerCount,
        tokens: tokenCount,
        total: totalCount,
        limit: 20,
        overBy: totalCount - 20
      });
      setRosterLimitModal({ isOpen: true, currentCount: totalCount, overBy: totalCount - 20 });
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
      (targetSlot === 'FLEX' && ['RB', 'WR', 'TE'].includes(playerPosAbbr)) ||
      (targetSlot === 'SUPERFLEX') || // SUPERFLEX accepts any position
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
          
          // Update token inventory via context
          updateInventory(prev => ({
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
      // Remove player from source
      if (source === 'BENCH' || source === 'INVENTORY') {
        // Player is coming from bench/inventory - no action needed on source
      } else {
        // Player is being moved from a lineup slot
        newLineup[source] = null;
      }
      
      // If target slot is occupied, remove token from displaced player
      if (newLineup[targetSlot]) {
        await handleTokenRemoval(newLineup[targetSlot]);
        const swappedPlayer = newLineup[targetSlot];
        
        // Update inventory to mark swapped player as not in lineup
        updateInventory(prev => ({
          ...prev,
          players: prev.players.map(p => 
            p.id === swappedPlayer.id 
              ? { ...p, is_in_lineup: false, lineup_position: null }
              : p
          )
        }));
      }
      
      // Place player in target slot
      newLineup[targetSlot] = player;
      
      // Update inventory to mark player as in lineup
      updateInventory(prev => ({
        ...prev,
        players: prev.players.map(p => 
          p.id === player.id 
            ? { ...p, is_in_lineup: true, lineup_position: targetSlot }
            : p
        )
      }));
      
      // Clear filter if player was dropped into a filtered position
      if (benchFilterPosition && targetSlot === benchFilterPosition) {
        setBenchFilterPosition(null);
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
    window.currentDraggedToken = true; // Set global flag for drag detection
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', `token:${token.id}`);
    console.log('🎯 Token data set:', `token:${token.id}`);
  };

  const handleTokenDragEnd = () => {
    console.log('🎯 Token drag ended');
    window.currentDraggedToken = false; // Clear global flag
    setDraggedToken(null);
  };

  const handleTokenDrop = async (e, player) => {
    console.log('🎯 Token drop attempt on player:', player?.player_card?.player_name);
    console.log('🎯 Dragged token (state):', draggedToken?.token_card?.token_name);
    console.log('🎯 Player locked:', player?.is_locked);
    
    e.preventDefault();
    e.stopPropagation();
    
    // Clear the global flag
    window.currentDraggedToken = false;
    
    const tokenToUse = draggedToken;
    
    if (!tokenToUse || !player || player.is_locked) {
      console.log('❌ Token drop blocked:', { tokenToUse: !!tokenToUse, player: !!player, isLocked: player?.is_locked });
      return;
    }
    
    // Check roster limit
    if (shouldBlockTokenActions(inventory)) {
      setError(getRosterLimitErrorMessage());
      setTimeout(() => setError(''), 5000);
      setDraggedToken(null);
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
      
      // Update token inventory via context
      updateInventory(prev => ({
        ...prev,
        tokens: prev.tokens.map(token => 
          token.id === tokenToUse.id 
            ? { ...token, applied_to_player_id: player.id, is_active: true }
            : token
        )
      }));
      
      setDraggedToken(null);
      
      // Trigger auto-save after token application
      triggerAutoSave();
      
      // Clear token filter if active
      if (tokenFilterPlayerId) {
        setTokenFilterPlayerId(null);
      }
    } catch (err) {
      console.error('Error applying token:', err);
      setError('Failed to apply token');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Handle one-click token application from filtered list
  const handleApplyTokenToPlayer = async (token, playerId) => {
    // Find the player in lineup or bench
    const allPlayers = [...Object.values(lineup).filter(p => p && typeof p === 'object'), ...benchPlayers];
    const player = allPlayers.find(p => p && p.id === playerId);
    
    if (!player || player.is_locked) {
      setError('Cannot apply token to locked player');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    // Check roster limit
    if (shouldBlockTokenActions(inventory)) {
      setError(getRosterLimitErrorMessage());
      setTimeout(() => setError(''), 5000);
      return;
    }
    
    try {
      await supabase
        .from('user_token_inventory')
        .update({
          applied_to_player_id: player.id,
          is_active: true
        })
        .eq('id', token.id);
      
      // Update token inventory via context
      updateInventory(prev => ({
        ...prev,
        tokens: prev.tokens.map(t => 
          t.id === token.id 
            ? { ...t, applied_to_player_id: player.id, is_active: true }
            : t
        )
      }));
      
      // Trigger auto-save
      triggerAutoSave();
      
      // Clear token filter
      setTokenFilterPlayerId(null);
      
      // Close swap modal if open
      if (swapModal.isOpen) {
        setSwapModal({ isOpen: false, mode: null, currentPlayer: null, currentToken: null, currentSlot: null });
      }
    } catch (err) {
      console.error('Error applying token:', err);
      setError('Failed to apply token');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Save lineup - optimized for instant background saves
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
      
      // Get all player IDs currently in starting lineup
      const lineupPlayerIds = new Set();
      Object.entries(lineup).forEach(([position, player]) => {
        if (player) {
          lineupPlayerIds.add(player.id);
          updates.push({
            id: player.id,
            is_in_lineup: true,
            lineup_position: position
          });
        }
      });
      
      // Update ALL players in inventory - those not in lineup should be marked as bench
      if (inventory?.players) {
        inventory.players.forEach(player => {
          if (!lineupPlayerIds.has(player.id)) {
            updates.push({
              id: player.id,
              is_in_lineup: false,
              lineup_position: null
            });
          }
        });
      }
      
      // Batch update - use Promise.all for parallel execution
      await Promise.all(
        updates.map(update =>
          supabase
            .from('user_player_inventory')
            .update({
              is_in_lineup: update.is_in_lineup,
              lineup_position: update.lineup_position
            })
            .eq('id', update.id)
        )
      );
      
      // Update last saved timestamp
      setLastSaved(new Date());
      
      // Note: We don't reload inventory here to avoid infinite loops
      // The context will be revalidated when navigating to other pages
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
  
  // Store the latest save function in a ref
  saveLineupRef.current = handleSaveLineup;

  // Immediate save function (no debounce) - for page navigation
  const saveImmediately = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    handleSaveLineup(true);
  }, [activeTeam, lineup]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-save function - faster 300ms for better UX
  const triggerAutoSave = useCallback(() => {
    if (!activeTeam) return;
    
    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set new timeout to save after 300ms (reduced for faster saves when navigating)
    autoSaveTimeoutRef.current = setTimeout(() => {
      handleSaveLineup(true);
    }, 300);
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
  }, [lineup, activeTeam]); // Removed triggerAutoSave to prevent infinite loop

  // Save immediately when user navigates away or switches tabs
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && activeTeam && !initialLoadRef.current) {
        // Page is being hidden - save immediately without debounce
        console.log('💾 Page hidden - saving lineup immediately');
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
          autoSaveTimeoutRef.current = null;
        }
        await saveImmediately();
        
        // Reload context inventory so Dashboard shows updated lineup
        if (reloadInventoryFromContext) {
          await reloadInventoryFromContext();
        }
      }
    };

    const handleBeforeUnload = (e) => {
      // Page is being closed/refreshed - save immediately
      if (activeTeam && !initialLoadRef.current) {
        console.log('💾 Page unloading - saving lineup immediately');
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
          autoSaveTimeoutRef.current = null;
        }
        // Use sendBeacon for more reliable saves on page unload
        saveImmediately();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeTeam, saveImmediately]);

  // Intercept all navigation clicks to save before navigating
  useEffect(() => {
    const handleLinkClick = async (e) => {
      // Check if click is on a navigation link
      const link = e.target.closest('a[href]');
      if (link && activeTeam) {
        const targetHref = link.getAttribute('href');
        
        // Don't intercept external links or same-page navigation
        if (targetHref.startsWith('http') || targetHref === window.location.pathname) {
          return;
        }
        
        // Prevent default navigation
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🔗 Navigation intercepted to:', targetHref);
        
        // Clear any pending auto-save
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
          autoSaveTimeoutRef.current = null;
        }
        
        try {
          // Step 1: Save lineup to database
          if (saveLineupRef.current) {
            console.log('💾 Step 1: Saving lineup to database...');
            await saveLineupRef.current(true);
            console.log('✅ Step 1 complete: Lineup saved to database');
          }
          
          // Step 2: Reload FantasyContext inventory from database
          if (reloadInventoryFromContext) {
            console.log('🔄 Step 2: Reloading inventory from database...');
            await reloadInventoryFromContext();
            console.log('✅ Step 2 complete: Inventory reloaded in context');
          }
          
          // Step 3: Small delay to ensure React state updates propagate
          await new Promise(resolve => setTimeout(resolve, 100));
          console.log('✅ Step 3 complete: State propagated');
          
        } catch (error) {
          console.error('❌ Error during save/reload:', error);
        }
        
        console.log('➡️ Step 4: Navigating to:', targetHref);
        // Now navigate - FantasyContext should have fresh data
        navigate(targetHref);
      }
    };

    document.addEventListener('click', handleLinkClick, true);
    return () => {
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [activeTeam, reloadInventoryFromContext, navigate, location.pathname]);

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

  // Swipe-to-sell handler (opens confirmation modal)
  const handleSwipeToSell = (player) => {
    const sellValue = calculatePlayerSellValue(player);
    setSellConfirmationModal({
      isOpen: true,
      player,
      sellValue,
      cardType: 'player'
    });
  };

  // Swipe-to-sell handler for tokens (opens confirmation modal)
  const handleSwipeToSellToken = (token) => {
    const sellValue = calculateTokenSellValue(token);
    setSellConfirmationModal({
      isOpen: true,
      player: token, // Reuse same modal structure
      sellValue,
      cardType: 'token'
    });
  };

  // Confirm sell from modal
  const handleConfirmSell = async () => {
    const { player, sellValue, cardType } = sellConfirmationModal;
    if (!player) return;

    setSelling(prev => ({ ...prev, [player.id]: true }));
    setError('');

    try {
      await quickSellCard(player.id, cardType || 'player');
      
      // Close modal
      setSellConfirmationModal({
        isOpen: false,
        player: null,
        sellValue: 0,
        cardType: 'player'
      });

      // Reload inventory via context
      await reloadInventoryFromContext();
    } catch (err) {
      console.error('Error selling card:', err);
      setError(err.message || 'Failed to sell card');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSelling(prev => ({ ...prev, [player.id]: false }));
    }
  };

  // Cancel sell
  const handleCancelSell = () => {
    setSellConfirmationModal({
      isOpen: false,
      player: null,
      sellValue: 0,
      cardType: 'player'
    });
  };

  // Remove token from player
  const handleRemoveToken = async (tokenId) => {
    try {
      await supabase
        .from('user_token_inventory')
        .update({ applied_to_player_id: null, is_active: false })
        .eq('id', tokenId);
      
      // Update token inventory via context
      updateInventory(prev => ({
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
    // Check roster limit first - if over limit, show modal and don't apply filter
    if (shouldBlockLineupChanges(inventory)) {
      const playerCount = inventory?.players?.length || 0;
      const tokenCount = inventory?.tokens?.length || 0;
      const totalCount = playerCount + tokenCount;
      setRosterLimitModal({ isOpen: true, currentCount: totalCount, overBy: totalCount - 20 });
      return;
    }
    
    // Open swap modal in add-player mode (for empty slots)
    setSwapModal({
      isOpen: true,
      mode: 'add-player',
      currentPlayer: null,
      currentToken: null,
      currentSlot: position
    });
  };

  // Handle click to add token to player
  const handleClickToAddToken = (player) => {
    // Mobile: Open token selection modal
    if (isMobile) {
      const availableTokens = inventory?.tokens?.filter(t => !t.is_active) || [];
      
      if (availableTokens.length === 0) {
        setError('No tokens available');
        setTimeout(() => setError(''), 3000);
        return;
      }
      
      setSwapModal({
        isOpen: true,
        mode: 'select-token',
        currentPlayer: player,
        currentToken: null,
        currentSlot: null
      });
    }
    // Desktop: Filter tokens for this player and scroll to tokens section
    else {
      setTokenFilterPlayerId(player.id);
      setBenchFilterPosition(null); // Clear player filter
      // Scroll to bench section smoothly with centered positioning
      setTimeout(() => {
        const benchSection = document.querySelector('[data-bench-section]');
        if (benchSection) {
          benchSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  // Get the player object for the token filter
  const getTokenFilterPlayer = () => {
    if (!tokenFilterPlayerId) return null;
    
    // Search in lineup and bench
    const allPlayers = [...Object.values(lineup).filter(p => p && typeof p === 'object'), ...benchPlayers];
    return allPlayers.find(p => p && p.id === tokenFilterPlayerId);
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
      const playerCount = inventory?.players?.length || 0;
      const tokenCount = inventory?.tokens?.length || 0;
      const totalCount = playerCount + tokenCount;
      setRosterLimitModal({ isOpen: true, currentCount: totalCount, overBy: totalCount - 20 });
      return;
    }
    
    const newLineup = { ...lineup };
    
    // If target slot is occupied, remove token from swapped player
    if (newLineup[targetPosition]) {
      const swappedPlayer = newLineup[targetPosition];
      const appliedToken = inventory?.tokens?.find(t => t.applied_to_player_id === swappedPlayer.id && t.is_active);
      
      if (appliedToken) {
        try {
          await supabase
            .from('user_token_inventory')
            .update({ applied_to_player_id: null, is_active: false })
            .eq('id', appliedToken.id);
          
          // Update token inventory via context
          updateInventory(prev => ({
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
    }
    
    // Place player in target position
    newLineup[targetPosition] = player;
    
    // Update lineup state
    setLineup(newLineup);
    
    // Update inventory to reflect is_in_lineup changes via context
    updateInventory(prev => ({
      ...prev,
      players: prev.players.map(p => {
        if (p.id === player.id) {
          // Player being added to lineup
          return { ...p, is_in_lineup: true, lineup_position: targetPosition };
        }
        // Swapped player automatically becomes bench (is_in_lineup = false)
        if (newLineup[targetPosition] && p.id !== player.id && Object.values(newLineup).find(lp => lp?.id === p.id) === undefined) {
          return { ...p, is_in_lineup: false, lineup_position: null };
        }
        return p;
      })
    }));
    
    setBenchFilterPosition(null); // Clear the filter after moving
  };

  // Handle opening bench player swap modal
  const handleBenchPlayerClick = (player) => {
    // Check if player's game is live, halftime, or final
    const gameData = liveGameData?.get(player.player_card.player_id);
    const gameStatus = gameData?.gameStatus?.toLowerCase();
    const isGameLiveOrFinal = gameStatus === 'live' || gameStatus === 'halftime' || gameStatus === 'final';
    
    if (player.is_locked || isGameLiveOrFinal) {
      // Silent blocking - no error popup
      return;
    }
    
    // Open swap modal in place-player mode (bench player → choose lineup slot)
    setSwapModal({
      isOpen: true,
      mode: 'place-player',
      currentPlayer: player,
      currentToken: null,
      currentSlot: null
    });
  };

  // Handle clicking a player in the lineup (opens swap modal in list/horizontal views)
  const handleLineupPlayerClick = (playerOrPosition, slotKey) => {
    // If first arg is a string, it's a position (empty slot)
    if (typeof playerOrPosition === 'string') {
      const position = playerOrPosition;
      
      // Open swap modal in add-player mode (for empty slots)
      setSwapModal({
        isOpen: true,
        mode: 'add-player',
        currentPlayer: null,
        currentToken: null,
        currentSlot: slotKey || position
      });
      return;
    }
    
    // Otherwise it's a player object - open swap modal
    const player = playerOrPosition;
    const gameData = liveGameData?.get(player.player_card.player_id);
    const gameStatus = gameData?.gameStatus?.toLowerCase();
    const isGameLiveOrFinal = gameStatus === 'live' || gameStatus === 'halftime' || gameStatus === 'final';
    
    if (player.is_locked || isGameLiveOrFinal) {
      setError(`${player.player_card.player_name} is locked and cannot be moved (game in progress or final)`);
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    // Open swap modal in swap-player mode (lineup player → choose bench player)
    setSwapModal({
      isOpen: true,
      mode: 'swap-player',
      currentPlayer: player,
      currentToken: null,
      currentSlot: slotKey
    });
  };

  // Get eligible lineup slots for a bench player
  const getEligibleSlotsForBenchPlayer = (player) => {
    if (!player) return [];
    
    const positionMap = {
      'Quarterback': ['QB'],
      'Running Back': ['RB1', 'RB2', 'FLEX'],
      'Wide Receiver': ['WR1', 'WR2', 'WR3', 'FLEX'],
      'Tight End': ['TE', 'FLEX']
    };
    
    const eligibleSlots = positionMap[player.player_card.position] || [];
    
    // Filter out locked slots
    return eligibleSlots.filter(slotKey => {
      const currentPlayer = lineup[slotKey];
      if (!currentPlayer) return true; // Empty slot is eligible
      
      // Check if current player is locked or game is live/halftime/final
      const gameData = liveGameData?.get(currentPlayer.player_card.player_id);
      const gameStatus = gameData?.gameStatus?.toLowerCase();
      const isGameLiveOrFinal = gameStatus === 'live' || gameStatus === 'halftime' || gameStatus === 'final';
      
      return !currentPlayer.is_locked && !isGameLiveOrFinal;
    });
  };

  // Handle swap from bench player modal (place-player mode)
  const handleBenchPlayerSwap = async (slotKey) => {
    const benchPlayer = swapModal.currentPlayer;
    if (!benchPlayer || !slotKey) return;
    
    // Check roster limit
    if (shouldBlockLineupChanges(inventory)) {
      const playerCount = inventory?.players?.length || 0;
      const tokenCount = inventory?.tokens?.length || 0;
      const totalCount = playerCount + tokenCount;
      setRosterLimitModal({ isOpen: true, currentCount: totalCount, overBy: totalCount - 20 });
      setSwapModal({ isOpen: false, mode: null, currentPlayer: null, currentToken: null, currentSlot: null });
      return;
    }
    
    const updatedLineup = { ...lineup };
    const swappedPlayer = updatedLineup[slotKey];
    
    // If slot has a player, remove their token before swapping
    if (swappedPlayer) {
      const appliedToken = inventory?.tokens?.find(t => t.applied_to_player_id === swappedPlayer.id && t.is_active);
      
      if (appliedToken) {
        try {
          await supabase
            .from('user_token_inventory')
            .update({ applied_to_player_id: null, is_active: false })
            .eq('id', appliedToken.id);
          
          // Update token inventory via context
          updateInventory(prev => ({
            ...prev,
            tokens: prev.tokens.map(token => 
              token.id === appliedToken.id 
                ? { ...token, applied_to_player_id: null, is_active: false }
                : token
            )
          }));
        } catch (err) {
          console.error('Error removing token from swapped player:', err);
        }
      }
    }
    
    // Place bench player in lineup slot
    updatedLineup[slotKey] = benchPlayer;
    
    setLineup(updatedLineup);
    
    // Update inventory to reflect lineup changes via context
    updateInventory(prev => ({
      ...prev,
      players: prev.players.map(p => {
        if (p.id === benchPlayer.id) {
          return { ...p, is_in_lineup: true, lineup_position: slotKey };
        }
        if (swappedPlayer && p.id === swappedPlayer.id) {
          return { ...p, is_in_lineup: false, lineup_position: null };
        }
        return p;
      })
    }));
    
    // Close modal
    setSwapModal({ isOpen: false, mode: null, currentPlayer: null, currentToken: null, currentSlot: null });

    // Auto-save
    triggerAutoSave();
  };

  // Handle swap from player swap modal (lineup player with bench player)
  const handlePlayerSwap = async (benchPlayer) => {
    const { currentPlayer, currentSlot: slotKey } = swapModal;
    if (!currentPlayer || !benchPlayer || !slotKey) return;

    // Swap: put bench player in lineup, current player goes to bench
    const updatedLineup = { ...lineup };
    updatedLineup[slotKey] = benchPlayer;
    
    // Update inventory via context
    updateInventory(prev => ({
      ...prev,
      players: prev.players.map(p => {
        if (p.id === benchPlayer.id) {
          return { ...p, is_in_lineup: true, lineup_position: slotKey };
        }
        if (p.id === currentPlayer.id) {
          return { ...p, is_in_lineup: false, lineup_position: null };
        }
        return p;
      })
    }));
    
    setLineup(updatedLineup);
    
    // Close modal
    setSwapModal({ isOpen: false, mode: null, currentPlayer: null, currentToken: null, currentSlot: null });

    // Auto-save
    triggerAutoSave();
  };

  // Get eligible bench players for swapping with a lineup player
  const getEligibleBenchPlayers = (currentPlayer, slotKey) => {
    if (!currentPlayer) return [];
    
    const position = currentPlayer.player_card.position;
    
    // Filter bench players by position compatibility
    return benchPlayers.filter(benchPlayer => {
      // Check position compatibility
      if (slotKey === 'QB') return benchPlayer.player_card.position === 'Quarterback';
      if (slotKey === 'TE') return benchPlayer.player_card.position === 'Tight End';
      if (slotKey.startsWith('RB')) return benchPlayer.player_card.position === 'Running Back';
      if (slotKey.startsWith('WR')) return benchPlayer.player_card.position === 'Wide Receiver';
      if (slotKey === 'FLEX') {
        return ['Running Back', 'Wide Receiver', 'Tight End'].includes(benchPlayer.player_card.position);
      }
      if (slotKey === 'SUPERFLEX') return true; // Any position
      
      return false;
    }).filter(benchPlayer => {
      // Filter out locked players
      const gameData = liveGameData?.get(benchPlayer.player_card.player_id);
      const gameStatus = gameData?.gameStatus?.toLowerCase();
      const isGameLiveOrFinal = gameStatus === 'live' || gameStatus === 'halftime' || gameStatus === 'final';
      return !benchPlayer.is_locked && !isGameLiveOrFinal;
    });
  };

  // Handle opening token application modal (mobile)
  const handleTokenClick = (token) => {
    // Open swap modal in apply-token mode (token → choose player)
    setSwapModal({
      isOpen: true,
      mode: 'apply-token',
      currentPlayer: null,
      currentToken: token,
      currentSlot: null
    });
  };

  // Get eligible players for token application
  const getEligiblePlayersForToken = (token) => {
    if (!token) return [];
    
    // Get all lineup players (not bench)
    const lineupPlayers = Object.values(lineup).filter(p => p && typeof p === 'object');
    
    return lineupPlayers.filter(player => {
      // Check if player is locked
      const gameData = liveGameData?.get(player.player_card.player_id);
      const isGameLive = gameData && (gameData.gameStatus?.toLowerCase() === 'live' || gameData.gameStatus?.toLowerCase() === 'halftime');
      
      if (player.is_locked || isGameLive) return false;
      
      // Check if player already has an active token
      const hasActiveToken = inventory?.tokens?.some(t => 
        t.applied_to_player_id === player.id && t.is_active
      );
      
      return !hasActiveToken;
    });
  };

  // Handle token application from modal
  const handleTokenApplication = async (player) => {
    const token = swapModal.currentToken;
    if (!token || !player) return;
    
    // Apply token directly (no drag/drop involved)
    await handleApplyTokenToPlayer(token, player.id);
    
    // Close modal
    setSwapModal({ isOpen: false, mode: null, currentPlayer: null, currentToken: null, currentSlot: null });
  };

  // Handle player selection from add-player modal (empty slot)
  const handleSelectPlayer = (player) => {
    const position = swapModal.currentSlot;
    
    if (!position) return;
    
    // Check if player's game is live (even if not locked in DB yet)
    const gameData = liveGameData?.get(player.player_card.player_id);
    const isGameLive = gameData && (gameData.gameStatus?.toLowerCase() === 'live' || gameData.gameStatus?.toLowerCase() === 'halftime');
    
    // Block locked players OR players with live games from being added to lineup
    if (player.is_locked || isGameLive) {
      setError(`${player.player_card.player_name} is locked and cannot be added to lineup (game in progress)`);
      setTimeout(() => setError(''), 3000);
      setSwapModal({ isOpen: false, mode: null, currentPlayer: null, currentToken: null, currentSlot: null });
      return;
    }
    
    // Check roster limit
    if (shouldBlockLineupChanges(inventory)) {
      const playerCount = inventory?.players?.length || 0;
      const tokenCount = inventory?.tokens?.length || 0;
      const totalCount = playerCount + tokenCount;
      setRosterLimitModal({ isOpen: true, currentCount: totalCount, overBy: totalCount - 20 });
      setSwapModal({ isOpen: false, mode: null, currentPlayer: null, currentToken: null, currentSlot: null });
      return;
    }
    
    const newLineup = { ...lineup };
    const swappedPlayer = newLineup[position];
    
    // Place player in target position
    newLineup[position] = player;
    
    setLineup(newLineup);
    
    // Update inventory via context
    updateInventory(prev => ({
      ...prev,
      players: prev.players.map(p => {
        if (p.id === player.id) {
          return { ...p, is_in_lineup: true, lineup_position: position };
        }
        if (swappedPlayer && p.id === swappedPlayer.id) {
          return { ...p, is_in_lineup: false, lineup_position: null };
        }
        return p;
      })
    }));
    
    setSwapModal({ isOpen: false, mode: null, currentPlayer: null, currentToken: null, currentSlot: null });
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
        
        // Update token inventory via context
        updateInventory(prev => ({
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
    
    setLineup(newLineup);
    
    // Update inventory to mark player as not in lineup via context
    updateInventory(prev => ({
      ...prev,
      players: prev.players.map(p => 
        p.id === player.id 
          ? { ...p, is_in_lineup: false, lineup_position: null }
          : p
      )
    }));
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

  // Filter players - add null safety
  const filteredPlayers = (inventory?.players || []).filter(player => {
    const matchesPosition = filters.position === 'all' || player.player_card.position === filters.position;
    const matchesSearch = filters.search === '' || 
      player.player_card.player_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      player.player_card.team_abbreviation.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesPosition && matchesSearch;
  });

  // Filter tokens - add null safety
  const filteredTokens = (inventory?.tokens || []).filter(token => {
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
        <section className={`max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 pb-0 ${error ? 'mt-0' : 'mt-3 sm:mt-6'}`} aria-label="Starting Lineup">
          <PageHeader
            title="Starting Lineup"
            subtitle={
              <div className="flex items-center gap-1 sm:gap-1.5">
                {autoSaving ? (
                  <>
                    <div className="animate-spin h-2.5 w-2.5 sm:h-3 sm:w-3 border-2 border-primary-green-500 border-t-transparent rounded-full"></div>
                    <span>Saving...</span>
                  </>
                ) : lastSaved ? (
                  <>
                    <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-primary-green-500">Lineup Saved</span>
                  </>
                ) : (
                  <span>No changes</span>
                )}
              </div>
            }
          />
          
          <div className="-mx-2 sm:-mx-4 lg:-mx-8">
          <LineupListView
            lineup={lineup}
            onPlayerClick={handleLineupPlayerClick}
            liveGameData={isPreviewMode ? new Map() : liveGameData}
            projections={projections}
            inventory={inventory}
            isPreviewMode={isPreviewMode}
            onAddToken={handleClickToAddToken}
            onSell={handleSwipeToSell}
            isMobile={isMobile}
            teamStartsNextWeek={teamStartsNextWeek}
          />
          </div>
        </section>
      </div>

      {/* Bench and Inventory Section - Separate section for reserves */}
      <section aria-label="Bench and Tokens Inventory" className="mt-3">
        <div className="max-w-7xl mx-auto -mx-2 sm:-mx-4 lg:-mx-8">
          <BenchFilterManager
            benchPlayers={inventory?.players?.filter(p => !p.is_in_lineup) || []}
            availableTokens={availableTokens}
            onPlayerDragStart={handlePlayerDragStart}
            onTokenDragStart={handleTokenDragStart}
            onTokenDragEnd={handleTokenDragEnd}
            onPlayerDrop={(e) => handlePlayerDrop(e, 'BENCH')}
            liveGameData={isPreviewMode ? new Map() : liveGameData}
            projections={projections}
            inventory={inventory}
            onRemoveToken={handleRemoveToken}
            filterPosition={benchFilterPosition}
            tokenFilterPlayerId={tokenFilterPlayerId}
            tokenFilterPlayer={getTokenFilterPlayer()}
            onApplyTokenToPlayer={handleApplyTokenToPlayer}
            onMoveToSlot={handleMoveToSlot}
            onClearFilter={() => {
              setBenchFilterPosition(null);
              setTokenFilterPlayerId(null);
              setSelectedPlayerForSlot(null);
              setSelectedTokenForPlayer(null);
            }}
            lineup={lineup}
            onSelectPlayerForSlot={setSelectedPlayerForSlot}
            onSelectTokenForPlayer={setSelectedTokenForPlayer}
            selectedPlayerForSlot={selectedPlayerForSlot}
            selectedTokenForPlayer={selectedTokenForPlayer}
            onBenchPlayerClick={handleBenchPlayerClick}
            onTokenClick={handleTokenClick}
            onSell={handleSwipeToSell}
            onSellToken={handleSwipeToSellToken}
            teamStartsNextWeek={teamStartsNextWeek}
          />
        </div>
      </section>

      {/* UNIFIED SWAP MODAL - handles all swap/selection flows */}
      {swapModal.isOpen && (
        <SwapModal
          mode={swapModal.mode}
          isOpen={swapModal.isOpen}
          onClose={() => setSwapModal({ isOpen: false, mode: null, currentPlayer: null, currentToken: null, currentSlot: null })}
          onSelect={(selected) => {
            // Route to appropriate handler based on mode
            switch (swapModal.mode) {
              case 'swap-player':
                handlePlayerSwap(selected);
                break;
              case 'add-player':
                handleSelectPlayer(selected);
                break;
              case 'place-player':
                handleBenchPlayerSwap(selected);
                break;
              case 'select-token':
                // When a token is selected, apply it to the current player
                handleApplyTokenToPlayer(selected, swapModal.currentPlayer.id);
                break;
              case 'apply-token':
                handleTokenApplication(selected);
                break;
              default:
                break;
            }
          }}
          currentPlayer={swapModal.currentPlayer}
          currentToken={swapModal.currentToken}
          currentSlot={swapModal.currentSlot}
          players={
            swapModal.mode === 'swap-player'
              ? getEligibleBenchPlayers(swapModal.currentPlayer, swapModal.currentSlot)
              : swapModal.mode === 'add-player'
              ? getAvailablePlayersForPosition(swapModal.currentSlot)
              : swapModal.mode === 'apply-token'
              ? getEligiblePlayersForToken(swapModal.currentToken)
              : []
          }
          tokens={
            swapModal.mode === 'select-token'
              ? (inventory?.tokens?.filter(t => !t.is_active) || [])
              : []
          }
          slots={
            swapModal.mode === 'place-player'
              ? getEligibleSlotsForBenchPlayer(swapModal.currentPlayer)
              : []
          }
          lineup={lineup}
          liveGameData={isPreviewMode ? new Map() : liveGameData}
          projections={projections}
          onNavigateToShop={() => navigate(`/teams/${activeTeam.id}/market`)}
        />
      )}

      {/* Roster Limit Modal */}
      {rosterLimitModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-primary-black-800 rounded-2xl max-w-md w-full p-6 border-2 border-red-700 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">⚠️</div>
              <h2 className="text-2xl font-bold text-red-400 mb-2">
                Roster Over Limit
              </h2>
              <p className="text-primary-black-300 mb-4">
                Your roster is currently <span className="font-bold text-red-400">{rosterLimitModal.currentCount}/20</span> cards
                {rosterLimitModal.overBy > 0 && (
                  <span className="text-red-400"> ({rosterLimitModal.overBy} over limit)</span>
                )}
              </p>
              <p className="text-primary-black-400">
                You must sell cards to get back to 20 or fewer before making lineup changes or applying tokens.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setRosterLimitModal({ isOpen: false, currentCount: 0, overBy: 0 })}
                className="flex-1 px-4 py-3 bg-primary-black-700 hover:bg-primary-black-600 text-primary-black-300 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setRosterLimitModal({ isOpen: false, currentCount: 0, overBy: 0 });
                  navigate(`/teams/${activeTeam.id}/inventory`);
                }}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-colors"
              >
                Go to Inventory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sell Confirmation Modal */}
      <SellConfirmationModal
        player={sellConfirmationModal.player}
        sellValue={sellConfirmationModal.sellValue}
        onConfirm={handleConfirmSell}
        onCancel={handleCancelSell}
        isOpen={sellConfirmationModal.isOpen}
      />
    </>
  );
}