import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../services/supabase';

// TEMPORARY: Using debug version to troubleshoot live updates
export default function FantasyNavBanner({ 
  username, 
  teamName, 
  wins, 
  losses, 
  coins,
  teamId,
  userId,
  liveGameData,
  lineup,
  projections,
  team, // ADD team prop to get contest info
  currentWeek: contextCurrentWeek, // Get current week from FantasyContext to prevent flash
  previewMode = false // If true, show next week when current week is finalized (for Starting Lineup page only)
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentWeek, setCurrentWeek] = useState(contextCurrentWeek || null);
  const [displayWeek, setDisplayWeek] = useState(null); // The week to actually display (may be +1 in preview mode)
  const [projectedPoints, setProjectedPoints] = useState(0);
  const [globalStats, setGlobalStats] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [isFinal, setIsFinal] = useState(false);
  const [livePoints, setLivePoints] = useState(0);
  const [projectedFinal, setProjectedFinal] = useState(0);
  const [teamImage, setTeamImage] = useState(null);
  const [localTeamName, setLocalTeamName] = useState(teamName);
  const [hasWeeklyLineup, setHasWeeklyLineup] = useState(false); // Track if team has lineup for current week
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(teamName);
  const [uploading, setUploading] = useState(false);
  const nameInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [simulatedSeasonId, setSimulatedSeasonId] = useState(null);
  const [simulatedAverage, setSimulatedAverage] = useState(null);
  const averageCalculatedRef = useRef(false);
  const [weekIsFinalized, setWeekIsFinalized] = useState(false); // Track if current week is finalized

  const navItems = [
    { path: `/teams/${teamId}/dashboard`, label: 'DASHBOARD' },
    { path: `/teams/${teamId}/starting-lineup`, label: 'STARTING LINEUP' },
    { path: `/teams/${teamId}/manage-team`, label: 'MANAGE TEAM' },
    { path: `/teams/${teamId}/leaderboard`, label: 'LEADERBOARD' },
    { path: `/teams/${teamId}/pack-shop`, label: 'PACK SHOP' }
  ];

  // Fetch team image and name when component mounts or teamId changes
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
          
          // If in simulated season, calculate projected average ONCE
          if (data.simulated_season_id && currentWeek && !averageCalculatedRef.current) {
            averageCalculatedRef.current = true;
            calculateSimulatedAverage(data.simulated_season_id);
          }
        }
      };

      fetchTeamData();
    }
  }, [teamId]); // Removed currentWeek dependency to prevent infinite loop

  // Update local team name when prop changes
  useEffect(() => {
    setLocalTeamName(teamName);
    setEditedName(teamName);
  }, [teamName]);

  // Update currentWeek state when context updates
  useEffect(() => {
    if (contextCurrentWeek) {
      setCurrentWeek(contextCurrentWeek);
    }
  }, [contextCurrentWeek]);

  // Check finalization status and set displayWeek
  useEffect(() => {
    if (!currentWeek || !teamId) {
      setDisplayWeek(null);
      return;
    }

    const checkWeekStatus = async () => {
      console.log('🔄 Checking week status - previewMode:', previewMode, 'currentWeek:', currentWeek.week, 'teamCurrentWeek:', team?.current_week);
      
      // CRITICAL FIX: If team hasn't started yet (team.current_week > NFL current week),
      // display the team's starting week, not the NFL's current week
      if (team?.current_week && team.current_week > currentWeek.week) {
        const teamStartWeek = {
          week: team.current_week,
          year: currentWeek.year
        };
        setDisplayWeek(teamStartWeek);
        setWeekIsFinalized(false);
        setIsLive(false);
        setIsFinal(false);
        setGlobalStats(null);
        setHasWeeklyLineup(false);
        console.log('🆕 NEW TEAM: Team starts in week', team.current_week, '(NFL is on week', currentWeek.week, ')');
        return;
      }
      
      // Check if CURRENT week is finalized
      const { data: lineupData } = await supabase
        .from('weekly_lineups')
        .select('status')
        .eq('team_id', teamId)
        .eq('week_number', currentWeek.week)
        .eq('season_year', currentWeek.year)
        .maybeSingle();

      const isFinalized = lineupData?.status === 'completed';
      setWeekIsFinalized(isFinalized);

      // PREVIEW MODE LOGIC (Starting Lineup page only)
      // If current week is finalized AND we're in preview mode, show next week
      if (previewMode && isFinalized) {
        const nextWeek = {
          week: currentWeek.week + 1,
          year: currentWeek.year
        };
        setDisplayWeek(nextWeek);
        // Force state updates for preview mode
        setIsLive(false);
        setIsFinal(false);
        setGlobalStats(null);
        setHasWeeklyLineup(false);
        console.log('🔮 PREVIEW MODE ACTIVATED: Current week', currentWeek.week, 'is finalized. Showing next week', nextWeek.week);
      } else {
        // Normal mode: show current week
        setDisplayWeek(currentWeek);
        // Don't clear states here - let fetchStats handle it
        console.log('📅 NORMAL MODE: Showing current week', currentWeek.week, '(previewMode:', previewMode, ', isFinalized:', isFinalized, ')');
      }
    };

    checkWeekStatus();
  }, [currentWeek, teamId, previewMode, team?.current_week]); // Re-run when team.current_week changes!

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameClick = () => {
    setIsEditingName(true);
    setEditedName(localTeamName);
  };

  const handleNameChange = (e) => {
    setEditedName(e.target.value);
  };

  const handleNameBlur = async () => {
    if (editedName.trim() && editedName !== localTeamName) {
      try {
        const { error } = await supabase
          .from('teams')
          .update({ team_name: editedName.trim() })
          .eq('id', teamId);

        if (error) throw error;
        setLocalTeamName(editedName.trim());
      } catch (err) {
        console.error('Error updating team name:', err);
        setEditedName(localTeamName); // Revert on error
      }
    } else {
      setEditedName(localTeamName); // Revert if empty or unchanged
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      nameInputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditedName(localTeamName);
      setIsEditingName(false);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB');
      return;
    }

    try {
      setUploading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${teamId}-${Date.now()}.${fileExt}`;

      // Delete old image if it exists
      if (teamImage) {
        const oldPath = teamImage.split('/').slice(-2).join('/');
        await supabase.storage
          .from('team-images')
          .remove([oldPath]);
      }

      // Upload new image
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('team-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('team-images')
        .getPublicUrl(uploadData.path);

      // Update team in database
      const { error: updateError } = await supabase
        .from('teams')
        .update({ team_image_url: publicUrl })
        .eq('id', teamId);

      if (updateError) throw updateError;

      setTeamImage(publicUrl);
    } catch (err) {
      console.error('Error uploading image:', err);
      alert(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Fetch current week from nfl_season_config (single source of truth)
  useEffect(() => {
    const fetchCurrentWeek = async () => {
      try {
        const { data, error } = await supabase
          .from('nfl_season_config')
          .select('current_week, season_year')
          .eq('is_active', true)
          .single();

        if (error) throw error;
        if (data) {
          setCurrentWeek({ week: data.current_week, year: data.season_year });
          console.log('📅 Current week set from nfl_season_config:', data.current_week, data.season_year);
        } else {
          // Fallback to week 11 if no config found
          setCurrentWeek({ week: 11, year: 2025 });
          console.log('📅 Using fallback week: 11, 2025');
        }
      } catch (error) {
        console.error('Error fetching current week:', error);
        // Fallback to week 11 if error
        setCurrentWeek({ week: 11, year: 2025 });
        console.log('📅 Using fallback week after error: 11, 2025');
      }
    };

    fetchCurrentWeek();
  }, []);

  // Calculate projected average for simulated season
  const calculateSimulatedAverage = async (seasonId) => {
    if (!currentWeek || !teamId) {
      console.log('⏸️ Skipping average calculation - no current week or team');
      return;
    }
    
    console.log('📊 Calculating simulated average once...');
    
    try {
      
      // Get all bot teams in the simulated season (exclude user's team)
      const { data: botLineups, error } = await supabase
        .from('weekly_lineups')
        .select(`
          lineup_snapshot,
          team_id,
          team:teams!inner(simulated_season_id, is_bot)
        `)
        .eq('team.simulated_season_id', seasonId)
        .eq('team.is_bot', true)
        .eq('week_number', currentWeek.week)
        .eq('season_year', currentWeek.year);
      
      if (error) throw error;
      
      if (!botLineups || botLineups.length === 0) return;
      
      let totalProjected = 0;
      let teamCount = 0;
      
      for (const lineup of botLineups) {
        if (!lineup.lineup_snapshot) continue;
        
        let teamProjected = 0;
        const positions = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE'];
        
        for (const pos of positions) {
          const playerData = lineup.lineup_snapshot[pos];
          if (playerData && playerData.player_id) {
            // Use same deterministic calculation as Dashboard
            const positionMap = {
              'Quarterback': { min: 12, max: 30 },
              'Running Back': { min: 6, max: 22 },
              'Wide Receiver': { min: 4, max: 19 },
              'Tight End': { min: 3, max: 14 }
            };
            
            // Get position - first from snapshot, fallback to query
            let position = playerData.position;
            
            if (!position) {
              // Fallback: query player_cards for position
              const { data: playerCard } = await supabase
                .from('player_cards')
                .select('position')
                .eq('id', playerData.player_id)
                .single();
              position = playerCard?.position;
            }
            
            const range = positionMap[position] || { min: 5, max: 15 };
            const baseAvg = (range.min + range.max) / 2;
            
            // Add weekly variance: ±30% based on player_id + week (MATCHES DASHBOARD)
            const seed = parseInt(playerData.player_id.replace(/-/g, '').substring(0, 8), 16);
            const weekSeed = (seed * 37 + (currentWeek?.week || 1) * 997) % 1000;
            const weekVariance = ((weekSeed % 200) - 100) / 333;
            
            let points = baseAvg * (1 + weekVariance);
            points = Math.max(range.min * 0.7, Math.min(range.max * 1.3, points));
            teamProjected += points;
          }
        }
        
        if (teamProjected > 0) {
          totalProjected += teamProjected;
          teamCount++;
        }
      }
      
      if (teamCount > 0) {
        const avg = totalProjected / teamCount;
        setSimulatedAverage(avg.toFixed(1));
        console.log('🤖 Bot team average (only bots):', avg.toFixed(1), 'pts from', teamCount, 'teams');
      }
    } catch (error) {
      console.error('Error calculating simulated average:', error);
    }
  };

  // Calculate projected points from lineup prop whenever it changes
  useEffect(() => {
    if (!lineup || !projections || projections.size === 0) {
      console.log('⏳ Waiting for projections to load...');
      return;
    }
    
    const positions = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'FLEX'];
    let total = 0;
    let foundProjections = 0;
    
    positions.forEach(pos => {
      const player = lineup[pos];
      if (player?.player_card) {
        // Get projection from projections Map (this is what player cards display)
        const projection = projections.get(player.player_card.player_id);
        if (projection?.projected) {
          total += projection.projected;
          foundProjections++;
          console.log(`  ${pos}: ${player.player_card.player_name} = ${projection.projected.toFixed(1)}`);
        } else {
          console.log(`  ${pos}: ${player.player_card.player_name} = no projection yet`);
        }
      }
    });
    
    // Only update if we found projections for at least some players
    if (foundProjections > 0) {
      setProjectedPoints(total);
      console.log(`📊 Total projected points: ${total.toFixed(1)} (from ${foundProjections} players)`);
    } else {
      console.log('⚠️ No projections found yet for any players');
    }
  }, [lineup, projections]);

  // Fetch global stats and user's lineup data
  useEffect(() => {
    if (!displayWeek || !teamId) return;

    let retryCount = 0;
    const maxRetries = 3;
    let subscription = null;
    let retryTimeout = null;
    let pollingInterval = null;

    const fetchStats = async () => {
      try {
        // CRITICAL: For simulated seasons, ALWAYS set isLive to false first
        if (simulatedSeasonId) {
          setIsLive(false);
          console.log('🤖 Simulated season detected - forcing PROJECTED status');
        }
        
        // Get global stats for display week
        const { data: globalData, error: globalError } = await supabase
          .from('weekly_global_stats')
          .select('*')
          .eq('week_number', displayWeek.week)
          .eq('season_year', displayWeek.year)
          .maybeSingle();

        if (globalError) throw globalError;
        
        console.log('📊 Global Stats:', globalData);
        setGlobalStats(globalData);

        // Get user's lineup for display week
        const { data: lineupData, error: lineupError } = await supabase
          .from('weekly_lineups')
          .select('total_points, status, lineup_snapshot')
          .eq('team_id', teamId)
          .eq('week_number', displayWeek.week)
          .eq('season_year', displayWeek.year)
          .maybeSingle();

        if (lineupError && lineupError.code !== 'PGRST116') throw lineupError;

        console.log('👤 User Lineup:', lineupData);

        // Check if week is finalized (lineup status is 'completed')
        const weekFinalizedStatus = lineupData?.status === 'completed';
        setIsFinal(weekFinalizedStatus);
        setWeekIsFinalized(weekFinalizedStatus);
        setHasWeeklyLineup(!!lineupData); // Track if lineup exists
        console.log('🏁 Week finalized:', weekFinalizedStatus);

        // In preview mode, we're looking at next week which has no data yet
        // So we force PROJECTED status and skip database queries
        if (previewMode && weekFinalizedStatus && displayWeek.week > currentWeek.week) {
          console.log('🔮 PREVIEW MODE ACTIVE: Showing next week', displayWeek.week, 'with PROJECTED status');
          setIsLive(false);
          setIsFinal(false);
          setGlobalStats(null);
          setHasWeeklyLineup(false);
          return; // Skip remaining queries for next week
        }

        // Check if week is live
        // ONLY show LIVE if the team has a weekly_lineup entry for this week
        let weekIsLive = false;
        
        if (lineupData && !simulatedSeasonId) {
          // Team must have a weekly_lineup entry to be "live"
          // For regular seasons, check if the week is "live"
          // A week is live if ANY game has started (even if finished)
          // BUT NOT if the week is finalized
          if (!weekFinalizedStatus && liveGameData && liveGameData.size > 0) {
            // Check if ANY player has a game that's started (live, halftime, or final)
            for (const [playerId, gameData] of liveGameData.entries()) {
              const statusLower = gameData?.gameStatus?.toLowerCase();
              if (statusLower === 'live' || statusLower === 'halftime' || statusLower === 'final') {
                weekIsLive = true;
                console.log('🔴 Week is LIVE - game detected:', gameData.gameStatus);
                break;
              }
            }
          }
          
          // Fallback: Query database for games that have started
          if (!weekIsLive && (!liveGameData || liveGameData.size === 0) && !weekFinalizedStatus) {
            const { data: startedGames } = await supabase
              .from('game_scores')
              .select('id, game_status')
              .eq('week_number', displayWeek.week)
              .eq('season_year', displayWeek.year)
              .in('game_status', ['live', 'halftime', 'final']);  // Any game that has started

            weekIsLive = startedGames && startedGames.length > 0;
            if (weekIsLive) {
              console.log('🔴 Week is LIVE - games from DB:', startedGames.length, 'games started');
            }
          }
        }
        
        // Set the live status
        setIsLive(weekIsLive);
        console.log('🔴 Setting isLive to:', weekIsLive, '(has lineup:', !!lineupData, ')');

        if (lineupData) {
          // Calculate live or projected points based on week status
          if (weekFinalizedStatus) {
            // Week is finalized - show final score from database
            const finalScore = lineupData.total_points || 0;
            setLivePoints(finalScore);
            setProjectedFinal(finalScore);
            console.log('🏁 FINAL - Score:', finalScore);
          } else if (weekIsLive) {
            // Calculate from lineup directly - get live stats for each player
            if (lineup) {
              let calculatedTotal = 0;
              const positions = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'FLEX'];
              const statsMap = new Map(); // Track which players have played (needed for projected final calc)
              
              // First try liveGameData if it has data
              if (liveGameData && liveGameData.size > 0) {
                console.log('🎮 Using liveGameData (Size:', liveGameData.size, ')');
                positions.forEach(pos => {
                  const player = lineup[pos];
                  if (player?.player_card?.player_id) {
                    const gameData = liveGameData.get(player.player_card.player_id);
                    if (gameData) {
                      const statusLower = gameData.gameStatus?.toLowerCase();
                      if (statusLower === 'final' || statusLower === 'live' || statusLower === 'halftime') {
                        calculatedTotal += gameData.currentPoints || 0;
                        console.log(`  ✓ ${pos}: ${gameData.currentPoints} pts (${gameData.gameStatus})`);
                      }
                    }
                  }
                });
              } else {
                // Fallback: Query player_game_stats for lineup players
                console.log('🔍 liveGameData empty, querying player_game_stats...');
                
                const playerCardIds = positions
                  .map(pos => lineup[pos]?.player_card_id)
                  .filter(id => id);
                
                if (playerCardIds.length > 0) {
                  const { data: statsData } = await supabase
                    .from('player_game_stats')
                    .select(`
                      player_card_id,
                      fantasy_points,
                      game_id,
                      game_scores!inner(game_status)
                    `)
                    .in('player_card_id', playerCardIds)
                    .eq('week_number', currentWeek.week)
                    .eq('season_year', currentWeek.year);
                  
                  if (statsData) {
                    statsData.forEach(stat => {
                      const statusLower = stat.game_scores?.game_status?.toLowerCase();
                      if (statusLower === 'final' || statusLower === 'live' || statusLower === 'halftime') {
                        calculatedTotal += stat.fantasy_points || 0;
                        statsMap.set(stat.player_card_id, true); // Mark as played
                        console.log(`  ✓ Player card ${stat.player_card_id}: ${stat.fantasy_points} pts (${stat.game_scores.game_status})`);
                      }
                    });
                  }
                }
              }
              
              setLivePoints(calculatedTotal);
              console.log('🔴 LIVE - Total calculated:', calculatedTotal);
              
              // Calculate projected final (live + projected for unplayed games)
              let projectedFinalTotal = calculatedTotal;
              positions.forEach(pos => {
                const player = lineup[pos];
                if (player?.player_card?.player_id) {
                  // Check both liveGameData and statsMap to determine if game started
                  const gameData = liveGameData?.get(player.player_card.player_id);
                  const statusLower = gameData?.gameStatus?.toLowerCase();
                  const hasPlayedInDB = statsMap && statsMap.has(player.player_card_id);
                  
                  // If game hasn't started yet (not in liveGameData AND not in DB stats), add projection
                  const gameNotStarted = !hasPlayedInDB && (!gameData || (statusLower !== 'final' && statusLower !== 'live' && statusLower !== 'halftime'));
                  
                  if (gameNotStarted) {
                    const projection = projections?.get(player.player_card.player_id);
                    if (projection?.projected) {
                      projectedFinalTotal += projection.projected;
                      console.log(`  📈 ${pos}: Adding projection ${projection.projected} pts (game not started)`);
                    }
                  }
                }
              });
              setProjectedFinal(projectedFinalTotal);
              console.log('📊 PROJECTED FINAL:', projectedFinalTotal);
            } else {
              // Final fallback to database value
              const dbLivePoints = lineupData.total_points || 0;
              setLivePoints(dbLivePoints);
              console.log('🔴 LIVE - Using DB total_points:', dbLivePoints);
              
              // Calculate projected final from lineup_snapshot in database
              if (lineupData.lineup_snapshot && projections) {
                let projectedFinalTotal = dbLivePoints;
                const positions = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'FLEX'];
                
                positions.forEach(pos => {
                  const playerCardId = lineupData.lineup_snapshot[pos];
                  if (playerCardId) {
                    // Find player in liveGameData by card ID
                    let gameStarted = false;
                    if (liveGameData) {
                      for (const [playerId, gameData] of liveGameData.entries()) {
                        // We need to match by checking if this player's card is in the lineup
                        const statusLower = gameData?.gameStatus?.toLowerCase();
                        if (statusLower === 'final' || statusLower === 'live' || statusLower === 'halftime') {
                          gameStarted = true;
                          break;
                        }
                      }
                    }
                    
                    // If game hasn't started, add projection
                    if (!gameStarted) {
                      // Find projection by player card ID - need to iterate through projections
                      for (const [playerId, projection] of projections.entries()) {
                        // This is tricky - we'd need to match player_id to player_card_id
                        // For now, we'll skip this path since lineup prop should be available
                      }
                    }
                  }
                });
                
                setProjectedFinal(projectedFinalTotal);
                console.log('📈 PROJECTED FINAL (DB fallback):', projectedFinalTotal);
              } else {
                setProjectedFinal(dbLivePoints);
              }
            }
          } else {
            // Week not live yet - show projections
            console.log('⚪ Week not live - showing PROJECTED points');
            setProjectedFinal(0);
          }
        } else {
          // No lineup data in database yet - calculate from lineup prop
          console.log('📦 No weekly_lineups entry yet - calculating from lineup prop');
          
          if (weekIsLive && lineup) {
            // Calculate live points and projected final from lineup prop
            let calculatedLive = 0;
            let calculatedProjectedFinal = 0;
            const positions = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'FLEX'];
            
            positions.forEach(pos => {
              const player = lineup[pos];
              if (player?.player_card?.player_id) {
                const gameData = liveGameData?.get(player.player_card.player_id);
                const statusLower = gameData?.gameStatus?.toLowerCase();
                
                // Add live points if game has started
                if (gameData && (statusLower === 'final' || statusLower === 'live' || statusLower === 'halftime')) {
                  const pts = gameData.currentPoints || 0;
                  calculatedLive += pts;
                  calculatedProjectedFinal += pts;
                  console.log(`  ✓ ${pos}: ${pts} pts LIVE (${gameData.gameStatus})`);
                } else {
                  // Game hasn't started - use projection
                  const projection = projections?.get(player.player_card.player_id);
                  if (projection?.projected) {
                    calculatedProjectedFinal += projection.projected;
                    console.log(`  📈 ${pos}: ${projection.projected} pts PROJECTED (game not started)`);
                  }
                }
              }
            });
            
            setLivePoints(calculatedLive);
            setProjectedFinal(calculatedProjectedFinal);
            console.log('🔴 LIVE (no DB entry):', calculatedLive);
            console.log('📊 PROJECTED FINAL (no DB entry):', calculatedProjectedFinal);
          }
        }
      } catch (error) {
        console.error('❌ Error fetching stats:', error);
        // Retry logic for initial data fetch
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`🔄 Retrying stats fetch (${retryCount}/${maxRetries})...`);
          setTimeout(fetchStats, 2000 * retryCount); // Exponential backoff
        }
      }
    };

    const setupSubscription = () => {
      try {
        subscription = supabase
          .channel('banner-stats')
          .on(
            'postgres_changes',
            {
              event: '*',  // Listen to ALL events (INSERT, UPDATE, DELETE)
              schema: 'public',
              table: 'weekly_lineups',
              filter: `team_id=eq.${teamId}`
            },
            (payload) => {
              console.log('🔄 Real-time lineup update received:', payload);
              
              if (payload.new) {
                // When lineup updates, re-fetch stats to ensure we have latest data
                console.log('🔄 Lineup changed, refreshing stats...');
                fetchStats();
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'weekly_global_stats',
              filter: `week_number=eq.${displayWeek.week}`
            },
            (payload) => {
              console.log('🔄 Real-time global stats update:', payload.new);
              if (payload.new) {
                setGlobalStats(payload.new);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'game_scores'
            },
            (payload) => {
              console.log('🔄 Game status update:', payload);
              // Refresh stats when game status changes
              fetchStats();
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Real-time subscription active for banner stats');
              retryCount = 0; // Reset retry count on successful connection
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.error('❌ Real-time subscription error:', status);
              // Attempt to reconnect
              if (retryCount < maxRetries) {
                retryCount++;
                console.log(`🔄 Attempting to reconnect (${retryCount}/${maxRetries})...`);
                retryTimeout = setTimeout(() => {
                  if (subscription) {
                    subscription.unsubscribe();
                  }
                  setupSubscription();
                }, 3000 * retryCount);
              }
            }
          });
      } catch (error) {
        console.error('❌ Error setting up subscription:', error);
        // Retry subscription setup
        if (retryCount < maxRetries) {
          retryCount++;
          retryTimeout = setTimeout(setupSubscription, 3000 * retryCount);
        }
      }
    };

    fetchStats();
    setupSubscription();

    // CRITICAL FIX: Add polling interval for live games
    // Poll every 10 seconds to ensure we catch live updates even if realtime fails
    pollingInterval = setInterval(() => {
      console.log('🔄 Banner polling for updates...');
      fetchStats();
    }, 10000);

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [displayWeek, teamId, simulatedSeasonId, liveGameData, lineup, previewMode, weekIsFinalized]); // Re-run when displayWeek, liveGameData, lineup, or preview state changes

  // Calculate bar percentage
  const userScore = (isLive || isFinal) ? livePoints : projectedPoints;
  const hasGlobalStats = globalStats && globalStats.total_active_teams > 0;
  
  // For simulated seasons, use simulated average; otherwise use global stats
  const averageScore = simulatedSeasonId && simulatedAverage
    ? parseFloat(simulatedAverage)
    : (hasGlobalStats 
        ? (isLive ? (globalStats?.median_score || 0) : (globalStats?.median_score || 0))
        : userScore); // When you're the only team, you ARE the median
  
  const maxScore = hasGlobalStats 
    ? (globalStats?.highest_score || userScore * 1.5) 
    : (userScore * 1.5); // Scale to 150% of user's score for better visualization
  
  const userPercentage = Math.min((userScore / maxScore) * 100, 100);
  const averagePercentage = Math.min((averageScore / maxScore) * 100, 100);
  
  // When you're the only team, you're right at average (not above or below)
  const isAboveAverage = hasGlobalStats ? userScore >= averageScore : true;

  // Check if team hasn't started yet
  // Show blue banner if:
  // 1. Team's current_week is in the future, OR
  // 2. Team's current_week equals NFL week but has no weekly_lineup entry yet
  const teamHasntStarted = team?.current_week && currentWeek?.week && (
    team.current_week > currentWeek.week || 
    (team.current_week === currentWeek.week && !hasWeeklyLineup)
  );

  return (
    <>
      {/* Team Hasn't Started Banner */}
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />

      {/* Compact Header - Single Row Design */}
      <div className="bg-dk-black-secondary border-b border-dk-black-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 h-[180px]">
          {/* Single Row Layout - Just Team Name */}
          <div className="flex items-center justify-between gap-4 mb-3">
            {/* Team Name with Image and Edit Button */}
            <div className="flex items-center gap-3">
              {/* Team Image - Clickable */}
              <button
                onClick={handleImageClick}
                disabled={uploading}
                className="relative group flex-shrink-0"
                title="Click to change team image"
              >
                {teamImage ? (
                  <div className="relative">
                    <img
                      src={teamImage}
                      alt={localTeamName || 'Team'}
                      className="w-16 h-16 rounded-lg object-cover border-2 border-dk-black-light transition-opacity group-hover:opacity-75"
                    />
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                        <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-dk-black-tertiary border-2 border-dk-black-light flex items-center justify-center transition-colors group-hover:border-dk-green-primary group-hover:bg-dk-black-light">
                    <svg className="w-8 h-8 text-dk-white-muted group-hover:text-dk-green-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                )}
              </button>
              
              {/* Team Name and Username - Editable */}
              <div className="flex flex-col">
                {isEditingName ? (
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={editedName}
                    onChange={handleNameChange}
                    onBlur={handleNameBlur}
                    onKeyDown={handleNameKeyDown}
                    maxLength={30}
                    className="text-2xl md:text-3xl font-dk-display font-black text-dk-white-primary tracking-tight bg-dk-black-tertiary border-2 border-dk-green-primary rounded px-2 py-1 focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={handleNameClick}
                    className="text-2xl md:text-3xl font-dk-display font-black text-dk-white-primary tracking-tight hover:text-dk-green-primary transition-colors text-left group"
                    title="Click to edit team name"
                  >
                    {localTeamName || 'Your Team'}
                    <svg 
                      className="inline-block ml-2 w-5 h-5 text-dk-white-muted group-hover:text-dk-green-primary transition-colors opacity-0 group-hover:opacity-100" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" 
                      />
                    </svg>
                  </button>
                )}
                {/* Username */}
                {username && (
                  <span className="text-sm text-dk-white-muted font-dk">
                    {username}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Stats - Condensed */}
          <div className="md:hidden flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-dk-black-tertiary rounded text-xs">
              <span>💰</span>
              <span className="font-dk-display font-bold text-dk-green-primary">
                {coins?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-dk-black-tertiary rounded text-xs">
              <span>🏆</span>
              <span className="font-dk-display font-bold text-dk-green-primary">{wins || 0}</span>
            </div>
          </div>

          {/* Streamlined Single-Line Score Display */}
          <div className="flex items-center gap-4">
            {/* Left Side - Week & Live Badge */}
            <div className="flex items-center gap-2">
              {displayWeek ? (
                <span className="text-sm font-dk-display font-bold text-dk-white-muted uppercase">
                  Week {displayWeek.week}
                </span>
              ) : (
                <span className="text-sm font-dk-display font-bold text-dk-white-muted uppercase opacity-50">
                  Loading...
                </span>
              )}
              {(isLive || isFinal) && !previewMode && (
                <span className={`px-2 py-0.5 ${isFinal ? 'bg-blue-600' : 'bg-red-500'} text-white text-xs font-dk-display font-bold rounded flex items-center gap-1`}>
                  {!isFinal && <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>}
                  {isFinal ? 'FINAL' : 'LIVE'}
                </span>
              )}
            </div>

            {/* Center - Progress Bar (Flex Grow) */}
            <div className="flex-1 flex items-center gap-3">
              <div className="relative flex-1 h-2 bg-dk-black-tertiary rounded-full overflow-hidden border border-dk-black-light">
                {/* Average Marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10"
                  style={{ left: `${averagePercentage}%` }}
                />
                {/* User's Bar */}
                <div
                  className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ${
                    isFinal
                      ? 'bg-gradient-to-r from-blue-500 to-blue-400'
                      : isLive 
                        ? 'bg-gradient-to-r from-red-500 to-red-400'
                        : 'bg-gradient-to-r from-dk-green-primary to-green-400'
                  }`}
                  style={{ width: `${userPercentage}%` }}
                />
              </div>
              
              {/* Average Label */}
              <span className="text-xs text-dk-white-muted font-dk whitespace-nowrap">
                Avg {averageScore.toFixed(1)}
              </span>
            </div>

            {/* Right Side - Score Badges */}
            <div className="flex items-center gap-2">
              {/* Projected Final Badge (show when live and has projected value, but NOT when finalized) */}
              {isLive && !isFinal && projectedFinal >= livePoints && (
                <div className="rounded-lg px-3 py-1.5 shadow-lg border-2 bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-400">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white font-semibold uppercase tracking-wider">
                      PROJ FINAL
                    </span>
                    <span className="text-xl text-white font-black leading-none">
                      {projectedFinal.toFixed(1)}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Current Score Badge */}
              <div className={`rounded-lg px-3 py-1.5 shadow-lg border-2 ${
                isFinal
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 border-blue-400'
                  : isLive 
                    ? 'bg-gradient-to-r from-red-600 to-red-700 border-red-400' 
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 border-green-400'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white font-semibold uppercase tracking-wider">
                    {isFinal ? 'FINAL' : (isLive ? 'LIVE' : 'PROJECTED')}
                  </span>
                  <span className="text-xl text-white font-black leading-none">
                    {userScore.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Text Below - Optional, Only Show if Has Global Stats */}
          {hasGlobalStats && (
            <p className={`text-xs font-dk-display font-bold mt-2 ${
              isAboveAverage ? 'text-dk-green-primary' : 'text-orange-400'
            }`}>
              {userScore > averageScore 
                ? `↑ ${(userScore - averageScore).toFixed(1)} pts above median`
                : userScore < averageScore
                  ? `↓ ${(averageScore - userScore).toFixed(1)} pts below median`
                  : `= Right at median`
              }
            </p>
          )}

          {/* Losses Counter - Below Container */}
          <div className="flex items-center gap-4 mt-3">
            {/* Coins */}
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-dk-display font-bold text-dk-green-primary">
                {coins?.toLocaleString() || '0'}
              </span>
              <span className="text-xs text-dk-white-muted uppercase">Coins</span>
            </div>

            {/* Separator */}
            <div className="h-4 w-px bg-dk-black-light"></div>

            {/* Wins */}
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-dk-display font-bold text-dk-green-primary">
                {wins || 0}
              </span>
              <span className="text-xs text-dk-white-muted uppercase">Wins</span>
            </div>

            {/* Separator */}
            <div className="h-4 w-px bg-dk-black-light"></div>

            {/* Losses */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                {Array.from({ length: team?.contest_type?.max_losses || 3 }, (_, index) => (
                  <div
                    key={index}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      index < (losses || 0)
                        ? 'bg-red-500 border-red-600'
                        : 'bg-dk-black-tertiary border-dk-black-light'
                    }`}
                  >
                    {index < (losses || 0) && (
                      <span className="text-white text-[10px] font-bold">✗</span>
                    )}
                  </div>
                ))}
              </div>
              <span className="text-xs text-dk-white-muted">
                {team?.contest_type ? (
                  <>
                    <span className="font-dk-display font-bold text-dk-green-primary">
                      {team.contest_type.max_losses - (losses || 0)}
                    </span> {team.contest_type.max_losses - (losses || 0) === 1 ? 'Loss' : 'Losses'} Until Elimination
                    <span className="ml-2 text-dk-white-muted/70">
                      ({team.contest_type.display_name})
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-dk-display font-bold text-dk-green-primary">
                      {3 - (losses || 0)}
                    </span> {3 - (losses || 0) === 1 ? 'Game' : 'Games'} Until Elimination
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="bg-dk-black-secondary border-b border-dk-black-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-2">
            {/* Back to Teams Button */}
            <button
              onClick={() => navigate('/fantasy')}
              className="px-3 py-2 rounded text-sm font-dk-display font-bold transition-all duration-200 bg-dk-black-tertiary text-dk-white-secondary border border-dk-black-light hover:bg-dk-black-light"
              title="Back to Teams"
            >
              ←
            </button>
            
            {navItems.map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-4 py-2 rounded text-sm font-dk-display font-bold transition-all duration-200 ${
                  location.pathname === item.path
                    ? 'bg-dk-green-primary text-dk-black-primary'
                    : 'bg-dk-black-tertiary text-dk-white-secondary border border-dk-black-light hover:bg-dk-black-light'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

FantasyNavBanner.propTypes = {
  username: PropTypes.string,
  teamName: PropTypes.string,
  wins: PropTypes.number,
  losses: PropTypes.number,
  coins: PropTypes.number,
  teamId: PropTypes.string,
  userId: PropTypes.string,
  liveGameData: PropTypes.instanceOf(Map),
  lineup: PropTypes.object,
  projections: PropTypes.instanceOf(Map),
  team: PropTypes.object,
  currentWeek: PropTypes.object,
  previewMode: PropTypes.bool
};
