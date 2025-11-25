import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../services/supabase';
import { useFantasy } from '../contexts/FantasyContext';
import { useProjectedMedian } from '../hooks/fantasy';
import TeamCustomizationModal from './TeamCustomizationModal';

const BANNER_THEMES = [
  { id: 'default', name: 'Classic Dark', bg: 'bg-dk-black-secondary' },
  { id: 'ocean', name: 'Ocean Blue', bg: 'bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-900' },
  { id: 'forest', name: 'Forest Green', bg: 'bg-gradient-to-r from-emerald-900 via-green-800 to-teal-900' },
  { id: 'sunset', name: 'Sunset Orange', bg: 'bg-gradient-to-r from-orange-900 via-red-900 to-pink-900' },
  { id: 'purple', name: 'Royal Purple', bg: 'bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900' },
  { id: 'crimson', name: 'Fire Red', bg: 'bg-gradient-to-r from-red-900 via-orange-900 to-yellow-900' },
  { id: 'midnight', name: 'Midnight Blue', bg: 'bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950' },
  { id: 'emerald', name: 'Emerald Dream', bg: 'bg-gradient-to-r from-emerald-900 via-green-800 to-lime-900' },
  { id: 'rose', name: 'Rose Gold', bg: 'bg-gradient-to-r from-pink-900 via-rose-800 to-red-900' },
  { id: 'arctic', name: 'Arctic Ice', bg: 'bg-gradient-to-r from-cyan-900 via-blue-900 to-indigo-900' }
];

/**
 * TeamMatchupBanner Component
 * 
 * Unified banner combining team identity and week status in a Sleeper-inspired layout.
 * Shows: Team info, global rank, stats, score vs median comparison, week status.
 */
export default function TeamMatchupBanner({ 
  username, 
  teamName, 
  wins, 
  losses, 
  coins,
  teamId,
  team,
  previewMode = false
}) {
  // Safely get fantasy context - may not be available during SSR or outside provider
  let lineupStats = null;
  let lineup = null;
  
  try {
    const fantasyContext = useFantasy();
    lineupStats = fantasyContext?.lineupStats;
    lineup = fantasyContext?.lineup;
  } catch (error) {
    // Context not available - component used outside FantasyProvider
    console.warn('TeamMatchupBanner: Fantasy context not available');
  }
  
  // Team customization state
  const [showCustomization, setShowCustomization] = useState(false);
  const [teamImage, setTeamImage] = useState(null);
  const [bannerTheme, setBannerTheme] = useState('forest');
  const [localTeamName, setLocalTeamName] = useState(teamName);
  const [globalRank, setGlobalRank] = useState(null);
  
  // Week and scoring state
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

  const getCurrentTheme = () => BANNER_THEMES.find(t => t.id === bannerTheme) || BANNER_THEMES[2];

  // Load banner theme from localStorage
  useEffect(() => {
    if (teamId) {
      const savedTheme = localStorage.getItem(`bannerTheme_${teamId}`);
      setBannerTheme(savedTheme || 'forest');
    }
  }, [teamId]);

  // Load team image and name
  useEffect(() => {
    if (teamId) {
      const fetchTeamData = async () => {
        const { data, error } = await supabase
          .from('teams')
          .select('team_image_url, team_name, simulated_season_id')
          .eq('id', teamId)
          .single();

        if (!error && data) {
          setTeamImage(data.team_image_url);
          setLocalTeamName(data.team_name);
          setSimulatedSeasonId(data.simulated_season_id);
        }
      };
      fetchTeamData();
    }
  }, [teamId]);

  // Update local team name when prop changes
  useEffect(() => {
    setLocalTeamName(teamName);
  }, [teamName]);

  // Fetch global rank
  useEffect(() => {
    if (!teamId) return;

    const fetchGlobalRank = async () => {
      try {
        const { data: allTeams } = await supabase
          .from('teams')
          .select('id, wins, losses, total_points')
          .eq('is_active', true)
          .order('wins', { ascending: false })
          .order('total_points', { ascending: false });

        if (allTeams) {
          const rank = allTeams.findIndex(t => t.id === teamId) + 1;
          setGlobalRank(rank > 0 ? rank : null);
        }
      } catch (error) {
        console.error('Error fetching global rank:', error);
      }
    };

    fetchGlobalRank();
    const interval = setInterval(fetchGlobalRank, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [teamId, wins, losses]);

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
          setIsLive(data.week_status === 'live');
          setIsFinal(data.week_status === 'final');
        }
      } catch (error) {
        console.error('Error loading current week:', error);
      }
    };
    loadCurrentWeek();
    
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

  // Fetch projected median or live scores for all teams
  useEffect(() => {
    if (!displayWeek || !currentWeek) return;

    const fetchAllTeamsScores = async () => {
      try {
        const { data: teams } = await supabase
          .from('teams')
          .select('id')
          .eq('is_active', true);

        if (!teams?.length) {
          setAllTeamsProjected([]);
          return;
        }

        const scores = [];
        
        // If week is live/final, fetch actual scores from weekly_lineups
        // Note: These are updated by the edge function periodically
        if (isLive || isFinal) {
          const { data: lineups } = await supabase
            .from('weekly_lineups')
            .select('team_id, total_points')
            .eq('week_number', displayWeek.week)
            .eq('season_year', displayWeek.year);

          if (lineups?.length) {
            scores.push(...lineups.map(l => parseFloat(l.total_points || 0)).filter(s => s > 0));
          }
        } else {
          // Otherwise fetch projected scores
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
              if (teamProjected > 0) scores.push(teamProjected);
            }
          }
        }
        
        setAllTeamsProjected(scores);
      } catch (error) {
        console.error('Error fetching all teams scores:', error);
      }
    };

    fetchAllTeamsScores();
  }, [displayWeek, currentWeek, isLive, isFinal, projectedPoints]);

  const { projectedMedian, totalTeams } = useProjectedMedian(
    currentWeek?.week,
    currentWeek?.year,
    allTeamsProjected
  );

  // Calculate scores and percentages
  // Use real-time calculated points from lineupStats hook
  // During live games, use livePoints (actual in-game stats)
  // Otherwise use projectedPoints (pre-game projections)
  const userScore = (isLive || isFinal) 
    ? (lineupStats?.livePoints || 0)  // Use real-time live stats during games
    : (lineupStats?.projectedPoints || 0);  // Use projections before games start
  
  const hasGlobalStats = globalStats && globalStats.total_active_teams > 0;
  
  // Calculate median from actual team scores instead of trusting potentially stale DB value
  const calculatedMedian = allTeamsProjected.length > 0 ? (() => {
    const sorted = [...allTeamsProjected].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
    
    return median;
  })() : 0;
  
  // Use calculated median for live weeks (refreshes in real-time)
  // Use DB median for historical/future weeks (finalized data)
  const medianScore = simulatedSeasonId && simulatedMedian
    ? parseFloat(simulatedMedian)
    : (isLive || isFinal) && calculatedMedian > 0
    ? calculatedMedian  // Use real-time calculated median during live weeks
    : hasGlobalStats && globalStats.median_score
    ? globalStats.median_score  // Use DB median for historical data
    : totalTeams > 0 ? projectedMedian : userScore;
  
  // Calculate max score: include user's score and filter outliers
  // Filter out scores that are unrealistically high (> median * 2) as they're likely corrupted data
  const reasonableScores = allTeamsProjected.filter(score => {
    // If we have a median, filter outliers. Otherwise include all scores.
    if (medianScore > 0) {
      return score <= medianScore * 2; // Remove anything 2x above median (likely bad data)
    }
    return true;
  });
  
  // Include user's current score in the comparison
  const allScoresIncludingUser = [...reasonableScores, userScore];
  
  const highestProjectedScore = allScoresIncludingUser.length > 0 
    ? Math.max(...allScoresIncludingUser)
    : userScore;
  
  // Prioritize dynamically calculated highest score over potentially stale DB value
  const rawMaxScore = highestProjectedScore > 0
    ? highestProjectedScore      // Use highest from all teams (live or projected)
    : hasGlobalStats && globalStats.highest_score > 0
    ? globalStats.highest_score  // Fallback to DB value if available
    : Math.max(userScore, 150);  // Final fallback to user score or minimum 150
  
  // Add 10% buffer so bar doesn't look completely maxed out
  const maxScore = rawMaxScore * 1.10;
  
  const userPercentage = Math.min((userScore / maxScore) * 100, 100);
  const medianPercentage = Math.min((medianScore / maxScore) * 100, 100);
  const isAboveMedian = userScore >= medianScore;
  const scoreDifference = userScore - medianScore;

  // Calculate losses remaining
  const maxLosses = team?.contest_type?.max_losses || 3;
  const lossesRemaining = maxLosses - (losses || 0);
  const isEliminated = lossesRemaining <= 0;
  const isDanger = lossesRemaining === 1;
  const isWarning = lossesRemaining === 2;

  // Calculate win percentage
  const totalGames = (wins || 0) + (losses || 0);
  const winPercentage = totalGames > 0 ? Math.round(((wins || 0) / totalGames) * 100) : 0;

  return (
    <>
      <div className={`${getCurrentTheme().bg} transition-all duration-300 border-b-2 border-primary-black-700/50 shadow-lg shadow-black/40`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 md:py-4">
          
          {/* Mobile Layout */}
          <div className="md:hidden space-y-2">
            {/* Top Row: Team Identity + Customize Button */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {teamImage ? (
                    <img
                      src={teamImage}
                      alt={localTeamName || 'Team'}
                      className="w-10 h-10 rounded-lg object-cover border-2 border-white/20 shadow-lg"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/10 border-2 border-white/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Team Name + Meta */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-base font-dk-display font-black text-white truncate leading-tight">
                    {localTeamName || 'Your Team'}
                  </h1>
                  {username && (
                    <div className="text-[10px] text-white/80 font-medium truncate">
                      {username}
                    </div>
                  )}
                </div>
              </div>

              {/* Customize Button */}
              <button
                onClick={() => setShowCustomization(true)}
                className="flex-shrink-0 p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all"
                title="Customize team"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            {/* Stats Row: Rank, Record, Coins, Lives */}
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-1 text-[10px] text-white/80 font-medium">
                {globalRank && (
                  <>
                    <span className="text-yellow-400 font-bold">#{globalRank}</span>
                    <span className="text-white/40">•</span>
                  </>
                )}
                <span className="font-bold text-white">{wins || 0}-{losses || 0}</span>
                <span className="text-white/40">•</span>
                <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <span className="font-bold text-white">{coins?.toLocaleString() || '0'}</span>
              </div>

              <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isEliminated ? 'bg-red-500/20 text-red-300 border border-red-500/50' :
                isDanger ? 'bg-red-500/20 text-red-300 border border-red-500/50' :
                isWarning ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50' :
                'bg-white/10 text-white/80 border border-white/20'
              }`}>
                {isEliminated ? '❌ Eliminated' : `${lossesRemaining} ${lossesRemaining === 1 ? 'life' : 'lives'}`}
              </div>
            </div>

            {/* Week Status + Score */}
            <div className="bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-dk-display font-black text-white">
                    Week {displayWeek?.week || '—'}
                  </span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    isFinal ? 'bg-blue-500/20 text-blue-300' :
                    isLive ? 'bg-red-500/20 text-red-300' :
                    'bg-white/10 text-white/70'
                  }`}>
                    {isFinal ? 'Final' : isLive ? 'Live' : 'Proj'}
                  </span>
                </div>
                <div className="text-2xl font-black text-white leading-none">
                  {userScore.toFixed(1)}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                  {/* Median marker */}
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10" 
                    style={{ left: `${medianPercentage}%` }}
                  />
                  {/* Score bar */}
                  <div
                    className={`absolute top-0 bottom-0 left-0 transition-all duration-500 rounded-full ${
                      isAboveMedian 
                        ? 'bg-gradient-to-r from-green-500 to-green-400'
                        : 'bg-gradient-to-r from-red-500 to-red-400'
                    }`}
                    style={{ width: `${userPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-white/60">
                    {winPercentage}% WIN
                  </span>
                  <span className="text-yellow-400/80 font-medium">
                    Median: {medianScore.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:block">
            <div className="flex items-center gap-6">
              {/* Left: Team Identity */}
              <div className="flex items-center gap-3 flex-1">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {teamImage ? (
                    <img
                      src={teamImage}
                      alt={localTeamName || 'Team'}
                      className="w-16 h-16 rounded-lg object-cover border-2 border-white/30 shadow-xl"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-white/10 border-2 border-white/30 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Team Info */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-dk-display font-black text-white truncate leading-tight">
                    {localTeamName || 'Your Team'}
                  </h1>
                  {username && (
                    <div className="text-sm text-white/90 font-medium mt-0.5 truncate">
                      {username}
                    </div>
                  )}

                  {/* Stats Row: Rank, Record, Coins, Lives */}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-2 text-sm text-white/90 font-medium">
                      {globalRank && (
                        <>
                          <span className="text-yellow-400 font-bold">#{globalRank}</span>
                          <span className="text-white/40">•</span>
                        </>
                      )}
                      <span className="font-bold">{wins || 0}-{losses || 0}</span>
                      <span className="text-white/40">•</span>
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                      </svg>
                      <span className="font-bold">{coins?.toLocaleString() || '0'}</span>
                    </div>

                    <div className={`px-2 py-1 rounded text-xs font-bold ${
                      isEliminated ? 'bg-red-500/20 text-red-300 border border-red-500/50' :
                      isDanger ? 'bg-red-500/20 text-red-300 border border-red-500/50' :
                      isWarning ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50' :
                      'bg-white/10 text-white/80 border border-white/20'
                    }`}>
                      {isEliminated ? '❌ Eliminated' : `${lossesRemaining} ${lossesRemaining === 1 ? 'life' : 'lives'} remaining`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Center: Score Battle */}
              <div className="flex-1 max-w-md">
                <div className="bg-black/20 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/10">
                  {/* Row 1: Week, Status, Score */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-dk-display font-black text-white">
                        Week {displayWeek?.week || '—'}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                        isFinal ? 'bg-blue-500/20 text-blue-300' :
                        isLive ? 'bg-red-500/20 text-red-300' :
                        'bg-white/10 text-white/70'
                      }`}>
                        {isFinal ? 'Final' : isLive ? 'Live' : 'Proj'}
                      </span>
                    </div>
                    <div className="text-3xl font-black text-white leading-none">
                      {userScore.toFixed(1)}
                    </div>
                  </div>

                  {/* Row 2: Win %, Progress Bar, Median */}
                  <div className="space-y-1">
                    <div className="relative h-2.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10" 
                        style={{ left: `${medianPercentage}%` }}
                      />
                      <div
                        className={`absolute top-0 bottom-0 left-0 transition-all duration-500 rounded-full ${
                          isAboveMedian 
                            ? 'bg-gradient-to-r from-green-500 to-green-400'
                            : 'bg-gradient-to-r from-red-500 to-red-400'
                        }`}
                        style={{ width: `${userPercentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60 font-medium">{winPercentage}% WIN</span>
                      <span className="text-yellow-400/90 font-medium">Median: {medianScore.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Week Info + Customize */}
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => setShowCustomization(true)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center gap-2 group"
                >
                  <svg className="w-4 h-4 text-white group-hover:rotate-45 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-medium text-white">Customize</span>
                </button>

                <div className="text-right">
                  <div className="text-base font-dk-display font-black text-white/90">
                    Week {displayWeek?.week || '—'}
                  </div>
                  {isLive && !isFinal && projectedFinal > livePoints && (
                    <div className="text-sm text-white/60 font-bold">
                      → {projectedFinal.toFixed(1)} proj
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customization Modal */}
      <TeamCustomizationModal
        isOpen={showCustomization}
        onClose={() => setShowCustomization(false)}
        teamId={teamId}
        teamName={localTeamName}
        teamImage={teamImage}
        bannerTheme={bannerTheme}
        onTeamNameUpdate={setLocalTeamName}
        onTeamImageUpdate={setTeamImage}
        onBannerThemeUpdate={setBannerTheme}
      />
    </>
  );
}

TeamMatchupBanner.propTypes = {
  username: PropTypes.string,
  teamName: PropTypes.string,
  wins: PropTypes.number,
  losses: PropTypes.number,
  coins: PropTypes.number,
  teamId: PropTypes.string.isRequired,
  team: PropTypes.object,
  previewMode: PropTypes.bool
};
export default TeamMatchupBanner;
