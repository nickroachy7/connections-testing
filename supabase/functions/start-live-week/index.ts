import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * START LIVE WEEK
 * 
 * Purpose: Marks the current NFL week as "live" when the very first game of the week begins.
 * 
 * Responsibilities:
 * 1. Check if any game has started this week
 * 2. Update nfl_season_config.week_status to 'live'
 * 3. Only runs if status is currently 'scheduled'
 * 
 * Scheduled: Every 5 minutes on game days (Thu/Sun/Mon)
 * First runs when the Thursday night game starts each week
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current NFL week and season
    const { data: weekConfig, error: weekError } = await supabase
      .rpc('get_current_nfl_week')
    
    if (weekError || !weekConfig || weekConfig.length === 0) {
      throw new Error('Failed to get current NFL week from config')
    }
    
    const { season_year: seasonYear, week_number: weekNumber } = weekConfig[0]
    const currentStatus = weekConfig[0].week_status

    console.log(`🏈 Checking if Week ${weekNumber}, ${seasonYear} should go live (current status: ${currentStatus})`)

    // If already live or finalized, nothing to do (prevents running multiple times)
    if (currentStatus === 'live' || currentStatus === 'finalized') {
      console.log(`✅ Week ${weekNumber} is already ${currentStatus}, skipping`)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Week ${weekNumber} is already ${currentStatus}, no action needed`,
          week_number: weekNumber,
          season_year: seasonYear,
          week_status: currentStatus,
          already_processed: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Only proceed if status is 'scheduled'
    if (currentStatus !== 'scheduled') {
      console.log(`⚠️  Week ${weekNumber} status is '${currentStatus}', expected 'scheduled'`)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Week ${weekNumber} status is '${currentStatus}', cannot mark as live`,
          week_number: weekNumber,
          season_year: seasonYear,
          week_status: currentStatus
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check if any game has started (status: live, halftime, or final)
    const { data: startedGames, error: gamesError } = await supabase
      .from('game_scores')
      .select('id, game_status, home_team, away_team, game_start_time')
      .eq('week_number', weekNumber)
      .eq('season_year', seasonYear)
      .in('game_status', ['live', 'halftime', 'final'])

    if (gamesError) {
      throw new Error(`Error checking game status: ${gamesError.message}`)
    }

    if (!startedGames || startedGames.length === 0) {
      console.log(`⏰ No games have started yet in Week ${weekNumber}`)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Week ${weekNumber} remains scheduled - no games started`,
          week_number: weekNumber,
          season_year: seasonYear,
          week_status: 'scheduled'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // At least one game has started - mark week as LIVE
    console.log(`🔴 Week ${weekNumber} is now LIVE! ${startedGames.length} game(s) started:`)
    startedGames.forEach((game: any) => {
      console.log(`  - ${game.away_team} @ ${game.home_team} (${game.game_status}) started at ${game.game_start_time}`)
    })

    const { error: updateError } = await supabase
      .from('nfl_season_config')
      .update({ 
        week_status: 'live',
        updated_at: new Date().toISOString()
      })
      .eq('season_year', seasonYear)
      .eq('current_week', weekNumber)
      .eq('is_active', true)

    if (updateError) {
      throw new Error(`Error updating week status: ${updateError.message}`)
    }

    console.log(`✅ Successfully marked Week ${weekNumber} as LIVE`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Week ${weekNumber} is now LIVE!`,
        week_number: weekNumber,
        season_year: seasonYear,
        week_status: 'live',
        games_started: startedGames.length,
        first_game: startedGames[0] ? `${startedGames[0].away_team} @ ${startedGames[0].home_team}` : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in start-live-week:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
