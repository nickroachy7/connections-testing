import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * PRODUCTION-GRADE RARITY SYSTEM
 * 
 * Target Distribution (per GAMEPLAY.md):
 * - Legendary: 2-3% of pulls (best players)
 * - Epic: 8-10% of pulls (star players)
 * - Rare: 20-25% of pulls (solid starters)
 * - Common: 50-55% of pulls (average players)
 * - Trash: 10-15% of pulls (backups/injured)
 * 
 * Key insight: We separate DISPLAY value from PACK WEIGHT
 * - rarity_tier: For UI display and visual effects
 * - pack_weight: Actual probability weight (higher = more likely)
 * - pull_percentage: Legacy display value (kept for backward compatibility)
 */

interface RarityResult {
  rarity_tier: 'legendary' | 'epic' | 'rare' | 'common' | 'trash';
  pack_weight: number;
  display_percentage: number;
}

// Position-specific PPG thresholds based on fantasy scoring patterns
const POSITION_THRESHOLDS: Record<string, { legendary: number; epic: number; rare: number; common: number }> = {
  'Quarterback': { legendary: 24, epic: 20, rare: 16, common: 10 },
  'Running Back': { legendary: 18, epic: 14, rare: 10, common: 6 },
  'Wide Receiver': { legendary: 16, epic: 12, rare: 8, common: 4 },
  'Tight End': { legendary: 14, epic: 10, rare: 6, common: 3 },
};

// Pack weights calibrated to achieve target distribution
// These are PER-PLAYER weights - need to account for player pool sizes
// Pool sizes (approximate): legendary=11, epic=24, rare=58, common=85, trash=216
// To hit targets, we need to boost rarer tiers and reduce trash weight
const TIER_WEIGHTS: Record<string, { weight: number; displayPct: number }> = {
  legendary: { weight: 25, displayPct: 2 },     // ~2-3% target (11 players × 25 = 275)
  epic: { weight: 35, displayPct: 8 },          // ~8-10% target (24 players × 35 = 840)
  rare: { weight: 40, displayPct: 22 },         // ~20-25% target (58 players × 40 = 2320)
  common: { weight: 50, displayPct: 55 },       // ~50-55% target (85 players × 50 = 4250)
  trash: { weight: 5, displayPct: 85 },         // ~10-15% target (216 players × 5 = 1080)
};

/**
 * Calculate player rarity based on performance metrics
 * Returns tier, pack weight, and display percentage
 */
function calculatePlayerRarity(
  position: string,
  seasonPPG: number,
  gamesPlayed: number,
  injuryStatus: string | null
): RarityResult {
  const statusLower = (injuryStatus || '').toLowerCase();
  
  // TRASH TIER: Injured/IR/Suspended players
  if (['out', 'ir', 'suspended', 'pup'].some(s => statusLower.includes(s))) {
    return {
      rarity_tier: 'trash',
      pack_weight: TIER_WEIGHTS.trash.weight,
      display_percentage: 95, // High % = low quality display
    };
  }
  
  // TRASH TIER: No games played = unknown quantity
  if (gamesPlayed === 0) {
    return {
      rarity_tier: 'trash',
      pack_weight: TIER_WEIGHTS.trash.weight,
      display_percentage: 90,
    };
  }
  
  const thresholds = POSITION_THRESHOLDS[position] || POSITION_THRESHOLDS['Wide Receiver'];
  
  // Determine base tier from PPG
  let tier: 'legendary' | 'epic' | 'rare' | 'common' | 'trash';
  let displayPct: number;
  
  if (seasonPPG >= thresholds.legendary) {
    tier = 'legendary';
    // Scale within tier: higher PPG = lower display % (rarer looking)
    displayPct = Math.max(1, 5 - ((seasonPPG - thresholds.legendary) / 5));
  } else if (seasonPPG >= thresholds.epic) {
    tier = 'epic';
    displayPct = 5 + ((thresholds.legendary - seasonPPG) / (thresholds.legendary - thresholds.epic)) * 10;
  } else if (seasonPPG >= thresholds.rare) {
    tier = 'rare';
    displayPct = 15 + ((thresholds.epic - seasonPPG) / (thresholds.epic - thresholds.rare)) * 20;
  } else if (seasonPPG >= thresholds.common) {
    tier = 'common';
    displayPct = 35 + ((thresholds.rare - seasonPPG) / (thresholds.rare - thresholds.common)) * 30;
  } else {
    tier = 'trash';
    displayPct = 70 + Math.min(25, (thresholds.common - seasonPPG) * 5);
  }
  
  // Apply penalties that can DOWNGRADE a tier
  let weight = TIER_WEIGHTS[tier].weight;
  
  // Low games played penalty - reduces reliability
  if (gamesPlayed < 4 && gamesPlayed > 0) {
    weight = weight * 0.7; // 30% weight reduction
    displayPct = Math.min(95, displayPct * 1.2); // Display looks worse
  }
  
  // Questionable/Doubtful injury penalty
  if (['questionable', 'doubtful'].some(s => statusLower.includes(s))) {
    weight = weight * 0.8; // 20% weight reduction
    displayPct = Math.min(95, displayPct * 1.15);
  }
  
  return {
    rarity_tier: tier,
    pack_weight: Math.round(weight * 100) / 100,
    display_percentage: Math.round(Math.min(99, Math.max(1, displayPct)) * 10) / 10,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('🎯 Starting production-grade rarity calculation...');

    // Get all active players with their current stats
    const { data: players, error: playersError } = await supabase
      .from('player_cards')
      .select('id, player_name, position, season_ppg, games_played_season, injury_status')
      .eq('is_active', true)
      .in('position', ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End']);

    if (playersError) throw playersError;

    console.log(`📊 Processing ${players.length} active skill position players`);

    let updated = 0;
    const distribution: Record<string, { count: number; totalWeight: number; avgPPG: number; players: string[] }> = {
      legendary: { count: 0, totalWeight: 0, avgPPG: 0, players: [] },
      epic: { count: 0, totalWeight: 0, avgPPG: 0, players: [] },
      rare: { count: 0, totalWeight: 0, avgPPG: 0, players: [] },
      common: { count: 0, totalWeight: 0, avgPPG: 0, players: [] },
      trash: { count: 0, totalWeight: 0, avgPPG: 0, players: [] },
    };

    // Calculate rarity for each player
    for (const player of players) {
      const rarity = calculatePlayerRarity(
        player.position,
        player.season_ppg || 0,
        player.games_played_season || 0,
        player.injury_status
      );

      // Track distribution
      distribution[rarity.rarity_tier].count++;
      distribution[rarity.rarity_tier].totalWeight += rarity.pack_weight;
      distribution[rarity.rarity_tier].avgPPG += player.season_ppg || 0;
      if (rarity.rarity_tier === 'legendary') {
        distribution[rarity.rarity_tier].players.push(player.player_name);
      }

      // Update player with all rarity fields
      const { error: updateError } = await supabase
        .from('player_cards')
        .update({
          rarity_tier: rarity.rarity_tier,
          pack_weight: rarity.pack_weight,
          pull_percentage: rarity.display_percentage, // Keep for backward compatibility
          last_updated: new Date().toISOString(),
        })
        .eq('id', player.id);

      if (updateError) {
        console.error(`Error updating player ${player.id}:`, updateError);
      } else {
        updated++;
      }
    }

    // Calculate actual pull probabilities
    const totalWeight = Object.values(distribution).reduce((sum, d) => sum + d.totalWeight, 0);
    const pullProbabilities: Record<string, string> = {};
    
    for (const [tier, data] of Object.entries(distribution)) {
      if (data.count > 0) {
        data.avgPPG = Math.round((data.avgPPG / data.count) * 100) / 100;
      }
      pullProbabilities[tier] = `${Math.round((data.totalWeight / totalWeight) * 1000) / 10}%`;
    }

    console.log('✅ Rarity calculation complete');
    console.log('📈 Distribution:', distribution);
    console.log('🎲 Actual Pull Probabilities:', pullProbabilities);
    console.log('⭐ Legendary Players:', distribution.legendary.players);

    return new Response(JSON.stringify({
      success: true,
      message: `Updated rarity for ${updated} players`,
      total_players: players.length,
      players_updated: updated,
      distribution: {
        legendary: { count: distribution.legendary.count, pull_probability: pullProbabilities.legendary, avg_ppg: distribution.legendary.avgPPG, sample_players: distribution.legendary.players.slice(0, 5) },
        epic: { count: distribution.epic.count, pull_probability: pullProbabilities.epic, avg_ppg: distribution.epic.avgPPG },
        rare: { count: distribution.rare.count, pull_probability: pullProbabilities.rare, avg_ppg: distribution.rare.avgPPG },
        common: { count: distribution.common.count, pull_probability: pullProbabilities.common, avg_ppg: distribution.common.avgPPG },
        trash: { count: distribution.trash.count, pull_probability: pullProbabilities.trash, avg_ppg: distribution.trash.avgPPG },
      },
      target_vs_actual: {
        legendary: { target: '2-3%', actual: pullProbabilities.legendary },
        epic: { target: '8-10%', actual: pullProbabilities.epic },
        rare: { target: '20-25%', actual: pullProbabilities.rare },
        common: { target: '50-55%', actual: pullProbabilities.common },
        trash: { target: '10-15%', actual: pullProbabilities.trash },
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
