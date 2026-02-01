/**
 * Sport Configuration System
 * Defines sport-specific settings, stat mappings, and UI config
 */

export const SPORTS = {
  NFL: {
    id: 'nfl',
    name: 'NFL',
    fullName: 'National Football League',
    enabled: true,
    positions: [
      { id: 'QB', name: 'Quarterback', shortName: 'QB', color: { bg: 'bg-red-600', text: 'text-white' } },
      { id: 'RB', name: 'Running Back', shortName: 'RB', color: { bg: 'bg-primary-green-600', text: 'text-white' } },
      { id: 'WR', name: 'Wide Receiver', shortName: 'WR', color: { bg: 'bg-blue-600', text: 'text-white' } },
      { id: 'TE', name: 'Tight End', shortName: 'TE', color: { bg: 'bg-purple-600', text: 'text-white' } },
      { id: 'K', name: 'Kicker', shortName: 'K', color: { bg: 'bg-orange-600', text: 'text-white' } },
      { id: 'DEF', name: 'Defense', shortName: 'DEF', color: { bg: 'bg-gray-600', text: 'text-white' } }
    ],
    statCategories: {
      passing: {
        name: 'Passing',
        stats: ['passYards', 'passTouchdowns', 'interceptions', 'passCompletions', 'passAttempts']
      },
      rushing: {
        name: 'Rushing',
        stats: ['rushYards', 'rushTouchdowns', 'rushAttempts']
      },
      receiving: {
        name: 'Receiving',
        stats: ['receptions', 'receivingYards', 'receivingTouchdowns', 'targets']
      },
      kicking: {
        name: 'Kicking',
        stats: ['fieldGoalsMade', 'fieldGoalsAttempted', 'extraPointsMade']
      },
      defense: {
        name: 'Defense',
        stats: ['sacks', 'interceptions', 'forcedFumbles', 'tackles']
      }
    },
    displayStats: {
      QB: ['passYards', 'passTouchdowns', 'interceptions'],
      RB: ['rushYards', 'rushTouchdowns', 'receptions'],
      WR: ['receptions', 'receivingYards', 'receivingTouchdowns'],
      TE: ['receptions', 'receivingYards', 'receivingTouchdowns'],
      K: ['fieldGoalsMade', 'fieldGoalsAttempted', 'extraPointsMade'],
      DEF: ['sacks', 'interceptions', 'pointsAllowed']
    },
    season: {
      current: 2024,
      weeks: 18,
      hasPlayoffs: true
    }
  },
  
  NBA: {
    id: 'nba',
    name: 'NBA',
    fullName: 'National Basketball Association',
    enabled: false, // Coming soon
    positions: [
      { id: 'PG', name: 'Point Guard', shortName: 'PG' },
      { id: 'SG', name: 'Shooting Guard', shortName: 'SG' },
      { id: 'SF', name: 'Small Forward', shortName: 'SF' },
      { id: 'PF', name: 'Power Forward', shortName: 'PF' },
      { id: 'C', name: 'Center', shortName: 'C' }
    ],
    statCategories: {
      scoring: {
        name: 'Scoring',
        stats: ['points', 'fieldGoalPct', 'threePointPct', 'freeThrowPct']
      },
      playmaking: {
        name: 'Playmaking',
        stats: ['assists', 'turnovers', 'assistToTurnoverRatio']
      },
      rebounding: {
        name: 'Rebounding',
        stats: ['rebounds', 'offensiveRebounds', 'defensiveRebounds']
      },
      defense: {
        name: 'Defense',
        stats: ['steals', 'blocks', 'defensiveRating']
      }
    },
    displayStats: {
      PG: ['points', 'assists', 'rebounds'],
      SG: ['points', 'threePointers', 'rebounds'],
      SF: ['points', 'rebounds', 'assists'],
      PF: ['points', 'rebounds', 'blocks'],
      C: ['points', 'rebounds', 'blocks']
    },
    season: {
      current: 2024,
      games: 82,
      hasPlayoffs: true
    }
  },
  
  MLB: {
    id: 'mlb',
    name: 'MLB',
    fullName: 'Major League Baseball',
    enabled: false, // Coming soon
    positions: [
      { id: 'SP', name: 'Starting Pitcher', shortName: 'SP' },
      { id: 'RP', name: 'Relief Pitcher', shortName: 'RP' },
      { id: 'C', name: 'Catcher', shortName: 'C' },
      { id: '1B', name: 'First Base', shortName: '1B' },
      { id: '2B', name: 'Second Base', shortName: '2B' },
      { id: '3B', name: 'Third Base', shortName: '3B' },
      { id: 'SS', name: 'Shortstop', shortName: 'SS' },
      { id: 'OF', name: 'Outfield', shortName: 'OF' },
      { id: 'DH', name: 'Designated Hitter', shortName: 'DH' }
    ],
    statCategories: {
      batting: {
        name: 'Batting',
        stats: ['battingAvg', 'homeRuns', 'rbi', 'runs', 'hits']
      },
      pitching: {
        name: 'Pitching',
        stats: ['era', 'wins', 'strikeouts', 'saves', 'whip']
      },
      baserunning: {
        name: 'Baserunning',
        stats: ['stolenBases', 'caughtStealing']
      }
    },
    displayStats: {
      SP: ['era', 'strikeouts', 'wins'],
      RP: ['era', 'saves', 'strikeouts'],
      C: ['battingAvg', 'homeRuns', 'rbi'],
      '1B': ['battingAvg', 'homeRuns', 'rbi'],
      '2B': ['battingAvg', 'runs', 'stolenBases'],
      '3B': ['battingAvg', 'homeRuns', 'rbi'],
      SS: ['battingAvg', 'runs', 'stolenBases'],
      OF: ['battingAvg', 'homeRuns', 'rbi'],
      DH: ['battingAvg', 'homeRuns', 'rbi']
    },
    season: {
      current: 2024,
      games: 162,
      hasPlayoffs: true
    }
  }
};

/**
 * Get enabled sports
 */
export const getEnabledSports = () => {
  return Object.values(SPORTS).filter(sport => sport.enabled);
};

/**
 * Get sport by ID
 */
export const getSportById = (sportId) => {
  const sport = Object.values(SPORTS).find(s => s.id === sportId);
  if (!sport) {
    throw new Error(`Sport not found: ${sportId}`);
  }
  return sport;
};

/**
 * Get current active sport (default to NFL for now)
 */
export const getCurrentSport = () => {
  // In the future, this could read from user settings or URL params
  return SPORTS.NFL;
};

/**
 * Get positions for a sport
 */
export const getPositions = (sportId) => {
  const sport = getSportById(sportId);
  return sport.positions;
};

/**
 * Get display stats for a position
 */
export const getDisplayStats = (sportId, position) => {
  const sport = getSportById(sportId);
  return sport.displayStats[position] || [];
};
