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
  
  const projectedPoints = lineupStats?.projectedPoints || 0;

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

  // Load current week
  useEffect(() => {
    const loadCurrentWeek = async () => {
      try {
        const { data, error } = await supabase
          .from('nfl_season_config')
          .select('current_week, season_year')
          .eq('is_active', true)
          .single();
        
        if (error) throw error;
        if (data) setCurrentWeek({ week: data.current_week, year: data.season_year });
      } catch (error) {
        console.error('Error loading current week:', error);
      }
    };
    loadCurrentWeek();
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
  }, [currentWeek, teamId, previewMode, team?.current_week]);

  // Fetch stats and scores
  useEffect(() => {
    if (!displayWeek || !teamId) return;

    const fetchStats = async () => {
      try {
        if (simulatedSeasonId) setIsLive(false);
        
        const { data: globalData } = await supabase
          .from('weekly_global_stats')
          .select('*')
          .eq('week_number', displayWeek.week)
          .eq('season_year', displayWeek.year)
          .maybeSingle();

        setGlobalStats(globalData);

        const { data: lineupData } = await supabase
          .from('weekly_lineups')
          .select('total_points, status, lineup_snapshot')
          .eq('team_id', teamId)
          .eq('week_number', displayWeek.week)
          .eq('season_year', displayWeek.year)
          .maybeSingle();

        const weekFinalizedStatus = lineupData?.status === 'completed';
        setIsFinal(weekFinalizedStatus);
        setWeekIsFinalized(weekFinalizedStatus);
        setHasWeeklyLineup(!!lineupData);

        if (previewMode && weekFinalizedStatus && displayWeek.week > currentWeek.week) {
          setIsLive(false);
          setIsFinal(false);
          setGlobalStats(null);
          setHasWeeklyLineup(false);
          return;
        }

        let weekIsLive = false;
        if (!simulatedSeasonId && !weekFinalizedStatus) {
          const { data: weekConfig } = await supabase
            .from('nfl_season_config')
            .select('week_status')
            .eq('season_year', displayWeek.year)
            .eq('current_week', displayWeek.week)
            .eq('is_active', true)
            .maybeSingle();
          weekIsLive = weekConfig?.week_status === 'live';
        }
        
        setIsLive(weekIsLive);

        if (lineupData) {
          if (weekFinalizedStatus) {
            const finalScore = lineupData.total_points || 0;
            setLivePoints(finalScore);
            setProjectedFinal(finalScore);
          } else if (weekIsLive) {
            const dbLivePoints = parseFloat(lineupData.total_points || 0);
            setLivePoints(dbLivePoints);
            const hookProjectedFinal = lineupStats?.projectedFinal || 0;
            setProjectedFinal(hookProjectedFinal > 0 ? hookProjectedFinal : dbLivePoints);
          } else {
            let calculatedProjected = 0;
            if (lineupData.lineup_snapshot) {
              Object.keys(lineupData.lineup_snapshot).forEach(pos => {
                const playerData = lineupData.lineup_snapshot[pos];
                if (playerData?.projected_points) {
                  calculatedProjected += parseFloat(playerData.projected_points);
                }
              });
            } else if (lineup) {
              ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'FLEX'].forEach(pos => {
                const player = lineup[pos];
                if (player?.player_card?.weekly_projected_points) {
                  calculatedProjected += parseFloat(player.player_card.weekly_projected_points);
                }
              });
            }
            setProjectedFinal(calculatedProjected);
          }
        } else {
          if (weekIsLive) {
            setLivePoints(lineupStats?.livePoints || 0);
            setProjectedFinal(lineupStats?.projectedFinal || 0);
          } else {
            setProjectedFinal(lineupStats?.projectedPoints || 0);
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
    <>
      {teamHasntStarted && (
        <div className="bg-blue-900/30 border-b-2 border-blue-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="text-blue-100 font-semibold text-sm">
                Your first week will be Week {team.current_week}. The current week ({currentWeek.week}) is already in progress.
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-dk-black-secondary border-b border-dk-black-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            {/* Week & Badge */}
            <div className="flex items-center gap-2">
              {displayWeek ? (
                <span className="text-sm font-dk-display font-bold text-dk-white-muted uppercase">Week {displayWeek.week}</span>
              ) : (
                <span className="text-sm font-dk-display font-bold text-dk-white-muted uppercase opacity-50">Loading...</span>
              )}
              {(isLive || isFinal) && !previewMode && (
                <span className={`px-2 py-0.5 ${isFinal ? 'bg-blue-600' : 'bg-red-500'} text-white text-xs font-dk-display font-bold rounded flex items-center gap-1`}>
                  {!isFinal && <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>}
                  {isFinal ? 'FINAL' : 'LIVE'}
                </span>
              )}
            </div>

            {/* Progress Bar */}
            <div className="flex-1 flex items-center gap-3">
              <div className="relative flex-1 h-2 bg-dk-black-tertiary rounded-full overflow-hidden border border-dk-black-light">
                <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10" style={{ left: `${medianPercentage}%` }} />
                <div
                  className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ${
                    isFinal ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
                    isLive ? 'bg-gradient-to-r from-red-500 to-red-400' :
                    'bg-gradient-to-r from-dk-green-primary to-green-400'
                  }`}
                  style={{ width: `${userPercentage}%` }}
                />
              </div>
              <span className="text-xs text-dk-white-muted font-dk whitespace-nowrap">Median {medianScore.toFixed(1)}</span>
            </div>

            {/* Score Badges */}
            <div className="flex items-center gap-2">
              {isLive && !isFinal && projectedFinal >= livePoints && (
                <div className="rounded-lg px-3 py-1.5 shadow-lg border-2 bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-400">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white font-semibold uppercase tracking-wider">PROJ FINAL</span>
                    <span className="text-xl text-white font-black leading-none">{projectedFinal.toFixed(1)}</span>
                  </div>
                </div>
              )}
              
              <div className={`rounded-lg px-3 py-1.5 shadow-lg border-2 ${
                isFinal ? 'bg-gradient-to-r from-blue-600 to-blue-700 border-blue-400' :
                isLive ? 'bg-gradient-to-r from-red-600 to-red-700 border-red-400' : 
                'bg-gradient-to-r from-green-600 to-emerald-600 border-green-400'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white font-semibold uppercase tracking-wider">
                    {isFinal ? 'FINAL' : (isLive ? 'LIVE' : 'PROJECTED')}
                  </span>
                  <span className="text-xl text-white font-black leading-none">{userScore.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Text */}
          {hasGlobalStats && (
            <p className={`text-xs font-dk-display font-bold mt-2 ${isAboveMedian ? 'text-dk-green-primary' : 'text-orange-400'}`}>
              {userScore > medianScore ? `↑ ${(userScore - medianScore).toFixed(1)} pts above median` :
               userScore < medianScore ? `↓ ${(medianScore - userScore).toFixed(1)} pts below median` :
               '= Right at median'}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

WeekStatusBar.propTypes = {
  teamId: PropTypes.string.isRequired,
  team: PropTypes.object,
  previewMode: PropTypes.bool
};