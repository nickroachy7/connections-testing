import PropTypes from 'prop-types';

/**
 * BenchCarousel Component
 * 
 * List view of bench players that sits directly below the starting lineup.
 * Features:
 * - Compact list view with all player info visible
 * - Quick drag-and-drop to lineup above
 * - No scrolling needed for reasonable bench sizes
 */
export default function BenchCarousel({
  benchPlayers,
  onPlayerDragStart,
  onPlayerDrop,
  liveGameData,
  projections,
  inventory,
  onRemoveToken
}) {
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'legendary': return 'border-yellow-500/50 bg-yellow-500/5';
      case 'epic': return 'border-purple-500/50 bg-purple-500/5';
      case 'rare': return 'border-blue-500/50 bg-blue-500/5';
      default: return 'border-primary-black-600 bg-primary-black-800/30';
    }
  };

  const getRarityBadgeColor = (rarity) => {
    switch (rarity) {
      case 'legendary': return 'bg-yellow-600 text-yellow-100';
      case 'epic': return 'bg-purple-600 text-purple-100';
      case 'rare': return 'bg-blue-600 text-blue-100';
      default: return 'bg-gray-600 text-gray-100';
    }
  };

  const getGameStatusBadge = (playerId) => {
    const gameData = liveGameData?.get(playerId);
    
    // If no game data, player is on BYE
    if (!gameData) {
      return (
        <span className="px-2 py-1 bg-primary-black-700 text-primary-black-300 rounded text-xs font-bold">
          BYE WEEK
        </span>
      );
    }
    
    const { gameStatus, currentPoints, opponent, isHome } = gameData;
    
    switch (gameStatus) {
      case 'live':
      case 'halftime':
        return (
          <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold flex items-center gap-1">
            <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
            LIVE • {currentPoints.toFixed(1)} pts
          </span>
        );
      case 'final':
        return (
          <span className="px-2 py-1 bg-green-600 text-white rounded text-xs font-bold">
            ✓ {currentPoints.toFixed(1)} pts
          </span>
        );
      case 'scheduled':
        return (
          <span className="px-2 py-1 bg-primary-black-700 text-primary-black-300 rounded text-xs">
            {isHome ? 'vs' : '@'} {opponent}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-primary-black-900 rounded-2xl">
      {/* Header */}
      <div className="border-b border-primary-black-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🪑</span>
            <div>
              <h3 className="text-lg font-bold text-primary-black-50">Bench</h3>
              <p className="text-xs text-primary-black-400">
                {benchPlayers.length} {benchPlayers.length === 1 ? 'player' : 'players'} • Drag to lineup above
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* List View */}
      <div
        onDragOver={handleDragOver}
        onDrop={onPlayerDrop}
        className="px-4 py-3"
      >
        {benchPlayers.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-center border-2 border-dashed border-primary-black-700 rounded-lg">
            <div>
              <div className="text-4xl mb-2 opacity-30">🪑</div>
              <p className="text-primary-black-400 font-semibold mb-1">Bench is empty</p>
              <p className="text-primary-black-500 text-sm">Drag players from your lineup here</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {benchPlayers.map((player) => {
              const appliedToken = inventory?.tokens?.find(t => t.applied_to_player_id === player.id && t.is_active);
              
              return (
                <div
                  key={player.id}
                  draggable
                  onDragStart={(e) => onPlayerDragStart(e, player, 'BENCH')}
                  className={`
                    flex items-center gap-4 p-3 rounded-lg border-2 transition-all cursor-move
                    hover:border-primary-green-500 hover:shadow-lg
                    ${getTierBorderColor(player.card_tier)}
                  `}
                >
                  {/* Tier Badge */}
                  <div className={`px-2 py-1 rounded text-xs font-bold ${getTierBadgeColor(player.card_tier)}`}>
                    {getTierBadgeInitial(player.card_tier)}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-primary-black-50 truncate">
                        {player.player_card.player_name}
                      </h4>
                      <span className="text-xs text-primary-black-400">
                        {player.player_card.position}
                      </span>
                      <span className="text-xs text-primary-black-500">
                        {player.player_card.team_abbreviation}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-primary-black-400">
                      <span>Level {player.card_level}</span>
                      {player.total_fantasy_points > 0 && (
                        <span>{player.total_fantasy_points.toFixed(1)} pts total</span>
                      )}
                    </div>
                  </div>

                  {/* Game Status */}
                  <div className="flex-shrink-0">
                    {getGameStatusBadge(player.player_card.player_id)}
                  </div>

                  {/* Applied Token */}
                  {appliedToken && (
                    <div className="flex-shrink-0 px-3 py-1 bg-primary-green-500/20 border border-primary-green-500 rounded-lg text-xs text-primary-green-400 font-semibold">
                      💎 +{appliedToken.token_card.bonus_points}
                    </div>
                  )}

                  {/* Drag Handle */}
                  <div className="flex-shrink-0 text-primary-black-600 text-xl">
                    ⋮⋮
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

BenchCarousel.propTypes = {
  benchPlayers: PropTypes.array.isRequired,
  onPlayerDragStart: PropTypes.func.isRequired,
  onPlayerDrop: PropTypes.func,
  liveGameData: PropTypes.instanceOf(Map),
  projections: PropTypes.instanceOf(Map),
  inventory: PropTypes.object,
  onRemoveToken: PropTypes.func
};
