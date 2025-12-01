/**
 * Backfill Player Game Stats for Weeks 1-9
 * 
 * This script fetches historical NFL player stats from BallDontLie API
 * and populates the player_game_stats table for weeks 1-9 of the 2025 season.
 * 
 * Usage: node scripts/backfill-player-stats.js
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const BALLDONTLIE_API_KEY = process.env.BALLDONTLIE_API_KEY || process.env.VITE_BALLDONTLIE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

if (!BALLDONTLIE_API_KEY) {
  console.error('❌ Missing BALLDONTLIE_API_KEY or VITE_BALLDONTLIE_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SEASON_YEAR = 2025;
const WEEKS_TO_BACKFILL = [1, 2, 3, 4, 5, 6, 7, 8, 9];

async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status === 429) {
        const waitTime = Math.pow(2, i) * 1000;
        console.log(`⏳ Rate limited, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

function calculateFantasyPoints(stats) {
  if (!stats) return 0;

  let points = 0;

  // Passing
  points += (stats.passing_yards || 0) * 0.04; // 1 point per 25 yards
  points += (stats.passing_touchdowns || 0) * 4;
  points += (stats.passing_interceptions || 0) * -2;

  // Rushing
  points += (stats.rushing_yards || 0) * 0.1; // 1 point per 10 yards
  points += (stats.rushing_touchdowns || 0) * 6;

  // Receiving (Half PPR)
  points += (stats.receptions || 0) * 0.5; // Half PPR
  points += (stats.receiving_yards || 0) * 0.1; // 1 point per 10 yards
  points += (stats.receiving_touchdowns || 0) * 6;

  // Fumbles
  points += (stats.fumbles_lost || 0) * -2;

  // 2-point conversions
  points += (stats.two_point_conversions || 0) * 2;

  return Math.round(points * 10) / 10; // Round to 1 decimal
}

async function backfillWeek(weekNumber) {
  console.log(`\n📅 Fetching stats for Week ${weekNumber}...`);
  
  try {
    // Get all games for this week
    const { data: games, error: gamesError } = await supabase
      .from('game_scores')
      .select('game_id, home_team, away_team')
      .eq('week_number', weekNumber)
      .eq('season_year', SEASON_YEAR);

    if (gamesError) throw gamesError;

    console.log(`   Found ${games.length} games`);

    let totalStats = 0;

    // Fetch stats for each game
    for (const game of games) {
      try {
        const response = await fetchWithRetry(
          `https://api.balldontlie.io/nfl/v1/stats?game_ids[]=${game.game_id}`,
          {
            headers: {
              'Authorization': BALLDONTLIE_API_KEY
            }
          }
        );

        const data = await response.json();
        const stats = data.data || [];

        // Process each stat for this game
        for (const stat of stats) {
          // Find matching player card
          const { data: playerCard } = await supabase
            .from('player_cards')
            .select('id')
            .eq('player_id', stat.player.id.toString())
            .single();

          if (!playerCard) continue;

          const fantasyPoints = calculateFantasyPoints(stat);

          // Insert into player_game_stats
          const { error: insertError } = await supabase
            .from('player_game_stats')
            .upsert({
              game_id: game.game_id,
              player_card_id: playerCard.id,
              week_number: weekNumber,
              season_year: SEASON_YEAR,
              stats: stat,
              fantasy_points: fantasyPoints,
              last_updated: new Date().toISOString()
            }, { 
              onConflict: 'game_id,player_card_id',
              ignoreDuplicates: false 
            });

          if (!insertError) {
            totalStats++;
          }
        }

        // Rate limiting between games
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`     ⚠️  Error processing game ${game.game_id}:`, error.message);
        continue;
      }
    }

    console.log(`   ✅ Week ${weekNumber}: ${totalStats} player stats inserted`);
    return { week: weekNumber, stats: totalStats };

  } catch (error) {
    console.error(`   ❌ Error fetching Week ${weekNumber}:`, error.message);
    return { week: weekNumber, stats: 0, error: error.message };
  }
}

async function main() {
  console.log('🏈 Starting Player Stats Backfill for Weeks 1-9');
  console.log('='.repeat(50));
  console.log('⚠️  This may take several minutes due to API rate limits');
  console.log('='.repeat(50));

  const results = [];

  for (const week of WEEKS_TO_BACKFILL) {
    const result = await backfillWeek(week);
    results.push(result);
    
    // Rate limiting: wait 2 seconds between weeks
    if (week !== WEEKS_TO_BACKFILL[WEEKS_TO_BACKFILL.length - 1]) {
      console.log('\n⏳ Waiting 2s before next week...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Backfill Summary:');
  console.log('='.repeat(50));
  
  let totalStats = 0;
  let errors = 0;
  
  results.forEach(r => {
    if (r.error) {
      console.log(`Week ${r.week}: ❌ ERROR - ${r.error}`);
      errors++;
    } else {
      console.log(`Week ${r.week}: ✅ ${r.stats} player stats`);
      totalStats += r.stats;
    }
  });

  console.log('='.repeat(50));
  console.log(`✅ Total stats inserted: ${totalStats}`);
  console.log(`❌ Errors: ${errors}`);
  console.log('\n🎉 Backfill complete!');
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
