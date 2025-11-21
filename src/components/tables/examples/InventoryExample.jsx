/**
 * EXAMPLE: Refactoring InventoryPanel to use unified table components
 * 
 * BEFORE: 500+ lines of custom grid markup
 * AFTER: ~50 lines using PlayerTable and TokenTable
 */

import { useState } from 'react';
import PlayerTable from '@/components/tables/PlayerTable';
import TokenTable from '@/components/tables/TokenTable';

function InventoryPanelRefactored() {
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [selectedTokens, setSelectedTokens] = useState([]);
  const [activeTab, setActiveTab] = useState('all');

  // Your existing data and logic
  const { players, tokens } = useInventory();
  const { liveGameData, projections } = useGameData();

  // Bulk selection handlers
  const handlePlayerBulkSelect = (player, checked) => {
    if (checked) {
      setSelectedPlayers([...selectedPlayers, player.id]);
    } else {
      setSelectedPlayers(selectedPlayers.filter(id => id !== player.id));
    }
  };

  const handleSelectAllPlayers = () => {
    const unlocked = players.filter(p => !p.is_locked);
    setSelectedPlayers(unlocked.map(p => p.id));
  };

  const handleDeselectAllPlayers = () => {
    setSelectedPlayers([]);
  };

  // Enrich players with live data for display
  const enrichedPlayers = players.map(player => {
    const gameData = liveGameData?.get(player.player_card.player_id);
    const projection = projections?.get(player.player_card.player_id);
    
    return {
      ...player,
      opponent: gameData?.opponent,
      gameStatus: gameData?.gameStatus,
      projected: projection?.projected,
      score: gameData?.currentPoints,
      seasonAvg: projection?.seasonAvg,
      sellValue: calculatePlayerSellValue(player)
    };
  });

  // Enrich tokens with sell value
  const enrichedTokens = tokens.map(token => ({
    ...token,
    sellValue: calculateTokenSellValue(token)
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header with bulk actions */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-primary-black-50">Inventory</h2>
        
        {selectedPlayers.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleDeselectAllPlayers}
              className="px-4 py-2 bg-primary-black-700 text-primary-black-300 rounded"
            >
              Deselect All
            </button>
            <button
              onClick={() => handleBulkSell(selectedPlayers)}
              className="px-4 py-2 bg-red-500 text-white rounded"
            >
              Sell {selectedPlayers.length} Players
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded ${activeTab === 'all' ? 'bg-primary-green-500' : 'bg-primary-black-700'}`}
        >
          All Items
        </button>
        <button
          onClick={() => setActiveTab('players')}
          className={`px-4 py-2 rounded ${activeTab === 'players' ? 'bg-primary-green-500' : 'bg-primary-black-700'}`}
        >
          Players Only
        </button>
        <button
          onClick={() => setActiveTab('tokens')}
          className={`px-4 py-2 rounded ${activeTab === 'tokens' ? 'bg-primary-green-500' : 'bg-primary-black-700'}`}
        >
          Tokens Only
        </button>
      </div>

      {/* Players Section */}
      {(activeTab === 'all' || activeTab === 'players') && enrichedPlayers.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-primary-black-50">Players</h3>
            <button
              onClick={handleSelectAllPlayers}
              className="text-sm text-primary-green-400 hover:underline"
            >
              Select All Unlocked
            </button>
          </div>

          <PlayerTable
            players={enrichedPlayers}
            showBulkSelect={true}
            showTierLevel={true}
            selectedIds={selectedPlayers}
            onBulkSelectChange={handlePlayerBulkSelect}
            isRowLocked={(player) => player.is_locked}
            emptyMessage="No players in inventory"
            emptyIcon="🏈"
          />
        </div>
      )}

      {/* Tokens Section */}
      {(activeTab === 'all' || activeTab === 'tokens') && enrichedTokens.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-primary-black-50 mb-3">Tokens</h3>
          
          <TokenTable
            tokens={enrichedTokens}
            showBulkSelect={true}
            selectedIds={selectedTokens}
            onBulkSelectChange={handleTokenBulkSelect}
            emptyMessage="No tokens available"
            emptyIcon="💎"
          />
        </div>
      )}

      {/* Empty State */}
      {enrichedPlayers.length === 0 && enrichedTokens.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-2 opacity-30">📦</div>
          <p className="text-primary-black-400 font-semibold">Your inventory is empty</p>
          <p className="text-primary-black-500 text-sm mt-2">Open packs to get players and tokens</p>
        </div>
      )}
    </div>
  );
}

export default InventoryPanelRefactored;
