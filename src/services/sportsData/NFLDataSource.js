import { BalldontlieAPI } from '@balldontlie/sdk';
import { BaseSportDataSource } from './BaseSportDataSource.js';

/**
 * NFL data source using BallDontLie API
 */
export class NFLDataSource extends BaseSportDataSource {
  constructor(apiKey) {
    super(apiKey);
    this.api = new BalldontlieAPI({ apiKey });
    this.sportCode = 'nfl';
  }

  async getPlayers(filters = {}) {
    try {
      const { position, team, active = true } = filters;
      const params = {};
      
      if (position) params.position = position;
      if (team) params.team_id = team;
      
      const response = await this.api.nfl.getPlayers(params);
      return response.data.map(player => this.normalizePlayer(player));
    } catch (error) {
      console.error('Error fetching NFL players:', error);
      throw error;
    }
  }

  async getPlayerStats(playerId, options = {}) {
    try {
      const { season = 2024, week } = options;
      const params = {
        player_ids: [playerId],
        seasons: [season]
      };
      
      if (week) params.weeks = [week];
      
      const response = await this.api.nfl.getStats(params);
      return response.data.map(stat => this.normalizeStats(stat));
    } catch (error) {
      console.error('Error fetching NFL stats:', error);
      throw error;
    }
  }

  // Note: BallDontLie API does not currently support live box scores or projections
  // These methods would need to be implemented with a different data source

  async getSchedule(options = {}) {
    try {
      const { week, season = 2024, team } = options;
      const params = { season };
      
      if (week) params.week = week;
      if (team) params.team_id = team;
      
      const response = await this.api.nfl.getGames(params);
      return response.data.map(game => this.normalizeGame(game));
    } catch (error) {
      console.error('Error fetching NFL schedule:', error);
      throw error;
    }
  }

  async getTeams() {
    try {
      const response = await this.api.nfl.getTeams();
      return response.data.map(team => this.normalizeTeam(team));
    } catch (error) {
      console.error('Error fetching NFL teams:', error);
      throw error;
    }
  }

  normalizePlayer(rawPlayer) {
    return {
      id: rawPlayer.id,
      externalId: rawPlayer.id.toString(),
      sportCode: this.sportCode,
      firstName: rawPlayer.first_name,
      lastName: rawPlayer.last_name,
      fullName: `${rawPlayer.first_name} ${rawPlayer.last_name}`,
      position: rawPlayer.position_abbreviation || rawPlayer.position,
      team: rawPlayer.team?.abbreviation || null,
      teamId: rawPlayer.team?.id || null,
      jerseyNumber: rawPlayer.jersey_number,
      status: 'active', // BallDontLie doesn't provide status
      height: rawPlayer.height,
      weight: rawPlayer.weight,
      age: rawPlayer.age,
      experience: rawPlayer.experience,
      college: rawPlayer.college,
      rawData: rawPlayer // Keep original for reference
    };
  }

  normalizeStats(rawStats) {
    return {
      playerId: rawStats.player_id,
      gameId: rawStats.game_id,
      season: rawStats.season,
      week: rawStats.week,
      fantasyPoints: rawStats.fantasy_points || 0,
      stats: {
        // Passing
        passAttempts: rawStats.pass_attempts || 0,
        passCompletions: rawStats.pass_completions || 0,
        passYards: rawStats.pass_yards || 0,
        passTouchdowns: rawStats.pass_touchdowns || 0,
        interceptions: rawStats.interceptions || 0,
        
        // Rushing
        rushAttempts: rawStats.rush_attempts || 0,
        rushYards: rawStats.rush_yards || 0,
        rushTouchdowns: rawStats.rush_touchdowns || 0,
        
        // Receiving
        receptions: rawStats.receptions || 0,
        receivingYards: rawStats.receiving_yards || 0,
        receivingTouchdowns: rawStats.receiving_touchdowns || 0,
        targets: rawStats.targets || 0,
        
        // Other
        fumbles: rawStats.fumbles || 0,
        fumblesLost: rawStats.fumbles_lost || 0
      },
      rawData: rawStats
    };
  }

  normalizeGame(rawGame) {
    return {
      id: rawGame.id,
      externalId: rawGame.id.toString(),
      sportCode: this.sportCode,
      season: rawGame.season,
      week: rawGame.week,
      homeTeam: {
        name: rawGame.home_team?.full_name || rawGame.home_team?.name,
        abbreviation: rawGame.home_team?.abbreviation,
        id: rawGame.home_team?.id
      },
      awayTeam: {
        name: rawGame.visitor_team?.full_name || rawGame.visitor_team?.name,
        abbreviation: rawGame.visitor_team?.abbreviation,
        id: rawGame.visitor_team?.id
      },
      homeScore: rawGame.home_team_score,
      awayScore: rawGame.visitor_team_score,
      status: rawGame.status,
      date: rawGame.date,
      venue: rawGame.venue,
      isLive: rawGame.status === 'In Progress',
      isFinal: rawGame.status === 'Final',
      rawData: rawGame
    };
  }

  normalizeTeam(rawTeam) {
    return {
      id: rawTeam.id,
      externalId: rawTeam.id.toString(),
      sportCode: this.sportCode,
      name: rawTeam.full_name || rawTeam.name,
      abbreviation: rawTeam.abbreviation,
      city: rawTeam.city,
      conference: rawTeam.conference,
      division: rawTeam.division,
      rawData: rawTeam
    };
  }
}
