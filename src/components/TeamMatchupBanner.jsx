import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../services/supabase';
import { useFantasy } from '../contexts/FantasyContext';
import { useProjectedMedian, useLeagueContext } from '../hooks/fantasy';
import TeamCustomizationModal from './TeamCustomizationModal';
import TeamScoreBanner from './TeamScoreBanner';

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
  let contextWeekStatus = null;
  let contextGameCounts = null;
  let contextGlobalMedian = null;
  let contextCurrentWeek = null;
  
  try {
    const fantasyContext = useFantasy();
    lineupStats = fantasyContext?.lineupStats;
    lineup = fantasyContext?.lineup;
    contextWeekStatus = fantasyContext?.weekStatus;
    contextGameCounts = fantasyContext?.gameCounts;
    contextGlobalMedian = fantasyContext?.globalMedian;
    contextCurrentWeek = fantasyContext?.currentWeek;
  } catch (error) {
    // Context not available - component used outside FantasyProvider
    console.warn('TeamMatchupBanner: Fantasy context not available');
  }
  
  // League context - determines if we show league-specific stats
  const { 
    isInLeague, 
    leagueName,
    leagueWins, 
    leagueLosses, 
    leagueLives,
    leagueContext,
    calculateLeagueMedian,
    calculateProjectedLeagueMedian
  } = useLeagueContext(teamId);
  
  console.log('🎯 [TeamMatchupBanner] League context:', { isInLeague, leagueName, leagueWins, leagueLosses, leagueLives });
  
  // League-specific median state
  const [leagueMedian, setLeagueMedian] = useState(null);
  const [leagueTeamCount, setLeagueTeamCount] = useState(0);
  
  // H2H matchup state
  const [h2hOpponent, setH2hOpponent] = useState(null);
  const [h2hOpponentScore, setH2hOpponentScore] = useState(null);
  
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
  
  // Calculate league median OR load H2H opponent based on win_condition
  useEffect(() => {
    if (!isInLeague || !displayWeek || !leagueContext?.contestConfig) {
      setLeagueMedian(null);
      setH2hOpponent(null);
      return;
    }
    
    const winCondition = leagueContext.contestConfig.win_condition;
    
    // Load H2H opponent if needed
    if (winCondition === 'h2h' || winCondition === 'both') {
      const fetchH2HOpponent = async () => {
        try {
          const { data: matchup, error } = await supabase
            .from('league_matchups')
            .select(`
              team_a_id,
              team_b_id,
              team_a:teams!team_a_id(id, team_name),
              team_b:teams!team_b_id(id, team_name)
            `)
            .eq('league_id', leagueContext.league.id)
            .eq('week', displayWeek.week)
            .eq('season', displayWeek.year)
            .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
            .single();
          
          if (error) {
            console.error('Error loading H2H matchup:', error);
            return;
          }
          
          if (matchup) {
            // Determine which team is the opponent
            const isTeamA = matchup.team_a_id === teamId;
            const opponentData = isTeamA ? matchup.team_b : matchup.team_a;
            const opponentId = isTeamA ? matchup.team_b_id : matchup.team_a_id;
            
            setH2hOpponent(opponentData?.team_name || 'Opponent');
            
            // Load opponent's score
            const { data: opponentLineup } = await supabase
              .from('weekly_lineups')
              .select('total_points')
              .eq('team_id', opponentId)
              .eq('week', displayWeek.week)
              .eq('season_year', displayWeek.year)
              .single();
            
            setH2hOpponentScore(opponentLineup?.total_points || 0);
          }
        } catch (err) {
          console.error('Error in fetchH2HOpponent:', err);
        }
      };
      
      fetchH2HOpponent();
      const interval = isLive ? setInterval(fetchH2HOpponent, 30000) : null;
      
      // Clean up interval
      return () => interval && clearInterval(interval);
    }
    
    // Load league median if needed
    if (winCondition === 'median' || winCondition === 'both') {
      const fetchLeagueMedian = async () => {
        // For live/final weeks, get actual scores
        if (isLive || isFinal) {
          const result = await calculateLeagueMedian(displayWeek.week, displayWeek.year);
          if (result) {
            setLeagueMedian(result.median);
            setLeagueTeamCount(result.totalTeams);
          }
        } else {
          // For projected weeks, use projected scores
          const result = await calculateProjectedLeagueMedian();
          if (result) {
            setLeagueMedian(result.median);
            setLeagueTeamCount(result.totalTeams);
          }
        }
      };
      
      fetchLeagueMedian();
      // Refresh periodically during live games
      const interval = isLive ? setInterval(fetchLeagueMedian, 30000) : null;
      return () => interval && clearInterval(interval);
    }
  }, [isInLeague, displayWeek, isLive, isFinal, calculateLeagueMedian, calculateProjectedLeagueMedian, leagueContext, teamId]);

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

        if (error) {
          console.error('Error fetching team data:', error);
          return;
        }

        if (data.team_image_url) {
          setTeamImage(data.team_image_url);
        }
        if (data.team_name) {
          setLocalTeamName(data.team_name);
        }
        if (data.simulated_season_id) {
          setSimulatedSeasonId(data.simulated_season_id);
        }
      };

      fetchTeamData();
    }
  }, [teamId]);

  // Load week info from nfl_season_config
  useEffect(() => {
    const fetchWeekInfo = async () => {
      const { data, error } = await supabase
        .from('nfl_season_config')
        .select('current_week, season_year, week_status')
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching week info:', error);
        return;
      }

      const week = { week: data.current_week, year: data.season_year };
      setCurrentWeek(week);
      
      // Use team's current_week if available, otherwise use NFL's current week
      const teamWeek = team?.current_week || data.current_week;
      setDisplayWeek({ week: teamWeek, year: data.season_year });
      
      // Determine if week is live or final
      setIsLive(data.week_status === 'live');
      setIsFinal(data.week_status === 'finalized');
    };

    fetchWeekInfo();
  }, [team?.current_week]);

  // Load global stats for the display week
  useEffect(() => {
    if (!displayWeek) return;

    const fetchGlobalStats = async () => {
      const { data, error } = await supabase
        .from('weekly_global_stats')
        .select('*')
        .eq('week_number', displayWeek.week)
        .eq('season_year', displayWeek.year)
        .maybeSingle();

      if (error) {
        console.error('Error fetching global stats:', error);
        return;
      }

      setGlobalStats(data);
      setWeekIsFinalized(data?.is_finalized || false);
    };

    fetchGlobalStats();
  }, [displayWeek]);

  // Load user's lineup for this week
  useEffect(() => {
    if (!teamId || !displayWeek) return;

    const fetchWeeklyLineup = async () => {
      const { data, error } = await supabase
        .from('weekly_lineups')
        .select('total_points, beat_median')
        .eq('team_id', teamId)
        .eq('week', displayWeek.week)
        .eq('season_year', displayWeek.year)
        .maybeSingle();

      if (error) {
        console.error('Error fetching weekly lineup:', error);
        return;
      }

      setHasWeeklyLineup(!!data);
      if (data && (isLive || isFinal)) {
        setLivePoints(data.total_points || 0);
      }
    };

    fetchWeeklyLineup();
  }, [teamId, displayWeek, isLive, isFinal]);

  // Load global rank
  useEffect(() => {
    if (!teamId) return;

    const fetchGlobalRank = async () => {
      const { data, error } = await supabase
        .rpc('get_team_global_rank', { p_team_id: teamId });

      if (error) {
        console.error('Error fetching global rank:', error);
        return;
      }

      setGlobalRank(data);
    };

    fetchGlobalRank();
  }, [teamId, wins, losses]);

  // Load simulated season median if applicable
  useEffect(() => {
    if (!simulatedSeasonId || !displayWeek) return;

    const fetchSimulatedMedian = async () => {
      const { data, error } = await supabase
        .from('simulated_week_results')
        .select('median_score')
        .eq('simulated_season_id', simulatedSeasonId)
        .eq('week_number', displayWeek.week)
        .single();

      if (error) {
        console.error('Error fetching simulated median:', error);
        return;
      }

      setSimulatedMedian(data?.median_score);
    };

    fetchSimulatedMedian();
  }, [simulatedSeasonId, displayWeek]);

  // Load all teams' scores for comparison
  useEffect(() => {
    if (!displayWeek || !currentWeek) return;

    const fetchAllTeamsScores = async () => {
      // During live/final, get actual scores from weekly_lineups
      if (isLive || isFinal) {
        const { data, error } = await supabase
          .from('weekly_lineups')
          .select('total_points')
          .eq('week', displayWeek.week)
          .eq('season_year', displayWeek.year)
          .not('total_points', 'is', null);

        if (error) {
          console.error('Error fetching all teams scores:', error);
          return;
        }

        const scores = data?.map(l => l.total_points) || [];
        setAllTeamsProjected(scores);
      } else {
        // For projected, we'd need to calculate from all lineups
        // This is expensive, so we skip it and rely on global median
        setAllTeamsProjected([projectedPoints]);
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
  
  // LEAGUE-ONLY MEDIAN:
  // If team is in a private league, ONLY use league-specific median
  // No fallback to global - the league IS the contest
  const medianScore = (() => {
    // In a league? Use league median exclusively
    if (isInLeague) {
      // If we have a calculated league median, use it
      if (leagueMedian != null && leagueMedian > 0) {
        return leagueMedian;
      }
      // No league data yet? Show user's own score as placeholder
      return userScore;
    }
    
    // Not in a league - this is global/open contest
    if (simulatedSeasonId && simulatedMedian) {
      return parseFloat(simulatedMedian);
    }
    if ((isLive || isFinal) && calculatedMedian > 0) {
      return calculatedMedian;
    }
    if (hasGlobalStats && globalStats.median_score) {
      return globalStats.median_score;
    }
    if (totalTeams > 0) {
      return projectedMedian;
    }
    return userScore;
  })();
  
  // Debug logging for median source
  console.log('🎯 [TeamMatchupBanner] Median calculation:', {
    isInLeague,
    leagueMedian,
    medianScore,
    leagueTeamCount,
    source: isInLeague 
      ? (leagueMedian != null ? 'LEAGUE_MEDIAN' : 'LEAGUE_NO_DATA') 
      : 'GLOBAL'
  });
  
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
  
  // Calculate win percentage
  const totalGames = wins + losses;
  const winPercentage = totalGames > 0 ? (wins / totalGames) * 100 : 0;
  
  // Determine if we have comparison data yet
  const noComparisonDataYet = !isLive && !isFinal && projectedPoints === 0;
  
  const handleThemeChange = (themeId) => {
    setBannerTheme(themeId);
    localStorage.setItem(`bannerTheme_${teamId}`, themeId);
  };

  const theme = getCurrentTheme();

  return (
    <>
      <div className={`relative overflow-hidden rounded-xl shadow-2xl border border-white/10 ${theme.bg}`}>
        {/* Background Pattern Overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.03) 10px, rgba(255,255,255,.03) 20px)`
          }} />
        </div>

        {/* Content */}
        <div className="relative p-4 md:p-6">
          {/* Mobile Layout */}
          <div className="md:hidden space-y-3">
            {/* Row 1: Avatar + Team Info */}
            <div className="flex items-center gap-3">
              {teamImage ? (
                <img
                  src={teamImage}
                  alt={localTeamName || 'Team'}
                  className="w-16 h-16 rounded-lg object-cover border-2 border-white/30 shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-white/10 border-2 border-white/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-lg font-dk-display font-black text-white truncate">
                    {localTeamName || teamName}
                  </h2>
                  <button
                    onClick={() => setShowCustomization(true)}
                    className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-all group flex-shrink-0"
                  >
                    <svg className="w-3.5 h-3.5 text-white/70 group-hover:text-white group-hover:rotate-45 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-white/60 font-medium truncate">
                  @{username}
                </p>
              </div>
            </div>

            {/* Row 2: Stats Pills */}
            <div className="flex gap-2 flex-wrap">
              {/* League or Global Record */}
              {isInLeague ? (
                <>
                  <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                    <div className="text-xs font-bold text-emerald-400">{leagueWins}W</div>
                    <div className="text-xs text-white/40">-</div>
                    <div className="text-xs font-bold text-red-400">{leagueLosses}L</div>
                    {leagueLives !== null && leagueLives !== undefined && (
                      <>
                        <div className="text-xs text-white/40">•</div>
                        <div className="text-xs font-bold text-yellow-400">{leagueLives} Lives</div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                    <span className="text-xs text-white/60">League:</span>
                    <span className="text-xs font-bold text-white truncate max-w-[120px]">{leagueName}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                    <div className="text-xs font-bold text-emerald-400">{wins}W</div>
                    <div className="text-xs text-white/40">-</div>
                    <div className="text-xs font-bold text-red-400">{losses}L</div>
                  </div>
                  {globalRank && (
                    <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                      <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-xs font-bold text-white">#{globalRank}</span>
                    </div>
                  )}
                </>
              )}
              
              {/* Coins */}
              <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-bold text-white">{coins?.toLocaleString() || 0}</span>
              </div>
            </div>

            {/* Week Status + Score */}
            <TeamScoreBanner
              week={displayWeek?.week}
              isLive={isLive}
              isFinal={isFinal}
              userScore={userScore}
              medianScore={medianScore}
              winPercentage={winPercentage}
              userPercentage={userPercentage}
              medianPercentage={medianPercentage}
              isAboveMedian={isAboveMedian}
              size="mobile"
              winCondition={leagueContext?.contestConfig?.win_condition || 'median'}
              opponentName={h2hOpponent}
              opponentScore={h2hOpponentScore}
              isInLeague={isInLeague}
              noDataYet={noComparisonDataYet}
            />
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
                      className="w-24 h-24 rounded-lg object-cover border-2 border-white/30 shadow-xl"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-white/10 border-2 border-white/30 flex items-center justify-center">
                      <svg className="w-12 h-12 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Team Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-dk-display font-black text-white mb-1 truncate">
                    {localTeamName || teamName}
                  </h2>
                  <p className="text-sm text-white/60 font-medium mb-2 truncate">
                    @{username}
                  </p>
                  
                  {/* Stats Row */}
                  <div className="flex gap-3 flex-wrap">
                    {/* League or Global Record */}
                    {isInLeague ? (
                      <>
                        <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                          <div className="text-sm font-bold text-emerald-400">{leagueWins}W</div>
                          <div className="text-sm text-white/40">-</div>
                          <div className="text-sm font-bold text-red-400">{leagueLosses}L</div>
                          {leagueLives !== null && leagueLives !== undefined && (
                            <>
                              <div className="text-sm text-white/40">•</div>
                              <div className="text-sm font-bold text-yellow-400">{leagueLives} Lives</div>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                          <span className="text-sm text-white/60">League:</span>
                          <span className="text-sm font-bold text-white truncate max-w-[180px]">{leagueName}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                          <div className="text-sm font-bold text-emerald-400">{wins}W</div>
                          <div className="text-sm text-white/40">-</div>
                          <div className="text-sm font-bold text-red-400">{losses}L</div>
                        </div>
                        {globalRank && (
                          <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="text-sm font-bold text-white">#{globalRank}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Coins */}
                    <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-bold text-white">{coins?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center: Score Battle */}
              <div className="flex-1 max-w-md">
                <TeamScoreBanner
                  week={displayWeek?.week}
                  isLive={isLive}
                  isFinal={isFinal}
                  userScore={userScore}
                  medianScore={medianScore}
                  winPercentage={winPercentage}
                  userPercentage={userPercentage}
                  medianPercentage={medianPercentage}
                  isAboveMedian={isAboveMedian}
                  size="desktop"
                  winCondition={leagueContext?.contestConfig?.win_condition || 'median'}
                  opponentName={h2hOpponent}
                  opponentScore={h2hOpponentScore}
                  isInLeague={isInLeague}
                  noDataYet={noComparisonDataYet}
                />
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
                  <div className="text-xs text-white/50 font-medium mb-1">
                    {isLive ? '🔴 LIVE' : isFinal ? '✓ FINAL' : 'PROJECTED'}
                  </div>
                  {hasGlobalStats && (
                    <div className="text-xs text-white/40">
                      {globalStats.total_active_teams?.toLocaleString() || '0'} Teams
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customization Modal */}
      {showCustomization && (
        <TeamCustomizationModal
          isOpen={showCustomization}
          onClose={() => setShowCustomization(false)}
          teamId={teamId}
          currentTheme={bannerTheme}
          onThemeChange={handleThemeChange}
          currentImage={teamImage}
          onImageChange={setTeamImage}
          currentName={localTeamName}
          onNameChange={setLocalTeamName}
        />
      )}
    </>
  );
}

TeamMatchupBanner.propTypes = {
  username: PropTypes.string,
  teamName: PropTypes.string,
  wins: PropTypes.number,
  losses: PropTypes.number,
  coins: PropTypes.number,
  teamId: PropTypes.string,
  team: PropTypes.object,
  previewMode: PropTypes.bool
};
