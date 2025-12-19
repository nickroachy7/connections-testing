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

    // Check if global stats already exist
    const { data: existingStats } = await supabase
      .from('weekly_global_stats')
      .select('*')
      .eq('week_number', weekNumber)
      .eq('season_year', seasonYear)
      .single()

    let globalMedian = existingStats?.median_score || 0

    if (!existingStats) {
      // Calculate global median if it doesn't exist
      const scores = weeklyLineups
        .map(lineup => lineup.total_points || 0)
        .filter(score => score > 0)
        .sort((a, b) => a - b)
      
      if (scores.length > 0) {
        const mid = Math.floor(scores.length / 2)
        if (scores.length % 2 === 0) {
          globalMedian = (scores[mid - 1] + scores[mid]) / 2
        } else {
          globalMedian = scores[mid]
        }
      }

      // Save global stats
      const { error: statsError } = await supabase
        .from('weekly_global_stats')
        .insert({
          week_number: weekNumber,
          season_year: seasonYear,
          median_score: globalMedian,
          total_teams: weeklyLineups.length
        })

      if (statsError) {
        console.error('Error saving global stats:', statsError)
      }
    }

    console.log(`Global median for Week ${weekNumber}: ${globalMedian}`)

    let wins = 0
    let losses = 0
    let eliminated = 0

    // Process each team
    for (const lineup of weeklyLineups) {
      const beatMedian = lineup.total_points >= globalMedian
      const resultStatus = beatMedian ? 'win' : 'loss'

      // Update weekly lineup status
      const { error: updateLineupError } = await supabase
        .from('weekly_lineups')
        .update({
          status: 'completed',
          beat_average: beatMedian
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

      const newWins = team.wins + (beatMedian ? 1 : 0)
      const newLosses = team.losses + (beatMedian ? 0 : 1)
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

      if (beatMedian) wins++
      else losses++
      
      if (isEliminated) eliminated++

      // Log the transaction
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: team.user_id,
          team_id: lineup.team_id,
          transaction_type: beatMedian ? 'week_win' : 'week_loss',
          coins_change: 0,
          coins_after: team.coins,
          metadata: {
            week_number: weekNumber,
            season_year: seasonYear,
            total_points: lineup.total_points,
            global_median: globalMedian,
            result: beatMedian ? 'win' : 'loss'
          }
        })

      if (txError) {
        console.error(`Error logging transaction for team ${lineup.team_id}:`, txError)
      }
    }

    // ============================================
    // PROCESS PUBLIC CONTEST RESULTS
    // ============================================
    console.log('Processing public contest results...')
    
    // First, handle incomplete H2H contests (only 1 entrant - cancel and refund)
    const { data: incompleteResult, error: incompleteError } = await supabase
      .rpc('handle_incomplete_contests', { p_week: weekNumber, p_season: seasonYear })
    
    if (incompleteError) {
      console.error('Error handling incomplete contests:', incompleteError)
    } else {
      console.log(`Handled incomplete contests:`, incompleteResult)
    }
    
    // Process contest results (H2H and median contests)
    const { data: contestResult, error: contestError } = await supabase
      .rpc('process_contest_results', { p_week: weekNumber, p_season: seasonYear })
    
    if (contestError) {
      console.error('Error processing contest results:', contestError)
    } else {
      console.log(`Processed contest results:`, contestResult)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Finalized Week ${weekNumber}`,
        processed: weeklyLineups.length,
        wins,
        losses,
        eliminated,
        global_median: globalMedian.toFixed(2),
        contests: {
          incomplete_handled: incompleteResult?.refunded_contests || 0,
          entries_processed: contestResult?.processed_entries || 0
        }
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