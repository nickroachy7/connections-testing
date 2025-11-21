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
        bg: 'bg-gray-800/50',
        text: 'text-gray-400',
        glow: '',
        badge: 'bg-gray-600 text-gray-100'
      },
      role_player: {
        border: 'border-blue-500',
        bg: 'bg-blue-900/30',
        text: 'text-blue-400',
        glow: 'shadow-lg shadow-blue-500/20',
        badge: 'bg-blue-600 text-blue-100'
      },
      starter: {
        border: 'border-purple-500',
        bg: 'bg-purple-900/30',
        text: 'text-purple-400',
        glow: 'shadow-lg shadow-purple-500/30',
        badge: 'bg-purple-600 text-purple-100'
      },
      all_star: {
        border: 'border-orange-500',
        bg: 'bg-orange-900/30',
        text: 'text-orange-400',
        glow: 'shadow-lg shadow-orange-500/30',
        badge: 'bg-orange-600 text-orange-100'
      },
      elite: {
        border: 'border-yellow-500',
        bg: 'bg-yellow-900/30',
        text: 'text-yellow-400',
        glow: 'shadow-xl shadow-yellow-500/40 animate-pulse',
        badge: 'bg-gradient-to-r from-yellow-600 to-orange-600 text-yellow-100 font-bold'
      }
    };
    return styles[tier] || styles.base;
  };

  // Get tier styling and display info
  const getTierInfo = (tier, level) => {
    const tiers = {
      base: {
        name: 'Base',
        color: 'text-gray-400',
        bgColor: 'bg-gray-700',
        borderColor: 'border-gray-600',
        emoji: '⚪',
        range: 'L1-2'
      },
      role_player: {
        name: 'Role Player',
        color: 'text-blue-400',
        bgColor: 'bg-blue-700',
        borderColor: 'border-blue-500',
        emoji: '🔵',
        range: 'L3-4'
      },
      starter: {
        name: 'Starter',
        color: 'text-purple-400',
        bgColor: 'bg-purple-700',
        borderColor: 'border-purple-500',
        emoji: '🟣',
        range: 'L5-6'
      },
      all_star: {
        name: 'All-Star',
        color: 'text-orange-400',
        bgColor: 'bg-orange-700',
        borderColor: 'border-orange-500',
        emoji: '⭐',
        range: 'L7-8'
      },
      elite: {
        name: 'Elite',
        color: 'text-yellow-400',
        bgColor: 'bg-gradient-to-r from-yellow-600 to-orange-600',
        borderColor: 'border-yellow-500',
        emoji: '👑',
        range: 'L9-10'
      }
    };
    return tiers[tier] || tiers.base;
  };

  // Get game status badge
  const getGameStatusBadge = () => {
    // If no game data, player is on BYE
    if (!gameData) {
      return (
        <div className="absolute top-2 right-2 bg-primary-black-700 text-primary-black-300 px-2 py-1 rounded text-xs font-bold">
          BYE
        </div>
      );
    }

    const { gameStatus, gameStartTime } = gameData;

    // LIVE or HALFTIME
    if (gameStatus === 'live' || gameStatus === 'halftime') {
      return (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
          <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
          <span>LIVE</span>
        </div>
      );
    }

    // FINAL
    if (gameStatus === 'final') {
      return (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-bold">
          <span>✓</span>
          <span>FINAL</span>
        </div>
      );
    }

    // SCHEDULED
    if (gameStatus === 'scheduled') {
      const startTime = new Date(gameStartTime);
      const now = new Date();
      const diffMs = startTime - now;
      const diffMins = Math.floor(diffMs / 60000);
      
      // Starts soon (within 1 hour)
      if (diffMins > 0 && diffMins <= 60) {
        return (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-yellow-600 text-white px-2 py-1 rounded-full text-xs font-bold">
            <span>⏱</span>
            <span>{diffMins}m</span>
          </div>
        );
      }

      // Upcoming
      const dayStr = startTime.toLocaleDateString('en-US', { weekday: 'short' });
      const timeStr = startTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      
      return (
        <div className="absolute top-2 right-2 bg-primary-black-700 text-primary-black-300 px-2 py-1 rounded text-xs">
          {dayStr} {timeStr}
        </div>
      );
    }

    return null;
  };

  // Get size classes
  const getSizeClasses = () => {
    const sizes = {
      small: {
        container: 'p-2 pb-2',
        name: 'text-sm',
        stats: 'text-xs',
        badge: 'text-[10px] px-1 py-0.5',
        spacing: 'space-y-1'
      },
      medium: {
        container: 'p-4',
        name: 'text-base',
        stats: 'text-sm',
        badge: 'text-xs px-2 py-1',
        spacing: 'space-y-1'
      },
      large: {
        container: 'p-6',
        name: 'text-lg',
        stats: 'text-base',
        badge: 'text-sm px-3 py-1',
        spacing: 'space-y-2'
      }
    };
    return sizes[size] || sizes.medium;
  };

  const tierStyles = getTierStyles(player.card_tier || 'base');
  const sizeClasses = getSizeClasses();
  const isDisabled = isLocked || !draggable;

  const handleDragOver = (e) => {
    try {
      // Check if there's a dragged token from the global state
      const isTokenDrag = window.currentDraggedToken || false;
      
      console.log('🎯 PlayerCard dragOver - isTokenDrag:', !!isTokenDrag, 'isLocked:', isLocked, 'player:', player?.player_card?.player_name);
      console.log('🎯 PlayerCard dragOver - onTokenDrop exists:', !!onTokenDrop);
      
      if (!isLocked && onTokenDrop && isTokenDrag) {
        console.log('🎯 PlayerCard: Allowing token drop on', player?.player_card?.player_name);
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsTokenHovering(true);
      } else {
        console.log('🎯 PlayerCard: Drop NOT allowed - isLocked:', isLocked, 'onTokenDrop:', !!onTokenDrop, 'isTokenDrag:', !!isTokenDrag);
        setIsTokenHovering(false);
      }
    } catch (err) {
      console.error('🎯 PlayerCard dragOver error:', err);
      setIsTokenHovering(false);
      // Ignore errors during drag over
    }
  };

  const handleDragLeave = (e) => {
    // Only clear hover state if actually leaving the card
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsTokenHovering(false);
    }
  };

  const handleDrop = (e) => {
    setIsTokenHovering(false);
    
    try {
      const dragData = e.dataTransfer.getData('text/plain');
      const isTokenDrop = dragData && dragData.startsWith('token:');
      const isTokenDrag = window.currentDraggedToken || false;
      
      console.log('🎯 PlayerCard drop - dragData:', dragData, 'isTokenDrop:', isTokenDrop, 'isTokenDrag:', !!isTokenDrag, 'player:', player?.player_card?.player_name);
      
      if (!isLocked && onTokenDrop && (isTokenDrop || isTokenDrag)) {
        console.log('🎯 PlayerCard: Calling onTokenDrop for player:', player?.player_card?.player_name);
        e.preventDefault();
        e.stopPropagation();
        onTokenDrop(e, player);
        return;
      }
    } catch (err) {
      console.error('🎯 PlayerCard drop error:', err);
      // Continue with normal drop handling
    }
    
    if (onDrop) {
      onDrop(e);
    }
  };

  return (
    <div
      draggable={draggable && !isLocked}
      onDragStart={onDragStart}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative transition-all duration-200 flex flex-col
        ${size === 'small' ? `border-2 ${tierStyles.border} rounded-lg h-full overflow-visible` : `rounded-lg border-2 ${tierStyles.border} ${tierStyles.bg} overflow-visible`}
        ${isHovered && !isDisabled ? tierStyles.glow : ''}
        ${!draggable ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}
        ${isTokenHovering ? 'ring-4 ring-primary-green-500 ring-opacity-60 scale-105 shadow-2xl shadow-primary-green-500/50' : ''}
        ${sizeClasses.container}
        ${className}
      `}
    >
      {/* Lock Indicator - Bottom Left Corner */}
      {isLocked && (
        <div className={`absolute bottom-1 left-1 ${size === 'small' ? 'text-lg' : 'text-2xl'} z-20 bg-black/60 rounded px-1`}>
          🔒
        </div>
      )}

      {/* Points Display - Top Right Corner */}
      <div className="absolute top-2 right-2 z-10">
        {(() => {
          // IMPORTANT: Don't render stats until BOTH projection AND gameData are ready
          // This prevents the flash of showing only projection before gameData loads
          // For scheduled games (no gameData yet), wait for projection
          // For live/final games, wait for gameData
          const hasProjection = projection && projection.projected !== undefined;
          const hasGameData = gameData !== null && gameData !== undefined;
          
          // Only render when we have at least one piece of data
          if (!hasProjection && !hasGameData) {
            return null;
          }

          const statusLower = gameData?.gameStatus?.toLowerCase() || '';
          const isFinal = statusLower === 'final';
          const isLive = statusLower === 'live' || statusLower === 'halftime';
          const isLiveOrFinal = isLive || isFinal;
          
          // For live/final games, wait until we have gameData
          // This prevents showing projection-only before currentPoints loads
          if (isLiveOrFinal && !hasGameData) {
            return null;
          }
          
          // Debug for Darnold
          if (player.player_card.player_name === 'Sam Darnold') {
            console.log('🎮 Darnold render - isFinal:', isFinal, 'currentPoints:', gameData?.currentPoints, 'projection:', projection?.projected);
          }
          
          // If game is FINAL, show final points on top, projection below
          if (isFinal && gameData) {
            const finalPoints = gameData.currentPoints !== undefined ? gameData.currentPoints : 0;
            return (
              <div className="text-center">
                <div className={`${size === 'small' ? 'text-lg' : 'text-2xl'} text-white font-bold leading-none mb-0.5`}>
                  {finalPoints.toFixed(1)}
                </div>
                {projection && projection.projected !== undefined && (
                  <div className={`${size === 'small' ? 'text-xs' : 'text-sm'} text-primary-black-400 font-semibold opacity-60`}>
                    {projection.projected.toFixed(1)}
                  </div>
                )}
              </div>
            );
          }
          
          // If game is LIVE, show current points on top, projection below
          if (isLive && gameData && gameData.currentPoints !== undefined) {
            return (
              <div className="text-center">
                <div className={`${size === 'small' ? 'text-lg' : 'text-2xl'} text-white font-bold leading-none mb-0.5`}>
                  {gameData.currentPoints.toFixed(1)}
                </div>
                {projection && projection.projected !== undefined && (
                  <div className={`${size === 'small' ? 'text-xs' : 'text-sm'} text-primary-green-400 font-semibold`}>
                    {projection.projected.toFixed(1)}
                  </div>
                )}
              </div>
            );
          }
          
          // Game is SCHEDULED, show projection only
          if (projection && projection.projected !== undefined) {
            return (
              <div className="text-center">
                <div className={`${size === 'small' ? 'text-lg' : 'text-2xl'} text-primary-black-500 font-bold leading-none mb-0.5`}>
                  -
                </div>
                <div className={`${size === 'small' ? 'text-xs' : 'text-sm'} text-primary-green-400 font-semibold`}>
                  {projection.projected.toFixed(1)}
                </div>
              </div>
            );
          }
          
          return null;
        })()}
      </div>

      {/* Game Status Badge - Compact (small size only) */}
      {size === 'small' && (
        <>
          {gameData && gameData.gameStatus === 'live' && (
            <div className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
          )}
        </>
      )}

      {/* Spacer to push content to bottom */}
      <div className="flex-grow min-h-0"></div>

      {/* Token Badge - Above Player Name (Centered) */}
      <div className="flex-shrink-0 flex justify-center mb-2 pointer-events-none">
        {appliedToken ? (
          <div className="relative group pointer-events-auto">
            {/* Circular Token Badge with Emoji */}
            <div 
              className={`${size === 'small' ? 'w-10 h-10' : 'w-12 h-12'} flex items-center justify-center bg-primary-green-500/20 border-2 border-primary-green-500/50 rounded-full transition-all duration-200 cursor-pointer hover:scale-110 hover:border-primary-green-400 relative shadow-lg`}
            >
              <span className={`${size === 'small' ? 'text-xl' : 'text-2xl'}`}>
                {appliedToken.token_card.emoji || '💎'}
              </span>
            </div>
            
            {/* Tooltip Popup - Directly below token using absolute positioning */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[9999]">
              <div className="bg-primary-black-900 border-2 border-primary-green-500 rounded-lg px-3 py-2 shadow-2xl min-w-max max-w-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{appliedToken.token_card.emoji || '💎'}</span>
                  <span className="text-sm text-primary-green-400 font-bold">
                    {appliedToken.token_card.token_name}
                  </span>
                </div>
                <div className="text-xs text-primary-green-300 mb-1">
                  +{appliedToken.token_card.bonus_points} Fantasy Points
                </div>
                {appliedToken.token_card.description && (
                  <div className="text-xs text-primary-black-300 mb-1 leading-tight whitespace-normal">
                    {appliedToken.token_card.description}
                  </div>
                )}
                {onRemoveToken && !isLocked && (
                  <div className="text-[10px] text-primary-black-400 mt-1 border-t border-primary-black-700 pt-1">
                    Click to remove
                  </div>
                )}
              </div>
              {/* Tooltip Arrow - pointing up */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-[1px] w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-primary-green-500"></div>
            </div>
            
            {/* Invisible click target for removal */}
            {onRemoveToken && !isLocked && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveToken(appliedToken.id);
                }}
                className="absolute inset-0 z-[50]"
                aria-label="Remove token"
              />
            )}
          </div>
        ) : (
          /* Empty Token Slot with + Button */
          !isLocked && onAddToken && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToken(player);
              }}
              className={`${size === 'small' ? 'w-10 h-10' : 'w-12 h-12'} flex items-center justify-center border-2 border-dashed border-primary-black-600 hover:border-primary-green-500 rounded-full transition-all duration-200 cursor-pointer hover:scale-110 bg-primary-black-800/30 hover:bg-primary-green-500/10 group pointer-events-auto`}
              title="Add token"
            >
              <span className={`${size === 'small' ? 'text-xl' : 'text-2xl'} text-primary-black-600 group-hover:text-primary-green-400 font-bold`}>
                +
              </span>
            </button>
          )
        )}
      </div>

      {/* Bottom Stack - Player Name */}
      <div className={`flex-shrink-0 ${size === 'small' ? 'mt-1 mb-1 px-1' : 'mt-2 mb-2 px-1'}`}>
        <div className={`${sizeClasses.name} font-bold text-primary-black-50 text-center leading-tight`}>
          {(() => {
            const name = player.player_card.player_name;
            const parts = name.split(' ');
            
            // Always abbreviate first name to initial
            if (parts.length >= 2) {
              return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
            }
            return name;
          })()}
        </div>
        
        {/* Tier & Level Badge - Below Name */}
        {player.card_tier && player.card_level && (
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getTierInfo(player.card_tier, player.card_level).bgColor} text-white`}>
              {getTierInfo(player.card_tier, player.card_level).name.charAt(0)}
            </span>
            <span className="text-[10px] text-primary-black-400 font-medium">
              Level {player.card_level}
            </span>
          </div>
        )}
      </div>

      {/* Next Game - Shows game matchup, bye week, or nothing for completed games */}
      {gameData && gameData.gameStatus === 'scheduled' && gameData.opponent ? (
        <div className={`${size === 'small' ? 'mb-1' : 'mb-2'} text-center flex-shrink-0`}>
          {gameData.gameStartTime && (
            <div className={`${sizeClasses.stats} text-primary-black-400 font-semibold`}>
              {gameData.isHome ? 'vs' : '@'} {gameData.opponent} · {new Date(gameData.gameStartTime).toLocaleDateString('en-US', { 
                weekday: 'short'
              }).toUpperCase()} {new Date(gameData.gameStartTime).toLocaleTimeString('en-US', { 
                hour: 'numeric',
                hour12: true 
              }).replace(' ', '')}
            </div>
          )}
        </div>
      ) : !gameData ? (
        <div className={`${size === 'small' ? 'mb-1' : 'mb-2'} text-center flex-shrink-0`}>
          <div className={`${sizeClasses.stats} text-primary-black-500 font-semibold`}>
            On Bye Week
          </div>
        </div>
      ) : null}
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
