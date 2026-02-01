import { NFLDataSource } from './NFLDataSource.js';

/**
 * Sport data source factory
 * Returns the appropriate data source for a given sport code
 */
export function getSportDataSource(sportCode, apiKey) {
  switch (sportCode.toLowerCase()) {
    case 'nfl':
      return new NFLDataSource(apiKey);
    
    case 'nba':
      // TODO: Implement NBADataSource
      throw new Error('NBA data source not yet implemented');
    
    case 'mlb':
      // TODO: Implement MLBDataSource
      throw new Error('MLB data source not yet implemented');
    
    default:
      throw new Error(`Unknown sport code: ${sportCode}`);
  }
}

/**
 * Get supported sport codes
 */
export function getSupportedSports() {
  return ['nfl']; // Add 'nba', 'mlb' as we implement them
}

export { BaseSportDataSource } from './BaseSportDataSource.js';
export { NFLDataSource } from './NFLDataSource.js';
