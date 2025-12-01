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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const { league_id, team_id } = await req.json()

    if (!league_id || !team_id) {
      return new Response(
        JSON.stringify({ error: 'League ID and Team ID are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Verify user is a member of the league
    const { data: membership } = await supabaseClient
      .from('league_memberships')
      .select('*')
      .eq('league_id', league_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return new Response(
        JSON.stringify({ error: 'You are not a member of this league' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Get league settings
    const { data: league, error: leagueError} = await supabaseClient
      .from('leagues')
      .select('*')
      .eq('id', league_id)
      .single()

    if (leagueError || !league) {
      return new Response(
        JSON.stringify({ error: 'League not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Verify team belongs to user
    const { data: team, error: teamError } = await supabaseClient
      .from('teams')
      .select('*')
      .eq('id', team_id)
      .eq('user_id', user.id)
      .single()

    if (teamError || !team) {
      return new Response(
        JSON.stringify({ error: 'Team not found or does not belong to you' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Check if fresh start is required
    if (league.fresh_start_required) {
      // Verify team was created after league creation
      const teamCreated = new Date(team.created_at)
      const leagueCreated = new Date(league.created_at)

      if (teamCreated < leagueCreated) {
        return new Response(
          JSON.stringify({ 
            error: 'This league requires a fresh start. Please create a new team to join.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
    }

    // Check if team is already in league
    const { data: existingTeam } = await supabaseClient
      .from('league_teams')
      .select('id')
      .eq('league_id', league_id)
      .eq('team_id', team_id)
      .single()

    if (existingTeam) {
      return new Response(
        JSON.stringify({ error: 'This team is already in the league' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check if user can add more teams
    const { data: canAdd, error: canAddError } = await supabaseClient
      .rpc('can_add_team_to_league', { 
        p_league_id: league_id, 
        p_user_id: user.id 
      })

    if (canAddError) {
      console.error('Error checking team limit:', canAddError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify team limit' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!canAdd) {
      return new Response(
        JSON.stringify({ 
          error: `You have reached the maximum number of teams (${league.max_teams_per_user}) for this league` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Add team to league
    const { data: leagueTeam, error: leagueTeamError } = await supabaseClient
      .from('league_teams')
      .insert({
        league_id,
        team_id,
        user_id: user.id,
        is_active: true,
        league_lives: 3,
        league_losses: 0,
        league_wins: 0,
      })
      .select()
      .single()

    if (leagueTeamError) {
      console.error('Error adding team to league:', leagueTeamError)
      return new Response(
        JSON.stringify({ error: 'Failed to add team to league', details: leagueTeamError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        league_team: leagueTeam,
        message: 'Team successfully added to league',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in add-team-to-league function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
