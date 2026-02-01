/**
 * Base class for sport data sources
 * All sport APIs must implement this interface
 */
export class BaseSportDataSource {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Get all players for a sport
   * @param {Object} filters - Filter options (position, team, etc.)
   * @returns {Promise<Array>} Array of player objects
   */
  async getPlayers(filters = {}) {
    throw new Error('getPlayers() must be implemented');
  }

  /**
   * Get player stats for a specific game/week
   * @param {string} playerId - Player identifier
   * @param {Object} options - { season, week, gameId }
   * @returns {Promise<Object>} Player stats object
   */
  async getPlayerStats(playerId, options = {}) {
    throw new Error('getPlayerStats() must be implemented');
  }

  /**
   * Get live game data
   * @param {string} gameId - Game identifier
   * @returns {Promise<Object>} Live game data
   */
  async getLiveGameData(gameId) {
    throw new Error('getLiveGameData() must be implemented');
  }

  /**
   * Get player projections for upcoming games
   * @param {Object} options - { week, season, playerIds }
   * @returns {Promise<Array>} Array of projection objects
   */
  async getProjections(options = {}) {
    throw new Error('getProjections() must be implemented');
  }

  /**
   * Get game schedule
   * @param {Object} options - { week, season, team }
   * @returns {Promise<Array>} Array of game objects
   */
  async getSchedule(options = {}) {
    throw new Error('getSchedule() must be implemented');
  }

  /**
   * Get teams for this sport
   * @returns {Promise<Array>} Array of team objects
   */
  async getTeams() {
    throw new Error('getTeams() must be implemented');
  }

  /**
   * Normalize player data to common format
   * @param {Object} rawPlayer - Raw player data from API
   * @returns {Object} Normalized player object
   */
  normalizePlayer(rawPlayer) {
    throw new Error('normalizePlayer() must be implemented');
  }

  /**
   * Normalize stats data to common format
   * @param {Object} rawStats - Raw stats data from API
   * @returns {Object} Normalized stats object
   */
  normalizeStats(rawStats) {
    throw new Error('normalizeStats() must be implemented');
  }
}
