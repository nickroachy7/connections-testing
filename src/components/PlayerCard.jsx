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
  liveGameData = null, // Map of all players with games this week
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
        glow: 'shadow-lg shadow-yellow-500/40',
        badge: 'bg-yellow-600 text-yellow-100'
      }
    };
    return styles[tier] || styles.base;
  };

  const getPointsRange = (tier) => {
    const tiers = {
      elite: {
        name: 'Elite',
        color: 'text-yellow-400',
        range: 'L15+'
      },
      all_star: {
        name: 'All-Star',
        color: 'text-orange-400',
        range: 'L11-14'
      },
      starter: {
        name: 'Starter',
        color: 'text-purple-400',
        range: 'L7-10'
      },
      role_player: {
        name: 'Role Player',
        color: 'text-blue-400',
        range: 'L4-6'
      },
      base: {
        name: 'Base',
        color: 'text-gray-400',
        range: 'L9-10'
      }
    };
    return tiers[tier] || tiers.base;
  };

  // Get game status badge
  const getGameStatusBadge = () => {
    // Only show BYE if liveGameData exists but this player isn't in it
    // Don't show BYE if liveGameData hasn't loaded yet
    if (liveGameData && liveGameData.size > 0 && !gameData) {
      return (
        <div className="absolute top-2 right-2 bg-primary-black-700 text-primary-black-300 px-2 py-1 rounded text-xs font-bold">
          BYE
        </div>
      );
    }
    
    // If no game data and data hasn't loaded, don't show badge
    if (!gameData) {
      return null;
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
        <div className="absolute top-2 right-2 bg-primary-black-700/90 text-primary-black-300 px-2 py-1 rounded text-xs font-bold">
          {dayStr} {timeStr}
        </div>
      );
    }

    return null;
  };

  const tierStyles = getTierStyles(player.card_tier);
  const pointsRange = getPointsRange(player.card_tier);

  // Size variants
  const sizeClasses = {
    small: {
      container: 'text-xs',
      header: 'p-1.5',
      content: 'p-2',
      name: 'text-xs',
      position: 'text-[10px]',
      stats: 'text-[10px]',
      badge: 'text-[9px] px-1.5 py-0.5',
      tokenBadge: 'text-[9px] px-1.5 py-0.5'
    },
    medium: {
      container: 'text-sm',
      header: 'p-2',
      content: 'p-3',
      name: 'text-sm',
      position: 'text-xs',
      stats: 'text-xs',
      badge: 'text-xs px-2 py-1',
      tokenBadge: 'text-xs px-2 py-1'
    },
    large: {
      container: 'text-base',
      header: 'p-3',
      content: 'p-4',
      name: 'text-base',
      position: 'text-sm',
      stats: 'text-sm',
      badge: 'text-sm px-3 py-1.5',
      tokenBadge: 'text-sm px-3 py-1.5'
    }
  };

  const sizes = sizeClasses[size];

  const handleDragStart = (e) => {
    if (onDragStart && !isLocked) {
      onDragStart(e);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only handle token drops
    try {
      const dragData = e.dataTransfer.getData('text/plain');
      const isTokenDrop = dragData && dragData.startsWith('token:');
      const isTokenDrag = window.currentDraggedToken || false;
      
      if (isTokenDrop || isTokenDrag) {
        e.dataTransfer.dropEffect = 'copy';
        setIsTokenHovering(true);
      }
    } catch (err) {
      console.error('Error reading drag data:', err);
    }
  };

  const handleDragLeave = (e) => {
    // Only clear hover if we're actually leaving the card
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsTokenHovering(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTokenHovering(false);
    
    // Check if this is a token drop
    try {
      const dragData = e.dataTransfer.getData('text/plain');
      const isTokenDrop = dragData && dragData.startsWith('token:');
      
      if (isTokenDrop && onTokenDrop) {
        onTokenDrop(e, player);
      }
    } catch (err) {
      console.error('Error handling drop:', err);
    }
  };

  const handleMouseMove = (e) => {
    setTooltipPosition({
      x: e.clientX,
      y: e.clientY
    });
  };

  const getInjuryBadge = () => {
    const injuryStatus = player.player_card.injury_status;
    if (!injuryStatus || injuryStatus === 'healthy') return null;

    const statusMap = {
      'questionable': { emoji: '🟡', label: 'Q', color: 'bg-yellow-600' },
      'doubtful': { emoji: '🟠', label: 'D', color: 'bg-orange-600' },
      'out': { emoji: '🔴', label: 'O', color: 'bg-red-600' }
    };

    const status = statusMap[injuryStatus.toLowerCase()];
    if (!status) return null;

    return (
      <div className={`absolute top-2 left-2 ${status.color} text-white px-1.5 py-0.5 rounded text-xs font-bold z-10`}>
        {status.label}
      </div>
    );
  };

  const formatProjectedPoints = (projValue) => {
    if (projValue == null || isNaN(projValue)) return '0.0';
    const num = parseFloat(projValue);
    return num.toFixed(1);
  };

  return (
    <div
      draggable={draggable && !isLocked}
      onDragStart={handleDragStart}
      onDrop={onDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      className={`
        relative rounded-xl border-2 transition-all duration-200
        ${tierStyles.border} ${tierStyles.bg} ${tierStyles.glow}
        ${draggable && !isLocked ? 'cursor-move hover:scale-105' : ''}
        ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}
        ${isTokenHovering ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-primary-black-900 scale-105' : ''}
        ${sizes.container}
        ${className}
      `}
    >
      {/* Game Status Badge */}
      {getGameStatusBadge()}
      
      {/* Injury Badge */}
      {getInjuryBadge()}

      {/* Lock Status */}
      {isLocked && (
        <div className="absolute top-2 left-2 bg-red-600/90 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 z-10">
          <span>🔒</span>
          <span>LOCKED</span>
        </div>
      )}

      {/* Applied Token Badge */}
      {appliedToken && (
        <div className="absolute bottom-2 right-2 z-20">
          <div className="relative group">
            <div className="bg-primary-green-500/90 text-primary-black-950 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg">
              <span>💎</span>
              <span>+{appliedToken.token_card.bonus_points}</span>
            </div>
            
            {/* Hover Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-30">
              <div className="bg-primary-black-800 border border-primary-green-500 rounded-lg p-2 text-xs whitespace-nowrap shadow-xl">
                <p className="text-primary-green-400 font-bold">{appliedToken.token_card.token_name}</p>
                <p className="text-primary-black-300 text-[10px] mt-1">+{appliedToken.token_card.bonus_points} bonus points</p>
                {onRemoveToken && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveToken(appliedToken.id);
                    }}
                    className="mt-2 w-full bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-[10px] font-semibold transition-colors"
                  >
                    Remove Token
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header - Tier Badge */}
      <div className={`${sizes.header} border-b border-primary-black-700/50 flex items-center justify-between`}>
        <div className={`${tierStyles.badge} ${sizes.badge} rounded font-bold uppercase tracking-wide`}>
          {pointsRange.name}
        </div>
        <div className="text-primary-black-500 text-xs font-semibold">
          LVL {player.card_level}
        </div>
      </div>

      {/* Content */}
      <div className={`${sizes.content} flex flex-col gap-2`}>
        {/* Player Name */}
        <div>
          <h3 className={`${sizes.name} font-bold text-primary-black-50 truncate leading-tight`}>
            {player.player_card.player_name}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`${sizes.position} font-semibold ${tierStyles.text}`}>
              {player.player_card.position}
            </span>
            <span className="text-primary-black-600">•</span>
            <span className={`${sizes.position} text-primary-black-400 font-semibold`}>
              {player.player_card.team_abbreviation}
            </span>
          </div>
        </div>

        {/* Stats Section */}
        {showStats && (
          <div className="space-y-1.5">
            {/* Projected Points */}
            <div className="flex items-center justify-between">
              <span className={`${sizes.stats} text-primary-black-400 font-semibold`}>
                PROJ:
              </span>
              <span className={`${sizes.stats} font-bold text-primary-green-400`}>
                {projection?.projected != null 
                  ? formatProjectedPoints(projection.projected)
                  : formatProjectedPoints(player.player_card.projected_points)
                } pts
              </span>
            </div>

            {/* Season Average */}
            {player.player_card.season_ppg > 0 && (
              <div className="flex items-center justify-between">
                <span className={`${sizes.stats} text-primary-black-400 font-semibold`}>
                  AVG:
                </span>
                <span className={`${sizes.stats} font-bold text-primary-black-300`}>
                  {player.player_card.season_ppg.toFixed(1)} ppg
                </span>
              </div>
            )}

            {/* Total Points */}
            {player.total_fantasy_points > 0 && (
              <div className="flex items-center justify-between">
                <span className={`${sizes.stats} text-primary-black-400 font-semibold`}>
                  TOTAL:
                </span>
                <span className={`${sizes.stats} font-bold text-primary-black-300`}>
                  {player.total_fantasy_points.toFixed(1)} pts
                </span>
              </div>
            )}
          </div>
        )}

        {/* Live Game Stats */}
        {gameData && (gameData.gameStatus === 'live' || gameData.gameStatus === 'halftime' || gameData.gameStatus === 'final') && (
          <div className="mt-2 pt-2 border-t border-primary-black-700/50">
            <div className="flex items-center justify-between">
              <span className={`${sizes.stats} text-primary-green-400 font-bold`}>
                LIVE PTS:
              </span>
              <span className={`${sizes.stats} font-bold text-primary-green-400`}>
                {gameData.currentPoints?.toFixed(1) || '0.0'}
              </span>
            </div>
          </div>
        )}

        {/* Next Game - Shows game matchup, bye week, or nothing for completed games */}
        {gameData && gameData.gameStatus === 'scheduled' && (
          <div className="mt-2 pt-2 border-t border-primary-black-700/50">
            <div className={`${sizes.stats} text-primary-black-400 flex items-center justify-between`}>
              <span className="font-semibold">
                {gameData.isHome ? 'vs' : '@'} {gameData.opponent}
              </span>
            </div>
          </div>
        )}

        {/* BYE Week indicator */}
        {liveGameData && liveGameData.size > 0 && !gameData && (
          <div className="mt-2 pt-2 border-t border-primary-black-700/50">
            <div className={`${sizes.stats} text-primary-black-500 text-center font-semibold`}>
              On Bye Week
            </div>
          </div>
        )}

        {/* Add Token Button (if no token applied) */}
        {onAddToken && !appliedToken && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToken(player);
            }}
            className="mt-2 w-full bg-primary-black-700 hover:bg-primary-black-600 text-primary-black-300 hover:text-primary-black-100 px-2 py-1 rounded text-xs font-semibold transition-colors border border-primary-black-600 hover:border-primary-green-500"
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
    id: PropTypes.string.isRequired,
    is_locked: PropTypes.bool,
    card_tier: PropTypes.string,
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
  liveGameData: PropTypes.instanceOf(Map),
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
