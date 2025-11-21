import PropTypes from 'prop-types';
import PlayerCard from './PlayerCard';

/**
 * CompactPlayerCard
 * 
 * Minimal version of PlayerCard for dashboard widgets and previews.
 * Shows essential info only (name, position, tier) in a smaller format.
 */
export default function CompactPlayerCard({ 
  player,
  onClick,
  showProjection = false,
  gameData = null,
  projection = null
}) {
  return (
    <PlayerCard 
      player={player}
      gameData={gameData}
      projection={projection}
      size="small"
      showStats={showProjection}
      draggable={false}
      onClick={onClick}
      className="min-w-[140px]" // Ensures consistent compact size
    />
  );
}

CompactPlayerCard.propTypes = {
  player: PropTypes.object.isRequired,
  onClick: PropTypes.func,
  showProjection: PropTypes.bool,
  gameData: PropTypes.object,
  projection: PropTypes.object
};
