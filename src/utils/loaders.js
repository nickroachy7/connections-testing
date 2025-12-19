import { redirect } from 'react-router-dom';
import { supabase, getUserTeams, getUserInventory } from '../services/supabase';
import { searchPlayers, getActivePlayers } from '../services/nflApi';

// Auth check helper
export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    // Redirect to login instead of throwing error
    throw redirect('/login');
  }
  return session.user;
}

// Load user profile
export async function loadUserProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
}

// Dashboard loader
export async function dashboardLoader() {
  try {
    const user = await requireAuth();
    
    const [profile, teams] = await Promise.all([
      loadUserProfile(user.id),
      getUserTeams(user.id)
    ]);
    
    return { user, profile, teams };
  } catch (error) {
    // If it's already a redirect, re-throw it
    if (error instanceof Response) throw error;
    console.error('Dashboard loader error:', error);
    // Return minimal data on error
    return { user: null, profile: null, teams: [] };
  }
}

// Team Manager loader
export async function teamManagerLoader({ params }) {
  try {
    const user = await requireAuth();
    
    const [profile, teams, nflConfig] = await Promise.all([
      loadUserProfile(user.id),
      getUserTeams(user.id),
      // Also fetch current NFL week to sync team if needed
      supabase
        .from('nfl_season_config')
        .select('current_week')
        .eq('is_active', true)
        .single()
        .then(({ data }) => data)
    ]);
    
    // Get team from URL param if available
    let activeTeam = null;
    if (params.teamId) {
      activeTeam = teams.find(t => t.id === params.teamId);
      if (!activeTeam) {
        // Team not found or doesn't belong to user, redirect to team selection
        throw redirect('/teams');
      }
    } else {
      // No teamId in URL, use active team
      activeTeam = teams.find(t => t.is_active);
    }
    
    if (!activeTeam) {
      return { user, profile, teams, activeTeam: null, inventory: { players: [], tokens: [] } };
    }
    
    // SYNC CHECK: If team's current_week is behind NFL's current_week, sync it
    // This handles cases where advance-week hasn't run yet or team was created mid-season
    if (nflConfig?.current_week && activeTeam.current_week < nflConfig.current_week && !activeTeam.simulated_season_id) {
      console.log(`📅 Syncing team ${activeTeam.team_name} from week ${activeTeam.current_week} to ${nflConfig.current_week}`);
      const { data: updatedTeam, error: updateError } = await supabase
        .from('teams')
        .update({ current_week: nflConfig.current_week })
        .eq('id', activeTeam.id)
        .select()
        .single();
      
      if (!updateError && updatedTeam) {
        activeTeam = updatedTeam;
      }
    }
    
    const inventory = await getUserInventory(user.id, activeTeam.id);
    
    return { user, profile, teams, activeTeam, inventory };
  } catch (error) {
    // If it's already a redirect, re-throw it
    if (error instanceof Response) throw error;
    console.error('TeamManager loader error:', error);
    return { user: null, profile: null, teams: [], activeTeam: null, inventory: { players: [], tokens: [] } };
  }
}

// View Team loader - for viewing any team (not just owned teams)
export async function viewTeamLoader({ params }) {
  try {
    const user = await requireAuth();
    
    const [profile, teams] = await Promise.all([
      loadUserProfile(user.id),
      getUserTeams(user.id)
    ]);
    
    // Get the team being viewed (might not belong to current user)
    let viewedTeam = null;
    if (params.teamId) {
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select(`
          *,
          user:users(
            id,
            username,
            avatar_url
          )
        `)
        .eq('id', params.teamId)
        .single();
      
      if (teamError) {
        console.error('Error loading team:', teamError);
        throw redirect('/fantasy');
      }
      
      viewedTeam = teamData;
    }
    
    if (!viewedTeam) {
      throw redirect('/fantasy');
    }
    
    // Load inventory for the viewed team
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('user_player_inventory')
      .select(`
        *,
        player_card:player_cards(*)
      `)
      .eq('team_id', params.teamId);
    
    console.log('🔍 viewTeamLoader - Inventory query result:', {
      teamId: params.teamId,
      inventoryCount: inventoryData?.length,
      hasError: !!inventoryError,
      error: inventoryError,
      firstPlayer: inventoryData?.[0]
    });
    
    if (inventoryError) {
      console.error('Error loading inventory:', inventoryError);
    }
    
    const inventory = {
      players: inventoryData || [],
      tokens: [] // Can add token loading if needed
    };
    
    return { user, profile, teams, activeTeam: viewedTeam, inventory };
  } catch (error) {
    // If it's already a redirect, re-throw it
    if (error instanceof Response) throw error;
    console.error('ViewTeam loader error:', error);
    return { user: null, profile: null, teams: [], activeTeam: null, inventory: { players: [], tokens: [] } };
  }
}

// Players loader
export async function playersLoader({ request }) {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get('search') || '';
  const positionFilter = url.searchParams.get('position') || 'all';
  const sortBy = url.searchParams.get('sort') || 'name';
  
  let players = [];
  
  try {
    if (searchTerm) {
      const data = await searchPlayers(searchTerm, 50);
      players = data?.data || [];
    } else {
      const data = await getActivePlayers({ per_page: 50 });
      players = data?.data || [];
    }
  } catch (err) {
    console.error('Error loading players:', err);
    // Return empty array on error instead of throwing
    players = [];
  }
  
  // Load fantasy points
  let fantasyPoints = {};
  try {
    const { data } = await supabase
      .from('player_game_stats')
      .select('player_id, fantasy_points');
    
    if (data) {
      fantasyPoints = data.reduce((acc, stat) => {
        acc[stat.player_id] = (acc[stat.player_id] || 0) + stat.fantasy_points;
        return acc;
      }, {});
    }
  } catch (err) {
    console.error('Error loading fantasy points:', err);
  }
  
  return { 
    players, 
    fantasyPoints,
    searchTerm,
    positionFilter,
    sortBy
  };
}

// Leaderboard loader
export async function leaderboardLoader() {
  // Calculate current week
  const today = new Date();
  const seasonYear = today.getFullYear();
  const weekNumber = Math.floor((today.getTime() - new Date(seasonYear, 8, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  
  const { data, error } = await supabase
    .from('weekly_lineups')
    .select(`
      *,
      team:user_teams!inner(
        team_name,
        profile:users!inner(username)
      )
    `)
    .eq('week_number', weekNumber)
    .eq('season_year', seasonYear)
    .order('total_points', { ascending: false })
    .limit(100);
  
  if (error) {
    console.error('Error loading leaderboard:', error);
    return { leaderboard: [], weekNumber, seasonYear };
  }
  
  return { leaderboard: data || [], weekNumber, seasonYear };
}

// Inventory loader
export async function inventoryLoader() {
  try {
    const user = await requireAuth();
    
    const [profile, teams] = await Promise.all([
      loadUserProfile(user.id),
      getUserTeams(user.id)
    ]);
    
    const activeTeam = teams.find(t => t.is_active);
    
    if (!activeTeam) {
      return { user, profile, teams, activeTeam: null, inventory: { players: [], tokens: [] } };
    }
    
    const inventory = await getUserInventory(user.id, activeTeam.id);
    
    return { user, profile, teams, activeTeam, inventory };
  } catch (error) {
    // If it's already a redirect, re-throw it
    if (error instanceof Response) throw error;
    console.error('Inventory loader error:', error);
    return { user: null, profile: null, teams: [], activeTeam: null, inventory: { players: [], tokens: [] } };
  }
}
