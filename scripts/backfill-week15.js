/**
 * Backfill Player Game Stats for Week 15
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const BALLDONTLIE_API_KEY = process.env.BALLDONTLIE_API_KEY || process.env.VITE_BALLDONTLIE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BALLDONTLIE_API_KEY) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    if (response.ok) return response;
    if (response.status === 429) {
      console.log(`Rate limited, waiting ${Math.pow(2, i)}s...`);
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
      continue;
    }
    throw new Error(`HTTP ${response.status}`);
  }
}

function calculateFantasyPoints(stats) {
  let pts = 0;
  pts += (stats.passing_yards || 0) * 0.04;
  pts += (stats.passing_touchdowns || 0) * 4;
  pts += (stats.passing_interceptions || 0) * -2;
  pts += (stats.rushing_yards || 0) * 0.1;
  pts += (stats.rushing_touchdowns || 0) * 6;
  pts += (stats.receptions || 0) * 0.5;
  pts += (stats.receiving_yards || 0) * 0.1;
  pts += (stats.receiving_touchdowns || 0) * 6;
  pts += (stats.fumbles_lost || 0) * -2;
  pts += (stats.two_point_conversions || 0) * 2;
  return Math.round(pts * 10) / 10;
}

async function backfillWeek(weekNumber) {
  console.log(`\n🏈 Backfilling Week ${weekNumber} stats...`);
  
  const { data: games, error: gamesError } = await supabase
    .from('game_scores')
    .select('game_id, home_team, away_team')
    .eq('week_number', weekNumber)
    .eq('season_year', 2025);

  if (gamesError) {
    console.error('Error fetching games:', gamesError);
    return;
  }

  console.log(`Found ${games.length} games`);
  let totalStats = 0;

  for (const game of games) {
    console.log(`Processing ${game.away_team} @ ${game.home_team} (${game.game_id})...`);
    
    try {
      const response = await fetchWithRetry(
        `https://api.balldontlie.io/nfl/v1/stats?game_ids[]=${game.game_id}`,
        { headers: { 'Authorization': BALLDONTLIE_API_KEY } }
      );
      const data = await response.json();
      const stats = data.data || [];
      
      console.log(`  Found ${stats.length} player stats`);

      for (const stat of stats) {
        const { data: playerCard } = await supabase
          .from('player_cards')
          .select('id, player_name')
          .eq('player_id', stat.player.id.toString())
          .single();

        if (!playerCard) continue;

        const fantasyPoints = calculateFantasyPoints(stat);
        const statsObj = {
          passing_yards: stat.passing_yards || 0,
          passing_tds: stat.passing_touchdowns || 0,
          interceptions: stat.passing_interceptions || 0,
          rushing_yards: stat.rushing_yards || 0,
          rushing_tds: stat.rushing_touchdowns || 0,
          receptions: stat.receptions || 0,
          receiving_yards: stat.receiving_yards || 0,
          receiving_tds: stat.receiving_touchdowns || 0,
          fumbles_lost: stat.fumbles_lost || 0,
          two_point_conversions: stat.two_point_conversions || 0
        };

        const { error } = await supabase
          .from('player_game_stats')
          .upsert({
            game_id: game.game_id,
            player_card_id: playerCard.id,
            week_number: weekNumber,
            season_year: 2025,
            stats: statsObj,
            fantasy_points: fantasyPoints,
            last_updated: new Date().toISOString()
          }, { onConflict: 'game_id,player_card_id' });

        if (!error) {
          totalStats++;
          if (fantasyPoints > 0) {
            console.log(`    ${playerCard.player_name}: ${fantasyPoints} pts`);
          }
        }
      }

      // Rate limiting between games
      await new Promise(r => setTimeout(r, 500));

    } catch (error) {
      console.error(`  Error processing game ${game.game_id}:`, error.message);
    }
  }

  console.log(`\n✅ Week ${weekNumber} complete: ${totalStats} player stats inserted`);
}

// Run for Week 15
backfillWeek(15);
