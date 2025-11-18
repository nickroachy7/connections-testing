import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    const { data: { user }, error: authError} = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const { team_name, contest_type_id, team_image_url } = await req.json()

    if (!team_name) {
      return new Response(
        JSON.stringify({ error: 'Team name is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!contest_type_id) {
      return new Response(
        JSON.stringify({ error: 'Contest type is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Call the database function to create team with smart week assignment
    const { data: teamId, error: teamError } = await supabaseClient
      .rpc('create_new_team', {
        p_user_id: user.id,
        p_team_name: team_name,
        p_contest_type_id: contest_type_id,
        p_team_image_url: team_image_url || null
      })

    if (teamError) {
      console.error('Error creating team:', teamError)
      return new Response(
        JSON.stringify({ error: teamError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Get the created team details
    const { data: team, error: fetchError } = await supabaseClient
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (fetchError) {
      console.error('Error fetching team:', fetchError)
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Get starter pack contents for response
    const { data: starterPack, error: packError } = await supabaseClient
      .from('packs')
      .select('*')
      .eq('pack_type', 'starter')
      .single()

    if (packError) {
      console.error('Error fetching starter pack:', packError)
    }

    return new Response(
      JSON.stringify({ 
        team,
        starter_pack_id: starterPack?.id,
        message: team.current_week ? `Team created! Your first week will be Week ${team.current_week}.` : 'Team created successfully!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})