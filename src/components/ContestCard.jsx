import PropTypes from 'prop-types';
import { Trophy, Users, Swords, Target, Activity, TrendingUp, Calendar } from 'lucide-react';
import { formatScoringType } from '../services/contestService';

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
 * Matches TeamScoreBanner design pattern
 */
export default function ContestCard({ 
  contest, 
  isEntered = false,
  onJoin,
  disabled = false 
}) {
  const {
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
  
  const spotsRemaining = max_entries ? max_entries - current_entries : null;
  const isFull = max_entries ? spotsRemaining <= 0 : false;
  const difficulty = template?.difficulty || 'normal';
  const winConfig = getWinConditionConfig(win_condition);
  const WinConditionIcon = winConfig.icon;
  
  // Determine card state
  const canJoin = !isEntered && !isFull && status === 'open' && !disabled;
  const statusLabel = status === 'open' ? 'Pre-Game' : status === 'locked' ? 'Locked' : status === 'completed' ? 'Completed' : 'Unavailable';
  
  return (
    <div
      className={`
        bg-primary-black-900 rounded-xl overflow-hidden transition-all duration-200
        ${isEntered ? 'ring-1 ring-primary-green-500/60' : 'hover:bg-primary-black-800'}
        ${canJoin ? 'cursor-pointer active:bg-primary-black-800' : 'cursor-default'}
      `}
      onClick={() => canJoin && onJoin?.(contest)}
    >
      {/* Header Bar - Contest Name + Win Type + Entrants (matches TeamScoreBanner) */}
      <div className="border-b border-primary-black-700/50 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Trophy className={`w-4 h-4 flex-shrink-0 ${isEntered ? 'text-primary-green-400' : 'text-primary-green-400'}`} />
            <span className="text-sm font-bold text-white truncate">{name}</span>
            <span className="text-[11px] text-white/50 whitespace-nowrap">
              — {winConfig.shortLabel} Wins
            </span>
          </div>
          {/* Entrant Count - Right side */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <Users className="w-3.5 h-3.5 text-white/50" />
            <span className="text-[11px] text-white/60 font-medium">
              {current_entries}/{max_entries || '∞'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Description row (if present) */}
      {description && (
        <div className="px-4 pt-3">
          <p className="text-[11px] text-primary-black-400 line-clamp-2">{description}</p>
        </div>
      )}
      
      {/* Main Content Row - Status badges + metadata + action */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Status & Win Condition badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Badge */}
            <div className="bg-amber-500/20 text-amber-400 font-bold uppercase rounded text-[10px] px-2 py-0.5 whitespace-nowrap">
              {statusLabel}
            </div>
            
            {/* Win Condition Badge */}
            <div className={`inline-flex items-center gap-1 ${winConfig.bgColor} ${winConfig.color} font-bold uppercase rounded text-[10px] px-2 py-0.5 whitespace-nowrap`}>
              <WinConditionIcon className="w-3.5 h-3.5" />
              {winConfig.shortLabel}
            </div>
          </div>
          
          {/* Right: Action button */}
          <div className="flex-shrink-0">
            {isEntered ? (
              <div className="px-4 py-1.5 rounded-full border border-primary-green-500/30 bg-primary-black-900 text-[11px] font-semibold text-primary-green-400 uppercase tracking-wide">
                Entered
              </div>
            ) : isFull ? (
              <div className="px-4 py-1.5 rounded bg-primary-black-800 text-[11px] font-semibold text-primary-black-500 uppercase">
                Full
              </div>
            ) : status !== 'open' ? (
              <div className="px-4 py-1.5 rounded bg-primary-black-800 text-[11px] font-semibold text-primary-black-500 uppercase">
                {status === 'locked' ? 'Locked' : 'Done'}
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJoin?.(contest);
                }}
                className="px-5 py-1.5 rounded-full bg-primary-green-500 hover:bg-primary-green-400 text-[11px] font-bold text-primary-black-950 uppercase transition-colors"
              >
                Join
              </button>
            )}
          </div>
        </div>
        
        {/* Bottom row: Metadata */}
        <div className="flex items-center gap-3 mt-3">
          <span className="inline-flex items-center gap-1 text-[10px] text-primary-black-400">
            <Activity className="w-3.5 h-3.5" />
            {formatScoringType(scoring_type)}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-primary-black-400">
            <Calendar className="w-3.5 h-3.5" />
            Week {week}
          </span>
          <span className={`text-[10px] font-semibold uppercase ${
            difficulty === 'easy' ? 'text-green-400' : 
            difficulty === 'normal' ? 'text-primary-green-400' :
            difficulty === 'hard' ? 'text-orange-400' : 
            'text-red-400'
          }`}>
            {difficulty}
          </span>
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
