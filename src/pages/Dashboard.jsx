import { useNavigate, useRevalidator, useOutletContext } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { startNewTeam, getUserInventory, supabase } from '../services/supabase';
import LiveScoreWidget from '../components/LiveScoreWidget';
import LineupGridReadOnly from '../components/LineupGridReadOnly';

export default function Dashboard() {
  const { 
    user, 
    profile, 
    teams: initialTeams, 
    activeTeam, 
    inventory: initialInventory,
    lineup: contextLineup,
    projections: contextProjections,
    liveGameData: contextLiveGameData,
    currentWeek: contextCurrentWeek
  } = useOutletContext() || {};
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  
  const [teams, setTeams] = useState(initialTeams);
  const [showCreateTeam, setShowCreateTeam] = useState(!initialTeams.some(t => t.is_active));
  const [teamName, setTeamName] = useState(`${profile?.username}'s Team`);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [packContents, setPackContents] = useState(null);
  
  // Use context inventory as primary source (always fresh from FantasyContext)
  const inventory = initialInventory;
  
  // Lineup state for read-only display
  const [lineup, setLineup] = useState({
    QB: null,
    RB1: null,
    RB2: null,
    WR1: null,
    WR2: null,
    WR3: null,
    TE: null,
    FLEX: null,
    BENCH: []
  });
  const [projections, setProjections] = useState(new Map());
  const [liveGameData, setLiveGameData] = useState(new Map());
  
  // Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [leaderboardSortBy, setLeaderboardSortBy] = useState('week'); // 'week', 'projected', 'season', 'wins'
  const [selectedWeek, setSelectedWeek] = useState(null); // For viewing past weeks
  const [lastDataRefresh, setLastDataRefresh] = useState(new Date());
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  
  // Simulated season state
  const [simulatedSeason, setSimulatedSeason] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [projectedAverage, setProjectedAverage] = useState(null);
  const [showEliminationModal, setShowEliminationModal] = useState(false);
  const [eliminationStats, setEliminationStats] = useState(null);

  // Handle case where user is null (loader error or not logged in)
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Load lineup data when inventory changes (from context)
  useEffect(() => {
    console.log('📊 [Dashboard] Inventory changed, reloading lineup:', {
      hasInventory: !!inventory,
      playerCount: inventory?.players?.length,
      activeTeam: activeTeam?.id,
      currentWeek: contextCurrentWeek?.week
    });
    
    if (inventory?.players && activeTeam && contextCurrentWeek) {
      loadLineupData(inventory);
    }
  }, [inventory, activeTeam, contextCurrentWeek]); // Use inventory directly, not initialInventory
  
  // Load leaderboard data
  useEffect(() => {
    if (user && activeTeam) {
      loadLeaderboardData();
      checkSimulatedSeason();
    }
  }, [user, activeTeam, selectedWeek]); // Re-load when selectedWeek changes
  
  // Check if team is in a simulated season
  const checkSimulatedSeason = async () => {
    if (!activeTeam?.simulated_season_id) return;
    
    try {
      const { data, error } = await supabase
        .from('simulated_seasons')
        .select('*')
        .eq('id', activeTeam.simulated_season_id)
        .single();
      
      if (error) throw error;
      setSimulatedSeason(data);
    } catch (error) {
      console.error('Error loading simulated season:', error);
    }
  };
  
  // Simulate a week in the season
  const handleSimulateWeek = async () => {
    if (!simulatedSeason) return;
    
    setSimulating(true);
    try {
      const { data, error } = await supabase.rpc('simulate_week', {
        p_season_id: simulatedSeason.id
      });
      
      if (error) throw error;
      
      console.log('📊 Week simulation results:', data);
      
      // Parse teams_data array to find user's result
      const teamsDataArray = Array.isArray(data.teams_data) ? data.teams_data : [];
      const userResult = teamsDataArray.find(t => !t.is_bot);
      
      // Check active teams remaining
      const { data: activeTeamsData } = await supabase
        .from('teams')
        .select('id, losses')
        .eq('simulated_season_id', simulatedSeason.id)
        .eq('is_active', true);
      
      const activeTeamsCount = activeTeamsData?.length || 0;
      
      // Check if user was eliminated (look at their team directly)
      const { data: userTeamData } = await supabase
        .from('teams')
        .select('is_active, losses')
        .eq('simulated_season_id', simulatedSeason.id)
        .eq('is_bot', false)
        .single();
      
      const wasEliminated = userTeamData && !userTeamData.is_active;
      
      // If user was eliminated (3 losses)
      if (wasEliminated) {
        // Calculate final stats
        const userRank = teamsDataArray
          .sort((a, b) => parseFloat(b.score) - parseFloat(a.score))
          .findIndex(t => !t.is_bot) + 1;
        
        // Show results before deleting
        alert(`💀 ELIMINATED!\n\nWeek ${data.week} Results:\n` +
              `Your Score: ${parseFloat(userResult?.score || 0).toFixed(1)} pts\n` +
              `Average: ${parseFloat(data.average_score).toFixed(1)} pts\n` +
              `${userResult?.score >= data.average_score ? '✅ Beat Average' : '❌ Below Average'}\n\n` +
              `Final Rank: #${userRank} / ${teamsDataArray.length}\n` +
              `Active Teams Remaining: ${activeTeamsCount}\n\n` +
              `You've been eliminated with 3 losses. Season over!`);
        
        // Delete simulated season
        try {
          await supabase.rpc('delete_simulated_season', {
            p_season_id: simulatedSeason.id
          });
        } catch (deleteErr) {
          console.error('Error deleting season:', deleteErr);
        }
        
        navigate('/fantasy');
        return;
      }
      
      // If season is complete (week 18)
      if (data.week >= 18) {
        alert(`🎉 SEASON COMPLETE!\n\n` +
              `You survived all 18 weeks!\n` +
              `Final Record: Check your team stats\n` +
              `Active teams remaining: ${activeTeamsCount}`);
        
        // Delete simulated season
        try {
          await supabase.rpc('delete_simulated_season', {
            p_season_id: simulatedSeason.id
          });
        } catch (deleteErr) {
          console.error('Error deleting season:', deleteErr);
        }
        
        navigate('/fantasy');
        return;
      }
      
      // Show week results
      alert(`✅ Week ${data.week} Complete!\n\n` +
            `Your Score: ${parseFloat(userResult?.score || 0).toFixed(1)} pts\n` +
            `Average: ${parseFloat(data.average_score).toFixed(1)} pts\n` +
            `Highest: ${parseFloat(data.highest_score).toFixed(1)} pts\n` +
            `Lowest: ${parseFloat(data.lowest_score).toFixed(1)} pts\n\n` +
            `${userResult?.beat_average ? '✅ Beat Average (+1 Win)' : '❌ Below Average (+1 Loss)'}\n\n` +
            `Teams above average: ${data.teams_above_average}\n` +
            `Teams below average: ${data.teams_below_average}\n` +
            `Active teams: ${activeTeamsCount}`);
      
      // Reload the page to show updated data
      window.location.reload();
      
    } catch (error) {
      console.error('Error simulating week:', error);
      alert('Failed to simulate week: ' + error.message);
    } finally {
      setSimulating(false);
    }
  };

  // Helper function for baseline projections
  const getBaselineProjection = (position) => {
    const baselines = {
      'Quarterback': 18,
      'Running Back': 12,
      'Wide Receiver': 10,
      'Tight End': 8,
    };
    return baselines[position] || 8;
  };
  
  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const loadLineupData = useCallback(async (inventory) => {
    console.log('🔍 loadLineupData called with inventory:', inventory);
    console.log('🔍 inventory?.players length:', inventory?.players?.length);
    console.log('🔍 activeTeam:', activeTeam?.id);
    console.log('🔍 currentWeek from context:', contextCurrentWeek);
    
    // Use context current week (always fresh from season config)
    const weekToDisplay = contextCurrentWeek;
    
    if (!inventory?.players || !activeTeam || !weekToDisplay) {
      console.log('❌ Missing required data, returning early');
      return;
    }
    
    try {
      // Check if CURRENT week is finalized - if so, load from weekly_lineups snapshot
      const { data: weeklyLineup } = await supabase
        .from('weekly_lineups')
        .select('lineup_snapshot, status')
        .eq('team_id', activeTeam.id)
        .eq('week_number', weekToDisplay.week)
        .eq('season_year', weekToDisplay.year)
        .maybeSingle();

      console.log(`📊 Dashboard: Week ${weekToDisplay.week} status:`, weeklyLineup?.status || 'no lineup');

      // If CURRENT week is finalized, load from snapshot (show final scores)
      if (weeklyLineup?.status === 'completed' && weeklyLineup.lineup_snapshot) {
        console.log('📸 Dashboard: Loading finalized Week', weekToDisplay.week, 'lineup from snapshot');
          
          const snapshot = weeklyLineup.lineup_snapshot;
          const newLineup = {
            QB: null,
            RB1: null,
            RB2: null,
            WR1: null,
            WR2: null,
            WR3: null,
            TE: null,
            FLEX: null,
            BENCH: []
          };

          // Map snapshot to lineup structure
          // Snapshot contains complete player objects with player_card_id
          const positionsInSnapshot = new Set();
          
          console.log('📸 Snapshot positions:', Object.keys(snapshot));
          console.log('📸 Inventory has', inventory.players.length, 'players');
          
          for (const [position, playerData] of Object.entries(snapshot)) {
            if (position === 'BENCH' || !playerData || !playerData.player_card_id) continue;
            
            console.log(`📸 Looking for ${position}: ${playerData.player_name} (${playerData.player_card_id})`);
            
            // Find the matching player from inventory
            const player = inventory.players.find(p => p.player_card_id === playerData.player_card_id);
            if (player) {
              console.log(`  ✅ Found ${player.player_card.player_name}`);
              newLineup[position] = player;
              positionsInSnapshot.add(playerData.player_card_id);
            } else {
              console.log(`  ❌ NOT FOUND in inventory!`);
            }
          }

          // Load bench (all players not in starting lineup from snapshot)
          newLineup.BENCH = inventory.players.filter(p => !positionsInSnapshot.has(p.player_card_id));

          setLineup(newLineup);
          console.log('📸 Loaded finalized lineup with', positionsInSnapshot.size, 'starters');
          
          // Load projections for NEXT week (not the finalized week)
          if (inventory.players && inventory.players.length > 0) {
            const dbProjections = new Map();
            inventory.players.forEach(p => {
              if (p.player_card) {
                const weeklyProjValue = p.player_card.weekly_projected_points != null ? parseFloat(p.player_card.weekly_projected_points) : null;
                const projValue = p.player_card.projected_points != null ? parseFloat(p.player_card.projected_points) : null;
                const weeklyProj = weeklyProjValue ?? projValue ?? getBaselineProjection(p.player_card.position);
                
                dbProjections.set(p.player_card.player_id, {
                  projected: weeklyProj,
                  source: weeklyProjValue != null ? 'weekly_db' : (projValue != null ? 'season_db' : 'baseline')
                });
              }
            });
            setProjections(dbProjections);
            console.log('📊 Loaded projections for finalized week');
          }
          
          await loadLiveGameData(inventory.players);
          return; // Exit early - we loaded from snapshot
      }

      // Current week is NOT finalized - show PROJECTED stats for current week
      console.log('📋 Dashboard: Week', weekToDisplay.week, 'is active - showing PROJECTED stats');
      const startingPlayers = inventory.players.filter(p => p.is_in_lineup);
      const bench = inventory.players.filter(p => !p.is_in_lineup);
      
      const newLineup = {
        QB: null,
        RB1: null,
        RB2: null,
        WR1: null,
        WR2: null,
        WR3: null,
        TE: null,
        FLEX: null,
        BENCH: bench
      };
      
      startingPlayers.forEach(player => {
        if (player.lineup_position) {
          newLineup[player.lineup_position] = player;
        }
      });
      
      setLineup(newLineup);
      
      // Load projections from database
      if (inventory.players && inventory.players.length > 0) {
        const dbProjections = new Map();
        inventory.players.forEach(p => {
          if (p.player_card) {
            const weeklyProjValue = p.player_card.weekly_projected_points != null ? parseFloat(p.player_card.weekly_projected_points) : null;
            const projValue = p.player_card.projected_points != null ? parseFloat(p.player_card.projected_points) : null;
            const weeklyProj = weeklyProjValue ?? projValue ?? getBaselineProjection(p.player_card.position);
            
            dbProjections.set(p.player_card.player_id, {
              projected: weeklyProj,
              source: weeklyProjValue != null ? 'weekly_db' : (projValue != null ? 'season_db' : 'baseline')
            });
          }
        });
        setProjections(dbProjections);
      }
      
      // Load live game data
      await loadLiveGameData(inventory.players);
    } catch (err) {
      console.error('Error loading lineup data:', err);
      setError(err.message || 'Failed to load lineup');
    }
  }, [activeTeam, currentWeek]); // Add currentWeek dependency

  const loadLiveGameData = async (players) => {
    if (!currentWeek) {
      console.log('⚠️ Dashboard: No currentWeek available for loading game data');
      return;
    }

    try {
      console.log('📊 Dashboard: Loading game data for Week', currentWeek.week);
      
      // Use current week from config, not calculated from today's date
      const weekNumber = currentWeek.week;
      const seasonYear = currentWeek.year;
      
      // Load games for the week being displayed
      const { data: gamesData, error: gamesError } = await supabase
        .from('game_scores')
        .select('*')
        .eq('week_number', weekNumber)
        .eq('season_year', seasonYear);
      
      if (gamesError) throw gamesError;
      
      console.log('📊 Dashboard: Found', gamesData?.length || 0, 'games for Week', weekNumber);
      
      // Load player stats for the week
      if (gamesData && gamesData.length > 0) {
        const gameIds = gamesData.map(g => g.game_id);
        
        const { data: statsData, error: statsError } = await supabase
          .from('player_game_stats')
          .select(`
            *,
            player_card:player_cards!inner(
              player_id,
              player_name
            )
          `)
          .in('game_id', gameIds);
        
        if (statsError) throw statsError;

        console.log('📊 Dashboard: Found stats for', statsData?.length || 0, 'players');

        // Create a map of player_id (BallDontLie ID) -> game data
        const gameDataMap = new Map();
        
        statsData?.forEach(stat => {
          const game = gamesData.find(g => g.game_id === stat.game_id);
          if (game && stat.player_card?.player_id) {
            console.log('📊 Dashboard: Mapping player', stat.player_card.player_name, 'ID:', stat.player_card.player_id, 'Points:', stat.fantasy_points);
            gameDataMap.set(stat.player_card.player_id, {
              gameStatus: game.game_status,
              currentPoints: parseFloat(stat.fantasy_points || 0),
              quarter: game.quarter,
              timeRemaining: game.time_remaining,
              gameStartTime: game.game_start_time,
              homeTeam: game.home_team,
              awayTeam: game.away_team,
              homeScore: game.home_score,
              awayScore: game.away_score
            });
          }
        });
        
        // Also add scheduled games for players
        if (players && players.length > 0) {
          for (const playerCard of players) {
            // Skip if we already have data for this player
            if (gameDataMap.has(playerCard.player_card.player_id)) continue;
            
            const playerTeamAbbr = playerCard.player_card.team_abbreviation;
            
            // Find if this player's team has a game this week
            const teamGame = gamesData.find(g => 
              g.home_team === playerTeamAbbr || g.away_team === playerTeamAbbr
            );
            
            if (teamGame) {
              const isHome = teamGame.home_team === playerTeamAbbr;
              const opponent = isHome ? teamGame.away_team : teamGame.home_team;
              
              gameDataMap.set(playerCard.player_card.player_id, {
                gameStatus: teamGame.game_status,
                currentPoints: 0,
                quarter: teamGame.quarter,
                timeRemaining: teamGame.time_remaining,
                gameStartTime: teamGame.game_start_time,
                homeTeam: teamGame.home_team,
                awayTeam: teamGame.away_team,
                homeScore: teamGame.home_score,
                awayScore: teamGame.away_score,
                opponent: opponent,
                isHome: isHome
              });
            }
          }
        }
        
        setLiveGameData(gameDataMap);
      }
    } catch (err) {
      console.error('Error loading live game data:', err);
    }
  };
  
  const loadLeaderboardData = async () => {
    setLoadingLeaderboard(true);
    try {
      // Get current week from config
      const { data: configData, error: configError } = await supabase
        .from('nfl_season_config')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (configError) throw configError;
      
      const weekNumber = configData.current_week;
      const seasonYear = configData.season_year;
      
      setCurrentWeek({ week: weekNumber, year: seasonYear });
      
      // If no selectedWeek is set, initialize it to current week
      if (selectedWeek === null) {
        setSelectedWeek(weekNumber);
      }
      
      // Use selectedWeek for the query if it's set, otherwise use current week
      const queryWeek = selectedWeek !== null ? selectedWeek : weekNumber;
      
      // Check if activeTeam is in a simulated season
      const isSimulatedSeason = activeTeam?.simulated_season_id;
      
      console.log('🔍 Querying teams and lineups:', { queryWeek, seasonYear, isSimulatedSeason, activeTeamId: activeTeam?.id });
      
      // Load ALL active teams first
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
          simulated_season_id,
          is_active,
          eliminated_at,
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
      
      if (teamsError) throw teamsError;
      
      if (!teams || teams.length === 0) {
        setLeaderboardData([]);
        setLoadingLeaderboard(false);
        return;
      }
      
      // Load weekly lineups for selected week
      const teamIds = teams.map(t => t.id);
      const { data: weeklyLineups, error: lineupsError } = await supabase
        .from('weekly_lineups')
        .select('team_id, total_points, status, lineup_snapshot')
        .in('team_id', teamIds)
        .eq('week_number', queryWeek)
        .eq('season_year', seasonYear);
      
      if (lineupsError && lineupsError.code !== 'PGRST116') {
        console.error('Error loading weekly lineups:', lineupsError);
      }
      
      // Create a map of team_id -> weekly lineup data
      const lineupsMap = {};
      (weeklyLineups || []).forEach(lineup => {
        lineupsMap[lineup.team_id] = lineup;
      });
      
      // Combine teams with their weekly lineup data
      let lineups = teams.map(team => {
        const weeklyLineup = lineupsMap[team.id];
        return {
          id: weeklyLineup?.id || null,
          total_points: weeklyLineup?.total_points || null,
          status: weeklyLineup?.status || 'pending',
          week_number: queryWeek,
          season_year: seasonYear,
          lineup_snapshot: weeklyLineup?.lineup_snapshot || null,
          team: team
        };
      });
      
      // DEBUG: Check what we got from the database
      if (lineups && lineups.length > 1) {
        const botLineup = lineups.find(l => l.team?.is_bot === true);
        if (botLineup) {
          console.log('📊 Bot lineup raw data:', {
            team: botLineup.team?.team_name,
            snapshot: botLineup.lineup_snapshot,
            snapshotType: typeof botLineup.lineup_snapshot,
            isArray: Array.isArray(botLineup.lineup_snapshot),
            keys: botLineup.lineup_snapshot ? Object.keys(botLineup.lineup_snapshot) : null,
            QB: botLineup.lineup_snapshot?.QB
          });
        }
      }
      
      // Add rank and calculate projected points
      const rankedLineups = await Promise.all(
        (lineups || []).map(async (lineup, index) => {
          let projectedPoints = 0;
          
          console.log(`Lineup ${index + 1}:`, {
            team: lineup.team?.team_name,
            isBot: lineup.team?.is_bot,
            hasSnapshot: !!lineup.lineup_snapshot,
            isSimulated: isSimulatedSeason,
            status: lineup.status
          });
          
          // If this week has been completed (status === 'completed'), use actual total_points
          // Otherwise calculate projected points
          const useActualPoints = lineup.status === 'completed' && lineup.total_points != null;
          
          if (useActualPoints) {
            projectedPoints = parseFloat(lineup.total_points);
          } else {
            // Calculate projected points for pending weeks
            const isBot = lineup.team?.is_bot;
            
            if (isSimulatedSeason && isBot && lineup.lineup_snapshot) {
              // BOT TEAM: Calculate from lineup_snapshot with WEEKLY VARIANCE
              console.log('🤖 Calculating bot projections for:', lineup.team?.team_name);
              const positions = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE'];
            
              for (const pos of positions) {
                const playerData = lineup.lineup_snapshot[pos];
                if (playerData && playerData.player_id) {
                  const positionMap = {
                    'Quarterback': { min: 12, max: 30 },
                    'Running Back': { min: 6, max: 22 },
                    'Wide Receiver': { min: 4, max: 19 },
                    'Tight End': { min: 3, max: 14 }
                  };
                  
                  // Get position - first from snapshot, fallback to query
                  let position = playerData.position;
                  
                  if (!position) {
                    const { data: playerCard } = await supabase
                      .from('player_cards')
                      .select('position')
                      .eq('id', playerData.player_id)
                      .single();
                    position = playerCard?.position;
                  }
                  
                  const range = positionMap[position] || { min: 5, max: 15 };
                  const baseAvg = (range.min + range.max) / 2;
                  
                  // Add weekly variance: ±30% based on player_id + week
                  const seed = parseInt(playerData.player_id.replace(/-/g, '').substring(0, 8), 16);
                  const weekSeed = (seed * 37 + (currentWeek?.week || 1) * 997) % 1000; // Better randomization
                  const weekVariance = ((weekSeed % 200) - 100) / 333; // -0.3 to +0.3
                  
                  // Calculate with variance, keep within bounds
                  let points = baseAvg * (1 + weekVariance);
                  points = Math.max(range.min * 0.7, Math.min(range.max * 1.3, points));
                  
                  projectedPoints += points;
                }
              }
            } else if (isSimulatedSeason && !isBot) {
              // USER TEAM in simulated season: Calculate from actual lineup with WEEKLY VARIANCE
              const { data: userPlayers } = await supabase
                .from('user_player_inventory')
                .select('player_card_id, player_card:player_cards(id, position)')
                .eq('team_id', lineup.team.id)
                .eq('is_in_lineup', true);
              
              if (userPlayers && userPlayers.length > 0) {
                const positionMap = {
                  'Quarterback': { min: 12, max: 30 },
                  'Running Back': { min: 6, max: 22 },
                  'Wide Receiver': { min: 4, max: 19 },
                  'Tight End': { min: 3, max: 14 }
                };
                
                for (const player of userPlayers) {
                  if (player.player_card && player.player_card.position) {
                    const range = positionMap[player.player_card.position] || { min: 5, max: 15 };
                    const baseAvg = (range.min + range.max) / 2;
                    
                    // Add weekly variance: ±30% based on player_id + week
                    const seed = parseInt(player.player_card.id.replace(/-/g, '').substring(0, 8), 16);
                    const weekSeed = (seed * 37 + (currentWeek?.week || 1) * 997) % 1000;
                    const weekVariance = ((weekSeed % 200) - 100) / 333;
                    
                    let points = baseAvg * (1 + weekVariance);
                    points = Math.max(range.min * 0.7, Math.min(range.max * 1.3, points));
                    
                    projectedPoints += points;
                  }
                }
              }
            } else if (lineup.lineup_snapshot) {
              // Calculate from lineup_snapshot projected_points
              const positions = Object.keys(lineup.lineup_snapshot);
              for (const pos of positions) {
                const playerData = lineup.lineup_snapshot[pos];
                if (playerData && playerData.projected_points) {
                  projectedPoints += parseFloat(playerData.projected_points);
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
                .eq('team_id', lineup.team.id)
                .eq('is_in_lineup', true);
              
              if (currentLineup && currentLineup.length > 0) {
                currentLineup.forEach(item => {
                  if (item.player_card && item.player_card.weekly_projected_points) {
                    projectedPoints += parseFloat(item.player_card.weekly_projected_points);
                  }
                });
              }
            }
          }
          
          return {
            ...lineup,
            rank: index + 1,
            projectedPoints: parseFloat(projectedPoints.toFixed(1))
          };
        })
      );
      
      // Enhance with team data (wins, losses already in team object from initial query)
      const enhancedLineups = rankedLineups;
      
      console.log('Total lineups loaded:', enhancedLineups.length);
      console.log('Sample projected points:', enhancedLineups.slice(0, 3).map(l => ({ 
        name: l.team?.team_name, 
        projected: l.projectedPoints 
      })));
      
      // Store ALL lineups for sorting - don't slice yet
      setLeaderboardData(enhancedLineups);
      
      // Find user's rank
      let userEntry = null;
      if (activeTeam) {
        userEntry = enhancedLineups.find(l => l.team.id === activeTeam.id);
        if (userEntry) {
          setUserRank(userEntry);
          console.log('User rank:', userEntry.rank, 'Projected:', userEntry.projectedPoints);
        }
      }
      
      // Calculate projected average for simulated season
      if (activeTeam?.simulated_season_id && enhancedLineups.length > 0) {
        await calculateProjectedAverage(enhancedLineups);
      }
      
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoadingLeaderboard(false);
      setLastDataRefresh(new Date());
    }
  };
  
  // Calculate projected average score for simulated season
  const calculateProjectedAverage = async (allLineups) => {
    try {
      const isSimulated = activeTeam?.simulated_season_id;
      
      // Filter out user's team for bot average
      const botLineups = allLineups.filter(l => l.team?.id !== activeTeam?.id);
      
      let totalProjected = 0;
      let teamCount = 0;
      
      for (const lineup of botLineups) {
        // Use the projectedPoints already calculated
        if (lineup.projectedPoints && lineup.projectedPoints > 0) {
          totalProjected += lineup.projectedPoints;
          teamCount++;
        }
      }
      
      if (teamCount > 0) {
        const avg = totalProjected / teamCount;
        setProjectedAverage(avg.toFixed(1));
        console.log('Bot average calculated:', avg.toFixed(1), 'from', teamCount, 'teams');
      }
    } catch (error) {
      console.error('Error calculating projected average:', error);
    }
  };
  
  const getRankColor = (rank) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-400';
    return 'text-primary-black-300';
  };

  // Get sorted leaderboard based on leaderboardSortBy
  const getSortedDashboardLeaderboard = () => {
    const filled = leaderboardData.filter(l => !l.isEmpty);
    const empty = leaderboardData.filter(l => l.isEmpty);
    
    let sorted = [...filled];
    
    switch(leaderboardSortBy) {
      case 'week':
        sorted.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
        break;
      case 'projected':
        sorted.sort((a, b) => (b.projectedPoints || 0) - (a.projectedPoints || 0));
        break;
      case 'season':
        sorted.sort((a, b) => {
          const aPoints = a.teamData?.total_points || 0;
          const bPoints = b.teamData?.total_points || 0;
          return bPoints - aPoints;
        });
        break;
      case 'wins':
        sorted.sort((a, b) => {
          const aWins = a.teamData?.wins || 0;
          const bWins = b.teamData?.wins || 0;
          if (bWins !== aWins) return bWins - aWins;
          return (b.teamData?.total_points || 0) - (a.teamData?.total_points || 0);
        });
        break;
    }
    
    // Re-rank based on current sort
    sorted = sorted.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
    
    return [...sorted, ...empty];
  };

  // REMOVED: All other useEffect hooks - data comes from loader

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const result = await startNewTeam(teamName);
      // Result now contains {team, starter_pack_id, message}
      // Note: starter_pack_contents is not returned anymore
      setPackContents(null); // Clear pack contents
      // Reload teams via revalidator
      revalidator.revalidate();
      setShowCreateTeam(false);
    } catch (err) {
      setError(err.message || 'Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  // Data already loaded by loader - no need for loading check
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary-black-50 text-xl">Redirecting...</div>
      </div>
    );
  }

  // Show starter pack reveal if we just opened one
  if (packContents) {
    return (
      <div className="container-modern py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-primary-black-800 rounded-xl p-8 border border-primary-green-500 shadow-glow-green">
            <h1 className="text-4xl font-bold text-primary-green-400 mb-6 text-center">🎉 Welcome to Your Team!</h1>
            <p className="text-primary-black-300 text-center mb-8">You received your starter pack! Here's what you got:</p>
            
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-primary-black-50 mb-4">Players (5)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {packContents.players.map((player, idx) => (
                  <div key={idx} className="bg-primary-black-700 rounded-lg p-4 border border-primary-black-600">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-primary-black-300 text-sm">{player.position}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        player.rarity === 'legendary' ? 'bg-yellow-600 text-yellow-100' :
                        player.rarity === 'epic' ? 'bg-purple-600 text-purple-100' :
                        player.rarity === 'rare' ? 'bg-blue-600 text-blue-100' :
                        'bg-gray-600 text-gray-100'
                      }`}>{player.rarity}</span>
                    </div>
                    <h4 className="text-lg font-bold text-primary-black-50">{player.player_name}</h4>
                    <p className="text-primary-black-400 text-sm">{player.team_abbreviation}</p>
                    <p className="text-primary-green-400 text-sm mt-2">Level 1 • Base Tier</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-primary-black-50 mb-4">Tokens (3)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {packContents.tokens.map((token, idx) => (
                  <div key={idx} className="bg-primary-black-700 rounded-lg p-4 border border-primary-black-600">
                    <h4 className="text-lg font-bold text-primary-green-400 mb-2">{token.token_name}</h4>
                    <p className="text-primary-black-300 text-sm mb-2">{token.description}</p>
                    <p className="text-primary-green-500 font-semibold">+{token.bonus_points} pts</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setPackContents(null)}
              className="w-full bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 py-3 px-4 rounded-lg font-semibold transition-colors"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show team creation form if no active team
  if (showCreateTeam) {
    return (
      <div className="container-modern py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-primary-black-800 rounded-xl p-8 border border-primary-black-700">
            <h1 className="text-3xl font-bold text-primary-black-50 mb-4 text-center">Start Your Journey! 🏈</h1>
            <p className="text-primary-black-300 text-center mb-6">
              Create your first team and get a free starter pack with 5 players and 3 tokens!
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-600 text-red-300 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label htmlFor="teamName" className="block text-sm font-medium text-primary-black-300 mb-2">
                  Team Name
                </label>
                <input
                  id="teamName"
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-3 bg-primary-black-900 border border-primary-black-600 text-primary-black-50 rounded-lg focus:ring-2 focus:ring-primary-green-500 focus:border-transparent placeholder-primary-black-500"
                  placeholder="Enter your team name"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating Team...' : 'Create Team & Get Starter Pack'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Content Section */}
            {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Simulated Season Banner */}
        {simulatedSeason && !simulatedSeason.is_complete && (
          <section aria-label="Simulated Season Controls" className="mt-6">
            <div className="bg-blue-900/20 border-2 border-blue-500 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-blue-300 mb-2">
                    🤖 {simulatedSeason.season_name}
                  </h2>
                  <p className="text-primary-black-300">
                    Week {simulatedSeason.current_week} of {simulatedSeason.total_weeks} • Testing Mode
                  </p>
                  <div className="mt-2 space-y-1">
                    {userRank && userRank.projectedPoints !== undefined && (
                      <p className="text-primary-green-400 font-semibold text-sm">
                        🎯 Your Projected Score: {parseFloat(userRank.projectedPoints).toFixed(1)} pts
                      </p>
                    )}
                    {projectedAverage && (
                      <p className="text-blue-400 font-semibold text-sm">
                        📊 Bot Team Average: {projectedAverage} pts (Score to beat!)
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      if (confirm('Are you sure you want to end this simulated season? Your team and all bot teams will be deleted.')) {
                        try {
                          const { error } = await supabase.rpc('delete_simulated_season', {
                            p_season_id: simulatedSeason.id
                          });
                          if (error) throw error;
                          navigate('/fantasy');
                        } catch (error) {
                          console.error('Error deleting season:', error);
                          alert('Failed to delete season');
                        }
                      }
                    }}
                    className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-700 text-red-400 font-medium rounded-lg transition-colors"
                  >
                    End Season
                  </button>
                  <button
                    onClick={handleSimulateWeek}
                    disabled={simulating}
                    className="px-6 py-3 bg-primary-green-500 hover:bg-primary-green-400 disabled:bg-primary-black-700 disabled:text-primary-black-500 text-primary-black-950 font-bold rounded-lg transition-colors flex items-center gap-2"
                  >
                    {simulating ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Simulating...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Simulate Week {simulatedSeason.current_week}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="mt-4 text-sm text-blue-300">
                💡 Set your lineup, manage your team, then click "Simulate Week" to see results against bot teams!
              </div>
            </div>
          </section>
        )}
        
        {/* Season Complete Banner */}
        {simulatedSeason && simulatedSeason.is_complete && (
          <section aria-label="Season Complete" className="mt-6">
            <div className="bg-primary-green-900/20 border-2 border-primary-green-500 rounded-xl p-6 text-center">
              <h2 className="text-2xl font-bold text-primary-green-400 mb-2">
                🏆 Season Complete!
              </h2>
              <p className="text-primary-black-300 mb-4">
                Your simulated season has finished. Check the leaderboard to see your final ranking!
              </p>
              <button
                onClick={() => navigate('/fantasy')}
                className="px-6 py-3 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-lg transition-colors"
              >
                Back to Teams
              </button>
            </div>
          </section>
        )}
        
        {/* Live Score Widget - Only shown during active games */}
        <section aria-label="Live Game Updates" className="mt-6">
          <LiveScoreWidget />
        </section>

        {/* Starting Lineup Grid - Read Only */}
        {activeTeam && initialInventory && (
          <section aria-label="Starting Lineup Grid" className="mt-6">
            <LineupGridReadOnly
              lineup={lineup}
              liveGameData={liveGameData}
              projections={projections}
              inventory={initialInventory}
            />
          </section>
        )}

        {/* Dashboard Stats Section - Split Layout */}
        {activeTeam && initialInventory && (
          <section aria-label="Dashboard Overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT SIDE: Leaderboard Preview (15 slots) */}
              <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-xl">
                <div className="border-b-2 border-primary-black-700 px-6 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-primary-black-50">Leaderboard</h3>
                      <p className="text-xs text-primary-black-400 mt-0.5">
                        Week {currentWeek?.week} Standings
                        {lastDataRefresh && (
                          <span className="ml-2 text-primary-black-500">• Updated {getTimeAgo(lastDataRefresh)}</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/leaderboard')}
                      className="text-xs text-primary-green-500 hover:text-primary-green-400 font-semibold"
                    >
                      View Full →
                    </button>
                  </div>
                  
                  {/* Sort Filters */}
                  <div>
                    <div className="mb-2">
                      <span className="text-xs font-semibold text-primary-black-400 uppercase tracking-wide">
                        Sort By:
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                      {/* Week Selector - Only show when sorting by week */}
                      {leaderboardSortBy === 'week' && currentWeek && (
                        <select
                          value={selectedWeek !== null ? selectedWeek : currentWeek.week}
                          onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                          className="px-3 py-2 rounded-lg text-xs font-medium bg-primary-black-800 text-primary-black-300 border border-primary-black-700 hover:bg-primary-black-700"
                        >
                          {Array.from({ length: currentWeek.week }, (_, i) => i + 1).map(week => (
                            <option key={week} value={week}>
                              Week {week}
                            </option>
                          ))}
                        </select>
                      )}
                      
                      <button
                        onClick={() => setLeaderboardSortBy('week')}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                          leaderboardSortBy === 'week'
                            ? 'bg-primary-green-500 text-primary-black-950 shadow-lg'
                            : 'bg-primary-black-800 text-primary-black-300 hover:bg-primary-black-700 hover:text-primary-black-100'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] opacity-75">Week {currentWeek?.week}</span>
                          <span>Points</span>
                        </div>
                      </button>
                      <button
                        onClick={() => setLeaderboardSortBy('projected')}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                          leaderboardSortBy === 'projected'
                            ? 'bg-primary-green-500 text-primary-black-950 shadow-lg'
                            : 'bg-primary-black-800 text-primary-black-300 hover:bg-primary-black-700 hover:text-primary-black-100'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] opacity-75">Projected</span>
                          <span>Points</span>
                        </div>
                      </button>
                      <button
                        onClick={() => setLeaderboardSortBy('season')}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                          leaderboardSortBy === 'season'
                            ? 'bg-primary-green-500 text-primary-black-950 shadow-lg'
                            : 'bg-primary-black-800 text-primary-black-300 hover:bg-primary-black-700 hover:text-primary-black-100'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] opacity-75">Season</span>
                          <span>Total</span>
                        </div>
                      </button>
                      <button
                        onClick={() => setLeaderboardSortBy('wins')}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                          leaderboardSortBy === 'wins'
                            ? 'bg-primary-green-500 text-primary-black-950 shadow-lg'
                            : 'bg-primary-black-800 text-primary-black-300 hover:bg-primary-black-700 hover:text-primary-black-100'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] opacity-75">Win/Loss</span>
                          <span>Record</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  {loadingLeaderboard ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-green-500"></div>
                        <p className="text-primary-black-400 text-sm">Loading leaderboard...</p>
                      </div>
                    </div>
                  ) : getSortedDashboardLeaderboard().slice(0, 15).length > 0 ? (
                    <div>
                      {getSortedDashboardLeaderboard().slice(0, 15).map((entry, index) => {
                        const isCurrentUser = entry.team && user && entry.team.user.id === user.id;
                        // Only show as eliminated if in a simulated season AND not active
                        const isEliminated = simulatedSeason && entry.teamData && !entry.teamData.is_active;
                        
                        return (
                          <div
                            key={entry.team?.id || `team-${index}`}
                            className={`
                              flex items-center gap-3 px-3 py-3 transition-all cursor-pointer
                              hover:bg-primary-green-500/10 border-l-4 border-transparent hover:border-primary-green-500
                              ${index % 2 === 0 ? 'bg-primary-black-900' : 'bg-primary-black-800/50'}
                              ${isCurrentUser ? 'bg-green-900/20 !border-green-500' : ''}
                              ${entry.isEmpty ? 'opacity-30' : ''}
                              ${isEliminated ? 'opacity-40 grayscale' : ''}
                            `}
                          >
                            {/* Rank Badge */}
                            <span className={`px-2 py-0.5 ${isEliminated ? 'bg-red-900 text-red-400' : 'bg-primary-black-700 text-primary-black-300'} rounded text-xs font-semibold flex-shrink-0`}>
                              #{index + 1}
                              {isEliminated && ' 💀'}
                            </span>

                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-md bg-primary-black-700 flex items-center justify-center flex-shrink-0">
                              {!entry.isEmpty && entry.team?.user.avatar_url ? (
                                <img
                                  src={entry.team.user.avatar_url}
                                  alt={entry.team.user.username}
                                  className="w-10 h-10 rounded-md object-cover"
                                />
                              ) : !entry.isEmpty && entry.team ? (
                                <div className="w-10 h-10 rounded-md bg-primary-green-500 flex items-center justify-center text-primary-black-950 text-sm font-bold">
                                  {entry.team.user.username[0].toUpperCase()}
                                </div>
                              ) : (
                                <svg className="w-6 h-6 text-primary-black-300" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </svg>
                              )}
                            </div>

                            {/* Team Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-primary-black-50 truncate text-base">
                                  {entry.isEmpty ? '-' : entry.team?.team_name}
                                </h4>
                                {isCurrentUser && !entry.isEmpty && !entry.team?.is_bot && (
                                  <span className="text-xs text-primary-green-500 font-semibold">(You)</span>
                                )}
                                {isEliminated && (
                                  <span className="text-xs bg-red-900 text-red-400 px-2 py-0.5 rounded font-semibold">ELIMINATED</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-primary-black-400">
                                <span className="font-medium">
                                  {entry.isEmpty ? '-' : entry.team?.is_bot ? '@Bot Team' : `@${entry.team?.user.username}`}
                                </span>
                              </div>
                            </div>

                            {/* Metrics - Dynamic based on sort with prominent primary display */}
                            <div className="flex items-center gap-4 flex-shrink-0 ml-auto">
                              {/* Primary Metric */}
                              <div className="text-center min-w-[80px]">
                                <div className="text-xs text-primary-black-500 mb-0.5 uppercase tracking-wide font-semibold">
                                  {leaderboardSortBy === 'week' && 'Week 12'}
                                  {leaderboardSortBy === 'projected' && 'Projected'}
                                  {leaderboardSortBy === 'season' && 'Season'}
                                  {leaderboardSortBy === 'wins' && 'Record'}
                                </div>
                                <div className={`font-bold text-xl ${
                                  leaderboardSortBy === 'week' || leaderboardSortBy === 'season' 
                                    ? 'text-primary-green-400' 
                                    : leaderboardSortBy === 'projected' 
                                    ? 'text-blue-400' 
                                    : 'text-white'
                                }`}>
                                  {leaderboardSortBy === 'week' && (
                                    (entry.isEmpty || entry.total_points === null) ? '-' : parseFloat(entry.total_points).toFixed(1)
                                  )}
                                  {leaderboardSortBy === 'projected' && (
                                    (entry.isEmpty || entry.projectedPoints === undefined || entry.projectedPoints === null)
                                      ? '-' 
                                      : parseFloat(entry.projectedPoints).toFixed(1)
                                  )}
                                  {leaderboardSortBy === 'season' && (
                                    (entry.isEmpty || !entry.teamData) ? '-' : parseFloat(entry.teamData.total_points || 0).toFixed(1)
                                  )}
                                  {leaderboardSortBy === 'wins' && (
                                    (entry.isEmpty || !entry.teamData) ? (
                                      '-'
                                    ) : (
                                      <>
                                        <span className="text-primary-green-400">{entry.teamData.wins || 0}</span>
                                        <span className="text-primary-black-400">-</span>
                                        <span className="text-red-400">{entry.teamData.losses || 0}</span>
                                      </>
                                    )
                                  )}
                                </div>
                              </div>

                              {/* Secondary Contextual Info */}
                              <div className="text-center min-w-[70px]">
                                {leaderboardSortBy === 'week' && entry.beat_median !== null && (
                                  <div className={`text-xs font-semibold ${entry.beat_median ? 'text-primary-green-400' : 'text-red-400'}`}>
                                    {entry.beat_median ? '✓ Beat' : '✗ Below'}<br/>Median
                                  </div>
                                )}
                                {leaderboardSortBy === 'projected' && !entry.isEmpty && (
                                  <div className="text-xs text-primary-black-500">
                                    <div className="font-semibold">{entry.lineupCount || 0}/8</div>
                                    <div>players</div>
                                  </div>
                                )}
                                {leaderboardSortBy === 'season' && entry.teamData && (
                                  <div className="text-xs text-primary-black-500">
                                    <span className="text-primary-green-400 font-semibold">{entry.teamData.wins || 0}</span>
                                    <span className="text-primary-black-400">-</span>
                                    <span className="text-red-400 font-semibold">{entry.teamData.losses || 0}</span>
                                  </div>
                                )}
                                {leaderboardSortBy === 'wins' && entry.teamData && (
                                  <div className="text-xs text-primary-black-500">
                                    <div className="font-semibold text-primary-green-400">
                                      {parseFloat(entry.teamData.total_points || 0).toFixed(1)}
                                    </div>
                                    <div>pts</div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Drag Handle */}
                            <div className="flex-shrink-0 text-primary-black-600 text-xl">
                              ⋮⋮
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-primary-black-400">
                      <p className="text-sm">No leaderboard data yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT SIDE: Stacked Cards */}
              <div className="space-y-6">
                {/* Top 5 Cards */}
                <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-xl">
                  <div className="border-b-2 border-primary-black-700 px-6 py-4">
                    <div>
                      <h3 className="text-xl font-bold text-primary-black-50">Top Performers</h3>
                      <p className="text-xs text-primary-black-400 mt-0.5">Your Best 5 Cards</p>
                    </div>
                  </div>
                  <div>
                    {(() => {
                      // Get only players in the starting lineup (not bench)
                      const lineupPositions = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'FLEX'];
                      const lineupPlayers = lineupPositions
                        .map(pos => lineup[pos])
                        .filter(player => player != null);
                      
                      // Sort by actual points (live/final) or projection
                      const topPlayers = [...lineupPlayers]
                        .sort((a, b) => {
                          // Calculate actual + projected points for each player
                          const getPlayerTotal = (player) => {
                            const gameData = liveGameData?.get(player.player_card.player_id);
                            const statusLower = gameData?.gameStatus?.toLowerCase();
                            
                            // If game is final or live, use actual points
                            if (gameData && (statusLower === 'final' || statusLower === 'live' || statusLower === 'halftime')) {
                              return gameData.currentPoints || 0;
                            }
                            
                            // Otherwise use projection
                            return projections?.get(player.player_card.player_id)?.projected || 0;
                          };
                          
                          return getPlayerTotal(b) - getPlayerTotal(a);
                        })
                        .slice(0, 5);

                      if (topPlayers.length === 0) {
                        return (
                          <div className="text-center py-8 text-primary-black-400">
                            <p className="text-sm">No player cards yet</p>
                          </div>
                        );
                      }

                      return (
                        <div>
                          {topPlayers.map((player, index) => {
                            const gameData = liveGameData?.get(player.player_card.player_id);
                            const statusLower = gameData?.gameStatus?.toLowerCase();
                            const hasGameStarted = gameData && (statusLower === 'final' || statusLower === 'live' || statusLower === 'halftime');
                            const points = hasGameStarted ? (gameData.currentPoints || 0) : (projections?.get(player.player_card.player_id)?.projected || 0);
                            const isLive = statusLower === 'live' || statusLower === 'halftime';
                            const isFinal = statusLower === 'final';
                            
                            return (
                              <div
                                key={player.id}
                                className={`
                                  flex items-center gap-3 px-3 py-3 transition-all cursor-pointer
                                  hover:bg-primary-green-500/10 border-l-4 border-transparent hover:border-primary-green-500
                                  ${index % 2 === 0 ? 'bg-primary-black-900' : 'bg-primary-black-800/50'}
                                `}
                              >
                                {/* Position Badge */}
                                <span className="px-2 py-0.5 bg-primary-black-700 text-primary-black-300 rounded text-xs font-semibold flex-shrink-0">
                                  {player.player_card.position === 'Quarterback' ? 'QB' :
                                   player.player_card.position === 'Running Back' ? 'HB' :
                                   player.player_card.position === 'Wide Receiver' ? 'WR' :
                                   player.player_card.position === 'Tight End' ? 'TE' :
                                   player.player_card.position}
                                </span>

                                {/* Player Avatar */}
                                <div className="w-10 h-10 rounded-md bg-primary-black-700 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-6 h-6 text-primary-black-300" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                  </svg>
                                </div>

                                {/* Player Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-primary-black-50 truncate text-base">
                                      {player.player_card.player_name}
                                    </h4>
                                    <span className="text-xs text-primary-black-500 font-medium">
                                      {player.player_card.team_abbreviation}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-primary-black-400">
                                    <span className="font-medium">Level {player.card_level}</span>
                                  </div>
                                </div>

                                {/* Points with Status */}
                                <div className="flex flex-col items-end flex-shrink-0">
                                  <div className={`font-semibold text-sm ${
                                    isFinal ? 'text-primary-green-400' :
                                    isLive ? 'text-red-400' :
                                    'text-blue-400'
                                  }`}>
                                    {points.toFixed(1)} pts
                                  </div>
                                  <div className="text-xs text-primary-black-500">
                                    {isFinal ? 'Final' : isLive ? 'Live' : 'Proj'}
                                  </div>
                                </div>

                                {/* Drag Handle */}
                                <div className="flex-shrink-0 text-primary-black-600 text-xl">
                                  ⋮⋮
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Worst 5 Cards */}
                <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-xl">
                  <div className="border-b-2 border-primary-black-700 px-6 py-4">
                    <div>
                      <h3 className="text-xl font-bold text-primary-black-50">Underperformers</h3>
                      <p className="text-xs text-primary-black-400 mt-0.5">Your Worst 5 Cards</p>
                    </div>
                  </div>
                  <div>
                    {(() => {
                      // Get only players in the starting lineup (not bench)
                      const lineupPositions = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'FLEX'];
                      const lineupPlayers = lineupPositions
                        .map(pos => lineup[pos])
                        .filter(player => player != null);
                      
                      // Sort by actual points (live/final) or projection - ASCENDING for worst
                      const worstPlayers = [...lineupPlayers]
                        .sort((a, b) => {
                          // Calculate actual + projected points for each player
                          const getPlayerTotal = (player) => {
                            const gameData = liveGameData?.get(player.player_card.player_id);
                            const statusLower = gameData?.gameStatus?.toLowerCase();
                            
                            // If game is final or live, use actual points
                            if (gameData && (statusLower === 'final' || statusLower === 'live' || statusLower === 'halftime')) {
                              return gameData.currentPoints || 0;
                            }
                            
                            // Otherwise use projection
                            return projections?.get(player.player_card.player_id)?.projected || 0;
                          };
                          
                          return getPlayerTotal(a) - getPlayerTotal(b);
                        })
                        .slice(0, 5);

                      if (worstPlayers.length === 0) {
                        return (
                          <div className="text-center py-8 text-primary-black-400">
                            <p className="text-sm">No player cards yet</p>
                          </div>
                        );
                      }

                      return (
                        <div>
                          {worstPlayers.map((player, index) => {
                            const gameData = liveGameData?.get(player.player_card.player_id);
                            const statusLower = gameData?.gameStatus?.toLowerCase();
                            const hasGameStarted = gameData && (statusLower === 'final' || statusLower === 'live' || statusLower === 'halftime');
                            const points = hasGameStarted ? (gameData.currentPoints || 0) : (projections?.get(player.player_card.player_id)?.projected || 0);
                            const isLive = statusLower === 'live' || statusLower === 'halftime';
                            const isFinal = statusLower === 'final';
                            
                            return (
                              <div
                                key={player.id}
                                className={`
                                  flex items-center gap-3 px-3 py-3 transition-all cursor-pointer
                                  hover:bg-primary-green-500/10 border-l-4 border-transparent hover:border-primary-green-500
                                  ${index % 2 === 0 ? 'bg-primary-black-900' : 'bg-primary-black-800/50'}
                                `}
                              >
                                {/* Position Badge */}
                                <span className="px-2 py-0.5 bg-primary-black-700 text-primary-black-300 rounded text-xs font-semibold flex-shrink-0">
                                  {player.player_card.position === 'Quarterback' ? 'QB' :
                                   player.player_card.position === 'Running Back' ? 'HB' :
                                   player.player_card.position === 'Wide Receiver' ? 'WR' :
                                   player.player_card.position === 'Tight End' ? 'TE' :
                                   player.player_card.position}
                                </span>

                                {/* Player Avatar */}
                                <div className="w-10 h-10 rounded-md bg-primary-black-700 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-6 h-6 text-primary-black-300" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                  </svg>
                                </div>

                                {/* Player Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-primary-black-50 truncate text-base">
                                      {player.player_card.player_name}
                                    </h4>
                                    <span className="text-xs text-primary-black-500 font-medium">
                                      {player.player_card.team_abbreviation}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-primary-black-400">
                                    <span className="font-medium">Level {player.card_level}</span>
                                  </div>
                                </div>

                                {/* Points with Status */}
                                <div className="flex flex-col items-end flex-shrink-0">
                                  <div className={`font-semibold text-sm ${
                                    isFinal ? 'text-primary-green-400' :
                                    isLive ? 'text-red-400' :
                                    'text-blue-400'
                                  }`}>
                                    {points.toFixed(1)} pts
                                  </div>
                                  <div className="text-xs text-primary-black-500">
                                    {isFinal ? 'Final' : isLive ? 'Live' : 'Proj'}
                                  </div>
                                </div>

                                {/* Drag Handle */}
                                <div className="flex-shrink-0 text-primary-black-600 text-xl">
                                  ⋮⋮
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Injury Report */}
                <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-xl">
                  <div className="border-b-2 border-primary-black-700 px-6 py-4">
                    <div>
                      <h3 className="text-xl font-bold text-primary-black-50">Injury Report</h3>
                      <p className="text-xs text-primary-black-400 mt-0.5">
                        {(() => {
                          const injuredPlayers = initialInventory.players.filter(
                            p => p.player_card.injury_status && p.player_card.injury_status !== 'healthy'
                          );
                          if (injuredPlayers.length === 0) {
                            return <span className="text-primary-green-400 font-semibold">All players healthy</span>;
                          }
                          return `${injuredPlayers.length} injured player${injuredPlayers.length !== 1 ? 's' : ''}`;
                        })()}
                      </p>
                    </div>
                  </div>
                  <div>
                    {(() => {
                      const injuredPlayers = initialInventory.players.filter(
                        p => p.player_card.injury_status && p.player_card.injury_status !== 'healthy'
                      );
                      
                      if (injuredPlayers.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <div className="text-4xl mb-2">✅</div>
                            <p className="text-primary-green-400 font-semibold text-sm">No injuries</p>
                          </div>
                        );
                      }
                      
                      return (
                        <div>
                          {injuredPlayers.slice(0, 5).map((player, index) => {
                            const getInjuryColor = (status) => {
                              const lowerStatus = status.toLowerCase();
                              if (lowerStatus.includes('out')) return 'bg-red-600 text-red-100';
                              if (lowerStatus.includes('doubtful')) return 'bg-orange-600 text-orange-100';
                              if (lowerStatus.includes('questionable')) return 'bg-yellow-600 text-yellow-100';
                              return 'bg-blue-600 text-blue-100';
                            };
                            
                            return (
                              <div
                                key={player.id}
                                className={`
                                  flex items-center gap-3 px-3 py-3 transition-all cursor-pointer
                                  hover:bg-primary-green-500/10 border-l-4 border-red-500
                                  ${index % 2 === 0 ? 'bg-primary-black-900' : 'bg-primary-black-800/50'}
                                `}
                              >
                                {/* Position Badge */}
                                <span className="px-2 py-0.5 bg-primary-black-700 text-primary-black-300 rounded text-xs font-semibold flex-shrink-0">
                                  {player.player_card.position === 'Quarterback' ? 'QB' :
                                   player.player_card.position === 'Running Back' ? 'HB' :
                                   player.player_card.position === 'Wide Receiver' ? 'WR' :
                                   player.player_card.position === 'Tight End' ? 'TE' :
                                   player.player_card.position}
                                </span>

                                {/* Player Avatar */}
                                <div className="w-10 h-10 rounded-md bg-primary-black-700 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-6 h-6 text-primary-black-300" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                  </svg>
                                </div>

                                {/* Player Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-primary-black-50 truncate text-base">
                                      {player.player_card.player_name}
                                    </h4>
                                    <span className="text-xs text-primary-black-500 font-medium">
                                      {player.player_card.team_abbreviation}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-primary-black-400">
                                    <span className="font-medium">Level {player.card_level}</span>
                                  </div>
                                </div>

                                {/* Injury Status */}
                                <span className={`px-3 py-1.5 rounded text-xs font-bold flex-shrink-0 ${getInjuryColor(player.player_card.injury_status)}`}>
                                  {player.player_card.injury_status.toLowerCase().includes('out') ? 'O' :
                                   player.player_card.injury_status.toLowerCase().includes('doubtful') ? 'D' :
                                   player.player_card.injury_status.toLowerCase().includes('questionable') ? 'Q' :
                                   player.player_card.injury_status.toUpperCase()}
                                </span>

                                {/* Drag Handle */}
                                <div className="flex-shrink-0 text-primary-black-600 text-xl">
                                  ⋮⋮
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Full Injury Report Section - Original kept for reference */}
        {activeTeam && initialInventory && false && (
          <section aria-label="Injury Report" className="mt-6">
            <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-xl">
              {/* Header */}
              <div className="border-b-2 border-primary-black-700 rounded-t-xl bg-primary-black-900">
                <div className="px-4 py-4">
                  <div className="flex-shrink-0">
                    <h3 className="text-xl font-bold text-primary-black-50 flex items-center gap-2">
                      Injury Report
                    </h3>
                    <p className="text-xs text-primary-black-400 mt-0.5">
                      {(() => {
                        const injuredPlayers = initialInventory.players.filter(
                          p => p.player_card.injury_status && p.player_card.injury_status !== 'healthy'
                        );
                        if (injuredPlayers.length === 0) {
                          return <span className="text-primary-green-400 font-semibold">All players are healthy</span>;
                        }
                        const inLineupCount = injuredPlayers.filter(p => 
                          lineup[Object.keys(lineup).find(key => lineup[key]?.id === p.id)]
                        ).length;
                        return (
                          <>
                            <span className="font-bold text-primary-black-400">
                              {injuredPlayers.length} injured player{injuredPlayers.length !== 1 ? 's' : ''}
                            </span>
                            {inLineupCount > 0 && (
                              <span className="ml-2 text-red-400 font-semibold">
                                • {inLineupCount} in lineup
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div>
                {(() => {
                  const injuredPlayers = initialInventory.players.filter(
                    p => p.player_card.injury_status && p.player_card.injury_status !== 'healthy'
                  );
                  
                  if (injuredPlayers.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <div className="text-5xl mb-3">✅</div>
                        <p className="text-primary-green-400 font-semibold text-lg">No injuries reported</p>
                        <p className="text-primary-black-400 text-sm mt-2">All your players are healthy!</p>
                      </div>
                    );
                  }
                  
                  return injuredPlayers.map((player, index) => {
                    const isInLineup = lineup[Object.keys(lineup).find(key => lineup[key]?.id === player.id)];
                    const injuryStatus = player.player_card.injury_status;
                    const projection = projections?.get(player.player_card.player_id);
                    const gameData = liveGameData?.get(player.player_card.player_id);
                    
                    // Determine severity color
                    const getInjuryColor = (status) => {
                      const lowerStatus = status.toLowerCase();
                      if (lowerStatus.includes('out')) return 'bg-red-600 text-red-100';
                      if (lowerStatus.includes('doubtful')) return 'bg-orange-600 text-orange-100';
                      if (lowerStatus.includes('questionable')) return 'bg-yellow-600 text-yellow-100';
                      return 'bg-blue-600 text-blue-100';
                    };
                    
                    return (
                      <div
                        key={player.id}
                        className={`
                          flex items-center gap-4 px-4 py-4 transition-all
                          ${isInLineup 
                            ? 'bg-red-900/20 border-l-4 border-red-500' 
                            : `border-l-4 border-transparent ${index % 2 === 0 ? 'bg-primary-black-900' : 'bg-primary-black-800/50'}`
                          }
                        `}
                      >
                        {/* Position Badge */}
                        <span className="px-2 py-0.5 bg-primary-black-700 text-primary-black-300 rounded text-xs font-semibold flex-shrink-0">
                          {player.player_card.position === 'Quarterback' ? 'QB' :
                           player.player_card.position === 'Running Back' ? 'RB' :
                           player.player_card.position === 'Wide Receiver' ? 'WR' :
                           player.player_card.position === 'Tight End' ? 'TE' :
                           player.player_card.position}
                        </span>

                        {/* Person Icon */}
                        <div className="w-10 h-10 rounded-md bg-primary-black-700 flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-primary-black-300" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                        </div>

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-primary-black-50 truncate text-base">
                              {player.player_card.player_name}
                            </h4>
                            <span className="text-xs text-primary-black-500 font-medium">
                              {player.player_card.team_abbreviation}
                            </span>
                          </div>
                         
                          <div className="flex items-center gap-2 text-xs text-primary-black-400">
                            {isInLineup && (
                              <>
                                <span className="text-red-400 font-semibold flex items-center gap-1">
                                  In Lineup ({player.lineup_position})
                                </span>
                                <span className="text-primary-black-600">•</span>
                              </>
                            )}
                            <span className="font-medium">Level {player.card_level}</span>
                          </div>
                        </div>

                        {/* Injury Status Badge */}
                        <div className="flex-shrink-0">
                          <span className={`px-3 py-1.5 rounded text-xs font-bold ${getInjuryColor(injuryStatus)}`}>
                            {injuryStatus.toLowerCase().includes('out') ? 'O' :
                             injuryStatus.toLowerCase().includes('doubtful') ? 'D' :
                             injuryStatus.toLowerCase().includes('questionable') ? 'Q' :
                             injuryStatus.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Elimination Modal */}
      {showEliminationModal && eliminationStats && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl max-w-lg w-full p-8 border-2 border-red-500 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🏁</div>
              <h2 className="text-3xl font-dk-display font-bold text-white mb-2">
                Season Over
              </h2>
              <p className="text-xl text-red-400 font-bold">You Were Eliminated!</p>
            </div>

            {/* Stats */}
            <div className="bg-black bg-opacity-40 rounded-xl p-6 mb-6 space-y-3">
              <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                <span className="text-gray-400">Weeks Played:</span>
                <span className="text-white font-bold text-lg">{eliminationStats.weeksPlayed}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                <span className="text-gray-400">Final Rank:</span>
                <span className="text-white font-bold text-lg">
                  #{eliminationStats.finalRank} of {eliminationStats.totalTeams}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                <span className="text-gray-400">Last Week Points:</span>
                <span className="text-white font-bold text-lg">{eliminationStats.weekPoints} pts</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Result:</span>
                <span className="text-red-400 font-bold text-lg flex items-center gap-2">
                  {eliminationStats.losses} Losses <span className="text-2xl">❌</span>
                </span>
              </div>
            </div>

            {/* Message */}
            <p className="text-center text-gray-300 mb-6">
              Better luck next time! 💪
            </p>

            {/* Button */}
            <button
              onClick={() => {
                setShowEliminationModal(false);
                navigate('/fantasy');
              }}
              className="w-full bg-gradient-to-r from-dk-green-primary to-green-600 hover:from-green-600 hover:to-dk-green-primary text-white font-dk-display font-bold py-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Return to Teams
            </button>
          </div>
        </div>
      )}
    </>
  );
}
