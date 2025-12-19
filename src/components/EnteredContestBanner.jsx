import { useState, useEffect, memo } from 'react';
import PropTypes from 'prop-types';
import { Users, Heart, Coins, ChevronDown, Target } from 'lucide-react';
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
  
  // Live score state - fetched from weekly_lineups
  const [liveUserScore, setLiveUserScore] = useState(null);
  const [liveOpponentScore, setLiveOpponentScore] = useState(null);

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
    entry_cost = 1
  } = contest;

  const contestConfig = getContestTypeConfig(win_condition);
  // Use scoring_type if scoring_format not available
  const effectiveScoringFormat = scoring_format || scoring_type?.replace('_', '') || 'half_ppr';
  const scoringConfig = getScoringFormatConfig(effectiveScoringFormat);
  const weekStatus = getWeekStatusConfig(isLive, isFinal, isUpcoming);
  const ContestIcon = contestConfig.icon;

  // Fetch live scores on mount (for live contests)
  useEffect(() => {
    if (!contest?.id || !teamId || isUpcoming) return;
    
    const fetchLiveScores = async () => {
      try {
        // Get our entry's h2h_opponent_id if it's H2H
        const { data: myEntry } = await supabase
          .from('public_contest_entries')
          .select('h2h_opponent_id')
          .eq('contest_id', contest.id)
          .eq('team_id', teamId)
          .single();
        
        const opponentId = myEntry?.h2h_opponent_id;
        const teamIds = opponentId ? [teamId, opponentId] : [teamId];
        
        // Fetch live scores from weekly_lineups
        if (contest.week && contest.season) {
          const { data: lineups } = await supabase
            .from('weekly_lineups')
            .select('team_id, total_points')
            .in('team_id', teamIds)
            .eq('week_number', contest.week)
            .eq('season_year', contest.season);
          
          const myLineup = lineups?.find(l => l.team_id === teamId);
          const oppLineup = lineups?.find(l => l.team_id === opponentId);
          
          setLiveUserScore(myLineup?.total_points ?? 0);
          
          // For H2H, always set opponent score (0 if no lineup)
          if (opponentId) {
            setLiveOpponentScore(oppLineup?.total_points ?? 0);
          }
        } else {
          // No week/season data, set to 0
          setLiveUserScore(0);
          if (opponentId) {
            setLiveOpponentScore(0);
          }
        }
      } catch (err) {
        console.error('Error fetching live scores:', err);
        // On error, set scores to 0 rather than leaving as null
        setLiveUserScore(0);
      }
    };
    
    fetchLiveScores();
  }, [contest?.id, contest?.week, contest?.season, teamId, isUpcoming]);

  // Display score based on state - prefer live scores when available
  // For live contests, default to 0 if score not yet loaded
  const displayScore = isUpcoming 
    ? projectedScore 
    : (liveUserScore !== null ? liveUserScore : (userScore || 0));
  
  // For H2H in live mode, default to 0 if opponent score not available
  const comparisonScore = win_condition === 'h2h' 
    ? (liveOpponentScore !== null ? liveOpponentScore : (opponentScore ?? (isLive ? 0 : null)))
    : (medianScore ?? (isLive ? 0 : null));
  
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
        // Get contest entries
        const { data: entries, error: entriesError } = await supabase
          .from('public_contest_entries')
          .select('id, team_id, final_score, entered_at, h2h_opponent_id')
          .eq('contest_id', contest.id);

        if (entriesError) throw entriesError;
        
        if (!entries || entries.length === 0) {
          setStandings([]);
          return;
        }
        
        const teamIds = entries.map(e => e.team_id);
        
        // Fetch teams
        const { data: teams, error: teamsError } = await supabase
          .from('teams')
          .select('id, team_name, user_id')
          .in('id', teamIds);
          
        if (teamsError) console.error('Teams fetch error:', teamsError);
        
        // Fetch live scores from weekly_lineups if contest is live/in_progress
        let liveScores = {};
        if (contest.week && contest.season) {
          const { data: lineups, error: lineupsError } = await supabase
            .from('weekly_lineups')
            .select('team_id, total_points')
            .in('team_id', teamIds)
            .eq('week_number', contest.week)
            .eq('season_year', contest.season);
          
          if (!lineupsError && lineups) {
            liveScores = lineups.reduce((acc, l) => {
              acc[l.team_id] = l.total_points || 0;
              return acc;
            }, {});
          }
        }
        
        // Merge data - use final_score if available, else live score
        const merged = entries.map(entry => ({
          ...entry,
          team: teams?.find(t => t.id === entry.team_id) || null,
          display_score: entry.final_score ?? liveScores[entry.team_id] ?? 0
        }));
        
        // Sort by score
        const sorted = merged.sort((a, b) => {
          return (b.display_score || 0) - (a.display_score || 0);
        });
        
        setStandings(sorted);
      } catch (err) {
        console.error('Error fetching standings:', err);
      } finally {
        setLoadingStandings(false);
      }
    };

    fetchStandings();
  }, [isExpanded, contest?.id, contest?.week, contest?.season]);

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
                {current_entries}/{max_entries || '∞'}
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
            ROW 3: Scoring Section - Compact
            ======================================== */}
        <div className="px-3 py-2.5 border-b border-primary-black-800">
          <div className="flex items-center gap-3">
            {/* Status Badge - Minimal */}
            <div className={`flex items-center gap-1.5 font-semibold uppercase rounded text-[10px] px-2 py-1 whitespace-nowrap ${
              weekStatus.pulse 
                ? 'bg-red-500/10 text-red-400' 
                : 'bg-primary-black-800 text-white/50'
            }`}>
              {weekStatus.pulse && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                </span>
              )}
              {weekStatus.label}
            </div>
            
            {/* Progress Bar - Subtle */}
            <div className="flex-1 min-w-0">
              <div className="relative h-1 bg-primary-black-800 rounded-full overflow-hidden">
                {/* Target marker (for median/h2h) */}
                {win_condition !== 'top_points' && comparisonScore > 0 && (
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-white/30 z-10"
                    style={{ left: `${Math.min(targetProgress, 100)}%` }}
                  />
                )}
                {/* User progress */}
                <div 
                  className={`absolute left-0 top-0 bottom-0 rounded-full transition-all duration-500 ${
                    lineupReady || !isUpcoming
                      ? isWinning 
                        ? 'bg-primary-green-500' 
                        : 'bg-white/40'
                      : 'bg-white/10'
                  }`}
                  style={{ width: lineupReady || !isUpcoming ? `${Math.min(userProgress, 100)}%` : '0%' }}
                />
              </div>
            </div>
            
            {/* Score Display */}
            <div className="flex items-center gap-2 whitespace-nowrap">
              {/* User Score */}
              <div className="text-right">
                <div className={`font-bold text-sm leading-none ${isWinning && (lineupReady || !isUpcoming) ? 'text-primary-green-400' : 'text-white'}`}>
                  {(displayScore !== null && displayScore !== undefined) ? displayScore.toFixed(1) : '—'}
                </div>
                <div className="text-white/30 text-[8px] uppercase">
                  {isUpcoming ? 'proj' : isFinal ? 'final' : 'pts'}
                </div>
              </div>
              
              <span className="text-white/20 text-xs">vs</span>
              
              {/* Comparison Score */}
              <div className="text-left">
                <div className="font-medium text-white/50 text-sm leading-none">
                  {(comparisonScore !== null && comparisonScore !== undefined) ? comparisonScore.toFixed(1) : '—'}
                </div>
                <div className="text-white/30 text-[8px]">
                  {win_condition === 'h2h' ? 'opp' : 'med'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================
            ROW 4: Stakes - Risk | Reward | Expand Indicator
            ======================================== */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            {/* Left: Risk & Reward - Labeled */}
            <div className="flex items-center gap-4">
              {/* Risk */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wide text-white/40">Risk</span>
                <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                <span className="text-xs font-medium text-white/60">{entry_cost}</span>
              </div>

              {/* Reward */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wide text-white/40">Win</span>
                <Coins className="w-3 h-3 text-yellow-500" />
                <span className="text-xs font-medium text-yellow-500">{coin_reward}</span>
              </div>
            </div>

            {/* Right: Expand Indicator */}
            <div className="flex items-center gap-1.5 text-white/40 hover:text-white/60 transition-colors">
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
              <div className="divide-y divide-primary-black-800">
                {(() => {
                  // Calculate cutoff for win/loss - for H2H it's rank 1, for median it's top half
                  const totalEntrants = standings.length;
                  const winCutoff = win_condition === 'h2h' ? 1 : Math.ceil(totalEntrants / 2);
                  
                  return standings.map((standing, index) => {
                    const standingRank = index + 1;
                    const isCurrentUser = standing.team_id === teamId;
                    const score = standing.display_score ?? standing.final_score ?? 0;
                    const isWinPosition = standingRank <= winCutoff;

                    return (
                      <div 
                        key={standing.id}
                        className={`flex items-center gap-3 px-3 py-2.5 ${
                          isWinPosition 
                            ? 'bg-primary-green-500/5' 
                            : 'bg-red-500/5'
                        } ${isCurrentUser ? 'border-l-2 border-white/40' : ''}`}
                      >
                        {/* Rank */}
                        <span className={`text-xs font-medium w-6 ${
                          isWinPosition ? 'text-primary-green-500/70' : 'text-red-400/70'
                        }`}>
                          #{standingRank}
                        </span>

                        {/* Team Name */}
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm truncate block ${
                            isCurrentUser ? 'text-white font-medium' : 'text-white/70'
                          }`}>
                            {standing.team?.team_name || 'Unknown Team'}
                            {isCurrentUser && (
                              <span className="text-[10px] text-white/40 ml-1.5">(You)</span>
                            )}
                          </span>
                        </div>

                        {/* Score */}
                        <div className="text-right">
                          <span className={`text-sm font-medium ${
                            isWinPosition ? 'text-primary-green-400/80' : 'text-red-400/80'
                          }`}>
                            {score.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
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
