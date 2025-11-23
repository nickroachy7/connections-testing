import { useState } from 'react';
import PropTypes from 'prop-types';
import PlayerTable from './tables/PlayerTable';
import TokenTable from './tables/TokenTable';
import { enrichPlayerData, enrichTokenData } from '../utils/index';
import { useIsMobile } from '../hooks/ui';

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
  selectedTokenForPlayer,
  onBenchPlayerClick,
  onTokenClick
}) {
  const [activeTab, setActiveTab] = useState('all');
  const isMobile = useIsMobile();

  // Safely handle undefined/null arrays
  const safeBenchPlayers = benchPlayers || [];
  const safeTokens = availableTokens || [];

  // When filtering tokens for a specific player, force tokens tab
  // On mobile, always show all items (ignore tab state)
  const effectiveTab = tokenFilterPlayerId ? 'tokens' : (isMobile ? 'all' : activeTab);
  
  const shouldShowPlayers = effectiveTab === 'all' || effectiveTab === 'players';
  const shouldShowTokens = effectiveTab === 'all' || effectiveTab === 'tokens';

  // Filter players by position if filter is active
  const filteredPlayers = filterPosition 
    ? safeBenchPlayers.filter(p => {
        // Handle FLEX position - RB, WR, or TE
        if (filterPosition === 'FLEX') {
          return ['Running Back', 'Wide Receiver', 'Tight End'].includes(p.player_card.position);
        }
        // Handle RB position
        if (filterPosition === 'RB1' || filterPosition === 'RB2') {
          return p.player_card.position === 'Running Back';
        }
        // Handle WR position
        if (filterPosition === 'WR1' || filterPosition === 'WR2' || filterPosition === 'WR3') {
          return p.player_card.position === 'Wide Receiver';
        }
        // Direct position match
        return p.player_card.position === filterPosition;
      })
    : safeBenchPlayers;

  // Filter tokens by player if filter is active
  const filteredTokens = tokenFilterPlayerId 
    ? safeTokens.filter(t => !t.is_active) // Only show unapplied tokens when filtering
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
    <>
      {/* Filter Badge */}
      {(filterPosition || tokenFilterPlayerId) && (
        <div className="mb-3 sm:mb-4 flex items-center justify-between bg-dk-black-tertiary border border-dk-black-light rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            {filterPosition ? (
              <>
                <span className="text-xs font-dk-display font-bold text-dk-white-muted">Filtering:</span>
                <span className="px-2 py-1 bg-dk-green-primary/20 text-dk-green-primary rounded text-xs font-bold">
                  {filterPosition} Players
                </span>
              </>
            ) : (
              <>
                <span className="text-xs font-dk-display font-bold text-dk-white-muted">Selecting token for:</span>
                <span className="px-2 py-1 bg-dk-green-primary/20 text-dk-green-primary rounded text-xs font-bold">
                  {tokenFilterPlayer?.player_card?.player_name || 'Unknown Player'}
                </span>
              </>
            )}
          </div>
          <button
            onClick={onClearFilter}
            className="p-1.5 rounded bg-dk-black-light hover:bg-dk-black-primary transition-colors"
          >
            <svg className="w-4 h-4 text-dk-white-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Tabs - Desktop only */}
      <div className="hidden md:flex gap-2 mb-3 sm:mb-4 bg-dk-black-tertiary rounded-lg p-1">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 px-4 py-2 rounded text-sm font-dk-display font-bold transition-all duration-200 ${
            activeTab === 'all'
              ? 'bg-dk-green-primary text-dk-black-primary'
              : 'text-dk-white-muted hover:text-dk-white-primary'
          }`}
        >
          ALL
        </button>
        <button
          onClick={() => setActiveTab('players')}
          className={`flex-1 px-4 py-2 rounded text-sm font-dk-display font-bold transition-all duration-200 ${
            activeTab === 'players'
              ? 'bg-dk-green-primary text-dk-black-primary'
              : 'text-dk-white-muted hover:text-dk-white-primary'
          }`}
        >
          PLAYERS ({enrichedPlayers.length})
        </button>
        <button
          onClick={() => setActiveTab('tokens')}
          className={`flex-1 px-4 py-2 rounded text-sm font-dk-display font-bold transition-all duration-200 ${
            activeTab === 'tokens'
              ? 'bg-dk-green-primary text-dk-black-primary'
              : 'text-dk-white-muted hover:text-dk-white-primary'
          }`}
        >
          TOKENS ({enrichedTokens.length})
        </button>
      </div>

      {/* Content */}
      <div className="space-y-3 sm:space-y-4">
        {/* Players Section - Wrapped in separate container */}
        {shouldShowPlayers && enrichedPlayers.length > 0 && (
          <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-lg sm:rounded-xl">
            <div className="md:px-3 lg:px-4 md:py-3 lg:py-4">
              <PlayerTable
                players={enrichedPlayers}
                showAddButton={true}
                onRowDragStart={onPlayerDragStart}
                onRowClick={(player) => {
                  // On mobile, always open the swap modal
                  if (isMobile && onBenchPlayerClick) {
                    onBenchPlayerClick(player);
                  } else if (onMoveToSlot && filterPosition) {
                    // Desktop with filter active - use existing behavior
                    onMoveToSlot(player, filterPosition);
                  } else if (onSelectPlayerForSlot) {
                    // Desktop without filter - select player
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
          </div>
        )}

        {/* Tokens Section - Wrapped in separate container */}
        {shouldShowTokens && enrichedTokens.length > 0 && (
          <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-lg sm:rounded-xl">
            <div className="md:px-3 lg:px-4 md:py-3 lg:py-4">
              {tokenFilterPlayerId && (
                <div className="text-xs text-dk-white-muted mb-2 px-2">
                  Tap a token to apply it to this player
                </div>
              )}
              <TokenTable
            tokens={enrichedTokens}
            onRowDragStart={onTokenDragStart}
            onDragEnd={onTokenDragEnd}
            onRowClick={(token) => {
              if (isMobile) {
                // Mobile: Open modal
                if (onTokenClick) {
                  onTokenClick(token);
                }
              } else {
                // Desktop: Show selection
                if (onSelectTokenForPlayer) {
                  onSelectTokenForPlayer(token);
                }
              }
            }}
            getRowClassName={(token, index) => {
              const isSelected = selectedTokenForPlayer?.id === token.id;
              const baseClassName = `
                grid md:py-2 md:px-2 transition-all md:border-l-4 min-h-[64px] md:min-h-[48px]
                ${
                  isSelected
                    ? 'cursor-pointer bg-dk-green-primary/10 md:border-dk-green-primary'
                    : 'cursor-move hover:bg-primary-green-500/10 md:hover:border-primary-green-500 md:border-transparent'
                }
                ${index % 2 === 0 ? 'bg-primary-black-800/20' : 'bg-primary-black-800/40'}
              `;
              return baseClassName;
            }}
            emptyMessage={tokenFilterPlayerId ? "No available tokens for this player" : "No tokens available"}
            emptyIcon="💎"
          />
            </div>
          </div>
        )}

        {/* Empty State */}
        {((shouldShowPlayers && enrichedPlayers.length === 0) || (shouldShowTokens && enrichedTokens.length === 0)) && 
         !(shouldShowPlayers && enrichedPlayers.length > 0) && 
         !(shouldShowTokens && enrichedTokens.length > 0) && (
          <div className="text-center py-12 text-dk-white-muted">
            <div className="text-4xl mb-2 opacity-30">
              {filterPosition ? '🏈' : tokenFilterPlayerId ? '💎' : '📦'}
            </div>
            <p className="font-semibold">
              {filterPosition 
                ? `No ${filterPosition} players available` 
                : tokenFilterPlayerId 
                  ? 'No tokens available for this player'
                  : 'No items available'}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

BenchAndTokensPanel.propTypes = {
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
  selectedTokenForPlayer: PropTypes.object,
  onBenchPlayerClick: PropTypes.func,
  onTokenClick: PropTypes.func
};