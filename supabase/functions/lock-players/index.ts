import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * LOCK PLAYERS
 * 
 * Purpose: Lock players into users' lineups when their game starts.
 * 
 * Responsibilities:
 * 1. Check for games starting within next 2 minutes
 * 2. Lock ALL players (lineup + bench) from teams with games starting
 * 3. Create lineup snapshots if they don't exist yet
 * 
 * Scheduled: Every 5 minutes on game days (Thu/Sun/Mon)
 * 
 * Note: We lock entire rosters (lineup + bench) to prevent mid-game swaps
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current NFL week and season
    const { data: weekConfig, error: weekError } = await supabase
      .rpc('get_current_nfl_week')
    
    if (weekError || !weekConfig || weekConfig.length === 0) {
      throw new Error('Failed to get current NFL week from config')
    }
    
    const { season_year: seasonYear, week_number: weekNumber } = weekConfig[0]

    console.log(`🔒 Checking for players to lock in Week ${weekNumber}, ${seasonYear}`)

    // Get games starting within 2 minutes (provides buffer for timing)
    const now = new Date()
    const twoMinutesFromNow = new Date(now.getTime() + 2 * 60 * 1000)

    const { data: upcomingGames, error: gamesError } = await supabase
      .from('game_scores')
      .select('*')
      .eq('week_number', weekNumber)
      .eq('season_year', seasonYear)
      .lte('game_start_time', twoMinutesFromNow.toISOString())

    if (gamesError) {
      throw new Error(`Error fetching games: ${gamesError.message}`)
    }

    if (!upcomingGames || upcomingGames.length === 0) {
      console.log('⏰ No games starting right now')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No games starting - players remain unlocked',
          locked_players: 0,
          snapshots_created: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`Found ${upcomingGames.length} game(s) starting soon:`)
    upcomingGames.forEach((game: any) => {
      console.log(`  - ${game.away_team} @ ${game.home_team} at ${game.game_start_time}`)
    })

    // Get all teams involved in these games
    const teams = new Set<string>()
    upcomingGames.forEach((game: any) => {
      teams.add(game.home_team)
      teams.add(game.away_team)
    })

    console.log(`Teams with games starting: ${Array.from(teams).join(', ')}`)

    // Get player_card IDs for these teams
    const { data: playerCards, error: playerCardsError } = await supabase
      .from('player_cards')
      .select('id')
      .in('team_abbreviation', Array.from(teams))

    if (playerCardsError) {
      throw new Error(`Error fetching player cards: ${playerCardsError.message}`)
    }

    const playerCardIds = playerCards?.map(pc => pc.id) || []
    console.log(`Found ${playerCardIds.length} player cards to lock`)

    if (playerCardIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No players found for these teams',
          locked_players: 0,
          snapshots_created: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Lock ALL players from these teams (lineup AND bench)
    // Query first to count, then update
    const { data: playersToLock } = await supabase
      .from('user_player_inventory')
      .select('id')
      .eq('is_locked', false)
      .in('player_card_id', playerCardIds)

    let lockedCount = 0
    if (playersToLock && playersToLock.length > 0) {
      const playerIds = playersToLock.map((p: any) => p.id)
      
      const { error: lockError } = await supabase
        .from('user_player_inventory')
        .update({ is_locked: true })
        .in('id', playerIds)

      if (lockError) {
        throw new Error(`Error locking players: ${lockError.message}`)
      }

      lockedCount = playersToLock.length
      console.log(`🔒 Locked ${lockedCount} players (lineup + bench)`)
    }

    // Create lineup snapshots for teams that don't have one yet
    const { data: activeTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('is_active', true)

    const teamIds = (activeTeams || []).map((t: any) => t.id)
    
    // Batch check for existing snapshots
    const { data: existingSnapshots } = await supabase
      .from('weekly_lineups')
      .select('team_id')
      .in('team_id', teamIds)
      .eq('week_number', weekNumber)
      .eq('season_year', seasonYear)

    const existingTeamIds = new Set(existingSnapshots?.map((s: any) => s.team_id) || [])
    
    let snapshotsCreated = 0

    for (const team of activeTeams || []) {
      if (existingTeamIds.has(team.id)) continue

      // Get current lineup
      const { data: lineup } = await supabase
        .from('user_player_inventory')
        .select(`
          lineup_position,
          player_card_id,
          card_tier,
          card_level,
          player_card:player_cards!inner(
            player_name,
            position,
            team_abbreviation
          )
        `)
        .eq('team_id', team.id)
        .eq('is_in_lineup', true)

      if (!lineup || lineup.length === 0) continue

      // Build lineup snapshot
      const lineupSnapshot: Record<string, any> = {}
      lineup.forEach((player: any) => {
        if (player.lineup_position) {
          lineupSnapshot[player.lineup_position] = {
            player_card_id: player.player_card_id,
            player_name: player.player_card.player_name,
            position: player.player_card.position,
            team: player.player_card.team_abbreviation,
            card_tier: player.card_tier,
            card_level: player.card_level,
            tokens: [],
            token_names: [],
            base_points: 0,
            token_bonus: 0,
            total_points: 0
          }
        }
      })

      // Create snapshot with 'pending' status
      const { error: insertError } = await supabase
        .from('weekly_lineups')
        .insert({
          team_id: team.id,
          week_number: weekNumber,
          season_year: seasonYear,
          lineup_snapshot: lineupSnapshot,
          total_points: 0,
          status: 'pending'
        })

      if (!insertError) {
        snapshotsCreated++
        console.log(`📸 Created snapshot for team ${team.id}`)
      }
    }

    console.log(`✅ Locked ${lockedCount} players, created ${snapshotsCreated} snapshots`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Locked ${lockedCount} players and created ${snapshotsCreated} lineup snapshots`,
        locked_players: lockedCount,
        snapshots_created: snapshotsCreated,
        games_starting: upcomingGames.length,
        teams_affected: Array.from(teams)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in lock-players:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
