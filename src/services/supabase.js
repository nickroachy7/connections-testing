import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase initialization:', {
  url: supabaseUrl,
  keyExists: !!supabaseAnonKey,
  keyPrefix: supabaseAnonKey?.substring(0, 20)
});

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});

// Auth helpers
export const signUp = async (email, password, username) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      },
    },
  });
  
  if (error) throw error;
  return data;
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const resetPassword = async (email) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  
  if (error) throw error;
  return data;
};

// User profile helpers
export const getUserProfile = async (userId) => {
  console.log('getUserProfile called with userId:', userId);
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('getUserProfile error:', error);
    throw error;
  }
  console.log('getUserProfile success:', data);
  return data;
};

export const updateUserProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Pack opening
export const openPack = async (packId, isStarterPack = false) => {
  try {
    const { data, error } = await supabase.functions.invoke('open-pack', {
      body: { pack_id: packId, is_starter_pack: isStarterPack },
    });
    
    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message || 'Failed to open pack');
    }
    
    return data;
  } catch (err) {
    console.error('openPack error:', err);
    throw new Error(err.message || 'Failed to send request to Edge Function');
  }
};

// Get starter pack ID
export const getStarterPack = async () => {
  const { data, error } = await supabase
    .from('packs')
    .select('id')
    .eq('pack_type', 'starter')
    .single();
  
  if (error) throw error;
  return data;
};

// Team helpers
export const startNewTeam = async (teamName) => {
  const { data, error } = await supabase.functions.invoke('start-new-team', {
    body: { team_name: teamName },
  });
  
  if (error) throw error;
  return data;
};

export const getUserTeams = async (userId) => {
  const { data, error } = await supabase
    .from('teams')
    .select(`
      *,
      contest_type:contest_types(
        id,
        name,
        display_name,
        total_weeks,
        max_losses,
        scoring_type
      )
    `)
    .eq('user_id', userId)
    .eq('is_bot', false)  // Exclude bot teams from user's team list
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

// Quick sell card
export const quickSellCard = async (inventoryId, cardType) => {
  const { data, error } = await supabase.functions.invoke('quick-sell-card', {
    body: { inventory_id: inventoryId, card_type: cardType },
  });
  
  if (error) throw error;
  return data;
};

// Get user inventory
export const getUserInventory = async (userId, teamId) => {
  const [playersResponse, tokensResponse, teamResponse] = await Promise.all([
    supabase
      .from('user_player_inventory')
      .select(`
        *,
        player_card:player_cards!inner(
          id,
          player_id,
          player_name,
          position,
          team_abbreviation,
          base_value,
          image_url,
          weekly_projected_points,
          projected_points,
          season_ppg,
          season_avg_points,
          games_played_season,
          injury_status,
          last_projection_update
        )
      `)
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .order('acquired_at', { ascending: false }),
    
    supabase
      .from('user_token_inventory')
      .select(`
        *,
        token_card:token_cards!inner(
          id,
          token_name,
          token_type,
          base_value,
          bonus_points,
          description,
          icon_url
        )
      `)
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .order('acquired_at', { ascending: false }),
    
    supabase
      .from('teams')
      .select('simulated_season_id')
      .eq('id', teamId)
      .single()
  ]);

  if (playersResponse.error) throw playersResponse.error;
  if (tokensResponse.error) throw tokensResponse.error;
  if (teamResponse.error) throw teamResponse.error;

  return {
    players: playersResponse.data,
    tokens: tokensResponse.data,
    team: teamResponse.data
  };
};

// Get available packs
export const getAvailablePacks = async () => {
  const { data, error } = await supabase
    .from('packs')
    .select('*')
    .eq('is_available', true)
    .neq('pack_type', 'starter')
    .order('coin_cost', { ascending: true });
  
  if (error) throw error;
  return data || [];
};

// Get player fantasy points (season totals)
export const getPlayerFantasyPoints = async () => {
  const { data, error } = await supabase
    .from('player_game_stats')
    .select('player_id, fantasy_points');
  
  if (error) throw error;
  
  // Aggregate fantasy points by player_id
  const pointsByPlayer = {};
  data.forEach(stat => {
    if (!pointsByPlayer[stat.player_id]) {
      pointsByPlayer[stat.player_id] = 0;
    }
    pointsByPlayer[stat.player_id] += stat.fantasy_points || 0;
  });
  
  return pointsByPlayer;
};
