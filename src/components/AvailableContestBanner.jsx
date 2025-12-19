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
    scoring_type = 'half_ppr',
    coin_reward = 50,
    entry_cost = 1,
    status
  } = contest;
  
  // Use scoring_type if scoring_format not available
  const effectiveScoringFormat = scoring_format || scoring_type?.replace('_', '') || 'half_ppr';

  const contestConfig = getContestTypeConfig(win_condition);
  const scoringConfig = getScoringFormatConfig(effectiveScoringFormat);
  const ContestIcon = contestConfig.icon;

  const spotsRemaining = max_entries ? max_entries - current_entries : null;
  const isFull = max_entries ? spotsRemaining <= 0 : false;
  const canJoin = !isFull && status === 'open' && !disabled;

  // Generate description if not provided
  const displayDescription = description || `${scoringConfig.label} scoring. ${contestConfig.winText}!`;

  return (
    <div className="bg-primary-black-900 rounded-xl overflow-hidden">
      {/* ========================================
          ROW 1: Header - Icon, Name, Count
          ======================================== */}
      <div className="px-3 py-2.5 border-b border-primary-black-800">
        <div className="flex items-center justify-between">
          {/* Left: Icon + Name */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Contest Type Icon - Subtle */}
            <div className="flex-shrink-0 bg-primary-black-800 rounded-lg p-1.5">
              <ContestIcon className="w-4 h-4 text-white/60" />
            </div>
            
            {/* Name + Description */}
            <div className="min-w-0 flex-1">
              <span className="text-sm font-bold text-white truncate block">{name}</span>
              <p className="text-[10px] text-white/40 truncate mt-0.5">
                {displayDescription}
              </p>
            </div>
          </div>

          {/* Right: Participant Count */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-2 bg-primary-black-800 rounded px-2 py-1">
            <Users className="w-3 h-3 text-white/40" />
            <span className="text-xs text-white/60 font-medium">
              {spotsRemaining !== null ? `${spotsRemaining} left` : current_entries}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================
          ROW 2: Contest Details - Win Condition, Scoring, Field Size
          ======================================== */}
      <div className="px-3 py-2 border-b border-primary-black-800">
        <div className="flex items-center justify-between text-[11px]">
          {/* Win Condition */}
          <div className="flex items-center gap-1.5">
            <span className="text-white/30 uppercase tracking-wide">Win:</span>
            <span className="font-medium text-white/70">
              {contestConfig.label}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-3 bg-primary-black-700" />

          {/* Scoring Format */}
          <div className="flex items-center gap-1.5">
            <span className="text-white/30 uppercase tracking-wide">Scoring:</span>
            <span className="font-medium text-white/70">
              {scoringConfig.shortLabel}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-3 bg-primary-black-700" />

          {/* Field Size */}
          <div className="flex items-center gap-1.5">
            <span className="text-white/30 uppercase tracking-wide">Field:</span>
            <span className="font-medium text-white/70">
              {max_entries || '∞'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================
          ROW 3: Stakes - Risk | Reward | Join Button
          ======================================== */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between">
          {/* Left: Risk & Reward - Compact */}
          <div className="flex items-center gap-3">
            {/* Risk */}
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-red-500 fill-red-500" />
              <span className="text-xs font-medium text-white/60">{entry_cost}</span>
            </div>

            {/* Reward - Only coins get color */}
            <div className="flex items-center gap-1">
              <Coins className="w-3 h-3 text-yellow-500" />
              <span className="text-xs font-medium text-yellow-500">{coin_reward}</span>
            </div>
          </div>

          {/* Right: Join Button */}
          <div className="flex-shrink-0">
            {isFull ? (
              <div className="px-4 py-1.5 rounded-lg bg-primary-black-800 text-[11px] font-medium text-white/40 uppercase">
                Full
              </div>
            ) : status !== 'open' ? (
              <div className="px-4 py-1.5 rounded-lg bg-primary-black-800 text-[11px] font-medium text-white/40 uppercase">
                {status === 'locked' ? 'Locked' : 'Closed'}
              </div>
            ) : disabled ? (
              <div className="px-4 py-1.5 rounded-lg bg-primary-black-800 text-[11px] font-medium text-white/40 uppercase">
                Join
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJoin?.(contest);
                }}
                className="px-5 py-1.5 rounded-lg bg-primary-green-500 hover:bg-primary-green-400 text-[11px] font-bold text-primary-black-950 uppercase transition-colors"
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
    scoring_type: PropTypes.oneOf(['standard', 'half_ppr', 'full_ppr']),
    coin_reward: PropTypes.number,
    entry_cost: PropTypes.number,
    status: PropTypes.string.isRequired
  }).isRequired,
  onJoin: PropTypes.func,
  disabled: PropTypes.bool
};
