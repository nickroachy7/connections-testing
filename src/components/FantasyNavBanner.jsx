import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../services/supabase';
import { useFantasy } from '../contexts/FantasyContext';
import { useProjectedMedian } from '../hooks/fantasy';

// Production-ready banner component using derived stats from FantasyContext
export default function FantasyNavBanner({ 
  username, 
  teamName, 
  wins, 
  losses, 
  coins,
  teamId,
  userId,
  team, // Team prop to get contest info
  previewMode = false // If true, show next week when current week is finalized (for Starting Lineup page only)
}) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get derived lineup stats AND raw data from FantasyContext (always up-to-date)
  const { lineupStats, lineup, projections, liveGameData } = useFantasy();
  
  const [currentWeek, setCurrentWeek] = useState(null);
  const [displayWeek, setDisplayWeek] = useState(null); // The week to actually display (may be +1 in preview mode)
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
  const [simulatedMedian, setSimulatedMedian] = useState(null);
  const [allTeamsProjected, setAllTeamsProjected] = useState([]);
  const medianCalculatedRef = useRef(false);
  const [weekIsFinalized, setWeekIsFinalized] = useState(false); // Track if current week is finalized
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [bannerTheme, setBannerTheme] = useState('default');
  const colorPickerRef = useRef(null);
  
  // DERIVED STATS from lineupStats hook (no local calculation needed)
  // These automatically update when lineup/projections/liveGameData changes
  const projectedPoints = lineupStats?.projectedPoints || 0;

  // Check if we're on the view page (read-only mode)
  const isViewMode = location.pathname.includes('/view');

  const allNavItems = [
    { path: `/teams/${teamId}/starting-lineup`, label: 'STARTING LINEUP' },
    { path: `/teams/${teamId}/inventory`, label: 'INVENTORY' },
    { path: `/teams/${teamId}/pack-shop`, label: 'PACK SHOP' },
    { path: `/teams/${teamId}/leaderboard`, label: 'LEADERBOARD' },
    { path: `/teams/${teamId}/activity`, label: 'ACTIVITY' }
  ];

  // Filter nav items based on view mode
  const navItems = isViewMode 
    ? allNavItems.filter(item => item.label === 'STARTING LINEUP' || item.label === 'INVENTORY')
    : allNavItems;

  // Banner theme options
  const themeOptions = [
    { 
      id: 'default', 
      name: 'Classic Dark', 
      bg: 'bg-dk-black-secondary',
      preview: 'linear-gradient(to right, #1a1a1a, #1a1a1a)'
    },
    { 
      id: 'ocean', 
      name: 'Ocean Blue', 
      bg: 'bg-gradient-to-r from-blue-900 to-blue-800',
      preview: 'linear-gradient(to right, #1e3a8a, #1e40af)'
    },
    { 
      id: 'forest', 
      name: 'Forest Green', 
      bg: 'bg-gradient-to-r from-emerald-900 to-green-800',
      preview: 'linear-gradient(to right, #064e3b, #166534)'
    },
    { 
      id: 'sunset', 
      name: 'Sunset Orange', 
      bg: 'bg-gradient-to-r from-orange-900 to-red-900',
      preview: 'linear-gradient(to right, #7c2d12, #7f1d1d)'
    },
    { 
      id: 'purple', 
      name: 'Royal Purple', 
      bg: 'bg-gradient-to-r from-purple-900 to-indigo-900',
      preview: 'linear-gradient(to right, #581c87, #312e81)'
    },
    { 
      id: 'crimson', 
      name: 'Crimson Red', 
      bg: 'bg-gradient-to-r from-red-950 to-rose-900',
      preview: 'linear-gradient(to right, #450a0a, #881337)'
    },
    { 
      id: 'cow', 
      name: 'Moo Cow', 
      bg: 'bg-gradient-to-br from-zinc-100 via-zinc-900 to-zinc-100',
      preview: 'linear-gradient(135deg, #f4f4f5, #18181b, #f4f4f5)'
    },
    { 
      id: 'matrix', 
      name: 'Matrix Code', 
      bg: 'bg-gradient-to-b from-black via-green-950 to-black',
      preview: 'linear-gradient(to bottom, #000000, #052e16, #000000)'
    },
    { 
      id: 'lava', 
      name: 'Molten Lava', 
      bg: 'bg-gradient-to-r from-red-600 via-orange-600 to-yellow-500',
      preview: 'linear-gradient(to right, #dc2626, #ea580c, #eab308)'
    }
  ];

  // Load saved theme from localStorage when team changes
  useEffect(() => {
    const savedTheme = localStorage.getItem(`bannerTheme_${teamId}`);
    // Always set the theme - either saved or default
    setBannerTheme(savedTheme || 'default');
  }, [teamId]);

  // Close color picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setShowColorPicker(false);
      }
    }
    
    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColorPicker]);

  const handleThemeChange = (themeId) => {
    setBannerTheme(themeId);
    localStorage.setItem(`bannerTheme_${teamId}`, themeId);
    setShowColorPicker(false);
  };

  const getCurrentTheme = () => {
    return themeOptions.find(t => t.id === bannerTheme) || themeOptions[0];
  };

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
          
          // If in simulated season, calculate projected median ONCE
          if (data.simulated_season_id && currentWeek && !medianCalculatedRef.current) {
            medianCalculatedRef.current = true;
            calculateSimulatedMedian(data.simulated_season_id);
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

  // Load current week from database
  useEffect(() => {
    const loadCurrentWeek = async () => {
      try {
        const { data, error } = await supabase
          .from('nfl_season_config')
          .select('current_week, season_year')
          .eq('is_active', true)
          .single();
        
        if (error) throw error;
        if (data) {
          setCurrentWeek({ week: data.current_week, year: data.season_year });
        }
      } catch (error) {
        console.error('Error loading current week:', error);
      }
    };
    
    loadCurrentWeek();
  }, []);

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

  // Calculate projected median for simulated season
  const calculateSimulatedMedian = async (seasonId) => {
    if (!currentWeek || !teamId) {
      console.log('⏸️ Skipping median calculation - no current week or team');
      return;
    }
    
    console.log('📊 Calculating simulated median once...');
    
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
        // Calculate MEDIAN (not average)
        const sortedScores = teamProjections.sort((a, b) => a - b);
        let median;
        if (sortedScores.length % 2 === 0) {
          // Even number - average of middle two
          const mid1 = sortedScores[sortedScores.length / 2 - 1];
          const mid2 = sortedScores[sortedScores.length / 2];
          median = (mid1 + mid2) / 2;
        } else {
          // Odd number - middle value
          median = sortedScores[Math.floor(sortedScores.length / 2)];
        }
        setSimulatedMedian(median.toFixed(1));
        console.log('🤖 Bot team median:', median.toFixed(1), 'pts from', teamCount, 'teams');
      }
    } catch (error) {
      console.error('Error calculating simulated median:', error);
    }
  };

  // **REMOVED OLD CALCULATION LOGIC**
  // Projected points now come from lineupStats hook via FantasyContext
  // This ensures they update immediately when lineup changes

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

        // Check global week status for ALL teams (not just those with lineups)
        let weekIsLive = false;
        
        if (!simulatedSeasonId && !weekFinalizedStatus) {
          // Check global week status from nfl_season_config
          const { data: weekConfig } = await supabase
            .from('nfl_season_config')
            .select('week_status')
            .eq('season_year', displayWeek.year)
            .eq('current_week', displayWeek.week)
            .eq('is_active', true)
            .maybeSingle();
          
          weekIsLive = weekConfig?.week_status === 'live';
          console.log('🔴 Global week status:', weekConfig?.week_status, '- isLive:', weekIsLive);
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
            // Week is LIVE - use hook's live calculations + DB total_points as fallback
            console.log('🔴 Week is LIVE - using lineupStats hook');
            
            // Primary: Use total_points from DB (most reliable during live games)
            const dbLivePoints = parseFloat(lineupData.total_points || 0);
            setLivePoints(dbLivePoints);
            
            // Projected Final: Use hook's calculation (live + projected for unstarted games)
            // Fallback to DB if hook isn't ready yet
            const hookProjectedFinal = lineupStats?.projectedFinal || 0;
            setProjectedFinal(hookProjectedFinal > 0 ? hookProjectedFinal : dbLivePoints);
            
            console.log('🔴 LIVE:', dbLivePoints, '| PROJECTED FINAL:', hookProjectedFinal);
          } else {
            // Week not live yet - use hook's projected points
            console.log('⚪ Week not live - using lineupStats hook for projected');
            
            // Try lineup_snapshot from DB first, then fall back to hook
            let calculatedProjected = 0;
            
            if (lineupData.lineup_snapshot) {
              const positions = Object.keys(lineupData.lineup_snapshot);
              positions.forEach(pos => {
                const playerData = lineupData.lineup_snapshot[pos];
                if (playerData && playerData.projected_points) {
                  calculatedProjected += parseFloat(playerData.projected_points);
                  console.log(`  📈 ${pos}: ${playerData.projected_points} pts (${playerData.player_name})`);
                }
              });
            } else if (lineup) {
              // Fallback: calculate from current lineup prop if no snapshot
              const positions = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'FLEX'];
              positions.forEach(pos => {
                const player = lineup[pos];
                if (player?.player_card?.weekly_projected_points) {
                  const projected = parseFloat(player.player_card.weekly_projected_points);
                  calculatedProjected += projected;
                  console.log(`  📈 ${pos}: ${projected} pts (from current lineup)`);
                }
              });
            }
            
            setProjectedFinal(calculatedProjected);
            console.log('📊 Total PROJECTED:', calculatedProjected);
          }
        } else {
          // No lineup data in database yet - use hook's calculations
          console.log('📦 No weekly_lineups entry - using lineupStats hook');
          
          if (weekIsLive) {
            // Use hook for live calculations
            setLivePoints(lineupStats?.livePoints || 0);
            setProjectedFinal(lineupStats?.projectedFinal || 0);
            console.log('🔴 LIVE (no DB):', lineupStats?.livePoints);
            console.log('📊 PROJECTED FINAL (no DB):', lineupStats?.projectedFinal);
          } else {
            // Week not live - projected is same as projected final
            setProjectedFinal(lineupStats?.projectedPoints || 0);
            console.log('📊 PROJECTED (no DB):', lineupStats?.projectedPoints);
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

  // Fetch all teams' projected scores for real-time median calculation (PROJECTED state only)
  useEffect(() => {
    console.log('🔍 Median fetch useEffect triggered:', { 
      displayWeek: displayWeek?.week, 
      currentWeek: currentWeek?.week,
      isLive, 
      isFinal,
      shouldSkip: !displayWeek || !currentWeek || isLive || isFinal
    });

    if (!displayWeek || !currentWeek || isLive || isFinal) {
      console.log('⏸️ Skipping projected median fetch - Week is live/final or no displayWeek');
      return;
    }

    const fetchAllTeamsProjections = async () => {
      try {
        console.log('🔍 Fetching all teams for projected median calculation...');
        
        // Get ALL active teams (not just ones in current week)
        const { data: teams, error: teamsError } = await supabase
          .from('teams')
          .select('id, team_name, is_active')
          .eq('is_active', true);

        console.log('📊 Teams query result:', { teams, teamsError });

        if (teamsError) {
          console.error('❌ Error fetching teams:', teamsError);
          return;
        }

        if (!teams || teams.length === 0) {
          console.log('⚠️ No teams found');
          setAllTeamsProjected([]);
          return;
        }

        console.log(`✅ Found ${teams.length} active teams:`, teams.map(t => t.team_name).join(', '));
        const projections = [];
        
        for (const team of teams) {
          console.log(`  Fetching lineup for ${team.team_name} (${team.id})...`);
          
          // Get team's current lineup (players marked as is_in_lineup)
          const { data: lineup, error: lineupError } = await supabase
            .from('user_inventory')
            .select(`
              player_card_id,
              is_in_lineup,
              player_cards!inner(
                player_name,
                weekly_projected_points,
                projected_points
              )
            `)
            .eq('team_id', team.id)
            .eq('is_in_lineup', true);

          console.log(`  ${team.team_name} lineup result:`, { 
            lineupCount: lineup?.length || 0, 
            lineupError,
            lineup: lineup?.slice(0, 3) // Show first 3 for debugging
          });

          if (lineupError) {
            console.error(`❌ Error fetching lineup for team ${team.id}:`, lineupError);
            continue;
          }

          if (lineup && lineup.length > 0) {
            // Sum up projected points for this team
            const teamProjected = lineup.reduce((sum, player) => {
              const proj = player.player_cards?.weekly_projected_points || 
                          player.player_cards?.projected_points || 0;
              return sum + parseFloat(proj);
            }, 0);
            
            if (teamProjected > 0) {
              projections.push(teamProjected);
              console.log(`  ✅ Team ${team.team_name}: ${teamProjected.toFixed(1)} pts (${lineup.length} players)`);
            } else {
              console.log(`  ⚠️ Team ${team.team_name}: 0 pts (${lineup.length} players but no projections)`);
            }
          } else {
            console.log(`  ℹ️ Team ${team.team_name}: No players in lineup`);
          }
        }

        console.log(`\n📊 FINAL PROJECTIONS ARRAY:`, projections);
        setAllTeamsProjected(projections);
        console.log(`✅ Set ${projections.length} teams' projected scores for median calculation`);
        if (projections.length > 0) {
          console.log('   Projected scores:', projections.map(p => p.toFixed(1)).join(', '));
        }
      } catch (error) {
        console.error('❌ Error fetching all teams projections:', error);
      }
    };

    fetchAllTeamsProjections();
  }, [displayWeek, currentWeek, isLive, isFinal, projectedPoints]); // Recalculate when user's projection changes

  // Calculate projected median from all teams' projections
  const { projectedMedian, totalTeams } = useProjectedMedian(
    currentWeek?.week,
    currentWeek?.year,
    allTeamsProjected
  );

  // Calculate bar percentage
  const userScore = (isLive || isFinal) ? livePoints : projectedPoints;
  const hasGlobalStats = globalStats && globalStats.total_active_teams > 0;
  
  // Use MEDIAN scoring (not average)
  // Priority: Simulated median > DB median (live/final) > Projected median (calculated)
  const medianScore = simulatedSeasonId && simulatedMedian
    ? parseFloat(simulatedMedian)
    : (hasGlobalStats 
        ? globalStats.median_score || 0
        : (totalTeams > 0 ? projectedMedian : userScore));

  console.log('📊 Median Calculation State:', {
    projectedMedian: projectedMedian?.toFixed(1),
    totalTeams,
    hasGlobalStats,
    globalStatsMedian: globalStats?.median_score,
    simulatedMedian,
    isLive,
    isFinal,
    finalMedianScore: medianScore?.toFixed(1),
    source: simulatedSeasonId ? 'simulated' : (hasGlobalStats ? 'database' : (totalTeams > 0 ? 'projected' : 'userScore'))
  });
  
  const maxScore = hasGlobalStats 
    ? (globalStats?.highest_score || userScore * 1.5) 
    : (userScore * 1.5); // Scale to 150% of user's score for better visualization
  
  const userPercentage = Math.min((userScore / maxScore) * 100, 100);
  const medianPercentage = Math.min((medianScore / maxScore) * 100, 100);
  
  // When you're the only team, you're right at median (not above or below)
  const isAboveMedian = hasGlobalStats ? userScore >= medianScore : true;

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
      <div className={`${getCurrentTheme().bg} border-b border-dk-black-light transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 h-[180px] relative">
          {/* Color Picker Button - Top Right */}
          <div className="absolute top-3 right-4 z-10" ref={colorPickerRef}>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-2 rounded-lg bg-black/30 hover:bg-black/50 border border-white/20 transition-all duration-200 group"
              title="Customize banner color"
            >
              <svg className="w-5 h-5 text-white/80 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </button>

            {/* Color Picker Dropdown */}
            {showColorPicker && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-dk-black-tertiary border-2 border-dk-black-light rounded-lg shadow-2xl overflow-hidden">
                <div className="p-3 bg-dk-black-secondary border-b border-dk-black-light">
                  <h3 className="text-sm font-dk-display font-bold text-dk-white-primary">Choose Banner Theme</h3>
                </div>
                <div className="p-2 max-h-96 overflow-y-auto">
                  {themeOptions.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeChange(theme.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg mb-1.5 transition-all duration-200 ${
                        bannerTheme === theme.id 
                          ? 'bg-dk-green-primary/20 border-2 border-dk-green-primary' 
                          : 'bg-dk-black-secondary border-2 border-transparent hover:border-dk-black-light'
                      }`}
                    >
                      <div 
                        className="w-12 h-12 rounded-md border-2 border-dk-black-light flex-shrink-0"
                        style={{ background: theme.preview }}
                      />
                      <div className="flex-1 text-left">
                        <div className="text-sm font-dk-display font-bold text-dk-white-primary">
                          {theme.name}
                        </div>
                        {bannerTheme === theme.id && (
                          <div className="text-xs text-dk-green-primary mt-0.5">✓ Active</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

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
                {/* Median Marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10"
                  style={{ left: `${medianPercentage}%` }}
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
              
              {/* Median Label */}
              <span className="text-xs text-dk-white-muted font-dk whitespace-nowrap">
                Median {medianScore.toFixed(1)}
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
              isAboveMedian ? 'text-dk-green-primary' : 'text-orange-400'
            }`}>
              {userScore > medianScore 
                ? `↑ ${(userScore - medianScore).toFixed(1)} pts above median`
                : userScore < medianScore
                  ? `↓ ${(medianScore - userScore).toFixed(1)} pts below median`
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
  team: PropTypes.object,
  currentWeek: PropTypes.object,
  previewMode: PropTypes.bool
  // NOTE: liveGameData, lineup, and projections are now consumed from FantasyContext via useLineupStats hook
};
