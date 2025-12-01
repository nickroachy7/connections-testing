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

    const {
      name,
      max_users = 10,
      max_teams_per_user = 1,
      elimination_enabled = true,
      restart_allowed = false,
      fresh_start_required = false,
      restart_requires_new_team = false,
      // Contest configuration
      contest_config = {},
    } = await req.json()

    // Extract contest config with defaults
    const {
      scoring_type = 'half_ppr',
      win_condition = 'median',
      elimination_type = elimination_enabled ? 'strike' : 'none',
      max_losses = 3,
      max_restarts = null, // null = unlimited
      restart_reset_record = true,
      total_weeks = 18,
      starter_tier_config = { role_player: 1, starter: 0, all_star: 0 },
    } = contest_config

    // Validation
    if (!name || name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'League name is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (max_users < 1 || max_users > 100) {
      return new Response(
        JSON.stringify({ error: 'Max users must be between 1 and 100' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (max_teams_per_user < 1 || max_teams_per_user > 3) {
      return new Response(
        JSON.stringify({ error: 'Max teams per user must be between 1 and 3' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validate contest config
    const validScoringTypes = ['standard', 'half_ppr', 'full_ppr']
    const validWinConditions = ['median', 'h2h', 'both']
    const validEliminationTypes = ['none', 'strike', 'survivor']

    if (!validScoringTypes.includes(scoring_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid scoring type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!validWinConditions.includes(win_condition)) {
      return new Response(
        JSON.stringify({ error: 'Invalid win condition' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!validEliminationTypes.includes(elimination_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid elimination type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (max_losses < 1 || max_losses > 18) {
      return new Response(
        JSON.stringify({ error: 'Max losses must be between 1 and 18' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (total_weeks < 1 || total_weeks > 18) {
      return new Response(
        JSON.stringify({ error: 'Total weeks must be between 1 and 18' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Generate unique invite code
    let inviteCode = ''
    let isUnique = false
    let attempts = 0
    const maxAttempts = 10

    while (!isUnique && attempts < maxAttempts) {
      // Generate 8-character code
      const { data: codeData, error: codeError } = await supabaseClient.rpc('generate_invite_code')
      
      if (codeError) {
        throw new Error('Failed to generate invite code')
      }

      inviteCode = codeData

      // Check if code is unique
      const { data: existing } = await supabaseClient
        .from('leagues')
        .select('id')
        .eq('invite_code', inviteCode)
        .single()

      if (!existing) {
        isUnique = true
      }
      attempts++
    }

    if (!isUnique) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate unique invite code. Please try again.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Get current season and week
    const { data: nflConfig } = await supabaseClient
      .from('nfl_season_config')
      .select('season_year, current_week')
      .eq('is_active', true)
      .single()

    const currentSeason = nflConfig?.season_year || 2024
    const currentWeek = nflConfig?.current_week || 1

    // Create league (trigger will create default contest config)
    const { data: league, error: leagueError } = await supabaseClient
      .from('leagues')
      .insert({
        name: name.trim(),
        commissioner_id: user.id,
        max_users,
        max_teams_per_user,
        elimination_enabled: elimination_type !== 'none',
        restart_allowed,
        fresh_start_required,
        restart_requires_new_team,
        invite_code: inviteCode,
        season: currentSeason,
      })
      .select()
      .single()

    if (leagueError) {
      console.error('Error creating league:', leagueError)
      return new Response(
        JSON.stringify({ error: 'Failed to create league', details: leagueError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Update contest config with commissioner's settings
    // The trigger creates a default config, now we update it with actual settings
    const { error: configError } = await supabaseClient
      .from('league_contest_config')
      .update({
        scoring_type,
        win_condition,
        elimination_type,
        max_losses: elimination_type === 'survivor' ? 1 : max_losses,
        restart_allowed,
        max_restarts,
        restart_reset_record,
        total_weeks,
        start_week: currentWeek,
        starter_tier_config,
      })
      .eq('league_id', league.id)

    if (configError) {
      console.error('Error updating contest config:', configError)
      // Non-fatal - league was created, just with defaults
    }

    // Fetch the updated config to return with the league
    const { data: contestConfig } = await supabaseClient
      .from('league_contest_config')
      .select('*')
      .eq('league_id', league.id)
      .single()

    return new Response(
      JSON.stringify({
        success: true,
        league: {
          ...league,
          contest_config: contestConfig,
        },
        message: 'League created successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in create-league function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
