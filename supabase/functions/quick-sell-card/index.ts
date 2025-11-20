import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Calculate dynamic sell value based on card tier, pull percentage, and performance
 * Formula: base_value × tier_multiplier × scarcity_multiplier × performance_multiplier
 */
function calculateDynamicSellValue(
  baseValue: number,
  cardTier: string,
  pullPercentage: number,
  seasonPPG: number
): number {
  // Tier multiplier - rewards leveling up cards
  const tierMultipliers: Record<string, number> = {
    base: 1.0,
    role_player: 1.25,
    starter: 1.5,
    all_star: 2.0,
    elite: 3.0
  }
  
  // Scarcity multiplier based on pull percentage (lower % = rarer = more valuable)
  // REBALANCED 2025-11-19: Reduced multipliers to prevent excessive sell values
  let scarcityMultiplier = 1.0
  if (pullPercentage <= 5) scarcityMultiplier = 2.0        // Was 3.0 - LEGENDARY
  else if (pullPercentage <= 15) scarcityMultiplier = 1.5   // Was 2.0 - EPIC
  else if (pullPercentage <= 30) scarcityMultiplier = 1.3   // Was 1.5 - RARE
  else if (pullPercentage <= 50) scarcityMultiplier = 1.1   // Was 1.2 - UNCOMMON
  // else COMMON = 1.0
  
  // Performance multiplier based on season PPG (real-world performance)
  // REBALANCED 2025-11-19: Reduced multipliers to prevent excessive sell values
  let performanceMultiplier = 1.0
  if (seasonPPG >= 20) performanceMultiplier = 1.3      // Was 1.5 - Elite performers
  else if (seasonPPG >= 15) performanceMultiplier = 1.2  // Was 1.3 - High performers
  else if (seasonPPG >= 10) performanceMultiplier = 1.1  // Was 1.1 - Solid performers
  else if (seasonPPG >= 5) performanceMultiplier = 1.0   // Was 1.0 - Average performers
  else if (seasonPPG < 5) performanceMultiplier = 0.7    // Was 0.8 - Low performers
  
  const tierMult = tierMultipliers[cardTier] || 1.0
  const rawValue = baseValue * tierMult * scarcityMultiplier * performanceMultiplier
  
  // Round to nearest 5 coins for clean numbers, minimum 10 coins
  // REBALANCED 2025-11-19: Reduced from 50 to 10 to allow lower-value cards
  const roundedValue = Math.round(rawValue / 5) * 5
  return Math.max(10, roundedValue)
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405 
      }
    )
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get auth token and verify user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authentication token')
    }

    const { inventory_id, card_type } = await req.json()
    
    if (!inventory_id || !card_type) {
      throw new Error('Missing required fields: inventory_id, card_type')
    }

    if (!['player', 'token'].includes(card_type)) {
      throw new Error('Invalid card_type. Must be "player" or "token"')
    }

    console.log(`User ${user.id} selling ${card_type} card: ${inventory_id}`)

    // Start a transaction
    let cardData
    let baseValue = 0

    if (card_type === 'player') {
      // Get player inventory data with card details
      const { data: playerInventory, error: inventoryError } = await supabase
        .from('user_player_inventory')
        .select(`
          *,
          player_card:player_cards!inner(
            base_value,
            is_active,
            pull_percentage,
            season_ppg,
            player_name
          )
        `)
        .eq('id', inventory_id)
        .eq('user_id', user.id)
        .single()
      
      if (inventoryError || !playerInventory) {
        throw new Error('Player card not found or not owned by user')
      }

      // Check if card is locked
      if (playerInventory.is_locked) {
        throw new Error('Cannot sell locked player cards')
      }

      cardData = playerInventory
      
      // Calculate dynamic sell value based on tier, scarcity, and performance
      baseValue = calculateDynamicSellValue(
        playerInventory.player_card.base_value,
        playerInventory.card_tier,
        playerInventory.player_card.pull_percentage || 50,
        playerInventory.player_card.season_ppg || 0
      )
      
      console.log(`Dynamic sell value for ${playerInventory.player_card.player_name}: ${baseValue} coins (tier: ${playerInventory.card_tier}, pull%: ${playerInventory.player_card.pull_percentage}, PPG: ${playerInventory.player_card.season_ppg})`)

    } else {
      // Get token inventory data with card details
      const { data: tokenInventory, error: inventoryError } = await supabase
        .from('user_token_inventory')
        .select(`
          *,
          token_card:token_cards!inner(
            base_value
          )
        `)
        .eq('id', inventory_id)
        .eq('user_id', user.id)
        .single()
      
      if (inventoryError || !tokenInventory) {
        throw new Error('Token card not found or not owned by user')
      }

      cardData = tokenInventory
      baseValue = tokenInventory.token_card.base_value
    }

    // Get team's current coin balance (cards belong to teams)
    const teamId = cardData.team_id
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('coins')
      .eq('id', teamId)
      .single()
    
    if (teamError || !team) {
      throw new Error('Team not found')
    }

    const newCoinBalance = team.coins + baseValue

    // Perform the transaction
    // 1. Delete the inventory item
    let deleteError
    if (card_type === 'player') {
      const { error } = await supabase
        .from('user_player_inventory')
        .delete()
        .eq('id', inventory_id)
        .eq('user_id', user.id)
      deleteError = error
    } else {
      const { error } = await supabase
        .from('user_token_inventory')
        .delete()
        .eq('id', inventory_id)
        .eq('user_id', user.id)
      deleteError = error
    }

    if (deleteError) {
      throw new Error(`Failed to delete ${card_type} card: ${deleteError.message}`)
    }

    // 2. Update team's coin balance
    const { error: updateError } = await supabase
      .from('teams')
      .update({ coins: newCoinBalance })
      .eq('id', teamId)
    
    if (updateError) {
      throw new Error(`Failed to update coin balance: ${updateError.message}`)
    }

    // 3. Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        team_id: cardData.team_id,
        transaction_type: 'quick_sell',
        coins_change: baseValue,
        coins_after: newCoinBalance,
        metadata: {
          card_type: card_type,
          inventory_id: inventory_id,
          card_name: card_type === 'player' 
            ? cardData.player_card?.player_name || 'Unknown Player'
            : cardData.token_card?.token_name || 'Unknown Token',
          base_value: baseValue
        }
      })
    
    if (transactionError) {
      console.error('Failed to create transaction record:', transactionError)
      // Don't fail the whole transaction if logging fails
    }

    console.log(`Successfully sold ${card_type} card for ${baseValue} coins`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Card sold for ${baseValue} coins`,
        coins_earned: baseValue,
        new_balance: newCoinBalance,
        card_type: card_type
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in quick-sell-card:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})