import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { supabase } from '../services/supabase';
import { Camera, Edit2 } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

/**
 * FantasyNavBanner - Unified team banner component
 * 
 * Shows team info, week status, scores, and navigation
 * Used in both team owner view and read-only view mode
 */
export default function FantasyNavBanner({
  team,
  teamId,
  teamName,
  teamImage,
  teamCoins,
  wins,
  losses,
  totalPoints,
  onTeamNameUpdate,
  onTeamImageUpdate,
  onCoinsUpdate,
  lineup,
  projections,
  liveGameData,
  previewMode = false
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const nameInputRef = useRef(null);
  const averageCalculatedRef = useRef(false);

  const simulatedSeasonId = team?.simulated_season_id;

  // NAV ITEMS
  const NAV_ITEMS = [
    { label: 'Starting Lineup', path: 'lineup' },
    { label: 'Inventory', path: 'inventory' },
    { label: 'Activity', path: 'activity' }
  ];

  const VIEW_MODE_NAV_ITEMS = ['Starting Lineup', 'Inventory'];

  const LINEUP_POSITIONS = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'FLEX'];

  // LOCAL STATE
  const [localTeamName, setLocalTeamName] = useState(teamName);

  // UI State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(teamName);
  const [uploading, setUploading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Week & Game State
  const [currentWeek, setCurrentWeek] = useState(null);
  const [displayWeek, setDisplayWeek] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [isFinal, setIsFinal] = useState(false);
  const [weekIsFinalized, setWeekIsFinalized] = useState(false);
  const [hasWeeklyLineup, setHasWeeklyLineup] = useState(false);

  // Score State
  const [projectedPoints, setProjectedPoints] = useState(0);
  const [livePoints, setLivePoints] = useState(0);
  const [projectedFinal, setProjectedFinal] = useState(0);
  const [globalStats, setGlobalStats] = useState(null);
  const [simulatedAverage, setSimulatedAverage] = useState(null);

  const isViewMode = location.pathname.includes('/view');

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleNameClick = () => {
    setIsEditingName(true);
    setEditedName(localTeamName);
  };

  const handleNameChange = (e) => {
    setEditedName(e.target.value);
  };

  const handleNameBlur = async () => {
    setIsEditingName(false);
    if (editedName.trim() && editedName !== localTeamName) {
      try {
        const { error } = await supabase
          .from('teams')
          .update({ team_name: editedName.trim() })
          .eq('id', teamId);

        if (error) throw error;

        setLocalTeamName(editedName.trim());
        if (onTeamNameUpdate) onTeamNameUpdate(editedName.trim());
      } catch (error) {
        console.error('Error updating team name:', error);
        setEditedName(localTeamName);
      }
    } else {
      setEditedName(localTeamName);
    }
  };

  const handleNameKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleNameBlur();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditedName(localTeamName);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !teamId) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${teamId}-${Date.now()}.${fileExt}`;
      const filePath = `team-images/${fileName}`;

      if (teamImage) {
        const oldPath = teamImage.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('team-images')
            .remove([`team-images/${oldPath}`]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('team-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('team-images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('teams')
        .update({ team_image_url: publicUrl })
        .eq('id', teamId);

      if (updateError) throw updateError;

      if (onTeamImageUpdate) onTeamImageUpdate(publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleNavClick = (path) => {
    navigate(`/teams/${teamId}/${path}`);
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const calculateSimulatedAverage = async (simSeasonId) => {
    try {
      const { data: botTeams, error } = await supabase
        .from('teams')
        .select(`
          id,
          team_name,
          simulated_season_id,
          user_player_inventory (
            player_card:player_cards (
              player_id,
              position
            ),
            is_in_lineup,
            lineup_position
          )
        `)
        .eq('simulated_season_id', simSeasonId)
        .eq('is_bot', true);

      if (error) throw error;

      const positionMap = {
        'Quarterback': { min: 15, max: 30 },
        'Running Back': { min: 8, max: 20 },
        'Wide Receiver': { min: 6, max: 18 },
        'Tight End': { min: 4, max: 12 }
      };

      let totalProjected = 0;
      let teamCount = 0;

      for (const botTeam of botTeams || []) {
        let teamProjected = 0;
        const lineupPlayers = botTeam.user_player_inventory?.filter(p => p.is_in_lineup) || [];

        for (const inv of lineupPlayers) {
          const playerData = inv.player_card;
          if (!playerData?.position) continue;

          const position = playerData.position;
            
          const range = positionMap[position] || { min: 5, max: 15 };
          const baseAvg = (range.min + range.max) / 2;
          const seed = parseInt(playerData.player_id.replace(/-/g, '').substring(0, 8), 16);
          const weekSeed = (seed * 37 + (currentWeek?.week || 1) * 997) % 1000;
          const weekVariance = ((weekSeed % 200) - 100) / 333;
          let points = baseAvg * (1 + weekVariance);
          points = Math.max(range.min * 0.7, Math.min(range.max * 1.3, points));
          teamProjected += points;
        }
        
        if (teamProjected > 0) {
          totalProjected += teamProjected;
          teamCount++;
        }
      }
      
      if (teamCount > 0) {
        const avg = totalProjected / teamCount;
        setSimulatedAverage(avg.toFixed(1));
      }
    } catch (error) {
      console.error('Error calculating simulated average:', error);
    }
  };

  const getNavItems = () => {
    return NAV_ITEMS
      .filter(item => !isViewMode || VIEW_MODE_NAV_ITEMS.includes(item.label))
      .map(item => ({ ...item, path: `/teams/${teamId}/${item.path}` }));
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

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

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (simulatedSeasonId && currentWeek && !averageCalculatedRef.current) {
      averageCalculatedRef.current = true;
      calculateSimulatedAverage(simulatedSeasonId);
    }
  }, [simulatedSeasonId, currentWeek]);

  // Check week status and set display week
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

  // Calculate projected points from lineup
  useEffect(() => {
    if (!lineup) return;
    
    let total = 0;
    LINEUP_POSITIONS.forEach(pos => {
      const player = lineup[pos];
      if (player?.player_card) {
        const weeklyProj = player.player_card.weekly_projected_points;
        if (weeklyProj && parseFloat(weeklyProj) > 0) {
          total += parseFloat(weeklyProj);
        } else if (projections && projections.size > 0) {
          const projection = projections.get(player.player_card.player_id);
          if (projection?.projected) total += projection.projected;
        }
      }
    });
    setProjectedPoints(total);
  }, [lineup, projections]);

  // Fetch live/final scores
  useEffect(() => {
    if (!displayWeek || !teamId) return;

    let subscription;
    let pollingInterval;

    const fetchStats = async () => {
      try {
        if (simulatedSeasonId) setIsLive(false);

        const { data: lineupData } = await supabase
          .from('weekly_lineups')
          .select('lineup_snapshot, status, total_points')
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

        // Check global week status for ALL teams (not just those with lineups)
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
          } else if (weekIsLive && lineupData.lineup_snapshot) {
            // Use lineup_snapshot which has real stats from track-live-stats edge function
            let calculatedTotal = 0;
            let projectedFinalTotal = 0;
            
            LINEUP_POSITIONS.forEach(pos => {
              const playerData = lineupData.lineup_snapshot[pos];
              if (playerData) {
                // Use total_points from snapshot (includes live stats + tokens)
                const livePoints = parseFloat(playerData.total_points || 0);
                const projectedPoints = parseFloat(playerData.projected_points || 0);
                
                calculatedTotal += livePoints;
                // If player has live points, use those; otherwise use projection
                projectedFinalTotal += livePoints > 0 ? livePoints : projectedPoints;
              }
            });
            
            setLivePoints(calculatedTotal);
            setProjectedFinal(projectedFinalTotal);
          } else if (lineupData.lineup_snapshot) {
            let calculatedProjected = 0;
            Object.keys(lineupData.lineup_snapshot).forEach(pos => {
              const playerData = lineupData.lineup_snapshot[pos];
              if (playerData && playerData.projected_points) {
                calculatedProjected += parseFloat(playerData.projected_points);
              }
            });
            setProjectedFinal(calculatedProjected);
          }
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    const setupSubscription = () => {
      subscription = supabase
        .channel('banner-stats')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_lineups', filter: `team_id=eq.${teamId}` }, () => fetchStats())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_global_stats', filter: `week_number=eq.${displayWeek.week}` }, (payload) => {
          if (payload.new) setGlobalStats(payload.new);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_scores' }, () => fetchStats())
        .subscribe();
    };

    fetchStats();
    setupSubscription();
    pollingInterval = setInterval(fetchStats, 10000);

    return () => {
      if (subscription) subscription.unsubscribe();
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [displayWeek, teamId, simulatedSeasonId, liveGameData, lineup, previewMode]);

  // ============================================================================
  // CALCULATED VALUES
  // ============================================================================

  const activeNavPath = location.pathname;
  const navItems = getNavItems();

  const displayAverage = simulatedSeasonId 
    ? simulatedAverage 
    : (globalStats?.median_score || globalStats?.average_score || 0);

  const displayedLivePoints = isFinal ? livePoints : (isLive ? livePoints : 0);
  const displayedProjectedFinal = isFinal ? livePoints : projectedFinal;

  const lossesRemaining = 3 - losses;

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!displayWeek) {
    return (
      <div className="w-full bg-primary-black-900 border-b border-primary-black-700">
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner size="sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-primary-black-900 border-b border-primary-black-700">
      <div className="container mx-auto px-4 py-6">
        {/* Team Header */}
        <div className="flex items-center gap-6 mb-6">
          {/* Team Image */}
          <div className="relative group">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-primary-black-800 border-2 border-primary-black-600">
              {teamImage ? (
                <img 
                  src={teamImage} 
                  alt={localTeamName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary-black-500">
                  <span className="text-3xl">🏈</span>
                </div>
              )}
            </div>
            
            {!isViewMode && (
              <>
                <input
                  type="file"
                  id="team-image-upload"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <label
                  htmlFor="team-image-upload"
                  className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg"
                >
                  {uploading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </label>
              </>
            )}
          </div>

          {/* Team Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {isEditingName && !isViewMode ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={editedName}
                  onChange={handleNameChange}
                  onBlur={handleNameBlur}
                  onKeyDown={handleNameKeyPress}
                  className="text-2xl font-bold bg-primary-black-800 border border-primary-green-500 rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-primary-green-500"
                  maxLength={50}
                />
              ) : (
                <h1 
                  className={`text-2xl font-bold text-white ${
                    !isViewMode ? 'cursor-pointer hover:text-primary-green-400 transition-colors' : ''
                  }`}
                  onClick={!isViewMode ? handleNameClick : undefined}
                >
                  {localTeamName}
                  {!isViewMode && (
                    <Edit2 className="inline-block ml-2 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </h1>
              )}
            </div>

            {/* Week Info & Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-primary-black-400 font-medium">WEEK {displayWeek.week}</span>
                {isLive && (
                  <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded uppercase animate-pulse">
                    LIVE
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <span className="text-yellow-500">💰</span>
                <span className="text-white font-bold">{teamCoins}</span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-primary-green-500">🏆</span>
                <span className="text-white font-bold">{wins}</span>
                <span className="text-primary-black-500">W</span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-red-500">❌</span>
                <span className="text-white font-bold">{losses}</span>
                <span className="text-primary-black-500">L</span>
              </div>

              <div className="flex items-center gap-2 text-primary-black-400">
                <span className="text-xs">⚠️</span>
                <span className="font-bold text-white">{lossesRemaining}</span>
                <span className="text-xs">Losses Left</span>
              </div>
            </div>
          </div>

          {/* Week Progress & Scores */}
          <div className="flex items-center gap-4">
            {displayAverage > 0 && (
              <div className="text-right">
                <div className="text-xs text-primary-black-400 mb-1">
                  Avg {displayAverage.toFixed(1)}
                </div>
                <div className="text-sm font-bold text-primary-black-300">
                  PROJ FINAL {displayedProjectedFinal.toFixed(1)}
                </div>
              </div>
            )}

            <div className="text-right">
              <div className="text-2xl font-bold text-primary-green-500">
                {isFinal ? 'FINAL' : (isLive ? 'LIVE' : 'PROJECTED')}
              </div>
              <div className="text-3xl font-bold text-white">
                {isLive || isFinal ? displayedLivePoints.toFixed(1) : projectedPoints.toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-1 border-t border-primary-black-700 pt-4">
          {navItems.map((item) => {
            const isActive = activeNavPath === item.path || activeNavPath.startsWith(item.path);
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.path.split('/').pop())}
                className={`
                  px-6 py-2 font-semibold text-sm rounded-lg transition-all
                  ${
                    isActive
                      ? 'bg-primary-green-600 text-white'
                      : 'text-primary-black-400 hover:text-white hover:bg-primary-black-800'
                  }
                `}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

FantasyNavBanner.propTypes = {
  team: PropTypes.object,
  teamId: PropTypes.string.isRequired,
  teamName: PropTypes.string.isRequired,
  teamImage: PropTypes.string,
  teamCoins: PropTypes.number.isRequired,
  wins: PropTypes.number.isRequired,
  losses: PropTypes.number.isRequired,
  totalPoints: PropTypes.number,
  onTeamNameUpdate: PropTypes.func,
  onTeamImageUpdate: PropTypes.func,
  onCoinsUpdate: PropTypes.func,
  lineup: PropTypes.object,
  projections: PropTypes.instanceOf(Map),
  liveGameData: PropTypes.instanceOf(Map),
  previewMode: PropTypes.bool
};