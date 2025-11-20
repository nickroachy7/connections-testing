import { useState } from 'react';
import PropTypes from 'prop-types';
import { getRosterCount, ROSTER_LIMIT } from '../utils/rosterLimits';
import { calculatePlayerSellValue, calculateTokenSellValue } from '../utils/sellValueCalculator';

/**
 * InventoryPanel Component
 * 
 * Similar to BenchAndTokensPanel but for the Inventory page.
 * Shows all players and tokens with ability to sell cards.
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
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'players', or 'tokens'
  const [selectedForBulkAction, setSelectedForBulkAction] = useState([]); // Array of {id, type: 'player'|'token', value}

  // Sort players by position (QB, RB, WR, TE)
  const getPositionOrder = (position) => {
    const order = {
      'Quarterback': 1,
      'Running Back': 2,
      'Wide Receiver': 3,
      'Tight End': 4
    };
    return order[position] || 999;
  };

  const sortedPlayers = [...players].sort((a, b) => {
    return getPositionOrder(a.player_card.position) - getPositionOrder(b.player_card.position);
  });

  // Bulk action handlers
  const handleToggleBulkSelect = (item, cardType) => {
    const itemId = item.id;
    if (selectedForBulkAction.find(s => s.id === itemId)) {
      setSelectedForBulkAction(selectedForBulkAction.filter(s => s.id !== itemId));
    } else {
      const value = cardType === 'player' ? calculatePlayerSellValue(item) : calculateTokenSellValue(item);
      setSelectedForBulkAction([...selectedForBulkAction, { id: itemId, type: cardType, value, item }]);
    }
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
      // Sell all cards in parallel - skip individual confirmations
      await Promise.all(
        selectedForBulkAction.map(selection => 
          onQuickSell(selection.id, selection.type, selection.value, true) // skipConfirm = true
        )
      );
      
      // Clear selection after all sales complete
      setSelectedForBulkAction([]);
      
      // Reload profile to update coin balance in header (do this first for immediate visual feedback)
      if (onReloadProfile) {
        onReloadProfile(); // Call without await for immediate UI update
      }
      
      // Then reload inventory to show updated list
      if (onBulkSellComplete) {
        await onBulkSellComplete();
      }
    } catch (err) {
      console.error('Error bulk selling:', err);
    }
  };

  const getPullPercentageColor = (percentage) => {
    if (!percentage) return 'text-primary-black-500';
    if (percentage <= 2) return 'text-yellow-400'; // Elite - very rare (2%)
    if (percentage <= 18) return 'text-purple-400'; // Top starters - uncommon (18%)
    if (percentage <= 12) return 'text-blue-400'; // Rotational - less common (12%)
    if (percentage >= 50) return 'text-primary-green-400'; // Solid starters - most common (55%)
    return 'text-primary-black-400'; // Backup/trash - rare (5%)
  };

  const getTierBadgeInfo = (tier) => {
    const tiers = {
      base: { initial: 'B', color: 'bg-gray-600 text-gray-100' },
      role_player: { initial: 'R', color: 'bg-blue-600 text-blue-100' },
      starter: { initial: 'S', color: 'bg-purple-600 text-purple-100' },
      all_star: { initial: 'A', color: 'bg-orange-600 text-orange-100' },
      elite: { initial: 'E', color: 'bg-gradient-to-r from-yellow-600 to-orange-600 text-yellow-100' }
    };
    return tiers[tier] || tiers.base;
  };

  const getRarityBadgeColor = (rarity) => {
    switch (rarity) {
      case 'legendary': return 'bg-yellow-600 text-yellow-100';
      case 'epic': return 'bg-purple-600 text-purple-100';
      case 'rare': return 'bg-blue-600 text-blue-100';
      default: return 'bg-gray-600 text-gray-100';
    }
  };

  const getTokenRarityColor = (rarity) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-600 to-orange-600 border-yellow-500/50';
      case 'epic': return 'from-purple-600 to-pink-600 border-purple-500/50';
      case 'rare': return 'from-blue-600 to-cyan-600 border-blue-500/50';
      default: return 'from-gray-600 to-gray-700 border-gray-500/50';
    }
  };

  const getInjuryStatusBadge = (injuryStatus) => {
    if (!injuryStatus || injuryStatus === 'Healthy' || injuryStatus === 'healthy') {
      return null;
    }

    const statusConfig = {
      'Out': { bg: 'bg-red-600', text: 'text-white', label: 'O' },
      'IR': { bg: 'bg-red-700', text: 'text-white', label: 'IR' },
      'Injured Reserve': { bg: 'bg-red-700', text: 'text-white', label: 'IR' },
      'Doubtful': { bg: 'bg-orange-600', text: 'text-white', label: 'D' },
      'Questionable': { bg: 'bg-yellow-600', text: 'text-black', label: 'Q' },
      'Q': { bg: 'bg-yellow-600', text: 'text-black', label: 'Q' }
    };

    const config = statusConfig[injuryStatus] || { bg: 'bg-gray-600', text: 'text-white', label: injuryStatus.substring(0, 1).toUpperCase() };

    return (
      <span className={`px-1.5 py-0.5 ${config.bg} ${config.text} rounded text-[10px] font-bold`}>
        {config.label}
      </span>
    );
  };

  const getGameStatusBadge = (playerId) => {
    const gameData = liveGameData?.get(playerId);
    if (!gameData) return null;
    
    const { gameStatus, currentPoints, opponent, isHome, gameStartTime } = gameData;
    
    switch (gameStatus) {
      case 'live':
      case 'halftime':
        return (
          <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold flex items-center gap-1">
            <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
            LIVE • {currentPoints.toFixed(1)} pts
          </span>
        );
      case 'final':
        return (
          <span className="px-2 py-1 bg-green-600 text-white rounded text-xs font-bold">
            ✓ {currentPoints.toFixed(1)} pts
          </span>
        );
      case 'scheduled':
        return (
          <div className="px-2 py-1 bg-primary-black-700 text-primary-black-300 rounded text-xs text-center">
            <div className="font-semibold">
              {isHome ? 'vs' : '@'} {opponent}
            </div>
            {gameStartTime && (
              <div className="text-primary-black-400 mt-0.5 text-[10px]">
                {new Date(gameStartTime).toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })} • {new Date(gameStartTime).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Filter players
  const filteredPlayers = sortedPlayers.filter(player => {
    const matchesPosition = filters.position === 'all' || player.player_card.position === filters.position;
    const matchesSearch = filters.search === '' || 
      player.player_card.player_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      player.player_card.team_abbreviation.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesPosition && matchesSearch;
  });

  // Filter tokens
  const filteredTokens = tokens.filter(token => {
    const matchesType = filters.tokenType === 'all' || token.token_card.token_type === filters.tokenType;
    const matchesSearch = filters.search === '' || 
      token.token_card.token_name.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesType && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-xl">
        {/* Sticky Header with Filter Bar */}
        <div className="sticky top-0 z-20 bg-primary-black-900 border-b-2 border-primary-black-700 rounded-t-xl">
            <div className="px-4 py-4">
              <div className="flex items-center justify-between gap-6">
                {/* Title */}
                <div className="flex-shrink-0">
                  <h3 className="text-xl font-bold text-primary-black-50">
                    Inventory
                  </h3>
                  <p className="text-xs text-primary-black-400 mt-0.5">
                    <span className="font-medium text-primary-black-500">Roster:</span>{' '}
                    <span className="font-bold text-primary-black-400">
                      {inventory ? getRosterCount(inventory) : (players.length + tokens.length)}/{ROSTER_LIMIT}
                    </span>
                  </p>
                </div>

                {/* Right Side - Tab Filters and Sell Button */}
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
                        onClick={handleBulkQuickSell}
                        disabled={selling?.bulk}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-all shadow-lg"
                      >
                        {selling?.bulk ? 'Selling...' : `Sell ${selectedForBulkAction.length}`}
                      </button>
                      <div className="w-px bg-primary-black-700"></div>
                    </>
                  )}
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                      ${activeTab === 'all'
                        ? 'bg-primary-green-500 text-primary-black-950'
                        : 'bg-primary-black-800 text-primary-black-400 hover:bg-primary-black-700'
                      }
                    `}
                  >
                    All ({filteredPlayers.length + filteredTokens.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('players')}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                      ${activeTab === 'players'
                        ? 'bg-primary-green-500 text-primary-black-950'
                        : 'bg-primary-black-800 text-primary-black-400 hover:bg-primary-black-700'
                      }
                    `}
                  >
                    Players ({filteredPlayers.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('tokens')}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                      ${activeTab === 'tokens'
                        ? 'bg-primary-green-500 text-primary-black-950'
                        : 'bg-primary-black-800 text-primary-black-400 hover:bg-primary-black-700'
                      }
                    `}
                  >
                    Tokens ({filteredTokens.length})
                  </button>
                </div>
                )}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="py-4">
            {/* All View */}
            {activeTab === 'all' && (
              <div>
                {filteredPlayers.length === 0 && filteredTokens.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-center">
                    <div>
                      <div className="text-4xl mb-2 opacity-30">🎴</div>
                      <p className="text-primary-black-400 font-semibold mb-1">No cards found</p>
                      <p className="text-primary-black-500 text-sm">Try adjusting your filters</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Players Section */}
                    {filteredPlayers.length > 0 && filteredPlayers.map((player, index) => {
                      const isSelected = selectedForBulkAction.some(s => s.id === player.id);
                      const cannotSelect = player.is_locked;
                      
                      return (
                      <div
                        key={player.id}
                        className={`
                          flex items-center gap-4 px-4 py-4 transition-all
                          ${!cannotSelect && 'border-l-4'}
                          ${cannotSelect ? 'opacity-60 bg-red-900/20 border-red-500/50' : isSelected ? 'border-primary-green-500 bg-primary-green-500/20' : 'border-transparent hover:bg-primary-green-500/10 hover:border-primary-green-500'}
                          ${index % 2 === 0 && !cannotSelect && !isSelected ? 'bg-primary-black-900' : !cannotSelect && !isSelected ? 'bg-primary-black-800/50' : ''}
                        `}
                      >
                        {/* Checkbox - Always Visible */}
                        <div className="flex-shrink-0 flex items-center justify-center w-6">
                          {!cannotSelect ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleBulkSelect(player, 'player')}
                              onClick={(e) => e.stopPropagation()}
                              className="w-5 h-5 rounded border-2 border-primary-black-600 bg-primary-black-800 checked:bg-primary-green-500 checked:border-primary-green-500 cursor-pointer hover:border-primary-green-500 transition-colors"
                            />
                          ) : (
                            <div className="w-5 h-5"></div>
                          )}
                        </div>
                        
                        {/* Position Badge */}
                        <span className="px-2 py-0.5 bg-primary-black-700 text-primary-black-300 rounded text-xs font-semibold flex-shrink-0">
                          {player.player_card.position === 'Quarterback' ? 'QB' :
                           player.player_card.position === 'Running Back' ? 'RB' :
                           player.player_card.position === 'Wide Receiver' ? 'WR' :
                           player.player_card.position === 'Tight End' ? 'TE' :
                           player.player_card.position}
                        </span>

                        {/* Person Icon */}
                        <div className="w-10 h-10 rounded-md bg-primary-black-700 flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-primary-black-300" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                        </div>

{/* Player Info */}
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 mb-1">
                             <h4 className="font-bold text-primary-black-50 truncate text-base">
                               {player.player_card.player_name}
                             </h4>
                             <span className="text-xs text-primary-black-500 font-medium">
                               {player.player_card.team_abbreviation}
                             </span>
                             {getInjuryStatusBadge(player.player_card.injury_status)}
                           </div>
                          
                          <div className="flex items-center gap-2 text-xs text-primary-black-400">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getTierBadgeInfo(player.card_tier).color}`}>
                              {getTierBadgeInfo(player.card_tier).initial}
                            </span>
                            <span className="font-medium">Level {player.card_level}</span>
                            {player.experience_points !== undefined && (
                              <span className="text-primary-black-500 font-medium text-[10px]">
                                {player.experience_points} XP
                              </span>
                            )}
                            {player.player_card.pull_percentage && (
                              <span className={`font-semibold ${getPullPercentageColor(player.player_card.pull_percentage)}`}>
                                {player.player_card.pull_percentage.toFixed(1)}% pull
                              </span>
                            )}
                            {player.total_fantasy_points > 0 && (
                              <span className="text-primary-black-500 font-medium">
                                Total: {player.total_fantasy_points.toFixed(1)} pts
                              </span>
                            )}
                            {player.is_in_lineup && (
                              <span className="px-2 py-0.5 bg-green-600/20 border border-green-600 text-green-400 rounded font-semibold">
                                In Lineup
                              </span>
                            )}
                            {player.is_locked && (
                              <span className="px-2 py-0.5 bg-red-600/20 border border-red-600 text-red-400 rounded font-semibold">
                                🔒 Locked
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Sell Value, Game Status and Projected Points */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-center">
                            <div className="text-xs text-primary-black-500 mb-0.5">Sell Value</div>
                            <div className="text-sm text-primary-black-300 font-semibold">
                              💰 {calculatePlayerSellValue(player)}
                            </div>
                          </div>
                          <div>
                            {getGameStatusBadge(player.player_card.player_id)}
                          </div>
                          {loadingProjections ? (
                            <span className="text-xs text-primary-black-400">...</span>
                          ) : projections?.has(player.player_card.player_id) ? (
                            <div className="text-primary-green-400 font-semibold text-sm">
                              Proj: {projections.get(player.player_card.player_id).projected.toFixed(1)} pts
                            </div>
                          ) : null}
                        </div>

                        {/* Individual Sell Button */}
                        <div className="flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickSell(player.id, 'player', calculatePlayerSellValue(player));
                            }}
                            disabled={selling[player.id] || player.is_locked}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold transition-colors"
                          >
                            {selling[player.id] ? 'Selling...' : 'Sell'}
                          </button>
                        </div>
                      </div>
                      );
                    })}

                    {/* Tokens Section */}
                    {filteredTokens.length > 0 && filteredTokens.map((token, index) => {
                      const rowIndex = filteredPlayers.length + index;
                      const isSelected = selectedForBulkAction.some(s => s.id === token.id);
                      
                      return (
                        <div
                          key={token.id}
                          className={`
                            flex items-center gap-4 px-4 py-4 transition-all border-l-4
                            ${isSelected ? 'border-primary-green-500 bg-primary-green-500/20' : 'border-transparent hover:bg-primary-green-500/10 hover:border-primary-green-500'}
                            ${rowIndex % 2 === 0 && !isSelected ? 'bg-primary-black-900' : !isSelected ? 'bg-primary-black-800/50' : ''}
                          `}
                        >
                          {/* Checkbox */}
                          <div className="flex-shrink-0 flex items-center justify-center w-6">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleBulkSelect(token, 'token')}
                              onClick={(e) => e.stopPropagation()}
                              className="w-5 h-5 rounded border-2 border-primary-black-600 bg-primary-black-800 checked:bg-primary-green-500 checked:border-primary-green-500 cursor-pointer hover:border-primary-green-500 transition-colors"
                            />
                          </div>
                          
                          {/* Position Badge for Token */}
                          <span className="px-2 py-0.5 bg-primary-black-700 text-primary-black-300 rounded text-xs font-semibold flex-shrink-0">
                            TK
                          </span>

                          {/* Token Icon */}
                          <div className={`w-10 h-10 rounded-md flex items-center justify-center text-2xl bg-gradient-to-br ${getTokenRarityColor(token.token_card.rarity)}`}>
                            💎
                          </div>

                          {/* Token Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-primary-black-50 text-base truncate">
                                {token.token_card.token_name}
                              </h4>
                              <span className="text-xs text-primary-black-400 uppercase tracking-wide font-semibold px-2 py-0.5 bg-primary-black-700 rounded">
                                {token.token_card.token_type}
                              </span>
                            </div>
                            <p className="text-xs text-primary-black-400 line-clamp-1">
                              {token.token_card.description}
                            </p>
                          </div>

                          {/* Bonus Points */}
                          <div className="flex-shrink-0 text-center px-4">
                            <div className="text-xl font-bold text-primary-green-400">
                              +{token.token_card.bonus_points}
                            </div>
                            <div className="text-xs text-primary-black-500">points</div>
                          </div>

                          {/* Value & Sell Button */}
                          <div className="flex-shrink-0 flex items-center gap-3">
                            <span className="text-sm text-primary-green-400 font-bold">
                              💰 {calculateTokenSellValue(token)}
                            </span>
                            <button
                              onClick={() => onQuickSell(token.id, 'token', calculateTokenSellValue(token))}
                              disabled={selling[token.id]}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              {selling[token.id] ? 'Selling...' : 'Sell'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* Players Only View */}
            {activeTab === 'players' && (
              <div>
                {filteredPlayers.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-center">
                    <div>
                      <div className="text-4xl mb-2 opacity-30">🪑</div>
                      <p className="text-primary-black-400 font-semibold mb-1">No players found</p>
                      <p className="text-primary-black-500 text-sm">Try adjusting your filters</p>
                    </div>
                  </div>
                ) : (
                  filteredPlayers.map((player, index) => {
                    const isSelected = selectedForBulkAction.some(s => s.id === player.id);
                    const cannotSelect = player.is_locked;
                    
                    return (
                    <div
                      key={player.id}
                      className={`
                        flex items-center gap-4 px-4 py-4 transition-all
                        ${!cannotSelect && 'border-l-4'}
                        ${cannotSelect ? 'opacity-60 bg-red-900/20 border-red-500/50' : isSelected ? 'border-primary-green-500 bg-primary-green-500/20' : 'border-transparent hover:bg-primary-green-500/10 hover:border-primary-green-500'}
                        ${index % 2 === 0 && !cannotSelect && !isSelected ? 'bg-primary-black-900' : !cannotSelect && !isSelected ? 'bg-primary-black-800/50' : ''}
                      `}
                    >
                      {/* Checkbox - Always Visible */}
                      <div className="flex-shrink-0 flex items-center justify-center w-6">
                        {!cannotSelect ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleBulkSelect(player, 'player')}
                            onClick={(e) => e.stopPropagation()}
                            className="w-5 h-5 rounded border-2 border-primary-black-600 bg-primary-black-800 checked:bg-primary-green-500 checked:border-primary-green-500 cursor-pointer hover:border-primary-green-500 transition-colors"
                          />
                        ) : (
                          <div className="w-5 h-5"></div>
                        )}
                      </div>
                      
                      {/* Position Badge */}
                      <span className="px-2 py-0.5 bg-primary-black-700 text-primary-black-300 rounded text-xs font-semibold flex-shrink-0">
                        {player.player_card.position === 'Quarterback' ? 'QB' :
                         player.player_card.position === 'Running Back' ? 'RB' :
                         player.player_card.position === 'Wide Receiver' ? 'WR' :
                         player.player_card.position === 'Tight End' ? 'TE' :
                         player.player_card.position}
                      </span>

                      {/* Person Icon */}
                      <div className="w-10 h-10 rounded-md bg-primary-black-700 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-primary-black-300" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>

{/* Player Info */}
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2 mb-1">
                           <h4 className="font-bold text-primary-black-50 truncate text-base">
                             {player.player_card.player_name}
                           </h4>
                           <span className="text-xs text-primary-black-500 font-medium">
                             {player.player_card.team_abbreviation}
                           </span>
                           {getInjuryStatusBadge(player.player_card.injury_status)}
                         </div>
                        
                        <div className="flex items-center gap-2 text-xs text-primary-black-400">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getTierBadgeInfo(player.card_tier).color}`}>
                            {getTierBadgeInfo(player.card_tier).initial}
                          </span>
                          <span className="font-medium">Level {player.card_level}</span>
                          {player.total_fantasy_points > 0 && (
                            <span className="text-primary-black-500 font-medium">
                              Total: {player.total_fantasy_points.toFixed(1)} pts
                            </span>
                          )}
                          {player.is_in_lineup && (
                            <span className="px-2 py-0.5 bg-green-600/20 border border-green-600 text-green-400 rounded font-semibold">
                              In Lineup
                            </span>
                          )}
                          {player.is_locked && (
                            <span className="px-2 py-0.5 bg-red-600/20 border border-red-600 text-red-400 rounded font-semibold">
                              🔒 Locked
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Sell Value, Game Status and Projected Points */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-center">
                          <div className="text-xs text-primary-black-500 mb-0.5">Sell Value</div>
                          <div className="text-sm text-primary-black-300 font-semibold">
                            💰 {calculatePlayerSellValue(player)}
                          </div>
                        </div>
                        <div>
                          {getGameStatusBadge(player.player_card.player_id)}
                        </div>
                        {loadingProjections ? (
                          <span className="text-xs text-primary-black-400">...</span>
                        ) : projections?.has(player.player_card.player_id) ? (
                          <div className="text-primary-green-400 font-semibold text-sm">
                            Proj: {projections.get(player.player_card.player_id).projected.toFixed(1)} pts
                          </div>
                        ) : null}
                      </div>

                      {/* Individual Sell Button */}
                      <div className="flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickSell(player.id, 'player', calculatePlayerSellValue(player));
                          }}
                          disabled={selling[player.id] || player.is_locked}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          {selling[player.id] ? 'Selling...' : 'Sell'}
                        </button>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Tokens Only View */}
            {activeTab === 'tokens' && (
              <div>
                {filteredTokens.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-center">
                    <div>
                      <div className="text-4xl mb-2 opacity-30">💎</div>
                      <p className="text-primary-black-400 font-semibold mb-1">No tokens found</p>
                      <p className="text-primary-black-500 text-sm">Try adjusting your filters</p>
                    </div>
                  </div>
                ) : (
                  filteredTokens.map((token, index) => {
                    const isSelected = selectedForBulkAction.some(s => s.id === token.id);
                    
                    return (
                    <div
                      key={token.id}
                      className={`
                        flex items-center gap-4 px-4 py-4 transition-all border-l-4
                        ${isSelected ? 'border-primary-green-500 bg-primary-green-500/20' : 'border-transparent hover:bg-primary-green-500/10 hover:border-primary-green-500'}
                        ${index % 2 === 0 && !isSelected ? 'bg-primary-black-900' : !isSelected ? 'bg-primary-black-800/50' : ''}
                      `}
                    >
                      {/* Checkbox */}
                      <div className="flex-shrink-0 flex items-center justify-center w-6">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleBulkSelect(token, 'token')}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 rounded border-2 border-primary-black-600 bg-primary-black-800 checked:bg-primary-green-500 checked:border-primary-green-500 cursor-pointer hover:border-primary-green-500 transition-colors"
                        />
                      </div>
                      
                      {/* Position Badge for Token */}
                      <span className="px-2 py-0.5 bg-primary-black-700 text-primary-black-300 rounded text-xs font-semibold flex-shrink-0">
                        TK
                      </span>

                      {/* Token Icon */}
                      <div className={`w-10 h-10 rounded-md flex items-center justify-center text-2xl bg-gradient-to-br ${getTokenRarityColor(token.token_card.rarity)}`}>
                        💎
                      </div>

                      {/* Token Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-primary-black-50 text-base truncate">
                            {token.token_card.token_name}
                          </h4>
                          <span className="text-xs text-primary-black-400 uppercase tracking-wide font-semibold px-2 py-0.5 bg-primary-black-700 rounded">
                            {token.token_card.token_type}
                          </span>
                        </div>
                        <p className="text-xs text-primary-black-400 line-clamp-1">
                          {token.token_card.description}
                        </p>
                      </div>

                      {/* Bonus Points */}
                      <div className="flex-shrink-0 text-center px-4">
                        <div className="text-xl font-bold text-primary-green-400">
                          +{token.token_card.bonus_points}
                        </div>
                        <div className="text-xs text-primary-black-500">points</div>
                      </div>

                      {/* Value & Sell Button */}
                      <div className="flex-shrink-0 flex items-center gap-3">
                        <span className="text-sm text-primary-green-400 font-bold">
                          💰 {calculateTokenSellValue(token)}
                        </span>
                        <button
                          onClick={() => onQuickSell(token.id, 'token', calculateTokenSellValue(token))}
                          disabled={selling[token.id]}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          {selling[token.id] ? 'Selling...' : 'Sell'}
                        </button>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Footer Instructions */}
          <div className="border-t-2 border-primary-black-700 bg-primary-black-800/50 rounded-b-xl">
            <div className="px-4 py-3">
              <p className="text-xs text-primary-black-400 text-center">
                💡 Quick sell cards for coins • Locked cards cannot be sold until their game is complete
              </p>
            </div>
          </div>
        </div>
      </div>
  );
}

InventoryPanel.propTypes = {
  players: PropTypes.array.isRequired,
  tokens: PropTypes.array.isRequired,
  projections: PropTypes.instanceOf(Map),
  loadingProjections: PropTypes.bool,
  liveGameData: PropTypes.instanceOf(Map),
  onQuickSell: PropTypes.func.isRequired,
  onBulkSellComplete: PropTypes.func,
  onReloadProfile: PropTypes.func,
  selling: PropTypes.object.isRequired,
  filters: PropTypes.object.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  inventory: PropTypes.shape({
    players: PropTypes.array,
    tokens: PropTypes.array
  })
};
