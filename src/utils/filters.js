/**
 * Array and collection filter utilities
 * 
 * Reusable filter functions for common data filtering patterns
 */

/**
 * Filter players by position
 * @param {Array} players - Array of players
 * @param {string} position - Position to filter by ('all' for no filter)
 * @returns {Array} Filtered players
 */
export function filterPlayersByPosition(players, position) {
  if (!players || !Array.isArray(players)) return [];
  if (position === 'all' || !position) return players;
  
  return players.filter(player => player.position === position);
}

/**
 * Filter players by search term (name, team)
 * @param {Array} players - Array of players
 * @param {string} searchTerm - Search term
 * @returns {Array} Filtered players
 */
export function filterPlayersBySearch(players, searchTerm) {
  if (!players || !Array.isArray(players)) return [];
  if (!searchTerm || searchTerm.trim() === '') return players;
  
  const term = searchTerm.toLowerCase().trim();
  
  return players.filter(player => {
    const fullName = `${player.first_name || ''} ${player.last_name || ''}`.toLowerCase();
    const teamName = player.team?.name?.toLowerCase() || '';
    const teamAbbr = player.team?.abbreviation?.toLowerCase() || '';
    
    return fullName.includes(term) || 
           teamName.includes(term) || 
           teamAbbr.includes(term);
  });
}

/**
 * Filter inventory items by type
 * @param {Object} inventory - Inventory object with players and tokens
 * @param {string} type - Type to filter ('players', 'tokens', or 'all')
 * @returns {Array} Filtered items
 */
export function filterInventoryByType(inventory, type) {
  if (!inventory) return [];
  
  if (type === 'players') return inventory.players || [];
  if (type === 'tokens') return inventory.tokens || [];
  if (type === 'all') return [...(inventory.players || []), ...(inventory.tokens || [])];
  
  return [];
}

/**
 * Filter players by lineup status
 * @param {Array} players - Array of players from inventory
 * @param {boolean} inLineup - True for starters, false for bench
 * @returns {Array} Filtered players
 */
export function filterPlayersByLineupStatus(players, inLineup) {
  if (!players || !Array.isArray(players)) return [];
  return players.filter(p => p.is_in_lineup === inLineup);
}

/**
 * Filter players by injury status
 * @param {Array} players - Array of players
 * @param {string} status - Injury status ('healthy', 'questionable', 'doubtful', 'out', 'injured')
 * @returns {Array} Filtered players
 */
export function filterPlayersByInjuryStatus(players, status) {
  if (!players || !Array.isArray(players)) return [];
  if (status === 'all') return players;
  
  if (status === 'injured') {
    // Return all injured players (not healthy)
    return players.filter(p => {
      const injuryStatus = p.player_card?.injury_status || p.injury_status || 'healthy';
      return injuryStatus !== 'healthy';
    });
  }
  
  return players.filter(p => {
    const injuryStatus = p.player_card?.injury_status || p.injury_status || 'healthy';
    return injuryStatus === status;
  });
}

/**
 * Filter teams by active status
 * @param {Array} teams - Array of teams
 * @param {boolean} isActive - Active status to filter by
 * @returns {Array} Filtered teams
 */
export function filterTeamsByActive(teams, isActive = true) {
  if (!teams || !Array.isArray(teams)) return [];
  return teams.filter(team => team.is_active === isActive);
}

/**
 * Filter teams by bot status
 * @param {Array} teams - Array of teams
 * @param {boolean} isBot - Bot status to filter by
 * @returns {Array} Filtered teams
 */
export function filterTeamsByBot(teams, isBot) {
  if (!teams || !Array.isArray(teams)) return [];
  if (isBot === undefined || isBot === null) return teams;
  return teams.filter(team => team.is_bot === isBot);
}

/**
 * Filter by simulated season
 * @param {Array} items - Array of items with simulated_season_id
 * @param {string|null} seasonId - Season ID to filter by (null for non-simulated)
 * @returns {Array} Filtered items
 */
export function filterBySimulatedSeason(items, seasonId) {
  if (!items || !Array.isArray(items)) return [];
  
  if (seasonId === null) {
    return items.filter(item => !item.simulated_season_id);
  }
  
  return items.filter(item => item.simulated_season_id === seasonId);
}
