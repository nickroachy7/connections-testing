import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

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
      throw new Error('Unauthorized')
    }

    const { pack_id, team_id, is_starter_pack = false } = await req.json()

    console.log('Opening pack:', { pack_id, team_id, is_starter_pack, user_id: user.id })

    const { data: pack, error: packError } = await supabaseClient
      .from('packs')
      .select('*')
      .eq('id', pack_id)
      .single()

    if (packError || !pack) {
      console.error('Pack error:', packError)
      throw new Error(`Pack not found: ${packError?.message || 'Unknown error'}`)
    }

    let teamToUse = null
    if (team_id) {
      const { data: teamData, error: teamError } = await supabaseClient
        .from('teams')
        .select('id, contest_type_id')
        .eq('id', team_id)
        .eq('user_id', user.id)
        .single()

      if (teamError || !teamData) {
        throw new Error('Team not found or does not belong to user')
      }
      teamToUse = teamData
    } else {
      const { data: teams, error: teamsError } = await supabaseClient
        .from('teams')
        .select('id, contest_type_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (teamsError || !teams) {
        throw new Error('No active team found')
      }
      teamToUse = teams
    }

    console.log('Using team:', teamToUse)

    let tierConfig = { role_player: 0, starter: 0, all_star: 0 }
    if (is_starter_pack && teamToUse.contest_type_id) {
      const { data: contestType } = await supabaseClient
        .from('contest_types')
        .select('starter_tier_config')
        .eq('id', teamToUse.contest_type_id)
        .single()
      
      if (contestType) {
        tierConfig = contestType.starter_tier_config
        console.log('Tier config for contest:', tierConfig)
      }
    }

    const tiersToAssign: string[] = []
    if (tierConfig.all_star > 0) {
      for (let i = 0; i < tierConfig.all_star; i++) tiersToAssign.push('all_star')
    }
    if (tierConfig.starter > 0) {
      for (let i = 0; i < tierConfig.starter; i++) tiersToAssign.push('starter')
    }
    if (tierConfig.role_player > 0) {
      for (let i = 0; i < tierConfig.role_player; i++) tiersToAssign.push('role_player')
    }

    const shuffledTiers = tiersToAssign.sort(() => Math.random() - 0.5)

    console.log('Tiers to assign:', shuffledTiers)
    console.log('Generating', pack.player_count, 'players and', pack.token_count, 'tokens')

    const contents: { players: any[], tokens: any[] } = {
      players: [],
      tokens: []
    }

    const getStartingLevelForTier = (tier: string): number => {
      const tierLevels: Record<string, number> = {
        'base': 1,
        'role_player': 3,
        'starter': 5,
        'all_star': 7,
        'elite': 9
      }
      return tierLevels[tier] || 1
    }

    for (let i = 0; i < pack.player_count; i++) {
      const playerCard = await generatePlayerCard(supabaseClient)
      if (playerCard) {
        contents.players.push(playerCard)

        if (is_starter_pack) {
          // Return for tier assignment
        } else {
          // Regular pack: insert at Base tier
          const { error: insertError } = await supabaseClient
            .from('inventory')
            .insert({
              user_id: user.id,
              team_id: teamToUse.id,
              player_card_id: playerCard.id,
              card_tier: 'base',
              current_level: 1,
              xp: 0,
              acquired_from: 'pack_opening',
            })

          if (insertError) {
            console.error('Error adding to inventory:', insertError)
          }
        }
      }
    }

    for (let i = 0; i < pack.token_count; i++) {
      const tokenCard = await generateTokenCard(supabaseClient)
      if (tokenCard) {
        contents.tokens.push(tokenCard)

        const { error: insertError } = await supabaseClient
          .from('token_inventory')
          .insert({
            user_id: user.id,
            team_id: teamToUse.id,
            token_card_id: tokenCard.id,
            acquired_from: 'pack_opening',
          })

        if (insertError) {
          console.error('Error adding token to inventory:', insertError)
        }
      }
    }

    if (is_starter_pack) {
      console.log('Returning starter pack contents:', JSON.stringify({
        players_count: contents.players.length,
        tokens_count: contents.tokens.length,
        tier_config: tierConfig
      }))
      
      return new Response(
        JSON.stringify({
          success: true,
          needs_tier_assignment: true,
          tier_config: tierConfig,
          contents: contents,
          message: 'Please assign tiers to your starter pack cards'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        contents: contents,
        message: `${pack.pack_name} opened successfully!`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error opening pack:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to open pack' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function generatePlayerCard(supabaseClient: any) {
  const { data: playerCards, error } = await supabaseClient
    .from('player_cards')
    .select('id, player_name, position, team_abbreviation, image_url, projected_points, pull_percentage, season_ppg')
    .in('position', ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End'])
    .eq('is_active', true)

  if (error || !playerCards || playerCards.length === 0) {
    console.error('Error fetching player card:', error)
    return null
  }

  const totalWeight = playerCards.reduce((sum, p) => sum + (p.pull_percentage || 50), 0)
  let randomValue = Math.random() * totalWeight
  
  for (const player of playerCards) {
    randomValue -= (player.pull_percentage || 50)
    if (randomValue <= 0) {
      console.log(`✨ Pulled ${player.player_name} (${player.position}) - ${player.pull_percentage}% weight, ${player.season_ppg} PPG`)
      return player
    }
  }
  
  return playerCards[0]
}

async function generateTokenCard(supabaseClient: any) {
  const { data: tokenCards, error } = await supabaseClient
    .from('token_cards')
    .select('id, token_name, token_type, icon_url, condition, bonus_points')

  if (error || !tokenCards || tokenCards.length === 0) {
    console.error('Error fetching token card:', error)
    return null
  }

  const tokenCard = tokenCards[Math.floor(Math.random() * tokenCards.length)]
  return tokenCard
}