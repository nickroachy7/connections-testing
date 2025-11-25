import { useState } from 'react';
import PropTypes from 'prop-types';
import PlayerCard from './PlayerCard';
import PlayerCardModal from './PlayerCardModal';
import PlayerSwapModal from './PlayerSwapModal';
import { useIsMobile } from '../hooks';

/**
 * LineupGrid Component
 * 
 * Horizontal layout for starting lineup that stays visible at the top.
 * Features:
 * - 8 position slots displayed horizontally in 2 rows
 * - Large, clear drop zones with visual feedback
 * - Sticky positioning to stay visible during scroll
 * - Click-to-add buttons for easier interaction
 */
export default function LineupGrid({
  lineup,
  onPlayerDrop,
  onPlayerDragStart,
  onTokenDrop,
  onClickToAdd,
  onClickToAddToken,
  onRemovePlayer,
  onMoveToSlot,
  liveGameData,
  projections,
  inventory,
  onRemoveToken,
  autoSaving = false,
  filterPosition = null,
  isPreviewMode = false, // If true, ignore player locks (previewing next week)
  selectedPlayerForSlot = null,
  selectedTokenForPlayer = null,
  onSlotClickWithSelection = null,
  onPlayerClickWithTokenSelection = null
}) {
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const [modalPlayer, setModalPlayer] = useState(null);
  const [modalSlot, setModalSlot] = useState(null);
  const [mobileSwapSlot, setMobileSwapSlot] = useState(null);
  const isMobile = useIsMobile();

  // Position slots configuration - single horizontal row
  const positionSlots = [
    { key: 'QB', label: 'Quarterback' },
    { key: 'RB1', label: 'Running Back' },
    { key: 'RB2', label: 'Running Back' },
    { key: 'WR1', label: 'Wide Receiver' },
    { key: 'WR2', label: 'Wide Receiver' },
    { key: 'WR3', label: 'Wide Receiver' },
    { key: 'TE', label: 'Tight End' },
    { key: 'FLEX', label: 'Flex (RB/WR/TE)' },
    { key: 'SUPERFLEX', label: 'SuperFlex (Any Position)' }
  ];

  const handleDragOver = (e, slotKey) => {
    try {
      // Check if this is a token drop using both methods
      const dragData = e.dataTransfer.getData('text/plain');
      const isTokenDrop = dragData && dragData.startsWith('token:');
      const isTokenDrag = window.currentDraggedToken || false;
      
      // Only log when slot changes to reduce console spam
      if (dragOverSlot !== slotKey) {
        console.log('🎯 LineupGrid dragOver - slotKey:', slotKey, 'isTokenDrop:', isTokenDrop, 'isTokenDrag:', !!isTokenDrag);
      }
      
      // For token drops, don't prevent default and let it bubble to PlayerCard
      if (isTokenDrop || isTokenDrag) {
        e.dataTransfer.dropEffect = 'copy';
        return; // Don't preventDefault() - let it bubble
      } else {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }
    } catch (err) {
      console.error('🎯 LineupGrid dragOver error:', err);
      // Fallback to move effect if data can't be read
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
    
    setDragOverSlot(slotKey);
  };

  const handleDragLeave = (e) => {
    // Only clear drag over if we're actually leaving the slot
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverSlot(null);
    }
  };

  const handleDrop = (e, slotKey) => {
    console.log('🎯 LineupGrid handleDrop called - slotKey:', slotKey);
    
    // Stop propagation to prevent page-level drop handler from firing
    e.stopPropagation();
    
    try {
      // Check if this is a token drop using both methods
      const dragData = e.dataTransfer.getData('text/plain');
      const isTokenDrop = dragData && dragData.startsWith('token:');
      const isTokenDrag = window.currentDraggedToken || false;
      
      console.log('🎯 LineupGrid drop - isTokenDrop:', isTokenDrop, 'isTokenDrag:', !!isTokenDrag);
      
      // For token drops, don't prevent default and let it bubble to PlayerCard
      if (isTokenDrop || isTokenDrag) {
        console.log('🎯 LineupGrid: Token drop detected - letting event bubble to PlayerCard');
        setDragOverSlot(null);
        return; // Don't preventDefault() - let it bubble
      } else {
        console.log('🎯 LineupGrid: Player drop detected - handling at slot level');
        e.preventDefault();
        setDragOverSlot(null);
      }
    } catch (err) {
      console.error('🎯 LineupGrid drop error:', err);
      e.preventDefault();
      setDragOverSlot(null);
    }
    
    try {
      // Check what type of drop this is
      const dragData = e.dataTransfer.getData('text/plain');
      
      console.log('🎯 LineupGrid drop - slotKey:', slotKey, 'dragData:', dragData);
      
      const isTokenDrop = dragData && dragData.startsWith('token:');
      const isPlayerDrop = dragData && dragData.startsWith('player:');
      const isTokenDrag = window.currentDraggedToken || false;
      
      console.log('🎯 LineupGrid - isTokenDrop:', isTokenDrop, 'isPlayerDrop:', isPlayerDrop, 'isTokenDrag:', !!isTokenDrag);
      
      if ((isTokenDrop || isTokenDrag) && onTokenDrop) {
        // This is a token drop - get the player in this slot
        const player = lineup[slotKey];
        console.log('🎯 LineupGrid token drop - slotKey:', slotKey);
        console.log('🎯 LineupGrid token drop - player in slot:', player?.player_card?.player_name);
        console.log('🎯 LineupGrid token drop - player locked:', player?.is_locked);
        console.log('🎯 LineupGrid token drop - lineup keys:', Object.keys(lineup));
        console.log('🎯 LineupGrid token drop - full lineup:', lineup);
        
        if (player && !player.is_locked) {
          console.log('🎯 LineupGrid: Calling onTokenDrop for player:', player.player_card.player_name);
          onTokenDrop(e, player);
          return;
        } else {
          console.log('❌ LineupGrid: Token drop blocked - no player or locked');
          if (!player) {
            console.log('❌ No player in slot:', slotKey);
          }
          if (player?.is_locked) {
            console.log('❌ Player is locked:', player.player_card.player_name);
          }
        }
      }
      
      if (isPlayerDrop) {
        // This is a player drop
        onPlayerDrop(e, slotKey);
        return;
      }
    } catch (err) {
      console.error('🎯 LineupGrid drop error:', err);
      // Continue with player drop if token detection fails
    }
    
    // This is a player drop (fallback)
    onPlayerDrop(e, slotKey);
  };

  const getPositionAbbreviation = (slotKey) => {
    if (slotKey === 'FLEX') return 'FLEX';
    if (slotKey === 'SUPERFLEX') return 'SUPERFLEX';
    if (slotKey.startsWith('QB')) return 'QB';
    if (slotKey.startsWith('RB')) return 'RB';
    if (slotKey.startsWith('WR')) return 'WR';
    if (slotKey.startsWith('TE')) return 'TE';
    return slotKey;
  };

  const getAvailablePlayersCount = (slotKey) => {
    if (!inventory?.players) return 0;
    
    const posAbbr = getPositionAbbreviation(slotKey);
    
    // Map position abbreviations to full names
    const positionMap = {
      'QB': 'Quarterback',
      'RB': 'Running Back',
      'WR': 'Wide Receiver',
      'TE': 'Tight End',
      'FLEX': ['Running Back', 'Wide Receiver', 'Tight End'],
      'SUPERFLEX': ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End']
    };
    
    const allowedPositions = positionMap[posAbbr];
    
    return inventory.players.filter(p => {
      if (p.is_in_lineup) return false;
      if (Array.isArray(allowedPositions)) {
        return allowedPositions.includes(p.player_card.position);
      }
      return p.player_card.position === allowedPositions;
    }).length;
  };

  // Check if a slot is eligible for the selected player
  const isSlotEligibleForSelectedPlayer = (slotKey) => {
    if (!selectedPlayerForSlot) return false;
    
    const posAbbr = getPositionAbbreviation(slotKey);
    const playerPos = selectedPlayerForSlot.player_card.position;
    
    const positionMap = {
      'QB': ['Quarterback'],
      'RB': ['Running Back'],
      'WR': ['Wide Receiver'],
      'TE': ['Tight End'],
      'FLEX': ['Running Back', 'Wide Receiver', 'Tight End'],
      'SUPERFLEX': ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End']
    };
    
    const allowedPositions = positionMap[posAbbr] || [];
    return allowedPositions.includes(playerPos);
  };

  // Check if a player is eligible for the selected token
  const isPlayerEligibleForSelectedToken = (player) => {
    if (!selectedTokenForPlayer || !player) return false;
    
    // Check if player is locked
    if (player.is_locked) return false;
    
    // Check if player already has an active token
    const hasActiveToken = inventory?.tokens?.some(t => 
      t.applied_to_player_id === player.id && t.is_active
    );
    
    return !hasActiveToken;
  };

  const renderPositionSlot = (slot) => {
    const player = lineup[slot.key];
    
    // Check if player's game is live or final
    const gameData = player ? liveGameData?.get(player.player_card.player_id) : null;
    const gameStatus = gameData?.gameStatus?.toLowerCase();
    const isGameLiveOrFinal = gameStatus === 'live' || gameStatus === 'halftime' || gameStatus === 'final';
    
    // Determine if player is locked
    // In preview mode, ignore database locks (we're setting next week's lineup)
    const isLocked = isPreviewMode ? false : (player?.is_locked || isGameLiveOrFinal);
    const isDragOver = dragOverSlot === slot.key;
    const isHovered = hoveredSlot === slot.key;
    const appliedToken = inventory?.tokens?.find(t => t.applied_to_player_id === player?.id && t.is_active);
    const availableCount = getAvailablePlayersCount(slot.key);
    const posAbbr = getPositionAbbreviation(slot.key);
    const isFilteredSlot = filterPosition === slot.key; // Check if this is the slot being filtered
    
    // Check if this slot is eligible for selected player
    const isEligibleForSelectedPlayer = isSlotEligibleForSelectedPlayer(slot.key);
    
    // Check if this player is eligible for selected token
    const isEligibleForSelectedToken = player && isPlayerEligibleForSelectedToken(player);
    
    // Handle click when player/token is selected
    const handleSlotClick = () => {
      if (selectedPlayerForSlot && isEligibleForSelectedPlayer && onSlotClickWithSelection) {
        onSlotClickWithSelection(slot.key);
      } else if (selectedTokenForPlayer && isEligibleForSelectedToken && onPlayerClickWithTokenSelection) {
        onPlayerClickWithTokenSelection(player);
      } else if (isMobile) {
        // Mobile: Open swap modal (works for both empty slots and filled slots)
        setMobileSwapSlot(slot.key);
      } else if (player && !isLocked) {
        // Desktop: Open modal for player actions
        setModalPlayer(player);
        setModalSlot(slot.key);
      }
    };

    const handleSwap = (slotKey) => {
      // Trigger the click-to-add flow which will filter for this position
      if (onClickToAdd) {
        onClickToAdd(slotKey);
      }
    };

    return (
      <div
        key={slot.key}
        className="relative w-full"
        onMouseEnter={() => setHoveredSlot(slot.key)}
        onMouseLeave={() => setHoveredSlot(null)}
        data-lineup-slot={slot.key}
        onClick={handleSlotClick}
      >
        {/* Card Container with fixed aspect ratio - square on mobile, tall on desktop */}
        <div className="aspect-square md:aspect-[3.2/5] relative">
        <div
          onDragEnter={(e) => !isLocked && handleDragOver(e, slot.key)}
          onDragOver={(e) => !isLocked && handleDragOver(e, slot.key)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => !isLocked && handleDrop(e, slot.key)}
          className={`
            relative rounded-xl transition-all duration-200 w-full h-full
            ${player ? '' : 'border-2'}
            ${isDragOver 
              ? 'border-primary-green-500 bg-primary-green-500/20 scale-105 shadow-lg shadow-primary-green-500/50' 
              : isFilteredSlot && !player
                ? 'border-primary-green-500/50 bg-primary-green-500/10 shadow-md shadow-primary-green-500/30'
                : (selectedPlayerForSlot || selectedTokenForPlayer) && !isEligibleForSelectedPlayer && !isEligibleForSelectedToken
                  ? 'opacity-30 pointer-events-none'
                  : isEligibleForSelectedPlayer
                    ? 'border-primary-green-500/70 bg-primary-green-500/10 cursor-pointer hover:border-primary-green-500 hover:bg-primary-green-500/20'
                    : isEligibleForSelectedToken
                      ? 'border-yellow-500/70 bg-yellow-500/10 cursor-pointer hover:border-yellow-500 hover:bg-yellow-500/20'
                      : player 
                        ? 'bg-transparent' 
                        : 'border-dashed border-primary-black-600 bg-primary-black-800/30'
            }
            ${isHovered && !player && !isLocked && !selectedPlayerForSlot && !selectedTokenForPlayer ? 'border-primary-green-500/50 bg-primary-black-700/50' : ''}
            ${isLocked ? 'opacity-60' : ''}
            ${!player ? 'pointer-events-auto' : ''}
          `}
        >
          {/* Position Label - Only show when player is added - Desktop only now */}
          <div className="hidden md:block absolute top-2 left-2 right-2 z-20">
            {player && (
              <div className="flex items-center justify-center">
                <span className="text-xs font-bold text-primary-black-400 uppercase tracking-wide absolute left-0">
                  {posAbbr}
                </span>
                {/* Remove button - Desktop only */}
                {!isLocked && (
                  <button
                    onClick={() => onRemovePlayer(slot.key)}
                    className="w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg z-20 text-xs font-bold"
                    title="Remove from lineup"
                  >
                    ×
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Player Card or Empty State */}
          <div className="absolute inset-0">
            {player ? (
              <>
                {/* PlayerCard - both mobile and desktop render inside the fixed container */}
                <PlayerCard
                  player={player}
                  onDragStart={(e) => !isLocked && onPlayerDragStart(e, player, slot.key)}
                  onTokenDrop={onTokenDrop}
                  draggable={!isLocked}
                  isLocked={isLocked}
                  appliedToken={appliedToken}
                  onRemoveToken={onRemoveToken}
                  onAddToken={onClickToAddToken}
                  gameData={liveGameData?.get(player.player_card.player_id)}
                  projection={projections?.get(player.player_card.player_id)}
                  size="small"
                  showStats={true}
                  showNameOutside={false}
                  className="w-full h-full rounded-xl"
                />
                
                {/* SWAP overlay for eligible slots */}
                {isEligibleForSelectedPlayer && (
                  <div className="absolute inset-0 bg-primary-green-500/30 rounded-xl flex items-center justify-center pointer-events-none z-10">
                    <span className="text-base md:text-xl font-bold text-white drop-shadow-lg">SWAP</span>
                  </div>
                )}
                
                {/* APPLY overlay for eligible players with selected token */}
                {isEligibleForSelectedToken && (
                  <div className="absolute inset-0 bg-yellow-500/30 rounded-xl flex items-center justify-center pointer-events-none z-10">
                    <span className="text-base md:text-xl font-bold text-white drop-shadow-lg">APPLY</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-col items-center justify-center h-full text-center gap-1 md:gap-2">
                  {/* Position Label */}
                  <p className={`text-sm md:text-base font-bold ${isFilteredSlot ? 'text-primary-green-400 animate-pulse' : 'text-primary-black-400'}`}>
                    {slot.key}
                  </p>
                  
                  {/* Add Button - Hidden on mobile and when slot is being filtered */}
                  {onClickToAdd && !isFilteredSlot && !isMobile && (
                    <button
                      onClick={() => onClickToAdd(slot.key)}
                      className="w-5 h-5 md:w-6 md:h-6 bg-primary-black-700 hover:bg-primary-black-600 border border-primary-black-500 text-primary-black-300 hover:text-primary-black-100 rounded-full text-sm md:text-base font-light transition-all hover:scale-110 flex items-center justify-center"
                      title={`Add ${slot.label}`}
                    >
                      +
                    </button>
                  )}
                  
                  {/* Show hint when filtered */}
                  {isFilteredSlot && (
                    <p className="text-[10px] md:text-xs text-primary-green-400 font-bold animate-pulse">
                      Select below ↓
                    </p>
                  )}
                </div>
                
                {isDragOver && (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary-green-500/10 rounded-xl animate-pulse">
                    <span className="text-primary-green-400 font-bold text-xs md:text-sm">Drop!</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        </div>
      </div>
    );
  };

  // Calculate responsive gap and padding based on available space
  const gapClass = 'gap-2 md:gap-4';
  const paddingClass = 'mb-1';

  // Get eligible bench players for mobile swap modal
  const getEligiblePlayersForSlot = (slotKey) => {
    if (!inventory?.players) return [];
    
    const posAbbr = getPositionAbbreviation(slotKey);
    
    // Map position abbreviations to full names
    const positionMap = {
      'QB': ['Quarterback'],
      'RB': ['Running Back'],
      'WR': ['Wide Receiver'],
      'TE': ['Tight End'],
      'FLEX': ['Running Back', 'Wide Receiver', 'Tight End'],
      'SUPERFLEX': ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End']
    };
    
    const allowedPositions = positionMap[posAbbr] || [];
    
    return inventory.players.filter(p => {
      if (p.is_in_lineup) return false;
      return allowedPositions.some(pos => pos === p.player_card.position);
    });
  };

  // Handle mobile swap - use direct move function instead of drag/drop pattern
  const handleMobileSwap = async (selectedPlayer) => {
    if (!mobileSwapSlot || !selectedPlayer) return;
    
    // Use onMoveToSlot which handles swapping, token removal, and state updates
    await onMoveToSlot(selectedPlayer, mobileSwapSlot);
    
    // Close modal
    setMobileSwapSlot(null);
  };

  return (
    <div className={paddingClass}>
      {/* Mobile: 3x3 grid - 9 slots total */}
      <div className="md:hidden space-y-1">
        {/* Row 1: QB, RB1, RB2 */}
        <div className="grid grid-cols-3 gap-1">
          {positionSlots.slice(0, 3).map(renderPositionSlot)}
        </div>
        
        {/* Row 2: WR1, WR2, WR3 */}
        <div className="grid grid-cols-3 gap-1">
          {positionSlots.slice(3, 6).map(renderPositionSlot)}
        </div>
        
        {/* Row 3: TE, FLEX, SUPERFLEX */}
        <div className="grid grid-cols-3 gap-1">
          {positionSlots.slice(6, 9).map(renderPositionSlot)}
        </div>
      </div>
      
      {/* Desktop Grid */}
      <div className={`hidden md:grid md:grid-cols-3 lg:grid-cols-9 ${gapClass}`}>
        {positionSlots.map(renderPositionSlot)}
      </div>
      
      {/* Desktop: Player Card Modal */}
      {modalPlayer && modalSlot && !isMobile && (
        <PlayerCardModal
          player={modalPlayer}
          slotKey={modalSlot}
          onClose={() => {
            setModalPlayer(null);
            setModalSlot(null);
          }}
          onRemove={() => {
            onRemovePlayer(modalSlot);
          }}
          onSwap={handleSwap}
        />
      )}
      
      {/* Mobile: Player Swap Modal */}
      {mobileSwapSlot && isMobile && (
        <PlayerSwapModal
          currentPlayer={lineup[mobileSwapSlot]}
          slotKey={mobileSwapSlot}
          eligiblePlayers={getEligiblePlayersForSlot(mobileSwapSlot)}
          onSwap={handleMobileSwap}
          onClose={() => setMobileSwapSlot(null)}
          liveGameData={liveGameData}
          projections={projections}
        />
      )}
    </div>
  );
}

LineupGrid.propTypes = {
  lineup: PropTypes.object.isRequired,
  onPlayerDrop: PropTypes.func.isRequired,
  onPlayerDragStart: PropTypes.func.isRequired,
  onTokenDrop: PropTypes.func,
  onClickToAdd: PropTypes.func,
  onClickToAddToken: PropTypes.func,
  onRemovePlayer: PropTypes.func,
  onMoveToSlot: PropTypes.func.isRequired,
  liveGameData: PropTypes.instanceOf(Map),
  projections: PropTypes.instanceOf(Map),
  inventory: PropTypes.object,
  onRemoveToken: PropTypes.func,
  autoSaving: PropTypes.bool,
  filterPosition: PropTypes.string,
  isPreviewMode: PropTypes.bool,
  selectedPlayerForSlot: PropTypes.object,
  selectedTokenForPlayer: PropTypes.object,
  onSlotClickWithSelection: PropTypes.func,
  onPlayerClickWithTokenSelection: PropTypes.func
};
