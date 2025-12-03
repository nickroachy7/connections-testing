import PropTypes from 'prop-types';
import { Trophy, Target, Swords, TrendingUp, Users, ChevronRight, Clock, CheckCircle, Zap } from 'lucide-react';

/**
 * TeamScoreBanner - Week status and score display with contest integration
 * 
 * Displays clear, hierarchical information about:
 * 1. Contest/Week identification (name, week, type)
 * 2. Current status (upcoming, live, final)
 * 3. Performance metrics (score, rank, comparison)
 * 4. Action prompt (view contest)
 * 
 * Design principles:
 * - Upcoming: Focus on readiness, hide meaningless scores
 * - Live: Focus on current performance and position
 * - Final: Focus on results and outcome
 * 
 * Used by:
 * - TeamMatchupBanner (main page banner)
 * - TeamMenuCard (burger menu team list)
 */
export default function TeamScoreBanner({
  week,
  isLive,
  isFinal,
  isUpcoming = false,
  userScore,
  medianScore,
  winPercentage,
  userPercentage,
  medianPercentage,
  isAboveMedian,
  size = 'mobile',
  winCondition = 'median',
  opponentName = null,
  opponentScore = null,
  isInLeague = false,
  isInContest = false,
  contestName = null,
  contestEntrantCount = 0,
  contestMaxEntries = null,
  contestMedianScore = null,
  contestRank = null,
  contestWeek = null,
  noDataYet = false,
  teamStartsNextWeek = null,
  onContestClick = null,
  lineupReady = true,
  isBottomSection = false
}) {
  const isMobile = size === 'mobile';
  
  // Win condition styling and labels
  const getWinConditionConfig = () => {
    switch (winCondition) {
      case 'h2h':
        return {
          icon: Swords,
          label: 'Head-to-Head',
          shortLabel: 'H2H',
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/20',
          borderColor: 'border-orange-500/30'
        };
      case 'top_points':
        return {
          icon: TrendingUp,
          label: 'Top Score',
          shortLabel: 'Top Score',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/30'
        };
      case 'median':
      default:
        return {
          icon: Target,
          label: 'Beat Median',
          shortLabel: 'Median',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20',
          borderColor: 'border-blue-500/30'
        };
    }
  };
  
  const winConfig = getWinConditionConfig();
  const WinIcon = winConfig.icon;
  const displayWeek = contestWeek || week;
  
  // ============================================
  // TEAM WAITING STATE (No contest, starts next week)
  // ============================================
  if (teamStartsNextWeek && !isInContest) {
    return (
      <div className={`bg-primary-black-800 rounded-xl border border-primary-black-700 ${
        isMobile ? 'px-3 py-3' : 'px-5 py-4'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/20 rounded-lg p-2">
              <Clock className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-amber-400`} />
            </div>
            <div>
              <div className={`font-bold text-white ${isMobile ? 'text-sm' : 'text-base'}`}>
                Season Starts Week {teamStartsNextWeek}
              </div>
              <div className={`text-amber-400/80 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Week {week} is finalizing • Build your lineup now!
              </div>
            </div>
          </div>
          <div className={`bg-amber-500/20 text-amber-400 font-bold uppercase rounded-lg ${
            isMobile ? 'text-[10px] px-2 py-1' : 'text-xs px-3 py-1.5'
          }`}>
            Waiting
          </div>
        </div>
      </div>
    );
  }
  
  // ============================================
  // PUBLIC CONTEST DISPLAY
  // ============================================
  if (isInContest && contestName) {
    
    // Container classes - transparent when in bottom section, otherwise styled
    const containerClasses = isBottomSection 
      ? `${onContestClick ? 'cursor-pointer' : ''}`
      : `bg-gradient-to-br from-emerald-900/80 to-primary-black-900 rounded-xl border border-emerald-700/40 overflow-hidden ${
          onContestClick ? 'cursor-pointer hover:border-emerald-600/50 transition-all' : ''
        }`;
    
    // ----------------------------------------
    // UPCOMING CONTEST (Week hasn't started)
    // ----------------------------------------
    if (isUpcoming) {
      const projectedScore = userScore || 0;
      const hasLineup = lineupReady && projectedScore > 0;
      
      // For upcoming, we show projected comparison (no live data yet)
      const targetScore = contestMedianScore || medianScore || 0;
      const progressPercent = targetScore > 0 
        ? Math.min((projectedScore / (targetScore * 1.5)) * 100, 100) 
        : 50;
      
      return (
        <div 
          className={containerClasses}
          onClick={onContestClick}
        >
          {/* Header Bar - Contest Name + Win Type + Entrants */}
          <div className={`${isBottomSection ? 'border-b border-white/5' : 'bg-emerald-800/25 border-b border-emerald-700/25'} ${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${isBottomSection ? 'text-primary-green-400' : 'text-emerald-400'}`} />
                <span className={`font-bold text-white ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {contestName}
                </span>
                <span className={`text-white/40 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                  — {winConfig.shortLabel} Wins
                </span>
              </div>
              {/* Entrant Count - Right side */}
              <div className="flex items-center gap-1">
                <Users className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-white/40`} />
                <span className={`text-white/50 font-medium ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                  {contestEntrantCount}/{contestMaxEntries || '∞'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Main Score Row - Compact Horizontal Layout */}
          <div className={`${isMobile ? 'px-3 py-2' : 'px-4 py-2.5'}`}>
            <div className="flex items-center gap-2">
              {/* Status Badge - Left */}
              <div className={`bg-amber-500/20 text-amber-400 font-bold uppercase rounded ${
                isMobile ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'
              } whitespace-nowrap`}>
                Pre-Game
              </div>
              
              {/* Progress Bar - Center (flexible) */}
              <div className="flex-1 min-w-0">
                <div className="relative h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <div 
                    className={`absolute left-0 top-0 bottom-0 rounded-full transition-all duration-500 ${
                      hasLineup ? 'bg-gradient-to-r from-primary-green-600 to-primary-green-400' : 'bg-white/20'
                    }`}
                    style={{ width: hasLineup ? `${progressPercent}%` : '0%' }}
                  />
                  {/* Target marker */}
                  {hasLineup && targetScore > 0 && (
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-white/60"
                      style={{ left: '66.67%' }}
                    />
                  )}
                </div>
              </div>
              
              {/* Score Comparison - Right */}
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                {/* User's Score */}
                <div className="text-right">
                  <div className={`font-bold text-white ${isMobile ? 'text-sm' : 'text-base'} leading-none`}>
                    {hasLineup ? projectedScore.toFixed(1) : '—'}
                  </div>
                  <div className={`text-white/40 ${isMobile ? 'text-[7px]' : 'text-[8px]'} uppercase`}>
                    proj
                  </div>
                </div>
                
                {/* vs */}
                <span className={`text-white/30 ${isMobile ? 'text-[9px]' : 'text-[10px]'}`}>vs</span>
                
                {/* Target Score */}
                <div className="text-left">
                  <div className={`font-semibold text-white/60 ${isMobile ? 'text-xs' : 'text-sm'} leading-none`}>
                    {targetScore > 0 ? targetScore.toFixed(1) : '—'}
                  </div>
                  <div className={`text-white/40 ${isMobile ? 'text-[7px]' : 'text-[8px]'}`}>
                    {winCondition === 'h2h' ? 'opp' : 'med'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // ----------------------------------------
    // LIVE OR FINAL CONTEST
    // ----------------------------------------
    const comparisonValue = winCondition === 'h2h' ? opponentScore : (contestMedianScore ?? medianScore ?? 0);
    const isWinning = winCondition === 'top_points' 
      ? (contestRank === 1)
      : (userScore || 0) >= (comparisonValue || 0);
    
    // Status configuration
    const getStatusConfig = () => {
      if (isFinal) return { 
        text: 'Final', 
        color: 'text-blue-400', 
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30',
        gradientFrom: 'from-blue-950/20'
      };
      return { 
        text: 'Live', 
        color: 'text-red-400', 
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
        gradientFrom: 'from-red-950/20',
        pulse: true
      };
    };
    
    const statusConfig = getStatusConfig();
    
    // Calculate score differential
    const scoreDiff = (userScore || 0) - (comparisonValue || 0);
    const scoreDiffText = scoreDiff >= 0 ? `+${scoreDiff.toFixed(1)}` : scoreDiff.toFixed(1);
    
    // Rank display for top_points
    const getRankDisplay = () => {
      if (!contestRank) return '—';
      if (contestRank === 1) return '🥇 1st';
      if (contestRank === 2) return '🥈 2nd';
      if (contestRank === 3) return '🥉 3rd';
      return `#${contestRank}`;
    };
    
    // Progress bar calculation
    const maxScore = Math.max(userScore || 0, comparisonValue || 0, 1);
    const userProgress = ((userScore || 0) / maxScore) * 100;
    const targetProgress = ((comparisonValue || 0) / maxScore) * 100;
    
    // Get container styling based on status
    const getContainerConfig = () => {
      if (isFinal) return {
        bg: 'bg-gradient-to-br from-blue-900/80 to-primary-black-900',
        border: 'border-blue-700/40',
        hoverBorder: 'hover:border-blue-600/50',
        headerBg: 'bg-blue-800/25',
        headerBorder: 'border-blue-700/25',
        footerBg: 'bg-blue-900/30',
        footerBorder: 'border-blue-700/25',
        iconColor: 'text-blue-400'
      };
      return {
        bg: 'bg-gradient-to-br from-red-900/80 to-primary-black-900',
        border: 'border-red-700/40',
        hoverBorder: 'hover:border-red-600/50',
        headerBg: 'bg-red-800/25',
        headerBorder: 'border-red-700/25',
        footerBg: 'bg-red-900/30',
        footerBorder: 'border-red-700/25',
        iconColor: 'text-red-400'
      };
    };
    
    const containerConfig = getContainerConfig();
    
    // Use transparent styling when in bottom section
    const liveContainerClasses = isBottomSection
      ? `${onContestClick ? 'cursor-pointer' : ''}`
      : `${containerConfig.bg} rounded-xl border ${containerConfig.border} overflow-hidden ${
          onContestClick ? `cursor-pointer ${containerConfig.hoverBorder} transition-all` : ''
        }`;
    
    return (
      <div 
        className={liveContainerClasses}
        onClick={onContestClick}
      >
        {/* Header Bar - Contest Name + Win Type + Entrants */}
        <div className={`${isBottomSection ? 'border-b border-white/5' : `${containerConfig.headerBg} border-b ${containerConfig.headerBorder}`} ${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${isBottomSection ? 'text-primary-green-400' : containerConfig.iconColor}`} />
              <span className={`font-bold text-white ${isMobile ? 'text-xs' : 'text-sm'}`}>
                {contestName}
              </span>
              <span className={`text-white/40 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                — {winConfig.shortLabel} Wins
              </span>
            </div>
            {/* Entrant Count - Right side */}
            <div className="flex items-center gap-1">
              <Users className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-white/40`} />
              <span className={`text-white/50 font-medium ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                {contestEntrantCount}/{contestMaxEntries || '∞'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Main Score Row - Compact Horizontal Layout */}
        <div className={`${isMobile ? 'px-3 py-2' : 'px-4 py-2.5'}`}>
          <div className="flex items-center gap-2">
            {/* Status Badge - Left */}
            <div className={`flex items-center gap-1 ${statusConfig.bgColor} ${statusConfig.color} font-bold uppercase rounded ${
              isMobile ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'
            } whitespace-nowrap`}>
              {statusConfig.pulse && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                </span>
              )}
              {statusConfig.text}
            </div>
            
            {/* Progress Bar - Center (flexible) */}
            <div className="flex-1 min-w-0">
              <div className="relative h-1.5 bg-black/40 rounded-full overflow-hidden">
                {/* Target marker */}
                {winCondition !== 'top_points' && comparisonValue > 0 && (
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-10"
                    style={{ left: `${Math.min(targetProgress, 100)}%` }}
                  />
                )}
                {/* User progress */}
                <div 
                  className={`absolute left-0 top-0 bottom-0 rounded-full transition-all duration-500 ${
                    isWinning 
                      ? 'bg-gradient-to-r from-primary-green-600 to-primary-green-400' 
                      : 'bg-gradient-to-r from-amber-600 to-amber-400'
                  }`}
                  style={{ width: `${Math.min(userProgress, 100)}%` }}
                />
              </div>
            </div>
            
            {/* Score Comparison - Right */}
            {winCondition === 'top_points' ? (
              // Rank-based display
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <div className="text-right">
                  <div className={`font-bold ${isWinning ? 'text-primary-green-400' : 'text-white'} ${isMobile ? 'text-sm' : 'text-base'} leading-none`}>
                    {(userScore || 0).toFixed(1)}
                  </div>
                  <div className={`text-white/40 ${isMobile ? 'text-[7px]' : 'text-[8px]'} uppercase`}>
                    {isFinal ? 'final' : 'pts'}
                  </div>
                </div>
                <div className={`${winConfig.bgColor} ${winConfig.color} font-bold rounded ${
                  isMobile ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
                }`}>
                  {getRankDisplay()}
                </div>
              </div>
            ) : (
              // Score comparison display
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                {/* User's Score */}
                <div className="text-right">
                  <div className={`font-bold ${isWinning ? 'text-primary-green-400' : 'text-white'} ${isMobile ? 'text-sm' : 'text-base'} leading-none`}>
                    {(userScore || 0).toFixed(1)}
                  </div>
                  <div className={`${isWinning ? 'text-primary-green-400' : 'text-amber-400'} ${isMobile ? 'text-[7px]' : 'text-[8px]'} font-medium`}>
                    {scoreDiffText}
                  </div>
                </div>
                
                {/* vs */}
                <span className={`text-white/30 ${isMobile ? 'text-[9px]' : 'text-[10px]'}`}>vs</span>
                
                {/* Target Score */}
                <div className="text-left">
                  <div className={`font-semibold text-white/60 ${isMobile ? 'text-xs' : 'text-sm'} leading-none`}>
                    {(comparisonValue || 0).toFixed(1)}
                  </div>
                  <div className={`text-white/40 ${isMobile ? 'text-[7px]' : 'text-[8px]'}`}>
                    {winCondition === 'h2h' ? 'opp' : 'med'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // ============================================
  // STANDARD DISPLAY (League or no contest)
  // ============================================
  const showMedian = winCondition === 'median' || winCondition === 'both' || winCondition === 'top_points';
  const showOpponent = (winCondition === 'h2h' || winCondition === 'both') && opponentName;
  
  const getComparisonText = () => {
    if (noDataYet) return 'vs --';
    if (showOpponent) return `vs ${opponentScore?.toFixed(1) || '--'}`;
    if (winCondition === 'top_points') return `Goal: #1`;
    return `vs ${medianScore.toFixed(1)}`;
  };
  
  // Status badge config
  const getStandardStatusConfig = () => {
    if (isFinal) return { text: 'Final', bgColor: 'bg-blue-500/20', textColor: 'text-blue-300' };
    if (isLive) return { text: 'Live', bgColor: 'bg-red-500/20', textColor: 'text-red-300' };
    return { text: 'Proj', bgColor: 'bg-white/10', textColor: 'text-white/70' };
  };
  
  const stdStatus = getStandardStatusConfig();
  
  return (
    <div className={`bg-primary-black-800 rounded-xl border border-primary-black-700 ${
      isMobile ? 'px-3 py-2.5' : 'px-4 py-3'
    }`}>
      {/* Row 1: Week + Status Badge | Total Score */}
      <div className={`flex items-center justify-between ${isMobile ? 'mb-2' : 'mb-2.5'}`}>
        <div className="flex items-center gap-2">
          <span className={`font-bold text-white ${isMobile ? 'text-sm' : 'text-base'}`}>
            Week {week || '—'}
          </span>
          <span className={`font-bold uppercase rounded-lg ${stdStatus.bgColor} ${stdStatus.textColor} ${
            isMobile ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-1'
          }`}>
            {stdStatus.text}
          </span>
        </div>
        <div className={`font-black text-white leading-none ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
          {userScore.toFixed(1)}
        </div>
      </div>

      {/* Row 2: Win % | Progress Bar | vs Target */}
      <div className="flex items-center gap-3">
        <span className={`text-white/60 font-medium whitespace-nowrap ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
          {winPercentage}% WIN
        </span>
        
        <div className={`relative bg-white/10 rounded-full overflow-hidden flex-1 ${isMobile ? 'h-2' : 'h-2.5'}`}>
          {!noDataYet && (
            <div 
              className={`absolute top-0 bottom-0 w-0.5 z-10 ${showOpponent ? 'bg-purple-400' : 'bg-yellow-400'}`}
              style={{ left: `${medianPercentage}%` }}
            />
          )}
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
        
        <span className={`font-medium whitespace-nowrap ${isMobile ? 'text-[10px]' : 'text-xs'} ${
          noDataYet ? 'text-white/40' : showOpponent ? 'text-purple-400/90' : 'text-yellow-400/90'
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
  isUpcoming: PropTypes.bool,
  userScore: PropTypes.number.isRequired,
  medianScore: PropTypes.number.isRequired,
  winPercentage: PropTypes.number.isRequired,
  userPercentage: PropTypes.number.isRequired,
  medianPercentage: PropTypes.number.isRequired,
  isAboveMedian: PropTypes.bool.isRequired,
  size: PropTypes.oneOf(['mobile', 'desktop']),
  winCondition: PropTypes.oneOf(['median', 'h2h', 'top_points', 'both']),
  opponentName: PropTypes.string,
  opponentScore: PropTypes.number,
  isInLeague: PropTypes.bool,
  isInContest: PropTypes.bool,
  contestName: PropTypes.string,
  contestEntrantCount: PropTypes.number,
  contestMaxEntries: PropTypes.number,
  contestMedianScore: PropTypes.number,
  contestRank: PropTypes.number,
  contestWeek: PropTypes.number,
  noDataYet: PropTypes.bool,
  teamStartsNextWeek: PropTypes.number,
  onContestClick: PropTypes.func,
  lineupReady: PropTypes.bool,
  isBottomSection: PropTypes.bool
};
