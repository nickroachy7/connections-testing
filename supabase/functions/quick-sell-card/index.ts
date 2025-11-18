import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
            is_active
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
      baseValue = playerInventory.player_card.base_value

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

    // Get user's current coin balance
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('total_coins')
      .eq('id', user.id)
      .single()
    
    if (profileError || !userProfile) {
      throw new Error('User profile not found')
    }

    const newCoinBalance = userProfile.total_coins + baseValue

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

    // 2. Update user's coin balance
    const { error: updateError } = await supabase
      .from('users')
      .update({ total_coins: newCoinBalance })
      .eq('id', user.id)
    
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