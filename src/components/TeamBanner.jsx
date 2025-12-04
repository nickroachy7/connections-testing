import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { supabase } from '../services/supabase';
import { useFantasy } from '../contexts/FantasyContext';
import { useProjectedMedian, useLeagueContext, usePublicContestContext, useMultipleContests } from '../hooks/fantasy';
import { usePrevious } from '../hooks/usePrevious';
import TeamScoreBanner from './TeamScoreBanner';
import ContestBannerCarousel from './ContestBannerCarousel';

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
 * TeamBanner Component
 * 
 * Unified banner combining team identity and week status in a Sleeper-inspired layout.
 * Shows: Team info, global rank, stats, score vs median comparison, week status.
 */
export default function TeamBanner({ 
  username, 
  teamName, 
  wins, 
  losses, 
  coins,
  teamId,
  team,
  previewMode = false,
  shouldRefetchContests = false
}) {
  const navigate = useNavigate();
  
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
    console.warn('TeamBanner: Fantasy context not available');
  }
  
  // League context - determines if we show league-specific stats (private teams)
  const { 
    isInLeague, 
    leagueName,
    leagueWins, 
    leagueLosses, 
    leagueLives,
    leagueContext,
    calculateLeagueMedian,
    calculateProjectedLeagueMedian,
    refetch: refetchLeagueContext
  } = useLeagueContext(teamId);
  
  // Public contest context - for public teams entered in weekly contests
  const {
    isInContest,
    contestName,
    contestContext,
    winCondition: contestWinCondition,
    opponent: contestOpponent,
    entrantCount,
    maxEntries: contestMaxEntries,
    contestWeek,
    isUpcoming: contestIsUpcoming,
    calculateContestMedian,
    calculateProjectedContestMedian,
    getOpponentScore,
    getCurrentRank,
    refetch: refetchContestContext,
    loading: contestLoading
  } = usePublicContestContext(teamId);
  
  // Multiple contests support - for swiping between entered contests
  const {
    contests: multipleContests,
    selectedIndex: multiContestIndex,
    setSelectedIndex: setMultiContestIndex,
    hasMultiple: hasMultipleContests,
    loading: multiContestLoading,
    refetch: refetchMultipleContests,
    canEnterMore: canEnterMoreContests,
    remainingEntries: contestRemainingEntries
  } = useMultipleContests(teamId);
  
  console.log('🎯 [TeamBanner] League context:', { isInLeague, leagueName, leagueWins, leagueLosses, leagueLives });
  console.log('🎮 [TeamBanner] Contest context:', { isInContest, contestName, contestWinCondition, entrantCount, contestLoading });
  console.log('📊 [TeamBanner] Multiple contests:', { count: multipleContests.length, hasMultiple: hasMultipleContests, selectedIndex: multiContestIndex, canEnterMore: canEnterMoreContests, remainingEntries: contestRemainingEntries });
  
  // Track previous week status to detect finalization
  const previousWeekStatus = usePrevious(contextWeekStatus);
  
  // Note: Contest data caching is now handled by module-level cache in hooks
  // Cache is invalidated when joining contests, so no forced refetch needed here
  
  // Refresh league context when week finalizes (updates wins/losses/lives)
  useEffect(() => {
    if (isInLeague && previousWeekStatus && previousWeekStatus !== 'finalized' && contextWeekStatus === 'finalized') {
      console.log('🏆 [TeamBanner] Week finalized! Refreshing league stats...');
      refetchLeagueContext();
    }
  }, [contextWeekStatus, previousWeekStatus, isInLeague, refetchLeagueContext]);
  
  // Refresh public contest context when week finalizes
  useEffect(() => {
    if (isInContest && previousWeekStatus && previousWeekStatus !== 'finalized' && contextWeekStatus === 'finalized') {
      console.log('🎮 [TeamBanner] Week finalized! Refreshing contest stats...');
      refetchContestContext();
    }
  }, [contextWeekStatus, previousWeekStatus, isInContest, refetchContestContext]);
  
  // League-specific median state
  const [leagueMedian, setLeagueMedian] = useState(null);
  const [leagueTeamCount, setLeagueTeamCount] = useState(0);
  
  // Public contest-specific state
  const [contestMedian, setContestMedian] = useState(null);
  const [contestOpponentScore, setContestOpponentScore] = useState(null);
  const [contestRank, setContestRank] = useState(null);
  
  // H2H matchup state (for private leagues)
  const [h2hOpponent, setH2hOpponent] = useState(null);
  const [h2hOpponentScore, setH2hOpponentScore] = useState(null);
  
  // Team customization state
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
  const [teamStartsNextWeek, setTeamStartsNextWeek] = useState(null); // Week number team will start playing

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

  // Calculate public contest median OR load H2H opponent based on win_condition
  useEffect(() => {
    if (!isInContest || !displayWeek || !contestContext) {
      setContestMedian(null);
      setContestOpponentScore(null);
      setContestRank(null);
      return;
    }
    
    const winCondition = contestWinCondition;
    
    // Load H2H opponent score if needed
    if (winCondition === 'h2h' && contestOpponent) {
      const fetchOpponentScore = async () => {
        const result = await getOpponentScore();
        if (result) {
          setContestOpponentScore(result.score);
        }
      };
      
      fetchOpponentScore();
      const interval = isLive ? setInterval(fetchOpponentScore, 30000) : null;
      return () => interval && clearInterval(interval);
    }
    
    // Load contest median if needed (for median contests)
    if (winCondition === 'median') {
      const fetchContestMedian = async () => {
        // For live/final weeks, get actual scores
        if (isLive || isFinal) {
          const result = await calculateContestMedian();
          if (result) {
            setContestMedian(result.median);
          }
        } else {
          // For projected weeks, use projected scores
          const result = await calculateProjectedContestMedian();
          if (result) {
            setContestMedian(result.median);
          }
        }
      };
      
      fetchContestMedian();
      const interval = isLive ? setInterval(fetchContestMedian, 30000) : null;
      return () => interval && clearInterval(interval);
    }
    
    // Load current rank for top_points contests
    if (winCondition === 'top_points') {
      const fetchRank = async () => {
        const userScore = isLive || isFinal ? livePoints : projectedPoints;
        const result = await getCurrentRank(userScore);
        if (result) {
          setContestRank(result.rank);
        }
      };
      
      fetchRank();
      const interval = isLive ? setInterval(fetchRank, 30000) : null;
      return () => interval && clearInterval(interval);
    }
  }, [isInContest, displayWeek, isLive, isFinal, contestContext, contestWinCondition, contestOpponent, calculateContestMedian, calculateProjectedContestMedian, getOpponentScore, getCurrentRank, livePoints, projectedPoints]);

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

  // Load current week and week status - prefer context for realtime updates
  useEffect(() => {
    // If context provides realtime values, use them
    if (contextCurrentWeek && contextWeekStatus) {
      setCurrentWeek({ week: contextCurrentWeek.week, year: contextCurrentWeek.year });
      setIsLive(contextWeekStatus === 'live');
      setIsFinal(contextWeekStatus === 'finalized');
      return; // No polling needed - context handles realtime subscription
    }
    
    // Fallback: fetch directly if context unavailable
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
          setIsFinal(data.week_status === 'finalized');
        }
      } catch (error) {
        console.error('Error loading current week:', error);
      }
    };
    loadCurrentWeek();
    
    // Only poll if not using context realtime
    const interval = setInterval(loadCurrentWeek, 30000);
    return () => clearInterval(interval);
  }, [contextCurrentWeek, contextWeekStatus]);

  // Set display week (handles preview mode)
  useEffect(() => {
    if (!currentWeek || !teamId) {
      setDisplayWeek(null);
      return;
    }
    
    // Wait for contest loading to complete before deciding
    if (contestLoading) {
      return;
    }

    const checkWeekStatus = async () => {
      // If team was created mid-season and their start week is in the future
      // BUT: If they've entered a public contest for THIS week, they can play NOW
      if (team?.current_week && team.current_week > currentWeek.week && !isInContest) {
        setTeamStartsNextWeek(team.current_week);
        setDisplayWeek(currentWeek); // Still show current week
        setWeekIsFinalized(false);
        setIsLive(false);
        setIsFinal(false);
        setGlobalStats(null);
        setHasWeeklyLineup(false);
        return;
      }
      
      // Team is eligible to play this week
      setTeamStartsNextWeek(null);
      
      // Check if this team has a lineup for the current week
      const { data: lineupData } = await supabase
        .from('weekly_lineups')
        .select('status')
        .eq('team_id', teamId)
        .eq('week_number', currentWeek.week)
        .eq('season_year', currentWeek.year)
        .maybeSingle();

      const teamLineupFinalized = lineupData?.status === 'completed';
      setWeekIsFinalized(teamLineupFinalized);

      // Always show the current week from nfl_season_config
      // The advance-week function is responsible for advancing current_week
      // When finalized, show final results. When scheduled, show projections for lineup building.
      setDisplayWeek(currentWeek);
    };

    checkWeekStatus();
  }, [currentWeek, teamId, team, previewMode, isInContest, contestLoading]);

  // Fetch stats for the display week - use context for global median when available
  useEffect(() => {
    if (!displayWeek || !teamId) return;

    const fetchStats = async () => {
      try {
        const { data: lineupData } = await supabase
          .from('weekly_lineups')
          .select('total_points, status')
          .eq('team_id', teamId)
          .eq('week_number', displayWeek.week)
          .eq('season_year', displayWeek.year)
          .maybeSingle();

        if (lineupData) {
          setHasWeeklyLineup(true);
          setLivePoints(parseFloat(lineupData.total_points || 0));
          // projected_points is calculated from lineupStats.projectedPoints
          setProjectedFinal(projectedPoints || 0);
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
          // Prefer context global median if available and matches current week
          if (contextGlobalMedian && contextCurrentWeek?.week === displayWeek.week) {
            setGlobalStats({ 
              median_score: contextGlobalMedian, 
              total_active_teams: null, // Will be fetched if needed
              highest_score: null 
            });
          } else {
            // Fallback: fetch from database
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
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
    // Only poll frequently if context doesn't provide realtime updates
    const pollingInterval = contextGlobalMedian ? 30000 : 10000;
    const interval = setInterval(fetchStats, pollingInterval);
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
  
  // LEAGUE-ONLY MEDIAN:
  // If team is in a private league, ONLY use league-specific median
  // If team is in a public contest, use contest-specific median
  // No fallback to global - the contest IS the competition
  const medianScore = (() => {
    // In a private league? Use league median exclusively
    if (isInLeague) {
      if (leagueMedian != null && leagueMedian > 0) {
        return leagueMedian;
      }
      return userScore;
    }
    
    // In a public contest? Use contest median
    if (isInContest) {
      // For H2H, we don't really need a median (opponent score is comparison)
      if (contestWinCondition === 'h2h' && contestOpponentScore != null) {
        return contestOpponentScore;
      }
      // For median and top_points contests, use contest median
      if (contestMedian != null && contestMedian > 0) {
        return contestMedian;
      }
      return userScore;
    }
    
    // Not in a league or contest - this is global/open play
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
  console.log('🎯 [TeamBanner] Median calculation:', {
    isInLeague,
    isInContest,
    leagueMedian,
    contestMedian,
    medianScore,
    leagueTeamCount,
    entrantCount,
    source: isInLeague 
      ? (leagueMedian != null ? 'LEAGUE_MEDIAN' : 'LEAGUE_NO_DATA') 
      : isInContest
        ? (contestMedian != null ? 'CONTEST_MEDIAN' : 'CONTEST_NO_DATA')
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
  const scoreDifference = userScore - medianScore;

  // LEAGUE-AWARE STATS:
  // If team is in a private league, use league-specific wins/losses/lives
  // Otherwise use global team stats
  const displayWins = isInLeague ? leagueWins : (wins || 0);
  const displayLosses = isInLeague ? leagueLosses : (losses || 0);
  
  // Calculate losses remaining
  const maxLosses = isInLeague 
    ? (leagueContext?.contestConfig?.max_losses || 3)
    : (team?.contest_type?.max_losses || 3);
  const lossesRemaining = isInLeague ? leagueLives : (maxLosses - (losses || 0));
  const isEliminated = lossesRemaining <= 0;
  const isDanger = lossesRemaining === 1;
  const isWarning = lossesRemaining === 2;

  // Calculate win percentage from league or global stats
  const totalGames = displayWins + displayLosses;
  const winPercentage = totalGames > 0 ? Math.round((displayWins / totalGames) * 100) : 0;

  // Determine if we have no comparison data yet
  // For leagues: no league median calculated yet
  // For public contests: no contest median calculated yet
  // For global: no lineup or median data
  const noComparisonDataYet = isInLeague 
    ? (leagueMedian == null || leagueMedian === 0)
    : isInContest
      ? (contestWinCondition === 'h2h' ? contestOpponentScore == null : (contestMedian == null || contestMedian === 0))
      : (!hasWeeklyLineup && medianScore === userScore);
  
  // Determine the win condition to pass to TeamScoreBanner
  // Priority: League > Public Contest > Global (median)
  const displayWinCondition = isInLeague 
    ? (leagueContext?.contestConfig?.win_condition || 'median')
    : isInContest 
      ? (contestWinCondition || 'median')
      : 'median';
  
  // Determine opponent name for H2H displays
  const displayOpponentName = isInLeague 
    ? h2hOpponent
    : isInContest && contestWinCondition === 'h2h'
      ? contestOpponent?.teamName
      : null;
  
  // Determine opponent score for H2H displays  
  const displayOpponentScore = isInLeague 
    ? h2hOpponentScore
    : isInContest && contestWinCondition === 'h2h'
      ? contestOpponentScore
      : null;

  return (
    <>
      <div className="px-3 sm:px-4 pt-3 pb-1">
        <div className={`${getCurrentTheme().bg} transition-all duration-300 rounded-xl overflow-hidden`}>
          {/* Team Info Section - with padding */}
          <div className="px-4 sm:px-5 py-3">
          
          {/* League Badge - Show if in a private league */}
          {isInLeague && leagueName && (
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full font-medium border border-amber-500/30">
                {leagueName}
              </span>
              <span className="text-xs text-white/50">
                {leagueContext?.memberCount || leagueTeamCount || 1} {(leagueContext?.memberCount || leagueTeamCount || 1) === 1 ? 'team' : 'teams'}
              </span>
            </div>
          )}
          
          {/* Mobile Layout - Team Identity Only */}
          <div className="md:hidden">
            {/* Team Identity Row */}
            <div className="flex items-center gap-3 relative">
              {/* Team Info Button - Top Right */}
              <button
                onClick={() => navigate(`/teams/${teamId}/info`)}
                className="absolute top-0 right-0 p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all z-10"
                title="Team Info & Settings"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Team Image */}
              <div className="flex-shrink-0">
                {teamImage ? (
                  <img
                    src={teamImage}
                    alt={localTeamName || 'Team'}
                    className="w-16 h-16 rounded-lg object-cover border-2 border-white/30 shadow-xl"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-white/10 border-2 border-white/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Team Info */}
              <div className="flex-1 min-w-0 pr-12 flex flex-col justify-center">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-lg font-dk-display font-black text-white truncate leading-none">
                    {localTeamName || 'Your Team'}
                  </h1>
                  <span className="text-[11px] text-white/50 font-medium">
                    • {team?.team_type === 'private' ? 'League' : 'DFS'}
                  </span>
                </div>
                {username && (
                  <div className="text-[11px] text-white/70 font-medium truncate mt-0.5">
                    {username}
                  </div>
                )}
                
                {/* Inline Stats Row: Rank, Record, Coins, Lives, Tickets */}
                <div className="flex items-center gap-1.5 text-[11px] mt-1">
                  {!isInLeague && <span className="font-dk-display font-bold text-white/80">#{globalRank || '--'}</span>}
                  {!isInLeague && <span className="text-white/30">•</span>}
                  <div className="flex items-center gap-0.5">
                    <span className="font-dk-display font-bold text-green-400">{displayWins}</span>
                    <span className="text-white/50">-</span>
                    <span className="font-dk-display font-bold text-red-400">{displayLosses}</span>
                  </div>
                  <span className="text-white/30">•</span>
                  <div className="flex items-center gap-0.5">
                    <svg className="w-2.5 h-2.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                    <span className="font-dk-display font-bold text-white">{coins?.toLocaleString() || '0'}</span>
                  </div>
                  <span className="text-white/30">•</span>
                  <div className="flex items-center gap-0.5">
                    <svg className="w-2.5 h-2.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    <span className="font-dk-display font-bold text-white">{lossesRemaining}</span>
                  </div>
                  <span className="text-white/30">•</span>
                  <div className="flex items-center gap-0.5">
                    <svg className="w-2.5 h-2.5 text-accent-orange-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z" />
                    </svg>
                    <span className="font-dk-display font-bold text-white">{team?.tickets || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
          
      {/* Contest/Score Section - Below the team banner, separate card */}
      <div className="md:hidden px-3 pt-2 pb-2">
        {(contestLoading || multiContestLoading) ? (
              /* Loading skeleton to prevent flash */
              <div className="px-3 py-3 animate-pulse bg-primary-black-800 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 bg-primary-black-700 rounded w-24" />
                    <div className="h-4 bg-primary-black-700 rounded w-16" />
                  </div>
                  <div className="h-4 bg-primary-black-700 rounded w-8" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-5 bg-primary-black-700 rounded w-16" />
                  <div className="flex-1 h-1.5 bg-primary-black-700 rounded-full" />
                  <div className="h-4 bg-primary-black-700 rounded w-20" />
                </div>
              </div>
            ) : (multipleContests.length > 1) || (multipleContests.length >= 1 && canEnterMoreContests && contestRemainingEntries > 0) ? (
              /* Swipeable carousel for multiple contests OR single contest with "enter more" option */
              <ContestBannerCarousel
                contests={multipleContests}
                selectedIndex={multiContestIndex}
                onIndexChange={setMultiContestIndex}
                userScore={isLive || isFinal ? livePoints : projectedPoints}
                fallbackMedian={medianScore}
                winPercentage={winPercentage}
                displayWeek={displayWeek}
                isLive={isLive}
                isFinal={isFinal}
                lineupReady={hasWeeklyLineup || (lineup && lineup.length > 0)}
                onContestClick={(contestId) => navigate(contestId ? `contests?expand=${contestId}` : 'contests')}
                canEnterMore={canEnterMoreContests}
                remainingEntries={contestRemainingEntries}
              />
            ) : (
            <TeamScoreBanner
              week={displayWeek?.week}
              isLive={isLive}
              isFinal={isFinal}
              isUpcoming={contestIsUpcoming}
              userScore={userScore}
              medianScore={medianScore}
              winPercentage={winPercentage}
              userPercentage={userPercentage}
              medianPercentage={medianPercentage}
              isAboveMedian={isAboveMedian}
              size="mobile"
              winCondition={displayWinCondition}
              opponentName={displayOpponentName}
              opponentScore={displayOpponentScore}
              isInLeague={isInLeague}
              isInContest={isInContest}
              noDataYet={noComparisonDataYet}
              teamStartsNextWeek={!isInContest ? teamStartsNextWeek : null}
              contestName={contestName}
              contestEntrantCount={entrantCount}
              contestMaxEntries={contestMaxEntries}
              contestMedianScore={contestMedian}
              contestRank={contestRank}
              contestWeek={contestWeek}
              onContestClick={isInContest && !isInLeague ? () => navigate(contestContext?.contestId ? `contests?expand=${contestContext.contestId}` : 'contests') : undefined}
              lineupReady={hasWeeklyLineup || (lineup && lineup.length > 0)}
            />
            )}
          </div>

          {/* Desktop Layout - separate container with gradient */}
          <div className="hidden md:block px-3 sm:px-4 pt-3 pb-2">
            <div className={`${getCurrentTheme().bg} transition-all duration-300 rounded-xl overflow-hidden`}>
              <div className="px-4 sm:px-5 py-4">
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
                          <svg className="w-10 h-10 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Team Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h1 className="text-4xl font-dk-display font-black text-white truncate leading-none">
                        {localTeamName || 'Your Team'}
                      </h1>
                      {username && (
                        <div className="text-base text-white/80 font-medium truncate mt-1">
                          @{username}
                        </div>
                      )}

                      {/* Inline Stats Row: Rank, Record, Coins, Lives */}
                      <div className="flex items-center gap-3 text-sm mt-2">
                        {!isInLeague && <span className="font-dk-display font-bold text-white/90">#{globalRank || '--'}</span>}
                        {!isInLeague && <span className="text-white/40">•</span>}
                        <div className="flex items-center gap-1">
                          <span className="font-dk-display font-bold text-green-400">{displayWins}</span>
                          <span className="text-white/60">-</span>
                          <span className="font-dk-display font-bold text-red-400">{displayLosses}</span>
                        </div>
                        <span className="text-white/40">•</span>
                        <div className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-white/90" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                          </svg>
                          <span className="font-dk-display font-bold text-white/90">{coins?.toLocaleString() || '0'}</span>
                        </div>
                        <span className="text-white/40">•</span>
                        <div className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-white/90" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                          <span className="font-dk-display font-bold text-white/90">{lossesRemaining}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Center: Score Battle */}
                  <div className="flex-1 max-w-md">
                    {contestLoading ? (
                      /* Loading skeleton to prevent flash */
                      <div className="px-4 py-3 bg-primary-black-800 rounded-xl border border-primary-black-700 animate-pulse">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-5 bg-primary-black-700 rounded w-28" />
                            <div className="h-5 bg-primary-black-700 rounded w-16" />
                          </div>
                          <div className="h-5 bg-primary-black-700 rounded w-10" />
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-5 bg-primary-black-700 rounded w-16" />
                          <div className="flex-1 h-2.5 bg-primary-black-700 rounded-full" />
                          <div className="h-5 bg-primary-black-700 rounded w-20" />
                        </div>
                      </div>
                    ) : (
                    <TeamScoreBanner
                      week={displayWeek?.week}
                      isLive={isLive}
                      isFinal={isFinal}
                      isUpcoming={contestIsUpcoming}
                      userScore={userScore}
                      medianScore={medianScore}
                      winPercentage={winPercentage}
                      userPercentage={userPercentage}
                      medianPercentage={medianPercentage}
                      isAboveMedian={isAboveMedian}
                      size="desktop"
                      winCondition={displayWinCondition}
                      opponentName={displayOpponentName}
                      opponentScore={displayOpponentScore}
                      isInLeague={isInLeague}
                      isInContest={isInContest}
                      noDataYet={noComparisonDataYet}
                      teamStartsNextWeek={!isInContest ? teamStartsNextWeek : null}
                      contestName={contestName}
                      contestEntrantCount={entrantCount}
                      contestMaxEntries={contestMaxEntries}
                      contestMedianScore={contestMedian}
                      contestRank={contestRank}
                      contestWeek={contestWeek}
                      onContestClick={isInContest && !isInLeague ? () => navigate('contests') : undefined}
                      lineupReady={hasWeeklyLineup || (lineup && lineup.length > 0)}
                    />
                    )}
                  </div>

                  {/* Right: Week Info + Team Settings */}
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => navigate(`/teams/${teamId}/info`)}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center gap-2 group"
                    >
                      <svg className="w-4 h-4 text-white group-hover:rotate-45 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm font-medium text-white">Settings</span>
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
    </>
  );
}

TeamBanner.propTypes = {
  username: PropTypes.string,
  teamName: PropTypes.string,
  wins: PropTypes.number,
  losses: PropTypes.number,
  coins: PropTypes.number,
  teamId: PropTypes.string.isRequired,
  team: PropTypes.object,
  previewMode: PropTypes.bool,
  shouldRefetchContests: PropTypes.bool
};