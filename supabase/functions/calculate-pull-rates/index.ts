import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Calculate pull percentage for pack openings
 * Bell curve: solid starters (55%) most common, elite (2%) and trash/injured (2-5%) rare
 */
function calculatePullPercentage(
  position: string,
  seasonPPG: number,
  gamesPlayed: number,
  injuryStatus: string | null
): number {
  
  // Injured/inactive = RARE (don't want trash in packs)
  const statusLower = (injuryStatus || '').toLowerCase();
  if (['out', 'ir', 'suspended', 'pup'].some(s => statusLower.includes(s))) {
    return 2.0; // Very rare - injured players are trash
  }
  
  // No games = backup = RARE
  if (gamesPlayed === 0) {
    return 5.0; // Rare - backups shouldn't dominate packs
  }
  
  // Position thresholds
  // REBALANCED 2025-11-19: Raised PPG requirements to make elite tier more exclusive
  const thresholds: Record<string, any> = {
    'Quarterback': { elite: 24, top: 20, solid: 16, rotational: 12 },   // Was 22/18/14/10
    'Running Back': { elite: 20, top: 16, solid: 12, rotational: 8 },    // Was 18/14/10/6
    'Wide Receiver': { elite: 18, top: 14, solid: 10, rotational: 6 },   // Was 16/12/8/4
    'Tight End': { elite: 16, top: 12, solid: 8, rotational: 4 },        // Was 14/10/6/3
  };
  
  const threshold = thresholds[position] || thresholds['Wide Receiver'];
  let basePercentage = 85.0; // Default for backups (was 95.0) - REBALANCED 2025-11-19
  
  // INVERTED: Lower % = better player quality AND more common in packs
  // REBALANCED 2025-11-19: Made elite rarer, solid starters less common
  if (seasonPPG >= threshold.elite) basePercentage = 1.0;        // Was 2.0 - Elite (~0.5-1%)
  else if (seasonPPG >= threshold.top) basePercentage = 10.0;    // Was 18.0 - Top starters (~8-12%)
  else if (seasonPPG >= threshold.solid) basePercentage = 25.0;  // Was 45.0 - Solid starters (~20-25%)
  else if (seasonPPG >= threshold.rotational) basePercentage = 55.0; // Was 70.0 - Rotational (~45-55%)
  // else: 85.0% (was 95.0%) - Backups (~10-15%)
  
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('Starting pull rate calculation...');

    // Get all active players with their current stats
    const { data: players, error: playersError } = await supabase
      .from('player_cards')
      .select('id, position, season_ppg, games_played_season, injury_status')
      .eq('is_active', true);

    if (playersError) throw playersError;

    console.log(`Processing ${players.length} active players`);

    let updated = 0;
    const distribution = {
      elite: 0,      // 0.5-5%
      top: 0,        // 15-20%
      solid: 0,      // 50-60%
      rotational: 0, // 10-15%
      backup: 0      // 0.5-10%
    };

    // Calculate pull percentage for each player
    for (const player of players) {
      const pullPercentage = calculatePullPercentage(
        player.position,
        player.season_ppg || 0,
        player.games_played_season || 0,
        player.injury_status
      );

      // Track distribution
      if (pullPercentage >= 50) distribution.solid++;
      else if (pullPercentage >= 15) distribution.top++;
      else if (pullPercentage >= 10) distribution.rotational++;
      else if (pullPercentage >= 5) distribution.backup++;
      else distribution.elite++;

      // Update player
      const { error: updateError } = await supabase
        .from('player_cards')
        .update({
          pull_percentage: Math.round(pullPercentage * 100) / 100,
          last_updated: new Date().toISOString(),
        })
        .eq('id', player.id);

      if (updateError) {
        console.error(`Error updating player ${player.id}:`, updateError);
      } else {
        updated++;
      }
    }

    console.log('✅ Pull rate calculation complete');
    console.log('Distribution:', distribution);

    return new Response(JSON.stringify({
      success: true,
      message: `Updated pull rates for ${updated} players`,
      total_players: players.length,
      players_updated: updated,
      distribution: distribution,
      percentages: {
        solid_starters: `${Math.round((distribution.solid / players.length) * 100)}%`,
        top_players: `${Math.round((distribution.top / players.length) * 100)}%`,
        rotational: `${Math.round((distribution.rotational / players.length) * 100)}%`,
        backup: `${Math.round((distribution.backup / players.length) * 100)}%`,
        elite: `${Math.round((distribution.elite / players.length) * 100)}%`,
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
