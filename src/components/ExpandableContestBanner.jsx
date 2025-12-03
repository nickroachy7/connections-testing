import { useState, useEffect, memo } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown, Crown, Medal, TrendingUp, Target, Swords } from 'lucide-react';
import TeamScoreBanner from './TeamScoreBanner';
import { supabase } from '../services/supabase';

/**
 * ExpandableContestBanner
 * 
 * Wraps TeamScoreBanner with expandable standings panel.
 * Used on the Contests page to show contest standings on tap.
 */
function ExpandableContestBanner({
  entry,
  contest,
  displayWeek,
  isLive,
  isFinal,
  isUpcoming,
  userScore,
  lineupReady,
  teamId
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [standings, setStandings] = useState([]);
  const [loadingStandings, setLoadingStandings] = useState(false);

  // Fetch standings when expanded
  useEffect(() => {
    if (!isExpanded || !contest?.id) return;
    
    const fetchStandings = async () => {
      setLoadingStandings(true);
      try {
        console.log('📊 [ExpandableContestBanner] Fetching standings for contest:', contest.id);
        
        // First get the entries (note: column is entered_at, not created_at)
        const { data: entries, error: entriesError } = await supabase
          .from('public_contest_entries')
          .select('id, team_id, final_score, entered_at')
          .eq('contest_id', contest.id);

        if (entriesError) {
          console.error('📊 [ExpandableContestBanner] Entries error:', entriesError);
          throw entriesError;
        }
        
        console.log('📊 [ExpandableContestBanner] Entries:', entries);
        
        if (!entries || entries.length === 0) {
          setStandings([]);
          return;
        }
        
        // Then get the team names for each entry
        const teamIds = entries.map(e => e.team_id);
        const { data: teams, error: teamsError } = await supabase
          .from('teams')
          .select('id, team_name, user_id')
          .in('id', teamIds);
          
        if (teamsError) {
          console.error('📊 [ExpandableContestBanner] Teams error:', teamsError);
        }
        
        console.log('📊 [ExpandableContestBanner] Teams:', teams);
        
        // Merge entries with team data
        const merged = entries.map(entry => ({
          ...entry,
          team: teams?.find(t => t.id === entry.team_id) || null
        }));
        
        // Sort: by score descending if available, otherwise by entry order
        const sorted = merged.sort((a, b) => {
          if (a.final_score != null && b.final_score != null) {
            return b.final_score - a.final_score;
          }
          if (a.final_score != null) return -1;
          if (b.final_score != null) return 1;
          return new Date(a.entered_at) - new Date(b.entered_at);
        });
        
        console.log('📊 [ExpandableContestBanner] Final standings:', sorted);
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
  };

  // Get rank icon/styling
  const getRankDisplay = (rank) => {
    if (rank === 1) return { icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    if (rank === 2) return { icon: Medal, color: 'text-gray-300', bg: 'bg-gray-500/20' };
    if (rank === 3) return { icon: Medal, color: 'text-amber-600', bg: 'bg-amber-600/20' };
    return { icon: null, color: 'text-primary-black-400', bg: 'bg-primary-black-700' };
  };

  // Win condition config
  const getWinConditionLabel = () => {
    switch (contest?.win_condition) {
      case 'h2h': return 'H2H';
      case 'top_points': return 'Top Score';
      default: return 'Median';
    }
  };

  // Calculate median from standings
  const calculateMedian = () => {
    const scores = standings
      .map(s => s.final_score)
      .filter(s => s != null && s > 0)
      .sort((a, b) => a - b);
    
    if (scores.length === 0) return 0;
    
    const mid = Math.floor(scores.length / 2);
    return scores.length % 2 !== 0
      ? scores[mid]
      : (scores[mid - 1] + scores[mid]) / 2;
  };

  const median = standings.length > 0 ? calculateMedian() : (contest?.median_score || 0);
  const myRank = standings.findIndex(s => s.team_id === teamId) + 1;

  return (
    <div>
      {/* Banner with click handler */}
      <div 
        onClick={handleClick}
        className="cursor-pointer"
      >
        <div className={`${isExpanded ? '[&>div]:rounded-b-none' : ''}`}>
          <TeamScoreBanner
            week={displayWeek}
            isLive={isLive}
            isFinal={isFinal}
            isUpcoming={isUpcoming}
            userScore={userScore}
            medianScore={contest?.median_score || median || 0}
            winPercentage={userScore > 0 ? Math.round((userScore / Math.max(median, 100)) * 100) : 0}
            userPercentage={userScore > 0 ? Math.min((userScore / (Math.max(median, 100) * 1.5)) * 100, 100) : 0}
            medianPercentage={66.67}
            isAboveMedian={userScore >= (median || 0)}
            winCondition={contest?.win_condition || 'median'}
            isInContest={true}
            contestName={contest?.name || 'Contest'}
            contestEntrantCount={contest?.current_entries || standings.length || 1}
            contestMaxEntries={contest?.max_entries}
            contestMedianScore={median}
            contestRank={myRank || null}
            contestWeek={displayWeek}
            lineupReady={lineupReady}
            size="mobile"
          />
        </div>
      </div>

      {/* Expandable Standings Panel */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-out ${
          isExpanded ? 'max-h-[450px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-primary-black-900 -mt-px" onClick={handleClick}>
          {/* Standings Header */}
          <div className="px-3 py-2 border-t border-primary-black-700/30 flex items-center justify-between">
            <span className="text-xs font-semibold text-white/80">Standings</span>
            <div className="flex items-center gap-2">
              {contest?.win_condition === 'median' && median > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-blue-400/80">
                  <Target className="w-3 h-3" />
                  <span>Median: {median.toFixed(1)}</span>
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
              <div className="px-3 py-6 text-center text-primary-black-500 text-sm">
                No entrants yet
              </div>
            ) : (
              <div className="px-3 py-1">
                {standings.map((standing, index) => {
                  const rank = index + 1;
                  const rankConfig = getRankDisplay(rank);
                  const RankIcon = rankConfig.icon;
                  const isMe = standing.team_id === teamId;
                  const score = standing.final_score || 0;
                  const isAboveMedian = score >= median;
                  
                  return (
                    <div 
                      key={standing.id}
                      className={`flex items-center gap-3 py-2 ${
                        isMe ? 'bg-primary-green-500/10 -mx-3 px-3 rounded-lg' : ''
                      } ${index !== standings.length - 1 ? 'border-b border-primary-black-800/50' : ''}`}
                    >
                      {/* Rank */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        rankConfig.bg
                      } ${rankConfig.color}`}>
                        {RankIcon ? <RankIcon className="w-3.5 h-3.5" /> : rank}
                      </div>
                      
                      {/* Team Name */}
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium truncate block ${
                          isMe ? 'text-primary-green-400' : 'text-white'
                        }`}>
                          {standing.team?.team_name || 'Unknown Team'}
                          {isMe && <span className="text-[10px] ml-1 text-primary-green-500/70">(You)</span>}
                        </span>
                      </div>
                      
                      {/* Score */}
                      <div className="text-right">
                        {score > 0 ? (
                          <div className="flex items-center gap-1.5">
                            {contest?.win_condition === 'median' && (
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                isAboveMedian ? 'bg-green-500' : 'bg-red-500'
                              }`} />
                            )}
                            <span className={`text-sm font-bold ${
                              isMe ? 'text-primary-green-400' : 'text-white'
                            }`}>
                              {score.toFixed(1)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-primary-black-500">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Collapse indicator at bottom */}
          <div className="flex justify-center py-2 border-t border-primary-black-700/30 rounded-b-xl cursor-pointer">
            <ChevronDown className="w-4 h-4 text-white/40 rotate-180" />
          </div>
        </div>
      </div>
    </div>
  );
}

ExpandableContestBanner.propTypes = {
  entry: PropTypes.object.isRequired,
  contest: PropTypes.object,
  displayWeek: PropTypes.number,
  isLive: PropTypes.bool,
  isFinal: PropTypes.bool,
  isUpcoming: PropTypes.bool,
  userScore: PropTypes.number,
  lineupReady: PropTypes.bool,
  teamId: PropTypes.string
};

export default memo(ExpandableContestBanner);
