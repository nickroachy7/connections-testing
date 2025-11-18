/**
 * DEPRECATED: This edge function is no longer used.
 * 
 * Week advancement is now handled directly by the database function advance_nfl_week()
 * which is called by a cron job every Tuesday at 8pm.
 * 
 * Reason for deprecation:
 * - Database function is simpler and faster (no HTTP overhead)
 * - No external API calls needed - just updates nfl_season_config table
 * - Easier to debug and monitor
 * - No deployment needed
 * 
 * To advance week manually, run:
 *   SELECT * FROM advance_nfl_week();
 * 
 * See WEEKLY_AUTOMATION_FLOW.md for full documentation.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  return new Response(
    JSON.stringify({ 
      error: 'This endpoint is deprecated',
      message: 'Week advancement is now handled by the advance_nfl_week() database function',
      documentation: 'See WEEKLY_AUTOMATION_FLOW.md for details'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 410 }
  )
})
