import PropTypes from 'prop-types';
import PositionBadge from './PositionBadge';
import TierBadge from './TierBadge';

/**
 * PlayerRowCompact - Compact player display for modals and selection lists
 * 
 * A simplified, consistent player row for use in:
 * - Swap modals (bench/lineup)
 * - Token application modals
 * - Selection lists
 * 
 * More compact than the full PlayerRow component.
 * 
 * @example
 * <PlayerRowCompact 
 *   player={player} 
 *   position="RB" 
 *   onClick={() => handleSelect(player)}
 * />
 */
export default function PlayerRowCompact({
  player,
  position = null,
  showTier = true,
  showPoints = true,
  projectedPoints = null,
  actualPoints = null,
  isLive = false,
  isFinal = false,
  matchupText = null,
  isSelected = false,
  isDisabled = false,
  onClick = null,
  className = ''
}) {
  if (!player?.player_card) return null;

  const { player_card } = player;
  const displayPoints = isFinal || isLive ? actualPoints : projectedPoints;
  const positionLabel = position || 'BN';

  return (
    <div
      onClick={() => !isDisabled && onClick?.()}
      className={`
        grid py-2 px-3 transition-all min-h-[56px]
        ${isSelected 
          ? 'bg-primary-black-800/50 border-l-4 border-primary-green-500/50' 
          : 'bg-primary-black-900 border-l-4 border-transparent'
        }
        ${isDisabled 
          ? 'opacity-50 cursor-not-allowed' 
          : onClick ? 'cursor-pointer hover:bg-primary-black-800/30' : ''
        }
        ${className}
      `}
      style={{ 
        gridTemplateColumns: '32px 40px 1fr 50px',
        gap: '8px',
        alignItems: 'center'
      }}
    >
      {/* Position Badge */}
      <div className="flex items-center justify-center">
        <PositionBadge position={positionLabel} size="xs" />
      </div>

      {/* Player Avatar */}
      <div className="rounded bg-primary-black-700 flex items-center justify-center w-10 h-10 overflow-hidden">
        {player_card.player_image ? (
          <img
            src={player_card.player_image}
            alt={player_card.player_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <svg className="w-6 h-6 text-primary-black-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        )}
      </div>

      {/* Player Info */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-semibold text-white text-sm truncate">
            {player_card.player_name}
          </span>
          {showTier && player.tier && (
            <TierBadge tier={player.tier} size="xs" />
          )}
        </div>
        <div className="text-xs text-primary-black-400 truncate">
          {player_card.team}
          {matchupText && <span className="ml-1">{matchupText}</span>}
        </div>
      </div>

      {/* Points */}
      {showPoints && (
        <div className="text-right">
          {displayPoints != null ? (
            <>
              <div className={`text-sm font-medium ${isLive ? 'text-primary-green-400' : 'text-white'}`}>
                {typeof displayPoints === 'number' ? displayPoints.toFixed(1) : '--'}
              </div>
              {!isFinal && !isLive && projectedPoints != null && (
                <div className="text-[10px] text-primary-black-500">proj</div>
              )}
              {isLive && <div className="text-[10px] text-primary-green-400">LIVE</div>}
              {isFinal && <div className="text-[10px] text-primary-black-500">final</div>}
            </>
          ) : (
            <span className="text-primary-black-500">--</span>
          )}
        </div>
      )}
    </div>
  );
}

PlayerRowCompact.propTypes = {
  player: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    tier: PropTypes.string,
    player_card: PropTypes.shape({
      player_name: PropTypes.string,
      player_image: PropTypes.string,
      team: PropTypes.string,
      position: PropTypes.string
    })
  }).isRequired,
  position: PropTypes.string,
  showTier: PropTypes.bool,
  showPoints: PropTypes.bool,
  projectedPoints: PropTypes.number,
  actualPoints: PropTypes.number,
  isLive: PropTypes.bool,
  isFinal: PropTypes.bool,
  matchupText: PropTypes.string,
  isSelected: PropTypes.bool,
  isDisabled: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string
};
