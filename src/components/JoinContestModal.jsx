import { useState } from 'react';
import PropTypes from 'prop-types';
import { X, Trophy, Users, Activity, AlertTriangle, CheckCircle, Target, Swords, TrendingUp } from 'lucide-react';
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
 * Get win condition warning message
 */
function getWinConditionWarning(winCondition) {
  const warnings = {
    'median': {
      title: 'Beat the Median:',
      description: 'Score at or above the contest median to win. Fall below and your team loses a life!'
    },
    'h2h': {
      title: 'Beat Your Opponent:',
      description: 'You\'ll be matched against another team. Outscore them to win, or your team loses a life!'
    },
    'top_points': {
      title: 'Be the Top Scorer:',
      description: 'Only the highest scoring team wins. Everyone else loses a life!'
    }
  };
  return warnings[winCondition] || warnings.median;
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
    template
  } = contest;
  
  const spotsRemaining = max_entries - current_entries;
  const difficulty = template?.difficulty || 'normal';
  const WinConditionIcon = getWinConditionIcon(win_condition);
  const winConditionInfo = formatWinCondition(win_condition);
  const warningInfo = getWinConditionWarning(win_condition);
  
  const handleJoin = async () => {
    setLoading(true);
    try {
      const result = await enterContest(contest.id, team.id);
      
      if (result.success) {
        success(`Successfully entered ${name}!`);
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-primary-black-900 rounded-xl border border-primary-black-700 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-primary-black-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-green-500/20 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary-green-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Join Contest</h2>
              <p className="text-sm text-primary-black-400">Confirm your entry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-primary-black-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-primary-black-400" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Contest Info */}
          <div className="bg-primary-black-800 rounded-lg p-4">
            <h3 className="text-xl font-bold text-white mb-2">{name}</h3>
            <p className="text-sm text-primary-black-400 mb-4">{description}</p>
            
            {/* Stats */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-black-700 rounded-lg text-sm text-white">
                <Users className="w-4 h-4 text-primary-black-400" />
                {spotsRemaining} spots left
              </span>
              
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase border ${getDifficultyBadgeStyles(difficulty)}`}>
                {difficulty}
              </span>
            </div>
          </div>
          
          {/* Contest Rules */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-primary-black-300 uppercase tracking-wide">Contest Details</h4>
            
            <div className="grid grid-cols-3 gap-3">
              {/* Win Condition - Most important */}
              <div className="bg-primary-black-800 rounded-lg p-3 col-span-3 border border-primary-green-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <WinConditionIcon className="w-4 h-4 text-primary-green-500" />
                  <span className="text-xs text-primary-black-400">Win Condition</span>
                </div>
                <span className="text-sm font-bold text-white">{winConditionInfo.label}</span>
                <p className="text-xs text-primary-black-400 mt-1">{winConditionInfo.description}</p>
              </div>
              
              <div className="bg-primary-black-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-primary-green-500" />
                  <span className="text-xs text-primary-black-400">Scoring</span>
                </div>
                <span className="text-sm font-medium text-white">{formatScoringType(scoring_type)}</span>
              </div>
              
              <div className="bg-primary-black-800 rounded-lg p-3 col-span-2">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-primary-green-500" />
                  <span className="text-xs text-primary-black-400">Field Size</span>
                </div>
                <span className="text-sm font-medium text-white">{max_entries} Teams</span>
              </div>
            </div>
          </div>
          
          {/* Team Entry */}
          <div className="bg-primary-black-800 rounded-lg p-4 border border-primary-black-700">
            <div className="flex items-center gap-3">
              {team.team_image_url ? (
                <img 
                  src={team.team_image_url} 
                  alt={team.team_name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-primary-black-700 rounded-lg flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-primary-black-500" />
                </div>
              )}
              <div className="flex-1">
                <div className="text-xs text-primary-black-400 mb-1">Entering with</div>
                <div className="text-white font-bold">{team.team_name}</div>
                <div className="text-xs text-primary-black-400">{team.wins}W - {team.losses}L</div>
              </div>
              <CheckCircle className="w-6 h-6 text-primary-green-500" />
            </div>
          </div>
          
          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-200">
              <strong>{warningInfo.title}</strong> {warningInfo.description}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-5 border-t border-primary-black-700 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 bg-primary-black-800 hover:bg-primary-black-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleJoin}
            disabled={loading}
            className="flex-1 py-3 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-black-950 border-t-transparent rounded-full animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4" />
                Confirm Entry
              </>
            )}
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
    elimination_type: PropTypes.string.isRequired,
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
