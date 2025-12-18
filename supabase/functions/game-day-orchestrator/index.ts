import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * GAME DAY ORCHESTRATOR
 * 
 * Purpose: Single unified function that handles ALL game-day operations.
 * Runs every 5 minutes and intelligently determines what work needs to be done.
 * 
 * This replaces multiple separate crons:
 * - start-live-week
 * - lock-lineups  
 * - lock-players
 * - update-live-stats
 * - track-live-stats
 * - calculate-global-average
 * - finalize-week (NOW INTEGRATED)
 * - advance-week (NOW INTEGRATED after finalization)
 * 
 * Intelligence:
 * 1. Exits early if week is finalized AND advance-week conditions not met
 * 2. Checks actual game times before doing any work
 * 3. Only fetches stats when games are in progress
 * 4. Auto-detects when all games are complete
 * 5. Tracks game counts for accurate status
 * 6. AUTO-FINALIZES when all games are complete
 * 7. GIVES LOSSES to teams without lineups
 * 8. AUTO-ADVANCES to next week after finalization (if past Tuesday)
 * 
 * Scheduled: Every 5 minutes, always
 */

// Retry helper for API calls
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options)
      if (response.status === 429 && i < retries - 1) {
        const waitTime = Math.pow(2, i) * 1000
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }
      return response
    } catch (error) {
      if (i === retries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
    }
  }
  throw new Error('Max retries exceeded')
}

// PPR Scoring
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
}

const PPR_VALUES: Record<string, number> = {
  'standard': 0.0,
  'half_ppr': 0.5,
  'full_ppr': 1.0
}

const TIER_MULTIPLIERS: Record<string, number> = {
  'base': 1.0,
  'role_player': 1.1,
  'starter': 1.2,
  'all_star': 1.3,
  'elite': 1.5
}

function calculateFantasyPoints(stats: any, pprType = 'half_ppr'): number {
  let points = 0
  points += (stats.passing_yards || 0) * BASE_SCORING.passing_yards
  points += (stats.passing_tds || 0) * BASE_SCORING.passing_tds
  points += (stats.interceptions || 0) * BASE_SCORING.interceptions
  points += (stats.rushing_yards || 0) * BASE_SCORING.rushing_yards
  points += (stats.rushing_tds || 0) * BASE_SCORING.rushing_tds
  points += (stats.receiving_yards || 0) * BASE_SCORING.receiving_yards
  points += (stats.receiving_tds || 0) * BASE_SCORING.receiving_tds
  points += (stats.fumbles_lost || 0) * BASE_SCORING.fumbles_lost
  points += (stats.two_point_conversions || 0) * BASE_SCORING.two_point_conversions
  points += (stats.receptions || 0) * (PPR_VALUES[pprType] ?? 0.5)
  return Math.round(points * 10) / 10
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  const actions: string[] = []

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const apiKey = Deno.env.get('BALLDONTLIE_API_KEY')

    if (!apiKey) throw new Error('BALLDONTLIE_API_KEY not found')

    const now = new Date()
    console.log(`\n🏈 Game Day Orchestrator - ${now.toISOString()}`)

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Get current week configuration
    // ═══════════════════════════════════════════════════════════════
    const { data: config, error: configError } = await supabase
      .from('nfl_season_config')
      .select('*')
      .eq('is_active', true)
      .single()

    if (configError || !config) {
      throw new Error('Failed to get NFL season config')
    }

    const { 
      id: configId,
      season_year: seasonYear, 
      current_week: weekNumber, 
      week_status: weekStatus,
      first_game_time: firstGameTime,
      last_game_time: lastGameTime
    } = config

    console.log(`📅 Week ${weekNumber} | Status: ${weekStatus}`)

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Handle finalized state - check if we should advance
    // ═══════════════════════════════════════════════════════════════
    if (weekStatus === 'finalized') {
      console.log('📋 Week is finalized - checking if we should auto-advance...')
      
      // Check if it's past Tuesday (day 2) and we should have advanced
      // This handles cases where advance-week cron ran before finalization
      const dayOfWeek = now.getUTCDay() // 0 = Sunday, 2 = Tuesday
      const hourOfDay = now.getUTCHours()
      
      // Auto-advance if: it's Wednesday or later, OR it's Tuesday after 8 PM UTC
      const shouldAutoAdvance = dayOfWeek > 2 || (dayOfWeek === 2 && hourOfDay >= 20) || dayOfWeek < 2
      
      if (shouldAutoAdvance && weekNumber < 18) {
        console.log(`🚀 Auto-advancing from Week ${weekNumber} to Week ${weekNumber + 1}...`)
        
        const newWeek = weekNumber + 1
        
        // Update season config
        const { error: updateConfigError } = await supabase
          .from('nfl_season_config')
          .update({
            current_week: newWeek,
            week_status: 'scheduled',
            first_game_time: null,
            last_game_time: null,
            games_total: 0,
            games_in_progress: 0,
            games_completed: 0,
            updated_at: now.toISOString()
          })
          .eq('id', configId)

        if (updateConfigError) {
          throw new Error(`Failed to update config: ${updateConfigError.message}`)
        }

        // Get all active teams
        const { data: activeTeams } = await supabase
          .from('teams')
          .select('id, team_name, user_id')
          .eq('is_active', true)

        // Update teams' current_week
        if (activeTeams && activeTeams.length > 0) {
          await supabase
            .from('teams')
            .update({ current_week: newWeek })
            .in('id', activeTeams.map(t => t.id))
        }

        // Reset player locks
        await supabase
          .from('user_player_inventory')
          .update({ is_locked: false })
          .eq('is_locked', true)

        // Initialize weekly_global_stats for new week
        await supabase
          .from('weekly_global_stats')
          .upsert({
            week_number: newWeek,
            season_year: seasonYear,
            median_score: 0,
            average_score: 0,
            top_score: 0,
            total_teams: activeTeams?.length || 0,
            total_active_teams: activeTeams?.length || 0
          }, { onConflict: 'week_number,season_year' })

        // Sync new week's schedule from API
        const gamesResponse = await fetchWithRetry(
          `https://api.balldontlie.io/nfl/v1/games?seasons[]=${seasonYear}&weeks[]=${newWeek}`,
          { headers: { 'Authorization': apiKey } }
        )
        
        if (gamesResponse.ok) {
          const gamesData = await gamesResponse.json()
          const games = gamesData.data || []
          
          if (games.length > 0) {
            const times = games.map((g: any) => new Date(g.date || g.datetime)).sort((a: Date, b: Date) => a.getTime() - b.getTime())
            
            await supabase
              .from('nfl_season_config')
              .update({
                first_game_time: times[0].toISOString(),
                last_game_time: times[times.length - 1].toISOString(),
                games_total: games.length
              })
              .eq('id', configId)

            // Upsert games into game_scores
            for (const game of games) {
              const gameTime = new Date(game.date || game.datetime)
              await supabase
                .from('game_scores')
                .upsert({
                  game_id: game.id.toString(),
                  week_number: newWeek,
                  season_year: seasonYear,
                  home_team: game.home_team.abbreviation,
                  away_team: game.visitor_team.abbreviation,
                  game_status: 'scheduled',
                  game_start_time: gameTime.toISOString(),
                  home_score: 0,
                  away_score: 0,
                  quarter: 0,
                  time_remaining: '',
                  last_updated: now.toISOString()
                }, { onConflict: 'game_id' })
            }

            actions.push(`synced ${games.length} games for week ${newWeek}`)
          }
        }

        console.log(`✅ Auto-advanced to Week ${newWeek}`)
        actions.push(`auto-advanced to week ${newWeek}`)

        return new Response(
          JSON.stringify({
            success: true,
            message: `Auto-advanced to Week ${newWeek}`,
            previous_week: weekNumber,
            new_week: newWeek,
            actions: actions,
            duration_ms: Date.now() - startTime
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        console.log('✅ Week is finalized - waiting for scheduled advance-week')
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Week is finalized, waiting for advance-week',
            week_status: weekStatus,
            actions: ['skipped - week finalized, advance pending'],
            duration_ms: Date.now() - startTime
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Check game schedule timing
    // ═══════════════════════════════════════════════════════════════
    const firstGame = firstGameTime ? new Date(firstGameTime) : null
    const lastGame = lastGameTime ? new Date(lastGameTime) : null
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000)
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)

    // If no game times set, try to sync schedule
    if (!firstGame || !lastGame) {
      console.log('⚠️ No game times set - syncing schedule...')
      // Fetch games to populate schedule
      const gamesResponse = await fetchWithRetry(
        `https://api.balldontlie.io/nfl/v1/games?seasons[]=${seasonYear}&weeks[]=${weekNumber}`,
        { headers: { 'Authorization': apiKey } }
      )
      
      if (gamesResponse.ok) {
        const gamesData = await gamesResponse.json()
        const games = gamesData.data || []
        
        if (games.length > 0) {
          const times = games.map((g: any) => new Date(g.date || g.datetime)).sort((a: Date, b: Date) => a.getTime() - b.getTime())
          await supabase
            .from('nfl_season_config')
            .update({
              first_game_time: times[0].toISOString(),
              last_game_time: times[times.length - 1].toISOString(),
              games_total: games.length,
              updated_at: now.toISOString()
            })
            .eq('id', configId)
          actions.push(`synced schedule: ${games.length} games`)
        }
      }
    }

    // Check if we're before the first game
    if (firstGame && now < firstGame && weekStatus === 'scheduled') {
      const timeToFirstGame = firstGame.getTime() - now.getTime()
      const hoursToGame = Math.floor(timeToFirstGame / (1000 * 60 * 60))
      const minsToGame = Math.floor((timeToFirstGame % (1000 * 60 * 60)) / (1000 * 60))
      
      // If first game is within 10 minutes, start locking players
      if (now >= new Date(firstGame.getTime() - 10 * 60 * 1000)) {
        console.log(`⏰ First game starts in <10 min - preparing...`)
        actions.push('pre-game lockdown initiated')
        // Continue to locking logic below
      } else {
        console.log(`⏳ First game in ${hoursToGame}h ${minsToGame}m - nothing to do yet`)
        return new Response(
          JSON.stringify({
            success: true,
            message: `Waiting for first game (${hoursToGame}h ${minsToGame}m)`,
            week_status: weekStatus,
            first_game_time: firstGame.toISOString(),
            actions: ['skipped - games not started'],
            duration_ms: Date.now() - startTime
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: Fetch current game states from API
    // ═══════════════════════════════════════════════════════════════
    console.log('📡 Fetching game data from API...')
    
    const gamesResponse = await fetchWithRetry(
      `https://api.balldontlie.io/nfl/v1/games?seasons[]=${seasonYear}&weeks[]=${weekNumber}`,
      { headers: { 'Authorization': apiKey } }
    )

    if (!gamesResponse.ok) {
      throw new Error(`API error: ${gamesResponse.statusText}`)
    }

    const gamesData = await gamesResponse.json()
    const games = gamesData.data || []
    
    let gamesScheduled = 0
    let gamesLive = 0
    let gamesFinal = 0
    const liveGameIds: string[] = []
    const teamsWithGamesStarting = new Set<string>()

    // ═══════════════════════════════════════════════════════════════
    // STEP 5: Process each game - update scores and detect status
    // ═══════════════════════════════════════════════════════════════
    for (const game of games) {
      const gameTime = new Date(game.date || game.datetime)
      const statusLower = (game.status || '').toLowerCase()
      
      let gameStatus = 'scheduled'
      
      if (statusLower === 'final') {
        gameStatus = 'final'
        gamesFinal++
      } else if (statusLower.includes('halftime')) {
        gameStatus = 'halftime'
        gamesLive++
        liveGameIds.push(game.id.toString())
      } else if (
        statusLower.includes('progress') || 
        statusLower === 'live' ||
        /^\d{1,2}:\d{2}\s*-\s*(1st|2nd|3rd|4th|ot)/i.test(game.status)
      ) {
        gameStatus = 'live'
        gamesLive++
        liveGameIds.push(game.id.toString())
      } else {
        // Smart final detection: has scores + 4+ hours since start
        const hoursSinceStart = (now.getTime() - gameTime.getTime()) / (1000 * 60 * 60)
        const hasScores = (game.home_team_score || 0) > 0 || (game.visitor_team_score || 0) > 0
        
        if (hasScores && hoursSinceStart > 4) {
          gameStatus = 'final'
          gamesFinal++
        } else if (gameTime <= now) {
          // Game should have started
          gameStatus = 'live'
          gamesLive++
          liveGameIds.push(game.id.toString())
        } else {
          gamesScheduled++
        }
      }

      // Check if game is starting within 10 minutes (for locking)
      if (gameTime <= tenMinutesFromNow && gameTime > fourHoursAgo) {
        teamsWithGamesStarting.add(game.home_team.abbreviation)
        teamsWithGamesStarting.add(game.visitor_team.abbreviation)
      }

      // Update game in database
      await supabase
        .from('game_scores')
        .upsert({
          game_id: game.id.toString(),
          week_number: weekNumber,
          season_year: seasonYear,
          home_team: game.home_team.abbreviation,
          away_team: game.visitor_team.abbreviation,
          game_status: gameStatus,
          game_start_time: gameTime.toISOString(),
          home_score: game.home_team_score || 0,
          away_score: game.visitor_team_score || 0,
          quarter: game.period || 0,
          time_remaining: game.status || '',
          last_updated: now.toISOString()
        }, { onConflict: 'game_id' })
    }

    console.log(`📊 Games: ${gamesScheduled} scheduled, ${gamesLive} live, ${gamesFinal} final`)
    actions.push(`updated ${games.length} games`)

    // ═══════════════════════════════════════════════════════════════
    // STEP 6: Update week status if needed
    // ═══════════════════════════════════════════════════════════════
    let newWeekStatus = weekStatus
    
    if ((weekStatus === 'scheduled' || weekStatus === 'not_started') && (gamesLive > 0 || gamesFinal > 0)) {
      newWeekStatus = 'live'
      console.log(`🟢 Week status: ${weekStatus} → live`)
      actions.push('week status changed to live')
    }

    // Update config with game counts
    await supabase
      .from('nfl_season_config')
      .update({
        week_status: newWeekStatus,
        games_in_progress: gamesLive,
        games_completed: gamesFinal,
        games_total: games.length,
        updated_at: now.toISOString()
      })
      .eq('id', configId)

    // ═══════════════════════════════════════════════════════════════
    // STEP 7: Lock players for games starting soon
    // ═══════════════════════════════════════════════════════════════
    if (teamsWithGamesStarting.size > 0) {
      console.log(`🔒 Locking players for: ${Array.from(teamsWithGamesStarting).join(', ')}`)
      
      // Get player cards for these teams
      const { data: playerCards } = await supabase
        .from('player_cards')
        .select('id')
        .in('team_abbreviation', Array.from(teamsWithGamesStarting))

      if (playerCards && playerCards.length > 0) {
        const playerCardIds = playerCards.map(p => p.id)
        
        const { data: playersToLock } = await supabase
          .from('user_player_inventory')
          .select('id')
          .eq('is_locked', false)
          .in('player_card_id', playerCardIds)

        if (playersToLock && playersToLock.length > 0) {
          await supabase
            .from('user_player_inventory')
            .update({ is_locked: true })
            .in('id', playersToLock.map(p => p.id))
          
          console.log(`🔒 Locked ${playersToLock.length} players`)
          actions.push(`locked ${playersToLock.length} players`)
        }
      }

      // Create lineup snapshots for teams without one
      const { data: activeTeams } = await supabase
        .from('teams')
        .select('id, team_name')
        .eq('is_active', true)

      if (activeTeams) {
        const teamIds = activeTeams.map(t => t.id)
        const { data: existingSnapshots } = await supabase
          .from('weekly_lineups')
          .select('team_id')
          .in('team_id', teamIds)
          .eq('week_number', weekNumber)
          .eq('season_year', seasonYear)

        const existingTeamIds = new Set(existingSnapshots?.map(s => s.team_id) || [])
        let snapshotsCreated = 0

        for (const team of activeTeams) {
          if (existingTeamIds.has(team.id)) continue

          const { data: lineup } = await supabase
            .from('user_player_inventory')
            .select(`
              lineup_position, player_card_id, card_tier, card_level,
              player_card:player_cards!inner(player_name, position, team_abbreviation, weekly_projected_points)
            `)
            .eq('team_id', team.id)
            .eq('is_in_lineup', true)

          if (!lineup || lineup.length === 0) continue

          const snapshot: Record<string, any> = {}
          let projectedTotal = 0

          for (const player of lineup) {
            if (player.lineup_position) {
              const projected = (player as any).player_card?.weekly_projected_points || 0
              projectedTotal += projected
              snapshot[player.lineup_position] = {
                player_card_id: player.player_card_id,
                player_name: (player as any).player_card?.player_name,
                position: (player as any).player_card?.position,
                team: (player as any).player_card?.team_abbreviation,
                card_tier: player.card_tier,
                card_level: player.card_level,
                projected_points: projected,
                tokens: [],
                base_points: 0,
                token_bonus: 0,
                total_points: 0
              }
            }
          }

          await supabase.from('weekly_lineups').insert({
            team_id: team.id,
            week_number: weekNumber,
            season_year: seasonYear,
            lineup_snapshot: snapshot,
            projected_points: projectedTotal,
            total_points: 0,
            status: 'pending'
          })
          snapshotsCreated++
        }

        if (snapshotsCreated > 0) {
          console.log(`📸 Created ${snapshotsCreated} lineup snapshots`)
          actions.push(`created ${snapshotsCreated} snapshots`)
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 8: Fetch player stats for live/final games
    // ═══════════════════════════════════════════════════════════════
    if (liveGameIds.length > 0 || gamesFinal > 0) {
      console.log(`📊 Fetching player stats for ${liveGameIds.length} live games...`)
      
      let statsUpdated = 0
      
      // Get stats for all games in the week
      for (const game of games) {
        const statusLower = (game.status || '').toLowerCase()
        const isLiveOrFinal = statusLower === 'final' || 
                              statusLower.includes('progress') || 
                              statusLower === 'live' ||
                              statusLower.includes('halftime')
        
        if (!isLiveOrFinal) continue

        try {
          const statsResponse = await fetchWithRetry(
            `https://api.balldontlie.io/nfl/v1/stats?game_ids[]=${game.id}`,
            { headers: { 'Authorization': apiKey } }
          )

          if (!statsResponse.ok) continue

          const statsData = await statsResponse.json()
          
          for (const stat of statsData.data || []) {
            const { data: playerCard } = await supabase
              .from('player_cards')
              .select('id')
              .eq('player_id', stat.player.id.toString())
              .single()

            if (!playerCard) continue

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
            }

            const fantasyPoints = calculateFantasyPoints(playerStats, 'half_ppr')

            await supabase
              .from('player_game_stats')
              .upsert({
                game_id: game.id.toString(),
                player_card_id: playerCard.id,
                week_number: weekNumber,
                season_year: seasonYear,
                stats: playerStats,
                fantasy_points: fantasyPoints,
                last_updated: now.toISOString()
              }, { onConflict: 'game_id,player_card_id' })

            statsUpdated++
          }
        } catch (e) {
          console.error(`Error fetching stats for game ${game.id}:`, e)
        }

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100))
      }

      if (statsUpdated > 0) {
        console.log(`📊 Updated ${statsUpdated} player stats`)
        actions.push(`updated ${statsUpdated} player stats`)
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 9: Update lineup totals (for active and pending lineups)
    // ═══════════════════════════════════════════════════════════════
    const { data: lineups } = await supabase
      .from('weekly_lineups')
      .select('id, team_id, lineup_snapshot')
      .eq('week_number', weekNumber)
      .eq('season_year', seasonYear)
      .in('status', ['pending', 'active'])

    if (lineups && lineups.length > 0) {
      let lineupsUpdated = 0

      for (const lineup of lineups) {
        const snapshot = lineup.lineup_snapshot || {}
        if (Object.keys(snapshot).length === 0) continue

        const playerCardIds = Object.values(snapshot)
          .map((p: any) => p?.player_card_id)
          .filter(Boolean)

        if (playerCardIds.length === 0) continue

        const { data: playerStats } = await supabase
          .from('player_game_stats')
          .select('player_card_id, stats, fantasy_points')
          .in('player_card_id', playerCardIds)
          .eq('week_number', weekNumber)
          .eq('season_year', seasonYear)

        const statsMap = new Map(playerStats?.map(s => [s.player_card_id, s]) || [])

        let totalPoints = 0
        let hasUpdates = false

        for (const [position, playerData] of Object.entries(snapshot) as any) {
          if (!playerData?.player_card_id) continue

          const statData = statsMap.get(playerData.player_card_id)
          if (statData) {
            const basePoints = statData.fantasy_points || 0
            const tierMult = TIER_MULTIPLIERS[playerData.card_tier] || 1.0
            const multipliedPoints = basePoints * tierMult
            
            playerData.base_points = basePoints
            playerData.tier_multiplier = tierMult
            playerData.total_points = multipliedPoints
            totalPoints += multipliedPoints
            hasUpdates = true
          }
        }

        if (hasUpdates) {
          await supabase
            .from('weekly_lineups')
            .update({
              lineup_snapshot: snapshot,
              total_points: Math.round(totalPoints * 10) / 10,
              status: 'active' // Mark as active once we have stats
            })
            .eq('id', lineup.id)
          lineupsUpdated++
        }
      }

      if (lineupsUpdated > 0) {
        console.log(`📊 Updated ${lineupsUpdated} lineup totals`)
        actions.push(`updated ${lineupsUpdated} lineup totals`)
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 10: Calculate and update global median
    // ═══════════════════════════════════════════════════════════════
    const { data: allLineups } = await supabase
      .from('weekly_lineups')
      .select('total_points')
      .eq('week_number', weekNumber)
      .eq('season_year', seasonYear)

    let globalMedian = 0
    if (allLineups && allLineups.length > 0) {
      const scores = allLineups.map(l => l.total_points || 0).sort((a, b) => a - b)
      globalMedian = scores.length % 2 === 0
        ? (scores[Math.floor(scores.length / 2) - 1] + scores[Math.floor(scores.length / 2)]) / 2
        : scores[Math.floor(scores.length / 2)]

      await supabase
        .from('weekly_global_stats')
        .upsert({
          week_number: weekNumber,
          season_year: seasonYear,
          median_score: Math.round(globalMedian * 10) / 10,
          average_score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
          highest_score: Math.max(...scores),
          lowest_score: Math.min(...scores),
          top_score: Math.max(...scores),
          total_teams: scores.length,
          total_active_teams: scores.length
        }, { onConflict: 'week_number,season_year' })

      actions.push(`median updated: ${Math.round(globalMedian * 10) / 10}`)
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 11: AUTO-FINALIZE when all games are complete
    // ═══════════════════════════════════════════════════════════════
    const allGamesComplete = gamesFinal === games.length && games.length > 0
    
    if (allGamesComplete && newWeekStatus === 'live') {
      console.log('\n🏁 ALL GAMES COMPLETE - INITIATING AUTO-FINALIZATION')
      
      // Get ALL active teams to check who needs a loss for not setting lineup
      const { data: allActiveTeams } = await supabase
        .from('teams')
        .select('id, user_id, team_name, wins, losses, total_points, coins, created_at')
        .eq('is_active', true)

      // Get teams that have lineups for this week
      const { data: teamsWithLineups } = await supabase
        .from('weekly_lineups')
        .select('team_id')
        .eq('week_number', weekNumber)
        .eq('season_year', seasonYear)

      const teamsWithLineupsSet = new Set(teamsWithLineups?.map(t => t.team_id) || [])
      
      // Find teams that were eligible to play but didn't set a lineup
      // Only penalize teams created BEFORE the week started (before first game)
      const weekStartTime = firstGame || new Date(0)
      const teamsWithoutLineup = (allActiveTeams || []).filter(team => {
        const teamCreatedAt = new Date(team.created_at)
        const wasCreatedBeforeWeek = teamCreatedAt < weekStartTime
        const hasNoLineup = !teamsWithLineupsSet.has(team.id)
        return wasCreatedBeforeWeek && hasNoLineup
      })

      console.log(`📋 Teams without lineup (eligible): ${teamsWithoutLineup.length}`)
      
      // Give losses to teams that didn't set a lineup
      let noLineupLosses = 0
      for (const team of teamsWithoutLineup) {
        const newLosses = team.losses + 1
        const isEliminated = newLosses >= 3

        // Create a zero-point lineup record for tracking
        await supabase.from('weekly_lineups').insert({
          team_id: team.id,
          week_number: weekNumber,
          season_year: seasonYear,
          lineup_snapshot: {},
          projected_points: 0,
          total_points: 0,
          status: 'completed',
          beat_median: false,
          beat_average: false,
          finalized_at: now.toISOString()
        })

        // Update team record
        await supabase
          .from('teams')
          .update({
            losses: newLosses,
            is_active: !isEliminated,
            eliminated_at: isEliminated ? now.toISOString() : null
          })
          .eq('id', team.id)

        // Log transaction
        await supabase
          .from('transactions')
          .insert({
            user_id: team.user_id,
            team_id: team.id,
            transaction_type: 'week_loss',
            coins_change: 0,
            coins_after: team.coins,
            metadata: {
              week_number: weekNumber,
              season_year: seasonYear,
              total_points: 0,
              global_median: globalMedian,
              result: 'loss',
              reason: 'no_lineup_set',
              new_record: `${team.wins}-${newLosses}`
            }
          })

        console.log(`❌ ${team.team_name}: No lineup → Loss (now ${team.wins}-${newLosses})${isEliminated ? ' - ELIMINATED' : ''}`)
        noLineupLosses++
      }

      if (noLineupLosses > 0) {
        actions.push(`${noLineupLosses} teams got loss for no lineup`)
      }

      // Get all lineups that need finalization (pending or active)
      const { data: lineupsToFinalize } = await supabase
        .from('weekly_lineups')
        .select('id, team_id, total_points, lineup_snapshot')
        .eq('week_number', weekNumber)
        .eq('season_year', seasonYear)
        .in('status', ['pending', 'active'])

      if (lineupsToFinalize && lineupsToFinalize.length > 0) {
        console.log(`📋 Finalizing ${lineupsToFinalize.length} lineups...`)
        
        let wins = 0
        let losses = 0
        let eliminated = 0

        for (const lineup of lineupsToFinalize) {
          const beatMedian = (lineup.total_points || 0) >= globalMedian
          
          // Update lineup status
          await supabase
            .from('weekly_lineups')
            .update({
              status: 'completed',
              beat_median: beatMedian,
              beat_average: beatMedian, // Keep in sync for compatibility
              finalized_at: now.toISOString()
            })
            .eq('id', lineup.id)

          // Get and update team record
          const { data: team } = await supabase
            .from('teams')
            .select('id, user_id, wins, losses, total_points, coins')
            .eq('id', lineup.team_id)
            .single()

          if (team) {
            const newWins = team.wins + (beatMedian ? 1 : 0)
            const newLosses = team.losses + (beatMedian ? 0 : 1)
            const newTotalPoints = (team.total_points || 0) + (lineup.total_points || 0)
            const isEliminated = newLosses >= 3

            await supabase
              .from('teams')
              .update({
                wins: newWins,
                losses: newLosses,
                total_points: newTotalPoints,
                is_active: !isEliminated,
                eliminated_at: isEliminated ? now.toISOString() : null
              })
              .eq('id', team.id)

            // Log transaction
            await supabase
              .from('transactions')
              .insert({
                user_id: team.user_id,
                team_id: team.id,
                transaction_type: beatMedian ? 'week_win' : 'week_loss',
                coins_change: 0,
                coins_after: team.coins,
                metadata: {
                  week_number: weekNumber,
                  season_year: seasonYear,
                  total_points: lineup.total_points,
                  global_median: globalMedian,
                  result: beatMedian ? 'win' : 'loss',
                  new_record: `${newWins}-${newLosses}`
                }
              })

            if (beatMedian) wins++
            else losses++
            if (isEliminated) eliminated++
          }
        }

        console.log(`📊 Results: ${wins} wins, ${losses} losses, ${eliminated} eliminated`)
        actions.push(`finalized ${lineupsToFinalize.length} lineups: ${wins}W-${losses}L`)
      }

      // Unlock all players for lineup editing
      const { error: unlockError } = await supabase
        .from('user_player_inventory')
        .update({ is_locked: false })
        .eq('is_locked', true)

      if (!unlockError) {
        console.log('🔓 Unlocked all players')
        actions.push('unlocked all players')
      }

      // Delete applied tokens (consumed after week)
      const { data: deletedTokens } = await supabase
        .from('user_token_inventory')
        .delete()
        .not('applied_to_player_id', 'is', null)
        .eq('is_active', true)
        .select('id')

      if (deletedTokens && deletedTokens.length > 0) {
        console.log(`🗑️ Deleted ${deletedTokens.length} applied tokens`)
        actions.push(`deleted ${deletedTokens.length} tokens`)
      }

      // Set week status to finalized
      await supabase
        .from('nfl_season_config')
        .update({
          week_status: 'finalized',
          updated_at: now.toISOString()
        })
        .eq('id', configId)

      newWeekStatus = 'finalized'
      console.log('✅ Week status → finalized')
      actions.push('week finalized')
    }

    // ═══════════════════════════════════════════════════════════════
    // DONE
    // ═══════════════════════════════════════════════════════════════
    const duration = Date.now() - startTime
    console.log(`\n✅ Orchestrator complete in ${duration}ms`)
    console.log(`   Actions: ${actions.join(', ')}`)

    return new Response(
      JSON.stringify({
        success: true,
        week_number: weekNumber,
        week_status: newWeekStatus,
        games: {
          scheduled: gamesScheduled,
          live: gamesLive,
          final: gamesFinal,
          total: games.length
        },
        all_games_complete: allGamesComplete,
        actions: actions,
        duration_ms: duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Orchestrator error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        actions: actions,
        duration_ms: Date.now() - startTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
