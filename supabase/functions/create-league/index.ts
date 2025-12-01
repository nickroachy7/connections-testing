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
    } = await req.json()

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

    // Get current season
    const { data: weekData } = await supabaseClient
      .from('game_weeks')
      .select('season')
      .order('season', { ascending: false })
      .limit(1)
      .single()

    const currentSeason = weekData?.season || 2024

    // Create league
    const { data: league, error: leagueError } = await supabaseClient
      .from('leagues')
      .insert({
        name: name.trim(),
        commissioner_id: user.id,
        max_users,
        max_teams_per_user,
        elimination_enabled,
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

    return new Response(
      JSON.stringify({
        success: true,
        league,
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
