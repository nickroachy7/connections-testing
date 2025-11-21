import { useNavigate, useOutletContext } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import LineupGridReadOnly from '../components/LineupGridReadOnly';

export default function ViewTeam() {
  const { 
    user, 
    profile, 
    teams: initialTeams, 
    activeTeam, 
    inventory: initialInventory
  } = useOutletContext() || {};
  const navigate = useNavigate();
  
  // Debug logging
  useEffect(() => {
    console.log('🎯 ViewTeam - Data from loader:', {
      activeTeam: activeTeam?.id,
      teamName: activeTeam?.team_name,
      inventoryPlayerCount: initialInventory?.players?.length,
      hasPlayers: !!initialInventory?.players?.length,
      firstPlayer: initialInventory?.players?.[0]?.player_card?.player_name
    });
  }, [activeTeam, initialInventory]);
  
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
  const [currentWeek, setCurrentWeek] = useState(null);

  // Handle case where user is null (loader error or not logged in)
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Load lineup data when inventory changes
  useEffect(() => {
    console.log('🔄 ViewTeam - useEffect triggered for loadLineupData');
    if (inventory?.players && activeTeam) {
      console.log('✅ Calling loadLineupData with', inventory.players.length, 'players');
      loadLineupData(inventory);
    } else {
      console.log('❌ NOT calling loadLineupData:', {
        hasInventory: !!inventory,
        hasPlayers: !!inventory?.players,
        playerCount: inventory?.players?.length,
        hasActiveTeam: !!activeTeam
      });
    }
  }, [inventory, activeTeam]);

  // Load lineup data when inventory changes
  useEffect(() => {
    if (inventory?.players && activeTeam) {
      loadLineupData(inventory);
    }
  }, [inventory, activeTeam]);

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

  const loadLineupData = useCallback(async (inventory) => {
    if (!activeTeam) {
      console.log('❌ Missing activeTeam');
      return;
    }
    
    console.log('✅ Loading lineup data for team:', activeTeam.team_name);
    
    try {
      // Get current week
      const { data: configData, error: configError } = await supabase
        .from('nfl_season_config')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (configError) throw configError;
      
      const weekNumber = configData.current_week;
      const seasonYear = configData.season_year;
      setCurrentWeek({ week: weekNumber, year: seasonYear });

      console.log('📅 Current week:', weekNumber);

      // Load from weekly_lineups snapshot (this is where the data is!)
      const { data: weeklyLineup, error: weeklyError } = await supabase
        .from('weekly_lineups')
        .select('lineup_snapshot, status, total_points')
        .eq('team_id', activeTeam.id)
        .eq('week_number', weekNumber)
        .eq('season_year', seasonYear)
        .maybeSingle();

      console.log('📸 Weekly lineup data:', weeklyLineup);

      if (weeklyLineup?.lineup_snapshot) {
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

        // Create mock players from snapshot data
        const mockPlayers = [];
        
        for (const [position, playerData] of Object.entries(snapshot)) {
          if (position === 'BENCH' || !playerData) continue;
          
          console.log(`📋 Position ${position}:`, playerData.player_name);
          
          // Create a mock player object that matches the inventory structure
          const mockPlayer = {
            id: playerData.player_card_id || `${position}-${playerData.player_name}`,
            player_card_id: playerData.player_card_id,
            player_card: {
              player_id: playerData.player_id,
              player_name: playerData.player_name,
              position: playerData.position,
              team_abbreviation: playerData.team_abbreviation,
              projected_points: playerData.projected_points,
              weekly_projected_points: playerData.projected_points
            },
            card_level: 1,
            is_in_lineup: true,
            lineup_position: position
          };
          
          newLineup[position] = mockPlayer;
          mockPlayers.push(mockPlayer);
        }

        setLineup(newLineup);
        
        // Load projections from snapshot
        const dbProjections = new Map();
        mockPlayers.forEach(p => {
          if (p.player_card) {
            dbProjections.set(p.player_card.player_id, {
              projected: parseFloat(p.player_card.projected_points || 0),
              source: 'snapshot'
            });
          }
        });
        setProjections(dbProjections);
        
        console.log('✅ Loaded lineup from snapshot:', newLineup);
      } else {
        // No lineup set - show empty lineup (don't show logged-in user's cards!)
        console.log('⚠️ Team has not set a lineup for this week');
        const emptyLineup = {
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
        setLineup(emptyLineup);
        setProjections(new Map());
      }

      // Load projections
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
      await loadLiveGameData(inventory.players, weekNumber, seasonYear);
    } catch (err) {
      console.error('Error loading lineup data:', err);
    }
  }, [activeTeam]);

  const loadLiveGameData = async (players, weekNumber, seasonYear) => {
    try {
      // Load games for the week
      const { data: gamesData, error: gamesError } = await supabase
        .from('game_scores')
        .select('*')
        .eq('week_number', weekNumber)
        .eq('season_year', seasonYear);
      
      if (gamesError) throw gamesError;
      
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

        const gameDataMap = new Map();
        
        statsData?.forEach(stat => {
          const game = gamesData.find(g => g.game_id === stat.game_id);
          if (game && stat.player_card?.player_id) {
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
        
        // Add scheduled games for players
        if (players && players.length > 0) {
          for (const playerCard of players) {
            if (gameDataMap.has(playerCard.player_card.player_id)) continue;
            
            const playerTeamAbbr = playerCard.player_card.team_abbreviation;
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

  // Data already loaded by loader
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary-black-50 text-xl">Redirecting...</div>
      </div>
    );
  }

  return (
    <>
      {/* View Only Banner */}
      <div className="bg-blue-900/30 border-b-2 border-blue-600 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-blue-800/50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <div className="text-blue-300 text-sm font-semibold">Viewing Team</div>
                <div className="text-blue-100 font-bold">{activeTeam?.team_name} (@{activeTeam?.user?.username})</div>
              </div>
            </div>
            <div className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              <span className="text-sm font-semibold">READ ONLY</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
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

        {/* Team Statistics */}
        {activeTeam && (
          <section aria-label="Team Statistics" className="mt-6">
            <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-primary-black-50 mb-4">Season Statistics</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-primary-black-800 rounded-lg p-4">
                  <div className="text-xs text-primary-black-400 mb-1">Record</div>
                  <div className="text-2xl font-bold text-primary-black-50">
                    <span className="text-primary-green-400">{activeTeam.wins}</span>-
                    <span className="text-red-400">{activeTeam.losses}</span>
                  </div>
                </div>
                
                <div className="bg-primary-black-800 rounded-lg p-4">
                  <div className="text-xs text-primary-black-400 mb-1">Total Points</div>
                  <div className="text-2xl font-bold text-primary-green-400">
                    {activeTeam.total_points?.toFixed(1) || 0}
                  </div>
                </div>
                
                <div className="bg-primary-black-800 rounded-lg p-4">
                  <div className="text-xs text-primary-black-400 mb-1">Current Week</div>
                  <div className="text-2xl font-bold text-primary-black-50">
                    Week {currentWeek?.week || '-'}
                  </div>
                </div>
                
                <div className="bg-primary-black-800 rounded-lg p-4">
                  <div className="text-xs text-primary-black-400 mb-1">Roster Size</div>
                  <div className="text-2xl font-bold text-primary-black-50">
                    {inventory?.players?.length || 0}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
