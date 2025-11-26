import PropTypes from 'prop-types';

/**
 * TeamScoreBanner - Compact week status and score display
 * 
 * Shows current week, status badge, user score, win percentage,
 * progress bar, and median comparison in a compact 2-row layout.
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
  size = 'mobile' // 'mobile' | 'desktop'
}) {
  const isMobile = size === 'mobile';
  
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

      {/* Row 2: Win % | Progress Bar | vs Median */}
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
          {/* Median marker */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10" 
            style={{ left: `${medianPercentage}%` }}
          />
          {/* Score bar */}
          <div
            className={`absolute top-0 bottom-0 left-0 transition-all duration-500 rounded-full ${
              isAboveMedian 
                ? 'bg-gradient-to-r from-green-500 to-green-400'
                : 'bg-gradient-to-r from-red-500 to-red-400'
            }`}
            style={{ width: `${userPercentage}%` }}
          />
        </div>
        
        {/* Median Score */}
        <span className={`text-yellow-400/90 font-medium whitespace-nowrap ${
          isMobile ? 'text-[9px]' : 'text-xs'
        }`}>
          vs {medianScore.toFixed(1)}
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
  size: PropTypes.oneOf(['mobile', 'desktop'])
};
