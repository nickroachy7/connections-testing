import { useMemo } from 'react';
import { STARTING_POSITIONS } from '../../constants/lineup';

/**
 * Custom hook to calculate all lineup statistics
 * This is a DERIVED calculation hook - it computes values from existing state
 * 
 * Returns:
 * - projectedPoints: Sum of projected points for starting lineup
 * - livePoints: Sum of live points (games in progress or final)
 * - projectedFinal: Live points + projected points for games not started
 * - playerBreakdown: Detailed breakdown per position
 * 
 * @param {Object} lineup - Current lineup state
 * @param {Map} projections - Map of player projections (player_id -> projection data)
 * @param {Map} liveGameData - Map of live game data (player_id -> game data)
 */
export function useLineupStats(lineup, projections, liveGameData) {
  const stats = useMemo(() => {
    if (!lineup) {
      return {
        projectedPoints: 0,
        livePoints: 0,
        projectedFinal: 0,
        playerBreakdown: [],
        hasAnyLiveGames: false,
        hasAnyFinalGames: false
      };
    }

    // Use only STARTING positions - excludes bench players
    const positions = STARTING_POSITIONS;
    let totalProjected = 0;
    let totalLive = 0;
    let totalProjectedFinal = 0;
    let hasAnyLiveGames = false;
    let hasAnyFinalGames = false;
    const playerBreakdown = [];

    positions.forEach(pos => {
      const player = lineup[pos];
      if (!player?.player_card?.player_id) {
        playerBreakdown.push({
          position: pos,
          playerName: null,
          projected: 0,
          live: 0,
          gameStatus: null,
          isEmpty: true
        });
        return;
      }

      const playerId = player.player_card.player_id;
      const playerName = player.player_card.player_name;

      // Get projection (from DB or Map)
      let projectedValue = 0;
      
      // Get live game data first
      const gameData = liveGameData?.get(playerId);
      const gameStatus = gameData?.gameStatus?.toLowerCase() || 'scheduled';
      const isGameStarted = ['live', 'halftime', 'final'].includes(gameStatus);
      const liveValue = isGameStarted ? (gameData?.currentPoints || 0) : 0;
      
      // CRITICAL: Use live points if game has started, otherwise use weekly projection
      // This ensures displayed points match what users see in the lineup view
      if (isGameStarted && liveValue > 0) {
        projectedValue = liveValue;
      } else {
        const weeklyProj = player.player_card.weekly_projected_points;
        if (weeklyProj && parseFloat(weeklyProj) > 0) {
          projectedValue = parseFloat(weeklyProj);
        } else if (projections?.has(playerId)) {
          const projection = projections.get(playerId);
          projectedValue = projection?.projected || 0;
        }
      }

      // Track game states
      if (gameStatus === 'live' || gameStatus === 'halftime') {
        hasAnyLiveGames = true;
      }
      if (gameStatus === 'final') {
        hasAnyFinalGames = true;
      }

      // Calculate totals
      totalProjected += projectedValue;
      totalLive += liveValue;
      
      // Projected Final: use live points if game started, otherwise use projection
      totalProjectedFinal += isGameStarted ? liveValue : projectedValue;

      playerBreakdown.push({
        position: pos,
        playerName,
        playerId,
        projected: projectedValue,
        live: liveValue,
        gameStatus,
        isGameStarted,
        isEmpty: false
      });
    });

    return {
      projectedPoints: totalProjected,
      livePoints: totalLive,
      projectedFinal: totalProjectedFinal,
      playerBreakdown,
      hasAnyLiveGames,
      hasAnyFinalGames
    };
  }, [lineup, projections, liveGameData]);

  return stats;
}
