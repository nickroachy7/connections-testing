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
  isPreviewMode = false, // If true, ignore player locks (previewing next week)
  selectedPlayerForSlot = null,
  selectedTokenForPlayer = null,
  onSlotClickWithSelection = null,
  onPlayerClickWithTokenSelection = null
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
      
      if (isTokenDrop || isTokenDrag) {
        // This is a token drop, don't handle here - let PlayerCard handle it
        console.log('⚠️ Token drop detected in LineupGrid - ignoring');
        setDragOverSlot(null);
        return;
      }
      
      // This is a player drop
      e.preventDefault();
      console.log('🎯 Calling onPlayerDrop for slot:', slotKey);
      onPlayerDrop(e, slotKey);
    } catch (err) {
      console.error('🎯 LineupGrid drop error:', err);
      // Fallback to player drop
      e.preventDefault();
      onPlayerDrop(e, slotKey);
    }
    
    setDragOverSlot(null);
  };

  const getPositionAbbreviation = (slotKey) => {
    if (slotKey === 'FLEX') return 'FLEX';
    if (slotKey.startsWith('QB')) return 'QB';
    if (slotKey.startsWith('RB')) return 'RB';
    if (slotKey.startsWith('WR')) return 'WR';
    if (slotKey.startsWith('TE')) return 'TE';
    return slotKey;
  };

  const renderPositionSlot = (slot) => {
    const player = lineup[slot.key];
    const isLocked = isPreviewMode ? false : player?.is_locked; // Ignore locks in preview mode
    const isDragOver = dragOverSlot === slot.key;
    const isHovered = hoveredSlot === slot.key;
    const appliedToken = inventory?.tokens?.find(t => t.applied_to_player_id === player?.id && t.is_active);
    const posAbbr = getPositionAbbreviation(slot.key);

    // Check if this slot matches the filter (highlight it)
    const isFilteredSlot = filterPosition === slot.key;

    // Check if this slot is eligible for the selected player from bench
    const isEligibleForSelectedPlayer = selectedPlayerForSlot && (
      (slot.key === 'FLEX' && ['Running Back', 'Wide Receiver', 'Tight End'].includes(selectedPlayerForSlot.player_card.position)) ||
      (slot.key.startsWith('QB') && selectedPlayerForSlot.player_card.position === 'Quarterback') ||
      (slot.key.startsWith('RB') && selectedPlayerForSlot.player_card.position === 'Running Back') ||
      (slot.key.startsWith('WR') && selectedPlayerForSlot.player_card.position === 'Wide Receiver') ||
      (slot.key.startsWith('TE') && selectedPlayerForSlot.player_card.position === 'Tight End')
    );

    // Check if this player is eligible for the selected token
    const isEligibleForSelectedToken = selectedTokenForPlayer && player && !appliedToken;

    return (
      <div
        key={slot.key}
        className="relative w-full aspect-[3.2/5]"
        onMouseEnter={() => setHoveredSlot(slot.key)}
        onMouseLeave={() => setHoveredSlot(null)}
        onClick={() => {
          if (isEligibleForSelectedPlayer) {
            onSlotClickWithSelection?.(slot.key);
          } else if (isEligibleForSelectedToken) {
            onPlayerClickWithTokenSelection?.(player);
          }
        }}
      >
        <div
          onDragOver={(e) => handleDragOver(e, slot.key)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, slot.key)}
          data-lineup-slot={slot.key}
          className={`
            relative rounded-xl border-2 transition-all duration-200 w-full h-full
            ${
              player 
                ? 'border-primary-black-600 bg-primary-black-800/50' 
                : 'border-dashed border-primary-black-600 bg-primary-black-800/30'
            }
            ${
              isFilteredSlot 
                ? 'border-primary-green-500 bg-primary-green-500/10 animate-pulse shadow-lg shadow-primary-green-500/30' 
                : ''
            }
            ${
              isEligibleForSelectedPlayer 
                ? 'border-primary-green-500 bg-primary-green-500/20 cursor-pointer hover:bg-primary-green-500/30 ring-2 ring-primary-green-500' 
                : ''
            }
            ${
              isEligibleForSelectedToken 
                ? 'border-yellow-500 bg-yellow-500/20 cursor-pointer hover:bg-yellow-500/30 ring-2 ring-yellow-500' 
                : ''
            }
            ${
              isDragOver && !isFilteredSlot && !isEligibleForSelectedPlayer && !isEligibleForSelectedToken
                ? 'border-primary-green-500 bg-primary-green-500/20 scale-105 shadow-lg shadow-primary-green-500/30' 
                : ''
            }
            ${
              isHovered && !player && !isFilteredSlot && !isEligibleForSelectedPlayer && !isEligibleForSelectedToken
                ? 'border-primary-green-500/50 bg-primary-black-700/50' 
                : ''
            }
            ${
              isLocked ? 'opacity-60' : ''
            }
          `}
        >
          {/* Position Label + Remove Button */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
            <span className="text-xs font-bold text-primary-black-400 uppercase tracking-wide">
              {posAbbr}
            </span>
            {player && onRemovePlayer && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemovePlayer(slot.key);
                }}
                className="text-primary-black-600 hover:text-red-500 transition-colors"
                title="Remove player"
              >
                ×
              </button>
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
                  liveGameData={liveGameData}
                  projection={projections?.get(player.player_card.player_id)}
                  size="small"
                  showStats={true}
                  className="absolute inset-0 rounded-xl"
                />
                
                {/* SWAP overlay for eligible slots */}
                {isEligibleForSelectedPlayer && (
                  <div className="absolute inset-0 bg-primary-green-500/30 rounded-xl flex items-center justify-center pointer-events-none z-10">
                    <span className="text-xl font-bold text-white drop-shadow-lg">SWAP</span>
                  </div>
                )}
                
                {/* APPLY overlay for eligible players with selected token */}
                {isEligibleForSelectedToken && (
                  <div className="absolute inset-0 bg-yellow-500/30 rounded-xl flex items-center justify-center pointer-events-none z-10">
                    <span className="text-xl font-bold text-white drop-shadow-lg">APPLY</span>
                  </div>
                )}
              </div>
             ) : (
               <>
                 <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                   {/* Position Label */}
                   <p className={`text-base font-bold ${isFilteredSlot ? 'text-primary-green-400 animate-pulse' : 'text-primary-black-400'}`}>
                     {slot.key}
                   </p>
                   
                   {/* Add Button - Hidden when this slot is being filtered */}
                   {onClickToAdd && !isFilteredSlot && (
                     <button
                       onClick={() => onClickToAdd(slot.key)}
                       className="w-6 h-6 bg-primary-black-700 hover:bg-primary-black-600 border border-primary-black-500 text-primary-black-300 hover:text-primary-black-100 rounded-full text-base font-light transition-all hover:scale-110 flex items-center justify-center"
                       title={`Add ${slot.label}`}
                     >
                       +
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
      {/* Lineup Grid - Responsive 2x4 layout */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 ${gapClass}`}>
        {positionSlots.map(renderPositionSlot)}
      </div>
    </div>
  );
}

LineupGrid.propTypes = {
  lineup: PropTypes.object.isRequired,
  onPlayerDrop: PropTypes.func,
  onPlayerDragStart: PropTypes.func,
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
  isPreviewMode: PropTypes.bool,
  selectedPlayerForSlot: PropTypes.object,
  selectedTokenForPlayer: PropTypes.object,
  onSlotClickWithSelection: PropTypes.func,
  onPlayerClickWithTokenSelection: PropTypes.func
};
