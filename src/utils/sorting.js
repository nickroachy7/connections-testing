/**
 * Array sorting utilities
 * 
 * Reusable sort functions for common sorting patterns
 */

/**
 * Sort players by name
 * @param {Array} players - Array of players
 * @param {boolean} ascending - Sort direction
 * @returns {Array} Sorted players
 */
export function sortPlayersByName(players, ascending = true) {
  if (!players || !Array.isArray(players)) return [];
  
  return [...players].sort((a, b) => {
    const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim();
    const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim();
    
    const comparison = nameA.localeCompare(nameB);
    return ascending ? comparison : -comparison;
  });
}

/**
 * Sort players by position
 * @param {Array} players - Array of players
 * @param {Object} sport - Sport config object (optional, uses current sport if not provided)
 * @returns {Array} Sorted players
 */
export function sortPlayersByPosition(players, sport = null) {
  if (!players || !Array.isArray(players)) return [];
  
  // Build position order from sport config
  let positionOrder = {};
  
  if (sport) {
    sport.positions.forEach((pos, index) => {
      positionOrder[pos.id] = index + 1;
      positionOrder[pos.shortName] = index + 1;
    });
  } else {
    // Fallback to NFL order if no sport provided
    positionOrder = { QB: 1, RB: 2, WR: 3, TE: 4, K: 5, DEF: 6 };
  }
  
  return [...players].sort((a, b) => {
    const orderA = positionOrder[a.position] || 999;
    const orderB = positionOrder[b.position] || 999;
    return orderA - orderB;
  });
}

/**
 * Sort players by fantasy points
 * @param {Array} players - Array of players
 * @param {Map|Object} fantasyPoints - Map or object of player ID to points
 * @param {boolean} descending - Sort direction
 * @returns {Array} Sorted players
 */
export function sortPlayersByFantasyPoints(players, fantasyPoints, descending = true) {
  if (!players || !Array.isArray(players)) return [];
  
  return [...players].sort((a, b) => {
    const pointsA = fantasyPoints instanceof Map 
      ? (fantasyPoints.get(a.id) || 0)
      : (fantasyPoints[a.id] || 0);
    const pointsB = fantasyPoints instanceof Map
      ? (fantasyPoints.get(b.id) || 0)
      : (fantasyPoints[b.id] || 0);
    
    return descending ? pointsB - pointsA : pointsA - pointsB;
  });
}

/**
 * Sort players by projected points
 * @param {Array} players - Array of players with projections
 * @param {boolean} descending - Sort direction
 * @returns {Array} Sorted players
 */
export function sortPlayersByProjection(players, descending = true) {
  if (!players || !Array.isArray(players)) return [];
  
  return [...players].sort((a, b) => {
    const projA = a.player_card?.weekly_projected_points || a.projected_points || 0;
    const projB = b.player_card?.weekly_projected_points || b.projected_points || 0;
    
    return descending ? projB - projA : projA - projB;
  });
}

/**
 * Sort teams by record (wins descending, then by total points)
 * @param {Array} teams - Array of teams
 * @returns {Array} Sorted teams
 */
export function sortTeamsByRecord(teams) {
  if (!teams || !Array.isArray(teams)) return [];
  
  return [...teams].sort((a, b) => {
    // First by wins
    if ((b.wins || 0) !== (a.wins || 0)) {
      return (b.wins || 0) - (a.wins || 0);
    }
    
    // Then by total points
    return (b.total_points || 0) - (a.total_points || 0);
  });
}

/**
 * Sort leaderboard by different criteria
 * @param {Array} leaderboard - Leaderboard data
 * @param {string} sortBy - Sort criteria ('week', 'projected', 'season', 'wins')
 * @returns {Array} Sorted leaderboard
 */
export function sortLeaderboard(leaderboard, sortBy = 'week') {
  if (!leaderboard || !Array.isArray(leaderboard)) return [];
  
  // Separate filled and empty entries
  const filled = leaderboard.filter(l => !l.isEmpty);
  const empty = leaderboard.filter(l => l.isEmpty);
  
  let sorted = [...filled];
  
  switch (sortBy) {
    case 'week':
      sorted.sort((a, b) => (b.week_points || 0) - (a.week_points || 0));
      break;
    case 'projected':
      sorted.sort((a, b) => (b.projected_points || 0) - (a.projected_points || 0));
      break;
    case 'season':
      sorted.sort((a, b) => (b.season_total_points || 0) - (a.season_total_points || 0));
      break;
    case 'wins':
      sorted.sort((a, b) => {
        if ((b.wins || 0) !== (a.wins || 0)) {
          return (b.wins || 0) - (a.wins || 0);
        }
        return (b.season_total_points || 0) - (a.season_total_points || 0);
      });
      break;
    default:
      sorted.sort((a, b) => (b.week_points || 0) - (a.week_points || 0));
  }
  
  // Add rank
  sorted = sorted.map((item, index) => ({
    ...item,
    rank: index + 1
  }));
  
  return [...sorted, ...empty];
}

/**
 * Sort activities by date
 * @param {Array} activities - Array of activities
 * @param {boolean} newestFirst - Sort direction
 * @returns {Array} Sorted activities
 */
export function sortActivitiesByDate(activities, newestFirst = true) {
  if (!activities || !Array.isArray(activities)) return [];
  
  return [...activities].sort((a, b) => {
    const dateA = new Date(a.created_at || 0);
    const dateB = new Date(b.created_at || 0);
    
    return newestFirst ? dateB - dateA : dateA - dateB;
  });
}
