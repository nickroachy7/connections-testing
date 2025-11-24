import PropTypes from 'prop-types';
import PlayerCard from './PlayerCard';

/**
 * LineupHorizontalView Component
 * 
 * Displays lineup in a single horizontal scrollable row
 */
export default function LineupHorizontalView({
  lineup,
  onPlayerDragStart,
  onTokenDrop,
  onRemovePlayer,
  liveGameData,
  projections,
  inventory,
  onRemoveToken,
  onClickToAddToken,
  onPlayerClick,
  isPreviewMode = false
}) {
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

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <div className="flex gap-1 min-w-max">
        {positionSlots.map((slot) => {
          const player = lineup[slot.key];
          const gameData = player ? liveGameData?.get(player.player_card.player_id) : null;
          const gameStatus = gameData?.gameStatus?.toLowerCase();
          const isGameLiveOrFinal = gameStatus === 'live' || gameStatus === 'halftime' || gameStatus === 'final';
          const isLocked = isPreviewMode ? false : (player?.is_locked || isGameLiveOrFinal);
          const appliedToken = inventory?.tokens?.find(t => t.applied_to_player_id === player?.id && t.is_active);

          return (
            <div key={slot.key} className="flex-shrink-0 w-[calc((100vw-2rem)/3)] sm:w-32">
              {/* Card Container */}
              <div className="aspect-square relative">
                {player ? (
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
                    className="w-full h-full"
                    onClick={() => !isLocked && onPlayerClick && onPlayerClick(player, slot.key)}
                  />
                ) : (
                  <div className="w-full h-full border-2 border-dashed border-primary-black-600 bg-primary-black-800/30 rounded-lg flex items-center justify-center">
                    <span className="text-xs text-primary-black-500 font-bold">Empty</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

LineupHorizontalView.propTypes = {
  lineup: PropTypes.object.isRequired,
  onPlayerDragStart: PropTypes.func.isRequired,
  onTokenDrop: PropTypes.func,
  onRemovePlayer: PropTypes.func,
  liveGameData: PropTypes.instanceOf(Map),
  projections: PropTypes.instanceOf(Map),
  inventory: PropTypes.object,
  onRemoveToken: PropTypes.func,
  onClickToAddToken: PropTypes.func,
  onPlayerClick: PropTypes.func,
  isPreviewMode: PropTypes.bool
};
