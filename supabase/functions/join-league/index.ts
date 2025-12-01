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

    const { invite_code } = await req.json()

    if (!invite_code) {
      return new Response(
        JSON.stringify({ error: 'Invite code is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Find league by invite code
    const { data: league, error: leagueError } = await supabaseClient
      .from('leagues')
      .select('*')
      .eq('invite_code', invite_code.toUpperCase())
      .eq('status', 'active')
      .single()

    if (leagueError || !league) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invite code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Check if user is already a member
    const { data: existingMembership } = await supabaseClient
      .from('league_memberships')
      .select('id')
      .eq('league_id', league.id)
      .eq('user_id', user.id)
      .single()

    if (existingMembership) {
      return new Response(
        JSON.stringify({ error: 'You are already a member of this league', league }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check if league has capacity
    const { data: hasCapacity, error: capacityError } = await supabaseClient
      .rpc('league_has_capacity', { p_league_id: league.id })

    if (capacityError) {
      console.error('Error checking capacity:', capacityError)
      return new Response(
        JSON.stringify({ error: 'Failed to check league capacity' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!hasCapacity) {
      return new Response(
        JSON.stringify({ error: 'League is full' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create membership
    const { data: membership, error: membershipError } = await supabaseClient
      .from('league_memberships')
      .insert({
        league_id: league.id,
        user_id: user.id,
        is_commissioner: false,
      })
      .select()
      .single()

    if (membershipError) {
      console.error('Error creating membership:', membershipError)
      return new Response(
        JSON.stringify({ error: 'Failed to join league', details: membershipError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        league,
        membership,
        message: 'Successfully joined league',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in join-league function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
