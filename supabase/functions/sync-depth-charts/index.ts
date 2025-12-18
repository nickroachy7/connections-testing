import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Sync depth chart data from Sleeper API
 * 
 * Sleeper provides free, real-time depth chart positions:
 * - depth_chart_order: 1 = starter, 2 = backup, 3 = 3rd string, null = unknown
 * - Updated regularly by Sleeper's data team
 * 
 * Should run daily and before game days
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching depth chart data from Sleeper API...');

    // Sleeper API - free, no auth needed
    const response = await fetch('https://api.sleeper.app/v1/players/nfl');
    
    if (!response.ok) {
      throw new Error(`Sleeper API error: ${response.status}`);
    }

    const sleeperPlayers = await response.json();
    console.log(`Fetched ${Object.keys(sleeperPlayers).length} players from Sleeper`);

    // Build a map of player name -> depth chart info
    // Sleeper uses player_id as key, we need to match by name
    const depthMap = new Map<string, { depth: number | null; status: string; injury: string | null }>();
    
    for (const [id, player] of Object.entries(sleeperPlayers) as [string, any][]) {
      if (!player.first_name || !player.last_name) continue;
      
      // Only track offensive skill positions we care about
      const trackedPositions = ['QB', 'RB', 'WR', 'TE', 'K'];
      if (!trackedPositions.includes(player.position)) continue;
      
      const fullName = `${player.first_name} ${player.last_name}`;
      depthMap.set(fullName.toLowerCase(), {
        depth: player.depth_chart_order || null,
        status: player.status || 'Unknown',
        injury: player.injury_status || null,
      });
    }

    console.log(`Built depth map for ${depthMap.size} skill position players`);

    // Get all player_cards
    const { data: players, error: playersError } = await supabase
      .from('player_cards')
      .select('id, player_name, position, depth_chart_position')
      .eq('is_active', true);

    if (playersError) {
      throw new Error(`Failed to fetch players: ${playersError.message}`);
    }

    console.log(`Found ${players?.length || 0} players in database`);

    // Update depth chart positions
    let updated = 0;
    let startersFound = 0;
    let backupsFound = 0;

    for (const player of players || []) {
      const sleeperData = depthMap.get(player.player_name.toLowerCase());
      
      if (sleeperData && sleeperData.depth !== null) {
        // Only update if we have valid depth data and it's different
        if (player.depth_chart_position !== sleeperData.depth) {
          const { error } = await supabase
            .from('player_cards')
            .update({ depth_chart_position: sleeperData.depth })
            .eq('id', player.id);

          if (!error) {
            updated++;
            if (sleeperData.depth === 1) startersFound++;
            else backupsFound++;
          } else {
            console.error(`Failed to update ${player.player_name}:`, error.message);
          }
        }
      }
    }

    // Log some examples
    const examples = [
      { name: 'joe burrow', pos: 'QB' },
      { name: 'joe flacco', pos: 'QB' },
      { name: 'josh allen', pos: 'QB' },
      { name: 'saquon barkley', pos: 'RB' },
    ];
    
    console.log('Sample depth chart data:');
    for (const ex of examples) {
      const data = depthMap.get(ex.name);
      console.log(`  ${ex.name}: depth=${data?.depth || 'N/A'}`);
    }

    const summary = {
      success: true,
      message: `Depth chart sync complete`,
      sleeper_players: depthMap.size,
      db_players: players?.length || 0,
      updated: updated,
      starters_found: startersFound,
      backups_found: backupsFound,
    };

    console.log('Sync complete:', JSON.stringify(summary, null, 2));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Depth chart sync error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
