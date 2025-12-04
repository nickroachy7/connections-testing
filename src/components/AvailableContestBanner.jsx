import PropTypes from 'prop-types';
import { Users, Heart, Coins } from 'lucide-react';
import { getContestTypeConfig, getScoringFormatConfig } from '../constants/contestTypes';

/**
 * AvailableContestBanner - Display an available contest that users can join
 * 
 * Three-row unified structure:
 * 1. Header: Contest icon + Name + Description + Participant count
 * 2. Details: Win Condition | Scoring Format | Field Size
 * 3. Stakes: Risk (heart) | Reward (coins) | Join Button
 */
export default function AvailableContestBanner({
  contest,
  onJoin,
  disabled = false
}) {
  const {
    id,
    name,
    description,
    max_entries,
    current_entries,
    win_condition = 'median',
    scoring_format = 'ppr',
    status
  } = contest;

  const contestConfig = getContestTypeConfig(win_condition);
  const scoringConfig = getScoringFormatConfig(scoring_format);
  const ContestIcon = contestConfig.icon;

  const spotsRemaining = max_entries ? max_entries - current_entries : null;
  const isFull = max_entries ? spotsRemaining <= 0 : false;
  const canJoin = !isFull && status === 'open' && !disabled;

  // Generate description if not provided
  const displayDescription = description || `${scoringConfig.label} scoring. ${contestConfig.winText}!`;

  return (
    <div className="bg-primary-black-900 rounded-xl overflow-hidden">
      {/* ========================================
          ROW 1: Header - Icon, Name, Description, Count
          ======================================== */}
      <div className="px-3 py-2.5 border-b border-primary-black-700/50">
        <div className="flex items-center justify-between">
          {/* Left: Icon + Name + Description */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Contest Type Icon - Colored */}
            <div className={`flex-shrink-0 ${contestConfig.bgColor} rounded-lg p-1.5`}>
              <ContestIcon className={`w-4 h-4 ${contestConfig.color}`} />
            </div>
            
            {/* Name + Description */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white truncate">{name}</span>
                <span className="text-[10px] text-white/40">•</span>
                <span className="text-[10px] text-white/50 truncate hidden sm:inline">
                  {displayDescription}
                </span>
              </div>
              {/* Mobile description - show on separate line */}
              <p className="text-[10px] text-white/50 truncate sm:hidden mt-0.5">
                {displayDescription}
              </p>
            </div>
          </div>

          {/* Right: Participant Count */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <Users className="w-3.5 h-3.5 text-white/50" />
            <span className="text-xs text-white/60 font-medium">
              {current_entries}/{max_entries || '∞'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================
          ROW 2: Contest Details - Win Condition, Scoring, Field Size
          ======================================== */}
      <div className="px-3 py-2 border-b border-primary-black-700/30">
        <div className="flex items-center justify-between text-[11px]">
          {/* Win Condition */}
          <div className="flex items-center gap-1.5">
            <span className="text-white/40 uppercase tracking-wide">Win:</span>
            <span className={`font-semibold ${contestConfig.color}`}>
              {contestConfig.label}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-3 bg-primary-black-700" />

          {/* Scoring Format */}
          <div className="flex items-center gap-1.5">
            <span className="text-white/40 uppercase tracking-wide">Scoring:</span>
            <span className="font-semibold text-white/80">
              {scoringConfig.shortLabel}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-3 bg-primary-black-700" />

          {/* Field Size */}
          <div className="flex items-center gap-1.5">
            <span className="text-white/40 uppercase tracking-wide">Field:</span>
            <span className="font-semibold text-white/80">
              {max_entries || '∞'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================
          ROW 3: Stakes - Risk | Reward | Join Button
          ======================================== */}
      <div className="px-3 py-2.5 bg-primary-black-800/50">
        <div className="flex items-center justify-between">
          {/* Left: Risk & Reward */}
          <div className="flex items-center gap-4">
            {/* Risk */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-white/40 uppercase tracking-wide">Risk:</span>
              <div className="flex items-center gap-0.5">
                <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
              </div>
            </div>

            {/* Reward */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-white/40 uppercase tracking-wide">Reward:</span>
              <div className="flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs font-semibold text-yellow-400">Coins</span>
              </div>
            </div>
          </div>

          {/* Right: Join Button */}
          <div className="flex-shrink-0">
            {isFull ? (
              <div className="px-4 py-1.5 rounded-full bg-primary-black-700 text-[11px] font-semibold text-primary-black-400 uppercase">
                Full
              </div>
            ) : status !== 'open' ? (
              <div className="px-4 py-1.5 rounded-full bg-primary-black-700 text-[11px] font-semibold text-primary-black-400 uppercase">
                {status === 'locked' ? 'Locked' : 'Closed'}
              </div>
            ) : disabled ? (
              <div className="px-4 py-1.5 rounded-full bg-primary-black-700 text-[11px] font-semibold text-primary-black-400 uppercase">
                Join
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
      </div>
    </div>
  );
}

AvailableContestBanner.propTypes = {
  contest: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    max_entries: PropTypes.number,
    current_entries: PropTypes.number,
    win_condition: PropTypes.oneOf(['median', 'h2h', 'top_points', 'survivor']),
    scoring_format: PropTypes.oneOf(['ppr', 'half_ppr', 'standard']),
    status: PropTypes.string.isRequired
  }).isRequired,
  onJoin: PropTypes.func,
  disabled: PropTypes.bool
};
