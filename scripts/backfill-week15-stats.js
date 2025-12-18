import { BalldontlieAPI } from "@balldontlie/sdk";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const api = new BalldontlieAPI({ apiKey: process.env.VITE_BALLDONTLIE_API_KEY });
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const SEASON = 2025;
const WEEK = 15;

// Half PPR scoring
const BASE_SCORING = {
  passing_yards: 0.04,
  passing_tds: 4,
  interceptions: -2,
  rushing_yards: 0.1,
  rushing_tds: 6,
  receiving_yards: 0.1,
  receiving_tds: 6,
  fumbles_lost: -2,
  two_point_conversions: 2,
};

function calculateFantasyPoints(stats, pprValue = 0.5) {
  let points = 0;
  points += (stats.passing_yards || 0) * BASE_SCORING.passing_yards;
  points += (stats.passing_tds || 0) * BASE_SCORING.passing_tds;
  points += (stats.interceptions || 0) * BASE_SCORING.interceptions;
  points += (stats.rushing_yards || 0) * BASE_SCORING.rushing_yards;
  points += (stats.rushing_tds || 0) * BASE_SCORING.rushing_tds;
  points += (stats.receiving_yards || 0) * BASE_SCORING.receiving_yards;
  points += (stats.receiving_tds || 0) * BASE_SCORING.receiving_tds;
  points += (stats.fumbles_lost || 0) * BASE_SCORING.fumbles_lost;
  points += (stats.two_point_conversions || 0) * BASE_SCORING.two_point_conversions;
  points += (stats.receptions || 0) * pprValue;
  return Math.round(points * 10) / 10;
}

async function backfillWeek15() {
  console.log(`\n🏈 Backfilling Week ${WEEK} stats for season ${SEASON}...`);

  // Get all games for Week 15
  console.log("Fetching games from API...");
  const gamesResponse = await api.nfl.getGames({
    seasons: [SEASON],
    weeks: [WEEK],
  });
  
  const games = gamesResponse.data || [];
  console.log(`Found ${games.length} games for Week ${WEEK}`);

  if (games.length === 0) {
    console.log("No games found!");
    return;
  }

  // Get all player cards from database (for mapping)
  const { data: playerCards } = await supabase
    .from("player_cards")
    .select("id, player_id, player_name");
  
  const playerIdMap = new Map();
  for (const card of playerCards || []) {
    playerIdMap.set(card.player_id, card.id);
  }
  console.log(`Loaded ${playerIdMap.size} player cards for mapping`);

  let totalStatsInserted = 0;
  let gamesProcessed = 0;

  for (const game of games) {
    const gameId = game.id.toString();
    console.log(`\nProcessing game ${gameId}: ${game.visitor_team?.abbreviation || 'AWAY'} @ ${game.home_team?.abbreviation || 'HOME'}`);

    // Fetch stats for this game
    try {
      const statsResponse = await api.nfl.getStats({
        game_ids: [game.id],
      });

      const stats = statsResponse.data || [];
      console.log(`  Found ${stats.length} player stat lines`);

      for (const stat of stats) {
        const playerId = stat.player?.id?.toString();
        if (!playerId) continue;

        const playerCardId = playerIdMap.get(playerId);
        if (!playerCardId) {
          // Player not in our database, skip
          continue;
        }

        const playerStats = {
          passing_yards: stat.passing_yards || 0,
          passing_tds: stat.passing_touchdowns || 0,
          interceptions: stat.passing_interceptions || 0,
          rushing_yards: stat.rushing_yards || 0,
          rushing_tds: stat.rushing_touchdowns || 0,
          receptions: stat.receptions || 0,
          receiving_yards: stat.receiving_yards || 0,
          receiving_tds: stat.receiving_touchdowns || 0,
          fumbles_lost: stat.fumbles_lost || 0,
          two_point_conversions: stat.two_point_conversions || 0,
        };

        const fantasyPoints = calculateFantasyPoints(playerStats);

        // Upsert the stat
        const { error } = await supabase
          .from("player_game_stats")
          .upsert(
            {
              game_id: gameId,
              player_card_id: playerCardId,
              week_number: WEEK,
              season_year: SEASON,
              stats: playerStats,
              fantasy_points: fantasyPoints,
              last_updated: new Date().toISOString(),
            },
            { onConflict: "game_id,player_card_id" }
          );

        if (error) {
          console.error(`  Error inserting stat for player ${playerId}:`, error.message);
        } else {
          totalStatsInserted++;
        }
      }

      gamesProcessed++;
    } catch (err) {
      console.error(`  Error fetching stats for game ${gameId}:`, err.message);
    }

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n✅ Backfill complete!`);
  console.log(`   Games processed: ${gamesProcessed}/${games.length}`);
  console.log(`   Player stats inserted: ${totalStatsInserted}`);

  // Verify the data
  const { data: weekStats, error: countError } = await supabase
    .from("player_game_stats")
    .select("id", { count: "exact" })
    .eq("week_number", WEEK)
    .eq("season_year", SEASON);

  console.log(`   Total Week ${WEEK} stats in DB: ${weekStats?.length || 0}`);
}

backfillWeek15().catch(console.error);
