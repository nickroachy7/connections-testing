import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function calculatePullPercentage(
  position: string,
  seasonPPG: number,
  gamesPlayed: number,
  injuryStatus: string | null
): number {
  
  const statusLower = (injuryStatus || '').toLowerCase();
  if (['out', 'ir', 'suspended', 'pup'].some(s => statusLower.includes(s))) {
    return 2.0;
  }
  
  if (gamesPlayed === 0) {
    return 5.0;
  }
  
  const thresholds: Record<string, any> = {
    'Quarterback': { elite: 22, top: 18, solid: 14, rotational: 10 },
    'Running Back': { elite: 18, top: 14, solid: 10, rotational: 6 },
    'Wide Receiver': { elite: 16, top: 12, solid: 8, rotational: 4 },
    'Tight End': { elite: 14, top: 10, solid: 6, rotational: 3 },
  };
  
  const threshold = thresholds[position] || thresholds['Wide Receiver'];
  let basePercentage = 5.0;
  
  if (seasonPPG >= threshold.elite) basePercentage = 2.0;
  else if (seasonPPG >= threshold.top) basePercentage = 18.0;
  else if (seasonPPG >= threshold.solid) basePercentage = 55.0;
  else if (seasonPPG >= threshold.rotational) basePercentage = 12.0;
  
  if (gamesPlayed < 4) {
    basePercentage *= 0.2;
  }
  
  if (['questionable', 'doubtful'].some(s => statusLower.includes(s))) {
    basePercentage *= 0.5;
  }
  
  return Math.min(60.0, Math.max(0.5, basePercentage));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('Starting pull rate calculation...');

    const { data: players, error: playersError } = await supabase
      .from('player_cards')
      .select('id, position, season_ppg, games_played_season, injury_status')
      .eq('is_active', true);

    if (playersError) throw playersError;

    console.log(`Processing ${players.length} active players`);

    let updated = 0;
    const distribution = {
      elite: 0,
      top: 0,
      solid: 0,
      rotational: 0,
      backup: 0
    };

    for (const player of players) {
      const pullPercentage = calculatePullPercentage(
        player.position,
        player.season_ppg || 0,
        player.games_played_season || 0,
        player.injury_status
      );

      if (pullPercentage >= 50) distribution.solid++;
      else if (pullPercentage >= 15) distribution.top++;
      else if (pullPercentage >= 10) distribution.rotational++;
      else if (pullPercentage >= 5) distribution.backup++;
      else distribution.elite++;

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