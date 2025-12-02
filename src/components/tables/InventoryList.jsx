import { useState } from 'react';
import PropTypes from 'prop-types';
import PlayerRow from './PlayerRow';

/**
 * InventoryList - Full inventory with bulk select/sell functionality
 * 
 * Displays all owned player cards with filtering/sorting
 * Uses canonical PlayerRow component for consistency
 * Supports bulk selection and selling
 * 
 * Used in: InventoryPanel (Inventory page)
 */
const InventoryList = ({
  players = [],
  onPlayerClick = null,
  onSell = null,
  onBulkSell = null,
  liveGameData = null,
  projections = null,
  isMobile = false,
  showBulkSelect = false,
  teamStartsNextWeek = false
}) => {
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());

  const handleToggleSelect = (playerId) => {
    setSelectedPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedPlayers.size === players.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(players.map(p => p.id)));
    }
  };

  const handleBulkSell = () => {
    if (onBulkSell && selectedPlayers.size > 0) {
      const playersToSell = players.filter(p => selectedPlayers.has(p.id));
      onBulkSell(playersToSell);
      setSelectedPlayers(new Set());
    }
  };

  if (players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-primary-black-500 mb-2">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <div className="text-sm text-primary-black-400">No players in inventory</div>
        <div className="text-xs text-primary-black-600 mt-1">
          Open packs to collect players
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Bulk Actions Header - Desktop Only */}
      {showBulkSelect && (
        <div className="hidden md:flex sticky top-0 z-10 bg-primary-black-800 border-b border-primary-black-700 px-4 py-3 items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-sm text-primary-black-300 hover:text-white transition-colors"
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                selectedPlayers.size === players.length
                  ? 'bg-blue-600 border-blue-600'
                  : 'border-primary-black-600 hover:border-blue-500'
              }`}>
                {selectedPlayers.size === players.length && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span>
                {selectedPlayers.size === players.length ? 'Deselect All' : 'Select All'}
              </span>
            </button>
            {selectedPlayers.size > 0 && (
              <span className="text-xs text-primary-black-500">
                {selectedPlayers.size} selected
              </span>
            )}
          </div>
          {selectedPlayers.size > 0 && (
            <button
              onClick={handleBulkSell}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Sell Selected ({selectedPlayers.size})
            </button>
          )}
        </div>
      )}

      {/* Player List */}
      {players.map((player, index) => {
        const gameData = liveGameData?.get(player.player_card?.player_id);
        const gameStatus = gameData?.gameStatus?.toLowerCase();
        const isGameLiveOrFinal = gameStatus === 'live' || gameStatus === 'halftime' || gameStatus === 'final';
        const isLocked = player?.is_locked || isGameLiveOrFinal;
        const isSelected = selectedPlayers.has(player.id);

        return (
          <div key={player.id} className="relative">
            <PlayerRow
              player={player}
              index={index}
              liveGameData={liveGameData}
              projections={projections}
              showBulkSelect={showBulkSelect}
              isSelected={isSelected}
              isLocked={isLocked}
              teamStartsNextWeek={teamStartsNextWeek}
              onClick={() => {
                if (showBulkSelect) {
                  handleToggleSelect(player.id);
                } else if (onPlayerClick) {
                  onPlayerClick(player);
                }
              }}
              onSell={onSell && !isLocked && !showBulkSelect ? onSell : null}
            />
          </div>
        );
      })}
    </div>
  );
};

InventoryList.propTypes = {
  players: PropTypes.array,
  onPlayerClick: PropTypes.func,
  onSell: PropTypes.func,
  onBulkSell: PropTypes.func,
  liveGameData: PropTypes.object,
  projections: PropTypes.object,
  isMobile: PropTypes.bool,
  showBulkSelect: PropTypes.bool,
  teamStartsNextWeek: PropTypes.bool
};

export default InventoryList;
