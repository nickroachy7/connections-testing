import PropTypes from 'prop-types';

/**
 * TeamScoreBanner - Compact week status and score display
 * 
 * Shows current week, status badge, user score, win percentage,
 * progress bar, and comparison target (median or opponent).
 * 
 * Adapts to contest type:
 * - median: Shows "vs {median_score}"
 * - h2h: Shows "vs {opponent_name}" (future)
 * - both: Shows both
 * 
 * Used by:
 * - TeamMatchupBanner (main page banner)
 * - TeamMenuCard (burger menu team list)
 */
export default function TeamScoreBanner({
  week,
  isLive,
  isFinal,
  userScore,
  medianScore,
  winPercentage,
  userPercentage,
  medianPercentage,
  isAboveMedian,
  size = 'mobile', // 'mobile' | 'desktop'
  winCondition = 'median', // 'median' | 'h2h' | 'both'
  opponentName = null,
  opponentScore = null,
  isInLeague = false,
  noDataYet = false, // True when no scores/projections available yet
  teamStartsNextWeek = null // Week number when team will start playing (for mid-week joins)
}) {
  const isMobile = size === 'mobile';
  
  // If team was created mid-week, show a special "Season starts" message
  if (teamStartsNextWeek) {
    return (
      <div className={`bg-black/20 backdrop-blur-sm rounded-lg border border-white/10 ${
        isMobile ? 'px-2.5 py-2' : 'px-4 py-3'
      }`}>
        <div className="flex flex-col items-center justify-center text-center">
          <div className={`flex items-center gap-2 ${isMobile ? 'mb-1' : 'mb-2'}`}>
            <span className={`font-dk-display font-black text-white ${
              isMobile ? 'text-xs' : 'text-base'
            }`}>
              Week {week || '—'}
            </span>
            <span className={`font-bold uppercase rounded bg-amber-500/20 text-amber-300 ${
              isMobile ? 'text-[8px] px-1.5 py-0.5' : 'text-[10px] px-2 py-1'
            }`}>
              Waiting
            </span>
          </div>
          <div className={`text-white/70 font-medium ${isMobile ? 'text-[10px]' : 'text-sm'}`}>
            🏈 Your season starts <span className="text-amber-400 font-bold">Week {teamStartsNextWeek}</span>
          </div>
          <div className={`text-white/40 ${isMobile ? 'text-[9px] mt-0.5' : 'text-xs mt-1'}`}>
            Build your lineup now to be ready!
          </div>
        </div>
      </div>
    );
  }
  
  // Determine what to show as the comparison
  const showMedian = winCondition === 'median' || winCondition === 'both';
  const showOpponent = (winCondition === 'h2h' || winCondition === 'both') && opponentName;
  
  // Format the comparison text
  const getComparisonText = () => {
    if (noDataYet) {
      return 'vs --';
    }
    if (showOpponent) {
      return `vs ${opponentScore?.toFixed(1) || '--'}`;
    }
    return `vs ${medianScore.toFixed(1)}`;
  };
  
  // Label for the comparison (shown on desktop)
  const getComparisonLabel = () => {
    if (noDataYet) return 'No data yet';
    if (showOpponent) return opponentName;
    if (isInLeague) return 'League Median';
    return 'Median';
  };
  
  return (
    <div className={`bg-black/20 backdrop-blur-sm rounded-lg border border-white/10 ${
      isMobile ? 'px-2.5 py-1.5' : 'px-4 py-3'
    }`}>
      {/* Row 1: Week + Status Badge | Total Score */}
      <div className={`flex items-center justify-between ${
        isMobile ? 'mb-1.5' : 'mb-2'
      }`}>
        <div className={`flex items-center ${
          isMobile ? 'gap-1.5' : 'gap-2'
        }`}>
          <span className={`font-dk-display font-black text-white ${
            isMobile ? 'text-xs' : 'text-base'
          }`}>
            Week {week || '—'}
          </span>
          <span className={`font-bold uppercase rounded ${
            isMobile 
              ? 'text-[8px] px-1.5 py-0.5' 
              : 'text-[10px] px-2 py-1'
          } ${
            isFinal ? 'bg-blue-500/20 text-blue-300' :
            isLive ? 'bg-red-500/20 text-red-300' :
            'bg-white/10 text-white/70'
          }`}>
            {isFinal ? 'Final' : isLive ? 'Live' : 'Proj'}
          </span>
        </div>
        <div className={`font-black text-white leading-none ${
          isMobile ? 'text-lg' : 'text-3xl'
        }`}>
          {userScore.toFixed(1)}
        </div>
      </div>

      {/* Row 2: Win % | Progress Bar | vs Target */}
      <div className="flex items-center gap-2">
        {/* Win Percentage */}
        <span className={`text-white/60 font-medium whitespace-nowrap ${
          isMobile ? 'text-[9px]' : 'text-xs'
        }`}>
          {winPercentage}% WIN
        </span>
        
        {/* Progress Bar */}
        <div className={`relative bg-white/10 rounded-full overflow-hidden flex-1 ${
          isMobile ? 'h-1' : 'h-2.5'
        }`}>
          {/* Target marker (median or opponent score) */}
          {!noDataYet && (
            <div 
              className={`absolute top-0 bottom-0 w-0.5 z-10 ${
                showOpponent ? 'bg-purple-400' : 'bg-yellow-400'
              }`}
              style={{ left: `${medianPercentage}%` }}
            />
          )}
          {/* Score bar */}
          <div
            className={`absolute top-0 bottom-0 left-0 transition-all duration-500 rounded-full ${
              noDataYet ? 'bg-gradient-to-r from-gray-500 to-gray-400' :
              isAboveMedian 
                ? 'bg-gradient-to-r from-green-500 to-green-400'
                : 'bg-gradient-to-r from-red-500 to-red-400'
            }`}
            style={{ width: `${userPercentage}%` }}
          />
        </div>
        
        {/* Comparison Score */}
        <span className={`font-medium whitespace-nowrap ${
          isMobile ? 'text-[9px]' : 'text-xs'
        } ${
          noDataYet ? 'text-white/40' :
          showOpponent ? 'text-purple-400/90' : 'text-yellow-400/90'
        }`}>
          {getComparisonText()}
        </span>
      </div>
    </div>
  );
}

TeamScoreBanner.propTypes = {
  week: PropTypes.number,
  isLive: PropTypes.bool,
  isFinal: PropTypes.bool,
  userScore: PropTypes.number.isRequired,
  medianScore: PropTypes.number.isRequired,
  winPercentage: PropTypes.number.isRequired,
  userPercentage: PropTypes.number.isRequired,
  medianPercentage: PropTypes.number.isRequired,
  isAboveMedian: PropTypes.bool.isRequired,
  size: PropTypes.oneOf(['mobile', 'desktop']),
  winCondition: PropTypes.oneOf(['median', 'h2h', 'both']),
  opponentName: PropTypes.string,
  opponentScore: PropTypes.number,
  isInLeague: PropTypes.bool,
  noDataYet: PropTypes.bool,
  teamStartsNextWeek: PropTypes.number
};
