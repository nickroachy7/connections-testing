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
  onClearFilter,
  lineup = null,
  onSelectPlayerForSlot = null,
  onSelectTokenForPlayer = null,
  selectedPlayerForSlot = null,
  selectedTokenForPlayer = null
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
    
    const allowedPositions = positionMap[posAbbr];
    if (!allowedPositions) return false;
    
    return Array.isArray(allowedPositions) 
      ? allowedPositions.includes(playerPos)
      : playerPos === allowedPositions;
  };

  const getPositionLabel = (position) => {
    const labels = {
      'QB': 'Quarterback',
      'RB1': 'Running Back 1',
      'RB2': 'Running Back 2',
      'WR1': 'Wide Receiver 1',
      'WR2': 'Wide Receiver 2',
      'WR3': 'Wide Receiver 3',
      'TE': 'Tight End',
      'FLEX': 'Flex (RB/WR/TE)'
    };
    return labels[position] || position;
  };

  // Sort players by position
  const getPositionOrder = (position) => {
    const order = {
      'Quarterback': 1,
      'Running Back': 2,
      'Wide Receiver': 3,
      'Tight End': 4
    };
    return order[position] || 999;
  };

  const sortedBenchPlayers = [...benchPlayers].sort((a, b) => 
    getPositionOrder(a.player_card.position) - getPositionOrder(b.player_card.position)
  );

  // Enrich player data
  const enrichedPlayers = sortedBenchPlayers.map(player => ({
    ...enrichPlayerData(player, liveGameData, projections),
    sellValue: calculatePlayerSellValue(player)
  }));

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

  // Find first eligible slot for a player (empty or occupied - will swap)
  const findEligibleSlot = (player) => {
    if (!lineup || !onMoveToSlot) return null;
    
    const playerPos = player.player_card.position;
    
    // Define slot order to check
    const slotOrder = {
      'Quarterback': ['QB'],
      'Running Back': ['RB1', 'RB2', 'FLEX'],
      'Wide Receiver': ['WR1', 'WR2', 'WR3', 'FLEX'],
      'Tight End': ['TE', 'FLEX']
    };
    
    const eligibleSlots = slotOrder[playerPos] || [];
    
    // Return first eligible slot (will swap if occupied)
    return eligibleSlots[0] || null;
  };

  // Handle add button click for players - trigger slot highlighting
  const handleAddButtonClick = (player) => {
    if (onSelectPlayerForSlot) {
      onSelectPlayerForSlot(player);
    }
  };

  // Handle add button click for tokens - trigger player highlighting
  const handleTokenAddButtonClick = (token) => {
    if (onSelectTokenForPlayer) {
      onSelectTokenForPlayer(token);
    }
  };

  // Custom render for MOVE button when filtering
  const renderMoveButton = (player) => {
    if (!filterPosition || !onMoveToSlot) return null;
    
    // Don't render extra column - use the add button instead
    return null;
  };

  // Custom render for APPLY button when selecting token
  const renderApplyButton = (token) => {
    if (!tokenFilterPlayerId || !onApplyTokenToPlayer) return null;
    
    // Don't render extra column - use the add button instead
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
      {/* Header */}
      <div className={`sticky top-0 z-20 border-2 border-primary-black-700 rounded-xl mb-3 md:mb-4 transition-colors ${
        filterPosition || tokenFilterPlayerId
          ? 'bg-primary-green-500/10 border-primary-green-500/30'
          : 'bg-primary-black-900'
      }`}>
        <div className="px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-3 md:gap-6">
            {/* Title changes based on mode */}
            {filterPosition ? (
              <div className="flex items-center gap-2 md:gap-3 flex-1">
                <span className="text-xl md:text-2xl">🎯</span>
                <div>
                  <h3 className="text-base md:text-xl font-bold text-primary-green-400">
                    Select Player for {getPositionLabel(filterPosition)}
                  </h3>
                  <p className="text-[10px] md:text-xs text-primary-black-400 mt-0.5">
                    Showing {filteredPlayers.length} eligible player{filteredPlayers.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ) : selectedPlayerForSlot ? (
              <div className="flex items-center gap-2 md:gap-3 flex-1">
                <span className="text-xl md:text-2xl">🎯</span>
                <div>
                  <h3 className="text-base md:text-xl font-bold text-primary-green-400">
                    Select Slot for {selectedPlayerForSlot.player_card.player_name}
                  </h3>
                  <p className="text-[10px] md:text-xs text-primary-black-400 mt-0.5">
                    Click a highlighted slot to swap this player in
                  </p>
                </div>
              </div>
            ) : tokenFilterPlayerId && tokenFilterPlayer ? (
              <div className="flex items-center gap-2 md:gap-3 flex-1">
                <span className="text-xl md:text-2xl">💎</span>
                <div>
                  <h3 className="text-base md:text-xl font-bold text-primary-green-400">
                    Select Token for {tokenFilterPlayer.player_card.player_name}
                  </h3>
                  <p className="text-[10px] md:text-xs text-primary-black-400 mt-0.5">
                    Showing {filteredTokens.length} available token{filteredTokens.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ) : selectedTokenForPlayer ? (
              <div className="flex items-center gap-2 md:gap-3 flex-1">
                <span className="text-xl md:text-2xl">💎</span>
                <div>
                  <h3 className="text-base md:text-xl font-bold text-yellow-400">
                    Select Player for {selectedTokenForPlayer.token_card.token_name}
                  </h3>
                  <p className="text-[10px] md:text-xs text-primary-black-400 mt-0.5">
                    Click a highlighted player to apply this token
                  </p>
                </div>
              </div>
            ) : null}

            {/* Right side - Clear filter or tabs */}
            {(filterPosition || tokenFilterPlayerId || selectedPlayerForSlot || selectedTokenForPlayer) ? (
              <button
                onClick={onClearFilter}
                className="px-3 md:px-4 py-1.5 md:py-2 bg-primary-black-700 hover:bg-primary-black-600 text-primary-black-300 rounded-lg text-xs md:text-sm font-semibold transition-colors whitespace-nowrap"
              >
                Clear
              </button>
            ) : (
              <div className="flex gap-1 md:gap-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-1.5 md:px-3 py-0.5 md:py-1.5 rounded-lg text-[9px] md:text-xs font-semibold transition-all ${
                    activeTab === 'all'
                      ? 'bg-primary-green-500 text-primary-black-950'
                      : 'bg-primary-black-800 text-primary-black-400 hover:bg-primary-black-700'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveTab('players')}
                  className={`px-1.5 md:px-3 py-0.5 md:py-1.5 rounded-lg text-[9px] md:text-xs font-semibold transition-all ${
                    activeTab === 'players'
                      ? 'bg-primary-green-500 text-primary-black-950'
                      : 'bg-primary-black-800 text-primary-black-400 hover:bg-primary-black-700'
                  }`}
                >
                  Players
                </button>
                <button
                  onClick={() => setActiveTab('tokens')}
                  className={`px-1.5 md:px-3 py-0.5 md:py-1.5 rounded-lg text-[9px] md:text-xs font-semibold transition-all ${
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
            players={filterPosition ? filteredPlayers : enrichedPlayers}
            showAddButton={!!filterPosition || !!selectedPlayerForSlot}
            onAddButtonClick={handleAddButtonClick}
            onRowDragStart={onPlayerDragStart}
            emptyMessage={filterPosition ? "No eligible players for this position" : "No players in inventory"}
            emptyIcon="🏈"
            selectedPlayerId={selectedPlayerForSlot?.id}
          />
        </div>
      )}

      {/* Tokens Section */}
      {(effectiveTab === 'all' || effectiveTab === 'tokens' || tokenFilterPlayerId) && (
        <div>
          <TokenTable
            tokens={tokenFilterPlayerId ? filteredTokens : enrichedTokens}
            showAddButton={!!tokenFilterPlayerId || !!selectedTokenForPlayer}
            onAddButtonClick={handleTokenAddButtonClick}
            onRowDragStart={onTokenDragStart}
            onRowDragEnd={onTokenDragEnd}
            emptyMessage={tokenFilterPlayerId ? "No available tokens for this player" : "No tokens in inventory"}
            emptyIcon="💎"
            selectedTokenId={selectedTokenForPlayer?.id}
          />
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
  onClearFilter: PropTypes.func,
  lineup: PropTypes.object,
  onSelectPlayerForSlot: PropTypes.func,
  onSelectTokenForPlayer: PropTypes.func,
  selectedPlayerForSlot: PropTypes.object,
  selectedTokenForPlayer: PropTypes.object
};
