import { useState } from 'react';
import PropTypes from 'prop-types';
import PlayerTable from './tables/PlayerTable';
import TokenTable from './tables/TokenTable';
import { enrichPlayerData, enrichTokenData, isPlayerGameLiveOrFinal } from './tables/tableHelpers.jsx';
import { getRosterCount, ROSTER_LIMIT } from '../utils/rosterLimits';
import { calculatePlayerSellValue, calculateTokenSellValue } from '../utils/sellValueCalculator';

/**
 * BenchAndTokensPanel Component - REFACTORED VERSION
 * 
 * Uses unified PlayerTable and TokenTable components for consistency.
 * Much simpler than the original 1100+ line version.
 */
export default function BenchAndTokensPanel({
  benchPlayers,
  availableTokens,
  onPlayerDragStart,
  onTokenDragStart,
  onTokenDragEnd,
  onPlayerDrop,
  liveGameData,
  projections,
  inventory,
  filterPosition = null,
  tokenFilterPlayerId = null,
  tokenFilterPlayer = null,
  onApplyTokenToPlayer,
  onMoveToSlot,
  onClearFilter
}) {
  const [activeTab, setActiveTab] = useState('all');

  // When filtering, switch to appropriate tab automatically
  const effectiveTab = filterPosition ? 'players' : tokenFilterPlayerId ? 'tokens' : activeTab;

  // Helper to check if player matches position filter
  const isPlayerEligibleForPosition = (player, position) => {
    if (!position) return true;
    
    const playerPos = player.player_card.position;
    const posAbbr = position.replace(/[0-9]/g, ''); // Remove numbers (RB1 -> RB)
    
    const positionMap = {
      'QB': ['Quarterback'],
      'RB': ['Running Back'],
      'WR': ['Wide Receiver'],
      'TE': ['Tight End'],
      'FLEX': ['Running Back', 'Wide Receiver', 'Tight End']
    };
    
    const allowedPositions = positionMap[posAbbr] || [];
    return allowedPositions.includes(playerPos);
  };

  const getPositionLabel = (position) => {
    if (!position) return '';
    const labels = {
      'QB': 'Quarterback',
      'RB1': 'Running Back',
      'RB2': 'Running Back',
      'WR1': 'Wide Receiver',
      'WR2': 'Wide Receiver',
      'WR3': 'Wide Receiver',
      'TE': 'Tight End',
      'FLEX': 'Flex (RB/WR/TE)'
    };
    return labels[position] || position;
  };

  // Sort players by position
  const getPositionOrder = (position) => {
    const order = { 'Quarterback': 1, 'Running Back': 2, 'Wide Receiver': 3, 'Tight End': 4 };
    return order[position] || 999;
  };

  const sortedBenchPlayers = [...benchPlayers].sort((a, b) => 
    getPositionOrder(a.player_card.position) - getPositionOrder(b.player_card.position)
  );

  // Enrich player data
  const enrichedPlayers = sortedBenchPlayers.map(player => {
    const enriched = enrichPlayerData(player, liveGameData, projections);
    return {
      ...enriched,
      sellValue: calculatePlayerSellValue(player)
    };
  });

  // Enrich token data
  const enrichedTokens = availableTokens.map(token => ({
    ...enrichTokenData(token),
    sellValue: calculateTokenSellValue(token)
  }));

  // Filter players if position filter is active
  const filteredPlayers = filterPosition
    ? enrichedPlayers.filter(p => isPlayerEligibleForPosition(p, filterPosition) && !p.is_locked)
    : enrichedPlayers;

  // Filter tokens if player filter is active
  const filteredTokens = tokenFilterPlayerId
    ? enrichedTokens.filter(t => !t.is_active)
    : enrichedTokens;

  // Custom render for MOVE button when filtering
  const renderMoveButton = (player) => {
    if (!filterPosition || !onMoveToSlot) return null;
    
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMoveToSlot(player, filterPosition);
        }}
        className="px-4 py-1.5 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 rounded text-xs font-bold transition-all hover:scale-105"
      >
        MOVE
      </button>
    );
  };

  // Custom render for APPLY button when selecting token
  const renderApplyButton = (token) => {
    if (!tokenFilterPlayerId || !onApplyTokenToPlayer) return null;
    
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onApplyTokenToPlayer(token, tokenFilterPlayerId);
        }}
        className="px-4 py-1.5 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 rounded text-xs font-bold transition-all hover:scale-105"
      >
        APPLY
      </button>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className={`sticky top-0 z-20 border-2 border-primary-black-700 rounded-xl mb-4 transition-colors ${
        filterPosition || tokenFilterPlayerId
          ? 'bg-primary-green-500/10 border-primary-green-500/30'
          : 'bg-primary-black-900'
      }`}>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Title changes based on mode */}
            {filterPosition ? (
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">🎯</span>
                <div>
                  <h3 className="text-xl font-bold text-primary-green-400">
                    Select Player for {getPositionLabel(filterPosition)}
                  </h3>
                  <p className="text-xs text-primary-black-400 mt-0.5">
                    Showing {filteredPlayers.length} eligible player{filteredPlayers.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ) : tokenFilterPlayerId && tokenFilterPlayer ? (
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">💎</span>
                <div>
                  <h3 className="text-xl font-bold text-primary-green-400">
                    Select Token for {tokenFilterPlayer.player_card.player_name}
                  </h3>
                  <p className="text-xs text-primary-black-400 mt-0.5">
                    Showing {filteredTokens.length} available token{filteredTokens.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-shrink-0">
                <h3 className="text-xl font-bold text-primary-black-50">Bench</h3>
                <p className="text-xs text-primary-black-400 mt-0.5">
                  <span className="font-medium text-primary-black-500">Roster:</span>{' '}
                  <span className="font-bold text-primary-black-400">
                    {inventory ? getRosterCount(inventory) : (sortedBenchPlayers.length + availableTokens.length)}/{ROSTER_LIMIT}
                  </span>
                </p>
              </div>
            )}

            {/* Right side - Clear filter or tabs */}
            {(filterPosition || tokenFilterPlayerId) ? (
              <button
                onClick={onClearFilter}
                className="px-4 py-2 bg-primary-black-700 hover:bg-primary-black-600 text-primary-black-300 rounded-lg text-sm font-semibold transition-colors"
              >
                Clear Filter
              </button>
            ) : (
              <div className="flex gap-2">
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
            )}
          </div>
        </div>
      </div>

      {/* Players Section */}
      {(effectiveTab === 'all' || effectiveTab === 'players' || filterPosition) && (
        <div className="mb-6">
          <PlayerTable
            players={filteredPlayers}
            showBulkSelect={false}
            showTierLevel={true}
            onRowDragStart={filterPosition ? null : onPlayerDragStart}
            isRowLocked={(player) => player.is_locked || isPlayerGameLiveOrFinal(player, liveGameData)}
            renderExtraRowColumns={filterPosition ? renderMoveButton : null}
            emptyMessage={filterPosition ? "No eligible players" : "Bench is empty"}
            emptyIcon="🪑"
          />
        </div>
      )}

      {/* Tokens Section */}
      {(effectiveTab === 'all' || effectiveTab === 'tokens' || tokenFilterPlayerId) && (
        <div>
          <TokenTable
            tokens={filteredTokens}
            showBulkSelect={false}
            onRowDragStart={tokenFilterPlayerId ? null : onTokenDragStart}
            onRowDragEnd={onTokenDragEnd}
            renderExtraRowColumns={tokenFilterPlayerId ? renderApplyButton : null}
            emptyMessage="No tokens available"
            emptyIcon="💎"
          />
        </div>
      )}

      {/* Empty State */}
      {filteredPlayers.length === 0 && filteredTokens.length === 0 && !filterPosition && !tokenFilterPlayerId && (
        <div className="flex items-center justify-center py-12 text-center">
          <div>
            <div className="text-4xl mb-2 opacity-30">🏈</div>
            <p className="text-primary-black-400 font-semibold mb-1">No items available</p>
            <p className="text-primary-black-500 text-sm">Add players to your lineup or purchase tokens</p>
            <p className="text-primary-black-600 text-xs mt-2">💡 Drag lineup players anywhere to bench them</p>
          </div>
        </div>
      )}
    </div>
  );
}

BenchAndTokensPanel.propTypes = {
  benchPlayers: PropTypes.array.isRequired,
  availableTokens: PropTypes.array.isRequired,
  onPlayerDragStart: PropTypes.func,
  onTokenDragStart: PropTypes.func,
  onTokenDragEnd: PropTypes.func,
  onPlayerDrop: PropTypes.func,
  liveGameData: PropTypes.object,
  projections: PropTypes.object,
  inventory: PropTypes.object,
  filterPosition: PropTypes.string,
  tokenFilterPlayerId: PropTypes.string,
  tokenFilterPlayer: PropTypes.object,
  onApplyTokenToPlayer: PropTypes.func,
  onMoveToSlot: PropTypes.func,
  onClearFilter: PropTypes.func
};
