import { supabase } from './supabase';

/**
 * Contest Service
 * Handles all public contest operations for public teams
 */

/**
 * Format win condition for display
 * @param {string} winCondition 
 * @returns {{label: string, description: string}}
 */
export function formatWinCondition(winCondition) {
  const conditions = {
    'median': {
      label: 'Beat Median',
      description: 'Score above the median to win'
    },
    'h2h': {
      label: 'Head-to-Head',
      description: 'Beat your opponent to win'
    },
    'top_points': {
      label: 'Top Points',
      description: 'Highest score wins'
    }
  };
  return conditions[winCondition] || { label: winCondition, description: '' };
}

/**
 * Get all available public contests for a specific week
 * @param {number|null} week - Week number (defaults to current NFL week)
 * @returns {Promise<{data: Array, week: number, error: Error|null}>}
 */
export async function getAvailableContests(week = null) {
  try {
    // Get current week/season
    const { data: config, error: configError } = await supabase
      .from('nfl_season_config')
      .select('current_week, season_year')
      .eq('is_active', true)
      .single();
    
    if (configError) throw configError;
    
    // Use provided week or default to current
    const targetWeek = week || config.current_week;
    
    // Get all contests for target week
    const { data, error } = await supabase
      .from('public_contests')
      .select(`
        *,
        template:public_contest_templates (
          icon,
          difficulty
        )
      `)
      .eq('week', targetWeek)
      .eq('season', config.season_year)
      .eq('status', 'open')
      .order('name');
    
    if (error) throw error;
    
    return { data, week: targetWeek, error: null };
  } catch (error) {
    console.error('Error fetching contests:', error);
    return { data: null, week: null, error };
  }
}

/**
 * Get all contests for current week including non-open ones
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function getAllContestsForWeek() {
  try {
    const { data: config, error: configError } = await supabase
      .from('nfl_season_config')
      .select('current_week, season_year')
      .eq('is_active', true)
      .single();
    
    if (configError) throw configError;
    
    const { data, error } = await supabase
      .from('public_contests')
      .select(`
        *,
        template:public_contest_templates (
          icon,
          difficulty
        )
      `)
      .eq('week', config.current_week)
      .eq('season', config.season_year)
      .order('name');
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching all contests:', error);
    return { data: null, error };
  }
}

/**
 * Get a single contest by ID with entries
 * @param {string} contestId 
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function getContestWithEntries(contestId) {
  try {
    const { data, error } = await supabase
      .from('public_contests')
      .select(`
        *,
        template:public_contest_templates (
          icon,
          difficulty
        ),
        entries:public_contest_entries (
          id,
          team_id,
          user_id,
          entered_at,
          final_score,
          beat_median,
          final_rank,
          team:teams (
            id,
            team_name,
            team_image_url
          )
        )
      `)
      .eq('id', contestId)
      .single();
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching contest:', error);
    return { data: null, error };
  }
}

/**
 * Get the team's current week contest entry if any
 * @param {string} teamId 
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getTeamContestEntry(teamId) {
  try {
    const { data, error } = await supabase
      .rpc('get_team_contest_entry', { p_team_id: teamId });
    
    if (error) throw error;
    
    // RPC returns an array, get first result
    return { data: data?.[0] || null, error: null };
  } catch (error) {
    console.error('Error fetching team contest entry:', error);
    return { data: null, error };
  }
}

/**
 * Get the team's contest entry status for a week
 * Returns info about how many contests they can enter based on lives
 * @param {string} teamId 
 * @param {number|null} week - Optional week number
 * @param {number|null} season - Optional season year
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getTeamContestEntryStatus(teamId, week = null, season = null) {
  try {
    const params = { p_team_id: teamId };
    if (week !== null) params.p_week = week;
    if (season !== null) params.p_season = season;
    
    const { data, error } = await supabase
      .rpc('get_team_contest_entry_status', params);
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching team contest entry status:', error);
    return { data: null, error };
  }
}

/**
 * Get all contest entries for a team for a specific week
 * @param {string} teamId 
 * @param {number|null} week - Optional week number (defaults to current NFL week)
 * @param {number|null} season - Optional season year
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function getTeamContestEntries(teamId, week = null, season = null) {
  try {
    // Get current week/season if not provided
    let targetWeek = week;
    let targetSeason = season;
    
    if (targetWeek === null || targetSeason === null) {
      const { data: config, error: configError } = await supabase
        .from('nfl_season_config')
        .select('current_week, season_year')
        .eq('is_active', true)
        .single();
      
      if (configError) throw configError;
      targetWeek = targetWeek ?? config.current_week;
      targetSeason = targetSeason ?? config.season_year;
    }
    
    // First get all entries for this team
    const { data: allEntries, error: entriesError } = await supabase
      .from('public_contest_entries')
      .select(`
        *,
        contest:public_contests (
          id,
          name,
          description,
          max_entries,
          current_entries,
          scoring_type,
          win_condition,
          status,
          week,
          season,
          entry_cost,
          coin_reward,
          template:public_contest_templates (
            icon,
            difficulty
          )
        )
      `)
      .eq('team_id', teamId);
    
    if (entriesError) throw entriesError;
    
    // Filter to only target week's contests
    const weekEntries = (allEntries || []).filter(entry => 
      entry.contest?.week === targetWeek && 
      entry.contest?.season === targetSeason
    );
    
    console.log('📋 getTeamContestEntries:', { 
      teamId, 
      week: targetWeek, 
      season: targetSeason,
      allEntriesCount: allEntries?.length || 0,
      weekEntriesCount: weekEntries.length,
      entries: weekEntries
    });
    
    return { data: weekEntries, error: null };
  } catch (error) {
    console.error('Error fetching team contest entries:', error);
    return { data: [], error };
  }
}

/**
 * Enter a team into a public contest
 * Users can enter as many contests as they have lives remaining
 * @param {string} contestId 
 * @param {string} teamId 
 * @returns {Promise<{success: boolean, error: string|null, entry_id: string|null, entries_this_week: number, lives_remaining: number, can_enter_more: boolean}>}
 */
export async function enterContest(contestId, teamId) {
  try {
    const { data, error } = await supabase
      .rpc('enter_public_contest', {
        p_contest_id: contestId,
        p_team_id: teamId
      });
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error entering contest:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get contest entries leaderboard
 * @param {string} contestId 
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function getContestLeaderboard(contestId) {
  try {
    const { data, error } = await supabase
      .from('public_contest_entries')
      .select(`
        *,
        team:teams!public_contest_entries_team_id_fkey (
          id,
          team_name,
          team_image_url,
          wins,
          losses
        )
      `)
      .eq('contest_id', contestId)
      .order('final_score', { ascending: false, nullsFirst: false })
      .order('entered_at', { ascending: true });
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return { data: null, error };
  }
}

/**
 * Get contest standings with live/projected points
 * @param {string} contestId 
 * @param {number} week 
 * @param {number} season 
 * @param {boolean} isUpcoming - Whether the contest week hasn't started
 * @returns {Promise<{data: Array, medianScore: number, error: Error|null}>}
 */
export async function getContestStandings(contestId, week, season, isUpcoming = false) {
  try {
    // Get all entries with team info - use explicit foreign key reference
    const { data: entries, error: entriesError } = await supabase
      .from('public_contest_entries')
      .select(`
        *,
        team:teams!public_contest_entries_team_id_fkey (
          id,
          team_name,
          team_image_url,
          wins,
          losses,
          user_id
        )
      `)
      .eq('contest_id', contestId)
      .order('entered_at', { ascending: true });
    
    if (entriesError) throw entriesError;
    if (!entries?.length) return { data: [], medianScore: 0, error: null };
    
    // Get scores for each team
    const teamIds = entries.map(e => e.team_id);
    const standings = [];
    
    if (isUpcoming) {
      // For upcoming contests, get projected points from user_player_inventory
      for (const entry of entries) {
        const { data: lineup } = await supabase
          .from('user_player_inventory')
          .select(`
            player_card:player_cards(
              weekly_projected_points,
              projected_points
            )
          `)
          .eq('team_id', entry.team_id)
          .eq('is_in_lineup', true);
        
        let projectedPoints = 0;
        if (lineup?.length) {
          projectedPoints = lineup.reduce((sum, player) => {
            const proj = player.player_card?.weekly_projected_points || 
                        player.player_card?.projected_points || 0;
            return sum + parseFloat(proj);
          }, 0);
        }
        
        standings.push({
          ...entry,
          score: parseFloat(projectedPoints.toFixed(1)),
          scoreType: 'projected',
          hasLineup: lineup?.length > 0
        });
      }
    } else {
      // For live/final contests, get scores from weekly_lineups
      const { data: lineups, error: lineupsError } = await supabase
        .from('weekly_lineups')
        .select('team_id, total_points, status, projected_points')
        .eq('week_number', week)
        .eq('season_year', season)
        .in('team_id', teamIds);
      
      if (lineupsError) throw lineupsError;
      
      const lineupMap = new Map(lineups?.map(l => [l.team_id, l]) || []);
      
      for (const entry of entries) {
        const lineup = lineupMap.get(entry.team_id);
        const isFinal = lineup?.status === 'completed';
        
        standings.push({
          ...entry,
          score: parseFloat(lineup?.total_points || entry.final_score || 0),
          scoreType: isFinal ? 'final' : 'live',
          hasLineup: !!lineup
        });
      }
    }
    
    // Sort by score descending
    standings.sort((a, b) => b.score - a.score);
    
    // Assign ranks
    standings.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    // Calculate median from scores
    const scores = standings.map(s => s.score).filter(s => s > 0);
    let medianScore = 0;
    if (scores.length > 0) {
      const sorted = [...scores].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      medianScore = sorted.length % 2 === 0 
        ? (sorted[mid - 1] + sorted[mid]) / 2 
        : sorted[mid];
    }
    
    return { data: standings, medianScore, error: null };
  } catch (error) {
    console.error('Error fetching contest standings:', error);
    return { data: null, medianScore: 0, error };
  }
}

/**
 * Format scoring type for display
 * @param {string} scoringType 
 * @returns {string}
 */
export function formatScoringType(scoringType) {
  const formats = {
    'standard': 'Standard',
    'half_ppr': 'Half PPR',
    'full_ppr': 'Full PPR'
  };
  return formats[scoringType] || scoringType;
}

/**
 * Format elimination type for display
 * @param {string} eliminationType 
 * @param {number} maxLosses 
 * @returns {string}
 */
export function formatEliminationType(eliminationType, maxLosses) {
  switch (eliminationType) {
    case 'none':
      return 'No Elimination';
    case 'survivor':
      return 'Survivor (1 Life)';
    case 'strike':
      return `Strike (${maxLosses} ${maxLosses === 1 ? 'Life' : 'Lives'})`;
    default:
      return eliminationType;
  }
}

/**
 * Get difficulty color class
 * @param {string} difficulty 
 * @returns {string}
 */
export function getDifficultyColor(difficulty) {
  const colors = {
    'easy': 'text-green-400',
    'normal': 'text-primary-green-500',
    'hard': 'text-orange-400',
    'extreme': 'text-red-500'
  };
  return colors[difficulty] || 'text-primary-black-400';
}

/**
 * Get difficulty badge styles
 * @param {string} difficulty 
 * @returns {string}
 */
export function getDifficultyBadgeStyles(difficulty) {
  const styles = {
    'easy': 'bg-green-500/20 text-green-400 border-green-500/30',
    'normal': 'bg-primary-green-500/20 text-primary-green-500 border-primary-green-500/30',
    'hard': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'extreme': 'bg-red-500/20 text-red-500 border-red-500/30'
  };
  return styles[difficulty] || 'bg-primary-black-700 text-primary-black-400';
}
