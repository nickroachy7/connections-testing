import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Use service role for this function (called by cron/admin)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { week, season } = await req.json()

    if (!week || !season) {
      return new Response(
        JSON.stringify({ error: 'Week and season are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Calculating league medians for Week ${week}, Season ${season}`)

    // Get all active leagues
    const { data: leagues, error: leaguesError } = await supabaseClient
      .from('leagues')
      .select('id, name, elimination_enabled')
      .eq('status', 'active')
      .eq('season', season)

    if (leaguesError) {
      throw new Error(`Failed to fetch leagues: ${leaguesError.message}`)
    }

    if (!leagues || leagues.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active leagues found', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const results = []

    for (const league of leagues) {
      try {
        // Get all active teams in this league with their scores for this week
        const { data: leagueTeams, error: teamsError } = await supabaseClient
          .from('league_teams')
          .select(`
            id,
            team_id,
            user_id,
            league_lives,
            league_losses,
            league_wins,
            is_active,
            teams!inner (
              id,
              team_name,
              weekly_lineups!inner (
                week,
                season,
                total_points
              )
            )
          `)
          .eq('league_id', league.id)
          .eq('teams.weekly_lineups.week', week)
          .eq('teams.weekly_lineups.season', season)

        if (teamsError) {
          console.error(`Error fetching teams for league ${league.id}:`, teamsError)
          continue
        }

        if (!leagueTeams || leagueTeams.length === 0) {
          console.log(`No teams found for league ${league.name}`)
          continue
        }

        // Extract scores
        const scores = leagueTeams
          .map(lt => lt.teams.weekly_lineups[0]?.total_points)
          .filter(score => score !== null && score !== undefined)
          .map(score => parseFloat(score))

        if (scores.length === 0) {
          console.log(`No scores found for league ${league.name}`)
          continue
        }

        // Calculate median
        scores.sort((a, b) => a - b)
        const mid = Math.floor(scores.length / 2)
        const median = scores.length % 2 === 0
          ? (scores[mid - 1] + scores[mid]) / 2
          : scores[mid]

        const teamsAbove = scores.filter(s => s >= median).length
        const teamsBelow = scores.filter(s => s < median).length
        const highest = Math.max(...scores)
        const lowest = Math.min(...scores)

        // Insert or update league weekly stats
        const { error: statsError } = await supabaseClient
          .from('league_weekly_stats')
          .upsert({
            league_id: league.id,
            week,
            season,
            median_score: median,
            total_teams: scores.length,
            teams_above_median: teamsAbove,
            teams_below_median: teamsBelow,
            highest_score: highest,
            lowest_score: lowest,
            calculated_at: new Date().toISOString(),
          }, {
            onConflict: 'league_id,week,season'
          })

        if (statsError) {
          console.error(`Error saving stats for league ${league.id}:`, statsError)
          continue
        }

        // Update team records based on median
        for (const leagueTeam of leagueTeams) {
          const teamScore = leagueTeam.teams.weekly_lineups[0]?.total_points
          if (teamScore === null || teamScore === undefined) continue

          const beatMedian = parseFloat(teamScore) >= median
          const newWins = leagueTeam.league_wins + (beatMedian ? 1 : 0)
          const newLosses = leagueTeam.league_losses + (beatMedian ? 0 : 1)
          const newLives = leagueTeam.league_lives - (beatMedian ? 0 : 1)

          // Determine if team should be eliminated
          let isActive = leagueTeam.is_active
          let eliminatedAt = null

          if (league.elimination_enabled && newLives <= 0 && isActive) {
            isActive = false
            eliminatedAt = new Date().toISOString()
          }

          // Update league team record
          const { error: updateError } = await supabaseClient
            .from('league_teams')
            .update({
              league_wins: newWins,
              league_losses: newLosses,
              league_lives: Math.max(0, newLives),
              is_active: isActive,
              eliminated_at: eliminatedAt,
            })
            .eq('id', leagueTeam.id)

          if (updateError) {
            console.error(`Error updating team ${leagueTeam.team_id}:`, updateError)
          }
        }

        results.push({
          league_id: league.id,
          league_name: league.name,
          median_score: median,
          total_teams: scores.length,
          teams_above: teamsAbove,
          teams_below: teamsBelow,
        })

        console.log(`✓ Calculated median for ${league.name}: ${median.toFixed(2)} (${scores.length} teams)`)

      } catch (error) {
        console.error(`Error processing league ${league.id}:`, error)
        results.push({
          league_id: league.id,
          league_name: league.name,
          error: error.message,
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        week,
        season,
        leagues_processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in calculate-league-median function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
