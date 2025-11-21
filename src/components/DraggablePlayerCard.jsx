import PropTypes from 'prop-types';
import PlayerCard from './PlayerCard';

/**
 * DraggablePlayerCard
 * 
 * Wraps PlayerCard with enhanced drag-and-drop functionality.
 * Used on Lineup/Bench for moving players between positions.
 */
export default function DraggablePlayerCard({ 
  player, 
  onDragStart,
  onDragEnd,
  gameData = null,
  projection = null,
  appliedToken = null,
  onRemoveToken,
  onTokenDrop,
  isLocked = false,
  showStats = true
}) {
  const handleDragStart = (e) => {
    if (isLocked) {
      e.preventDefault();
      return;
    }
    
    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      playerId: player.id,
      player: player
    }));

    // Visual feedback
    e.target.style.opacity = '0.5';
    
    // Callback to parent
    onDragStart?.(player, e);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    onDragEnd?.(player, e);
  };

  return (
    <div 
      draggable={!isLocked}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`${isLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
    >
      <PlayerCard 
        player={player}
        gameData={gameData}
        projection={projection}
        appliedToken={appliedToken}
        onRemoveToken={onRemoveToken}
        onTokenDrop={onTokenDrop}
        isLocked={isLocked}
        showStats={showStats}
        draggable={!isLocked}
      />
    </div>
  );
}

DraggablePlayerCard.propTypes = {
  player: PropTypes.object.isRequired,
  onDragStart: PropTypes.func,
  onDragEnd: PropTypes.func,
  gameData: PropTypes.object,
  projection: PropTypes.object,
  appliedToken: PropTypes.object,
  onRemoveToken: PropTypes.func,
  onTokenDrop: PropTypes.func,
  isLocked: PropTypes.bool,
  showStats: PropTypes.bool
};
