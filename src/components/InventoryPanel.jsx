import { useState } from 'react';
import PropTypes from 'prop-types';
import InventoryList from './tables/InventoryList';
import TokenTable from './tables/TokenTable';
import { enrichPlayerData, enrichTokenData } from '../utils/enrichPlayerData';
import PlayerCard from './PlayerCard';

/**
 * InventoryPanel Component - REFACTORED VERSION
 * 
 * Uses unified PlayerTable and TokenTable components for consistency.
 * Much simpler and more maintainable than the original 1000+ line version.
 */
export default function InventoryPanel({
  players,
  tokens,
  projections,
  loadingProjections,
  liveGameData,
  onQuickSell,
  onSell,
  onSellToken,
  onPlayerClick, // NEW: Handle player click to open profile modal
  onBulkSellComplete,
  onReloadProfile,
  selling,
  filters,
  onFilterChange,
  inventory,
  viewMode = 'list' // 'list' or 'grid'
}) {
  const [selectedForBulkAction, setSelectedForBulkAction] = useState([]);
  
  // Determine active tab based on filters.tokenType from parent
  const activeTab = filters.tokenType === 'none' ? 'players' : 
                    filters.tokenType === 'tokens-only' ? 'tokens' : 'all';

  // Sort players by position
  const getPositionOrder = (position) => {
    const order = { 'Quarterback': 1, 'Running Back': 2, 'Wide Receiver': 3, 'Tight End': 4 };
    return order[position] || 999;
  };

  const sortedPlayers = [...players].sort((a, b) => 
    getPositionOrder(a.player_card.position) - getPositionOrder(b.player_card.position)
  );

  // Enrich player data with live game info and projections
  const enrichedPlayers = sortedPlayers.map(player => {
    // Use base_value from player_cards table as sell value
    const sellValue = player.player_card?.base_value || 0;
    const enriched = enrichPlayerData(player, liveGameData, projections);
    return {
      ...enriched,
      sellValue
    };
  });

  // Enrich token data
  const enrichedTokens = tokens.map(token => {
    // Use base_value from token_cards table as sell value
    const sellValue = token.token_card?.base_value || 0;
    const enriched = enrichTokenData(token);
    return {
      ...enriched,
      sellValue
    };
  });

  // Filter players
  const filteredPlayers = enrichedPlayers.filter(player => {
    const matchesPosition = filters.position === 'all' || player.player_card.position === filters.position;
    const matchesSearch = filters.search === '' || 
      player.player_card.player_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      player.player_card.team_abbreviation.toLowerCase().includes(filters.search.toLowerCase());
    return matchesPosition && matchesSearch;
  });

  // Filter tokens
  const filteredTokens = enrichedTokens.filter(token => {
    const matchesSearch = filters.search === '' || 
      token.token_card.token_name.toLowerCase().includes(filters.search.toLowerCase());
    return matchesSearch;
  });

  // Bulk selection handlers
  const handlePlayerBulkSelect = (player, checked) => {
    if (checked) {
      setSelectedForBulkAction([...selectedForBulkAction, { id: player.id, type: 'player', value: player.sellValue }]);
    } else {
      setSelectedForBulkAction(selectedForBulkAction.filter(s => s.id !== player.id));
    }
  };

  const handleTokenBulkSelect = (token, checked) => {
    if (checked) {
      setSelectedForBulkAction([...selectedForBulkAction, { id: token.id, type: 'token', value: token.sellValue }]);
    } else {
      setSelectedForBulkAction(selectedForBulkAction.filter(s => s.id !== token.id));
    }
  };

  const handleSelectAllPlayers = () => {
    const allPlayerSelections = filteredPlayers.map(p => ({ id: p.id, type: 'player', value: p.sellValue }));
    setSelectedForBulkAction(allPlayerSelections);
  };

  const handleDeselectAll = () => {
    setSelectedForBulkAction([]);
  };

  const handleBulkQuickSell = async () => {
    const playerIds = selectedForBulkAction.filter(s => s.type === 'player').map(s => s.id);
    const tokenIds = selectedForBulkAction.filter(s => s.type === 'token').map(s => s.id);

    // Quick sell all selected players
    for (const id of playerIds) {
      const player = filteredPlayers.find(p => p.id === id);
      if (player) {
        await onQuickSell(player.id, 'player', player.sellValue, true);
      }
    }

    // Quick sell all selected tokens
    for (const id of tokenIds) {
      const token = filteredTokens.find(t => t.id === id);
      if (token) {
        await onQuickSell(token.id, 'token', token.sellValue, true);
      }
    }

    // Clear selections and reload
    setSelectedForBulkAction([]);
    if (onBulkSellComplete) {
      onBulkSellComplete();
    }
  };

  const selectedPlayerIds = selectedForBulkAction.filter(s => s.type === 'player').map(s => s.id);
  const selectedTokenIds = selectedForBulkAction.filter(s => s.type === 'token').map(s => s.id);

  return (
    <>
      {/* Bulk Action Banner - Fixed at top when selections exist */}
      {selectedForBulkAction.length > 0 && (
        <div className="sticky top-0 z-20 bg-primary-black-900 border-2 border-primary-black-700 rounded-lg sm:rounded-xl mb-3 sm:mb-4">
          <div className="px-3 sm:px-4 py-2 sm:py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 px-3 py-1.5 bg-primary-black-800 rounded-lg">
                <div className="text-xs">
                  <span className="text-primary-black-400">Selected:</span>{' '}
                  <span className="font-bold text-primary-green-400">{selectedForBulkAction.length}</span>{' '}
                  <span className="text-primary-black-500">•</span>{' '}
                  <span className="font-bold text-primary-green-400">
                    💰 {selectedForBulkAction.reduce((sum, s) => sum + s.value, 0)}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDeselectAll}
                  className="px-4 py-2 bg-primary-black-700 hover:bg-primary-black-600 text-primary-black-300 rounded-lg text-sm font-semibold transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={handleBulkQuickSell}
                  disabled={selling}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {selling ? 'Selling...' : 'Sell Selected'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Players Section */}
      {(activeTab === 'all' || activeTab === 'players') && filteredPlayers.length > 0 && (
        <>
          {viewMode === 'list' ? (
            <InventoryList
              players={filteredPlayers}
              showBulkSelect={false}
              onPlayerClick={onPlayerClick}
              onSell={onSell}
              onBulkSell={(players) => {
                players.forEach(player => onSell(player));
              }}
              liveGameData={liveGameData}
              projections={projections}
              isMobile={false}
            />
          ) : (
            <div className="grid grid-cols-3 gap-1 md:gap-4 mb-3 sm:mb-4">
              {filteredPlayers.map((player) => (
                <div key={player.id} className="relative w-full">
                  {/* Checkbox overlay for bulk selection */}
                  {false && (
                    <div className="absolute top-1 md:top-2 left-1 md:left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedPlayerIds.includes(player.id)}
                        onChange={(e) => handlePlayerBulkSelect(player, e.target.checked)}
                        className="w-4 h-4 md:w-5 md:h-5 rounded border-2 border-primary-black-500 bg-primary-black-800 text-primary-green-500 focus:ring-2 focus:ring-primary-green-500 cursor-pointer"
                      />
                    </div>
                  )}
                  <div className="aspect-square md:aspect-[3.2/5] relative">
                    <PlayerCard
                      player={player}
                      projectedPoints={projections.get(player.player_card?.player_id)}
                      gameData={liveGameData.get(player.player_card?.player_id)}
                      projection={projections.get(player.player_card?.player_id)}
                      isLocked={player.is_locked}
                      size="small"
                      showStats={true}
                      showNameOutside={false}
                      className="w-full h-full rounded-xl"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tokens Section */}
      {(activeTab === 'all' || activeTab === 'tokens') && filteredTokens.length > 0 && (
        <TokenTable
          tokens={filteredTokens}
          showBulkSelect={true}
          selectedIds={selectedTokenIds}
          onBulkSelectChange={handleTokenBulkSelect}
          onSell={onSellToken}
          emptyMessage="No tokens available"
        />
      )}

      {/* Empty State */}
      {filteredPlayers.length === 0 && filteredTokens.length === 0 && (
        <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-lg sm:rounded-xl">
          <div className="px-3 sm:px-4 py-12 text-center">
            <div className="text-4xl mb-2 opacity-30">
              {filters.search ? '🔍' : '📦'}
            </div>
            <p className="text-primary-black-400 font-semibold">
              {filters.search ? 'No matches found' : 'Your inventory is empty'}
            </p>
            <p className="text-primary-black-500 text-sm mt-2">
              {filters.search ? 'Try a different search' : 'Open packs to get players and tokens'}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

InventoryPanel.propTypes = {
  players: PropTypes.array.isRequired,
  tokens: PropTypes.array.isRequired,
  projections: PropTypes.object,
  loadingProjections: PropTypes.bool,
  liveGameData: PropTypes.object,
  onQuickSell: PropTypes.func.isRequired,
  onSell: PropTypes.func,
  onSellToken: PropTypes.func,
  onPlayerClick: PropTypes.func,
  onBulkSellComplete: PropTypes.func,
  onReloadProfile: PropTypes.func,
  selling: PropTypes.bool,
  filters: PropTypes.object.isRequired,
  onFilterChange: PropTypes.func,
  inventory: PropTypes.object,
  viewMode: PropTypes.string
};