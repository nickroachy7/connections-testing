import PropTypes from 'prop-types';
import { Trophy, Crown, Target, TrendingUp, Swords, Clock, Zap } from 'lucide-react';

/**
 * ContestStandings - Live standings table for a public contest
 * 
 * Shows all entrants with their scores/rankings, updating based on contest state:
 * - Upcoming: Shows projected points
 * - Live: Shows live points with real-time updates
 * - Final: Shows final scores and results
 */
export default function ContestStandings({
  standings = [],
  medianScore = 0,
  winCondition = 'median',
  currentTeamId = null,
  isUpcoming = false,
  isLive = false,
  isFinal = false,
  loading = false
}) {
  // Win condition configuration
  const getWinConfig = () => {
    switch (winCondition) {
      case 'h2h':
        return {
          icon: Swords,
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/20',
          description: 'Win vs Opponent'
        };
      case 'top_points':
        return {
          icon: TrendingUp,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          description: 'Top Score Wins'
        };
      case 'median':
      default:
        return {
          icon: Target,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20',
          description: 'Beat Median'
        };
    }
  };

  const winConfig = getWinConfig();
  const WinIcon = winConfig.icon;

  // Status badge for scores
  const getScoreStatusBadge = () => {
    if (isUpcoming) return { text: 'Projected', color: 'text-amber-400', bg: 'bg-amber-500/20' };
    if (isLive) return { text: 'Live', color: 'text-red-400', bg: 'bg-red-500/20', pulse: true };
    return { text: 'Final', color: 'text-blue-400', bg: 'bg-blue-500/20' };
  };

  const statusBadge = getScoreStatusBadge();

  // Determine if a team is winning based on win condition
  const isTeamWinning = (entry) => {
    if (winCondition === 'top_points') {
      return entry.rank === 1;
    }
    return entry.score >= medianScore;
  };

  // Get rank display
  const getRankDisplay = (rank) => {
    if (rank === 1) return { icon: '🥇', class: 'text-yellow-400' };
    if (rank === 2) return { icon: '🥈', class: 'text-gray-300' };
    if (rank === 3) return { icon: '🥉', class: 'text-amber-600' };
    return { icon: `#${rank}`, class: 'text-white/60' };
  };

  if (loading) {
    return (
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl border border-primary-black-700 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-primary-black-700 rounded w-32" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-primary-black-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!standings?.length) {
    return (
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl border border-primary-black-700 p-6 text-center">
        <Trophy className="w-10 h-10 text-primary-black-500 mx-auto mb-3" />
        <p className="text-primary-black-400">No entrants yet</p>
      </div>
    );
  }

  return (
    <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl border border-primary-black-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-primary-black-700 bg-primary-black-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary-green-500" />
            <span className="font-semibold text-white text-sm">Standings</span>
            <span className="text-primary-black-400 text-xs">({standings.length} teams)</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Status badge */}
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded ${statusBadge.bg} ${statusBadge.color}`}>
              {statusBadge.pulse && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                </span>
              )}
              {statusBadge.text}
            </span>
            
            {/* Win condition badge */}
            {winCondition !== 'top_points' && (
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${winConfig.bgColor}`}>
                <WinIcon className={`w-3 h-3 ${winConfig.color}`} />
                <span className={winConfig.color}>{medianScore.toFixed(1)}</span>
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Standings List */}
      <div className="divide-y divide-primary-black-700/50">
        {standings.map((entry) => {
          const isCurrentTeam = entry.team_id === currentTeamId;
          const isWinning = isTeamWinning(entry);
          const rankDisplay = getRankDisplay(entry.rank);
          
          return (
            <div 
              key={entry.id}
              className={`px-4 py-2.5 flex items-center gap-3 transition-colors ${
                isCurrentTeam 
                  ? 'bg-primary-green-500/10 border-l-2 border-primary-green-500' 
                  : 'hover:bg-primary-black-700/30'
              }`}
            >
              {/* Rank */}
              <div className={`w-8 text-center font-bold ${rankDisplay.class}`}>
                {rankDisplay.icon}
              </div>
              
              {/* Team Info */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {entry.team?.team_image_url ? (
                  <img 
                    src={entry.team.team_image_url} 
                    alt={entry.team.team_name}
                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 bg-primary-black-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-4 h-4 text-primary-black-500" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className={`font-medium truncate ${isCurrentTeam ? 'text-primary-green-400' : 'text-white'}`}>
                    {entry.team?.team_name || 'Unknown Team'}
                    {isCurrentTeam && <span className="ml-1.5 text-xs text-primary-green-500">(You)</span>}
                  </div>
                  <div className="text-xs text-primary-black-400">
                    {entry.team?.wins ?? 0}W - {entry.team?.losses ?? 0}L
                  </div>
                </div>
              </div>
              
              {/* Lineup Status (for upcoming) */}
              {isUpcoming && (
                <div className="flex-shrink-0">
                  {entry.hasLineup ? (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Ready
                    </span>
                  ) : (
                    <span className="text-xs text-amber-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      No lineup
                    </span>
                  )}
                </div>
              )}
              
              {/* Score */}
              <div className="text-right flex-shrink-0">
                <div className={`font-bold ${
                  entry.score === 0 
                    ? 'text-primary-black-400' 
                    : isWinning 
                      ? 'text-primary-green-400' 
                      : 'text-white'
                }`}>
                  {entry.score > 0 ? entry.score.toFixed(1) : '—'}
                </div>
                {winCondition !== 'top_points' && entry.score > 0 && !isUpcoming && (
                  <div className={`text-xs ${isWinning ? 'text-primary-green-400' : 'text-red-400'}`}>
                    {isWinning ? '+' : ''}{(entry.score - medianScore).toFixed(1)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend Footer */}
      <div className="px-4 py-2 border-t border-primary-black-700 bg-primary-black-900/30">
        <div className="flex items-center justify-between text-xs text-primary-black-400">
          <span className="flex items-center gap-1">
            <WinIcon className={`w-3 h-3 ${winConfig.color}`} />
            {winConfig.description}
          </span>
          {winCondition !== 'top_points' && (
            <span>
              Median: <span className="text-white font-medium">{medianScore.toFixed(1)}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

ContestStandings.propTypes = {
  standings: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    team_id: PropTypes.string,
    score: PropTypes.number,
    rank: PropTypes.number,
    scoreType: PropTypes.oneOf(['projected', 'live', 'final']),
    hasLineup: PropTypes.bool,
    team: PropTypes.shape({
      id: PropTypes.string,
      team_name: PropTypes.string,
      team_image_url: PropTypes.string,
      wins: PropTypes.number,
      losses: PropTypes.number
    })
  })),
  medianScore: PropTypes.number,
  winCondition: PropTypes.oneOf(['median', 'h2h', 'top_points']),
  currentTeamId: PropTypes.string,
  isUpcoming: PropTypes.bool,
  isLive: PropTypes.bool,
  isFinal: PropTypes.bool,
  loading: PropTypes.bool
};
