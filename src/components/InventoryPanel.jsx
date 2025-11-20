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
      {/* Sticky Header with Filter Bar */}
      <div className={`sticky top-0 z-20 bg-primary-black-900 border-2 border-primary-black-700 rounded-xl mb-4`}>
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
              </div>
            </div>
          </div>

        {/* Content Area */}
        <div>
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
                    {filteredPlayers.length > 0 && (
                      <div className="border-2 border-primary-black-700 rounded-xl bg-primary-black-900 overflow-hidden">
                        <div className="relative">
                          {/* Vertical dividers spanning entire section */}
                          <>
                            <div className="absolute top-0 bottom-0 w-[2px] bg-primary-black-600" style={{ left: 'calc(8px + 24px + 8px + 40px + 8px + 40px + 8px + 160px + 16px + 24px)' }}></div>
                            <div className="absolute top-0 bottom-0 w-[2px] bg-primary-black-600" style={{ left: 'calc(8px + 24px + 8px + 40px + 8px + 40px + 8px + 160px + 16px + 24px + 16px + 70px + 16px + 90px + 16px + 60px + 16px + 50px + 16px + 24px)' }}></div>
                          </>
                          
                        {/* Players Table Header */}
                        <div className="flex items-center gap-4 px-2 py-3 pr-6 bg-primary-black-800 border-b border-primary-black-700">
                          {/* Section 1: SLOT & PLAYER */}
                          <div className="flex items-center gap-2" style={{ minWidth: '272px' }}>
                            <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider" style={{ width: '24px', textAlign: 'center' }}></span>
                            <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider" style={{ width: '40px', textAlign: 'center' }}>SLOT</span>
                            <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider" style={{ width: '40px', textAlign: 'center' }}></span>
                            <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider" style={{ width: '160px' }}>PLAYER</span>
                          </div>
                          
                          {/* Spacer for divider */}
                          <div style={{ width: '24px' }}></div>
                          
                          {/* Section 2: MATCHUP INFO */}
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center" style={{ width: '70px' }}>OPP</span>
                            <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center" style={{ width: '90px' }}>STATUS</span>
                            <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center" style={{ width: '60px' }}>PROJ</span>
                            <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center" style={{ width: '50px' }}>SCORE</span>
                          </div>
                          
                          {/* Spacer for divider */}
                          <div style={{ width: '24px' }}></div>
                          
                          {/* Section 3: FANTASY METRICS */}
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center" style={{ width: '60px' }}>PRK</span>
                            <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center" style={{ width: '60px' }}>AVG</span>
                            <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center" style={{ width: '70px' }}>PULL %</span>
                            <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center" style={{ width: '70px' }}>SELL</span>
                            <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center" style={{ width: '50px' }}>TIER</span>
                            <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center" style={{ width: '60px' }}>LEVEL</span>
                          </div>
                        </div>

                        {/* Players Rows */}
                        {filteredPlayers.map((player, index) => {
                      const isSelected = selectedForBulkAction.some(s => s.id === player.id);
                      const cannotSelect = player.is_locked;
                      
                      // Get game data for this player
                      const gameData = liveGameData?.get(player.player_card.player_id);
                      const playerProjection = projections?.get(player.player_card.player_id);
                      
                      // Determine if on BYE (no game data at all)
                      const isBye = !gameData;
                      const opponent = gameData?.opponent;
                      const isHome = gameData?.isHome;
                      const gameStatus = gameData?.gameStatus?.toLowerCase();
                      const isLiveOrFinal = gameStatus === 'live' || gameStatus === 'halftime' || gameStatus === 'final';
                      
                      return (
                      <div
                        key={player.id}
                        className={`
                          flex items-center gap-4 px-2 py-3 pr-6 transition-all
                          ${!cannotSelect && 'border-l-4'}
                          ${cannotSelect ? 'opacity-60 bg-red-900/20 border-red-500/50' : isSelected ? 'border-primary-green-500 bg-primary-green-500/20' : 'border-transparent hover:bg-primary-green-500/10 hover:border-primary-green-500'}
                          ${index % 2 === 0 && !cannotSelect && !isSelected ? 'bg-primary-black-900' : !cannotSelect && !isSelected ? 'bg-primary-black-800/50' : ''}
                        `}
                      >
                        {/* SECTION 1: SLOT & PLAYER */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Checkbox */}
                          <div className="flex-shrink-0 flex items-center justify-center" style={{ width: '24px' }}>
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
                          <div className="flex-shrink-0 flex items-center justify-center" style={{ width: '40px' }}>
                            <span className="px-2 py-1 bg-primary-black-700 text-primary-black-300 rounded text-xs font-semibold text-center">
                              {player.player_card.position === 'Quarterback' ? 'QB' :
                               player.player_card.position === 'Running Back' ? 'RB' :
                               player.player_card.position === 'Wide Receiver' ? 'WR' :
                               player.player_card.position === 'Tight End' ? 'TE' :
                               player.player_card.position}
                            </span>
                          </div>

                          {/* Person Icon */}
                          <div className="flex-shrink-0 rounded-md bg-primary-black-700 flex items-center justify-center" style={{ width: '40px', height: '40px' }}>
                            <svg className="w-6 h-6 text-primary-black-300" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                          </div>

                          {/* Player Name & Team */}
                          <div className="flex-shrink-0 min-w-0" style={{ width: '160px' }}>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-primary-black-50 truncate text-sm">
                                {player.player_card.player_name}
                              </h4>
                              {getInjuryStatusBadge(player.player_card.injury_status)}
                            </div>
                            <div className="text-xs text-primary-black-500 font-medium">
                              {player.player_card.team_abbreviation}
                            </div>
                          </div>
                        </div>

                        {/* SECTION 2: MATCHUP INFO */}
                        <>
                          {/* Spacer for divider */}
                          <div className="flex-shrink-0" style={{ width: '24px' }}></div>
                          
                          <div className="flex items-center gap-4 flex-shrink-0">
                            {/* Opponent */}
                            <div className="flex-shrink-0 text-center" style={{ width: '70px' }}>
                              {isBye ? (
                                <span className="text-xs text-primary-black-500 font-semibold">BYE</span>
                              ) : (
                                <span className="text-xs text-primary-black-300 font-semibold">
                                  {isHome ? '' : '@'}{opponent}
                                </span>
                              )}
                            </div>

                            {/* Game Status/Time */}
                            <div className="flex-shrink-0 text-center" style={{ width: '90px' }}>
                              {isBye ? (
                                <span className="text-[10px] text-primary-black-600">--</span>
                              ) : gameStatus === 'live' || gameStatus === 'halftime' ? (
                                <span className="text-xs text-red-400 font-bold">Live</span>
                              ) : gameStatus === 'final' ? (
                                <span className="text-xs text-green-400 font-bold">Final</span>
                              ) : gameData.gameStartTime ? (
                                <span className="text-[10px] text-primary-black-400">
                                  {new Date(gameData.gameStartTime).toLocaleDateString('en-US', { 
                                    weekday: 'short' 
                                  })} {new Date(gameData.gameStartTime).toLocaleTimeString('en-US', { 
                                    hour: 'numeric', 
                                    minute: '2-digit',
                                    hour12: true 
                                  })}
                                </span>
                              ) : (
                                <span className="text-[10px] text-primary-black-600">--</span>
                              )}
                            </div>

                            {/* Projected Points */}
                            <div className="flex-shrink-0 text-center" style={{ width: '60px' }}>
                              {isLiveOrFinal && gameData.currentPoints !== undefined ? (
                                <div>
                                  <div className="text-sm text-white font-bold">
                                    {gameData.currentPoints.toFixed(1)}
                                  </div>
                                </div>
                              ) : playerProjection && playerProjection.projected > 0 ? (
                                <div className="text-primary-green-400 font-semibold text-sm">
                                  {playerProjection.projected.toFixed(1)}
                                </div>
                              ) : (
                                <span className="text-xs text-primary-black-600">--</span>
                              )}
                            </div>

                            {/* Score (only show if live/final) */}
                            <div className="flex-shrink-0 text-center" style={{ width: '50px' }}>
                              {isLiveOrFinal && gameData.currentPoints !== undefined ? (
                                <span className="text-xs text-primary-black-400">{gameData.currentPoints.toFixed(1)}</span>
                              ) : (
                                <span className="text-[10px] text-primary-black-600">--</span>
                              )}
                            </div>
                          </div>
                        </>

                        {/* SECTION 3: FANTASY METRICS */}
                        <>
                          {/* Spacer for divider */}
                          <div className="flex-shrink-0" style={{ width: '24px' }}></div>
                          
                          <div className="flex items-center gap-4 flex-shrink-0">
                            {/* Position Rank */}
                            <div className="flex-shrink-0 text-center" style={{ width: '60px' }}>
                              {player.player_card.position_rank ? (
                                <span className="text-xs text-primary-black-400 font-medium">
                                  {player.player_card.position_rank}
                                </span>
                              ) : (
                                <span className="text-xs text-primary-black-600">--</span>
                              )}                             </div>

                            {/* Season Average */}
                            <div className="flex-shrink-0 text-center" style={{ width: '60px' }}>
                              {playerProjection && playerProjection.seasonAvg > 0 ? (
                                <span className="text-xs text-primary-black-400 font-medium">
                                  {playerProjection.seasonAvg.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-xs text-primary-black-600">--</span>
                              )}                             </div>

                            {/* Pull % */}
                            <div className="flex-shrink-0 text-center" style={{ width: '70px' }}>
                              {player.player_card.pull_percentage ? (
                                <span className={`text-xs font-semibold ${getPullPercentageColor(player.player_card.pull_percentage)}`}>
                                  {player.player_card.pull_percentage.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-xs text-primary-black-600">--</span>
                              )}                             </div>

                            {/* Sell Value */}
                            <div className="flex-shrink-0 text-center" style={{ width: '70px' }}>
                              <span className="text-xs text-primary-black-300 font-semibold">
                                💰 {calculatePlayerSellValue(player)}
                              </span>
                            </div>

                            {/* Tier */}
                            <div className="flex-shrink-0 text-center" style={{ width: '50px' }}>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${getTierBadgeInfo(player.card_tier).color}`}>
                                {getTierBadgeInfo(player.card_tier).initial}
                              </span>
                            </div>

                            {/* Level */}
                            <div className="flex-shrink-0 text-center" style={{ width: '60px' }}>
                              <span className="text-xs text-primary-black-300 font-medium">
                                {player.card_level}
                              </span>
                            </div>
                          </div>
                        </>
                      </div>
                      );
                    })}
                        </div>
                      </div>
                    )}

                    {/* Tokens Section */}
                    {filteredTokens.length > 0 && (
                      <div className="border-2 border-primary-black-700 rounded-xl bg-primary-black-900 overflow-hidden mt-6">
                        <div className="relative">
                          {/* Vertical dividers spanning entire token section */}
                          <>
                            <div className="absolute top-0 bottom-0 w-[2px] bg-primary-black-600" style={{ left: 'calc(8px + 24px + 8px + 40px + 8px + 40px + 8px + 160px + 16px)' }}></div>
                            <div className="absolute top-0 bottom-0 w-[2px] bg-primary-black-600" style={{ right: 'calc(60px + 16px + 80px + 16px + 80px)' }}></div>
                          </>
                          
                        {/* Tokens Table Header */}
                        <div className="flex items-center gap-4 px-2 py-3 pr-6 bg-primary-black-800 border-b border-primary-black-700">
                          {/* SECTION 1: TYPE & TOKEN */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Checkbox column header */}
                            <div className="flex-shrink-0 flex items-center justify-center" style={{ width: '24px' }}></div>
                            
                            {/* Type column header */}
                            <div className="flex-shrink-0 text-center" style={{ width: '40px' }}>
                              <span className="text-[10px] text-primary-black-500 font-bold uppercase tracking-wider">Type</span>
                            </div>
                            
                            {/* Icon column header */}
                            <div className="flex-shrink-0" style={{ width: '40px' }}></div>
                            
                            {/* Token name column header */}
                            <div className="flex-shrink-0" style={{ width: '160px' }}>
                              <span className="text-[10px] text-primary-black-500 font-bold uppercase tracking-wider">Token</span>
                            </div>
                          </div>
                          
                          {/* Spacer for divider */}
                          <div className="flex-shrink-0" style={{ width: '24px' }}></div>
                          
                          {/* SECTION 2: DESCRIPTION */}
                          <div className="flex items-center flex-1">
                            <span className="text-[10px] text-primary-black-500 font-bold uppercase tracking-wider">Description</span>
                          </div>
                          
                          {/* Spacer for divider */}
                          <div className="flex-shrink-0" style={{ width: '24px' }}></div>
                          
                          {/* SECTION 3: RARITY, BONUS, SELL */}
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <div className="flex-shrink-0 text-center" style={{ width: '80px' }}>
                              <span className="text-[10px] text-primary-black-500 font-bold uppercase tracking-wider">Rarity</span>
                            </div>
                            
                            <div className="flex-shrink-0 text-center" style={{ width: '70px' }}>
                              <span className="text-[10px] text-primary-black-500 font-bold uppercase tracking-wider">Bonus</span>
                            </div>
                            
                            <div className="flex-shrink-0 text-center" style={{ width: '70px' }}>
                              <span className="text-[10px] text-primary-black-500 font-bold uppercase tracking-wider">Sell</span>
                            </div>
                          </div>
                          
                          {/* Action column header */}
                          <div className="flex-shrink-0" style={{ width: '60px' }}></div>
                        </div>

                        {/* Token Rows */}
                        {filteredTokens.map((token, index) => {
                      const rowIndex = filteredPlayers.length + index;
                      const isSelected = selectedForBulkAction.some(s => s.id === token.id);
                      
                      return (
                        <div
                          key={token.id}
                          className={`
                            flex items-center gap-4 px-2 py-3 pr-6 transition-all border-l-4
                            ${isSelected ? 'border-primary-green-500 bg-primary-green-500/20' : 'border-transparent hover:bg-primary-green-500/10 hover:border-primary-green-500'}
                            ${index % 2 === 0 && !isSelected ? 'bg-primary-black-900' : !isSelected ? 'bg-primary-black-800/50' : ''}
                          `}
                        >
                          {/* SECTION 1: TYPE & TOKEN */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Checkbox */}
                            <div className="flex-shrink-0 flex items-center justify-center" style={{ width: '24px' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleBulkSelect(token, 'token')}
                                onClick={(e) => e.stopPropagation()}
                                className="w-5 h-5 rounded border-2 border-primary-black-600 bg-primary-black-800 checked:bg-primary-green-500 checked:border-primary-green-500 cursor-pointer hover:border-primary-green-500 transition-colors"
                              />
                            </div>
                            
                            {/* Type Badge */}
                            <div className="flex-shrink-0 flex items-center justify-center" style={{ width: '40px' }}>
                              <span className="px-2 py-1 bg-primary-black-700 text-primary-black-300 rounded text-xs font-semibold text-center">
                                TK
                              </span>
                            </div>

                            {/* Token Icon */}
                            <div className={`flex-shrink-0 rounded-md flex items-center justify-center text-2xl bg-gradient-to-br ${getTokenRarityColor(token.token_card.rarity)}`} style={{ width: '40px', height: '40px' }}>
                              💎
                            </div>

                            {/* Token Name & Type */}
                            <div className="flex-shrink-0 min-w-0" style={{ width: '160px' }}>
                              <h4 className="font-bold text-primary-black-50 truncate text-sm">
                                {token.token_card.token_name}
                              </h4>
                              <div className="text-xs text-primary-black-500 font-medium uppercase">
                                {token.token_card.token_type}
                              </div>
                            </div>
                          </div>

                          {/* SECTION 2: DESCRIPTION */}
                          <>
                            {/* Spacer for divider */}
                            <div className="flex-shrink-0" style={{ width: '24px' }}></div>
                            
                            <div className="flex items-center flex-1">
                              {/* Description */}
                              <p className="text-xs text-primary-black-400">
                                {token.token_card.description}
                              </p>
                            </div>
                          </>

                          {/* SECTION 3: RARITY, BONUS, SELL */}
                          <>
                            {/* Spacer for divider */}
                            <div className="flex-shrink-0" style={{ width: '24px' }}></div>
                            
                            <div className="flex items-center gap-4 flex-shrink-0">
                              {/* Rarity */}
                              <div className="flex-shrink-0 text-center" style={{ width: '80px' }}>
                                <span className={`text-xs font-semibold ${
                                  token.token_card.rarity === 'Legendary' ? 'text-yellow-400' :
                                  token.token_card.rarity === 'Epic' ? 'text-purple-400' :
                                  token.token_card.rarity === 'Rare' ? 'text-blue-400' :
                                  'text-primary-black-400'
                                }`}>
                                  {token.token_card.rarity}
                                </span>
                              </div>

                              {/* Bonus Points */}
                              <div className="flex-shrink-0 text-center" style={{ width: '70px' }}>
                                <span className="text-sm text-primary-green-400 font-bold">
                                  +{token.token_card.bonus_points}
                                </span>
                              </div>

                              {/* Sell Value */}
                              <div className="flex-shrink-0 text-center" style={{ width: '70px' }}>
                                <span className="text-xs text-primary-black-300 font-semibold">
                                  💰 {calculateTokenSellValue(token)}
                                </span>
                              </div>
                            </div>
                          </>
                        </div>
                      );
                    })}
                        </div>
                      </div>
                    )}
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
                  <div className="border-2 border-primary-black-700 rounded-xl bg-primary-black-900 overflow-hidden">
                    <div className="relative">
                      {/* Vertical dividers spanning entire section */}
                      <>
                        <div className="absolute top-0 bottom-0 w-[2px] bg-primary-black-600" style={{ left: 'calc(8px + 24px + 8px + 40px + 8px + 40px + 8px + 160px + 16px + 24px)' }}></div>
                        <div className="absolute top-0 bottom-0 w-[2px] bg-primary-black-600" style={{ left: 'calc(8px + 24px + 8px + 40px + 8px + 40px + 8px + 160px + 16px + 24px + 16px + 70px + 16px + 90px + 16px + 60px + 16px + 50px + 16px + 24px)' }}></div>
                      </>
                      
                    {/* Players Table Header */}
                    <div className="flex items-center gap-4 px-2 py-3 pr-6 bg-primary-black-800 border-b border-primary-black-700">
                      {/* Section 1: SLOT & PLAYER */}
                      <div className="flex items-center gap-2" style={{ minWidth: '272px' }}>
                        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider" style={{ width: '24px', textAlign: 'center' }}></span>
                        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider" style={{ width: '40px', textAlign: 'center' }}>SLOT</span>
                        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider" style={{ width: '40px', textAlign: 'center' }}></span>
                        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider" style={{ width: '160px' }}>PLAYER</span>
                      </div>
                      
                      {/* Spacer for divider */}
                      <div style={{ width: '24px' }}></div>
                      
                      {/* Section 2: MATCHUP INFO */}
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center" style={{ width: '70px' }}>OPP</span>
                        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center" style={{ width: '90px' }}>STATUS</span>
                        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center" style={{ width: '60px' }}>PROJ</span>
                        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center" style={{ width: '50px' }}>SCORE</span>
                      </div>
                      
                      {/* Spacer for divider */}
                      <div style={{ width: '24px' }}></div>
                      
                      {/* Section 3: FANTASY METRICS */}
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center" style={{ width: '60px' }}>PRK</span>
                        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center" style={{ width: '60px' }}>AVG</span>
                        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center" style={{ width: '70px' }}>PULL %</span>
                        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center" style={{ width: '70px' }}>SELL</span>
                        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center" style={{ width: '50px' }}>TIER</span>
                        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center" style={{ width: '60px' }}>LEVEL</span>
                      </div>
                    </div>
                    
                    {/* Players Rows */}
                    {filteredPlayers.map((player, index) => {
                      const isSelected = selectedForBulkAction.some(s => s.id === player.id);
                      const cannotSelect = player.is_locked;
                      
                      // Get game data for this player
                      const gameData = liveGameData?.get(player.player_card.player_id) || {};
                      const { gameStatus, currentPoints, opponent, isHome, gameStartTime } = gameData;
                      const isBye = !gameData || Object.keys(gameData).length === 0;
                      const isLiveOrFinal = gameStatus === 'live' || gameStatus === 'halftime' || gameStatus === 'final';
                      
                      // Get projection data
                      const playerProjection = projections?.get(player.player_card.player_id);
                      
                      return (
                      <div
                        key={player.id}
                        className={`
                          flex items-center gap-4 px-2 py-3 pr-6 transition-all 
                          ${cannotSelect ? 'cursor-not-allowed opacity-60 bg-red-900/20' : 'hover:bg-primary-green-500/10 hover:border-primary-green-500'}
                          ${!cannotSelect && 'border-l-4'}
                          ${cannotSelect ? 'border-red-500/50' : isSelected ? 'border-primary-green-500 bg-primary-green-500/20' : 'border-transparent'}
                          ${index % 2 === 0 && !cannotSelect && !isSelected ? 'bg-primary-black-900' : !cannotSelect && !isSelected ? 'bg-primary-black-800/50' : ''}
                        `}
                      >
                        {/* SECTION 1: SLOT & PLAYER */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Checkbox */}
                          <div className="flex-shrink-0 flex items-center justify-center" style={{ width: '24px' }}>
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
                          <div className="flex-shrink-0 flex items-center justify-center" style={{ width: '40px' }}>
                            <span className="px-2 py-1 bg-primary-black-700 text-primary-black-300 rounded text-xs font-semibold text-center">
                              {player.player_card.position === 'Quarterback' ? 'QB' :
                               player.player_card.position === 'Running Back' ? 'RB' :
                               player.player_card.position === 'Wide Receiver' ? 'WR' :
                               player.player_card.position === 'Tight End' ? 'TE' :
                               player.player_card.position}
                            </span>
                          </div>

                          {/* Person Icon */}
                          <div className="flex-shrink-0 rounded-md bg-primary-black-700 flex items-center justify-center" style={{ width: '40px', height: '40px' }}>
                            <svg className="w-6 h-6 text-primary-black-300" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                          </div>

                          {/* Player Name & Team */}
                          <div className="flex-shrink-0 min-w-0" style={{ width: '160px' }}>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-primary-black-50 truncate text-sm">
                                {player.player_card.player_name}
                              </h4>
                              {getInjuryStatusBadge(player.player_card.injury_status)}
                            </div>
                            <div className="text-xs text-primary-black-500 font-medium">
                              {player.player_card.team_abbreviation}
                            </div>
                          </div>
                        </div>

                        {/* SECTION 2: MATCHUP INFO */}
                        <>
                          {/* Spacer for divider */}
                          <div className="flex-shrink-0" style={{ width: '24px' }}></div>
                          
                          <div className="flex items-center gap-4 flex-shrink-0">
                            {/* Opponent */}
                            <div className="flex-shrink-0 text-center" style={{ width: '70px' }}>
                              {isBye ? (
                                <span className="text-xs text-primary-black-500 font-semibold">BYE</span>
                              ) : (
                                <span className="text-xs text-primary-black-300 font-semibold">
                                  {isHome ? '' : '@'}{opponent}
                                </span>
                              )}
                            </div>

                            {/* Game Status/Time */}
                            <div className="flex-shrink-0 text-center" style={{ width: '90px' }}>
                              {isBye ? (
                                <span className="text-[10px] text-primary-black-600">--</span>
                              ) : gameStatus === 'live' || gameStatus === 'halftime' ? (
                                <span className="text-xs text-red-400 font-bold">Live</span>
                              ) : gameStatus === 'final' ? (
                                <span className="text-xs text-green-400 font-bold">Final</span>
                              ) : gameStartTime ? (
                                <span className="text-[10px] text-primary-black-400">
                                  {new Date(gameStartTime).toLocaleDateString('en-US', { 
                                    weekday: 'short' 
                                  })} {new Date(gameStartTime).toLocaleTimeString('en-US', { 
                                    hour: 'numeric', 
                                    minute: '2-digit',
                                    hour12: true 
                                  })}
                                </span>
                              ) : (
                                <span className="text-[10px] text-primary-black-600">--</span>
                              )}
                            </div>

                            {/* Projected Points */}
                            <div className="flex-shrink-0 text-center" style={{ width: '60px' }}>
                              {isLiveOrFinal && currentPoints !== undefined ? (
                                <div>
                                  <div className="text-sm text-white font-bold">
                                    {currentPoints.toFixed(1)}
                                  </div>
                                </div>
                              ) : playerProjection && playerProjection.projected > 0 ? (
                                <div className="text-primary-green-400 font-semibold text-sm">
                                  {playerProjection.projected.toFixed(1)}
                                </div>
                              ) : (
                                <span className="text-xs text-primary-black-600">--</span>
                              )}
                            </div>

                            {/* Score (only show if live/final) */}
                            <div className="flex-shrink-0 text-center" style={{ width: '50px' }}>
                              {isLiveOrFinal && currentPoints !== undefined ? (
                                <span className="text-xs text-primary-black-400">{currentPoints.toFixed(1)}</span>
                              ) : (
                                <span className="text-[10px] text-primary-black-600">--</span>
                              )}
                            </div>
                          </div>
                        </>

                        {/* SECTION 3: FANTASY METRICS */}
                        <>
                          {/* Spacer for divider */}
                          <div className="flex-shrink-0" style={{ width: '24px' }}></div>
                          
                          <div className="flex items-center gap-4 flex-shrink-0">
                            {/* Position Rank */}
                            <div className="flex-shrink-0 text-center" style={{ width: '60px' }}>
                              {player.player_card.position_rank ? (
                                <span className="text-xs text-primary-black-400 font-medium">
                                  {player.player_card.position_rank}
                                </span>
                              ) : (
                                <span className="text-xs text-primary-black-600">--</span>
                              )}
                            </div>

                            {/* Season Average */}
                            <div className="flex-shrink-0 text-center" style={{ width: '60px' }}>
                              {playerProjection && playerProjection.seasonAvg > 0 ? (
                                <span className="text-xs text-primary-black-400 font-medium">
                                  {playerProjection.seasonAvg.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-xs text-primary-black-600">--</span>
                              )}
                            </div>

                            {/* Pull % */}
                            <div className="flex-shrink-0 text-center" style={{ width: '70px' }}>
                              {player.player_card.pull_percentage ? (
                                <span className={`text-xs font-semibold ${getPullPercentageColor(player.player_card.pull_percentage)}`}>
                                  {player.player_card.pull_percentage.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-xs text-primary-black-600">--</span>
                              )}
                            </div>

                            {/* Sell Value */}
                            <div className="flex-shrink-0 text-center" style={{ width: '70px' }}>
                              <span className="text-xs text-primary-black-300 font-semibold">
                                💰 {calculatePlayerSellValue(player)}
                              </span>
                            </div>

                            {/* Tier */}
                            <div className="flex-shrink-0 text-center" style={{ width: '50px' }}>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${getTierBadgeInfo(player.card_tier).color}`}>
                                {getTierBadgeInfo(player.card_tier).initial}
                              </span>
                            </div>

                            {/* Level */}
                            <div className="flex-shrink-0 text-center" style={{ width: '60px' }}>
                              <span className="text-xs text-primary-black-300 font-medium">
                                {player.card_level}
                              </span>
                            </div>
                          </div>
                        </>
                      </div>
                      );
                  })}
                    </div>
                  </div>
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
                  <div className="border-2 border-primary-black-700 rounded-xl bg-primary-black-900 overflow-hidden">
                    <div className="relative">
                      {/* Vertical dividers spanning entire token section */}
                      <>
                        <div className="absolute top-0 bottom-0 w-[2px] bg-primary-black-600" style={{ left: 'calc(8px + 24px + 8px + 40px + 8px + 40px + 8px + 160px + 16px)' }}></div>
                        <div className="absolute top-0 bottom-0 w-[2px] bg-primary-black-600" style={{ right: 'calc(60px + 16px + 80px + 16px + 80px)' }}></div>
                      </>
                      
                    {/* Tokens Table Header */}
                    <div className="flex items-center gap-4 px-2 py-3 pr-6 bg-primary-black-800 border-b border-primary-black-700">
                      {/* SECTION 1: TYPE & TOKEN */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Checkbox column header */}
                        <div className="flex-shrink-0 flex items-center justify-center" style={{ width: '24px' }}></div>
                        
                        {/* Type column header */}
                        <div className="flex-shrink-0 text-center" style={{ width: '40px' }}>
                          <span className="text-[10px] text-primary-black-500 font-bold uppercase tracking-wider">Type</span>
                        </div>
                        
                        {/* Icon column header */}
                        <div className="flex-shrink-0" style={{ width: '40px' }}></div>
                        
                        {/* Token name column header */}
                        <div className="flex-shrink-0" style={{ width: '160px' }}>
                          <span className="text-[10px] text-primary-black-500 font-bold uppercase tracking-wider">Token</span>
                        </div>
                      </div>
                      
                      {/* Spacer for divider */}
                      <div className="flex-shrink-0" style={{ width: '24px' }}></div>
                      
                      {/* SECTION 2: DESCRIPTION */}
                      <div className="flex items-center flex-1">
                        <span className="text-[10px] text-primary-black-500 font-bold uppercase tracking-wider">Description</span>
                      </div>
                      
                      {/* Spacer for divider */}
                      <div className="flex-shrink-0" style={{ width: '24px' }}></div>
                      
                      {/* SECTION 3: RARITY, BONUS, SELL */}
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="flex-shrink-0 text-center" style={{ width: '80px' }}>
                          <span className="text-[10px] text-primary-black-500 font-bold uppercase tracking-wider">Rarity</span>
                        </div>
                        
                        <div className="flex-shrink-0 text-center" style={{ width: '70px' }}>
                          <span className="text-[10px] text-primary-black-500 font-bold uppercase tracking-wider">Bonus</span>
                        </div>
                        
                        <div className="flex-shrink-0 text-center" style={{ width: '70px' }}>
                          <span className="text-[10px] text-primary-black-500 font-bold uppercase tracking-wider">Sell</span>
                        </div>
                      </div>
                      
                      {/* Action column header */}
                      <div className="flex-shrink-0" style={{ width: '60px' }}></div>
                    </div>
                    
                    {/* Token Rows */}
                    {filteredTokens.map((token, index) => {
                    const isSelected = selectedForBulkAction.some(s => s.id === token.id);
                    
                    return (
                    <div
                      key={token.id}
                      className={`
                        flex items-center gap-4 px-2 py-3 pr-6 transition-all border-l-4
                        ${isSelected ? 'border-primary-green-500 bg-primary-green-500/20' : 'border-transparent hover:bg-primary-green-500/10 hover:border-primary-green-500'}
                        ${index % 2 === 0 && !isSelected ? 'bg-primary-black-900' : !isSelected ? 'bg-primary-black-800/50' : ''}
                      `}
                    >
                      {/* SECTION 1: TYPE & TOKEN */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Checkbox */}
                        <div className="flex-shrink-0 flex items-center justify-center" style={{ width: '24px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleBulkSelect(token, 'token')}
                            onClick={(e) => e.stopPropagation()}
                            className="w-5 h-5 rounded border-2 border-primary-black-600 bg-primary-black-800 checked:bg-primary-green-500 checked:border-primary-green-500 cursor-pointer hover:border-primary-green-500 transition-colors"
                          />
                        </div>
                        
                        {/* Type Badge */}
                        <div className="flex-shrink-0 flex items-center justify-center" style={{ width: '40px' }}>
                          <span className="px-2 py-1 bg-primary-black-700 text-primary-black-300 rounded text-xs font-semibold text-center">
                            TK
                          </span>
                        </div>

                        {/* Token Icon */}
                        <div className={`flex-shrink-0 rounded-md flex items-center justify-center text-2xl bg-gradient-to-br ${getTokenRarityColor(token.token_card.rarity)}`} style={{ width: '40px', height: '40px' }}>
                          💎
                        </div>

                        {/* Token Name & Type */}
                        <div className="flex-shrink-0 min-w-0" style={{ width: '160px' }}>
                          <h4 className="font-bold text-primary-black-50 truncate text-sm">
                            {token.token_card.token_name}
                          </h4>
                          <div className="text-xs text-primary-black-500 font-medium uppercase">
                            {token.token_card.token_type}
                          </div>
                        </div>
                      </div>

                      {/* SECTION 2: DESCRIPTION */}
                      <>
                        {/* Spacer for divider */}
                        <div className="flex-shrink-0" style={{ width: '24px' }}></div>
                        
                        <div className="flex items-center flex-1">
                          {/* Description */}
                          <p className="text-xs text-primary-black-400">
                            {token.token_card.description}
                          </p>
                        </div>
                      </>

                      {/* SECTION 3: RARITY, BONUS, SELL */}
                      <>
                        {/* Spacer for divider */}
                        <div className="flex-shrink-0" style={{ width: '24px' }}></div>
                        
                        <div className="flex items-center gap-4 flex-shrink-0">
                          {/* Rarity */}
                          <div className="flex-shrink-0 text-center" style={{ width: '80px' }}>
                            <span className={`text-xs font-semibold ${
                              token.token_card.rarity === 'Legendary' ? 'text-yellow-400' :
                              token.token_card.rarity === 'Epic' ? 'text-purple-400' :
                              token.token_card.rarity === 'Rare' ? 'text-blue-400' :
                              'text-primary-black-400'
                            }`}>
                              {token.token_card.rarity}
                            </span>
                          </div>

                          {/* Bonus Points */}
                          <div className="flex-shrink-0 text-center" style={{ width: '70px' }}>
                            <span className="text-sm text-primary-green-400 font-bold">
                              +{token.token_card.bonus_points}
                            </span>
                          </div>

                          {/* Sell Value */}
                          <div className="flex-shrink-0 text-center" style={{ width: '70px' }}>
                            <span className="text-xs text-primary-black-300 font-semibold">
                              💰 {calculateTokenSellValue(token)}
                            </span>
                          </div>
                        </div>
                      </>
                      
                      {/* Quick Sell Button */}
                      <div className="flex-shrink-0" style={{ width: '60px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickSell(token, 'token');
                          }}
                          className="w-full px-2 py-1 bg-primary-black-700 hover:bg-primary-green-500 text-primary-black-300 hover:text-primary-black-50 rounded text-xs font-semibold transition-colors"
                        >
                          Sell
                        </button>
                      </div>
                    </div>
                    );
                  })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Instructions */}
        {/* Footer */}
        <div className="border-2 border-primary-black-700 bg-primary-black-800/50 rounded-xl mt-4">
          <div className="px-4 py-3">
            <p className="text-xs text-primary-black-400 text-center">
              💡 Quick sell cards for coins • Locked cards cannot be sold until their game is complete
            </p>
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
