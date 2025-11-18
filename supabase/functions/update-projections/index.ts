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
    // Some RBs have passing stats (trick plays)
    points += (stats.passing_yards || 0) * BASE_SCORING.PASS_YD;
    points += (stats.passing_touchdowns || 0) * BASE_SCORING.PASS_TD;
  } else if (position === 'Wide Receiver' || position === 'Tight End') {
    points += (stats.receptions || 0) * pprValue;
    points += (stats.receiving_yards || 0) * BASE_SCORING.REC_YD;
    points += (stats.receiving_touchdowns || 0) * BASE_SCORING.REC_TD;
    points += (stats.rushing_yards || 0) * BASE_SCORING.RUSH_YD;
    points += (stats.rushing_touchdowns || 0) * BASE_SCORING.RUSH_TD;
    // Rarely, but include passing
    points += (stats.passing_yards || 0) * BASE_SCORING.PASS_YD;
    points += (stats.passing_touchdowns || 0) * BASE_SCORING.PASS_TD;
  } else if (position === 'Kicker' || position === 'Place kicker') {
    points += (stats.field_goals_made || 0) * BASE_SCORING.FG;
    points += (stats.extra_points_made || 0) * BASE_SCORING.XP;
  } else if (position === 'Defense') {
    points += (stats.sacks || 0) * BASE_SCORING.DEF_SACK;
    points += (stats.interceptions || 0) * BASE_SCORING.DEF_INT;
    points += (stats.fumbles_recovered || 0) * BASE_SCORING.DEF_FR;
    points += (stats.defensive_touchdowns || 0) * BASE_SCORING.DEF_TD;
  }
  
  return points;
}

/**
 * Get injury multiplier based on designation
 * Out/IR: 0% | Doubtful: 30% | Questionable: 80% | Probable: 95% | Healthy: 100%
 */
function getInjuryMultiplier(status: string): number {
  const normalized = status.toLowerCase();
  
  if (normalized.includes('out') || normalized.includes('ir')) return 0.0;
  if (normalized.includes('doubtful')) return 0.3;
  if (normalized.includes('questionable')) return 0.8;
  if (normalized.includes('probable')) return 0.95;
  
  return 1.0; // healthy
}

/**
 * Generate human-readable projection notes
 */
function generateProjectionNotes(
  gamesPlayed: number,
  seasonAvg: number,
  injuryStatus: string,
  injuryMultiplier: number
): string {
  const notes: string[] = [];
  
  // Injury context
  if (injuryMultiplier === 0) {
    notes.push('Injured Reserve - Not playing');
  } else if (injuryMultiplier < 1.0) {
    const percentage = Math.round(injuryMultiplier * 100);
    notes.push(`${injuryStatus} (${percentage}% expected)`);
  } else {
    notes.push('Healthy');
  }
  
  // Sample size context
  if (gamesPlayed === 0) {
    notes.push('No 2024 stats available');
    return notes.join(' • ');
  } else if (gamesPlayed < 4) {
    notes.push(`Based on ${gamesPlayed} games`);
  } else if (gamesPlayed >= 10) {
    notes.push(`Full season sample (${gamesPlayed} games)`);
  } else {
    notes.push(`Based on ${gamesPlayed} games`);
  }
  
  // Performance tier
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const nflApiKey = Deno.env.get('BALLDONTLIE_API_KEY') || '';
    const currentSeason = 2024;

    // Get current NFL week from nfl_season_config
    const { data: weekData, error: weekError } = await supabase
      .rpc('get_current_nfl_week');
    
    if (weekError) {
      console.error('Error getting current week:', weekError);
      throw weekError;
    }
    
    const currentWeek = weekData || 10;
    console.log(`Starting projection updates for season: ${currentSeason}, week: ${currentWeek}`);

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
      .select('id, player_id, position')
      .eq('is_active', true);

    if (playersError) throw playersError;

    let updated = 0, apiCalls = 0, successfulCalls = 0, injuryChecks = 0;
    const batchSize = 25; // BallDontLie API supports multiple player_ids per call

    // First, fetch injury data for all players in batches
    console.log('Fetching injury data for all players...');
    const injuryMap = new Map<string, string>();
    
    for (let i = 0; i < players.length; i += batchSize) {
      const batch = players.slice(i, i + batchSize);
      const batchPlayerIds = batch.map(p => parseInt(p.player_id));
      
      try {
        const playerIdsParams = batchPlayerIds.map(id => `player_ids[]=${id}`).join('&');
        const injuryUrl = `https://api.balldontlie.io/nfl/v1/injuries?${playerIdsParams}`;
        
        const injuryResponse = await fetch(injuryUrl, {
          headers: { 'Authorization': nflApiKey }
        });
        
        if (injuryResponse.ok) {
          const injuryData = await injuryResponse.json();
          if (injuryData?.data && injuryData.data.length > 0) {
            injuryChecks++;
            injuryData.data.forEach((injury: any) => {
              if (injury.player?.id && injury.designation) {
                injuryMap.set(injury.player.id.toString(), injury.designation);
              }
            });
            console.log(`Injury batch ${Math.floor(i/batchSize)+1}: Found ${injuryData.data.length} injury reports`);
          }
        }
        
        await new Promise(r => setTimeout(r, 100));
      } catch (e) {
        console.log(`Injury API error for batch ${Math.floor(i/batchSize)+1}:`, e);
      }
    }
    
    console.log(`Total injury statuses retrieved: ${injuryMap.size}`);

    // Now process stats and projections
    for (let i = 0; i < players.length; i += batchSize) {
      const batch = players.slice(i, i + batchSize);
      
      // Batch API call - get stats for all players in batch at once
      const batchPlayerIds = batch.map(p => parseInt(p.player_id));
      let batchStatsMap = new Map();
      
      try {
        apiCalls++;
        console.log(`Batch ${Math.floor(i/batchSize)+1}: Fetching ${currentSeason} stats for ${batchPlayerIds.length} players`);
        
        // Build URL with proper array format: ?seasons[]=2024&player_ids[]=1&player_ids[]=2
        const playerIdsParams = batchPlayerIds.map(id => `player_ids[]=${id}`).join('&');
        const url = `https://api.balldontlie.io/nfl/v1/season_stats?seasons[]=${currentSeason}&${playerIdsParams}`;
        
        const response = await fetch(url, {
          headers: { 'Authorization': nflApiKey }
        });
        
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
      
      const updates = batch.map((player) => {
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
          const positionMultiplier = multipliers[player.position] || 0.9;
          
          // Weekly projection = season avg * position adjustment * injury factor
          projected = seasonAvg * positionMultiplier * injuryMultiplier;
          
          // Apply position-specific caps
          const caps: Record<string, number> = {
            'Quarterback': 35, 'Running Back': 30, 'Wide Receiver': 30,
            'Tight End': 20, 'Kicker': 15, 'Place kicker': 15, 'Defense': 25,
          };
          const cap = caps[player.position] || 25;
          projected = Math.min(projected, cap);
        } else {
          // No stats available - use position baseline adjusted for injury
          const baselines: Record<string, number> = {
            'Quarterback': 16, 'Running Back': 11, 'Wide Receiver': 11,
            'Tight End': 8, 'Kicker': 7, 'Place kicker': 7, 'Defense': 8,
          };
          projected = (baselines[player.position] || 8) * injuryMultiplier;
          seasonAvg = projected;
        }
        
        // Generate projection notes
        const notes = generateProjectionNotes(gamesPlayed, seasonAvg, injuryStatus, injuryMultiplier);
        
        return {
          id: player.id,
          weekly_projected_points: Math.round(projected * 100) / 100,
          injury_status: injuryStatus,
          projection_notes: notes,
          season_ppg: Math.round(seasonAvg * 100) / 100,
          games_played_season: gamesPlayed,
          last_projection_update: new Date().toISOString(),
        };
      });

      // Batch update to DB
      for (const update of updates) {
        const { error } = await supabase
          .from('player_cards')
          .update(update)
          .eq('id', update.id);

        if (!error) updated++;
      }
    }

    console.log(`Projection update complete: ${updated}/${players.length} players updated`);
    console.log(`API stats: ${successfulCalls}/${apiCalls} successful batch calls, ${injuryChecks} injury batches`);

    return new Response(
      JSON.stringify({
        success: true,
        updated,
        total: players.length,
        apiCalls,
        successfulCalls,
        injuryChecks,
        season: currentSeason,
        week: currentWeek,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Projection update error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});