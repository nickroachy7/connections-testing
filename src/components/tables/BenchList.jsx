import PropTypes from 'prop-types';
import PlayerRow from './PlayerRow';

/**
 * BenchList - Bench players list with add-to-lineup functionality
 * 
 * Displays bench players (not in starting lineup)
 * Uses canonical PlayerRow component for consistency
 * Shows "Add to Lineup" button for each player
 * 
 * Used in: BenchFilterManager (Bench tab)
 */
const BenchList = ({
  benchPlayers = [],
  onPlayerClick = null,
  onAddToLineup = null,
  onSell = null,
  liveGameData = null,
  projections = null,
  isMobile = false,
  teamStartsNextWeek = false
}) => {
  if (benchPlayers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-primary-black-500 mb-2">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <div className="text-sm text-primary-black-400">No bench players</div>
        <div className="text-xs text-primary-black-600 mt-1">
          Add players from your inventory
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {benchPlayers.map((player, index) => {
        const gameData = liveGameData?.get(player.player_card?.player_id);
        const gameStatus = gameData?.gameStatus?.toLowerCase();
        const isGameLiveOrFinal = gameStatus === 'live' || gameStatus === 'halftime' || gameStatus === 'final';
        const isLocked = player?.is_locked || isGameLiveOrFinal;

        return (
          <div key={player.id} className="relative">
            <PlayerRow
              player={player}
              index={index}
              liveGameData={liveGameData}
              projections={projections}
              showBenchBadge={true}
              showAddButton={onAddToLineup ? true : false}
              isLocked={isLocked}
              teamStartsNextWeek={teamStartsNextWeek}
              onClick={() => {
                if (onPlayerClick) {
                  onPlayerClick(player);
                }
              }}
              onAddToLineup={onAddToLineup && !isLocked ? () => onAddToLineup(player) : null}
              onSell={onSell && !isLocked ? onSell : null}
            />
          </div>
        );
      })}
    </div>
  );
};

BenchList.propTypes = {
  benchPlayers: PropTypes.array,
  onPlayerClick: PropTypes.func,
  onAddToLineup: PropTypes.func,
  onSell: PropTypes.func,
  liveGameData: PropTypes.object,
  projections: PropTypes.object,
  isMobile: PropTypes.bool,
  teamStartsNextWeek: PropTypes.bool
};

export default BenchList;
