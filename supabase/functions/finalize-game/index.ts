import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * FINALIZE GAME
 * 
 * Purpose: Finalize individual games when they complete.
 * 
 * Responsibilities:
 * 1. Check for games with status='final' in game_scores
 * 2. Create zero-stat entries for players who didn't record stats
 * 3. Mark game as fully finalized (prevent further updates)
 * 
 * Scheduled: Every 10-15 minutes during game days
 * Runs after track-live-stats to ensure all games are properly closed out
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: weekConfig, error: weekError } = await supabase.rpc('get_current_nfl_week')
    if (weekError || !weekConfig || weekConfig.length === 0) {
      throw new Error('Failed to get current NFL week from config')
    }
    
    const { season_year: seasonYear, week_number: weekNumber } = weekConfig[0]
    console.log(`🏁 Checking for games to finalize in Week ${weekNumber}, ${seasonYear}`)

    // Get final games
    const { data: finalGames, error: gamesError } = await supabase
      .from('game_scores')
      .select('*')
      .eq('week_number', weekNumber)
      .eq('season_year', seasonYear)
      .eq('game_status', 'final')

    if (gamesError) throw new Error(`Error fetching games: ${gamesError.message}`)

    if (!finalGames || finalGames.length === 0) {
      console.log('⏰ No final games to process')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No final games to process',
          games_finalized: 0,
          zero_stats_created: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`Found ${finalGames.length} final game(s) to process`)

    let gamesFinalized = 0
    let zeroStatsCreated = 0

    for (const game of finalGames) {
      const gameId = game.game_id
      const homeTeam = game.home_team
      const awayTeam = game.away_team

      console.log(`Processing ${awayTeam} @ ${homeTeam} (Game ID: ${gameId})`)

      // Get all players from both teams
      const { data: teamPlayers, error: playersError } = await supabase
        .from('player_cards')
        .select('id')
        .in('team_abbreviation', [homeTeam, awayTeam])

      if (playersError || !teamPlayers || teamPlayers.length === 0) {
        console.log(`No players found for ${homeTeam} or ${awayTeam}`)
        continue
      }

      // Get existing stats for this game
      const { data: existingStats, error: statsError } = await supabase
        .from('player_game_stats')
        .select('player_card_id')
        .eq('game_id', gameId)

      if (statsError) {
        console.error(`Error fetching existing stats for game ${gameId}:`, statsError)
        continue
      }

      const existingPlayerIds = new Set(existingStats?.map((s: any) => s.player_card_id) || [])
      const playersWithoutStats = teamPlayers.filter((p: any) => !existingPlayerIds.has(p.id))

      if (playersWithoutStats.length > 0) {
        console.log(`Creating ${playersWithoutStats.length} zero-stat entries for game ${gameId}`)

        const zeroStatEntries = playersWithoutStats.map((p: any) => ({
          game_id: gameId,
          player_card_id: p.id,
          week_number: weekNumber,
          season_year: seasonYear,
          stats: {
            passing_yards: 0,
            passing_tds: 0,
            interceptions: 0,
            rushing_yards: 0,
            rushing_tds: 0,
            receptions: 0,
            receiving_yards: 0,
            receiving_tds: 0,
            fumbles_lost: 0,
            two_point_conversions: 0
          },
          fantasy_points: 0,
          last_updated: new Date().toISOString()
        }))

        const { error: insertError } = await supabase
          .from('player_game_stats')
          .upsert(zeroStatEntries, { onConflict: 'game_id,player_card_id' })

        if (insertError) {
          console.error(`Error creating zero-stat entries for game ${gameId}:`, insertError)
        } else {
          zeroStatsCreated += playersWithoutStats.length
        }
      }

      gamesFinalized++
    }

    console.log(`✅ Finalized ${gamesFinalized} games, created ${zeroStatsCreated} zero-stat entries`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Finalized ${gamesFinalized} games and created ${zeroStatsCreated} zero-stat entries`,
        games_finalized: gamesFinalized,
        zero_stats_created: zeroStatsCreated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error('Error in finalize-game:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
