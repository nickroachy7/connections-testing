import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import LoadingSpinner from './LoadingSpinner';
import { TrophyIcon, ChartBarIcon, FireIcon } from '@heroicons/react/24/solid';

export default function LeaderboardWidget({ 
  activeTeam, 
  userId, 
  compact = false, 
  showFilters = true,
  limit = 50,
  defaultSort = 'season' // 'season' or 'weekly'
}) {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState(defaultSort);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(null);

  useEffect(() => {
    fetchCurrentWeek();
  }, []);

  useEffect(() => {
    if (sortBy === 'weekly' && currentWeek && !selectedWeek) {
      setSelectedWeek(currentWeek);
    }
  }, [currentWeek, sortBy, selectedWeek]);

  useEffect(() => {
    if (sortBy === 'season' || (sortBy === 'weekly' && selectedWeek)) {
      fetchLeaderboard();
    }
  }, [sortBy, selectedWeek, activeTeam?.id]);

  const fetchCurrentWeek = async () => {
    try {
      const { data, error } = await supabase
        .from('global_game_state')
        .select('current_week')
        .single();

      if (error) throw error;
      setCurrentWeek(data.current_week);
      setSelectedWeek(data.current_week);
    } catch (err) {
      console.error('Error fetching current week:', err);
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);

    try {
      // If no activeTeam, fetch all contests or show message
      const contestTypeId = activeTeam?.contest_type_id;

      if (sortBy === 'season') {
        // Fetch season leaderboard
        let query = supabase
          .from('leaderboard_by_contest')
          .select('*');
        
        // Only filter by contest_type_id if we have one
        if (contestTypeId) {
          query = query.eq('contest_type_id', contestTypeId);
        }
        
        const { data, error } = await query
          .order('total_points', { ascending: false })
          .limit(limit);

        if (error) throw error;
        setLeaderboardData(data || []);
      } else if (sortBy === 'weekly' && selectedWeek) {
        // Fetch weekly leaderboard
        let query = supabase
          .from('weekly_leaderboard_by_contest')
          .select('*')
          .eq('week_number', selectedWeek);
        
        // Only filter by contest_type_id if we have one
        if (contestTypeId) {
          query = query.eq('contest_type_id', contestTypeId);
        }
        
        const { data, error } = await query
          .order('week_points', { ascending: false })
          .limit(limit);

        if (error) throw error;
        setLeaderboardData(data || []);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <TrophyIcon className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <TrophyIcon className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <TrophyIcon className="w-5 h-5 text-amber-600" />;
    return null;
  };

  const getRankDisplay = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" message="Loading leaderboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-xl p-4">
          <div className="flex flex-wrap gap-4">
            {/* Sort Type */}
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('season')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  sortBy === 'season'
                    ? 'bg-primary-blue-600 text-white'
                    : 'bg-primary-black-800 text-primary-black-300 hover:bg-primary-black-700'
                }`}
              >
                <ChartBarIcon className="w-4 h-4 inline mr-1" />
                Season
              </button>
              <button
                onClick={() => setSortBy('weekly')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  sortBy === 'weekly'
                    ? 'bg-primary-blue-600 text-white'
                    : 'bg-primary-black-800 text-primary-black-300 hover:bg-primary-black-700'
                }`}
              >
                <FireIcon className="w-4 h-4 inline mr-1" />
                Weekly
              </button>
            </div>

            {/* Week Selector */}
            {sortBy === 'weekly' && currentWeek && (
              <select
                value={selectedWeek || ''}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="bg-primary-black-800 text-primary-black-100 border border-primary-black-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue-500"
              >
                {Array.from({ length: currentWeek }, (_, i) => i + 1).map(week => (
                  <option key={week} value={week}>
                    Week {week}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
            <thead className="bg-primary-black-800 border-b border-primary-black-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-primary-black-300 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-primary-black-300 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-primary-black-300 uppercase tracking-wider">
                  Record
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-primary-black-300 uppercase tracking-wider">
                  {sortBy === 'season' ? 'Total Points' : 'Week Points'}
                </th>
                {sortBy === 'season' && (
                  <th className="px-4 py-3 text-right text-xs font-semibold text-primary-black-300 uppercase tracking-wider">
                    Avg/Week
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-black-800">
              {leaderboardData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-primary-black-400">
                    No leaderboard data available
                  </td>
                </tr>
              ) : (
                leaderboardData.map((entry, index) => {
                  const isCurrentUser = entry.user_id === userId;
                  const rank = sortBy === 'season' ? entry.rank_by_points : entry.week_rank;
                  
                  return (
                    <tr
                      key={sortBy === 'season' ? entry.team_id : entry.lineup_id}
                      className={`hover:bg-primary-black-800/50 transition-colors ${
                        isCurrentUser ? 'bg-primary-blue-900/20 border-l-4 border-l-primary-blue-500' : ''
                      }`}
                    >
                      {/* Rank */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getRankIcon(rank)}
                          <span className={`font-bold ${
                            rank <= 3 ? 'text-xl' : 'text-primary-black-100'
                          }`}>
                            {rank <= 3 ? getRankDisplay(rank) : `#${rank}`}
                          </span>
                        </div>
                      </td>

                      {/* Team Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {entry.avatar_url && (
                            <img 
                              src={entry.avatar_url} 
                              alt="" 
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <div>
                            <div className={`font-semibold ${
                              isCurrentUser ? 'text-primary-blue-400' : 'text-primary-black-50'
                            }`}>
                              {entry.team_name}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs bg-primary-blue-600 text-white px-2 py-0.5 rounded">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-primary-black-400">
                              @{entry.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Record */}
                      <td className="px-4 py-3">
                        {sortBy === 'season' ? (
                          <div className="text-sm">
                            <span className="text-green-400 font-semibold">{entry.wins}</span>
                            <span className="text-primary-black-400"> - </span>
                            <span className="text-red-400 font-semibold">{entry.losses}</span>
                            {entry.win_percentage && (
                              <div className="text-xs text-primary-black-400">
                                {entry.win_percentage}% WR
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-primary-black-400 text-sm">-</span>
                        )}
                      </td>

                      {/* Points */}
                      <td className="px-4 py-3 text-right">
                        <div className="font-bold text-primary-black-50">
                          {sortBy === 'season' 
                            ? entry.total_points?.toFixed(1) || '0.0'
                            : entry.week_points?.toFixed(1) || '0.0'
                          }
                        </div>
                      </td>

                      {/* Avg Points (Season only) */}
                      {sortBy === 'season' && (
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm text-primary-black-300">
                            {entry.avg_points_per_week?.toFixed(1) || '0.0'}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
      </div>

      {/* Footer Note */}
      {!compact && (
        <div className="text-xs text-primary-black-500 text-center">
          Rankings are contest-specific and updated in real-time
        </div>
      )}
    </div>
  );
}
