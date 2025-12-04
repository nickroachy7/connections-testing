import { useState, useEffect, memo } from 'react';
import PropTypes from 'prop-types';
import { Users, Heart, Coins, ChevronDown, Crown, Medal, Target } from 'lucide-react';
import { getContestTypeConfig, getScoringFormatConfig, getWeekStatusConfig } from '../constants/contestTypes';
import { supabase } from '../services/supabase';

/**
 * EnteredContestBanner - Display a contest the user has entered
 * 
 * Structure:
 * 1. Header: Contest icon + Name + Description + Participant count
 * 2. Details: Win Condition | Scoring Format | Field Size
 * 3. Scoring Section: Status badge, progress bar, scores (varies by contest type)
 * 4. Stakes: Risk (heart) | Reward (coins)
 * 5. Expandable: Standings panel (shown on click)
 */
function EnteredContestBanner({
  contest,
  entry,
  teamId,
  userScore = 0,
  projectedScore = 0,
  opponentScore = null,
  opponentName = null,
  medianScore = 0,
  rank = null,
  isLive = false,
  isFinal = false,
  isUpcoming = true,
  lineupReady = false,
  defaultExpanded = false,
  onClick
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [standings, setStandings] = useState([]);
  const [loadingStandings, setLoadingStandings] = useState(false);

  const {
    id,
    name,
    description,
    max_entries,
    current_entries,
    win_condition = 'median',
    scoring_format = 'ppr'
  } = contest;

  const contestConfig = getContestTypeConfig(win_condition);
  const scoringConfig = getScoringFormatConfig(scoring_format);
  const weekStatus = getWeekStatusConfig(isLive, isFinal, isUpcoming);
  const ContestIcon = contestConfig.icon;

  // Display score based on state
  const displayScore = isUpcoming ? projectedScore : userScore;
  const comparisonScore = win_condition === 'h2h' ? opponentScore : medianScore;
  
  // Determine win state
  const isWinning = win_condition === 'top_points' 
    ? rank === 1 
    : displayScore >= (comparisonScore || 0);

  // Progress bar calculation
  const maxScore = Math.max(displayScore || 0, comparisonScore || 0, 1);
  const userProgress = ((displayScore || 0) / maxScore) * 100;
  const targetProgress = ((comparisonScore || 0) / maxScore) * 100;

  // Generate description if not provided
  const displayDescription = description || `${scoringConfig.label} scoring. ${contestConfig.winText}!`;

  // Fetch standings when expanded
  useEffect(() => {
    if (!isExpanded || !contest?.id) return;
    
    const fetchStandings = async () => {
      setLoadingStandings(true);
      try {
        const { data: entries, error: entriesError } = await supabase
          .from('public_contest_entries')
          .select('id, team_id, final_score, entered_at')
          .eq('contest_id', contest.id);

        if (entriesError) throw entriesError;
        
        if (!entries || entries.length === 0) {
          setStandings([]);
          return;
        }
        
        const teamIds = entries.map(e => e.team_id);
        const { data: teams, error: teamsError } = await supabase
          .from('teams')
          .select('id, team_name, user_id')
          .in('id', teamIds);
          
        if (teamsError) console.error('Teams fetch error:', teamsError);
        
        const merged = entries.map(entry => ({
          ...entry,
          team: teams?.find(t => t.id === entry.team_id) || null
        }));
        
        const sorted = merged.sort((a, b) => {
          if (a.final_score != null && b.final_score != null) {
            return b.final_score - a.final_score;
          }
          if (a.final_score != null) return -1;
          if (b.final_score != null) return 1;
          return new Date(a.entered_at) - new Date(b.entered_at);
        });
        
        setStandings(sorted);
      } catch (err) {
        console.error('Error fetching standings:', err);
      } finally {
        setLoadingStandings(false);
      }
    };

    fetchStandings();
  }, [isExpanded, contest?.id]);

  const handleClick = () => {
    setIsExpanded(!isExpanded);
    onClick?.();
  };

  // Rank display helpers
  const getRankDisplay = (r) => {
    if (r === 1) return { icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    if (r === 2) return { icon: Medal, color: 'text-gray-300', bg: 'bg-gray-500/20' };
    if (r === 3) return { icon: Medal, color: 'text-amber-600', bg: 'bg-amber-600/20' };
    return { icon: null, color: 'text-primary-black-400', bg: 'bg-primary-black-700' };
  };

  const getRankText = (r) => {
    if (!r) return '—';
    if (r === 1) return '1st';
    if (r === 2) return '2nd';
    if (r === 3) return '3rd';
    return `#${r}`;
  };

  const myRank = standings.findIndex(s => s.team_id === teamId) + 1 || rank;

  return (
    <div className="rounded-xl overflow-hidden">
      {/* Main Banner - Clickable */}
      <div 
        onClick={handleClick}
        className={`bg-primary-black-900 cursor-pointer transition-all ${
          isExpanded ? 'rounded-t-xl' : 'rounded-xl'
        }`}
      >
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
                {/* Mobile description */}
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
            ROW 3: Scoring Section - Varies by Contest Type
            ======================================== */}
        <div className="px-3 py-2.5 border-b border-primary-black-700/30">
          <div className="flex items-center gap-2">
            {/* Status Badge */}
            <div className={`flex items-center gap-1 ${weekStatus.bgColor} ${weekStatus.color} font-bold uppercase rounded text-[9px] px-1.5 py-0.5 whitespace-nowrap`}>
              {weekStatus.pulse && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                </span>
              )}
              {weekStatus.label}
            </div>
            
            {/* Progress Bar */}
            <div className="flex-1 min-w-0">
              <div className="relative h-1.5 bg-black/40 rounded-full overflow-hidden">
                {/* Target marker (for median/h2h) */}
                {win_condition !== 'top_points' && comparisonScore > 0 && (
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-10"
                    style={{ left: `${Math.min(targetProgress, 100)}%` }}
                  />
                )}
                {/* User progress */}
                <div 
                  className={`absolute left-0 top-0 bottom-0 rounded-full transition-all duration-500 ${
                    lineupReady || !isUpcoming
                      ? isWinning 
                        ? 'bg-gradient-to-r from-primary-green-600 to-primary-green-400' 
                        : 'bg-gradient-to-r from-amber-600 to-amber-400'
                      : 'bg-white/20'
                  }`}
                  style={{ width: lineupReady || !isUpcoming ? `${Math.min(userProgress, 100)}%` : '0%' }}
                />
              </div>
            </div>
            
            {/* Score Display - Varies by type */}
            {win_condition === 'top_points' ? (
              // Top Score: Show score + rank
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <div className="text-right">
                  <div className={`font-bold ${isWinning ? 'text-primary-green-400' : 'text-white'} text-sm leading-none`}>
                    {displayScore > 0 ? displayScore.toFixed(1) : '—'}
                  </div>
                  <div className="text-white/40 text-[7px] uppercase">
                    {isUpcoming ? 'proj' : isFinal ? 'final' : 'pts'}
                  </div>
                </div>
                <div className={`${contestConfig.bgColor} ${contestConfig.color} font-bold rounded text-[10px] px-1.5 py-0.5`}>
                  {getRankText(myRank)}
                </div>
              </div>
            ) : (
              // Median/H2H: Show score comparison
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                {/* User Score */}
                <div className="text-right">
                  <div className={`font-bold ${isWinning ? 'text-primary-green-400' : 'text-white'} text-sm leading-none`}>
                    {displayScore > 0 ? displayScore.toFixed(1) : '—'}
                  </div>
                  <div className="text-white/40 text-[7px] uppercase">
                    {isUpcoming ? 'proj' : isFinal ? 'final' : 'pts'}
                  </div>
                </div>
                
                <span className="text-white/30 text-[9px]">vs</span>
                
                {/* Comparison Score */}
                <div className="text-left">
                  <div className="font-semibold text-white/60 text-xs leading-none">
                    {comparisonScore > 0 ? comparisonScore.toFixed(1) : '—'}
                  </div>
                  <div className="text-white/40 text-[7px]">
                    {win_condition === 'h2h' ? 'opp' : 'med'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================
            ROW 4: Stakes - Risk | Reward | Expand Indicator
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

            {/* Right: Expand Indicator */}
            <div className="flex items-center gap-1 text-white/40">
              <span className="text-[10px]">Standings</span>
              <ChevronDown 
                className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          EXPANDABLE: Standings Panel
          ======================================== */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-out ${
          isExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-primary-black-900 border-t border-primary-black-700/30 rounded-b-xl">
          {/* Standings Header */}
          <div className="px-3 py-2 flex items-center justify-between border-b border-primary-black-700/30">
            <span className="text-xs font-semibold text-white/80">Standings</span>
            <div className="flex items-center gap-2">
              {win_condition === 'median' && medianScore > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-blue-400/80">
                  <Target className="w-3 h-3" />
                  <span>Median: {medianScore.toFixed(1)}</span>
                </div>
              )}
              <span className="text-[10px] text-primary-black-500">
                {standings.length} entrant{standings.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Standings List */}
          <div className="max-h-[300px] overflow-y-auto">
            {loadingStandings ? (
              <div className="px-3 py-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 py-2 animate-pulse">
                    <div className="w-6 h-6 bg-primary-black-700 rounded-full" />
                    <div className="flex-1 h-4 bg-primary-black-700 rounded" />
                    <div className="w-12 h-4 bg-primary-black-700 rounded" />
                  </div>
                ))}
              </div>
            ) : standings.length === 0 ? (
              <div className="px-3 py-6 text-center text-primary-black-500 text-xs">
                No standings available yet
              </div>
            ) : (
              <div className="divide-y divide-primary-black-700/30">
                {standings.map((standing, index) => {
                  const standingRank = index + 1;
                  const rankConfig = getRankDisplay(standingRank);
                  const RankIcon = rankConfig.icon;
                  const isCurrentUser = standing.team_id === teamId;
                  const score = standing.final_score ?? 0;
                  const isAboveMedian = win_condition === 'median' && score >= medianScore;

                  return (
                    <div 
                      key={standing.id}
                      className={`flex items-center gap-3 px-3 py-2.5 ${
                        isCurrentUser ? 'bg-primary-green-500/10' : ''
                      }`}
                    >
                      {/* Rank */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${rankConfig.bg}`}>
                        {RankIcon ? (
                          <RankIcon className={`w-4 h-4 ${rankConfig.color}`} />
                        ) : (
                          <span className={`text-xs font-bold ${rankConfig.color}`}>
                            {standingRank}
                          </span>
                        )}
                      </div>

                      {/* Team Name */}
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium truncate ${
                          isCurrentUser ? 'text-primary-green-400' : 'text-white'
                        }`}>
                          {standing.team?.team_name || 'Unknown Team'}
                          {isCurrentUser && (
                            <span className="text-[10px] text-primary-green-400/60 ml-1">(You)</span>
                          )}
                        </span>
                      </div>

                      {/* Score */}
                      <div className="text-right">
                        <span className={`text-sm font-bold ${
                          win_condition === 'median' 
                            ? isAboveMedian ? 'text-primary-green-400' : 'text-amber-400'
                            : standingRank === 1 ? 'text-yellow-400' : 'text-white'
                        }`}>
                          {score > 0 ? score.toFixed(1) : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

EnteredContestBanner.propTypes = {
  contest: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    max_entries: PropTypes.number,
    current_entries: PropTypes.number,
    win_condition: PropTypes.oneOf(['median', 'h2h', 'top_points', 'survivor']),
    scoring_format: PropTypes.oneOf(['ppr', 'half_ppr', 'standard'])
  }).isRequired,
  entry: PropTypes.object,
  teamId: PropTypes.string,
  userScore: PropTypes.number,
  projectedScore: PropTypes.number,
  opponentScore: PropTypes.number,
  opponentName: PropTypes.string,
  medianScore: PropTypes.number,
  rank: PropTypes.number,
  isLive: PropTypes.bool,
  isFinal: PropTypes.bool,
  isUpcoming: PropTypes.bool,
  lineupReady: PropTypes.bool,
  defaultExpanded: PropTypes.bool,
  onClick: PropTypes.func
};

export default memo(EnteredContestBanner);
