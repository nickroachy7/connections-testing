import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function LineupPreview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lineup, setLineup] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveGameData, setLiveGameData] = useState(new Map());
  const [projections, setProjections] = useState(new Map());

  // Load lineup once on mount
  useEffect(() => {
    if (!user) return;
    loadLineup();
  }, []); // Only run once - user doesn't change after mount

  // Load live game data when lineup changes
  useEffect(() => {
    if (!user || lineup.length === 0) return;
    
    loadLiveGameData();

    // Subscribe to game updates - but don't re-subscribe constantly
    const channel = supabase
      .channel('lineup-preview-games')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_game_stats'
        },
        () => {
          loadLiveGameData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lineup.length]); // Only re-subscribe when lineup size changes

  // Subscribe to lineup changes - separate effect
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('lineup-preview-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_player_inventory'
        },
        () => {
          loadLineup();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Only subscribe once

  const loadLineup = async () => {
    try {
      // Get user's active team
      const { data: teams, error: teamsError } = await supabase
        .from('user_teams')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (teamsError) throw teamsError;

      // Get starting lineup
      const { data: lineupData, error: lineupError } = await supabase
        .from('user_player_inventory')
        .select(`
          id,
          lineup_position,
          is_locked,
          total_fantasy_points,
          player_card:player_cards!inner(
            player_id,
            player_name,
            position,
            team_abbreviation,
            weekly_projected_points,
            projected_points
          )
        `)
        .eq('team_id', teams.id)
        .eq('is_in_lineup', true)
        .order('lineup_position');

      if (lineupError) throw lineupError;

      setLineup(lineupData || []);
      
      // Load projections from database (same as TeamManager)
      if (lineupData && lineupData.length > 0) {
        const dbProjections = new Map();
        lineupData.forEach(p => {
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
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading lineup:', err);
      setLoading(false);
    }
  };
  
  // Helper function for baseline projections (same as TeamManager)
  const getBaselineProjection = (position) => {
    const baselines = {
      'Quarterback': 18,
      'Running Back': 12,
      'Wide Receiver': 10,
      'Tight End': 8,
    };
    return baselines[position] || 8;
  };

  const loadLiveGameData = async () => {
    try {
      // Calculate current week
      const today = new Date();
      const seasonYear = today.getFullYear();
      const weekNumber = Math.floor((today.getTime() - new Date(seasonYear, 8, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
      
      // Load games for current week
      const { data: gamesData, error: gamesError } = await supabase
        .from('game_scores')
        .select('*')
        .eq('week_number', weekNumber)
        .eq('season_year', seasonYear);
      
      if (gamesError) throw gamesError;
      
      // Load player stats for current week
      if (gamesData && gamesData.length > 0) {
        const gameIds = gamesData.map(g => g.game_id);
        
        const { data: statsData, error: statsError } = await supabase
          .from('player_game_stats')
          .select('*')
          .in('game_id', gameIds);
        
        if (statsError) throw statsError;

        // Create a map of player_id -> game data for players with stats
        const gameDataMap = new Map();
        
        statsData?.forEach(stat => {
          const game = gamesData.find(g => g.game_id === stat.game_id);
          if (game) {
            gameDataMap.set(stat.player_id, {
              gameStatus: game.game_status,
              currentPoints: stat.fantasy_points,
              gameStartTime: game.game_start_time
            });
          }
        });
        
        // Also add scheduled games for players in lineup
        if (lineup && lineup.length > 0) {
          for (const player of lineup) {
            // Skip if we already have data for this player
            if (gameDataMap.has(player.player_card.player_id)) continue;
            
            const playerTeamAbbr = player.player_card.team_abbreviation;
            
            // Find if this player's team has a game this week
            const teamGame = gamesData.find(g => 
              g.home_team === playerTeamAbbr || g.away_team === playerTeamAbbr
            );
            
            if (teamGame && teamGame.game_status === 'scheduled') {
              const isHome = teamGame.home_team === playerTeamAbbr;
              const opponent = isHome ? teamGame.away_team : teamGame.home_team;
              
              gameDataMap.set(player.player_card.player_id, {
                gameStatus: 'scheduled',
                currentPoints: 0,
                gameStartTime: teamGame.game_start_time,
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

  if (loading) {
    return (
      <div className="bg-primary-black-800 rounded-xl p-6 border border-primary-black-700">
        <h2 className="text-xl font-bold text-primary-black-50 mb-4">This Week's Lineup</h2>
        <div className="text-primary-black-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-primary-black-800 rounded-xl p-6 border border-primary-black-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-primary-black-50">This Week's Lineup</h2>
        <button
          onClick={() => navigate('/starting-lineup')}
          className="text-primary-green-400 hover:text-primary-green-300 text-sm font-semibold"
        >
          Edit →
        </button>
      </div>

      {lineup.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-primary-black-400 mb-4">No lineup set yet</p>
          <button
            onClick={() => navigate('/starting-lineup')}
            className="bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 py-2 px-4 rounded-lg font-semibold transition-colors"
          >
            Set Lineup
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {lineup.map((player) => {
            const gameData = liveGameData.get(player.player_card.player_id);
            const projection = projections.get(player.player_card.player_id);
            const isLive = gameData && (gameData.gameStatus === 'live' || gameData.gameStatus === 'halftime');
            const isScheduled = gameData && gameData.gameStatus === 'scheduled';

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  player.is_locked ? 'bg-primary-black-900/60 border border-primary-black-600' : 'bg-primary-black-900'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 text-center">
                    <div className="text-xs text-primary-black-400 font-semibold">{player.lineup_position}</div>
                    <div className="text-xs text-primary-black-500">{player.player_card.position}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-primary-black-50 truncate">
                      {player.player_card.player_name}
                    </div>
                    <div className="text-xs text-primary-black-400">
                      {player.player_card.team_abbreviation}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isLive && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-green-400 font-bold">🔴 LIVE</span>
                      <span className="text-sm font-bold text-green-400">
                        {gameData.currentPoints.toFixed(1)}
                      </span>
                    </div>
                  )}
                  
                  {isScheduled && projection && (
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-primary-black-400">
                        {gameData.isHome ? 'vs' : '@'} {gameData.opponent}
                      </div>
                      <div className="text-sm text-primary-green-400 font-semibold">
                        {projection.projected.toFixed(1)}
                      </div>
                    </div>
                  )}
                  
                  {!isLive && !isScheduled && projection && (
                    <div className="text-sm text-primary-green-400 font-semibold">
                      {projection.projected.toFixed(1)}
                    </div>
                  )}

                  {player.is_locked && (
                    <span className="text-red-400 text-xs">🔒</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => navigate('/starting-lineup')}
        className="w-full mt-4 bg-primary-black-700 hover:bg-primary-black-600 text-primary-black-300 hover:text-primary-black-50 py-2 px-4 rounded-lg font-medium transition-colors text-sm"
      >
        View Full Team Manager
      </button>
    </div>
  );
}
