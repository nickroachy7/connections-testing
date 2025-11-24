import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Retry helper for API calls with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options)
      
      // If rate limited, wait and retry
      if (response.status === 429 && i < retries - 1) {
        const waitTime = Math.pow(2, i) * 1000 // Exponential backoff: 1s, 2s, 4s
        console.log(`Rate limited, waiting ${waitTime}ms before retry ${i + 1}/${retries}`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }
      
      return response
    } catch (error) {
      if (i === retries - 1) throw error
      const waitTime = Math.pow(2, i) * 1000
      console.log(`Request failed, waiting ${waitTime}ms before retry ${i + 1}/${retries}`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
  throw new Error('Max retries exceeded')
}

// Base fantasy scoring rules (PPR is applied separately based on contest type)
const BASE_SCORING_RULES = {
  passing_yards: 0.04,  // 1 point per 25 yards
  passing_tds: 4,
  interceptions: -2,
  rushing_yards: 0.1,   // 1 point per 10 yards
  rushing_tds: 6,
  receiving_yards: 0.1, // 1 point per 10 yards
  receiving_tds: 6,
  fumbles_lost: -2,
  two_point_conversions: 2,
}

// PPR multipliers by contest type
const PPR_MULTIPLIERS: Record<string, number> = {
  'standard': 0.0,    // No PPR
  'half_ppr': 0.5,    // Half PPR
  'full_ppr': 1.0     // Full PPR
}

// Card tier multipliers (from card_level_thresholds table)
const TIER_MULTIPLIERS: Record<string, number> = {
  'base': 1.0,
  'role_player': 1.1,
  'starter': 1.2,
  'all_star': 1.3,
  'elite': 1.5
}

/**
 * Calculate fantasy points based on stats and scoring type
 * @param stats - Player stats object
 * @param scoringType - Contest scoring type (standard, half_ppr, full_ppr)
 */
function calculateFantasyPoints(stats: any, scoringType: string = 'half_ppr'): number {
  let points = 0
  
  // Base scoring (applies to all scoring types)
  points += (stats.passing_yards || 0) * BASE_SCORING_RULES.passing_yards
  points += (stats.passing_tds || 0) * BASE_SCORING_RULES.passing_tds
  points += (stats.interceptions || 0) * BASE_SCORING_RULES.interceptions
  points += (stats.rushing_yards || 0) * BASE_SCORING_RULES.rushing_yards
  points += (stats.rushing_tds || 0) * BASE_SCORING_RULES.rushing_tds
  points += (stats.receiving_yards || 0) * BASE_SCORING_RULES.receiving_yards
  points += (stats.receiving_tds || 0) * BASE_SCORING_RULES.receiving_tds
  points += (stats.fumbles_lost || 0) * BASE_SCORING_RULES.fumbles_lost
  points += (stats.two_point_conversions || 0) * BASE_SCORING_RULES.two_point_conversions
  
  // Apply PPR based on contest type
  const pprMultiplier = PPR_MULTIPLIERS[scoringType] ?? PPR_MULTIPLIERS['half_ppr']
  points += (stats.receptions || 0) * pprMultiplier
  
  return Math.round(points * 10) / 10
}

// Evaluate if a token condition is met based on player stats
function evaluateTokenCondition(condition: any, stats: any, fantasyPoints: number): boolean {
  const stat = condition.stat
  const operator = condition.operator
  const value = condition.value
  
  let actualValue = 0
  
  // Calculate the stat value based on what the token is checking
  switch (stat) {
    case 'total_tds':
      // All types of touchdowns
      actualValue = (stats.passing_tds || 0) + (stats.rushing_tds || 0) + (stats.receiving_tds || 0)
      break
    case 'total_yards':
      // All types of yards
      actualValue = (stats.passing_yards || 0) + (stats.rushing_yards || 0) + (stats.receiving_yards || 0)
      break
    case 'fantasy_points':
      // Use the calculated fantasy points
      actualValue = fantasyPoints
      break
    case 'receptions':
      actualValue = stats.receptions || 0
      break
    case 'passing_yards':
      actualValue = stats.passing_yards || 0
      break
    case 'rushing_yards':
      actualValue = stats.rushing_yards || 0
      break
    case 'receiving_yards':
      actualValue = stats.receiving_yards || 0
      break
    default:
      return false
  }
  
  // Evaluate the condition
  switch (operator) {
    case '>=':
      return actualValue >= value
    case '>':
      return actualValue > value
    case '<=':
      return actualValue <= value
    case '<':
      return actualValue < value
    case '==':
    case '=':
      return actualValue === value
    default:
      return false
  }
}

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

    console.log(`🏈 Updating live stats for Week ${weekNumber}, ${seasonYear}`)

    const apiKey = Deno.env.get('BALLDONTLIE_API_KEY')
    if (!apiKey) {
      throw new Error('BALLDONTLIE_API_KEY not found')
    }

    // Fetch games from API with retry logic
    const gamesResponse = await fetchWithRetry(
      `https://api.balldontlie.io/nfl/v1/games?seasons[]=${seasonYear}&weeks[]=${weekNumber}`,
      { headers: { 'Authorization': apiKey } }
    )
    
    if (!gamesResponse.ok) {
      throw new Error(`Failed to fetch games: ${gamesResponse.statusText}`)
    }
    
    const gamesData = await gamesResponse.json()
    const allGames = gamesData.data || []
    console.log(`Found ${allGames.length} games`)

    let gamesUpdated = 0
    let statsUpdated = 0

    // Step 1: Update game scores
    for (const game of allGames) {
      // First check if game is already marked as final in our database
      const { data: existingGame } = await supabase
        .from('game_scores')
        .select('game_status')
        .eq('game_id', game.id.toString())
        .single()
      
      let gameStatus = 'scheduled'
      const statusLower = game.status.toLowerCase()
      
      if (statusLower === 'final') {
        gameStatus = 'final'
      } else if (statusLower.includes('halftime') || statusLower.includes('half time')) {
        gameStatus = 'halftime'
      } else if (
        statusLower.includes('in progress') || 
        statusLower === 'live' ||
        // Match game clock format like "2:57 - 1st" or "0:05 - 4th" but NOT "1:00 PM"
        /^\d{1,2}:\d{2}\s*-\s*(1st|2nd|3rd|4th|ot)/i.test(game.status)
      ) {
        gameStatus = 'live'
      }
      
      // Smart final detection: If game has scores and started > 4 hours ago, mark as final
      // This handles cases where API hasn't updated status but game is clearly over
      const gameStartTime = new Date(game.date || game.datetime)
      const hoursSinceStart = (Date.now() - gameStartTime.getTime()) / (1000 * 60 * 60)
      const hasScores = (game.home_team_score || 0) > 0 || (game.visitor_team_score || 0) > 0
      
      if (gameStatus === 'scheduled' && hasScores && hoursSinceStart > 4) {
        console.log(`Game ${game.id} has scores but status is scheduled - marking as final (${hoursSinceStart.toFixed(1)}h since start)`)
        gameStatus = 'final'
      }
      
      // If game was already final in DB, keep it final (don't let API revert it)
      if (existingGame?.game_status === 'final' && gameStatus !== 'final') {
        gameStatus = 'final'
      }
      
      await supabase
        .from('game_scores')
        .upsert({
          game_id: game.id.toString(),
          week_number: weekNumber,
          season_year: seasonYear,
          home_team: game.home_team.abbreviation,
          away_team: game.visitor_team.abbreviation,
          game_status: gameStatus,
          game_start_time: game.date || game.datetime || new Date().toISOString(),
          home_score: game.home_team_score || 0,
          away_score: game.visitor_team_score || 0,
          quarter: game.period || 0,
          time_remaining: game.status_text || '00:00',
          last_updated: new Date().toISOString()
        }, { onConflict: 'game_id' })
      
      gamesUpdated++

      // Step 2: Fetch player stats for live/final games only
      // Always fetch for final games to ensure stats are populated (even if game was previously finalized)
      if (gameStatus === 'live' || gameStatus === 'halftime' || gameStatus === 'final') {
        // Fetch all pages of player stats using cursor pagination
        let allPlayerStats: any[] = []
        let cursor: number | null = null
        let pageCount = 0
        
        do {
          const url = cursor 
            ? `https://api.balldontlie.io/nfl/v1/stats?game_ids[]=${game.id}&cursor=${cursor}`
            : `https://api.balldontlie.io/nfl/v1/stats?game_ids[]=${game.id}`
          
          const statsResponse = await fetchWithRetry(url, { headers: { 'Authorization': apiKey } })
          
          if (!statsResponse.ok) {
            console.error(`Failed to fetch stats for game ${game.id} (page ${pageCount + 1})`)
            break
          }
          
          const statsData = await statsResponse.json()
          allPlayerStats = allPlayerStats.concat(statsData.data || [])
          cursor = statsData.meta?.next_cursor || null
          pageCount++
          
          console.log(`Game ${game.id}: Fetched page ${pageCount} (${statsData.data?.length || 0} players, next_cursor: ${cursor})`)
        } while (cursor)
        
        console.log(`Game ${game.id}: Total ${allPlayerStats.length} player stats across ${pageCount} pages`)
        
        for (const playerStat of allPlayerStats) {
          // Try to match by player_id first
          let { data: playerCard } = await supabase
            .from('player_cards')
            .select('id, player_id')
            .eq('player_id', playerStat.player.id.toString())
            .single()
          
          // If not found by ID, try matching by name + team
          if (!playerCard && playerStat.player.first_name && playerStat.player.last_name) {
            const fullName = `${playerStat.player.first_name} ${playerStat.player.last_name}`
            const teamAbbr = playerStat.team.abbreviation
            
            const { data: playerByName } = await supabase
              .from('player_cards')
              .select('id, player_id, player_name')
              .eq('team_abbreviation', teamAbbr)
              .ilike('player_name', fullName)
              .single()
            
            if (playerByName) {
              playerCard = playerByName
              console.log(`Matched by name: ${fullName} (API ID: ${playerStat.player.id}, DB ID: ${playerByName.player_id})`)
            }
          }
          
          if (!playerCard) continue

          const stats = {
            passing_yards: playerStat.passing_yards || 0,
            passing_tds: playerStat.passing_touchdowns || 0,
            interceptions: playerStat.passing_interceptions || 0,
            rushing_yards: playerStat.rushing_yards || 0,
            rushing_tds: playerStat.rushing_touchdowns || 0,
            receptions: playerStat.receptions || 0,
            receiving_yards: playerStat.receiving_yards || 0,
            receiving_tds: playerStat.receiving_touchdowns || 0,
            fumbles_lost: playerStat.fumbles_lost || 0,
            two_point_conversions: playerStat.two_point_conversions || 0,
          }

          // Calculate fantasy points with default half_ppr (will be recalculated per lineup)
          const fantasyPoints = calculateFantasyPoints(stats, 'half_ppr')

          await supabase
            .from('player_game_stats')
            .upsert({
              game_id: game.id.toString(),
              player_card_id: playerCard.id,
              week_number: weekNumber,
              season_year: seasonYear,
              stats: stats,
              fantasy_points: fantasyPoints,
              last_updated: new Date().toISOString()
            }, { onConflict: 'game_id,player_card_id' })
          
          statsUpdated++
        }
      }
    }

    console.log(`✅ Updated ${gamesUpdated} games, ${statsUpdated} player stats`)

    // Step 2.5: Create 0-point entries for players whose games finished but have no stats
    const finalGames = allGames.filter((g: any) => {
      const statusLower = g.status.toLowerCase()
      return statusLower === 'final'
    })
    
    if (finalGames.length > 0) {
      console.log(`Creating 0-point entries for players in ${finalGames.length} final games`)
      
      for (const game of finalGames) {
        const gameId = game.id.toString()
        const homeTeam = game.home_team.abbreviation
        const awayTeam = game.visitor_team.abbreviation
        
        // Get all players from both teams
        const { data: teamPlayers } = await supabase
          .from('player_cards')
          .select('id')
          .in('team_abbreviation', [homeTeam, awayTeam])
        
        if (!teamPlayers || teamPlayers.length === 0) continue
        
        // Get existing stats for this game
        const { data: existingStats } = await supabase
          .from('player_game_stats')
          .select('player_card_id')
          .eq('game_id', gameId)
        
        const existingPlayerIds = new Set(existingStats?.map((s: any) => s.player_card_id) || [])
        
        // Create 0-point entries for players without stats
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
            console.error('Error creating zero-stat entries:', insertError)
          } else {
            statsUpdated += playersWithoutStats.length
          }
        }
      }
    }

    // Step 3: Get all token cards for condition checking
    const { data: allTokenCards } = await supabase
      .from('token_cards')
      .select('id, token_name, condition, bonus_points')
    
    const tokenCardsMap = new Map(
      allTokenCards?.map((t: any) => [t.id, t]) || []
    )

    // Step 4: Calculate and update lineup totals (WITH CONTEST-SPECIFIC PPR)
    const { data: lineups } = await supabase
      .from('weekly_lineups')
      .select(`
        id, 
        team_id, 
        lineup_snapshot,
        teams!inner(contest_type_id, contest_types!inner(scoring_type))
      `)
      .eq('week_number', weekNumber)
      .eq('season_year', seasonYear)
      .in('status', ['pending', 'active'])
    
    if (!lineups || lineups.length === 0) {
      console.log('No active lineups to update')
      return new Response(
        JSON.stringify({
          success: true,
          message: `Updated ${gamesUpdated} games, ${statsUpdated} stats, 0 lineups`,
          gamesUpdated,
          statsUpdated,
          lineupsUpdated: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    let lineupsUpdated = 0

    for (const lineup of lineups) {
      const snapshot = lineup.lineup_snapshot || {}
      
      // Skip empty snapshots
      if (Object.keys(snapshot).length === 0) {
        console.log(`Lineup ${lineup.id} has empty snapshot, skipping`)
        continue
      }

      // Get contest type scoring for this team
      const scoringType = (lineup as any).teams?.contest_types?.scoring_type || 'half_ppr'
      console.log(`📊 Processing lineup ${lineup.id} with ${scoringType} scoring`)

      let totalPoints = 0
      const playerCardIds = Object.values(snapshot)
        .map((p: any) => p?.player_card_id)
        .filter(Boolean)

      if (playerCardIds.length === 0) continue

      // Batch fetch all player stats for this lineup
      const { data: playerStats } = await supabase
        .from('player_game_stats')
        .select('player_card_id, stats')
        .in('player_card_id', playerCardIds)
        .eq('week_number', weekNumber)
        .eq('season_year', seasonYear)
      
      const statsMap = new Map(
        playerStats?.map((s: any) => [s.player_card_id, s.stats]) || []
      )

      // Get player inventory to access card tiers/levels
      const { data: inventory } = await supabase
        .from('user_player_inventory')
        .select('player_card_id, card_tier, card_level, experience_points, total_fantasy_points')
        .in('player_card_id', playerCardIds)
        .eq('team_id', lineup.team_id)
        .eq('is_in_lineup', true)
      
      const inventoryMap = new Map(
        inventory?.map((i: any) => [i.player_card_id, i]) || []
      )

      // Get applied tokens for players in this lineup
      const { data: appliedTokens } = await supabase
        .from('user_token_inventory')
        .select('applied_to_player_id, token_card_id, id')
        .eq('team_id', lineup.team_id)
        .eq('is_active', true)
        .not('applied_to_player_id', 'is', null)
      
      // Map tokens by player inventory ID
      const tokensMap = new Map(
        appliedTokens?.map((t: any) => [t.applied_to_player_id, t]) || []
      )

      // Calculate points for each position
      for (const [position, playerData] of Object.entries(snapshot) as any) {
        if (!playerData?.player_card_id) continue

        const rawStats = statsMap.get(playerData.player_card_id) || {}
        
        // RECALCULATE fantasy points with THIS team's scoring type
        const basePoints = calculateFantasyPoints(rawStats, scoringType)
        
        const inventoryData = inventoryMap.get(playerData.player_card_id)
        
        // Apply card tier multiplier
        const tierMultiplier = inventoryData 
          ? (TIER_MULTIPLIERS[inventoryData.card_tier] || 1.0)
          : 1.0
        
        const multipliedPoints = basePoints * tierMultiplier
        
        // Apply token bonuses if tokens exist
        let tokenBonus = 0
        let tokenTriggered = false
        let appliedTokenName = null
        
        if (inventoryData && playerData.tokens && playerData.tokens.length > 0) {
          // Check each token applied to this player
          for (const tokenId of playerData.tokens) {
            const tokenCard = tokenCardsMap.get(tokenId)
            if (tokenCard && basePoints > 0) {
              // Evaluate if token condition is met
              const conditionMet = evaluateTokenCondition(
                tokenCard.condition, 
                rawStats, 
                basePoints
              )
              
              if (conditionMet) {
                tokenBonus += tokenCard.bonus_points
                tokenTriggered = true
                appliedTokenName = tokenCard.token_name
                
                // Update token trigger count
                const appliedTokenInventory = Array.from(tokensMap.values()).find(
                  (t: any) => t.token_card_id === tokenId
                )
                if (appliedTokenInventory) {
                  // Increment trigger count and XP
                  await supabase.rpc('increment_token_triggers', {
                    token_id: appliedTokenInventory.id
                  })
                }
              }
            }
          }
        }
        
        const playerTotalPoints = multipliedPoints + tokenBonus

        // Award XP to player card based on fantasy points scored
        if (inventoryData && basePoints > 0) {
          const { data: xpResult } = await supabase.rpc('award_player_xp', {
            p_player_card_id: playerData.player_card_id,
            p_team_id: lineup.team_id,
            p_fantasy_points: playerTotalPoints
          })
          
          if (xpResult?.leveled_up) {
            console.log(`🎉 ${playerData.player_name} leveled up! L${xpResult.old_level} → L${xpResult.new_level} (${xpResult.new_tier})`)
          }
        }

        // Update snapshot with calculated values
        playerData.base_points = basePoints
        playerData.card_tier = inventoryData?.card_tier || 'base'
        playerData.card_level = inventoryData?.card_level || 1
        playerData.tier_multiplier = tierMultiplier
        playerData.multiplied_points = multipliedPoints
        playerData.token_bonus = tokenBonus
        playerData.token_triggered = tokenTriggered
        playerData.token_name = appliedTokenName
        playerData.total_points = playerTotalPoints
        
        totalPoints += playerTotalPoints
      }

      // Update lineup with calculated totals
      await supabase
        .from('weekly_lineups')
        .update({
          lineup_snapshot: snapshot,
          total_points: totalPoints
        })
        .eq('id', lineup.id)
      
      lineupsUpdated++
    }

    console.log(`📊 Updated ${lineupsUpdated} lineup scores (with contest-specific PPR)`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${gamesUpdated} games, ${statsUpdated} stats, ${lineupsUpdated} lineups`,
        gamesUpdated,
        statsUpdated,
        lineupsUpdated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error('Error in update-live-stats:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
