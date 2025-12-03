import PropTypes from 'prop-types';
import { Trophy, Users, Swords, Target, TrendingUp } from 'lucide-react';

/**
 * Get win condition config (icon, label, colors)
 */
function getWinConditionConfig(winCondition) {
  const configs = {
    'median': {
      icon: Target,
      label: 'Median Wins',
      shortLabel: 'Median',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    },
    'h2h': {
      icon: Swords,
      label: 'H2H Wins',
      shortLabel: 'H2H',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20'
    },
    'top_points': {
      icon: TrendingUp,
      label: 'Top Score',
      shortLabel: 'Top Score',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20'
    }
  };
  return configs[winCondition] || configs['median'];
}

/**
 * ContestCard - Displays a public contest with its details
 * Matches TeamScoreBanner design pattern - compact single-row layout
 */
export default function ContestCard({ 
  contest, 
  onJoin,
  disabled = false 
}) {
  const {
    name,
    description,
    max_entries,
    current_entries,
    win_condition,
    status
  } = contest;
  
  const spotsRemaining = max_entries ? max_entries - current_entries : null;
  const isFull = max_entries ? spotsRemaining <= 0 : false;
  const winConfig = getWinConditionConfig(win_condition);
  const WinConditionIcon = winConfig.icon;
  
  // Determine card state
  const canJoin = !isFull && status === 'open' && !disabled;
  const statusLabel = status === 'locked' ? 'Locked' : 'Closed';
  
  return (
    <div
      className={`
        bg-primary-black-900 rounded-xl overflow-hidden transition-all duration-200
        ${canJoin ? 'cursor-pointer hover:bg-primary-black-800 active:bg-primary-black-800' : 'cursor-default opacity-60'}
      `}
      onClick={() => canJoin && onJoin?.(contest)}
    >
      {/* Header Bar - Contest Name + Win Type + Entrants (matches TeamScoreBanner exactly) */}
      <div className="border-b border-primary-black-700/50 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Trophy className="w-3.5 h-3.5 flex-shrink-0 text-primary-green-400" />
            <span className="text-xs font-bold text-white truncate">{name}</span>
            <span className="text-[10px] text-white/50 whitespace-nowrap">
              — {winConfig.shortLabel} Wins
            </span>
          </div>
          {/* Entrant Count - Right side */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <Users className="w-3 h-3 text-white/50" />
            <span className="text-[10px] text-white/60 font-medium">
              {current_entries}/{max_entries || '∞'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Description row - only if present */}
      {description && (
        <div className="px-3 pt-2">
          <p className="text-[10px] text-primary-black-400 line-clamp-1">{description}</p>
        </div>
      )}
      
      {/* Main Content Row - All badges + action in single compact row */}
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Win condition badge only */}
          <div className="flex items-center gap-1.5">
            {/* Win Condition Badge */}
            <div className={`inline-flex items-center gap-0.5 ${winConfig.bgColor} ${winConfig.color} font-bold uppercase rounded text-[9px] px-1.5 py-0.5 whitespace-nowrap`}>
              <WinConditionIcon className="w-3 h-3" />
              {winConfig.shortLabel}
            </div>
          </div>
          
          {/* Right: Action button */}
          <div className="flex-shrink-0">
            {isFull ? (
              <div className="px-3 py-1 rounded bg-primary-black-800 text-[10px] font-semibold text-primary-black-500 uppercase">
                Full
              </div>
            ) : status !== 'open' ? (
              <div className="px-3 py-1 rounded bg-primary-black-800 text-[10px] font-semibold text-primary-black-500 uppercase">
                {statusLabel}
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJoin?.(contest);
                }}
                className="px-4 py-1 rounded-full bg-primary-green-500 hover:bg-primary-green-400 text-[10px] font-bold text-primary-black-950 uppercase transition-colors"
              >
                Join
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

ContestCard.propTypes = {
  contest: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    max_entries: PropTypes.number.isRequired,
    current_entries: PropTypes.number.isRequired,
    win_condition: PropTypes.oneOf(['median', 'h2h', 'top_points']),
    status: PropTypes.string.isRequired
  }).isRequired,
  onJoin: PropTypes.func,
  disabled: PropTypes.bool
};
