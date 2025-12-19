import { useState } from 'react';
import PropTypes from 'prop-types';
import { X, Trophy, Users, Activity, Target, Swords, TrendingUp, Heart, Coins, ChevronRight } from 'lucide-react';
import { formatScoringType, formatWinCondition, getDifficultyBadgeStyles, enterContest } from '../services/contestService';
import { useToast } from '../contexts/ToastContext';

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
 * JoinContestModal - Confirmation modal for entering a public contest
 */
export default function JoinContestModal({ 
  contest, 
  team,
  onClose, 
  onSuccess 
}) {
  const [loading, setLoading] = useState(false);
  const { success, error: showError } = useToast();
  
  if (!contest || !team) return null;
  
  const {
    name,
    description,
    max_entries,
    current_entries,
    scoring_type,
    win_condition,
    coin_reward = 50,
    entry_cost = 1,
    template
  } = contest;
  
  const spotsRemaining = max_entries - current_entries;
  const difficulty = template?.difficulty || 'normal';
  const WinConditionIcon = getWinConditionIcon(win_condition);
  const winConditionInfo = formatWinCondition(win_condition);
  
  const handleJoin = async () => {
    setLoading(true);
    try {
      const result = await enterContest(contest.id, team.id);
      
      if (result.success) {
        // Show success message with remaining entries info
        let message = `Successfully entered ${name}!`;
        if (result.can_enter_more && result.lives_remaining > result.entries_this_week) {
          const remaining = result.lives_remaining - result.entries_this_week;
          message += ` You can enter ${remaining} more contest${remaining > 1 ? 's' : ''} this week.`;
        }
        success(message);
        onSuccess?.();
        onClose();
      } else {
        showError(result.error || 'Failed to enter contest');
      }
    } catch (err) {
      console.error('Error joining contest:', err);
      showError(err.message || 'Failed to enter contest');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div className="bg-primary-black-900 w-full sm:max-w-md sm:rounded-xl sm:m-4 rounded-t-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header - Contest Name & Quick Info */}
        <div className="p-4 border-b border-primary-black-700">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-white">{name}</h2>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${getDifficultyBadgeStyles(difficulty)}`}>
                  {difficulty}
                </span>
              </div>
              <p className="text-sm text-primary-black-400">{description}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-primary-black-800 rounded-lg transition-colors -mr-1"
            >
              <X className="w-5 h-5 text-primary-black-400" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick Stats Row */}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary-black-800 rounded-lg">
              <Users className="w-4 h-4 text-primary-black-400" />
              <span className="text-white font-medium">{spotsRemaining}/{max_entries}</span>
              <span className="text-primary-black-400">spots</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary-black-800 rounded-lg">
              <Activity className="w-4 h-4 text-primary-black-400" />
              <span className="text-white font-medium">{formatScoringType(scoring_type)}</span>
            </div>
          </div>

          {/* Win Condition - Featured */}
          <div className="bg-primary-black-800 rounded-xl p-4 border border-primary-green-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <WinConditionIcon className="w-5 h-5 text-primary-green-500" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-primary-green-500 uppercase tracking-wide font-semibold">How to Win</div>
                <div className="text-white font-bold">{winConditionInfo.label}</div>
                <p className="text-xs text-primary-black-400 mt-0.5">{winConditionInfo.description}</p>
              </div>
            </div>
          </div>

          {/* Stakes - Compact Risk/Reward */}
          <div className="bg-primary-black-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-primary-black-700">
              {/* Risk */}
              <div className="p-4 text-center">
                <div className="text-xs text-primary-black-400 uppercase tracking-wide mb-2">Entry Cost</div>
                <div className="flex items-center justify-center gap-2">
                  <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                  <span className="text-xl font-bold text-white">{entry_cost}</span>
                </div>
                <div className="text-xs text-red-400 mt-1">Life at risk</div>
              </div>
              
              {/* Reward */}
              <div className="p-4 text-center">
                <div className="text-xs text-primary-black-400 uppercase tracking-wide mb-2">Win Prize</div>
                <div className="flex items-center justify-center gap-2">
                  <Coins className="w-5 h-5 text-yellow-500" />
                  <span className="text-xl font-bold text-white">{coin_reward}</span>
                </div>
                <div className="text-xs text-primary-green-500 mt-1">Keep your life + coins</div>
              </div>
            </div>
          </div>

          {/* Team Selection */}
          <div className="bg-primary-black-800 rounded-xl p-3">
            <div className="flex items-center gap-3">
              {team.team_image_url ? (
                <img 
                  src={team.team_image_url} 
                  alt={team.team_name}
                  className="w-11 h-11 rounded-lg object-cover"
                />
              ) : (
                <div className="w-11 h-11 bg-primary-black-700 rounded-lg flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-primary-black-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-primary-black-400">Entering as</div>
                <div className="text-white font-bold truncate">{team.team_name}</div>
                <div className="text-xs text-primary-black-400">{team.wins}W - {team.losses}L</div>
              </div>
              <ChevronRight className="w-5 h-5 text-primary-green-500" />
            </div>
          </div>
        </div>
        
        {/* Footer - Action Buttons */}
        <div className="p-4 border-t border-primary-black-700 bg-primary-black-900">
          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full py-3.5 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-black-950 border-t-transparent rounded-full animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Trophy className="w-5 h-5" />
                Enter Contest
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full mt-2 py-2.5 text-primary-black-400 hover:text-white font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

JoinContestModal.propTypes = {
  contest: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    max_entries: PropTypes.number.isRequired,
    current_entries: PropTypes.number.isRequired,
    scoring_type: PropTypes.string.isRequired,
    win_condition: PropTypes.oneOf(['median', 'h2h', 'top_points']),
    coin_reward: PropTypes.number,
    entry_cost: PropTypes.number,
    elimination_type: PropTypes.string,
    max_losses: PropTypes.number,
    template: PropTypes.shape({
      icon: PropTypes.string,
      difficulty: PropTypes.string
    })
  }),
  team: PropTypes.shape({
    id: PropTypes.string.isRequired,
    team_name: PropTypes.string.isRequired,
    team_image_url: PropTypes.string,
    wins: PropTypes.number,
    losses: PropTypes.number
  }),
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func
};
