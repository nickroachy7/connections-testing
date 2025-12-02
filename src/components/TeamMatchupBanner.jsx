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

  // ... rest of component implementation (unchanged)
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