import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { BalldontlieAPI } from 'npm:@balldontlie/sdk@1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Sync injury data from BallDontLie API to player_cards
 * 
 * This function:
 * 1. Fetches all current injuries from the API
 * 2. Updates player_cards with injury status and designation
 * 3. Clears injury status for players not in the injury report
 * 
 * Should run daily and before game days
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const bdlApiKey = Deno.env.get('BALLDONTLIE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const bdl = new BalldontlieAPI({ apiKey: bdlApiKey });

    console.log('Starting injury sync...');

    // Step 1: Fetch all injuries from API (paginated)
    const allInjuries: any[] = [];
    let cursor: string | number | undefined = undefined;
    let page = 1;

    do {
      console.log(`Fetching injuries page ${page}...`);
      const response = await bdl.nfl.getPlayerInjuries({
        per_page: 100,
        cursor: cursor,
      });

      if (response.data && response.data.length > 0) {
        allInjuries.push(...response.data);
      }

      cursor = response.meta?.next_cursor;
      page++;
      
      // Rate limiting - wait 200ms between requests
      if (cursor) {
        await new Promise(r => setTimeout(r, 200));
      }
    } while (cursor);

    console.log(`Fetched ${allInjuries.length} total injuries`);

    // Step 2: Get all player_cards with their BallDontLie IDs
    const { data: players, error: playersError } = await supabase
      .from('player_cards')
      .select('id, player_id, player_name, position, injury_status')
      .not('player_id', 'is', null);

    if (playersError) {
      throw new Error(`Failed to fetch players: ${playersError.message}`);
    }

    console.log(`Found ${players?.length || 0} players in database`);

    // Create a map of BDL player_id to injury data
    const injuryMap = new Map<number, { status: string; comment: string; date: string }>();
    
    for (const injury of allInjuries) {
      if (injury.player?.id) {
        injuryMap.set(injury.player.id, {
          status: injury.status || 'Unknown',
          comment: injury.comment || '',
          date: injury.date || new Date().toISOString(),
        });
      }
    }

    console.log(`${injuryMap.size} unique players on injury report`);

    // Step 3: Update players with injury data
    const updates: any[] = [];
    const clears: string[] = [];

    for (const player of players || []) {
      // player_id is stored as string in DB, convert to number for map lookup
      const playerId = parseInt(player.player_id, 10);
      const injury = injuryMap.get(playerId);
      
      if (injury) {
        // Player is on injury report
        updates.push({
          id: player.id,
          injury_status: injury.status,
          injury_designation: injury.status,
          injury_notes: injury.comment,
        });
      } else if (player.injury_status && player.injury_status !== 'healthy') {
        // Player was injured but is no longer on report - clear status
        clears.push(player.id);
      }
    }

    console.log(`Updating ${updates.length} injured players`);
    console.log(`Clearing injury status for ${clears.length} recovered players`);

    // Batch update injured players
    if (updates.length > 0) {
      for (const update of updates) {
        const { error } = await supabase
          .from('player_cards')
          .update({
            injury_status: update.injury_status,
            injury_designation: update.injury_designation,
          })
          .eq('id', update.id);

        if (error) {
          console.error(`Failed to update player ${update.id}:`, error.message);
        }
      }
    }

    // Clear recovered players
    if (clears.length > 0) {
      const { error } = await supabase
        .from('player_cards')
        .update({
          injury_status: 'healthy',
          injury_designation: 'healthy',
        })
        .in('id', clears);

      if (error) {
        console.error('Failed to clear injury status:', error.message);
      }
    }

    // Step 4: Log summary of injury status changes
    const statusCounts = new Map<string, number>();
    for (const injury of allInjuries) {
      const status = injury.status || 'Unknown';
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    }

    const summary = {
      total_injuries: allInjuries.length,
      players_updated: updates.length,
      players_cleared: clears.length,
      status_breakdown: Object.fromEntries(statusCounts),
    };

    console.log('Injury sync complete:', JSON.stringify(summary, null, 2));

    // Log some notable injuries (Out/Doubtful players)
    const notableInjuries = allInjuries
      .filter(i => i.status === 'Out' || i.status === 'Doubtful')
      .slice(0, 10)
      .map(i => ({
        name: `${i.player?.first_name} ${i.player?.last_name}`,
        position: i.player?.position_abbreviation,
        team: i.player?.team?.abbreviation,
        status: i.status,
      }));

    console.log('Notable injuries (Out/Doubtful):', JSON.stringify(notableInjuries, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        message: `Injury sync complete`,
        ...summary,
        notable_injuries: notableInjuries,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Injury sync error:', error);
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
