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

    // Get current NFL week and season from config table
    const { data: weekConfig, error: weekError } = await supabase
      .rpc('get_current_nfl_week')
    
    if (weekError || !weekConfig || weekConfig.length === 0) {
      throw new Error('Failed to get current NFL week from config')
    }
    
    const { season_year: seasonYear, week_number: weekNumber } = weekConfig[0]

    console.log(`Finalizing Week ${weekNumber}, ${seasonYear}`)

    // Get all weekly lineups for this week
    const { data: weeklyLineups, error: lineupsError } = await supabase
      .from('weekly_lineups')
      .select('*')
      .eq('week_number', weekNumber)
      .eq('season_year', seasonYear)
      .eq('status', 'pending')

    if (lineupsError) {
      throw new Error(`Error fetching lineups: ${lineupsError.message}`)
    }

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

    // Check if global average already exists
    const { data: existingAverage } = await supabase
      .from('weekly_global_stats')
      .select('*')
      .eq('week_number', weekNumber)
      .eq('season_year', seasonYear)
      .single()

    let globalAverage = existingAverage?.average_score || 0

    if (!existingAverage) {
      // Calculate global average if it doesn't exist
      const totalPoints = weeklyLineups.reduce((sum, lineup) => sum + (lineup.total_points || 0), 0)
      globalAverage = weeklyLineups.length > 0 ? totalPoints / weeklyLineups.length : 0

      // Save global average
      const { error: avgError } = await supabase
        .from('weekly_global_stats')
        .insert({
          week_number: weekNumber,
          season_year: seasonYear,
          average_score: globalAverage,
          total_teams: weeklyLineups.length
        })

      if (avgError) {
        console.error('Error saving global average:', avgError)
      }
    }

    console.log(`Global average for Week ${weekNumber}: ${globalAverage}`)

    let wins = 0
    let losses = 0
    let eliminated = 0

    // Process each team
    for (const lineup of weeklyLineups) {
      const beatAverage = lineup.total_points >= globalAverage
      const resultStatus = beatAverage ? 'win' : 'loss'

      // Update weekly lineup status
      const { error: updateLineupError } = await supabase
        .from('weekly_lineups')
        .update({
          status: 'completed',
          beat_average: beatAverage
        })
        .eq('id', lineup.id)

      if (updateLineupError) {
        console.error(`Error updating lineup ${lineup.id}:`, updateLineupError)
        continue
      }

      // Get current team record
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', lineup.team_id)
        .single()

      if (teamError || !team) {
        console.error(`Error fetching team ${lineup.team_id}:`, teamError)
        continue
      }

      const newWins = team.wins + (beatAverage ? 1 : 0)
      const newLosses = team.losses + (beatAverage ? 0 : 1)
      const isEliminated = newLosses >= 3

      // Update team record
      const { error: updateTeamError } = await supabase
        .from('teams')
        .update({
          wins: newWins,
          losses: newLosses,
          is_active: !isEliminated
        })
        .eq('id', lineup.team_id)

      if (updateTeamError) {
        console.error(`Error updating team ${lineup.team_id}:`, updateTeamError)
        continue
      }

      if (beatAverage) wins++
      else losses++
      
      if (isEliminated) eliminated++

      // Log the transaction
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: team.user_id,
          transaction_type: beatAverage ? 'week_win' : 'week_loss',
          description: `Week ${weekNumber}: ${beatAverage ? 'Beat' : 'Below'} average (${lineup.total_points.toFixed(1)} vs ${globalAverage.toFixed(1)})`,
          coins_change: 0
        })

      if (txError) {
        console.error(`Error logging transaction for team ${lineup.team_id}:`, txError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Finalized Week ${weekNumber}`,
        processed: weeklyLineups.length,
        wins,
        losses,
        eliminated,
        global_average: globalAverage.toFixed(2)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in finalize-week:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
