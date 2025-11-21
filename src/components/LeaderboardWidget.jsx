import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * Reusable Leaderboard Widget Component
 * Can be used in full-page mode (Leaderboard page) or compact mode (Dashboard)
 */
export default function LeaderboardWidget({ 
  activeTeam, 
  userId,
  compact = false,
  showFilters = true,
  limit = 50,
  defaultSort = 'season'
}) {
  const navigate = useNavigate();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [globalStats, setGlobalStats] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState(defaultSort);

  useEffect(() => {
    loadLeaderboardData();
  }, [activeTeam?.id, sortBy]);

  const loadLeaderboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get current week from config
      const { data: configData, error: configError } = await supabase
        .from('nfl_season_config')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (configError) {
        throw new Error(`Failed to load week config: ${configError.message}`);
      }
      
      const weekNumber = configData.current_week;
      const seasonYear = configData.season_year;
      
      setCurrentWeek({ week: weekNumber, year: seasonYear });
      
      // Check if activeTeam is in a simulated season
      const isSimulatedSeason = activeTeam?.simulated_season_id;
      
      // Load global stats for current week
      const { data: stats, error: statsError } = await supabase
        .from('weekly_global_stats')
        .select('*')
        .eq('week_number', weekNumber)
        .eq('season_year', seasonYear)
        .single();
      
      if (statsError && statsError.code !== 'PGRST116') {
        console.error('Error loading global stats:', statsError);
      }
      
      setGlobalStats(stats || null);
      
      // Build comprehensive leaderboard by loading ALL teams
      let teamsQuery = supabase
        .from('teams')
        .select(`
          id,
          team_name,
          team_image_url,
          is_bot,
          wins,
          losses,
          total_points,
          current_week,
          contest_type_id,
          simulated_season_id,
          user:users(
            id,
            username,
            avatar_url
          )
        `)
        .eq('is_active', true);
      
      // Filter by simulated season if applicable
      if (isSimulatedSeason) {
        teamsQuery = teamsQuery.eq('simulated_season_id', activeTeam.simulated_season_id);
      } else {
        // For regular teams, exclude simulated season teams
        teamsQuery = teamsQuery.is('simulated_season_id', null);
      }
      
      const { data: teams, error: teamsError } = await teamsQuery;
      
      if (teamsError) {
        throw new Error(`Failed to load teams: ${teamsError.message}`);
      }
      
      if (!teams || teams.length === 0) {
        setLeaderboardData([]);
        setLoading(false);
        return;
      }
      
      // Load weekly lineups for current week
      const teamIds = teams.map(t => t.id);
      const { data: weeklyLineups, error: lineupsError } = await supabase
        .from('weekly_lineups')
        .select('team_id, total_points, status, lineup_snapshot')
        .in('team_id', teamIds)
        .eq('week_number', weekNumber)
        .eq('season_year', seasonYear);
      
      if (lineupsError && lineupsError.code !== 'PGRST116') {
        console.error('Error loading weekly lineups:', lineupsError);
      }
      
      // Create a map of team_id -> weekly lineup data
      const lineupsMap = {};
      (weeklyLineups || []).forEach(lineup => {
        lineupsMap[lineup.team_id] = lineup;
      });
      
      // Combine teams with their weekly lineup data and calculate projected points
      const combinedData = await Promise.all(teams.map(async (team) => {
        const weeklyLineup = lineupsMap[team.id];
        let projectedPoints = 0;
        let lineupCount = 0;
        
        // Calculate projected points from lineup or inventory
        if (weeklyLineup && weeklyLineup.lineup_snapshot) {
          // Calculate from weekly lineup snapshot
          const positions = Object.keys(weeklyLineup.lineup_snapshot);
          for (const pos of positions) {
            const playerData = weeklyLineup.lineup_snapshot[pos];
            if (playerData && playerData.projected_points) {
              projectedPoints += parseFloat(playerData.projected_points);
              lineupCount++;
            }
          }
        } else {
          // Fallback: calculate from current inventory lineup
          const { data: currentLineup } = await supabase
            .from('user_player_inventory')
            .select(`
              player_card:player_cards(
                weekly_projected_points
              )
            `)
            .eq('team_id', team.id)
            .eq('is_in_lineup', true);
          
          if (currentLineup && currentLineup.length > 0) {
            currentLineup.forEach(item => {
              if (item.player_card && item.player_card.weekly_projected_points) {
                projectedPoints += parseFloat(item.player_card.weekly_projected_points);
                lineupCount++;
              }
            });
          }
        }
        
        return {
          team_id: team.id,
          team_name: team.team_name,
          team_image_url: team.team_image_url,
          is_bot: team.is_bot,
          user: team.user,
          wins: team.wins || 0,
          losses: team.losses || 0,
          season_total_points: parseFloat(team.total_points || 0),
          week_points: weeklyLineup ? parseFloat(weeklyLineup.total_points || 0) : 0,
          week_status: weeklyLineup?.status || 'not_started',
          projected_points: projectedPoints,
          has_lineup: lineupCount > 0,
          lineup_count: lineupCount,
          beat_median: stats && weeklyLineup ? parseFloat(weeklyLineup.total_points || 0) >= parseFloat(stats.median_score || 0) : false
        };
      }));
      
      setLeaderboardData(combinedData);
      
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-400';
    return 'text-primary-black-300';
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  // Get sorted leaderboard based on sortBy
  const getSortedLeaderboard = () => {
    let sorted = [...leaderboardData];
    
    switch(sortBy) {
      case 'week':
        sorted.sort((a, b) => b.week_points - a.week_points);
        break;
      case 'projected':
        sorted.sort((a, b) => b.projected_points - a.projected_points);
        break;
      case 'season':
        sorted.sort((a, b) => b.season_total_points - a.season_total_points);
        break;
      case 'wins':
        sorted.sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins;
          if (a.losses !== b.losses) return a.losses - b.losses;
          return b.season_total_points - a.season_total_points;
        });
        break;
      default:
        sorted.sort((a, b) => b.season_total_points - a.season_total_points);
    }
    
    // Add rank numbers
    return sorted.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  };

  const sortedLeaderboard = getSortedLeaderboard();
  const displayedLeaderboard = sortedLeaderboard.slice(0, limit);

  // Handle clicking on a team row to view their dashboard
  const handleTeamClick = (teamId) => {
    navigate(`/teams/${teamId}/view`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-primary-black-50 text-xl">Loading leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/50 border border-red-600 text-red-300 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className={compact ? '' : 'min-h-screen bg-primary-black-950'}>
      <div className={compact ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}>
        {!compact && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-primary-black-50 mb-2">
              Leaderboard
            </h1>
            <p className="text-primary-black-400">
              Week {currentWeek?.week} • {currentWeek?.year} Season
              {globalStats && (
                <span className="ml-4">
                  Median Score: <span className="text-primary-green-400 font-semibold">{parseFloat(globalStats.median_score || 0).toFixed(1)}</span>
                </span>
              )}
            </p>
          </div>
        )}

        <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-xl overflow-hidden">
          {showFilters && (
            <div className="sticky top-0 z-20 bg-primary-black-900 border-b-2 border-primary-black-700">
              <div className="px-4 py-4">
                {!compact && (
                  <h2 className="text-2xl font-bold text-primary-black-50 mb-3">
                    Top {limit} Teams
                  </h2>
                )}
                
                <div className="mb-2">
                  <span className="text-sm font-semibold text-primary-black-400 uppercase tracking-wide">
                    Sort By:
                  </span>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSortBy('week')}
                    className={`px-4 py-2.5 rounded-lg font-semibold transition-all ${
                      sortBy === 'week'
                        ? 'bg-primary-green-500 text-primary-black-950 shadow-lg scale-105'
                        : 'bg-primary-black-800 text-primary-black-300 hover:bg-primary-black-700 hover:text-primary-black-100'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs opacity-75">Week {currentWeek?.week}</span>
                      <span>Points</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setSortBy('projected')}
                    className={`px-4 py-2.5 rounded-lg font-semibold transition-all ${
                      sortBy === 'projected'
                        ? 'bg-primary-green-500 text-primary-black-950 shadow-lg scale-105'
                        : 'bg-primary-black-800 text-primary-black-300 hover:bg-primary-black-700 hover:text-primary-black-100'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs opacity-75">Projected</span>
                      <span>Points</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setSortBy('season')}
                    className={`px-4 py-2.5 rounded-lg font-semibold transition-all ${
                      sortBy === 'season'
                        ? 'bg-primary-green-500 text-primary-black-950 shadow-lg scale-105'
                        : 'bg-primary-black-800 text-primary-black-300 hover:bg-primary-black-700 hover:text-primary-black-100'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs opacity-75">Season</span>
                      <span>Total Points</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setSortBy('wins')}
                    className={`px-4 py-2.5 rounded-lg font-semibold transition-all ${
                      sortBy === 'wins'
                        ? 'bg-primary-green-500 text-primary-black-950 shadow-lg scale-105'
                        : 'bg-primary-black-800 text-primary-black-300 hover:bg-primary-black-700 hover:text-primary-black-100'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs opacity-75">Win/Loss</span>
                      <span>Record</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {displayedLeaderboard.length === 0 ? (
            <div className="p-12 text-center text-primary-black-400">
              No teams found. Create a team to get started!
            </div>
          ) : (
            <div>
              {displayedLeaderboard.map((entry, index) => {
                const isCurrentUser = entry.user && userId && entry.user.id === userId;
                
                return (
                  <div
                    key={entry.team_id}
                    onClick={() => handleTeamClick(entry.team_id)}
                    className={`
                      flex items-center gap-4 px-4 py-4 transition-all cursor-pointer
                      hover:bg-primary-green-500/10 border-l-4 
                      ${isCurrentUser ? 'border-primary-green-500 bg-primary-green-500/5' : 'border-transparent'}
                      hover:border-primary-green-500
                      ${index % 2 === 0 ? 'bg-primary-black-900' : 'bg-primary-black-800/50'}
                    `}
                  >
                    <div className="flex items-center gap-2 flex-shrink-0 min-w-[60px]">
                      <span className={`text-2xl ${getRankColor(entry.rank)} font-bold`}>
                        #{entry.rank}
                      </span>
                      <span className="text-xl">{getRankBadge(entry.rank)}</span>
                    </div>

                    <div className="w-12 h-12 rounded-lg bg-primary-black-700 flex items-center justify-center flex-shrink-0">
                      {entry.team_image_url ? (
                        <img
                          src={entry.team_image_url}
                          alt={entry.team_name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : entry.user?.avatar_url ? (
                        <img
                          src={entry.user.avatar_url}
                          alt={entry.user.username}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-primary-green-500 flex items-center justify-center text-primary-black-950 text-lg font-bold">
                          {entry.is_bot ? '🤖' : (entry.team_name?.[0]?.toUpperCase() || entry.user?.username?.[0]?.toUpperCase())}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-primary-black-50 truncate text-lg">
                          {entry.team_name}
                        </h4>
                        {isCurrentUser && (
                          <span className="px-2 py-0.5 bg-green-600/20 border border-green-600 text-green-400 rounded font-semibold text-xs">
                            YOU
                          </span>
                        )}
                        {entry.is_bot && (
                          <span className="px-2 py-0.5 bg-blue-600/20 border border-blue-600 text-blue-400 rounded font-semibold text-xs">
                            BOT
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-primary-black-400">
                        <span className="font-medium">
                          {entry.is_bot ? 'AI Opponent' : entry.user?.username}
                        </span>
                        {!entry.has_lineup && (
                          <span className="ml-2 text-yellow-500">⚠️ No lineup set</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      {/* Always show the primary sort metric prominently */}
                      <div className="text-center min-w-[80px]">
                        <div className="text-xs text-primary-black-500 mb-0.5 uppercase tracking-wide font-semibold">
                          {sortBy === 'season' && 'Season Total'}
                          {sortBy === 'wins' && 'Record'}
                          {sortBy === 'week' && `Week ${currentWeek?.week}`}
                          {sortBy === 'projected' && 'Projected'}
                        </div>
                        <div className={`font-bold text-xl ${
                          sortBy === 'week' || sortBy === 'season' ? 'text-primary-green-400' :
                          sortBy === 'projected' ? 'text-blue-400' :
                          'text-primary-black-50'
                        }`}>
                          {sortBy === 'season' && entry.season_total_points.toFixed(1)}
                          {sortBy === 'wins' && (
                            <div className="flex items-center gap-1">
                              <span className="text-primary-green-400">{entry.wins}W</span>
                              <span className="text-primary-black-500">-</span>
                              <span className="text-red-400">{entry.losses}L</span>
                            </div>
                          )}
                          {sortBy === 'week' && entry.week_points.toFixed(1)}
                          {sortBy === 'projected' && entry.projected_points.toFixed(1)}
                        </div>
                      </div>
                      
                      {/* Secondary stat - contextual based on sort */}
                      <div className="text-center min-w-[70px]">
                        <div className="text-xs text-primary-black-600 mb-0.5">
                          {sortBy === 'week' && entry.beat_median && (
                            <span className="text-green-400 font-semibold">✓ Beat Median</span>
                          )}
                          {sortBy === 'projected' && (
                            <>
                              <span className="text-primary-black-500">Lineup</span>
                              <div className="text-primary-black-300 font-semibold text-sm mt-0.5">
                                {entry.lineup_count}/9
                              </div>
                            </>
                          )}
                          {sortBy === 'season' && (
                            <>
                              <span className="text-primary-black-500">Record</span>
                              <div className="text-primary-black-300 font-semibold text-sm mt-0.5">
                                {entry.wins}-{entry.losses}
                              </div>
                            </>
                          )}
                          {sortBy === 'wins' && (
                            <>
                              <span className="text-primary-black-500">Season</span>
                              <div className="text-primary-black-300 font-semibold text-sm mt-0.5">
                                {entry.season_total_points.toFixed(1)}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!compact && leaderboardData.length > limit && (
          <div className="mt-4 text-center text-primary-black-400 text-sm">
            Showing top {limit} of {leaderboardData.length} teams
          </div>
        )}
      </div>
    </div>
  );
}

LeaderboardWidget.propTypes = {
  activeTeam: PropTypes.object,
  userId: PropTypes.string,
  compact: PropTypes.bool,
  showFilters: PropTypes.bool,
  limit: PropTypes.number,
  defaultSort: PropTypes.oneOf(['season', 'week', 'projected', 'wins'])
};
