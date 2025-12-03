import PropTypes from 'prop-types';
import { Trophy, Users, Zap, Target, Activity, Crown, Shield, Swords, TrendingUp, Calendar } from 'lucide-react';
import { formatScoringType, getDifficultyBadgeStyles } from '../services/contestService';

/**
 * Get the icon component based on icon name
 */
function getIconComponent(iconName) {
  const icons = {
    'trophy': Trophy,
    'zap': Zap,
    'target': Target,
    'shield': Shield,
    'crown': Crown,
    'activity': Activity,
    'users': Users
  };
  return icons[iconName] || Trophy;
}

/**
 * Get win condition icon
 */
function getWinConditionIcon(winCondition) {
  const icons = {
    'median': Target,
    'h2h': Swords,
    'top_points': TrendingUp
  };
  return icons[winCondition] || Trophy;
}

/**
 * Get win condition color classes
 */
function getWinConditionColor(winCondition) {
  const colors = {
    'median': 'text-blue-400 bg-blue-500/20',
    'h2h': 'text-orange-400 bg-orange-500/20',
    'top_points': 'text-yellow-400 bg-yellow-500/20'
  };
  return colors[winCondition] || 'text-primary-black-400 bg-primary-black-700';
}

/**
 * ContestCard - Displays a public contest with its details
 */
export default function ContestCard({ 
  contest, 
  isEntered = false,
  onJoin,
  disabled = false 
}) {
  const {
    id,
    name,
    description,
    week,
    max_entries,
    current_entries,
    scoring_type,
    win_condition,
    status,
    template
  } = contest;
  
  const totalEntries = max_entries > 0 ? max_entries : Math.max(current_entries + 1, 1);
  const spotsRemaining = max_entries ? max_entries - current_entries : null;
  const isFull = max_entries ? spotsRemaining <= 0 : false;
  const IconComponent = getIconComponent(template?.icon);
  const WinConditionIcon = getWinConditionIcon(win_condition);
  const difficulty = template?.difficulty || 'normal';
  
  // Determine card state
  const canJoin = !isEntered && !isFull && status === 'open' && !disabled;
  const isActionDisabled = !canJoin;
  
  const statusLabel = status === 'open' ? 'Pre-Game' : status === 'locked' ? 'Locked' : status === 'completed' ? 'Completed' : 'Unavailable';
  const shortWinLabel = win_condition === 'h2h' ? 'H2H' : win_condition === 'top_points' ? 'Top Score' : 'Median';
  
  return (
    <div
      className={`
        relative bg-primary-black-900 rounded-xl border border-primary-black-700 overflow-hidden transition-all duration-200
        ${isEntered ? 'border-primary-green-500/80 shadow-[0_15px_45px_rgba(5,142,59,0.25)]' : 'hover:border-primary-black-500'}
        ${canJoin ? 'cursor-pointer' : 'cursor-default'}
      `}
      onClick={() => canJoin && onJoin?.(contest)}
    >
      {/* Badge indicator */}
      {isEntered && (
        <div className="absolute right-3 top-3 bg-primary-black-900/60 border border-primary-green-500 rounded-full px-3 py-0.5 text-[10px] font-semibold text-primary-green-400 tracking-wider">
          ENTERED
        </div>
      )}

      <div className="px-4 py-3 space-y-2">
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-9 h-9 flex items-center justify-center rounded-2xl ${isEntered ? 'bg-primary-green-500/10' : 'bg-primary-black-800/70'}`}>
              <IconComponent className={`w-4 h-4 ${isEntered ? 'text-primary-green-400' : 'text-primary-black-300'}`} />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-semibold text-white truncate">{name}</p>
              {description && <p className="text-[10px] text-primary-black-400/80 line-clamp-2">{description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-white/70">
            <Users className="w-4 h-4" />
            <span className="font-semibold">
              {current_entries}/{max_entries || '∞'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-semibold uppercase tracking-wide">
            {statusLabel}
          </div>
          <div className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide ${getWinConditionColor(win_condition)}`}>
            <WinConditionIcon className="w-3 h-3" />
            {shortWinLabel}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-[10px] items-center">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-black-800 text-primary-black-400">
              <Activity className="w-3 h-3" />
              {formatScoringType(scoring_type)}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-black-800 text-primary-black-400">
              <Calendar className="w-3 h-3" />
              Week {week}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${getDifficultyBadgeStyles(difficulty)}`}>
              {difficulty}
            </span>
          </div>
          <div className="flex-shrink-0">
            {isEntered ? (
              <div className="px-2 py-1 rounded-full border border-primary-green-500/30 bg-primary-black-900 text-[11px] font-semibold text-primary-green-400 uppercase tracking-wide">
                You're In
              </div>
            ) : isFull ? (
              <div className="px-2 py-1 rounded-full bg-primary-black-800 text-[11px] font-semibold text-primary-black-400 uppercase tracking-wide">
                Full
              </div>
            ) : status !== 'open' ? (
              <div className="px-2 py-1 rounded-full bg-primary-black-800 text-[11px] font-semibold text-primary-black-400 uppercase tracking-wide">
                {status === 'locked' ? 'Locked' : 'Completed'}
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJoin?.(contest);
                }}
                disabled={isActionDisabled}
                className={`px-4 py-1.5 rounded-full text-[11px] font-semibold text-primary-black-950 transition-colors ${isActionDisabled ? 'bg-primary-black-700 text-primary-black-500' : 'bg-primary-green-500 hover:bg-primary-green-400'}`}
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
    scoring_type: PropTypes.string.isRequired,
    win_condition: PropTypes.oneOf(['median', 'h2h', 'top_points']),
    elimination_type: PropTypes.string.isRequired,
    max_losses: PropTypes.number,
    status: PropTypes.string.isRequired,
    template: PropTypes.shape({
      icon: PropTypes.string,
      difficulty: PropTypes.string
    })
  }).isRequired,
  isEntered: PropTypes.bool,
  onJoin: PropTypes.func,
  disabled: PropTypes.bool
};
