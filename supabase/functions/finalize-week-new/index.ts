import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * FINALIZE WEEK
 * 
 * Purpose: Finalize the entire week after ALL games are complete.
 * 
 * Responsibilities:
 * 1. Verify all games are final
 * 2. Calculate median score across all lineups
 * 3. Determine win/loss for each team (above/below median)
 * 4. Update team records (wins/losses)
 * 5. Mark weekly_lineups as 'completed'
 * 6. Update nfl_season_config.week_status to 'finalized'
 * 
 * Scheduled: Tuesday 12:01 AM (after Monday Night Football)
 * Should NOT run if any game is still in progress
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: weekConfig, error: weekError } = await supabase.rpc('get_current_nfl_week')
    if (weekError || !weekConfig || weekConfig.length === 0) {
      throw new Error('Failed to get current NFL week from config')
    }
    
    const { season_year: seasonYear, week_number: weekNumber } = weekConfig[0]
    console.log(`🏁 Finalizing Week ${weekNumber}, ${seasonYear}`)

    // SAFETY CHECK: Ensure ALL games are final before proceeding
    const { data: nonFinalGames } = await supabase
      .from('game_scores')
      .select('id, game_status, home_team, away_team')
      .eq('week_number', weekNumber)
      .eq('season_year', seasonYear)
      .not('game_status', 'eq', 'final')

    if (nonFinalGames && nonFinalGames.length > 0) {
      console.log(`⚠️  Cannot finalize week - ${nonFinalGames.length} game(s) still in progress:`)
      nonFinalGames.forEach((g: any) => {
        console.log(`  - ${g.away_team} @ ${g.home_team} (${g.game_status})`)
      })
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Cannot finalize - ${nonFinalGames.length} games still in progress`,
          non_final_games: nonFinalGames.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get all pending lineups
    const { data: weeklyLineups, error: lineupsError } = await supabase
      .from('weekly_lineups')
      .select('*')
      .eq('week_number', weekNumber)
      .eq('season_year', seasonYear)
      .eq('status', 'pending')

    if (lineupsError) throw new Error(`Error fetching lineups: ${lineupsError.message}`)

    if (!weeklyLineups || weeklyLineups.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No lineups to finalize',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`Found ${weeklyLineups.length} lineups to finalize`)

    // Calculate MEDIAN score (NOT average)
    const scores = weeklyLineups.map((l: any) => l.total_points || 0).sort((a, b) => a - b)
    const medianScore = scores.length % 2 === 0
      ? (scores[Math.floor(scores.length / 2) - 1] + scores[Math.floor(scores.length / 2)]) / 2
      : scores[Math.floor(scores.length / 2)]

    console.log(`📊 Median score for Week ${weekNumber}: ${medianScore} (${scores.length} teams)`)

    // Save global stats
    const { error: globalStatsError } = await supabase
      .from('weekly_global_stats')
      .upsert({
        week_number: weekNumber,
        season_year: seasonYear,
        median_score: medianScore,
        average_score: scores.reduce((a, b) => a + b, 0) / scores.length,
        top_score: Math.max(...scores),
        total_teams: scores.length
      }, { onConflict: 'week_number,season_year' })

    if (globalStatsError) {
      console.error('Error saving global stats:', globalStatsError)
    }

    let processed = 0

    // Process each lineup
    for (const lineup of weeklyLineups) {
      const score = lineup.total_points || 0
      const beatMedian = score >= medianScore

      // Update lineup status
      await supabase
        .from('weekly_lineups')
        .update({
          status: 'completed',
          beat_median: beatMedian,
          beat_average: beatMedian  // Legacy compatibility
        })
        .eq('id', lineup.id)

      // Update team record
      const { data: team } = await supabase
        .from('teams')
        .select('wins, losses, is_active')
        .eq('id', lineup.team_id)
        .single()

      if (team) {
        const newWins = team.wins + (beatMedian ? 1 : 0)
        const newLosses = team.losses + (beatMedian ? 0 : 1)
        const isEliminated = newLosses >= 3  // 3 losses = elimination

        await supabase
          .from('teams')
          .update({
            wins: newWins,
            losses: newLosses,
            is_active: !isEliminated
          })
          .eq('id', lineup.team_id)

        console.log(`Team ${lineup.team_id}: ${score} pts (${beatMedian ? 'W' : 'L'}) - Record: ${newWins}-${newLosses}${isEliminated ? ' [ELIMINATED]' : ''}`)
      }

      processed++
    }

    // Mark week as finalized
    await supabase
      .from('nfl_season_config')
      .update({ 
        week_status: 'finalized',
        updated_at: new Date().toISOString()
      })
      .eq('season_year', seasonYear)
      .eq('current_week', weekNumber)
      .eq('is_active', true)

    console.log(`✅ Week ${weekNumber} finalized! Processed ${processed} lineups with median ${medianScore}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Finalized Week ${weekNumber} with ${processed} teams`,
        week_number: weekNumber,
        median_score: medianScore,
        teams_processed: processed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error('Error in finalize-week:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
