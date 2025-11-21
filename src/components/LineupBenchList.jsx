import PropTypes from 'prop-types';
import PlayerList from './PlayerList';
import DraggablePlayerCard from './DraggablePlayerCard';

/**
 * LineupBenchList
 * 
 * Specialized list for lineup management with:
 * - Drag-and-drop support
 * - Token management
 * - Lock status handling
 * - Game status awareness
 */
export default function LineupBenchList({ 
  players = [],
  onDragStart,
  onDragEnd,
  gameDataMap = {},
  projectionMap = {},
  appliedTokensMap = {},
  onRemoveToken,
  onTokenDrop,
  lockedPlayerIds = [],
  showStats = true,
  className = ''
}) {
  
  // Render individual draggable card
  const renderPlayer = (player) => {
    const isLocked = lockedPlayerIds.includes(player.id);
    
    return (
      <DraggablePlayerCard
        key={player.id}
        player={player}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        gameData={gameDataMap[player.id]}
        projection={projectionMap[player.id]}
        appliedToken={appliedTokensMap[player.id]}
        onRemoveToken={onRemoveToken}
        onTokenDrop={onTokenDrop}
        isLocked={isLocked}
        showStats={showStats}
      />
    );
  };

  return (
    <PlayerList
      players={players}
      renderPlayer={renderPlayer}
      emptyMessage="No players on bench"
      gridLayout={true}
      columns="grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      className={className}
    />
  );
}

LineupBenchList.propTypes = {
  players: PropTypes.array,
  onDragStart: PropTypes.func,
  onDragEnd: PropTypes.func,
  gameDataMap: PropTypes.object,
  projectionMap: PropTypes.object,
  appliedTokensMap: PropTypes.object,
  onRemoveToken: PropTypes.func,
  onTokenDrop: PropTypes.func,
  lockedPlayerIds: PropTypes.array,
  showStats: PropTypes.bool,
  className: PropTypes.string
};
