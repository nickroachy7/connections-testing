import { getPlayerSeasonStats, getPlayerInjuries } from '../services/nflApi';

// Cache for projections (expires after 5 minutes)
const projectionCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCachedProjection(playerId) {
  const cached = projectionCache.get(playerId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCachedProjection(playerId, data) {
  projectionCache.set(playerId, {
    data,
    timestamp: Date.now()
  });
}

// Base fantasy scoring constants (PPR varies by contest type)
const BASE_SCORING = {
  PASS_YD: 0.04,        // 1 pt per 25 yards
  PASS_TD: 4,
  PASS_INT: -2,
  RUSH_YD: 0.1,         // 1 pt per 10 yards
  RUSH_TD: 6,
  REC_YD: 0.1,          // 1 pt per 10 yards
  REC_TD: 6,
  FG: 3,
  XP: 1,
  DEF_SACK: 1,
  DEF_INT: 2,
  DEF_FR: 2,
  DEF_TD: 6,
};

// PPR multipliers by scoring type
const PPR_MULTIPLIERS = {
  'standard': 0.0,    // No PPR
  'half_ppr': 0.5,    // Half PPR (default)
  'full_ppr': 1.0     // Full PPR
};

/**
 * Calculate fantasy points for a QB from season stats
 * @param {object} stats - Season stats object
 * @param {string} scoringType - Scoring type (standard, half_ppr, full_ppr)
 */
function calculateQBFantasyPoints(stats, scoringType = 'half_ppr') {
  let points = 0;
  
  // Passing stats - handle both flat and nested structures
  const passing = stats.passing || stats;
  points += (passing.yards || passing.passing_yards || 0) * BASE_SCORING.PASS_YD;
  points += (passing.touchdowns || passing.passing_touchdowns || 0) * BASE_SCORING.PASS_TD;
  points += (passing.interceptions || passing.passing_interceptions || 0) * BASE_SCORING.PASS_INT;
  
  // Rushing stats (for mobile QBs) - handle both flat and nested structures
  const rushing = stats.rushing || stats;
  points += (rushing.yards || rushing.rushing_yards || 0) * BASE_SCORING.RUSH_YD;
  points += (rushing.touchdowns || rushing.rushing_touchdowns || 0) * BASE_SCORING.RUSH_TD;
  
  // QBs don't get receiving points typically, but just in case
  const receiving = stats.receiving || stats;
  const pprValue = PPR_MULTIPLIERS[scoringType] || PPR_MULTIPLIERS['half_ppr'];
  points += (receiving.receptions || 0) * pprValue;
  points += (receiving.yards || receiving.receiving_yards || 0) * BASE_SCORING.REC_YD;
  points += (receiving.touchdowns || receiving.receiving_touchdowns || 0) * BASE_SCORING.REC_TD;
  
  return points;
}

/**
 * Calculate fantasy points for RB from season stats
 * @param {object} stats - Season stats object
 * @param {string} scoringType - Scoring type (standard, half_ppr, full_ppr)
 */
function calculateRBFantasyPoints(stats, scoringType = 'half_ppr') {
  let points = 0;
  
  // Rushing stats - handle both flat and nested structures
  const rushing = stats.rushing || stats;
  points += (rushing.yards || rushing.rushing_yards || 0) * BASE_SCORING.RUSH_YD;
  points += (rushing.touchdowns || rushing.rushing_touchdowns || 0) * BASE_SCORING.RUSH_TD;
  
  // Receiving stats (for pass-catching RBs) - handle both flat and nested structures
  const receiving = stats.receiving || stats;
  points += (receiving.yards || receiving.receiving_yards || 0) * BASE_SCORING.REC_YD;
  const pprValue = PPR_MULTIPLIERS[scoringType] || PPR_MULTIPLIERS['half_ppr'];
  points += (receiving.receptions || receiving.receptions || 0) * pprValue;
  points += (receiving.touchdowns || receiving.receiving_touchdowns || 0) * BASE_SCORING.REC_TD;
  
  return points;
}

/**
 * Calculate fantasy points for WR/TE from season stats
 * @param {object} stats - Season stats object
 * @param {string} scoringType - Scoring type (standard, half_ppr, full_ppr)
 */
function calculateWRTEFantasyPoints(stats, scoringType = 'half_ppr') {
  let points = 0;
  
  // Receiving stats - handle both flat and nested structures
  const receiving = stats.receiving || stats;
  points += (receiving.yards || receiving.receiving_yards || 0) * BASE_SCORING.REC_YD;
  const pprValue = PPR_MULTIPLIERS[scoringType] || PPR_MULTIPLIERS['half_ppr'];
  points += (receiving.receptions || receiving.receptions || 0) * pprValue;
  points += (receiving.touchdowns || receiving.receiving_touchdowns || 0) * BASE_SCORING.REC_TD;
  
  // Rushing stats (for trick plays) - handle both flat and nested structures
  const rushing = stats.rushing || stats;
  points += (rushing.yards || rushing.rushing_yards || 0) * BASE_SCORING.RUSH_YD;
  points += (rushing.touchdowns || rushing.rushing_touchdowns || 0) * BASE_SCORING.RUSH_TD;
  
  return points;
}

/**
 * Calculate fantasy points for Kicker from season stats
 * @param {object} stats - Season stats object
 * @param {string} scoringType - Scoring type (not used for kickers, but kept for consistency)
 */
function calculateKFantasyPoints(stats, scoringType = 'half_ppr') {
  let points = 0;
  
  // Handle both flat and nested structures
  const kicking = stats.kicking || stats;
  points += (kicking.field_goals_made || kicking.fg_made || 0) * BASE_SCORING.FG;
  points += (kicking.extra_points_made || kicking.xp_made || 0) * BASE_SCORING.XP;
  
  return points;
}

/**
 * Calculate fantasy points for Defense from season stats
 * @param {object} stats - Season stats object
 * @param {string} scoringType - Scoring type (not used for defense, but kept for consistency)
 */
function calculateDEFFantasyPoints(stats, scoringType = 'half_ppr') {
  let points = 0;
  
  // Handle both flat and nested structures
  const defense = stats.defense || stats;
  points += (defense.sacks || defense.def_sacks || 0) * BASE_SCORING.DEF_SACK;
  points += (defense.interceptions || defense.def_interceptions || 0) * BASE_SCORING.DEF_INT;
  points += (defense.fumbles_recovered || defense.def_fumbles_recovered || 0) * BASE_SCORING.DEF_FR;
  points += (defense.touchdowns || defense.def_touchdowns || 0) * BASE_SCORING.DEF_TD;
  
  return points;
}

/**
 * Calculate fantasy points based on position and season stats
 * @param {object} seasonStats - Season stats object
 * @param {string} position - Player position
 * @param {string} scoringType - Scoring type (standard, half_ppr, full_ppr)
 */
function calculateFantasyPoints(seasonStats, position, scoringType = 'half_ppr') {
  const gamesPlayed = seasonStats.games_played || 0;
  if (gamesPlayed === 0) return 0;
  
  let totalPoints = 0;
  
  switch (position) {
    case 'Quarterback':
      totalPoints = calculateQBFantasyPoints(seasonStats, scoringType);
      break;
    case 'Running Back':
      totalPoints = calculateRBFantasyPoints(seasonStats, scoringType);
      break;
    case 'Wide Receiver':
    case 'Tight End':
      totalPoints = calculateWRTEFantasyPoints(seasonStats, scoringType);
      break;
    case 'Kicker':
      totalPoints = calculateKFantasyPoints(seasonStats, scoringType);
      break;
    case 'Defense':
      totalPoints = calculateDEFFantasyPoints(seasonStats, scoringType);
      break;
    default:
      return 0;
  }
  
  // Return per-game average
  return totalPoints / gamesPlayed;
}

/**
 * Get injury multiplier based on status
 * Returns 0 if player is ruled out, otherwise adjusts projection based on injury severity
 */
function getInjuryMultiplier(injuryStatus) {
  if (!injuryStatus || injuryStatus === 'healthy') return 1.0;
  
  const status = injuryStatus.toLowerCase();
  
  // Player definitely not playing
  if (status.includes('out') || 
      status.includes('ir') || 
      status.includes('injured reserve') ||
      status.includes('suspended') ||
      status.includes('pup') ||
      status.includes('physically unable to perform')) {
    console.log(`🚫 Player ruled OUT (${injuryStatus}) - Projection set to 0`);
    return 0.0;
  }
  
  // Very unlikely to play
  if (status.includes('doubtful')) {
    console.log(`⚠️ Player DOUBTFUL (${injuryStatus}) - Projection reduced to 30%`);
    return 0.3;
  }
  
  // Game-time decision, may have limitations
  if (status.includes('questionable') || status.includes('gtd')) {
    console.log(`⚠️ Player QUESTIONABLE (${injuryStatus}) - Projection reduced to 80%`);
    return 0.8;
  }
  
  // Probable means likely to play with minor impact
  if (status.includes('probable')) {
    console.log(`⚠️ Player PROBABLE (${injuryStatus}) - Projection reduced to 95%`);
    return 0.95;
  }
  
  return 1.0; // Healthy or unlisted
}

/**
 * Calculate projected points for a player
 * @param {string} playerId - The BallDontLie player ID
 * @param {string} position - Player position (Quarterback, Running Back, etc)
 * @param {number} season - Season year (default 2025)
 * @param {string} scoringType - Scoring type (standard, half_ppr, full_ppr) - defaults to half_ppr
 * @returns {Promise<{projected: number, seasonAvg: number, gamesPlayed: number, injuryStatus: string}>}
 */
export async function calculatePlayerProjection(playerId, position, season = 2025, scoringType = 'half_ppr') {
  // Check cache first
  const cacheKey = `${playerId}_${scoringType}`;
  const cached = getCachedProjection(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    // Fetch season stats with rate limit handling
    let seasonStatsResponse;
    try {
      seasonStatsResponse = await getPlayerSeasonStats(playerId, season);
    } catch (statsError) {
      // If rate limited, throw to be caught by batch processor
      if (statsError.message && statsError.message.includes('Too many requests')) {
        throw statsError;
      }
      // For other errors, continue with baseline
      console.warn(`Stats error for player ${playerId}:`, statsError.message);
    }
    
    const seasonStats = seasonStatsResponse?.data?.[0];
    
    // Fetch injury status (skip if we're already rate limited)
    let injuryStatus = 'healthy';
    if (seasonStatsResponse) {
      try {
        const injuryResponse = await getPlayerInjuries({ player_ids: [parseInt(playerId)] });
        if (injuryResponse?.data && injuryResponse.data.length > 0) {
          injuryStatus = injuryResponse.data[0].designation || 'healthy';
        }
      } catch (err) {
        // Silently continue with healthy status for injury lookups
      }
    }
    
    // If no stats, return baseline projection
    if (!seasonStats || !seasonStats.games_played || seasonStats.games_played === 0) {
      const baseline = getBaselineProjection(position);
      const result = {
        projected: baseline * getInjuryMultiplier(injuryStatus),
        seasonAvg: baseline,
        gamesPlayed: 0,
        injuryStatus,
        scoringType
      };
      setCachedProjection(cacheKey, result);
      return result;
    }
    
    // Calculate fantasy points per game with scoring type
    const ppg = calculateFantasyPoints(seasonStats, position, scoringType);
    const projected = ppg * getInjuryMultiplier(injuryStatus);
    
    const result = {
      projected: Math.round(projected * 10) / 10,
      seasonAvg: Math.round(ppg * 10) / 10,
      gamesPlayed: seasonStats.games_played,
      injuryStatus,
      scoringType
    };
    
    setCachedProjection(cacheKey, result);
    return result;
  } catch (error) {
    // Re-throw rate limit errors to be handled by batch processor
    if (error.message && error.message.includes('Too many requests')) {
      throw error;
    }
    
    // Return baseline on other errors
    const baseline = getBaselineProjection(position);
    const result = {
      projected: baseline,
      seasonAvg: baseline,
      gamesPlayed: 0,
      injuryStatus: 'healthy',
      scoringType
    };
    setCachedProjection(cacheKey, result);
    return result;
  }
}

/**
 * Get baseline projection for players without stats
 */
function getBaselineProjection(position) {
  const baselines = {
    'Quarterback': 18,
    'Running Back': 12,
    'Wide Receiver': 10,
    'Tight End': 8,
    'Kicker': 8,
    'Defense': 8,
  };
  
  return baselines[position] || 8;
}

/**
 * Get instant baseline projections for multiple players
 * Returns immediately without API calls
 * @param {Array<{playerId: string, position: string}>} players
 * @returns {Map<string, projection>}
 */
export function getInstantBaselineProjections(players) {
  const projections = new Map();
  
  for (const player of players) {
    const baseline = getBaselineProjection(player.position);
    projections.set(player.playerId, {
      projected: baseline,
      seasonAvg: baseline,
      gamesPlayed: 0,
      injuryStatus: 'healthy',
      isBaseline: true // Flag to indicate this is a baseline estimate
    });
  }
  
  return projections;
}

/**
 * Calculate projections for multiple players in batch with rate limiting
 * @param {Array<{playerId: string, position: string}>} players
 * @param {number} season
 * @returns {Promise<Map<string, projection>>}
 */
export async function calculateBatchProjections(players, season = 2025) {
  const projections = new Map();
  
  // Process in batches of 5 to speed up while avoiding rate limits
  const batchSize = 5;
  for (let i = 0; i < players.length; i += batchSize) {
    const batch = players.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (player) => {
      try {
        const projection = await calculatePlayerProjection(player.playerId, player.position, season);
        return { playerId: player.playerId, projection };
      } catch (error) {
        // If rate limit hit, use baseline
        console.warn(`Rate limit hit for player ${player.playerId}, using baseline`);
        const baseline = getBaselineProjection(player.position);
        return {
          playerId: player.playerId,
          projection: {
            projected: baseline,
            seasonAvg: baseline,
            gamesPlayed: 0,
            injuryStatus: 'healthy',
          }
        };
      }
    });
    
    const results = await Promise.all(batchPromises);
    results.forEach(({ playerId, projection }) => {
      projections.set(playerId, projection);
    });
    
    // Small delay between batches (100ms instead of 500ms per player)
    if (i + batchSize < players.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return projections;
}
