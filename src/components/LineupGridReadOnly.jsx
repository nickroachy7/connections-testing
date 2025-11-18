import { useState } from 'react';
import PropTypes from 'prop-types';
import PlayerCard from './PlayerCard';

/**
 * LineupGridReadOnly Component
 * 
 * Read-only version of LineupGrid for dashboard display.
 * Shows the starting lineup without drag-and-drop or removal capabilities.
 * Matches the exact design of the Starting Lineup page.
 */
export default function LineupGridReadOnly({
  lineup,
  liveGameData,
  projections,
  inventory
}) {
  const [hoveredSlot, setHoveredSlot] = useState(null);

  // Position slots configuration - same as LineupGrid
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
    const isLocked = player?.is_locked;
    const isHovered = hoveredSlot === slot.key;
    const appliedToken = inventory?.tokens?.find(t => t.applied_to_player_id === player?.id && t.is_active);
    const posAbbr = getPositionAbbreviation(slot.key);

    return (
      <div
        key={slot.key}
        className="relative w-full aspect-[3.2/5]"
        onMouseEnter={() => setHoveredSlot(slot.key)}
        onMouseLeave={() => setHoveredSlot(null)}
      >
        <div
          className={`
            relative rounded-xl border-2 transition-all duration-200 w-full h-full
            ${player 
              ? 'border-primary-black-600 bg-primary-black-800/50' 
              : 'border-dashed border-primary-black-600 bg-primary-black-800/30'
            }
            ${isHovered && !player ? 'border-primary-green-500/50 bg-primary-black-700/50' : ''}
            ${isLocked ? 'opacity-60' : ''}
          `}
        >
          {/* Position Label - NO REMOVE BUTTON */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
            <span className="text-xs font-bold text-primary-black-400 uppercase tracking-wide">
              {posAbbr}
            </span>
          </div>

          {/* Player Card or Empty State */}
          <div className="absolute inset-0 flex flex-col">
            {player ? (
              <div className="relative w-full h-full">
                <PlayerCard
                  player={player}
                  draggable={false}
                  isLocked={isLocked}
                  appliedToken={appliedToken}
                  gameData={liveGameData?.get(player.player_card.player_id)}
                  projection={projections?.get(player.player_card.player_id)}
                  size="small"
                  showStats={true}
                  className="absolute inset-0 rounded-xl"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-3">
                <div className="text-3xl mb-2 opacity-40">
                  {slot.key === 'QB' ? '🏈' : slot.key.startsWith('RB') ? '🏃' : slot.key.startsWith('WR') ? '🙌' : slot.key === 'TE' ? '💪' : '⭐'}
                </div>
                <p className="text-xs mb-3 px-2 font-semibold text-primary-black-500">
                  {slot.label}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const gapClass = 'gap-4';
  const paddingClass = 'mb-1';

  return (
    <div className={paddingClass}>
      {/* Lineup Grid - Same responsive layout as LineupGrid */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 ${gapClass}`}>
        {positionSlots.map(renderPositionSlot)}
      </div>
    </div>
  );
}

LineupGridReadOnly.propTypes = {
  lineup: PropTypes.object.isRequired,
  liveGameData: PropTypes.instanceOf(Map),
  projections: PropTypes.instanceOf(Map),
  inventory: PropTypes.object
};
