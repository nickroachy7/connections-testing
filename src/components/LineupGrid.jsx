import { useState } from 'react';
import PropTypes from 'prop-types';
import PlayerCard from './PlayerCard';

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
  liveGameData,
  projections,
  inventory,
  onRemoveToken,
  autoSaving = false,
  filterPosition = null,
  isPreviewMode = false // If true, ignore player locks (previewing next week)
}) {
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [hoveredSlot, setHoveredSlot] = useState(null);

  // Position slots configuration - single horizontal row
  const positionSlots = [
    { key: 'QB', label: 'Quarterback' },
    { key: 'RB1', label: 'Running Back' },
    { key: 'RB2', label: 'Running Back' },
    { key: 'WR1', label: 'Wide Receiver' },
    { key: 'WR2', label: 'Wide Receiver' },
    { key: 'WR3', label: 'Wide Receiver' },
    { key: 'TE', label: 'Tight End' },
    { key: 'FLEX', label: 'Flex (RB/WR/TE)' }
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
      'FLEX': ['Running Back', 'Wide Receiver', 'Tight End']
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

    return (
      <div
        key={slot.key}
        className="relative w-full aspect-[3.2/5]"
        onMouseEnter={() => setHoveredSlot(slot.key)}
        onMouseLeave={() => setHoveredSlot(null)}
        data-lineup-slot={slot.key}
      >
        <div
          onDragEnter={(e) => !isLocked && handleDragOver(e, slot.key)}
          onDragOver={(e) => !isLocked && handleDragOver(e, slot.key)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => !isLocked && handleDrop(e, slot.key)}
           className={`
             relative rounded-xl border-2 transition-all duration-200 w-full h-full
             ${isDragOver 
               ? 'border-primary-green-500 bg-primary-green-500/20 scale-105 shadow-lg shadow-primary-green-500/50' 
               : isFilteredSlot && !player
                 ? 'border-primary-green-500/50 bg-primary-green-500/10 shadow-md shadow-primary-green-500/30'
                 : player 
                   ? 'border-primary-black-600 bg-primary-black-800/50' 
                   : 'border-dashed border-primary-black-600 bg-primary-black-800/30'
             }
             ${isHovered && !player && !isLocked ? 'border-primary-green-500/50 bg-primary-black-700/50' : ''}
             ${isLocked ? 'opacity-60' : ''}
             ${!player ? 'pointer-events-auto' : ''}
           `}
        >
          {/* Position Label */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-center">
            <span className="text-xs font-bold text-primary-black-400 uppercase tracking-wide absolute left-0">
              {posAbbr}
            </span>
            {/* Remove button - centered at top */}
            {player && !isLocked && (
              <button
                onClick={() => onRemovePlayer(slot.key)}
                className="w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg z-20 text-xs font-bold"
                title="Remove from lineup"
              >
                ×
              </button>
            )}
            {!player && availableCount > 0 && (
              <span className="text-xs text-primary-green-400 font-semibold absolute right-0">
                {availableCount}
              </span>
            )}
          </div>

          {/* Player Card or Empty State */}
          <div className="absolute inset-0 flex flex-col">
            {player ? (
              <div className="relative w-full h-full">
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
                  className="absolute inset-0 rounded-xl"
                />
              </div>
             ) : (
               <>
                 <div className="flex flex-col items-center justify-center h-full text-center p-3">
                   <div className={`text-3xl mb-2 transition-opacity ${isFilteredSlot ? 'opacity-70 animate-pulse' : 'opacity-40'}`}>
                     {slot.key === 'QB' ? '🏈' : slot.key.startsWith('RB') ? '🏃' : slot.key.startsWith('WR') ? '🙌' : slot.key === 'TE' ? '💪' : '⭐'}
                   </div>
                   <p className={`text-xs mb-3 px-2 font-semibold ${isFilteredSlot ? 'text-primary-green-400' : 'text-primary-black-500'}`}>
                     {slot.label}
                   </p>
                   
                   {/* Click to add button - Hidden when this slot is being filtered */}
                   {onClickToAdd && !isFilteredSlot && (
                     <button
                       onClick={() => onClickToAdd(slot.key)}
                       className="px-3 py-1.5 bg-primary-green-500/20 hover:bg-primary-green-500/30 border border-primary-green-500/50 text-primary-green-400 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                     >
                       + Add
                     </button>
                   )}
                   
                   {/* Show hint when filtered */}
                   {isFilteredSlot && (
                     <p className="text-xs text-primary-green-400 font-bold animate-pulse">
                       Select below ↓
                     </p>
                   )}
                 </div>
                 
                 {isDragOver && (
                   <div className="absolute inset-0 flex items-center justify-center bg-primary-green-500/10 rounded-xl animate-pulse">
                     <span className="text-primary-green-400 font-bold text-sm">Drop!</span>
                   </div>
                 )}
               </>
             )}
          </div>
        </div>
      </div>
    );
  };

  // Calculate responsive gap and padding based on available space
  const gapClass = 'gap-4';
  const paddingClass = 'mb-1';

  return (
    <div className={paddingClass}>
      {/* Lineup Grid */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 ${gapClass}`}>
        {positionSlots.map(renderPositionSlot)}
      </div>
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
  liveGameData: PropTypes.instanceOf(Map),
  projections: PropTypes.instanceOf(Map),
  inventory: PropTypes.object,
  onRemoveToken: PropTypes.func,
  autoSaving: PropTypes.bool,
  filterPosition: PropTypes.string,
  isPreviewMode: PropTypes.bool
};
