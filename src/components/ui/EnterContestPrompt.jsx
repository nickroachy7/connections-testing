import PropTypes from 'prop-types';
import { ChevronRight, Trophy, Zap } from 'lucide-react';

/**
 * EnterContestPrompt
 * 
 * Displayed when a team is not entered in any contest.
 * Encourages users to join weekly public contests instead of showing
 * a meaningless "vs median" view.
 * 
 * Design: Matches app's dark theme with a call-to-action feel.
 */
export default function EnterContestPrompt({ 
  week, 
  onEnterClick,
  size = 'mobile' 
}) {
  const isMobile = size === 'mobile';
  
  return (
    <div 
      onClick={onEnterClick}
      className={`
        bg-primary-black-900 rounded-xl overflow-hidden 
        cursor-pointer hover:bg-primary-black-800 active:bg-primary-black-800 
        transition-all border border-primary-black-700
        ${isMobile ? '' : 'max-w-md'}
      `}
    >
      {/* Main content area */}
      <div className={`flex items-center gap-3 ${isMobile ? 'px-4 py-4' : 'px-5 py-5'}`}>
        {/* Icon */}
        <div className={`
          rounded-xl bg-primary-green-500/20 flex items-center justify-center flex-shrink-0
          ${isMobile ? 'w-12 h-12' : 'w-14 h-14'}
        `}>
          <Trophy className={`text-primary-green-400 ${isMobile ? 'w-6 h-6' : 'w-7 h-7'}`} />
        </div>
        
        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-white ${isMobile ? 'text-base' : 'text-lg'}`}>
            Enter Week {week} Contests
          </div>
          <div className={`text-primary-black-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            Compete for coins and climb the leaderboard
          </div>
        </div>
        
        {/* Arrow */}
        <ChevronRight className={`text-primary-black-500 flex-shrink-0 ${isMobile ? 'w-5 h-5' : 'w-6 h-6'}`} />
      </div>
      
      {/* Bottom accent bar */}
      <div className="h-1 bg-gradient-to-r from-primary-green-600 via-primary-green-500 to-primary-green-600" />
    </div>
  );
}

EnterContestPrompt.propTypes = {
  week: PropTypes.number,
  onEnterClick: PropTypes.func,
  size: PropTypes.oneOf(['mobile', 'desktop'])
};
