import { BalldontlieAPI } from '@balldontlie/sdk';

// Initialize the API client
// You'll need to add your API key to a .env file
const apiKey = import.meta.env.VITE_BALLDONTLIE_API_KEY || '';
const api = new BalldontlieAPI({ apiKey });

// Player Services
export const searchPlayers = async (searchTerm, perPage = 25) => {
  try {
    const response = await api.nfl.getPlayers({ 
      search: searchTerm,
      per_page: perPage 
    });
    return response; // Return full response, not response.data
  } catch (error) {
    console.error('Error searching players:', error);
    throw error;
  }
};

export const getPlayer = async (playerId) => {
  try {
    // Use getPlayers with player_ids filter since getPlayer doesn't exist
    const response = await api.nfl.getPlayers({ 
      player_ids: [parseInt(playerId)]
    });
    // Return the first player from the response
    return response?.data?.[0] || null;
  } catch (error) {
    console.error('Error fetching player:', error);
    throw error;
  }
};

export const getActivePlayers = async (options = {}) => {
  try {
    const response = await api.nfl.getActivePlayers(options);
    return response; // Return full response
  } catch (error) {
    console.error('Error fetching active players:', error);
    throw error;
  }
};

// Stats Services
export const getPlayerStats = async (playerId, season = 2025) => {
  try {
    const response = await api.nfl.getStats({
      player_ids: [parseInt(playerId)],
      seasons: [season]
    });
    return response;
  } catch (error) {
    console.error('Error fetching player stats:', error);
    throw error;
  }
};

export const getPlayerSeasonStats = async (playerId, season = 2025) => {
  try {
    const response = await api.nfl.getSeasonStats({
      season,
      player_ids: [parseInt(playerId)]
    });
    return response;
  } catch (error) {
    console.error('Error fetching season stats:', error);
    throw error;
  }
};

// Game Services
export const getGames = async (options = {}) => {
  try {
    const response = await api.nfl.getGames(options);
    return response;
  } catch (error) {
    console.error('Error fetching games:', error);
    throw error;
  }
};

export const getGame = async (gameId) => {
  try {
    const response = await api.nfl.getGame(gameId);
    return response;
  } catch (error) {
    console.error('Error fetching game:', error);
    throw error;
  }
};

// Team Services
export const getTeams = async (options = {}) => {
  try {
    const response = await api.nfl.getTeams(options);
    return response;
  } catch (error) {
    console.error('Error fetching teams:', error);
    throw error;
  }
};

export const getTeam = async (teamId) => {
  try {
    const response = await api.nfl.getTeam(teamId);
    return response;
  } catch (error) {
    console.error('Error fetching team:', error);
    throw error;
  }
};

export const getStandings = async (season = 2025) => {
  try {
    const response = await api.nfl.getStandings({ season });
    return response;
  } catch (error) {
    console.error('Error fetching standings:', error);
    throw error;
  }
};

// Injury Services
export const getPlayerInjuries = async (options = {}) => {
  try {
    const response = await api.nfl.getPlayerInjuries(options);
    return response;
  } catch (error) {
    console.error('Error fetching injuries:', error);
    throw error;
  }
};
