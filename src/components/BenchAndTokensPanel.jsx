import { useState } from 'react';
import PropTypes from 'prop-types';
import PlayerTable from './tables/PlayerTable';
import TokenTable from './tables/TokenTable';

/**
 * BenchAndTokensPanel Component
 * 
 * Displays bench players and tokens with filtering tabs.
 * Features:
 * - ALL tab: Shows both players and tokens
 * - PLAYERS tab: Only bench players
 * - TOKENS tab: Only tokens
 * - Bulk actions (select multiple items)
 * - Filters by position
 */
export default function BenchAndTokensPanel({
  benchPlayers,
  tokens,
  onPlayerDragStart,
  onPlayerClick,
  onPlayerSelected,
  selectedPlayerIds,
  filterPosition = null,
  onTokenDragStart,
  onTokenClick,
  selectedTokenIds,
  onTokenSelected,
  onAddButtonClick,
  selectedPlayerId,
  selectedTokenId,
  liveGameData,
  projections
) {
  const [activeTab, setActiveTab] = useState('all');

  // Safely handle undefined/null arrays
  const safeBenchPlayers = benchPlayers || [];
  const safeTokens = tokens || [];

  const shouldShowPlayers = activeTab === 'all' || activeTab === 'players';
  const shouldShowTokens = activeTab === 'all' || activeTab === 'tokens';

  return (
    <div className="bg-primary-black-900 rounded-xl border-2 border-primary-black-700">
      {/* Header with Tabs */}
      <div className="px-1.5 sm:px-3 md:px-4 pt-2 md:pt-3 pb-1.5 md:pb-2 border-b border-primary-black-700">
        <div className="flex items-center justify-between mb-2 md:mb-3">
          <div className="flex gap-1 md:gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-1 md:px-2 py-0.5 md:py-1 rounded text-[9px] md:text-xs font-bold transition-colors ${
                activeTab === 'all'
                  ? 'bg-primary-green-500 text-white'
                  : 'bg-primary-black-700 text-primary-black-300 hover:bg-primary-black-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('players')}
              className={`px-1 md:px-2 py-0.5 md:py-1 rounded text-[9px] md:text-xs font-bold transition-colors ${
                activeTab === 'players'
                  ? 'bg-primary-green-500 text-white'
                  : 'bg-primary-black-700 text-primary-black-300 hover:bg-primary-black-600'
              }`}
            >
              Players
            </button>
            <button
              onClick={() => setActiveTab('tokens')}
              className={`px-1 md:px-2 py-0.5 md:py-1 rounded text-[9px] md:text-xs font-bold transition-colors ${
                activeTab === 'tokens'
                  ? 'bg-primary-green-500 text-white'
                  : 'bg-primary-black-700 text-primary-black-300 hover:bg-primary-black-600'
              }`}
            >
              Tokens
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-1.5 sm:px-3 md:px-4 py-2 md:py-4">
        {/* Players Section */}
        {shouldShowPlayers && safeBenchPlayers.length > 0 && (
          <div className="mb-3 md:mb-4">
            {shouldShowTokens && (
              <h3 className="text-sm md:text-base font-bold text-primary-black-300 mb-2 md:mb-3">Players</h3>
            )}
            <PlayerTable
              players={safeBenchPlayers}
              showAddButton={!!onAddButtonClick}
              onRowDragStart={onPlayerDragStart}
              onRowClick={onPlayerClick}
              onAddButtonClick={onAddButtonClick}
              selectedPlayerId={selectedPlayerId}
              emptyMessage="No bench players"
              emptyIcon="🏈"
            />
          </div>
        )}

        {/* Tokens Section */}
        {shouldShowTokens && safeTokens.length > 0 && (
          <div>
            {shouldShowPlayers && (
              <h3 className="text-sm md:text-base font-bold text-primary-black-300 mb-2 md:mb-3">Tokens</h3>
            )}
            <TokenTable
              tokens={safeTokens}
              showAddButton={!!onTokenClick}
              onRowDragStart={onTokenDragStart}
              onRowClick={onTokenClick}
              onAddButtonClick={onTokenClick}
              selectedTokenId={selectedTokenId}
              emptyMessage="No tokens available"
              emptyIcon="💎"
            />
          </div>
        )}

        {/* Empty States */}
        {shouldShowPlayers && !shouldShowTokens && safeBenchPlayers.length === 0 && (
          <div className="flex items-center justify-center py-8 md:py-12 text-center">
            <div>
              <div className="text-3xl md:text-4xl mb-2 opacity-30">🏈</div>
              <p className="text-primary-black-400 font-semibold">No bench players</p>
            </div>
          </div>
        )}

        {!shouldShowPlayers && shouldShowTokens && safeTokens.length === 0 && (
          <div className="flex items-center justify-center py-8 md:py-12 text-center">
            <div>
              <div className="text-3xl md:text-4xl mb-2 opacity-30">💎</div>
              <p className="text-primary-black-400 font-semibold">No tokens available</p>
            </div>
          </div>
        )}

        {shouldShowPlayers && shouldShowTokens && safeBenchPlayers.length === 0 && safeTokens.length === 0 && (
          <div className="flex items-center justify-center py-8 md:py-12 text-center">
            <div>
              <div className="text-3xl md:text-4xl mb-2 opacity-30">📦</div>
              <p className="text-primary-black-400 font-semibold">No players or tokens</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

BenchAndTokensPanel.propTypes = {
  benchPlayers: PropTypes.array.isRequired,
  tokens: PropTypes.array.isRequired,
  onPlayerDragStart: PropTypes.func,
  onPlayerClick: PropTypes.func,
  onPlayerSelected: PropTypes.func,
  selectedPlayerIds: PropTypes.array,
  filterPosition: PropTypes.string,
  onTokenDragStart: PropTypes.func,
  onTokenClick: PropTypes.func,
  selectedTokenIds: PropTypes.array,
  onTokenSelected: PropTypes.func,
  onAddButtonClick: PropTypes.func,
  selectedPlayerId: PropTypes.string,
  selectedTokenId: PropTypes.string,
  liveGameData: PropTypes.instanceOf(Map),
  projections: PropTypes.instanceOf(Map)
};
