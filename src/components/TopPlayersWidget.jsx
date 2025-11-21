import PropTypes from 'prop-types';
import PlayerList from './PlayerList';
import CompactPlayerCard from './CompactPlayerCard';

/**
 * TopPlayersWidget
 * 
 * Specialized list for dashboard/overview displays:
 * - Shows top N players (default 5)
 * - Compact card format
 * - Horizontal scrollable layout
 * - Optional click handling for navigation
 */
export default function TopPlayersWidget({ 
  players = [],
  maxPlayers = 5,
  onPlayerClick,
  showProjections = false,
  gameDataMap = {},
  projectionMap = {},
  title = "Top Players",
  className = ''
}) {
  
  // Limit to top N players
  const topPlayers = players.slice(0, maxPlayers);

  // Render individual compact card
  const renderPlayer = (player) => (
    <CompactPlayerCard
      key={player.id}
      player={player}
      onClick={onPlayerClick ? () => onPlayerClick(player) : undefined}
      showProjection={showProjections}
      gameData={gameDataMap[player.id]}
      projection={projectionMap[player.id]}
    />
  );

  return (
    <div className={`bg-gray-800/50 rounded-lg p-4 ${className}`}>
      {/* Widget Header */}
      {title && (
        <h3 className="text-lg font-semibold text-gray-200 mb-3">
          {title}
        </h3>
      )}

      {/* Horizontal Scrollable Player List */}
      <PlayerList
        players={topPlayers}
        renderPlayer={renderPlayer}
        emptyMessage="No top players to display"
        gridLayout={false}
        className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
      />
    </div>
  );
}

TopPlayersWidget.propTypes = {
  players: PropTypes.array,
  maxPlayers: PropTypes.number,
  onPlayerClick: PropTypes.func,
  showProjections: PropTypes.bool,
  gameDataMap: PropTypes.object,
  projectionMap: PropTypes.object,
  title: PropTypes.string,
  className: PropTypes.string
};
