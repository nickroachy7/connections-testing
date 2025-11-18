import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
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

    console.log(`Calculating global average for Week ${weekNumber}, ${seasonYear}`)

    // Get all active teams for current week
    const { data: activeTeams, error: teamsError } = await supabase
      .from('teams')
      .select('id')
      .eq('is_active', true)
    
    if (teamsError) {
      throw new Error(`Error fetching active teams: ${teamsError.message}`)
    }

    if (!activeTeams || activeTeams.length === 0) {
      console.log('No active teams found')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active teams found',
          stats: null
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    const teamIds = activeTeams.map(team => team.id)

    // Get all weekly lineups for active teams in current week
    const { data: lineups, error: lineupsError } = await supabase
      .from('weekly_lineups')
      .select('total_points')
      .eq('week_number', weekNumber)
      .eq('season_year', seasonYear)
      .in('team_id', teamIds)
      .in('status', ['pending', 'active', 'completed'])
    
    if (lineupsError) {
      throw new Error(`Error fetching lineups: ${lineupsError.message}`)
    }

    if (!lineups || lineups.length === 0) {
      console.log('No lineups found for current week')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No lineups found for current week',
          stats: null
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Calculate statistics
    const scores = lineups.map(lineup => lineup.total_points || 0).filter(score => score > 0)
    
    if (scores.length === 0) {
      console.log('No valid scores found')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No valid scores found',
          stats: null
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Sort scores for median calculation
    scores.sort((a, b) => a - b)
    
    // Calculate average
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
    
    // Calculate median
    let median
    const mid = Math.floor(scores.length / 2)
    if (scores.length % 2 === 0) {
      median = (scores[mid - 1] + scores[mid]) / 2
    } else {
      median = scores[mid]
    }
    
    // Get highest and lowest scores
    const highest = scores[scores.length - 1]
    const lowest = scores[0]

    const stats = {
      week_number: weekNumber,
      season_year: seasonYear,
      total_active_teams: scores.length,
      average_score: Math.round(average * 100) / 100, // Round to 2 decimal places
      median_score: Math.round(median * 100) / 100,
      highest_score: Math.round(highest * 100) / 100,
      lowest_score: Math.round(lowest * 100) / 100,
      last_updated: new Date().toISOString()
    }

    console.log(`Calculated stats: Average: ${stats.average_score}, Median: ${stats.median_score}, Teams: ${stats.total_active_teams}`)

    // Update weekly_global_stats table
    const { error: upsertError } = await supabase
      .from('weekly_global_stats')
      .upsert(stats, {
        onConflict: 'week_number,season_year'
      })
    
    if (upsertError) {
      throw new Error(`Error updating global stats: ${upsertError.message}`)
    }

    // Broadcast update via Supabase Realtime
    const channel = supabase.channel('global-stats-update')
    channel.send({
      type: 'broadcast',
      event: 'stats-updated',
      payload: stats
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated global average for ${stats.total_active_teams} teams`,
        stats: stats
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in calculate-global-average:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})