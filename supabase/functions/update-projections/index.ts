import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { BalldontlieAPI } from 'npm:@balldontlie/sdk@1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCORING = {
  PASS_YD: 0.04, PASS_TD: 4, PASS_INT: -2,
  RUSH_YD: 0.1, RUSH_TD: 6,
  REC_YD: 0.1, REC: 1, REC_TD: 6,
  FG: 3, XP: 1,
};

function calculateFantasyPoints(stats: any, position: string): number {
  let points = 0;
  if (position === 'Quarterback') {
    points += (stats.passing_yards || 0) * SCORING.PASS_YD;
    points += (stats.passing_touchdowns || 0) * SCORING.PASS_TD;
    points += (stats.passing_interceptions || 0) * SCORING.PASS_INT;
    points += (stats.rushing_yards || 0) * SCORING.RUSH_YD;
    points += (stats.rushing_touchdowns || 0) * SCORING.RUSH_TD;
  } else if (position === 'Running Back') {
    points += (stats.rushing_yards || 0) * SCORING.RUSH_YD;
    points += (stats.rushing_touchdowns || 0) * SCORING.RUSH_TD;
    points += (stats.receptions || 0) * SCORING.REC;
    points += (stats.receiving_yards || 0) * SCORING.REC_YD;
    points += (stats.receiving_touchdowns || 0) * SCORING.REC_TD;
  } else if (position === 'Wide Receiver' || position === 'Tight End') {
    points += (stats.receptions || 0) * SCORING.REC;
    points += (stats.receiving_yards || 0) * SCORING.REC_YD;
    points += (stats.receiving_touchdowns || 0) * SCORING.REC_TD;
    points += (stats.rushing_yards || 0) * SCORING.RUSH_YD;
    points += (stats.rushing_touchdowns || 0) * SCORING.RUSH_TD;
  } else if (position === 'Place kicker' || position === 'Kicker') {
    points += (stats.field_goals_made || 0) * SCORING.FG;
    points += (stats.extra_points_made || 0) * SCORING.XP;
  }
  return points;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const nflApiKey = Deno.env.get('BALLDONTLIE_API_KEY') || '';
    const nflApi = new BalldontlieAPI({ apiKey: nflApiKey });
    const currentSeason = 2025;

    // Get current NFL week from nfl_season_config
    const { data: weekData, error: weekError } = await supabase
      .rpc('get_current_nfl_week');
    
    if (weekError) {
      console.error('Error getting current week:', weekError);
      throw weekError;
    }
    
    const currentWeek = weekData || 10;
    console.log(`Starting projection updates for season: ${currentSeason}, week: ${currentWeek}`);

    const { data: players, error: playersError } = await supabase
      .from('player_cards')
      .select('id, player_id, position')
      .eq('is_active', true);

    if (playersError) throw playersError;

    let updated = 0, apiCalls = 0, successfulCalls = 0;
    const batchSize = 25; // BallDontLie API supports multiple player_ids per call

    for (let i = 0; i < players.length; i += batchSize) {
      const batch = players.slice(i, i + batchSize);
      
      // Batch API call - get stats for all players in batch at once
      const batchPlayerIds = batch.map(p => parseInt(p.player_id));
      let batchStatsMap = new Map();
      
      try {
        apiCalls++;
        console.log(`Batch ${Math.floor(i/batchSize)+1}: Fetching 2025 stats for ${batchPlayerIds.length} players`);
        
        // Build URL with proper array format: ?seasons[]=2025&player_ids[]=1&player_ids[]=2
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
            console.log(`Batch ${Math.floor(i/batchSize)+1}: Received ${data.data.length} stat records for 2025`);
          } else {
            console.log(`Batch ${Math.floor(i/batchSize)+1}: No 2025 data returned from API`);
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

        const stats = batchStatsMap.get(player.player_id);
        
        if (stats && stats.games_played > 0) {
          gamesPlayed = stats.games_played;
          const totalPoints = calculateFantasyPoints(stats, player.position);
          seasonAvg = totalPoints / gamesPlayed;
          projected = seasonAvg;
          
          const multipliers: Record<string, number> = {
            'Quarterback': 1.0, 'Running Back': 0.95, 'Wide Receiver': 0.95,
            'Tight End': 0.90, 'Kicker': 0.85, 'Place kicker': 0.85, 'Defense': 0.90,
          };
          projected *= multipliers[player.position] || 1.0;
          
          const bounds: Record<string, { min: number; max: number }> = {
            'Quarterback': {min:0, max:35}, 'Running Back': {min:0, max:30}, 'Wide Receiver': {min:0, max:30},
            'Tight End': {min:0, max:20}, 'Kicker': {min:0, max:15}, 'Place kicker': {min:0, max:15}, 'Defense': {min:0, max:18},
          };
          const bound = bounds[player.position] || {min:0, max:25};
          projected = Math.max(bound.min, Math.min(bound.max, projected));
        }

        return {
          id: player.id,
          weekly_projected_points: Math.round(projected * 10) / 10,
          projected_points: Math.round(projected * 10) / 10,
          season_ppg: Math.round(seasonAvg * 10) / 10,
          season_avg_points: Math.round(seasonAvg * 10) / 10,
          games_played_season: gamesPlayed,
          games_played: gamesPlayed,
          injury_status: 'healthy',
          last_projection_update: new Date().toISOString(),
          last_updated: new Date().toISOString(),
        };
      });

      for (const update of updates) {
        const { error } = await supabase.from('player_cards').update(update).eq('id', update.id);
        if (!error) updated++;
      }
      console.log(`Batch ${Math.floor(i/batchSize)+1}/${Math.ceil(players.length/batchSize)} - API Calls: ${apiCalls}, Successful: ${successfulCalls}`);
    }

    return new Response(JSON.stringify({
      success: true, 
      message: `Updated ${updated} players`, 
      total_players: players.length, 
      api_calls: apiCalls,
      successful_calls: successfulCalls,
      season: currentSeason,
      week: currentWeek
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
