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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get auth token and verify user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { pack_id, team_id, is_starter_pack = false } = await req.json()

    console.log('Opening pack:', { pack_id, team_id, is_starter_pack, user_id: user.id })

    // Get pack details
    const { data: pack, error: packError } = await supabaseClient
      .from('packs')
      .select('*')
      .eq('id', pack_id)
      .single()

    if (packError || !pack) {
      console.error('Pack error:', packError)
      throw new Error(`Pack not found: ${packError?.message || 'Unknown error'}`)
    }

    // Use the provided team_id, or fall back to active team
    let teamToUse = null
    if (team_id) {
      // Verify the team belongs to the user
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
      // Fall back to active team
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

    // Retrieve the pre-generated pack contents from user_packs
    // Cards are now generated during purchase_pack RPC to prevent loss on refresh
    const { data: userPack, error: userPackError } = await supabaseClient
      .from('user_packs')
      .select('id, pack_contents, cards_added_to_inventory')
      .eq('pack_id', pack_id)
      .eq('team_id', teamToUse.id)
      .eq('user_id', user.id)
      .eq('is_opened', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (userPackError || !userPack) {
      console.error('User pack error:', userPackError)
      throw new Error('Pack not found or already opened')
    }

    // If pack contents don't exist (old packs before migration), generate them now
    let contents = userPack.pack_contents
    if (!contents) {
      console.log('Legacy pack detected - generating contents on-the-fly')
      contents = { players: [], tokens: [] }
      
      // Generate players
      for (let i = 0; i < pack.player_count; i++) {
        const playerCard = await generatePlayerCard(supabaseClient)
        if (playerCard) contents.players.push(playerCard)
      }
      
      // Generate tokens
      for (let i = 0; i < pack.token_count; i++) {
        const tokenCard = await generateTokenCard(supabaseClient)
        if (tokenCard) contents.tokens.push(tokenCard)
      }
      
      // Update user_packs with generated contents
      await supabaseClient
        .from('user_packs')
        .update({ pack_contents: contents })
        .eq('id', userPack.id)
    }

    console.log('Retrieved pack contents:', {
      players_count: contents.players?.length || 0,
      tokens_count: contents.tokens?.length || 0
    })

    // Get tier configuration for starter packs
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

    // For starter packs, return cards for tier assignment (client-side)
    // For regular packs, add cards to inventory immediately
    if (!is_starter_pack && !userPack.cards_added_to_inventory) {
      console.log('Adding cards to inventory for regular pack')
      
      // Add players to inventory at Base tier, Level 1
      for (const playerCard of contents.players) {
        const { error: inventoryError } = await supabaseClient
          .rpc('insert_player_to_inventory', {
            p_user_id: user.id,
            p_team_id: teamToUse.id,
            p_player_card_id: playerCard.id,
            p_card_level: 1,
            p_card_tier: 'base',
            p_experience_points: 0
          })

        if (inventoryError) {
          console.error('Inventory error:', inventoryError)
          throw new Error(`Failed to add player to inventory: ${inventoryError.message}`)
        }
        
        console.log('Added player:', playerCard.player_name, 'to team', teamToUse.id)
      }

      // Add tokens to inventory
      for (const tokenCard of contents.tokens) {
        const { error: tokenInventoryError } = await supabaseClient
          .rpc('insert_token_to_inventory', {
            p_user_id: user.id,
            p_team_id: teamToUse.id,
            p_token_card_id: tokenCard.id
          })

        if (tokenInventoryError) {
          console.error('Token inventory error:', tokenInventoryError)
          throw new Error(`Failed to add token to inventory: ${tokenInventoryError.message}`)
        }
        
        console.log('Added token:', tokenCard.token_name, 'to team', teamToUse.id)
      }
      
      // Mark cards as added to inventory
      await supabaseClient
        .from('user_packs')
        .update({ cards_added_to_inventory: true })
        .eq('id', userPack.id)
    }

    // If this is a starter pack, return cards + tier config for client-side assignment
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
          user_pack_id: userPack.id,
          message: 'Please assign tiers to your starter pack cards'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // For regular packs, mark as opened since cards are now in inventory
    await supabaseClient
      .from('user_packs')
      .update({ 
        is_opened: true, 
        opened_at: new Date().toISOString() 
      })
      .eq('id', userPack.id)

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
  // Get player cards with pack_weight for weighted random selection
  // Uses the production-grade rarity system where pack_weight directly determines pull probability
  // Higher pack_weight = more likely to pull (no confusing inversion)
  const { data: playerCards, error } = await supabaseClient
    .from('player_cards')
    .select('id, player_name, position, team_abbreviation, image_url, projected_points, pull_percentage, pack_weight, rarity_tier, season_ppg')
    .in('position', ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End'])
    .eq('is_active', true)

  if (error || !playerCards || playerCards.length === 0) {
    console.error('Error fetching player card:', error)
    return null
  }

  // Direct weighted random selection using pack_weight
  // No inversion needed - higher pack_weight = more likely to pull
  // Default weight of 25 if pack_weight not set (will be set by calculate-pull-rates)
  const totalWeight = playerCards.reduce((sum: number, p: any) => {
    return sum + (p.pack_weight || 25);
  }, 0)
  let randomValue = Math.random() * totalWeight
  
  for (const player of playerCards) {
    const weight = player.pack_weight || 25
    randomValue -= weight
    if (randomValue <= 0) {
      console.log(`✨ Pulled ${player.player_name} (${player.position}) - ${player.rarity_tier} tier, weight: ${weight}, display: ${player.pull_percentage}%, ${player.season_ppg} PPG`)
      return player
    }
  }
  
  // Fallback to first player (should never happen)
  return playerCards[0]
}

async function generateTokenCard(supabaseClient: any) {
  // Get random token card - no rarity filtering
  // All tokens are equally likely to drop
  const { data: tokenCards, error } = await supabaseClient
    .from('token_cards')
    .select('id, token_name, token_type, icon_url, condition, bonus_points')

  if (error || !tokenCards || tokenCards.length === 0) {
    console.error('Error fetching token card:', error)
    return null
  }

  // Select a random token from all available tokens
  const tokenCard = tokenCards[Math.floor(Math.random() * tokenCards.length)]

  return tokenCard
}
