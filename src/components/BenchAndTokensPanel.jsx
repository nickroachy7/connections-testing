import { useState } from 'react';
import PropTypes from 'prop-types';
import { getRosterCount, ROSTER_LIMIT } from '../utils/rosterLimits';
import { calculatePlayerSellValue, calculateTokenSellValue } from '../utils/sellValueCalculator';

/**
 * BenchAndTokensPanel Component
 * 
 * Unified panel for managing bench players and tokens with toggle/filter system.
 * Features:
 * - Clean contained section design
 * - Toggle between Players and Tokens view
 * - List view for easy scanning
 * - Drag and drop functionality
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
  selectedForBulkAction = [],
  onToggleBulkSelect,
  onBulkSell,
  selling = {}
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'players', or 'tokens'
  const [isDragOver, setIsDragOver] = useState(false);

  // When filterPosition is set, automatically switch to players tab and filter
  // When tokenFilterPlayerId is set, automatically switch to tokens tab
  const effectiveTab = filterPosition ? 'players' : tokenFilterPlayerId ? 'tokens' : activeTab;
  
  // Helper to check if a player is eligible for the filter position
  const isPlayerEligibleForPosition = (player, position) => {
    if (!position) return true;
    
    const playerPos = player.player_card.position;
    const posAbbr = position.replace(/[0-9]/g, ''); // Remove numbers (RB1 -> RB)
    
    // Map position abbreviations to full names
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

  // Get position label for display
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

  // Drag and drop handlers for the bench panel
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    // Only clear if we're leaving the entire panel
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent page-level handler from firing
    setIsDragOver(false);
    
    if (onPlayerDrop) {
      onPlayerDrop(e);
    }
  };

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

  const sortedBenchPlayers = [...benchPlayers].sort((a, b) => {
    return getPositionOrder(a.player_card.position) - getPositionOrder(b.player_card.position);
  });
  
  // Helper to check if a player's game is live or final (even if not locked in DB yet)
  const isPlayerGameLiveOrFinal = (player) => {
    if (!liveGameData) return false;
    const gameData = liveGameData.get(player.player_card.player_id);
    if (!gameData) return false;
    const status = gameData.gameStatus?.toLowerCase();
    return status === 'live' || status === 'halftime' || status === 'final';
  };
  
  // Filter players based on position filter (from lineup click-to-add)
  // When filtering, exclude locked players AND players whose games are live or final
  const filteredBenchPlayers = filterPosition 
    ? sortedBenchPlayers.filter(player => 
        isPlayerEligibleForPosition(player, filterPosition) && 
        !player.is_locked && 
        !isPlayerGameLiveOrFinal(player)
      )
    : sortedBenchPlayers;

  // Filter tokens when user clicks + on a player card
  const filteredTokens = tokenFilterPlayerId 
    ? availableTokens.filter(token => !token.applied_to_player_id && !token.is_active)
    : availableTokens;

  const getPullPercentageColor = (percentage) => {
    if (!percentage) return 'text-primary-black-500';
    // Lower % = rarer/better player = gold/purple colors
    if (percentage <= 5) return 'text-yellow-400'; // Elite - 1-5%
    if (percentage <= 15) return 'text-purple-400'; // Top - 6-15%
    if (percentage <= 30) return 'text-blue-400'; // Solid - 16-30%
    if (percentage <= 60) return 'text-primary-green-400'; // Rotational - 31-60%
    return 'text-primary-black-400'; // Backup - 60%+
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
      case 'legendary': return 'from-yellow-600 to-orange-600 text-yellow-100 border-yellow-500/50';
      case 'epic': return 'from-purple-600 to-pink-600 text-purple-100 border-purple-500/50';
      case 'rare': return 'from-blue-600 to-cyan-600 text-blue-100 border-blue-500/50';
      default: return 'from-gray-600 to-gray-700 text-gray-100 border-gray-500/50';
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
    
    // Debug log to see what data we're getting
    if (gameData && gameData.gameStatus) {
      console.log(`🎮 Player ${playerId} game status: "${gameData.gameStatus}" (type: ${typeof gameData.gameStatus})`);
    }
    
    // If no game data, player is on BYE
    if (!gameData) {
      return (
        <div className="px-2 py-1 bg-primary-black-700 text-primary-black-300 rounded text-xs text-center">
          <div className="font-semibold">
            BYE
          </div>
          <div className="text-primary-black-400 mt-0.5 text-[10px]">
            No game this week
          </div>
        </div>
      );
    }
    
    const { gameStatus, currentPoints, opponent, isHome, gameStartTime } = gameData;
    const statusLower = gameStatus?.toLowerCase() || '';
    
    switch (statusLower) {
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

  // Render a player row
  const renderPlayerRow = (player, index) => {
    const appliedToken = inventory?.tokens?.find(t => t.applied_to_player_id === player.id && t.is_active);
    const isLocked = player?.is_locked || isPlayerGameLiveOrFinal(player); // Lock if DB says so OR game is live/final
    const isSelected = selectedForBulkAction.some(s => s.id === player.id);
    
    return (
      <div
        key={player.id}
        draggable={!isLocked}
        onDragStart={(e) => {
          if (isLocked) {
            e.preventDefault();
            return;
          }
          onPlayerDragStart(e, player, 'BENCH');
        }}
        className={`
          flex items-center gap-4 px-4 py-4 transition-all 
          ${isLocked ? 'cursor-not-allowed opacity-60 bg-red-900/20' : 'cursor-move hover:bg-primary-green-500/10 hover:border-primary-green-500'}
          ${!isLocked && 'border-l-4'}
          ${isLocked ? 'border-red-500/50' : isSelected ? 'border-primary-green-500 bg-primary-green-500/20' : 'border-transparent'}
          ${index % 2 === 0 && !isLocked && !isSelected ? 'bg-primary-black-900' : !isLocked && !isSelected ? 'bg-primary-black-800/50' : ''}
        `}
      >
        {/* Checkbox - Always Visible */}
        <div className="flex-shrink-0 flex items-center justify-center w-6">
          {!isLocked ? (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleBulkSelect && onToggleBulkSelect(player, 'player')}
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
            {player.player_card.pull_percentage && (
              <span className={`font-semibold ${getPullPercentageColor(player.player_card.pull_percentage)}`}>
                {player.player_card.pull_percentage.toFixed(1)}% pull
              </span>
            )}
          </div>
        </div>

        {/* Move Button or Empty Space - Shows in middle when filtering */}
        <div className="flex-1 flex items-center justify-center px-4">
          {filterPosition && onMoveToSlot ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveToSlot(player, filterPosition);
              }}
              className="px-6 py-2 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 rounded-lg text-sm font-bold transition-all hover:scale-105 shadow-lg"
            >
              Move →
            </button>
          ) : null}
        </div>

        {/* Game Status and Projected Points */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-center">
            <div className="text-xs text-primary-black-500 mb-0.5">Sell Value</div>
            <div className="text-sm text-primary-black-300 font-semibold">
              💰 {calculatePlayerSellValue(player)}
            </div>
          </div>
          {/* Points Display - Live/Final on top, Projection below */}
          <div className="text-center min-w-[60px]">
            {(() => {
              const gameData = liveGameData?.get(player.player_card.player_id);
              const playerProjection = projections?.get(player.player_card.player_id);
              const isLiveOrFinal = gameData && (gameData.gameStatus?.toLowerCase() === 'live' || gameData.gameStatus?.toLowerCase() === 'halftime' || gameData.gameStatus?.toLowerCase() === 'final');
              
              if (isLiveOrFinal && gameData.currentPoints !== undefined) {
                return (
                  <>
                    <div className="text-lg text-white font-bold">
                      {gameData.currentPoints.toFixed(2)}
                    </div>
                    {playerProjection && playerProjection.projected > 0 && (
                      <div className="text-xs text-primary-green-400 font-semibold">
                        {playerProjection.projected.toFixed(1)}
                      </div>
                    )}
                  </>
                );
              } else if (playerProjection && playerProjection.projected > 0) {
                return (
                  <div className="text-primary-green-400 font-semibold text-sm">
                    Proj: {playerProjection.projected.toFixed(1)} pts
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>

        {/* Applied Token */}
        {appliedToken && (
          <div className="flex-shrink-0 px-3 py-1.5 bg-primary-green-500/20 border border-primary-green-500 rounded-lg text-xs text-primary-green-400 font-bold">
            💎 +{appliedToken.token_card.bonus_points}
          </div>
        )}

        {/* Lock Indicator or Drag Handle */}
        {isLocked ? (
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-red-900/40 border border-red-500/50 rounded-lg">
            <span className="text-red-400 text-lg">🔒</span>
            <span className="text-xs text-red-400 font-bold">LOCKED</span>
          </div>
        ) : (
          <div className="flex-shrink-0 text-primary-black-600 text-xl">
            ⋮⋮
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-xl">
        {/* Sticky Header with Filter Bar */}
        <div className={`sticky top-0 z-20 border-b-2 border-primary-black-700 rounded-t-xl transition-colors ${
          filterPosition 
            ? 'bg-primary-green-500/10 border-primary-green-500/30' 
            : 'bg-primary-black-900'
        }`}>
            <div className="px-4 py-4">
              <div className="flex items-center justify-between gap-6">
                {/* Title - Switches between "Bench" and "Select Player/Token" */}
                {filterPosition ? (
                  // Player Filter Mode - Replaces the header
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-2xl">🎯</span>
                    <div>
                      <h3 className="text-xl font-bold text-primary-green-400">
                        Select Player for {getPositionLabel(filterPosition)}
                      </h3>
                      <p className="text-xs text-primary-black-400 mt-0.5">
                        Showing {filteredBenchPlayers.length} eligible player{filteredBenchPlayers.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ) : tokenFilterPlayerId && tokenFilterPlayer ? (
                  // Token Filter Mode - Same style as player filter
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
                  // Normal Mode - Shows "Bench"
                  <div className="flex-shrink-0">
                    <h3 className="text-xl font-bold text-primary-black-50">
                      Bench
                    </h3>
                    <p className="text-xs text-primary-black-400 mt-0.5">
                      <span className="font-medium text-primary-black-500">Roster:</span>{' '}
                      <span className="font-bold text-primary-black-400">
                        {inventory ? getRosterCount(inventory) : (sortedBenchPlayers.length + availableTokens.length)}/{ROSTER_LIMIT}
                      </span>
                    </p>
                  </div>
                )}

                {/* Right Side - Clear Filter Button, Sell Button, or Tab Filters */}
                {(filterPosition || tokenFilterPlayerId) ? (
                  <button
                    onClick={onClearFilter}
                    className="px-4 py-2 bg-primary-black-700 hover:bg-primary-black-600 text-primary-black-300 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Clear Filter
                  </button>
                ) : (
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
                          onClick={onBulkSell}
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
                      All ({sortedBenchPlayers.length + availableTokens.length})
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
                      Players ({sortedBenchPlayers.length})
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
                      Tokens ({availableTokens.length})
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

      {/* Content Area */}
      <div 
        className={`py-4 transition-all ${isDragOver ? 'bg-primary-green-500/10 ring-2 ring-primary-green-500 ring-inset' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drop Zone Indicator */}
        {isDragOver && (
          <div className="mb-4 p-4 border-2 border-dashed border-primary-green-500 bg-primary-green-500/5 rounded-lg text-center animate-pulse">
            <p className="text-primary-green-400 font-bold text-sm">↓ Drop player here to move to bench ↓</p>
            <p className="text-primary-black-400 text-xs mt-1">Tokens will be automatically removed</p>
          </div>
        )}
        
        
        {/* All View */}
        {effectiveTab === 'all' && (
          <div>
            {filteredBenchPlayers.length === 0 && availableTokens.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-center">
                <div>
                  <div className="text-4xl mb-2 opacity-30">🏈</div>
                  <p className="text-primary-black-400 font-semibold mb-1">No items available</p>
                  <p className="text-primary-black-500 text-sm">Add players to your lineup or purchase tokens</p>
                  <p className="text-primary-black-600 text-xs mt-2">💡 Drag lineup players anywhere to bench them</p>
                </div>
              </div>
            ) : (
              <>
                 {/* Players Section */}
                 {filteredBenchPlayers.length > 0 && (
                   <div>
                    {filteredBenchPlayers.map((player, index) => renderPlayerRow(player, index))}
                  </div>
                )}

                {/* Tokens Section */}
                {availableTokens.length > 0 && (
                  <div>
                    {filteredTokens.map((token, index) => {
                      // Continue alternating from where players left off
                      const rowIndex = filteredBenchPlayers.length + index;
                      const isSelected = selectedForBulkAction.some(s => s.id === token.id);
                      
                      return (
                        <div
                          key={token.id}
                          draggable={!tokenFilterPlayerId}
                          onDragStart={(e) => !tokenFilterPlayerId && onTokenDragStart(e, token)}
                          onDragEnd={onTokenDragEnd}
                          className={`
                            flex items-center gap-4 px-4 py-4 transition-all border-l-4
                            ${tokenFilterPlayerId ? 'cursor-default' : 'cursor-move'}
                            ${isSelected ? 'border-primary-green-500 bg-primary-green-500/20' : 'border-transparent hover:bg-primary-green-500/10 hover:border-primary-green-500'}
                            ${rowIndex % 2 === 0 && !isSelected ? 'bg-primary-black-900' : !isSelected ? 'bg-primary-black-800/50' : ''}
                          `}
                        >
                          {/* Checkbox */}
                          <div className="flex-shrink-0 flex items-center justify-center w-6">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => onToggleBulkSelect && onToggleBulkSelect(token, 'token')}
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

                          {/* Move Button or Empty Space - Shows in middle when filtering */}
                          <div className="flex-1 flex items-center justify-center px-4">
                            {tokenFilterPlayerId && onApplyTokenToPlayer ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onApplyTokenToPlayer(token, tokenFilterPlayerId);
                                }}
                                className="px-6 py-2 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 rounded-lg text-sm font-bold transition-all hover:scale-105 shadow-lg"
                              >
                                Move →
                              </button>
                            ) : null}
                          </div>

                          {/* Bonus Points and Value - Only show when not filtering */}
                          {!tokenFilterPlayerId && (
                            <>
                              {/* Bonus Points */}
                              <div className="flex-shrink-0 text-center px-4">
                                <div className="text-xl font-bold text-primary-green-400">
                                  +{token.token_card.bonus_points}
                                </div>
                                <div className="text-xs text-primary-black-500">points</div>
                              </div>

                              {/* Value */}
                              <div className="flex-shrink-0 text-xs text-primary-black-400 font-medium">
                                💰 {calculateTokenSellValue(token)}
                              </div>

                              {/* Drag Handle */}
                              <div className="flex-shrink-0 text-primary-black-600 text-xl">
                                ⋮⋮
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Players Only View */}
        {effectiveTab === 'players' && (
          <div>
            {filteredBenchPlayers.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-center">
                <div>
                  <div className="text-4xl mb-2 opacity-30">🪑</div>
                  <p className="text-primary-black-400 font-semibold mb-1">
                    {filterPosition ? 'No eligible players' : 'Bench is empty'}
                  </p>
                  <p className="text-primary-black-500 text-sm">
                    {filterPosition 
                      ? `No unlocked players available for ${getPositionLabel(filterPosition)}`
                      : 'Drag players anywhere outside their lineup slot to bench them'
                    }
                  </p>
                  {filterPosition && (
                    <p className="text-primary-black-600 text-xs mt-2">
                      🔒 Locked players (game in progress) cannot be added
                    </p>
                  )}
                  {!filterPosition && (
                    <p className="text-primary-black-600 text-xs mt-2">💡 Swap same positions by dragging onto each other</p>
                  )}
                </div>
              </div>
            ) : (
              filteredBenchPlayers.map((player, index) => renderPlayerRow(player, index))
            )}
          </div>
        )}

        {/* Tokens Only View */}
        {effectiveTab === 'tokens' && (
          <div>
            {availableTokens.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-center">
                <div>
                  <div className="text-4xl mb-2 opacity-30">💎</div>
                  <p className="text-primary-black-400 font-semibold mb-1">No tokens available</p>
                  <p className="text-primary-black-500 text-sm">Purchase tokens from the Pack Shop</p>
                </div>
              </div>
            ) : (
              filteredTokens.map((token, index) => {
                const isSelected = selectedForBulkAction.some(s => s.id === token.id);
                
                return (
                <div
                  key={token.id}
                  draggable={!tokenFilterPlayerId}
                  onDragStart={(e) => !tokenFilterPlayerId && onTokenDragStart(e, token)}
                  onDragEnd={onTokenDragEnd}
                  className={`
                    flex items-center gap-4 px-4 py-4 transition-all border-l-4
                    ${tokenFilterPlayerId ? 'cursor-default' : 'cursor-move'}
                    ${isSelected ? 'border-primary-green-500 bg-primary-green-500/20' : 'border-transparent hover:bg-primary-green-500/10 hover:border-primary-green-500'}
                    ${index % 2 === 0 && !isSelected ? 'bg-primary-black-900' : !isSelected ? 'bg-primary-black-800/50' : ''}
                  `}
                >
                  {/* Checkbox */}
                  <div className="flex-shrink-0 flex items-center justify-center w-6">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleBulkSelect && onToggleBulkSelect(token, 'token')}
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

                  {/* Move Button or Empty Space - Shows in middle when filtering */}
                  <div className="flex-1 flex items-center justify-center px-4">
                    {tokenFilterPlayerId && onApplyTokenToPlayer ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onApplyTokenToPlayer(token, tokenFilterPlayerId);
                        }}
                        className="px-6 py-2 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 rounded-lg text-sm font-bold transition-all hover:scale-105 shadow-lg"
                      >
                        Move →
                      </button>
                    ) : null}
                  </div>

                  {/* Bonus Points and Value - Only show when not filtering */}
                  {!tokenFilterPlayerId && (
                    <>
                      {/* Bonus Points */}
                      <div className="flex-shrink-0 text-center px-4">
                        <div className="text-xl font-bold text-primary-green-400">
                          +{token.token_card.bonus_points}
                        </div>
                        <div className="text-xs text-primary-black-500">points</div>
                      </div>

                      {/* Value */}
                      <div className="flex-shrink-0 text-xs text-primary-black-400 font-medium">
                        💰 {calculateTokenSellValue(token)}
                      </div>

                      {/* Drag Handle */}
                      <div className="flex-shrink-0 text-primary-black-600 text-xl">
                        ⋮⋮
                      </div>
                    </>
                  )}
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
            {filterPosition
              ? '💡 Click "Move →" to add player to your lineup • Drag & drop still works too!'
              : tokenFilterPlayerId
                ? '💡 Click "Move →" to add token to the selected player • Drag & drop still works too!'
                : effectiveTab === 'all'
                  ? '💡 Check boxes to sell multiple cards • Drag bench players to lineup • Swap same positions'
                  : effectiveTab === 'players' 
                    ? '💡 Check boxes to sell multiple cards • Drag bench players to lineup • Swap same positions'
                    : '💡 Drag tokens directly onto player cards in your lineup to apply bonuses'
            }
          </p>
        </div>
      </div>
        </div>
      </div>
  );
}

BenchAndTokensPanel.propTypes = {
  benchPlayers: PropTypes.array.isRequired,
  availableTokens: PropTypes.array.isRequired,
  onPlayerDragStart: PropTypes.func.isRequired,
  onTokenDragStart: PropTypes.func.isRequired,
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
  selectedForBulkAction: PropTypes.array,
  onToggleBulkSelect: PropTypes.func,
  onBulkSell: PropTypes.func,
  selling: PropTypes.object
};
