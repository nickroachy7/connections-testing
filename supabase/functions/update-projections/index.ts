import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { BalldontlieAPI } from 'npm:@balldontlie/sdk@1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
 * Calculate fantasy points based on season stats and scoring type
 * Supports standard, half_ppr, and full_ppr scoring
 */
function calculateFantasyPoints(stats: any, position: string, scoringType: string = 'half_ppr'): number {
  let points = 0;
  const pprValue = PPR_MULTIPLIERS[scoringType as keyof typeof PPR_MULTIPLIERS] || PPR_MULTIPLIERS['half_ppr'];
  
  if (position === 'Quarterback') {
    points += (stats.passing_yards || 0) * BASE_SCORING.PASS_YD;
    points += (stats.passing_touchdowns || 0) * BASE_SCORING.PASS_TD;
    points += (stats.passing_interceptions || 0) * BASE_SCORING.PASS_INT;
    points += (stats.rushing_yards || 0) * BASE_SCORING.RUSH_YD;
    points += (stats.rushing_touchdowns || 0) * BASE_SCORING.RUSH_TD;
    // QBs rarely catch passes, but include for completeness
    points += (stats.receptions || 0) * pprValue;
    points += (stats.receiving_yards || 0) * BASE_SCORING.REC_YD;
    points += (stats.receiving_touchdowns || 0) * BASE_SCORING.REC_TD;
  } else if (position === 'Running Back') {
    points += (stats.rushing_yards || 0) * BASE_SCORING.RUSH_YD;
    points += (stats.rushing_touchdowns || 0) * BASE_SCORING.RUSH_TD;
    points += (stats.receptions || 0) * pprValue;
    points += (stats.receiving_yards || 0) * BASE_SCORING.REC_YD;
    points += (stats.receiving_touchdowns || 0) * BASE_SCORING.REC_TD;
  } else if (position === 'Wide Receiver' || position === 'Tight End') {
    points += (stats.receptions || 0) * pprValue;
    points += (stats.receiving_yards || 0) * BASE_SCORING.REC_YD;
    points += (stats.receiving_touchdowns || 0) * BASE_SCORING.REC_TD;
    points += (stats.rushing_yards || 0) * BASE_SCORING.RUSH_YD;
    points += (stats.rushing_touchdowns || 0) * BASE_SCORING.RUSH_TD;
  } else if (position === 'Place kicker' || position === 'Kicker') {
    points += (stats.field_goals_made || 0) * BASE_SCORING.FG;
    points += (stats.extra_points_made || 0) * BASE_SCORING.XP;
  } else if (position === 'Defense') {
    points += (stats.sacks || 0) * BASE_SCORING.DEF_SACK;
    points += (stats.interceptions || 0) * BASE_SCORING.DEF_INT;
    points += (stats.fumbles_recovered || 0) * BASE_SCORING.DEF_FR;
    points += (stats.touchdowns || 0) * BASE_SCORING.DEF_TD;
  }
  return points;
}

/**
 * Get injury multiplier based on status
 * Returns 0 if player is ruled out, otherwise adjusts projection based on injury severity
 */
function getInjuryMultiplier(injuryStatus: string | null): number {
  if (!injuryStatus || injuryStatus === 'healthy') return 1.0;
  
  const status = injuryStatus.toLowerCase();
  
  // Player definitely not playing
  if (status.includes('out') || 
      status.includes('ir') || 
      status.includes('injured reserve') ||
      status.includes('suspended') ||
      status.includes('pup') ||
      status.includes('physically unable to perform')) {
    return 0.0;
  }
  
  // Very unlikely to play
  if (status.includes('doubtful')) {
    return 0.3;
  }
  
  // Game-time decision, may have limitations
  if (status.includes('questionable') || status.includes('gtd')) {
    return 0.8;
  }
  
  // Probable means likely to play with minor impact
  if (status.includes('probable')) {
    return 0.95;
  }
  
  return 1.0; // Healthy or unlisted
}

/**
 * Generate human-readable projection notes
 */
function generateProjectionNotes(
  gamesPlayed: number,
  seasonAvg: number,
  projected: number,
  injuryStatus: string | null,
  injuryMultiplier: number,
  scoringType: string
): string {
  const notes: string[] = [];
  
  // Scoring system note
  const scoringLabel = scoringType === 'standard' ? 'Standard' : 
                       scoringType === 'half_ppr' ? 'Half-PPR' : 'Full PPR';
  notes.push(`${scoringLabel} scoring`);
  
  // Games played context
  if (gamesPlayed === 0) {
    notes.push('No stats - backup/practice squad');
  } else if (gamesPlayed < 3) {
    notes.push(`Backup role (${gamesPlayed} games)`);
  } else if (gamesPlayed < 6) {
    notes.push(`Limited role (${gamesPlayed} games)`);
  } else {
    notes.push(`Based on ${gamesPlayed} games`);
  }
  
  // Injury status impact
  if (injuryMultiplier === 0) {
    notes.push(`RULED OUT (${injuryStatus}) - 0 points expected`);
  } else if (injuryMultiplier < 1.0) {
    const reduction = Math.round((1 - injuryMultiplier) * 100);
    notes.push(`Injury concern (${injuryStatus}) - ${reduction}% reduction`);
  }
  
  // Performance context
  if (seasonAvg > 20) {
    notes.push('Elite producer');
  } else if (seasonAvg > 15) {
    notes.push('Strong performer');
  } else if (seasonAvg > 10) {
    notes.push('Solid contributor');
  } else if (seasonAvg > 5) {
    notes.push('Streaming option');
  }
  
  return notes.join(' • ');
}

/**
 * PRODUCTION-GRADE RARITY SYSTEM
 * Calculates rarity tier, pack weight, and display percentage
 * This is a replica of the logic in calculate-pull-rates to keep updates in sync
 */
interface RarityResult {
  rarity_tier: 'legendary' | 'epic' | 'rare' | 'common' | 'trash';
  pack_weight: number;
  display_percentage: number;
}

const POSITION_THRESHOLDS: Record<string, { legendary: number; epic: number; rare: number; common: number }> = {
  'Quarterback': { legendary: 24, epic: 20, rare: 16, common: 10 },
  'Running Back': { legendary: 18, epic: 14, rare: 10, common: 6 },
  'Wide Receiver': { legendary: 16, epic: 12, rare: 8, common: 4 },
  'Tight End': { legendary: 14, epic: 10, rare: 6, common: 3 },
};

const TIER_WEIGHTS: Record<string, { weight: number; displayPct: number }> = {
  legendary: { weight: 25, displayPct: 2 },
  epic: { weight: 35, displayPct: 8 },
  rare: { weight: 40, displayPct: 22 },
  common: { weight: 50, displayPct: 55 },
  trash: { weight: 5, displayPct: 85 },
};

function calculatePlayerRarity(
  position: string,
  seasonPPG: number,
  gamesPlayed: number,
  injuryStatus: string
): RarityResult {
  const statusLower = (injuryStatus || '').toLowerCase();
  
  if (['out', 'ir', 'suspended', 'pup'].some(s => statusLower.includes(s))) {
    return { rarity_tier: 'trash', pack_weight: TIER_WEIGHTS.trash.weight, display_percentage: 95 };
  }
  
  if (gamesPlayed === 0) {
    return { rarity_tier: 'trash', pack_weight: TIER_WEIGHTS.trash.weight, display_percentage: 90 };
  }
  
  const thresholds = POSITION_THRESHOLDS[position] || POSITION_THRESHOLDS['Wide Receiver'];
  
  let tier: 'legendary' | 'epic' | 'rare' | 'common' | 'trash';
  let displayPct: number;
  
  if (seasonPPG >= thresholds.legendary) {
    tier = 'legendary';
    displayPct = Math.max(1, 5 - ((seasonPPG - thresholds.legendary) / 5));
  } else if (seasonPPG >= thresholds.epic) {
    tier = 'epic';
    displayPct = 5 + ((thresholds.legendary - seasonPPG) / (thresholds.legendary - thresholds.epic)) * 10;
  } else if (seasonPPG >= thresholds.rare) {
    tier = 'rare';
    displayPct = 15 + ((thresholds.epic - seasonPPG) / (thresholds.epic - thresholds.rare)) * 20;
  } else if (seasonPPG >= thresholds.common) {
    tier = 'common';
    displayPct = 35 + ((thresholds.rare - seasonPPG) / (thresholds.rare - thresholds.common)) * 30;
  } else {
    tier = 'trash';
    displayPct = 70 + Math.min(25, (thresholds.common - seasonPPG) * 5);
  }
  
  let weight = TIER_WEIGHTS[tier].weight;
  
  if (gamesPlayed < 4 && gamesPlayed > 0) {
    weight = weight * 0.7;
    displayPct = Math.min(95, displayPct * 1.2);
  }
  
  if (['questionable', 'doubtful'].some(s => statusLower.includes(s))) {
    weight = weight * 0.8;
    displayPct = Math.min(95, displayPct * 1.15);
  }
  
  return {
    rarity_tier: tier,
    pack_weight: Math.round(weight * 100) / 100,
    display_percentage: Math.round(Math.min(99, Math.max(1, displayPct)) * 10) / 10,
  };
}

// Keep legacy function for backward compatibility during transition
function calculatePullPercentage(
  position: string,
  seasonPPG: number,
  gamesPlayed: number,
  injuryStatus: string
): number {
  
  // Injured/inactive = HIGH % (trash quality, rare in packs)
  const statusLower = injuryStatus.toLowerCase();
  if (['out', 'ir', 'suspended', 'pup'].some(s => statusLower.includes(s))) {
    return 98.0; // Very high % = trash quality, very rare in packs
  }
  
  // No games = backup = HIGH %
  if (gamesPlayed === 0) {
    return 95.0; // High % = backup quality, rare in packs
  }
  
  // Position thresholds
  const thresholds: Record<string, any> = {
    'Quarterback': { elite: 22, top: 18, solid: 14, rotational: 10 },
    'Running Back': { elite: 18, top: 14, solid: 10, rotational: 6 },
    'Wide Receiver': { elite: 16, top: 12, solid: 8, rotational: 4 },
    'Tight End': { elite: 14, top: 10, solid: 6, rotational: 3 },
  };
  
  const threshold = thresholds[position] || thresholds['Wide Receiver'];
  let basePercentage = 95.0; // Default for trash players (high % = bad quality, rare in packs)
  
  // INVERTED: Lower % = better player quality AND more common in packs
  if (seasonPPG >= threshold.elite) basePercentage = 2.0;        // Elite - 2% (best quality, common in packs)
  else if (seasonPPG >= threshold.top) basePercentage = 18.0;    // Top starters - 18% (good quality, common in packs)
  else if (seasonPPG >= threshold.solid) basePercentage = 45.0;  // Solid starters - 45% (decent quality, common in packs)
  else if (seasonPPG >= threshold.rotational) basePercentage = 70.0; // Rotational - 70% (low quality, less common in packs)
  // else: 95.0% (trash/backup - worst quality, rare in packs)
  
  // Apply modifiers (make worse players have higher %)
  if (gamesPlayed < 4) {
    basePercentage = Math.min(98.0, basePercentage * 1.2); // Increase % (worse quality)
  }
  
  if (['questionable', 'doubtful'].some(s => statusLower.includes(s))) {
    basePercentage = Math.min(98.0, basePercentage * 1.3); // Increase % (worse quality)
  }
  
  // Cap at reasonable bounds (inverted: 1-99)
  return Math.min(99.0, Math.max(1.0, basePercentage));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const nflApiKey = Deno.env.get('BALLDONTLIE_API_KEY') || '';
    
    // Get current NFL season from nfl_season_config
    const { data: seasonConfig, error: seasonError } = await supabase
      .from('nfl_season_config')
      .select('season_year, current_week')
      .eq('is_active', true)
      .single();
    
    if (seasonError) {
      console.error('Error getting season config:', seasonError);
      throw seasonError;
    }
    
    const currentSeason = seasonConfig?.season_year || 2025;
    const currentWeek = seasonConfig?.current_week || 11;
    console.log(`Starting projection updates for ${currentSeason} season, Week ${currentWeek}`);

    // Get all active contest types to know what scoring systems are in use
    const { data: contestTypes, error: contestError } = await supabase
      .from('contest_types')
      .select('id, scoring_type')
      .eq('is_active', true);
    
    if (contestError) throw contestError;
    
    // Default to half_ppr for projections, but we'll store notes about scoring type
    const defaultScoringType = 'half_ppr';
    console.log(`Contest types in use: ${contestTypes?.map(ct => ct.scoring_type).join(', ') || 'half_ppr'}`);

    const { data: players, error: playersError } = await supabase
      .from('player_cards')
      .select('id, player_id, position, team_abbreviation, depth_chart_position')
      .eq('is_active', true);

    if (playersError) throw playersError;

    // CRITICAL: Load games for the current week to determine bye weeks
    console.log(`Loading games for Week ${currentWeek}, ${currentSeason} to check for bye weeks...`);
    const { data: gamesData, error: gamesError } = await supabase
      .from('game_scores')
      .select('home_team, away_team, game_status')
      .eq('week_number', currentWeek)
      .eq('season_year', currentSeason);
    
    if (gamesError) {
      console.error('Error loading games:', gamesError);
      // Don't throw - continue with projections, just won't have bye week data
    }
    
    // Create a Set of team abbreviations that have games this week
    const teamsWithGames = new Set<string>();
    if (gamesData) {
      gamesData.forEach(game => {
        if (game.home_team) teamsWithGames.add(game.home_team);
        if (game.away_team) teamsWithGames.add(game.away_team);
      });
      console.log(`Found ${gamesData.length} games for Week ${currentWeek}. Teams playing:`, Array.from(teamsWithGames).join(', '));
    } else {
      console.warn(`⚠️ No games found for Week ${currentWeek}. All players will be treated as having games.`);
    }

    let updated = 0, apiCalls = 0, successfulCalls = 0, byeWeekCount = 0;
    const batchSize = 25; // BallDontLie API supports multiple player_ids per call

    // Build injury map from existing player_cards injury data (synced separately by sync-injuries)
    console.log('Loading existing injury data from database...');
    const injuryMap = new Map<string, string>();
    
    const { data: injuryData, error: injuryError } = await supabase
      .from('player_cards')
      .select('player_id, injury_status')
      .not('injury_status', 'eq', 'healthy')
      .not('injury_status', 'is', null);
    
    if (!injuryError && injuryData) {
      injuryData.forEach((p: any) => {
        if (p.player_id && p.injury_status) {
          injuryMap.set(p.player_id, p.injury_status);
        }
      });
      console.log(`Loaded ${injuryMap.size} players with injury status from database`);
    } else if (injuryError) {
      console.warn('Could not load injury data:', injuryError.message);
    }
    
    console.log(`Total injury statuses loaded: ${injuryMap.size}`);

    // Build a map of team -> position -> players with their stats to determine starters
    // This helps identify backup QBs, RB2s, etc. who shouldn't get full projections
    const teamPositionMap = new Map<string, Map<string, { playerId: string; attempts: number }[]>>();

    // Helper function for API calls with retry logic
    async function fetchWithRetry(url: string, headers: any, retries = 3): Promise<Response> {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const response = await fetch(url, { headers });
          
          if (response.status === 429) {
            // Rate limited - exponential backoff
            const backoffMs = 1000 * Math.pow(2, attempt);
            console.log(`Rate limited, waiting ${backoffMs}ms before retry ${attempt + 1}/${retries}`);
            await new Promise(r => setTimeout(r, backoffMs));
            continue;
          }
          
          return response;
        } catch (e) {
          if (attempt === retries - 1) throw e;
          console.log(`Request failed, retrying ${attempt + 1}/${retries}`);
          await new Promise(r => setTimeout(r, 500));
        }
      }
      throw new Error('Max retries exceeded');
    }

    // Now process stats and projections
    for (let i = 0; i < players.length; i += batchSize) {
      const batch = players.slice(i, i + batchSize);
      
      // Batch API call - get stats for all players in batch at once
      const batchPlayerIds = batch.map(p => parseInt(p.player_id));
      let batchStatsMap = new Map();
      
      try {
        apiCalls++;
        console.log(`Batch ${Math.floor(i/batchSize)+1}: Fetching ${currentSeason} stats for ${batchPlayerIds.length} players`);
        
        // Build URL with correct format: ?season=2025&player_ids[]=1&player_ids[]=2
        const playerIdsParams = batchPlayerIds.map(id => `player_ids[]=${id}`).join('&');
        const url = `https://api.balldontlie.io/nfl/v1/season_stats?season=${currentSeason}&${playerIdsParams}`;
        
        const response = await fetchWithRetry(url, { 'Authorization': nflApiKey });
        
        if (response.ok) {
          const data = await response.json();
          if (data?.data && data.data.length > 0) {
            successfulCalls++;
            // Map player_id to stats
            data.data.forEach((stats: any) => {
              if (stats.player?.id) {
                batchStatsMap.set(stats.player.id.toString(), stats);
              }
            });
            console.log(`Batch ${Math.floor(i/batchSize)+1}: Received ${data.data.length} stat records for ${currentSeason}`);
          } else {
            console.log(`Batch ${Math.floor(i/batchSize)+1}: No ${currentSeason} data returned from API`);
          }
        } else {
          console.log(`Batch API error: ${response.status} ${response.statusText}`);
        }
        
        await new Promise(r => setTimeout(r, 100));
      } catch (e) {
        console.log(`Batch API error:`, e);
      }
      
      // Process each player individually with UPDATE queries
      for (const player of batch) {
        let projected = 0, seasonAvg = 0, gamesPlayed = 0;
        const injuryStatus = injuryMap.get(player.player_id) || 'healthy';
        const injuryMultiplier = getInjuryMultiplier(injuryStatus);

        const stats = batchStatsMap.get(player.player_id);
        
        if (stats && stats.games_played > 0) {
          gamesPlayed = stats.games_played;
          const totalPoints = calculateFantasyPoints(stats, player.position, defaultScoringType);
          seasonAvg = totalPoints / gamesPlayed;
          
          // Apply baseline projection adjustments (slightly conservative)
          const multipliers: Record<string, number> = {
            'Quarterback': 1.0, 'Running Back': 0.95, 'Wide Receiver': 0.95,
            'Tight End': 0.90, 'Kicker': 0.85, 'Place kicker': 0.85, 'Defense': 0.90,
          };
          projected = seasonAvg * (multipliers[player.position] || 1.0);
          
          // Detect backup/low-usage players and reduce projections appropriately
          // Key insight: QB backups don't play, but WR3/RB2 often contribute in fantasy
          
          const totalSeasonPoints = calculateFantasyPoints(stats, player.position, defaultScoringType);
          
          // For QBs: check pass attempts per game (starters avg 30+, backups much less)
          const attemptsPerGame = stats.passing_attempts ? stats.passing_attempts / gamesPlayed : 0;
          const isBackupQBByStats = player.position === 'Quarterback' && attemptsPerGame < 20;
          
          // Depth chart position from Sleeper API
          // depth_chart_position: 1=starter, 2=backup, 3+=deep backup
          const isStarterByDepthChart = player.depth_chart_position === 1;
          
          // ONLY QBs get zero projection for being a backup - since only 1 QB plays
          // WR/RB/TE depth chart positions 2-4 still contribute fantasy points
          const isBackupQBByDepthChart = player.position === 'Quarterback' && 
            player.depth_chart_position && player.depth_chart_position >= 2;
          
          // For non-QBs, only flag as "backup" if they have very low usage stats
          // (depth chart position 2-3 for WR/RB is fine - they still play)
          const isLowUsageByStats = gamesPlayed < 4 || totalSeasonPoints < 15;
          
          // Decision logic:
          // - QBs: depth chart backup = 0 projection (only 1 QB plays)
          // - Other positions: use stats to determine if they're fantasy-irrelevant
          const isBackup = isBackupQBByDepthChart || 
            (!isStarterByDepthChart && !player.depth_chart_position && isLowUsageByStats) ||
            (player.position === 'Quarterback' && !isStarterByDepthChart && isBackupQBByStats);
          
          if (isBackup) {
            // True backups (QBs or low-usage players) get 0 projections
            projected = 0;
          } else if (isStarterByDepthChart && projected < 5) {
            // Depth chart starters with low/no stats get a baseline projection
            // This handles cases like a backup QB becoming starter due to injury
            const starterBaselines: Record<string, number> = {
              'Quarterback': 14, 'Running Back': 8, 'Wide Receiver': 8,
              'Tight End': 6, 'Kicker': 7, 'Place kicker': 7, 'Defense': 7,
            };
            projected = starterBaselines[player.position] || 6;
          }
          
          // Apply injury multiplier
          projected = projected * injuryMultiplier;
          
          // Apply position-based bounds
          const bounds: Record<string, { min: number; max: number }> = {
            'Quarterback': {min:0, max:35}, 'Running Back': {min:0, max:30}, 'Wide Receiver': {min:0, max:30},
            'Tight End': {min:0, max:20}, 'Kicker': {min:0, max:15}, 'Place kicker': {min:0, max:15}, 'Defense': {min:0, max:18},
          };
          const bound = bounds[player.position] || {min:0, max:25};
          projected = Math.max(bound.min, Math.min(bound.max, projected));
        } else {
          // No stats - use minimal backup projection (players with zero games are deep backups)
          const backupBaselines: Record<string, number> = {
            'Quarterback': 2, 'Running Back': 1.5, 'Wide Receiver': 1.5,
            'Tight End': 1, 'Kicker': 5, 'Place kicker': 5, 'Defense': 3,
          };
          seasonAvg = backupBaselines[player.position] || 1.5;
          projected = seasonAvg * injuryMultiplier;
        }
        
        // Generate human-readable projection notes
        const projectionNotes = generateProjectionNotes(
          gamesPlayed,
          seasonAvg,
          projected,
          injuryStatus,
          injuryMultiplier,
          defaultScoringType
        );

        // Calculate rarity using new production-grade system
        const rarity = calculatePlayerRarity(
          player.position,
          seasonAvg,
          gamesPlayed,
          injuryStatus
        );

        // CRITICAL: Check for bye week - if team has no game this week, project 0 points
        const isOnBye = player.team_abbreviation && !teamsWithGames.has(player.team_abbreviation);
        if (isOnBye) {
          projected = 0;
          byeWeekCount++;
          console.log(`🚫 ${player.team_abbreviation} on BYE - setting projection to 0`);
        }

        // Individual UPDATE query for each player - includes new rarity fields
        // NOTE: injury_status is NOT updated here - managed by sync-injuries function
        const { error } = await supabase
          .from('player_cards')
          .update({
            weekly_projected_points: Math.round(projected * 10) / 10,
            projected_points: Math.round(projected * 10) / 10,
            season_ppg: Math.round(seasonAvg * 10) / 10,
            season_avg_points: Math.round(seasonAvg * 10) / 10,
            games_played_season: gamesPlayed,
            games_played: gamesPlayed,
            projection_notes: projectionNotes,
            pull_percentage: rarity.display_percentage,
            rarity_tier: rarity.rarity_tier,
            pack_weight: rarity.pack_weight,
            last_projection_update: new Date().toISOString(),
            last_updated: new Date().toISOString(),
          })
          .eq('id', player.id);
        
        if (!error) {
          updated++;
        } else {
          console.error(`Error updating player ${player.id}:`, error);
        }
      }
      console.log(`Batch ${Math.floor(i/batchSize)+1}/${Math.ceil(players.length/batchSize)} complete - ${batch.length} players processed`);
    }

    console.log(`✅ Projection update complete: ${updated}/${players.length} players updated`);
    console.log(`📊 Stats API calls: ${apiCalls} (${successfulCalls} successful)`);
    console.log(`🏥 Injuries loaded from DB: ${injuryMap.size}`);
    console.log(`🚫 Bye weeks: ${byeWeekCount} players on bye (projection set to 0)`);

    return new Response(JSON.stringify({
      success: true, 
      message: `Updated ${updated} players (${byeWeekCount} on bye)`, 
      total_players: players.length, 
      api_calls: apiCalls,
      successful_calls: successfulCalls,
      injuries_loaded: injuryMap.size,
      bye_week_count: byeWeekCount,
      season: currentSeason,
      week: currentWeek,
      scoring_type: defaultScoringType
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
