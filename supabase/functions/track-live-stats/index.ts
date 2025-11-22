import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * TRACK LIVE STATS
 * 
 * Purpose: Fetch and update live game stats and fantasy points during games.
 * 
 * Responsibilities:
 * 1. Fetch game scores from BallDontLie API
 * 2. Update game_scores table with current scores/status
 * 3. Fetch and update player_game_stats with individual performance
 * 4. Calculate and update fantasy points in weekly_lineups
 * 
 * Scheduled: Every 2-5 minutes during games (Thu/Sun/Mon)
 * 
 * Note: Does NOT lock players or finalize games - those are separate functions
 */

// Retry helper for API calls with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options)
      if (response.status === 429 && i < retries - 1) {
        const waitTime = Math.pow(2, i) * 1000
        console.log(`Rate limited, waiting ${waitTime}ms before retry ${i + 1}/${retries}`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }
      return response
    } catch (error) {
      if (i === retries - 1) throw error
      const waitTime = Math.pow(2, i) * 1000
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
  throw new Error('Max retries exceeded')
}

const BASE_SCORING_RULES = {
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

const PPR_MULTIPLIERS: Record<string, number> = {
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

function calculateFantasyPoints(stats: any, scoringType: string = 'half_ppr'): number {
  let points = 0
  points += (stats.passing_yards || 0) * BASE_SCORING_RULES.passing_yards
  points += (stats.passing_tds || 0) * BASE_SCORING_RULES.passing_tds
  points += (stats.interceptions || 0) * BASE_SCORING_RULES.interceptions
  points += (stats.rushing_yards || 0) * BASE_SCORING_RULES.rushing_yards
  points += (stats.rushing_tds || 0) * BASE_SCORING_RULES.rushing_tds
  points += (stats.receiving_yards || 0) * BASE_SCORING_RULES.receiving_yards
  points += (stats.receiving_tds || 0) * BASE_SCORING_RULES.receiving_tds
  points += (stats.fumbles_lost || 0) * BASE_SCORING_RULES.fumbles_lost
  points += (stats.two_point_conversions || 0) * BASE_SCORING_RULES.two_point_conversions
  
  const pprMultiplier = PPR_MULTIPLIERS[scoringType] ?? PPR_MULTIPLIERS['half_ppr']
  points += (stats.receptions || 0) * pprMultiplier
  
  return Math.round(points * 10) / 10
}

function evaluateTokenCondition(condition: any, stats: any, fantasyPoints: number): boolean {
  const stat = condition.stat
  const operator = condition.operator
  const value = condition.value
  let actualValue = 0
  
  switch (stat) {
    case 'total_tds':
      actualValue = (stats.passing_tds || 0) + (stats.rushing_tds || 0) + (stats.receiving_tds || 0)
      break
    case 'total_yards':
      actualValue = (stats.passing_yards || 0) + (stats.rushing_yards || 0) + (stats.receiving_yards || 0)
      break
    case 'fantasy_points':
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
  
  switch (operator) {
    case '>=': return actualValue >= value
    case '>': return actualValue > value
    case '<=': return actualValue <= value
    case '<': return actualValue < value
    case '==':
    case '=': return actualValue === value
    default: return false
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

    const { data: weekConfig, error: weekError } = await supabase.rpc('get_current_nfl_week')
    if (weekError || !weekConfig || weekConfig.length === 0) {
      throw new Error('Failed to get current NFL week from config')
    }
    
    const { season_year: seasonYear, week_number: weekNumber } = weekConfig[0]
    console.log(`📊 Tracking live stats for Week ${weekNumber}, ${seasonYear}`)

    const apiKey = Deno.env.get('BALLDONTLIE_API_KEY')
    if (!apiKey) throw new Error('BALLDONTLIE_API_KEY not found')

    // Fetch games
    const gamesResponse = await fetchWithRetry(
      `https://api.balldontlie.io/nfl/v1/games?seasons[]=${seasonYear}&weeks[]=${weekNumber}`,
      { headers: { 'Authorization': apiKey } }
    )
    
    if (!gamesResponse.ok) throw new Error(`Failed to fetch games: ${gamesResponse.statusText}`)
    
    const gamesData = await gamesResponse.json()
    const allGames = gamesData.data || []
    console.log(`Found ${allGames.length} games`)

    let gamesUpdated = 0
    let statsUpdated = 0

    // Update game scores (but don't change already-final games)
    for (const game of allGames) {
      const { data: existingGame } = await supabase
        .from('game_scores')
        .select('game_status')
        .eq('game_id', game.id.toString())
        .single()
      
      if (existingGame?.game_status === 'final') continue

      let gameStatus = 'scheduled'
      const statusLower = game.status.toLowerCase()
      
      if (statusLower === 'final') {
        gameStatus = 'final'
      } else if (statusLower.includes('halftime') || statusLower.includes('half time')) {
        gameStatus = 'halftime'
      } else if (
        statusLower.includes('in progress') || 
        statusLower === 'live' ||
        /^\\d{1,2}:\\d{2}\\s*-\\s*(1st|2nd|3rd|4th|ot)/i.test(game.status)
      ) {
        gameStatus = 'live'
      }
      
      // Smart final detection
      const gameStartTime = new Date(game.date || game.datetime)
      const hoursSinceStart = (Date.now() - gameStartTime.getTime()) / (1000 * 60 * 60)
      const hasScores = (game.home_team_score || 0) > 0 || (game.visitor_team_score || 0) > 0
      
      if (gameStatus === 'scheduled' && hasScores && hoursSinceStart > 4) {
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

      // Fetch player stats for live/halftime/final games only
      if (gameStatus === 'live' || gameStatus === 'halftime' || gameStatus === 'final') {
        const statsResponse = await fetchWithRetry(
          `https://api.balldontlie.io/nfl/v1/stats?game_ids[]=${game.id}`,
          { headers: { 'Authorization': apiKey } }
        )
        
        if (!statsResponse.ok) {
          console.error(`Failed to fetch stats for game ${game.id}`)
          continue
        }
        
        const statsData = await statsResponse.json()
        
        for (const playerStat of statsData.data || []) {
          const { data: playerCard } = await supabase
            .from('player_cards')
            .select('id')
            .eq('player_id', playerStat.player.id.toString())
            .single()
          
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

    // Get token cards for condition checking
    const { data: allTokenCards } = await supabase
      .from('token_cards')
      .select('id, token_name, condition, bonus_points')
    
    const tokenCardsMap = new Map(allTokenCards?.map((t: any) => [t.id, t]) || [])

    // Update lineup totals with contest-specific PPR
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
      if (Object.keys(snapshot).length === 0) continue

      const scoringType = (lineup as any).teams?.contest_types?.scoring_type || 'half_ppr'
      let totalPoints = 0
      const playerCardIds = Object.values(snapshot).map((p: any) => p?.player_card_id).filter(Boolean)
      if (playerCardIds.length === 0) continue

      const { data: playerStats } = await supabase
        .from('player_game_stats')
        .select('player_card_id, stats')
        .in('player_card_id', playerCardIds)
        .eq('week_number', weekNumber)
        .eq('season_year', seasonYear)
      
      const statsMap = new Map(playerStats?.map((s: any) => [s.player_card_id, s.stats]) || [])

      const { data: inventory } = await supabase
        .from('user_player_inventory')
        .select('player_card_id, card_tier, card_level')
        .in('player_card_id', playerCardIds)
        .eq('team_id', lineup.team_id)
        .eq('is_in_lineup', true)
      
      const inventoryMap = new Map(inventory?.map((i: any) => [i.player_card_id, i]) || [])

      for (const [position, playerData] of Object.entries(snapshot) as any) {
        if (!playerData?.player_card_id) continue

        const rawStats = statsMap.get(playerData.player_card_id) || {}
        const basePoints = calculateFantasyPoints(rawStats, scoringType)
        const inventoryData = inventoryMap.get(playerData.player_card_id)
        const tierMultiplier = inventoryData ? (TIER_MULTIPLIERS[inventoryData.card_tier] || 1.0) : 1.0
        const multipliedPoints = basePoints * tierMultiplier

        let tokenBonus = 0
        let tokenTriggered = false
        
        if (playerData.tokens && playerData.tokens.length > 0) {
          for (const tokenId of playerData.tokens) {
            const tokenCard = tokenCardsMap.get(tokenId)
            if (tokenCard && basePoints > 0) {
              const conditionMet = evaluateTokenCondition(tokenCard.condition, rawStats, basePoints)
              if (conditionMet) {
                tokenBonus += tokenCard.bonus_points
                tokenTriggered = true
              }
            }
          }
        }
        
        const playerTotalPoints = multipliedPoints + tokenBonus

        if (inventoryData && basePoints > 0) {
          await supabase.rpc('award_player_xp', {
            p_player_card_id: playerData.player_card_id,
            p_team_id: lineup.team_id,
            p_fantasy_points: playerTotalPoints
          })
        }

        playerData.base_points = basePoints
        playerData.card_tier = inventoryData?.card_tier || 'base'
        playerData.card_level = inventoryData?.card_level || 1
        playerData.tier_multiplier = tierMultiplier
        playerData.multiplied_points = multipliedPoints
        playerData.token_bonus = tokenBonus
        playerData.token_triggered = tokenTriggered
        playerData.total_points = playerTotalPoints
        
        totalPoints += playerTotalPoints
      }

      await supabase
        .from('weekly_lineups')
        .update({
          lineup_snapshot: snapshot,
          total_points: totalPoints
        })
        .eq('id', lineup.id)
      
      lineupsUpdated++
    }

    console.log(`✅ Updated ${gamesUpdated} games, ${statsUpdated} stats, ${lineupsUpdated} lineups`)

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
    console.error('Error in track-live-stats:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
