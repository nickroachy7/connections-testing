import { useState } from 'react';
import PropTypes from 'prop-types';
import PlayerTable from './tables/PlayerTable';
import TokenTable from './tables/TokenTable';
import { enrichPlayerData, enrichTokenData } from './tables/tableHelpers.jsx';
import { getRosterCount, ROSTER_LIMIT } from '../utils/rosterLimits';
import { calculatePlayerSellValue, calculateTokenSellValue } from '../utils/sellValueCalculator';

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
  onBulkSellComplete,
  onReloadProfile,
  selling,
  filters,
  onFilterChange,
  inventory
}) {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedForBulkAction, setSelectedForBulkAction] = useState([]);

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
    const enriched = enrichPlayerData(player, liveGameData, projections);
    return {
      ...enriched,
      sellValue: calculatePlayerSellValue(player)
    };
  });

  // Enrich token data
  const enrichedTokens = tokens.map(token => ({
    ...enrichTokenData(token),
    sellValue: calculateTokenSellValue(token)
  }));

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
    const matchesType = filters.tokenType === 'all' || token.token_card.token_type === filters.tokenType;
    const matchesSearch = filters.search === '' || 
      token.token_card.token_name.toLowerCase().includes(filters.search.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Bulk selection handlers
  const handlePlayerBulkSelect = (player, checked) => {
    const itemId = player.id;
    if (checked) {
      setSelectedForBulkAction([...selectedForBulkAction, { 
        id: itemId, 
        type: 'player', 
        value: player.sellValue, 
        item: player 
      }]);
    } else {
      setSelectedForBulkAction(selectedForBulkAction.filter(s => s.id !== itemId));
    }
  };

  const handleTokenBulkSelect = (token, checked) => {
    const itemId = token.id;
    if (checked) {
      setSelectedForBulkAction([...selectedForBulkAction, { 
        id: itemId, 
        type: 'token', 
        value: token.sellValue, 
        item: token 
      }]);
    } else {
      setSelectedForBulkAction(selectedForBulkAction.filter(s => s.id !== itemId));
    }
  };

  const handleSelectAllPlayers = () => {
    const unlocked = filteredPlayers.filter(p => !p.is_locked);
    const selections = unlocked.map(p => ({ 
      id: p.id, 
      type: 'player', 
      value: p.sellValue, 
      item: p 
    }));
    setSelectedForBulkAction([...selectedForBulkAction, ...selections]);
  };

  const handleDeselectAll = () => {
    setSelectedForBulkAction([]);
  };

  const handleBulkQuickSell = async () => {
    const totalValue = selectedForBulkAction.reduce((sum, s) => sum + s.value, 0);
    const playerCount = selectedForBulkAction.filter(s => s.type === 'player').length;
    const tokenCount = selectedForBulkAction.filter(s => s.type === 'token').length;
    
    const itemText = playerCount && tokenCount 
      ? `${playerCount} player${playerCount > 1 ? 's' : ''} and ${tokenCount} token${tokenCount > 1 ? 's' : ''}`
      : playerCount 
        ? `${playerCount} player${playerCount > 1 ? 's' : ''}`
        : `${tokenCount} token${tokenCount > 1 ? 's' : ''}`;
    
    if (!window.confirm(`Sell ${itemText} for ${totalValue} coins total?`)) {
      return;
    }

    try {
      await Promise.all(
        selectedForBulkAction.map(selection => 
          onQuickSell(selection.id, selection.type, selection.value, true)
        )
      );
      
      setSelectedForBulkAction([]);
      
      if (onReloadProfile) {
        onReloadProfile();
      }
      
      if (onBulkSellComplete) {
        await onBulkSellComplete();
      }
    } catch (err) {
      console.error('Error bulk selling:', err);
    }
  };

  const selectedPlayerIds = selectedForBulkAction.filter(s => s.type === 'player').map(s => s.id);
  const selectedTokenIds = selectedForBulkAction.filter(s => s.type === 'token').map(s => s.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-primary-black-900 border-2 border-primary-black-700 rounded-xl mb-4">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Title */}
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-primary-black-50">Inventory</h1>
              <p className="text-xs text-primary-black-400 mt-0.5">
                Roster: {inventory ? getRosterCount(inventory) : (players.length + tokens.length)}/{ROSTER_LIMIT}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {selectedForBulkAction.length > 0 && (
                <>
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
                </>
              )}
              
              {/* Tab buttons */}
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'all'
                    ? 'bg-primary-green-500 text-primary-black-950'
                    : 'bg-primary-black-800 text-primary-black-400 hover:bg-primary-black-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('players')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'players'
                    ? 'bg-primary-green-500 text-primary-black-950'
                    : 'bg-primary-black-800 text-primary-black-400 hover:bg-primary-black-700'
                }`}
              >
                Players
              </button>
              <button
                onClick={() => setActiveTab('tokens')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'tokens'
                    ? 'bg-primary-green-500 text-primary-black-950'
                    : 'bg-primary-black-800 text-primary-black-400 hover:bg-primary-black-700'
                }`}
              >
                Tokens
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Players Section */}
      {(activeTab === 'all' || activeTab === 'players') && filteredPlayers.length > 0 && (
        <div className="mb-6">
          <PlayerTable
            players={filteredPlayers}
            showBulkSelect={true}
            showTierLevel={true}
            selectedIds={selectedPlayerIds}
            onBulkSelectChange={handlePlayerBulkSelect}
            isRowLocked={(player) => player.is_locked}
            emptyMessage="No players in inventory"
            emptyIcon="🏈"
          />
        </div>
      )}

      {/* Tokens Section */}
      {(activeTab === 'all' || activeTab === 'tokens') && filteredTokens.length > 0 && (
        <div>
          <TokenTable
            tokens={filteredTokens}
            showBulkSelect={true}
            selectedIds={selectedTokenIds}
            onBulkSelectChange={handleTokenBulkSelect}
            emptyMessage="No tokens available"
            emptyIcon="💎"
          />
        </div>
      )}

      {/* Empty State */}
      {filteredPlayers.length === 0 && filteredTokens.length === 0 && (
        <div className="text-center py-12">
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
      )}
    </div>
  );
}

InventoryPanel.propTypes = {
  players: PropTypes.array.isRequired,
  tokens: PropTypes.array.isRequired,
  projections: PropTypes.object,
  loadingProjections: PropTypes.bool,
  liveGameData: PropTypes.object,
  onQuickSell: PropTypes.func.isRequired,
  onBulkSellComplete: PropTypes.func,
  onReloadProfile: PropTypes.func,
  selling: PropTypes.bool,
  filters: PropTypes.object.isRequired,
  onFilterChange: PropTypes.func,
  inventory: PropTypes.object
};
