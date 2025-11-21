import PropTypes from 'prop-types';

/**
 * PlayerList - Base Component
 * 
 * Generic list container for rendering collections of players.
 * Uses render prop pattern for maximum flexibility while maintaining consistent layout.
 * 
 * This component handles:
 * - Base layout/grid structure
 * - Empty state messaging
 * - Consistent spacing/styling
 * 
 * Delegates player rendering to specialized child components via renderPlayer prop.
 */
export default function PlayerList({ 
  players = [], 
  renderPlayer, 
  className = '',
  emptyMessage = 'No players found',
  gridLayout = true, // true for grid, false for flex
  columns = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
}) {
  // Handle empty state
  if (!players || players.length === 0) {
    return (
      <div className={`text-center py-12 text-gray-400 ${className}`}>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  // Base layout classes
  const layoutClass = gridLayout 
    ? `grid ${columns} gap-4`
    : 'flex flex-wrap gap-4';

  return (
    <div className={`${layoutClass} ${className}`}>
      {players.map((player) => renderPlayer(player))}
    </div>
  );
}

PlayerList.propTypes = {
  players: PropTypes.array,
  renderPlayer: PropTypes.func.isRequired,
  className: PropTypes.string,
  emptyMessage: PropTypes.string,
  gridLayout: PropTypes.bool,
  columns: PropTypes.string
};
