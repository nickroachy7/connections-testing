import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../services/supabase';
import { useFantasy } from '../contexts/FantasyContext';
import { useProjectedMedian } from '../hooks/fantasy';

/**
 * WeekStatusBar Component
 * 
 * Displays week-related information:
 * - Current week number and status (LIVE/FINAL/PROJECTED)
 * - Progress bar showing score vs median
 * - Score badges (current score + projected final if live)
 * - Comparison text (above/below median)
 */
export default function WeekStatusBar({ teamId, team, previewMode = false }) {
  const { lineupStats, lineup } = useFantasy();
  
  const [currentWeek, setCurrentWeek] = useState(null);
  const [displayWeek, setDisplayWeek] = useState(null);
  const [globalStats, setGlobalStats] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [isFinal, setIsFinal] = useState(false);
  const [livePoints, setLivePoints] = useState(0);
  const [projectedFinal, setProjectedFinal] = useState(0);
  const [hasWeeklyLineup, setHasWeeklyLineup] = useState(false);
  const [simulatedSeasonId, setSimulatedSeasonId] = useState(null);
  const [simulatedMedian, setSimulatedMedian] = useState(null);
  const [allTeamsProjected, setAllTeamsProjected] = useState([]);
  const [weekIsFinalized, setWeekIsFinalized] = useState(false);
  const [bannerTheme, setBannerTheme] = useState('default');
  
  const themeOptions = [
    { id: 'default', bg: 'bg-gradient-to-r from-dk-green-secondary to-dk-green-primary' },
    { id: 'ocean', bg: 'bg-gradient-to-r from-blue-900 to-blue-800' },
    { id: 'forest', bg: 'bg-gradient-to-r from-emerald-900 to-green-800' },
    { id: 'sunset', bg: 'bg-gradient-to-r from-orange-900 to-red-900' },
    { id: 'purple', bg: 'bg-gradient-to-r from-purple-900 to-indigo-900' },
    { id: 'crimson', bg: 'bg-gradient-to-r from-red-950 to-rose-900' },
    { id: 'cow', bg: 'bg-gradient-to-br from-zinc-100 via-zinc-900 to-zinc-100' },
    { id: 'matrix', bg: 'bg-gradient-to-b from-black via-green-950 to-black' },
    { id: 'lava', bg: 'bg-gradient-to-r from-red-600 via-orange-600 to-yellow-500' }
  ];
  
  const getCurrentTheme = () => themeOptions.find(t => t.id === bannerTheme) || themeOptions[0];
  
  const projectedPoints = lineupStats?.projectedPoints || 0;

  // Load banner theme from localStorage
  useEffect(() => {
    if (teamId) {
      const savedTheme = localStorage.getItem(`bannerTheme_${teamId}`);
      if (savedTheme) setBannerTheme(savedTheme);
    }
  }, [teamId]);

  // Load simulated season ID
  useEffect(() => {
    if (teamId) {
      const fetchSimulatedSeason = async () => {
        const { data } = await supabase
          .from('teams')
          .select('simulated_season_id')
          .eq('id', teamId)
          .single();
        if (data) setSimulatedSeasonId(data.simulated_season_id);
      };
      fetchSimulatedSeason();
    }
  }, [teamId]);

  // Load current week and week status
  useEffect(() => {
    const loadCurrentWeek = async () => {
      try {
        const { data, error } = await supabase
          .from('nfl_season_config')
          .select('current_week, season_year, week_status')
          .eq('is_active', true)
          .single();
        
        if (error) throw error;
        if (data) {
          setCurrentWeek({ week: data.current_week, year: data.season_year });
          // Set live/final status based on global week status
          setIsLive(data.week_status === 'live');
          setIsFinal(data.week_status === 'final');
        }
      } catch (error) {
        console.error('Error loading current week:', error);
      }
    };
    loadCurrentWeek();
    
    // Poll for status changes every 30 seconds
    const interval = setInterval(loadCurrentWeek, 30000);
    return () => clearInterval(interval);
  }, []);

  // Set display week (handles preview mode)
  useEffect(() => {
    if (!currentWeek || !teamId) {
      setDisplayWeek(null);
      return;
    }

    const checkWeekStatus = async () => {
      if (team?.current_week && team.current_week > currentWeek.week) {
        const teamStartWeek = { week: team.current_week, year: currentWeek.year };
        setDisplayWeek(teamStartWeek);
        setWeekIsFinalized(false);
        setIsLive(false);
        setIsFinal(false);
        setGlobalStats(null);
        setHasWeeklyLineup(false);
        return;
      }
      
      const { data: lineupData } = await supabase
        .from('weekly_lineups')
        .select('status')
        .eq('team_id', teamId)
        .eq('week_number', currentWeek.week)
        .eq('season_year', currentWeek.year)
        .maybeSingle();

      const isFinalized = lineupData?.status === 'completed';
      setWeekIsFinalized(isFinalized);

      if (previewMode && isFinalized) {
        const nextWeek = { week: currentWeek.week + 1, year: currentWeek.year };
        setDisplayWeek(nextWeek);
        setIsLive(false);
        setIsFinal(false);
        setGlobalStats(null);
        setHasWeeklyLineup(false);
      } else {
        setDisplayWeek(currentWeek);
      }
    };

    checkWeekStatus();
  }, [currentWeek, teamId, team, previewMode]);

  // Fetch stats for the display week
  useEffect(() => {
    if (!displayWeek || !teamId) return;

    const fetchStats = async () => {
      try {
        const { data: lineupData } = await supabase
          .from('weekly_lineups')
          .select('total_points, projected_points, status')
          .eq('team_id', teamId)
          .eq('week_number', displayWeek.week)
          .eq('season_year', displayWeek.year)
          .maybeSingle();

        if (lineupData) {
          setHasWeeklyLineup(true);
          setLivePoints(parseFloat(lineupData.total_points || 0));
          setProjectedFinal(parseFloat(lineupData.projected_points || 0));
          // Don't override global week status - it's already set from nfl_season_config
        } else {
          setHasWeeklyLineup(false);
          setLivePoints(0);
          setProjectedFinal(0);
        }

        if (simulatedSeasonId) {
          const { data: simData } = await supabase
            .from('simulated_weeks')
            .select('median_score')
            .eq('simulated_season_id', simulatedSeasonId)
            .eq('week_number', displayWeek.week)
            .maybeSingle();
          if (simData) {
            setSimulatedMedian(simData.median_score);
          }
        } else {
          const { data: stats } = await supabase
            .from('weekly_global_stats')
            .select('median_score, total_active_teams, highest_score')
            .eq('week_number', displayWeek.week)
            .eq('season_year', displayWeek.year)
            .maybeSingle();

          if (stats) {
            setGlobalStats(stats);
          } else {
            setGlobalStats(null);
          }
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [displayWeek, teamId, simulatedSeasonId, lineup, lineupStats, previewMode, currentWeek]);

  // Fetch projected median
  useEffect(() => {
    if (!displayWeek || !currentWeek || isLive || isFinal) return;

    const fetchAllTeamsProjections = async () => {
      try {
        const { data: teams } = await supabase
          .from('teams')
          .select('id')
          .eq('is_active', true);

        if (!teams?.length) {
          setAllTeamsProjected([]);
          return;
        }

        const projections = [];
        for (const team of teams) {
          const { data: lineup } = await supabase
            .from('user_inventory')
            .select('player_cards!inner(weekly_projected_points, projected_points)')
            .eq('team_id', team.id)
            .eq('is_in_lineup', true);

          if (lineup?.length) {
            const teamProjected = lineup.reduce((sum, player) => {
              const proj = player.player_cards?.weekly_projected_points || 
                          player.player_cards?.projected_points || 0;
              return sum + parseFloat(proj);
            }, 0);
            if (teamProjected > 0) projections.push(teamProjected);
          }
        }
        setAllTeamsProjected(projections);
      } catch (error) {
        console.error('Error fetching all teams projections:', error);
      }
    };

    fetchAllTeamsProjections();
  }, [displayWeek, currentWeek, isLive, isFinal, projectedPoints]);

  const { projectedMedian, totalTeams } = useProjectedMedian(
    currentWeek?.week,
    currentWeek?.year,
    allTeamsProjected
  );

  const userScore = (isLive || isFinal) ? livePoints : projectedPoints;
  const hasGlobalStats = globalStats && globalStats.total_active_teams > 0;
  const medianScore = simulatedSeasonId && simulatedMedian
    ? parseFloat(simulatedMedian)
    : (hasGlobalStats ? globalStats.median_score || 0 : (totalTeams > 0 ? projectedMedian : userScore));
  
  const maxScore = hasGlobalStats ? (globalStats?.highest_score || userScore * 1.5) : (userScore * 1.5);
  const userPercentage = Math.min((userScore / maxScore) * 100, 100);
  const medianPercentage = Math.min((medianScore / maxScore) * 100, 100);
  const isAboveMedian = hasGlobalStats ? userScore >= medianScore : true;

  const teamHasntStarted = team?.current_week && currentWeek?.week && (
    team.current_week > currentWeek.week || 
    (team.current_week === currentWeek.week && !hasWeeklyLineup)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3">
      <div className="bg-black/20 backdrop-blur-sm rounded-lg px-4 py-2.5 border border-white/10">
        <div className="flex items-center gap-6">
          {/* Left: Week & Status */}
          <div className="flex items-center gap-2">
                {displayWeek ? (
                  <span className="text-base font-dk-display font-black text-dk-white uppercase">Week {displayWeek.week}</span>
                ) : (
                  <span className="text-base font-dk-display font-black text-dk-white-muted uppercase opacity-50">Loading...</span>
                )}
                
                <span className="text-dk-white-muted">•</span>
                
                <span className={`text-xs font-dk-display font-bold uppercase tracking-wider ${
                  isFinal ? 'text-blue-400' :
                  isLive ? 'text-red-400' : 
                  'text-dk-white-muted'
                }`}>
                  {isFinal ? 'Final' : (isLive ? 'Live' : 'Pre-Week')}
                </span>
              </div>

              {/* Center: Progress Bar with Median Marker */}
              <div className="flex-1">
                <div className="relative group">
                  <div className="relative h-2 bg-dk-black-tertiary rounded-full overflow-hidden border border-dk-black-light">
                    <div className="absolute top-0 bottom-0 w-px bg-yellow-400 z-10 group-hover:bg-yellow-300 transition-colors" style={{ left: `${medianPercentage}%` }} />
                    <div
                      className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ${
                        isAboveMedian 
                          ? 'bg-gradient-to-r from-dk-green-primary to-dk-green-primary/80'
                          : 'bg-gradient-to-r from-red-500 to-red-400'
                      }`}
                      style={{ width: `${userPercentage}%` }}
                    />
                  </div>
                  {/* Median indicator - only visible on hover */}
                  <div 
                    className="absolute -top-8 -translate-x-1/2 bg-dk-black-secondary border border-yellow-400/50 rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg"
                    style={{ left: `${medianPercentage}%` }}
                  >
                    <span className="text-xs text-yellow-400 font-bold whitespace-nowrap">Median: {medianScore.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Right: Score Display */}
              <div className="flex items-center gap-3">
                {isLive && !isFinal && projectedFinal > livePoints && (
                  <div className="flex flex-col items-end">
                    <span className="text-lg text-dk-white-muted font-black leading-none">{projectedFinal.toFixed(1)}</span>
                  </div>
                )}
                
                <div className="flex flex-col items-end">
                  <span className="text-2xl text-dk-white font-black leading-none">{userScore.toFixed(1)}</span>
                </div>
              </div>
            </div>
        </div>
      </div>
  );
}

WeekStatusBar.propTypes = {
  teamId: PropTypes.string.isRequired,
  team: PropTypes.object,
  previewMode: PropTypes.bool
};
