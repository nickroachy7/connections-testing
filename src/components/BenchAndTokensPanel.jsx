import { useState } from 'react';
import PropTypes from 'prop-types';
import PlayerTable from './tables/PlayerTable';
import TokenTable from './tables/TokenTable';
import { enrichPlayerData, enrichTokenData } from './tables/tableHelpers.jsx';
import { useIsMobile } from '../hooks';

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
        const playerPos = p.player_card.position;
        if (filterPosition === 'FLEX') {
          return ['Running Back', 'Wide Receiver', 'Tight End'].includes(playerPos);
        }
        // Map position abbreviations to full names
        const positionMap = {
          'QB': 'Quarterback',
          'RB': 'Running Back',
          'WR': 'Wide Receiver',
          'TE': 'Tight End'
        };
        return playerPos === positionMap[filterPosition];
      })
    : safeBenchPlayers;

  // Filter tokens by player if filter is active
  const filteredTokens = tokenFilterPlayerId 
    ? safeTokens.filter(t => !t.is_active)
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
                <svg className="w-4 h-4 text-dk-green-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-dk-display font-bold text-dk-white">
                  Showing {filterPosition} Players
                </span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm font-dk-display font-bold text-dk-white">
                  Tokens for {tokenFilterPlayer?.player_card?.player_name}
                </span>
              </>
            )}
          </div>
          <button
            onClick={onClearFilter}
            className="text-xs font-dk font-semibold text-dk-white-muted hover:text-dk-white transition-colors"
          >
            Clear Filter
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
              : 'text-dk-white-muted hover:text-dk-white hover:bg-dk-black-light'
          }`}
        >
          ALL ({enrichedPlayers.length + enrichedTokens.length})
        </button>
        <button
          onClick={() => setActiveTab('players')}
          className={`flex-1 px-4 py-2 rounded text-sm font-dk-display font-bold transition-all duration-200 ${
            activeTab === 'players'
              ? 'bg-dk-green-primary text-dk-black-primary'
              : 'text-dk-white-muted hover:text-dk-white hover:bg-dk-black-light'
          }`}
        >
          PLAYERS ({enrichedPlayers.length})
        </button>
        <button
          onClick={() => setActiveTab('tokens')}
          className={`flex-1 px-4 py-2 rounded text-sm font-dk-display font-bold transition-all duration-200 ${
            activeTab === 'tokens'
              ? 'bg-dk-green-primary text-dk-black-primary'
              : 'text-dk-white-muted hover:text-dk-white hover:bg-dk-black-light'
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
                showBenchBadge={true}
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
              // If filtering for a specific player, apply token immediately (mobile or desktop)
              if (tokenFilterPlayerId && onApplyTokenToPlayer) {
                onApplyTokenToPlayer(token, tokenFilterPlayerId);
              }
              // Mobile without filter: Open modal to select player
              else if (isMobile && onTokenClick) {
                onTokenClick(token);
              }
              // Desktop without filter: Select token for later application
              else if (onSelectTokenForPlayer) {
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
            inventory={inventory}
            onRemove={onRemoveToken}
            selectedTokenId={selectedTokenForPlayer?.id}
            emptyMessage={tokenFilterPlayerId ? "No available tokens for this player" : "No tokens available"}
            emptyIcon="💎"
          />
            </div>
          </div>
        )}

        {/* Empty State */}
        {enrichedPlayers.length === 0 && enrichedTokens.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-3 opacity-20">🏈</div>
            <p className="text-dk-white-muted font-dk">
              {filterPosition 
                ? `No ${filterPosition} players available`
                : tokenFilterPlayerId
                ? "No tokens available for this player"
                : "No items in your bench"}
            </p>
            {!filterPosition && !tokenFilterPlayerId && (
              <p className="text-dk-white-muted text-sm mt-2 font-dk">
                Open packs to add more players and tokens!
              </p>
            )}
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
