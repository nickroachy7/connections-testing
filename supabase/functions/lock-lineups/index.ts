import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current NFL week and season from config table
    const { data: weekConfig, error: weekError } = await supabase
      .rpc('get_current_nfl_week')
    
    if (weekError || !weekConfig || weekConfig.length === 0) {
      throw new Error('Failed to get current NFL week from config')
    }
    
    const { season_year: seasonYear, week_number: weekNumber } = weekConfig[0]

    console.log(`Checking for games to lock in Week ${weekNumber}, ${seasonYear}`)

    // Get games that have started or are starting within 2 minutes
    // This locks players right when their game starts, with a small buffer for timing
    const now = new Date()
    const twoMinutesFromNow = new Date(now.getTime() + 2 * 60 * 1000)

    console.log(`Current time: ${now.toISOString()}`)
    console.log(`Looking for games starting before: ${twoMinutesFromNow.toISOString()}`)

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
      console.log('No games starting right now - all players remain unlocked')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No games starting right now - players remain unlocked',
          locked_players: 0,
          next_check: 'Players will be locked when their game starts (checked every 5 minutes)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`Found ${upcomingGames.length} games starting soon:`)
    upcomingGames.forEach((game: any) => {
      console.log(`  - ${game.away_team} @ ${game.home_team} at ${game.game_start_time} (${game.game_status})`)
    })

    // Get all teams involved in these games that are starting soon
    const teams = new Set<string>()
    upcomingGames.forEach((game: any) => {
      teams.add(game.home_team)
      teams.add(game.away_team)
    })

    console.log(`Locking players from teams with games starting: ${Array.from(teams).join(', ')}`)

    // First, get player_card IDs for teams with games starting
    const { data: playerCards, error: playerCardsError } = await supabase
      .from('player_cards')
      .select('id')
      .in('team_abbreviation', Array.from(teams))

    if (playerCardsError) {
      console.error('Error fetching player cards:', playerCardsError)
      throw new Error(`Error fetching player cards: ${playerCardsError.message}`)
    }

    const playerCardIds = playerCards?.map(pc => pc.id) || []
    console.log(`Found ${playerCardIds.length} player cards to lock`)

    if (playerCardIds.length === 0) {
      console.log('No player cards found for teams with games starting')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No players to lock',
          locked_players: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Lock ALL players from these teams (lineup AND bench) who aren't already locked
    // This prevents users from swapping live bench players into the lineup
    const { data: playersToLock, error: lockError } = await supabase
      .from('user_player_inventory')
      .update({ is_locked: true })
      .eq('is_locked', false)
      .in('player_card_id', playerCardIds)
      .select()

    if (lockError) {
      console.error('Error locking players:', lockError)
      throw new Error(`Error locking players: ${lockError.message}`)
    }

    const lockedCount = playersToLock?.length || 0
    console.log(`Successfully locked ${lockedCount} players (lineup + bench) whose games are starting`)

    if (lockedCount > 0) {
      console.log('Locked players:')
      playersToLock?.forEach((player: any) => {
        console.log(`  - Player inventory ID: ${player.id}`)
      })
    }

    // Create weekly lineup snapshots for teams that don't have one yet
    const { data: activeTeams, error: teamsError } = await supabase
      .from('teams')
      .select('id, user_id, team_name')
      .eq('is_active', true)

    if (teamsError) {
      throw new Error(`Error fetching teams: ${teamsError.message}`)
    }

    let snapshotsCreated = 0

    // Batch check for existing snapshots (optimization: 1 query instead of N queries)
    const teamIds = (activeTeams || []).map((t: any) => t.id)
    const { data: existingSnapshots, error: batchCheckError } = await supabase
      .from('weekly_lineups')
      .select('team_id')
      .in('team_id', teamIds)
      .eq('week_number', weekNumber)
      .eq('season_year', seasonYear)

    if (batchCheckError) {
      console.error('Error batch checking snapshots:', batchCheckError)
      throw new Error(`Error checking existing snapshots: ${batchCheckError.message}`)
    }

    const existingTeamIds = new Set(existingSnapshots?.map((s: any) => s.team_id) || [])
    console.log(`Found ${existingTeamIds.size} existing snapshots out of ${teamIds.length} teams`)

    for (const team of activeTeams || []) {
      // Skip if snapshot already exists
      if (existingTeamIds.has(team.id)) {
        console.log(`Snapshot already exists for team ${team.id}`)
        continue
      }

      // Get current lineup
      const { data: lineup, error: lineupError } = await supabase
        .from('user_player_inventory')
        .select(`
          *,
          player_card:player_cards!inner(
            id,
            player_name,
            position,
            team_abbreviation
          )
        `)
        .eq('team_id', team.id)
        .eq('is_in_lineup', true)

      if (lineupError) {
        console.error(`Error fetching lineup for team ${team.id}:`, lineupError)
        continue
      }

      if (!lineup || lineup.length === 0) {
        console.log(`No lineup set for team ${team.id}`)
        continue
      }

      // Get applied tokens for this team
      const { data: appliedTokens } = await supabase
        .from('user_token_inventory')
        .select(`
          applied_to_player_id,
          token_card_id,
          token_card:token_cards!inner(
            token_name,
            bonus_points,
            description
          )
        `)
        .eq('team_id', team.id)
        .eq('is_active', true)
        .not('applied_to_player_id', 'is', null)
      
      // Map tokens by player inventory ID
      const tokensMap = new Map(
        appliedTokens?.map((t: any) => [t.applied_to_player_id, {
          id: t.token_card_id,
          name: t.token_card.token_name,
          bonus_points: t.token_card.bonus_points,
          description: t.token_card.description
        }]) || []
      )

      // Build lineup snapshot
      const lineupSnapshot: Record<string, any> = {}
      lineup.forEach((player: any) => {
        const position = player.lineup_position
        if (position) {
          const appliedToken = tokensMap.get(player.id) as { id: string; name: string; bonus_points: number; description: string } | undefined
          
          lineupSnapshot[position] = {
            player_card_id: player.player_card_id,
            player_name: player.player_card.player_name,
            position: player.player_card.position,
            team: player.player_card.team_abbreviation,
            card_tier: player.card_tier,
            card_level: player.card_level,
            tokens: appliedToken ? [appliedToken.id] : [],
            token_names: appliedToken ? [appliedToken.name] : [],
            base_points: 0,
            token_bonus: 0,
            total_points: 0
          }
        }
      })

      // Create snapshot
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

      if (insertError) {
        console.error(`Error creating snapshot for team ${team.id}:`, insertError)
      } else {
        snapshotsCreated++
        console.log(`Created snapshot for team ${team.id}`)
      }
    }

    console.log(`Created ${snapshotsCreated} lineup snapshots`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Locked ${lockedCount} players and created ${snapshotsCreated} lineup snapshots`,
        locked_players: lockedCount,
        snapshots_created: snapshotsCreated,
        games_starting: upcomingGames.length,
        teams_affected: Array.from(teams),
        note: 'All players (lineup + bench) are locked when their game starts (with 2-minute buffer)'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in lock-lineups:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
