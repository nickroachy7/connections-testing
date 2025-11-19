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
    notes.push('No stats this season - using position baseline');
  } else if (gamesPlayed < 3) {
    notes.push(`Limited sample (${gamesPlayed} games)`);
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
          projected = seasonAvg * (multipliers[player.position] || 1.0);
          
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
          // No stats - use baseline projection with injury multiplier
          const baselines: Record<string, number> = {
            'Quarterback': 18, 'Running Back': 12, 'Wide Receiver': 10,
            'Tight End': 8, 'Kicker': 8, 'Place kicker': 8, 'Defense': 8,
          };
          seasonAvg = baselines[player.position] || 8;
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

        return {
          id: player.id,
          weekly_projected_points: Math.round(projected * 10) / 10,
          projected_points: Math.round(projected * 10) / 10,
          season_ppg: Math.round(seasonAvg * 10) / 10,
          season_avg_points: Math.round(seasonAvg * 10) / 10,
          games_played_season: gamesPlayed,
          games_played: gamesPlayed,
          injury_status: injuryStatus,
          injury_designation: injuryStatus,
          projection_notes: projectionNotes,
          last_projection_update: new Date().toISOString(),
          last_updated: new Date().toISOString(),
        };
      });

      // Batch update using upsert - much faster than individual updates
      if (updates.length > 0) {
        const { error, count } = await supabase
          .from('player_cards')
          .upsert(updates, { onConflict: 'id' });
        
        if (error) {
          console.error(`Batch ${Math.floor(i/batchSize)+1} update error:`, error);
        } else {
          updated += updates.length;
        }
      }
      console.log(`Batch ${Math.floor(i/batchSize)+1}/${Math.ceil(players.length/batchSize)} complete - ${updates.length} players updated`);
    }

    console.log(`✅ Projection update complete: ${updated}/${players.length} players updated`);
    console.log(`📊 Stats API calls: ${apiCalls} (${successfulCalls} successful)`);
    console.log(`🏥 Injury checks: ${injuryChecks} batches, ${injuryMap.size} total injury statuses found`);

    return new Response(JSON.stringify({
      success: true, 
      message: `Updated ${updated} players`, 
      total_players: players.length, 
      api_calls: apiCalls,
      successful_calls: successfulCalls,
      injury_checks: injuryChecks,
      injuries_found: injuryMap.size,
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
