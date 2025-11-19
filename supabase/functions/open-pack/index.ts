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

    // Get user from auth context
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
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

    // No need to check coins here - coins are deducted during purchase_pack RPC
    // This function only handles opening packs that have already been purchased

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

    // Build tier assignment array
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

    // Shuffle tiers randomly
    const shuffledTiers = tiersToAssign.sort(() => Math.random() - 0.5)

    console.log('Tiers to assign:', shuffledTiers)
    console.log('Generating', pack.player_count, 'players and', pack.token_count, 'tokens')

    // Start transaction
    const contents: { players: any[], tokens: any[] } = {
      players: [],
      tokens: []
    }

    // Helper function to get starting level for tier
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

    // Generate players based on pack configuration
    // For starter packs, return cards for user to assign tiers (client-side)
    // For regular packs, insert cards directly at Base tier
    for (let i = 0; i < pack.player_count; i++) {
      const playerCard = await generatePlayerCard(supabaseClient)
      if (playerCard) {
        contents.players.push(playerCard)

        // For starter packs, don't insert yet - return cards for tier assignment
        if (is_starter_pack) {
          console.log('Starter pack - returning card for tier assignment:', playerCard.player_name)
          continue
        }

        // Regular packs: Add to inventory at Base tier, Level 1
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
    }

    // Generate tokens based on pack configuration
    for (let i = 0; i < pack.token_count; i++) {
      const tokenCard = await generateTokenCard(supabaseClient)
      if (tokenCard) {
        contents.tokens.push(tokenCard)

        // For starter packs, don't insert yet - return tokens for client to insert
        if (is_starter_pack) {
          console.log('Starter pack - returning token:', tokenCard.token_name)
          continue
        }

        // Regular packs: Add to inventory immediately
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
          message: 'Please assign tiers to your starter pack cards'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Coins are deducted during purchase_pack RPC, not here
    // This function only handles opening purchased packs

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
  // Get random player card with allowed positions only: QB, RB, WR, TE
  // No rarity filtering - all players are equally likely
  // Cards will start at Level 1, Base tier and progress through gameplay
  const { data: playerCards, error } = await supabaseClient
    .from('player_cards')
    .select('id, player_name, position, team_abbreviation, image_url, projected_points')
    .in('position', ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End'])
    .eq('is_active', true)

  if (error || !playerCards || playerCards.length === 0) {
    console.error('Error fetching player card:', error)
    return null
  }

  // Select a random player from all available skill position players
  const playerCard = playerCards[Math.floor(Math.random() * playerCards.length)]

  return playerCard
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
