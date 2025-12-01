import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { getPlayer, getPlayerStats } from '../../services/nflApi';

/**
 * usePlayerProfile Hook
 * 
 * Fetches comprehensive player data for the profile modal:
 * - Player inventory details (tier, level, XP, sell value)
 * - Game log from player_game_stats
 * - BallDontLie player details (physical stats if available)
 * 
 * @param {Object} player - Initial player inventory object from PlayerRow
 * @param {boolean} isOpen - Whether the modal is open (to trigger lazy loading)
 * @returns {Object} { playerData, gameLog, isLoading, error }
 */
export function usePlayerProfile(player, isOpen) {
  const [playerData, setPlayerData] = useState(null);
  const [gameLog, setGameLog] = useState([]);
  const [balldontliePlayer, setBalldontliePlayer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !player) {
      return;
    }

    const fetchPlayerProfile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 1. Fetch fresh player inventory data (with tier, level, XP)
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('user_player_inventory')
          .select(`
            *,
            player_card:player_cards!inner(
              id,
              player_id,
              player_name,
              position,
              team_abbreviation,
              base_value,
              season_ppg,
              pull_percentage,
              injury_status,
              injury_designation,
              weekly_projected_points,
              games_played_season
            )
          `)
          .eq('id', player.id)
          .single();

        if (inventoryError) throw inventoryError;

        setPlayerData(inventoryData);

        // 2. Get current NFL week to determine future weeks
        const { data: nflConfig } = await supabase
          .from('nfl_season_config')
          .select('current_week')
          .single();
        
        const currentWeek = nflConfig?.current_week || 12;

        // 3. Fetch player's team schedule from game_scores (ALL weeks, regardless of ownership)
        const playerTeam = inventoryData.player_card.team_abbreviation;
        const { data: teamSchedule, error: scheduleError } = await supabase
          .from('game_scores')
          .select('*')
          .eq('season_year', 2025)
          .or(`home_team.eq.${playerTeam},away_team.eq.${playerTeam}`)
          .order('week_number', { ascending: false });

        if (scheduleError) throw scheduleError;

        // 4. Fetch ALL player game stats for this player card (entire season)
        // This includes games before card was owned to show historical performance
        const { data: playerStats, error: statsError } = await supabase
          .from('player_game_stats')
          .select('*')
          .eq('player_card_id', inventoryData.player_card.id)
          .eq('season_year', 2025);

        if (statsError) throw statsError;

        // 5. Fetch weekly lineups to determine which weeks player was started
        const { data: weeklyLineups } = await supabase
          .from('weekly_lineups')
          .select('week_number, lineup_snapshot')
          .eq('team_id', inventoryData.team_id)
          .eq('season_year', 2025);

        // Get the card acquisition date to determine ownership
        const cardAcquiredAt = new Date(inventoryData.acquired_at);
        
        // Create full season game log (weeks 1-18)
        const fullSeasonLog = [];
        for (let week = 18; week >= 1; week--) {
          const teamGame = teamSchedule?.find(g => g.week_number === week);
          const playerStat = playerStats?.find(s => s.week_number === week);
          
          const isFutureWeek = week > currentWeek;
          
          // Check if player was in lineup this week
          const weekLineup = weeklyLineups?.find(l => l.week_number === week);
          const wasInLineup = weekLineup?.lineup_snapshot 
            ? Object.values(weekLineup.lineup_snapshot).some(
                slot => slot?.player_card_id === inventoryData.player_card.id
              )
            : false;
          
          if (teamGame) {
            // Team had a game this week (game exists in database)
            const gameDate = new Date(teamGame.game_start_time);
            // Card is owned if it was acquired BEFORE the game started
            const wasOwned = cardAcquiredAt <= gameDate;
            
            if (playerStat) {
              // We have stats for this game (show fantasy points)
              fullSeasonLog.push({
                ...playerStat,
                game: teamGame,
                wasOwned,
                wasInLineup,
                notOnRoster: !wasOwned
              });
            } else {
              // Team played but no stats available in database
              fullSeasonLog.push({
                week_number: week,
                season_year: 2025,
                game: teamGame,
                wasOwned,
                wasInLineup,
                notOnRoster: !wasOwned,
                stats: {},
                fantasy_points: null // null = no data, 0 = played but scored 0
              });
            }
          } else {
            // No game in database for this week
            if (isFutureWeek) {
              // Future week - game hasn't been scheduled/played yet
              fullSeasonLog.push({
                week_number: week,
                season_year: 2025,
                isFuture: true,
                game: {
                  week_number: week,
                  season_year: 2025
                }
              });
            } else {
              // Past/current week with no game = BYE week
              fullSeasonLog.push({
                week_number: week,
                season_year: 2025,
                isBye: true,
                game: {
                  week_number: week,
                  season_year: 2025
                }
              });
            }
          }
        }

        setGameLog(fullSeasonLog);

        // 3. Fetch BallDontLie player details (for physical stats if available)
        // Note: BallDontLie doesn't have detailed physical stats, so this is optional
        try {
          const bdlPlayer = await getPlayer(inventoryData.player_card.player_id);
          setBalldontliePlayer(bdlPlayer);
        } catch (bdlError) {
          console.warn('Could not fetch BallDontLie player details:', bdlError);
          // Non-critical, continue without it
        }

      } catch (err) {
        console.error('Error fetching player profile:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayerProfile();
  }, [player, isOpen]);

  return {
    playerData: playerData || player, // Fallback to initial player data
    gameLog,
    balldontliePlayer,
    isLoading,
    error
  };
}
