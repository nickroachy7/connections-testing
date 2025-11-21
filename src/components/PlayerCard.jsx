import { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * PlayerCard Component
 * 
 * A comprehensive player card with:
 * - Rarity-based styling and animations
 * - Game status badges (LIVE, LOCKED, FINAL, SCHEDULED)
 * - Applied token display
 * - Projected points and stats
 * - Drag-and-drop support
 * - Lock status
 */
export default function PlayerCard({
  player,
  onDragStart,
  onDrop,
  onTokenDrop,
  draggable = true,
  isLocked = false,
  appliedToken = null,
  onRemoveToken,
  gameData = null,
  projection = null,
  size = 'medium', // 'small', 'medium', 'large'
  showStats = true,
  onClick,
  className = '',
  onAddToken
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isTokenHovering, setIsTokenHovering] = useState(false);
  
  // Debug logging for gameData
  if (player.player_card.player_name === 'Tua Tagovailoa') {
    console.log('[PlayerCard] Tua gameData:', {
      hasGameData: !!gameData,
      gameData,
      playerCardId: player.player_card.player_id,
      playerId: player.id
    });
  }
  
  // Debug logging for Sam Darnold
  if (player.player_card.player_name === 'Sam Darnold') {
    console.log('[PlayerCard] Sam Darnold gameData:', {
      hasGameData: !!gameData,
      gameData,
      playerCardId: player.player_card.player_id,
      playerId: player.id
    });
  }

  // Get tier styling (replacing old rarity styling)
  const getTierStyles = (tier) => {
    const tierStyles = {
      base: {
        border: 'border-gray-500',
        bg: 'bg-gray-900/30',
        text: 'text-gray-400',
        glow: 'shadow-lg shadow-gray-500/20',
        badge: 'bg-gray-600 text-gray-100'
      },
      role_player: {
        border: 'border-green-500',
        bg: 'bg-green-900/30',
        text: 'text-green-400',
        glow: 'shadow-lg shadow-green-500/20',
        badge: 'bg-green-600 text-green-100'
      },
      starter: {
        border: 'border-blue-500',
        bg: 'bg-blue-900/30',
        text: 'text-blue-400',
        glow: 'shadow-lg shadow-blue-500/30',
        badge: 'bg-blue-600 text-blue-100'
      },
      all_star: {
        border: 'border-purple-500',
        bg: 'bg-purple-900/30',
        text: 'text-purple-400',
        glow: 'shadow-lg shadow-purple-500/30',
        badge: 'bg-purple-600 text-purple-100'
      },
      elite: {
        border: 'border-yellow-500',
        bg: 'bg-yellow-900/30',
        text: 'text-yellow-400',
        glow: 'shadow-lg shadow-yellow-500/40',
        badge: 'bg-yellow-600 text-yellow-100'
      }
    };
    return tierStyles[tier] || tierStyles.base;
  };

  // Get tier styling and display info
  const getTierInfo = (tier, level) => {
    const tierInfo = {
      base: {
        name: 'Base',
        color: 'text-gray-400',
        bgColor: 'bg-gray-700',
        borderColor: 'border-gray-500',
        emoji: '⚪',
        range: 'L1-2'
      },
      role_player: {
        name: 'Role Player',
        color: 'text-green-400',
        bgColor: 'bg-green-700',
        borderColor: 'border-green-500',
        emoji: '🟢',
        range: 'L3-4'
      },
      starter: {
        name: 'Starter',
        color: 'text-blue-400',
        bgColor: 'bg-blue-700',
        borderColor: 'border-blue-500',
        emoji: '🔵',
        range: 'L5-6'
      },
      all_star: {
        name: 'All-Star',
        color: 'text-purple-400',
        bgColor: 'bg-purple-700',
        borderColor: 'border-purple-500',
        emoji: '🟣',
        range: 'L7-8'
      },
      elite: {
        name: 'Elite',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-700',
        borderColor: 'border-yellow-500',
        emoji: '⭐',
        range: 'L9-10'
      }
    };
    return tierInfo[tier] || tierInfo.base;
  };

  // Get game status badge
  const getGameStatusBadge = () => {
    if (!gameData) return null;
    
    const status = gameData.gameStatus?.toLowerCase();
    
    if (status === 'live' || status === 'halftime') {
      return (
        <div className="absolute top-2 right-2 z-10 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded animate-pulse">
          LIVE
        </div>
      );
    }
    
    if (status === 'final') {
      return (
        <div className="absolute top-2 right-2 z-10 px-2 py-1 bg-green-600 text-white text-xs font-bold rounded">
          FINAL
        </div>
      );
    }
    
    if (isLocked) {
      return (
        <div className="absolute top-2 right-2 z-10 px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">
          LOCKED
        </div>
      );
    }
    
    return null;
  };

  // Get size classes
  const getSizeClasses = () => {
    switch(size) {
      case 'small':
        return 'w-40 h-52';
      case 'large':
        return 'w-60 h-80';
      case 'medium':
      default:
        return 'w-48 h-64';
    }
  };

  const tierStyles = getTierStyles(player.card_tier || 'base');
  const sizeClasses = getSizeClasses();
  const isDisabled = isLocked || !draggable;

  const handleDragOver = (e) => {
    if (isDisabled) return;
    e.preventDefault();
    setIsTokenHovering(true);
  };

  const handleDragLeave = (e) => {
    if (isDisabled) return;
    e.preventDefault();
    setIsTokenHovering(false);
  };

  const handleDrop = (e) => {
    if (isDisabled) return;
    e.preventDefault();
    setIsTokenHovering(false);
    
    if (onTokenDrop) {
      onTokenDrop(e, player);
    }
  };

  return (
    <div
      className={`
        relative rounded-xl overflow-hidden transition-all duration-300
        ${sizeClasses}
        ${tierStyles.bg} ${tierStyles.border} border-2
        ${isHovered && !isDisabled ? `${tierStyles.glow} scale-105` : ''}
        ${isDisabled ? 'opacity-60 cursor-not-allowed' : draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
        ${isTokenHovering ? 'ring-4 ring-primary-green-500' : ''}
        ${className}
      `}
      draggable={draggable && !isDisabled}
      onDragStart={onDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Game Status Badge */}
      {getGameStatusBadge()}

      {/* Player Content */}
      <div className="p-4 h-full flex flex-col">
        {/* Header: Position & Team */}
        <div className="flex items-center justify-between mb-3">
          <span className={`px-2 py-1 ${tierStyles.badge} rounded text-xs font-bold`}>
            {player.player_card.position === 'Quarterback' ? 'QB' :
             player.player_card.position === 'Running Back' ? 'RB' :
             player.player_card.position === 'Wide Receiver' ? 'WR' :
             player.player_card.position === 'Tight End' ? 'TE' : player.player_card.position}
          </span>
          <span className="text-xs text-primary-black-300 font-semibold">
            {player.player_card.team_abbreviation}
          </span>
        </div>

        {/* Player Name */}
        <h3 className={`text-lg font-bold ${tierStyles.text} mb-1 truncate`}>
          {player.player_card.player_name}
        </h3>

        {/* Tier & Level */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs ${getTierInfo(player.card_tier, player.card_level).color} font-semibold`}>
            {getTierInfo(player.card_tier, player.card_level).emoji} {getTierInfo(player.card_tier, player.card_level).name}
          </span>
          <span className="text-xs text-primary-black-400">
            Lv.{player.card_level || 1}
          </span>
        </div>

        {/* Stats Section */}
        {showStats && (
          <div className="space-y-2 mt-auto">
            {/* Projected Points */}
            {projection && projection.projected > 0 && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-primary-black-400">Projected:</span>
                <span className="text-primary-green-400 font-bold">
                  {projection.projected.toFixed(1)} pts
                </span>
              </div>
            )}

            {/* Live/Final Score */}
            {gameData && (gameData.gameStatus === 'live' || gameData.gameStatus === 'halftime' || gameData.gameStatus === 'final') && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-primary-black-400">Score:</span>
                <span className="text-white font-bold">
                  {gameData.currentPoints?.toFixed(1) || '0.0'} pts
                </span>
              </div>
            )}

            {/* Season Average */}
            {projection && projection.seasonAvg > 0 && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-primary-black-400">Season Avg:</span>
                <span className="text-primary-black-300 font-semibold">
                  {projection.seasonAvg.toFixed(1)} pts
                </span>
              </div>
            )}

            {/* Total Points */}
            {player.total_fantasy_points > 0 && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-primary-black-400">Total:</span>
                <span className="text-primary-black-300 font-semibold">
                  {player.total_fantasy_points.toFixed(1)} pts
                </span>
              </div>
            )}
          </div>
        )}

        {/* Applied Token */}
        {appliedToken && (
          <div className="mt-3 p-2 bg-primary-green-500/20 border border-primary-green-500 rounded flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">💎</span>
              <div>
                <div className="text-xs font-semibold text-primary-green-400">
                  {appliedToken.token_card.token_name}
                </div>
                <div className="text-[10px] text-primary-black-400">
                  +{appliedToken.token_card.bonus_points} pts
                </div>
              </div>
            </div>
            {onRemoveToken && !isLocked && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveToken(player);
                }}
                className="text-xs text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Add Token Button (when no token applied) */}
        {!appliedToken && onAddToken && !isLocked && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToken(player);
            }}
            className="mt-3 w-full py-2 bg-primary-green-500/20 border border-primary-green-500/50 rounded text-xs font-semibold text-primary-green-400 hover:bg-primary-green-500/30 transition-colors"
          >
            + Add Token
          </button>
        )}
      </div>
    </div>
  );
}

PlayerCard.propTypes = {
  player: PropTypes.shape({
    player_card: PropTypes.shape({
      player_name: PropTypes.string.isRequired,
      position: PropTypes.string.isRequired,
      team_abbreviation: PropTypes.string.isRequired,
      rarity: PropTypes.oneOf(['common', 'rare', 'epic', 'legendary']).isRequired,
      player_id: PropTypes.string
    }).isRequired,
    total_fantasy_points: PropTypes.number,
    card_level: PropTypes.number
  }).isRequired,
  onDragStart: PropTypes.func,
  onDrop: PropTypes.func,
  onTokenDrop: PropTypes.func,
  draggable: PropTypes.bool,
  isLocked: PropTypes.bool,
  appliedToken: PropTypes.shape({
    id: PropTypes.string,
    token_card: PropTypes.shape({
      token_name: PropTypes.string,
      bonus_points: PropTypes.number
    })
  }),
  onRemoveToken: PropTypes.func,
  gameData: PropTypes.shape({
    gameStatus: PropTypes.oneOf(['scheduled', 'live', 'halftime', 'final']),
    currentPoints: PropTypes.number,
    gameStartTime: PropTypes.string,
    opponent: PropTypes.string,
    isHome: PropTypes.bool
  }),
  projection: PropTypes.shape({
    projected: PropTypes.number,
    seasonAvg: PropTypes.number,
    gamesPlayed: PropTypes.number,
    injuryStatus: PropTypes.string
  }),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  showStats: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string,
  onAddToken: PropTypes.func
};