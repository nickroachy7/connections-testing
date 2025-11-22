import { useState } from 'react';
import PropTypes from 'prop-types';
import PlayerTable from './tables/PlayerTable';
import TokenTable from './tables/TokenTable';
import { enrichPlayerData, enrichTokenData } from './tables/tableHelpers.jsx';

/**
 * BenchAndTokensPanel Component
 * 
 * Displays bench players and tokens with filtering tabs.
 * Features:
 * - ALL tab: Shows both players and tokens
 * - PLAYERS tab: Only bench players
 * - TOKENS tab: Only tokens
 * - Click-to-add actions for lineup building
 * - Filters by position
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
  onRemoveToken,
  filterPosition = null,
  tokenFilterPlayerId = null,
  tokenFilterPlayer = null,
  onApplyTokenToPlayer,
  onMoveToSlot,
  onClearFilter,
  lineup,
  onSelectPlayerForSlot,
  onSelectTokenForPlayer,
  selectedPlayerForSlot,
  selectedTokenForPlayer
}) {
  const [activeTab, setActiveTab] = useState('all');

  // Safely handle undefined/null arrays
  const safeBenchPlayers = benchPlayers || [];
  const safeTokens = availableTokens || [];

  const shouldShowPlayers = activeTab === 'all' || activeTab === 'players';
  const shouldShowTokens = activeTab === 'all' || activeTab === 'tokens';

  // Filter players by position if filter is active
  const filteredPlayers = filterPosition 
    ? safeBenchPlayers.filter(p => {
        const posMap = {
          'QB': 'Quarterback',
          'RB1': 'Running Back',
          'RB2': 'Running Back',
          'WR1': 'Wide Receiver',
          'WR2': 'Wide Receiver',
          'WR3': 'Wide Receiver',
          'TE': 'Tight End',
          'FLEX': ['Running Back', 'Wide Receiver', 'Tight End']
        };
        
        const allowedPositions = Array.isArray(posMap[filterPosition]) 
          ? posMap[filterPosition]
          : [posMap[filterPosition]];
        
        return allowedPositions.includes(p.player_card.position);
      })
    : safeBenchPlayers;

  // Filter tokens by player if filter is active
  const filteredTokens = tokenFilterPlayerId 
    ? safeTokens.filter(t => !t.is_active) // Only show unapplied tokens
    : safeTokens.filter(t => !t.is_active); // Always filter to unapplied tokens

  // Enrich player data with live game info and projections
  const enrichedPlayers = filteredPlayers.map(player => 
    enrichPlayerData(player, liveGameData, projections)
  );

  // Enrich token data
  const enrichedTokens = filteredTokens.map(token => 
    enrichTokenData(token)
  );

  return (
    <div data-bench-section>
      {/* Filter Badge and Tabs */}
      {(filterPosition || tokenFilterPlayerId) && (
        <div className="mb-4 flex items-center gap-2">
          <div className="px-3 py-2 bg-primary-green-500/20 border border-primary-green-500 rounded-lg flex items-center gap-2">
            <span className="text-sm font-semibold text-primary-green-400">
              {filterPosition ? `Filtering: ${filterPosition}` : `Tokens for: ${tokenFilterPlayer?.player_card?.player_name || 'Player'}`}
            </span>
            <button
              onClick={onClearFilter}
              className="text-primary-green-400 hover:text-primary-green-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Tabs */}
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
        </div>
      )}

      {/* Players Section */}
      {shouldShowPlayers && enrichedPlayers.length > 0 && (
        <div className="mb-6">
          <PlayerTable
              players={enrichedPlayers}
              showAddButton={true}
              onRowDragStart={onPlayerDragStart}
              onRowClick={(player) => {
                if (onMoveToSlot && filterPosition) {
                  onMoveToSlot(player, filterPosition);
                } else if (onSelectPlayerForSlot) {
                  onSelectPlayerForSlot(player);
                }
              }}
              onAddButtonClick={(player) => {
                if (onMoveToSlot && filterPosition) {
                  onMoveToSlot(player, filterPosition);
                } else if (onSelectPlayerForSlot) {
                  onSelectPlayerForSlot(player);
                }
              }}
              selectedPlayerId={selectedPlayerForSlot?.id}
            emptyMessage="No bench players"
            emptyIcon="🏈"
          />
        </div>
      )}

      {/* Tokens Section */}
      {shouldShowTokens && enrichedTokens.length > 0 && (
        <div className="mb-6">
          <TokenTable
            tokens={enrichedTokens}
            showAddButton={true}
            onRowDragStart={onTokenDragStart}
            onDragEnd={onTokenDragEnd}
            onRowClick={(token) => {
              if (tokenFilterPlayerId && onApplyTokenToPlayer) {
                onApplyTokenToPlayer(token, tokenFilterPlayerId);
              } else if (onSelectTokenForPlayer) {
                onSelectTokenForPlayer(token);
              }
            }}
            onAddButtonClick={(token) => {
              if (tokenFilterPlayerId && onApplyTokenToPlayer) {
                onApplyTokenToPlayer(token, tokenFilterPlayerId);
              } else if (onSelectTokenForPlayer) {
                onSelectTokenForPlayer(token);
              }
            }}
            selectedTokenId={selectedTokenForPlayer?.id}
            emptyMessage="No tokens available"
            emptyIcon="💎"
          />
        </div>
      )}

      {/* Empty States */}
      {shouldShowPlayers && !shouldShowTokens && enrichedPlayers.length === 0 && (
        <div className="flex items-center justify-center py-12 text-center">
          <div>
            <div className="text-4xl mb-2 opacity-30">🏈</div>
            <p className="text-primary-black-400 font-semibold">
              {filterPosition ? `No ${filterPosition} players available` : 'No bench players'}
            </p>
          </div>
        </div>
      )}

      {!shouldShowPlayers && shouldShowTokens && enrichedTokens.length === 0 && (
        <div className="flex items-center justify-center py-12 text-center">
          <div>
            <div className="text-4xl mb-2 opacity-30">💎</div>
            <p className="text-primary-black-400 font-semibold">
              {tokenFilterPlayerId ? 'No tokens available' : 'No tokens available'}
            </p>
          </div>
        </div>
      )}

      {shouldShowPlayers && shouldShowTokens && enrichedPlayers.length === 0 && enrichedTokens.length === 0 && (
        <div className="flex items-center justify-center py-12 text-center">
          <div>
            <div className="text-4xl mb-2 opacity-30">📦</div>
            <p className="text-primary-black-400 font-semibold">No players or tokens</p>
          </div>
        </div>
      )}
    </div>
  );
}BenchAndTokensPanel.propTypes = {
  benchPlayers: PropTypes.array.isRequired,
  availableTokens: PropTypes.array.isRequired,
  onPlayerDragStart: PropTypes.func,
  onTokenDragStart: PropTypes.func,
  onTokenDragEnd: PropTypes.func,
  onPlayerDrop: PropTypes.func,
  liveGameData: PropTypes.instanceOf(Map),
  projections: PropTypes.instanceOf(Map),
  inventory: PropTypes.object,
  onRemoveToken: PropTypes.func,
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
