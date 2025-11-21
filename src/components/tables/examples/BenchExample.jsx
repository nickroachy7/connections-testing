/**
 * EXAMPLE: Refactoring BenchAndTokensPanel to use unified table components
 * 
 * BEFORE: 600+ lines of custom grid markup with complex conditional rendering
 * AFTER: ~80 lines using PlayerTable and TokenTable with custom render props
 */

import { useState } from 'react';
import PlayerTable from '@/components/tables/PlayerTable';
import TokenTable from '@/components/tables/TokenTable';

function BenchAndTokensPanelRefactored({
  benchPlayers = [],
  availableTokens = [],
  onPlayerDragStart,
  onTokenDragStart,
  
  // Optional: When filtering for position slot
  filterPosition = null,
  onMoveToSlot = null,
  onClearFilter = null,
  
  // Optional: When selecting token for player
  tokenFilterPlayerId = null,
  onApplyTokenToPlayer = null
}) {
  const [activeTab, setActiveTab] = useState('all');

  // Enrich players with data
  const { liveGameData, projections } = useGameData();
  const enrichedPlayers = benchPlayers.map(player => {
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

  const enrichedTokens = availableTokens.map(token => ({
    ...token,
    sellValue: calculateTokenSellValue(token)
  }));

  // Filter players by position if needed
  const filteredPlayers = filterPosition
    ? enrichedPlayers.filter(p => p.player_card.position === filterPosition && !p.is_locked)
    : enrichedPlayers;

  // Filter tokens for player if needed
  const filteredTokens = tokenFilterPlayerId
    ? enrichedTokens.filter(t => !t.is_active)
    : enrichedTokens;

  // Custom rendering for filtered player view (with MOVE button)
  const renderPlayerActionButton = (player) => {
    if (!filterPosition || !onMoveToSlot) return null;
    
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMoveToSlot(player, filterPosition);
        }}
        className="px-4 py-1.5 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 rounded text-xs font-bold"
      >
        MOVE
      </button>
    );
  };

  // Custom rendering for token selection (with APPLY button)
  const renderTokenActionButton = (token) => {
    if (!tokenFilterPlayerId || !onApplyTokenToPlayer) return null;
    
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onApplyTokenToPlayer(token, tokenFilterPlayerId);
        }}
        className="px-4 py-1.5 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 rounded text-xs font-bold"
      >
        APPLY
      </button>
    );
  };

  // Custom row styling when filtering
  const getFilteredRowClass = (item, index, isLocked) => {
    if (filterPosition || tokenFilterPlayerId) {
      return `
        flex items-center gap-4 px-2 py-3 transition-all border-l-4
        ${isLocked ? 'border-red-500/50 opacity-60' : 'border-primary-green-500/30'}
        ${index % 2 === 0 ? 'bg-primary-black-900' : 'bg-primary-black-800/50'}
      `;
    }
    return null; // Use default styling
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header - changes based on filter mode */}
      <div className={`sticky top-0 z-20 border-2 border-primary-black-700 rounded-xl mb-4 p-4 ${
        filterPosition || tokenFilterPlayerId
          ? 'bg-primary-green-500/10 border-primary-green-500/30'
          : 'bg-primary-black-900'
      }`}>
        {filterPosition ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <h3 className="text-xl font-bold text-primary-green-400">
                  Select Player for {filterPosition}
                </h3>
                <p className="text-xs text-primary-black-400">
                  Showing {filteredPlayers.length} eligible players
                </p>
              </div>
            </div>
            <button onClick={onClearFilter} className="px-4 py-2 bg-primary-black-700 rounded">
              Clear Filter
            </button>
          </div>
        ) : tokenFilterPlayerId ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💎</span>
              <div>
                <h3 className="text-xl font-bold text-primary-green-400">
                  Select Token for Player
                </h3>
                <p className="text-xs text-primary-black-400">
                  Showing {filteredTokens.length} available tokens
                </p>
              </div>
            </div>
            <button onClick={onClearFilter} className="px-4 py-2 bg-primary-black-700 rounded">
              Clear Filter
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-primary-black-50">Bench</h3>
            
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded text-xs font-semibold ${
                  activeTab === 'all' ? 'bg-primary-green-500' : 'bg-primary-black-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('players')}
                className={`px-3 py-1.5 rounded text-xs font-semibold ${
                  activeTab === 'players' ? 'bg-primary-green-500' : 'bg-primary-black-800'
                }`}
              >
                Players
              </button>
              <button
                onClick={() => setActiveTab('tokens')}
                className={`px-3 py-1.5 rounded text-xs font-semibold ${
                  activeTab === 'tokens' ? 'bg-primary-green-500' : 'bg-primary-black-800'
                }`}
              >
                Tokens
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Players Section */}
      {(activeTab === 'all' || activeTab === 'players' || filterPosition) && (
        <div className="mb-6">
          <PlayerTable
            players={filteredPlayers}
            showBulkSelect={false}
            showTierLevel={false}
            onRowDragStart={filterPosition ? null : onPlayerDragStart}
            isRowLocked={(player) => player.is_locked || isPlayerGameLiveOrFinal(player)}
            renderExtraRowColumns={filterPosition ? renderPlayerActionButton : null}
            getRowClassName={getFilteredRowClass}
            emptyMessage={filterPosition ? "No eligible players" : "Bench is empty"}
            emptyIcon="🪑"
          />
        </div>
      )}

      {/* Tokens Section */}
      {(activeTab === 'all' || activeTab === 'tokens' || tokenFilterPlayerId) && (
        <div>
          <TokenTable
            tokens={filteredTokens}
            showBulkSelect={false}
            onRowDragStart={tokenFilterPlayerId ? null : onTokenDragStart}
            renderExtraRowColumns={tokenFilterPlayerId ? renderTokenActionButton : null}
            getRowClassName={getFilteredRowClass}
            emptyMessage="No tokens available"
            emptyIcon="💎"
          />
        </div>
      )}
    </div>
  );
}

export default BenchAndTokensPanelRefactored;
