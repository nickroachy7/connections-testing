import PropTypes from 'prop-types';
import { Trophy, Users, Zap, Target, Activity, Crown, Shield, Swords, TrendingUp, Calendar } from 'lucide-react';
import { formatScoringType, formatWinCondition, getDifficultyBadgeStyles } from '../services/contestService';

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
  
  const spotsRemaining = max_entries - current_entries;
  const isFull = spotsRemaining <= 0;
  const IconComponent = getIconComponent(template?.icon);
  const WinConditionIcon = getWinConditionIcon(win_condition);
  const winConditionInfo = formatWinCondition(win_condition);
  const difficulty = template?.difficulty || 'normal';
  
  // Determine card state
  const canJoin = !isEntered && !isFull && status === 'open' && !disabled;
  
  return (
    <div 
      className={`
        relative bg-primary-black-800 rounded-xl border transition-all duration-200
        ${isEntered 
          ? 'border-primary-green-500 shadow-lg shadow-primary-green-500/10' 
          : 'border-primary-black-700 hover:border-primary-black-600'
        }
        ${canJoin ? 'cursor-pointer hover:shadow-lg' : ''}
      `}
      onClick={() => canJoin && onJoin?.(contest)}
    >
      {/* Entered Badge */}
      {isEntered && (
        <div className="absolute -top-2 -right-2 bg-primary-green-500 text-primary-black-950 text-xs font-bold px-2 py-1 rounded-full">
          ENTERED
        </div>
      )}
      
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          {/* Icon */}
          <div className={`
            w-12 h-12 rounded-lg flex items-center justify-center
            ${isEntered 
              ? 'bg-primary-green-500/20' 
              : 'bg-primary-black-700'
            }
          `}>
            <IconComponent className={`w-6 h-6 ${isEntered ? 'text-primary-green-500' : 'text-primary-black-300'}`} />
          </div>
          
          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white truncate">{name}</h3>
            <p className="text-sm text-primary-black-400 line-clamp-2">{description}</p>
          </div>
        </div>
        
        {/* Stats Row */}
        <div className="flex items-center gap-3 mb-4">
          {/* Spots */}
          <div className={`
            flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium
            ${isFull 
              ? 'bg-red-500/20 text-red-400' 
              : spotsRemaining <= 2 
                ? 'bg-orange-500/20 text-orange-400'
                : 'bg-primary-black-700 text-white'
            }
          `}>
            <Users className="w-4 h-4" />
            <span>{current_entries}/{max_entries}</span>
          </div>
          
          {/* Difficulty */}
          <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase border ${getDifficultyBadgeStyles(difficulty)}`}>
            {difficulty}
          </div>
        </div>
        
        {/* Format Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Win Condition - PROMINENT */}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold ${getWinConditionColor(win_condition)}`}>
            <WinConditionIcon className="w-3.5 h-3.5" />
            {winConditionInfo.label}
          </span>
          
          {/* Scoring Type */}
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-black-700 rounded text-xs text-primary-black-300">
            <Activity className="w-3 h-3" />
            {formatScoringType(scoring_type)}
          </span>
          
          {/* Week */}
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-black-700 rounded text-xs text-primary-black-300">
            <Calendar className="w-3 h-3" />
            Week {week}
          </span>
        </div>
        
        {/* Action Button */}
        {isEntered ? (
          <div className="w-full py-2.5 bg-primary-green-500/10 border border-primary-green-500/30 rounded-lg text-center text-primary-green-500 font-semibold text-sm">
            ✓ You're In This Contest
          </div>
        ) : isFull ? (
          <div className="w-full py-2.5 bg-primary-black-700 rounded-lg text-center text-primary-black-400 font-medium text-sm">
            Contest Full
          </div>
        ) : status !== 'open' ? (
          <div className="w-full py-2.5 bg-primary-black-700 rounded-lg text-center text-primary-black-400 font-medium text-sm">
            {status === 'locked' ? 'Entries Locked' : status === 'completed' ? 'Completed' : 'Unavailable'}
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onJoin?.(contest);
            }}
            disabled={disabled}
            className="w-full py-2.5 bg-primary-green-500 hover:bg-primary-green-400 disabled:bg-primary-black-700 disabled:text-primary-black-400 rounded-lg text-center text-primary-black-950 font-bold text-sm transition-colors"
          >
            Join Contest
          </button>
        )}
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
