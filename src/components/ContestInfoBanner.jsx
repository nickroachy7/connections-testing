import PropTypes from 'prop-types';

/**
 * ContestInfoBanner Component
 * 
 * Displays contest type information and team progress
 */
export default function ContestInfoBanner({ team }) {
  if (!team || !team.contest_type) return null;
  
  const { contest_type, wins, losses, current_week } = team;
  const { display_name, total_weeks, max_losses, scoring_type } = contest_type;
  
  const weeksRemaining = total_weeks - (current_week || 1) + 1;
  const lossesRemaining = max_losses - (losses || 0);
  const isEliminated = losses >= max_losses;
  
  // Format PPR type for display
  const pprDisplay = scoring_type === 'standard' ? 'Standard' 
    : scoring_type === 'half_ppr' ? 'Half PPR'
    : 'Full PPR';
  
  return (
    <div className={`rounded-lg p-4 border ${
      isEliminated 
        ? 'bg-red-900/30 border-red-700/50' 
        : 'bg-primary-black-800 border-primary-black-700'
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Contest Type */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <div>
              <h3 className="text-primary-green-400 font-semibold text-sm">
                {display_name}
              </h3>
              <p className="text-primary-black-300 text-xs">
                {pprDisplay} Scoring
              </p>
            </div>
          </div>
        </div>
        
        {/* Progress Stats */}
        <div className="flex gap-6">
          {/* Record */}
          <div className="text-center">
            <div className="text-primary-black-400 text-xs uppercase tracking-wider mb-1">
              Record
            </div>
            <div className="text-primary-black-50 font-bold text-lg">
              {wins || 0}-{losses || 0}
            </div>
          </div>
          
          {/* Weeks Remaining */}
          <div className="text-center">
            <div className="text-primary-black-400 text-xs uppercase tracking-wider mb-1">
              Weeks Left
            </div>
            <div className="text-primary-black-50 font-bold text-lg">
              {weeksRemaining}/{total_weeks}
            </div>
          </div>
          
          {/* Losses Remaining */}
          <div className="text-center">
            <div className={`text-xs uppercase tracking-wider mb-1 ${
              isEliminated ? 'text-red-400' 
              : lossesRemaining <= 1 ? 'text-yellow-400'
              : 'text-primary-black-400'
            }`}>
              {isEliminated ? 'Eliminated' : 'Lives Left'}
            </div>
            <div className={`font-bold text-lg ${
              isEliminated ? 'text-red-400'
              : lossesRemaining <= 1 ? 'text-yellow-400'
              : 'text-primary-black-50'
            }`}>
              {isEliminated ? '❌' : `${lossesRemaining}/${max_losses}`}
            </div>
          </div>
        </div>
      </div>
      
      {/* Elimination Warning */}
      {isEliminated && (
        <div className="mt-3 pt-3 border-t border-red-700/30">
          <p className="text-red-300 text-sm text-center">
            ⚠️ This team has been eliminated from the contest
          </p>
        </div>
      )}
    </div>
  );
}

ContestInfoBanner.propTypes = {
  team: PropTypes.shape({
    wins: PropTypes.number,
    losses: PropTypes.number,
    current_week: PropTypes.number,
    contest_type: PropTypes.shape({
      display_name: PropTypes.string,
      total_weeks: PropTypes.number,
      max_losses: PropTypes.number,
      scoring_type: PropTypes.string
    })
  })
};
