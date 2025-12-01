/**
 * Backfill Game Scores for Weeks 1-8
 * 
 * This script fetches historical NFL game data from BallDontLie API
 * and populates the game_scores table for weeks 1-8 of the 2025 season.
 * 
 * Usage: node scripts/backfill-game-scores.js
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
  console.log('Please add BALLDONTLIE_API_KEY to your .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SEASON_YEAR = 2025;
const WEEKS_TO_BACKFILL = [1, 2, 3, 4, 5, 6, 7, 8];

async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status === 429) {
        // Rate limited, wait and retry
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

async function backfillWeek(weekNumber) {
  console.log(`\n📅 Fetching games for Week ${weekNumber}...`);
  
  try {
    const response = await fetchWithRetry(
      `https://api.balldontlie.io/nfl/v1/games?seasons[]=${SEASON_YEAR}&weeks[]=${weekNumber}`,
      {
        headers: {
          'Authorization': BALLDONTLIE_API_KEY
        }
      }
    );

    const data = await response.json();
    const games = data.data || [];
    
    console.log(`   Found ${games.length} games`);

    let inserted = 0;
    let updated = 0;

    for (const game of games) {
      // Determine game status
      let gameStatus = 'final'; // Historical games are all final
      const statusLower = (game.status || '').toLowerCase();
      
      if (statusLower === 'final' || statusLower.includes('final')) {
        gameStatus = 'final';
      } else if (game.home_team_score > 0 || game.visitor_team_score > 0) {
        // Has scores, assume final for historical data
        gameStatus = 'final';
      }

      const gameData = {
        game_id: game.id.toString(),
        week_number: weekNumber,
        season_year: SEASON_YEAR,
        home_team: game.home_team.abbreviation,
        away_team: game.visitor_team.abbreviation,
        game_status: gameStatus,
        game_start_time: game.date || game.datetime || new Date().toISOString(),
        home_score: game.home_team_score || 0,
        away_score: game.visitor_team_score || 0,
        quarter: 4, // Finished games
        time_remaining: 'Final',
        last_updated: new Date().toISOString()
      };

      const { error } = await supabase
        .from('game_scores')
        .upsert(gameData, { onConflict: 'game_id' });

      if (error) {
        console.error(`   ❌ Error inserting game ${game.id}:`, error.message);
      } else {
        inserted++;
      }
    }

    console.log(`   ✅ Week ${weekNumber}: ${inserted} games inserted/updated`);
    return { week: weekNumber, games: inserted };

  } catch (error) {
    console.error(`   ❌ Error fetching Week ${weekNumber}:`, error.message);
    return { week: weekNumber, games: 0, error: error.message };
  }
}

async function main() {
  console.log('🏈 Starting Game Scores Backfill for Weeks 1-8');
  console.log('='.repeat(50));

  const results = [];

  for (const week of WEEKS_TO_BACKFILL) {
    const result = await backfillWeek(week);
    results.push(result);
    
    // Rate limiting: wait 1 second between weeks
    if (week !== WEEKS_TO_BACKFILL[WEEKS_TO_BACKFILL.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Backfill Summary:');
  console.log('='.repeat(50));
  
  let totalGames = 0;
  let errors = 0;
  
  results.forEach(r => {
    if (r.error) {
      console.log(`Week ${r.week}: ❌ ERROR - ${r.error}`);
      errors++;
    } else {
      console.log(`Week ${r.week}: ✅ ${r.games} games`);
      totalGames += r.games;
    }
  });

  console.log('='.repeat(50));
  console.log(`✅ Total games inserted: ${totalGames}`);
  console.log(`❌ Errors: ${errors}`);
  console.log('\n🎉 Backfill complete!');
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
