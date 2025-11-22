/**
 * ADVANCE WEEK
 * 
 * Purpose: Advance to the next NFL week 24 hours after week finalization.
 * 
 * Responsibilities:
 * 1. Call advance_nfl_week() database function
 * 2. Increment current_week in nfl_season_config
 * 3. Unlock all players
 * 4. Reset week_status to 'scheduled'
 * 
 * Scheduled: Tuesday 8:00 PM (20 hours after finalize-week)
 * This gives users time to review results before the next week begins
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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`⏭️  Advancing to next NFL week...`)

    // Call the database function
    const { data, error } = await supabase.rpc('advance_nfl_week')

    if (error) {
      throw new Error(`Failed to advance week: ${error.message}`)
    }

    const result = Array.isArray(data) ? data[0] : data

    console.log(`✅ Successfully advanced to Week ${result.new_week}, ${result.season_year}`)
    console.log(`   Previous week: ${result.old_week}`)
    console.log(`   Players unlocked: ${result.players_unlocked}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Advanced to Week ${result.new_week}`,
        old_week: result.old_week,
        new_week: result.new_week,
        season_year: result.season_year,
        players_unlocked: result.players_unlocked
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error('Error in advance-week:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
