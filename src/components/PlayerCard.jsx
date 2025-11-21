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
    console.log('🎮 Tua PlayerCard received gameData:', gameData);
  }
  
  // Debug logging for Sam Darnold
  if (player.player_card.player_name === 'Sam Darnold') {
    console.log('🎮 Darnold PlayerCard received gameData:', gameData);
    console.log('🎮 Darnold projection:', projection);
  }

  // Get tier styling (replacing old rarity styling)
  const getTierStyles = (tier) => {
    const styles = {
      base: {
        border: 'border-gray-600',
        bg: 'bg-gray-900/30',
        text: 'text-gray-400',
        glow: 'shadow-md shadow-gray-500/10',
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
        glow: 'shadow-xl shadow-yellow-500/40',
        badge: 'bg-yellow-600 text-yellow-100'
      }
    };
    
    return styles[tier] || styles.base;
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
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-1 px-2 py-1 bg-red-600 rounded-md shadow-lg animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
            <span className="text-white text-xs font-bold">LIVE</span>
          </div>
        </div>
      );
    }
    
    if (status === 'final') {
      return (
        <div className="absolute top-2 right-2 z-10">
          <div className="px-2 py-1 bg-green-600 rounded-md shadow-lg">
            <span className="text-white text-xs font-bold">FINAL</span>
          </div>
        </div>
      );
    }

    if (gameData.gameStartTime) {
      const gameTime = new Date(gameData.gameStartTime);
      const dayOfWeek = gameTime.toLocaleDateString('en-US', { weekday: 'short' });
      const time = gameTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      
      return (
        <div className="absolute top-2 right-2 z-10">
          <div className="px-2 py-1 bg-primary-black-700 rounded-md shadow-lg">
            <div className="text-white text-[10px] font-bold text-center">{dayOfWeek}</div>
            <div className="text-white text-[10px] font-semibold">{time}</div>
          </div>
        </div>
      );
    }

    return null;
  };

  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          container: 'w-32 h-40',
          text: 'text-xs',
          badge: 'text-[8px] px-1',
          icon: 'w-3 h-3',
          stats: 'text-[10px]'
        };
      case 'large':
        return {
          container: 'w-44 h-56',
          text: 'text-base',
          badge: 'text-xs px-2',
          icon: 'w-5 h-5',
          stats: 'text-sm'
        };
      case 'medium':
      default:
        return {
          container: 'w-36 h-48',
          text: 'text-sm',
          badge: 'text-[10px] px-1.5',
          icon: 'w-4 h-4',
          stats: 'text-xs'
        };
    }
  };

  const tierStyles = getTierStyles(player.card_tier || 'base');
  const sizeClasses = getSizeClasses();
  const isDisabled = isLocked || !draggable;

  const handleDragOver = (e) => {
    if (isDisabled || !onTokenDrop) return;
    e.preventDefault();
    setIsTokenHovering(true);
  };

  const handleDragLeave = (e) => {
    if (isDisabled) return;
    setIsTokenHovering(false);
  };

  const handleDrop = (e) => {
    if (isDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    setIsTokenHovering(false);
    
    if (onTokenDrop) {
      try {
        const tokenData = e.dataTransfer.getData('application/json');
        if (tokenData) {
          const token = JSON.parse(tokenData);
          onTokenDrop(player, token);
        }
      } catch (err) {
        console.error('Error handling token drop:', err);
      }
    }
  };

  return (
    <div 
      className={`
        relative rounded-xl overflow-hidden transition-all duration-300
        ${sizeClasses.container}
        border-2 ${tierStyles.border}
        ${tierStyles.bg} ${tierStyles.glow}
        ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:scale-105'}
        ${isTokenHovering ? 'ring-4 ring-primary-green-500 scale-105' : ''}
        ${className}
      `}
      draggable={!isDisabled && draggable}
      onDragStart={onDragStart}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={(e) => setTooltipPosition({ x: e.clientX, y: e.clientY })}
    >
      {/* Lock Badge */}
      {isLocked && (
        <div className="absolute top-2 left-2 z-20">
          <div className="px-2 py-1 bg-red-600 rounded-md shadow-lg flex items-center gap-1">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span className="text-white text-[10px] font-bold">LOCKED</span>
          </div>
        </div>
      )}

      {/* Game Status Badge */}
      {!isLocked && getGameStatusBadge()}

      {/* Card Header */}
      <div className="p-3 pb-2">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold ${tierStyles.text} truncate ${sizeClasses.text}`}>
              {player.player_card.player_name}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`${sizeClasses.badge} ${tierStyles.badge} rounded font-semibold`}>
                {player.player_card.team_abbreviation}
              </span>
              <span className={`${sizeClasses.badge} bg-primary-black-700 text-primary-black-300 rounded font-semibold`}>
                {player.player_card.position === 'Quarterback' ? 'QB' :
                 player.player_card.position === 'Running Back' ? 'RB' :
                 player.player_card.position === 'Wide Receiver' ? 'WR' : 'TE'}
              </span>
            </div>
          </div>
        </div>

        {/* Tier Badge */}
        <div className="flex items-center gap-1 mb-2">
          <span className={`text-xs ${getTierInfo(player.card_tier, player.card_level).color}`}>
            {getTierInfo(player.card_tier, player.card_level).emoji}
          </span>
          <span className={`text-[10px] font-semibold ${getTierInfo(player.card_tier, player.card_level).color}`}>
            {getTierInfo(player.card_tier, player.card_level).name}
          </span>
          <span className="text-[10px] text-primary-black-500 font-semibold">
            Lv.{player.card_level || 1}
          </span>
        </div>

        {/* Stats */}
        {showStats && (
          <div className="space-y-1">
            {projection?.projected > 0 && (
              <div className="flex justify-between items-center">
                <span className={`${sizeClasses.stats} text-primary-black-400`}>Proj</span>
                <span className={`${sizeClasses.stats} font-bold text-primary-black-300`}>
                  {projection.projected.toFixed(1)}
                </span>
              </div>
            )}
            {gameData?.currentPoints !== undefined && (
              <div className="flex justify-between items-center">
                <span className={`${sizeClasses.stats} text-primary-black-400`}>Pts</span>
                <span className={`${sizeClasses.stats} font-bold text-white`}>
                  {gameData.currentPoints.toFixed(1)}
                </span>
              </div>
            )}
            {projection?.seasonAvg > 0 && (
              <div className="flex justify-between items-center">
                <span className={`${sizeClasses.stats} text-primary-black-400`}>Avg</span>
                <span className={`${sizeClasses.stats} font-semibold text-primary-black-300`}>
                  {projection.seasonAvg.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Applied Token */}
      {appliedToken && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary-green-900/90 to-transparent p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <span className="text-xs">💎</span>
              <span className="text-[10px] text-primary-green-300 font-semibold truncate">
                {appliedToken.token_card.token_name}
              </span>
            </div>
            {onRemoveToken && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveToken(player);
                }}
                className="ml-1 px-1.5 py-0.5 bg-red-600 hover:bg-red-500 rounded text-white text-[10px] font-bold transition-colors flex-shrink-0"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add Token Button (if no token applied) */}
      {!appliedToken && onAddToken && !isLocked && (
        <div className="absolute bottom-2 right-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToken(player);
            }}
            className="w-6 h-6 bg-primary-green-600 hover:bg-primary-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold transition-colors shadow-lg"
          >
            +
          </button>
        </div>
      )}

      {/* Hover Tooltip */}
      {isHovered && projection && (
        <div 
          className="fixed z-50 bg-primary-black-900 border-2 border-primary-green-500 rounded-lg p-3 shadow-xl pointer-events-none"
          style={{
            left: `${tooltipPosition.x + 10}px`,
            top: `${tooltipPosition.y + 10}px`,
            maxWidth: '200px'
          }}
        >
          <div className="text-sm font-bold text-primary-black-50 mb-2">
            {player.player_card.player_name}
          </div>
          <div className="space-y-1 text-xs">
            {projection.projected > 0 && (
              <div className="flex justify-between">
                <span className="text-primary-black-400">Projected:</span>
                <span className="text-primary-green-400 font-bold">{projection.projected.toFixed(1)}</span>
              </div>
            )}
            {projection.seasonAvg > 0 && (
              <div className="flex justify-between">
                <span className="text-primary-black-400">Season Avg:</span>
                <span className="text-primary-black-300">{projection.seasonAvg.toFixed(1)}</span>
              </div>
            )}
            {projection.gamesPlayed > 0 && (
              <div className="flex justify-between">
                <span className="text-primary-black-400">Games:</span>
                <span className="text-primary-black-300">{projection.gamesPlayed}</span>
              </div>
            )}
            {gameData?.opponent && (
              <div className="flex justify-between">
                <span className="text-primary-black-400">Opponent:</span>
                <span className="text-primary-black-300">
                  {gameData.isHome ? '' : '@'}{gameData.opponent}
                </span>
              </div>
            )}
            {projection.injuryStatus && projection.injuryStatus !== 'Active' && (
              <div className="mt-2 pt-2 border-t border-primary-black-700">
                <span className="text-red-400 font-semibold">⚠️ {projection.injuryStatus}</span>
              </div>
            )}
          </div>
        </div>
      )}
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