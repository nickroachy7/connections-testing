import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fantasy scoring rules
const SCORING_RULES = {
  passing_yards: 0.04,  // 1 point per 25 yards
  passing_tds: 4,
  interceptions: -2,
  rushing_yards: 0.1,   // 1 point per 10 yards
  rushing_tds: 6,
  receptions: 1,        // PPR
  receiving_yards: 0.1, // 1 point per 10 yards
  receiving_tds: 6,
  fumbles_lost: -2,
  two_point_conversions: 2,
}

function calculateFantasyPoints(stats) {
  let points = 0
  
  // Passing
  points += (stats.passing_yards || 0) * SCORING_RULES.passing_yards
  points += (stats.passing_tds || 0) * SCORING_RULES.passing_tds
  points += (stats.interceptions || 0) * SCORING_RULES.interceptions
  
  // Rushing
  points += (stats.rushing_yards || 0) * SCORING_RULES.rushing_yards
  points += (stats.rushing_tds || 0) * SCORING_RULES.rushing_tds
  
  // Receiving
  points += (stats.receptions || 0) * SCORING_RULES.receptions
  points += (stats.receiving_yards || 0) * SCORING_RULES.receiving_yards
  points += (stats.receiving_tds || 0) * SCORING_RULES.receiving_tds
  
  // Other
  points += (stats.fumbles_lost || 0) * SCORING_RULES.fumbles_lost
  points += (stats.two_point_conversions || 0) * SCORING_RULES.two_point_conversions
  
  return Math.round(points * 10) / 10 // Round to 1 decimal place
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
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

    console.log(`Updating live stats for Week ${weekNumber}, ${seasonYear}`)

    // Fetch live games from NFL API (using BallDontLie API as specified in env)
    const apiKey = Deno.env.get('BALLDONTLIE_API_KEY')
    if (!apiKey) {
      throw new Error('BALLDONTLIE_API_KEY not found')
    }

    // Get current games (NFL endpoint)
    const gamesResponse = await fetch(`https://api.balldontlie.io/nfl/v1/games?seasons[]=${seasonYear}&weeks[]=${weekNumber}`, {
      headers: {
        'Authorization': apiKey
      }
    })
    
    if (!gamesResponse.ok) {
      throw new Error(`Failed to fetch games: ${gamesResponse.statusText}`)
    }
    
    const gamesData = await gamesResponse.json()
    // Get ALL games (scheduled, live, and final) so we can show matchup info
    const allGames = gamesData.data || []

    console.log(`Found ${allGames.length} total games for Week ${weekNumber}`)
    
    // Log first game structure to see what fields are available
    if (allGames.length > 0) {
      const sampleGame = allGames[0]
      console.log('Game fields:', Object.keys(sampleGame))
      console.log('Game date value:', sampleGame.date)
      console.log('Game datetime value:', sampleGame.datetime)
      console.log('Game time value:', sampleGame.time)
      console.log('Game scheduled_date value:', sampleGame.scheduled_date)
    }

    // Update game scores for ALL games (including scheduled ones)
    for (const game of allGames) {
      // Map API status to database enum values
      let gameStatus = 'scheduled' // default
      const statusLower = game.status.toLowerCase()
      
      // Check for live game status
      if (statusLower === 'final') {
        gameStatus = 'final'
      } else if (statusLower === 'halftime' || statusLower === 'half time' || statusLower.includes('halftime')) {
        gameStatus = 'halftime'
      } else if (
        statusLower.includes('in progress') || 
        statusLower === 'live' ||
        statusLower.includes('1st') ||
        statusLower.includes('2nd') ||
        statusLower.includes('3rd') ||
        statusLower.includes('4th') ||
        statusLower.includes('ot') ||
        statusLower.includes(':') // Game clock time format (e.g., "2:57 - 1st")
      ) {
        gameStatus = 'live'
      }
      
      const { data: existingGame, error: gameError } = await supabase
        .from('game_scores')
        .upsert({
          game_id: game.id.toString(),
          week_number: weekNumber,
          season_year: seasonYear,
          home_team: game.home_team.abbreviation,
          away_team: game.visitor_team.abbreviation,
          game_status: gameStatus,
          game_start_time: game.date || game.datetime || game.scheduled_date || game.start_time || game.game_date || game.time || new Date().toISOString(),
          home_score: game.home_team_score || 0,
          away_score: game.visitor_team_score || 0,
          quarter: game.period || 0,
          time_remaining: game.status_text || game.clock || '00:00',
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'game_id'
        })
      
      if (gameError) {
        console.error('Error updating game score:', gameError)
        continue
      }

      // Only fetch player stats for games that are in progress or final
      if (game.status !== 'Scheduled' && game.status !== 'scheduled') {
        // Get player stats for this game
        const statsResponse = await fetch(`https://api.balldontlie.io/nfl/v1/stats?game_ids[]=${game.id}`, {
          headers: {
            'Authorization': apiKey
          }
        })
      
      if (!statsResponse.ok) {
        console.error(`Failed to fetch stats for game ${game.id}:`, statsResponse.statusText)
        continue
      }
      
      const statsData = await statsResponse.json()
      
      console.log(`📊 Game ${game.id}: API returned ${statsData.data?.length || 0} players with stats`)
      
      // Log what we're getting from the API for debugging
      if (statsData.data && statsData.data.length > 0) {
        const lamar = statsData.data.find((p: any) => p.player?.first_name === 'Lamar')
        if (lamar) {
          console.log('🏈 Lamar from API:', {
            name: `${lamar.player?.first_name} ${lamar.player?.last_name}`,
            pass_yds: lamar.passing_yards,
            pass_tds: lamar.passing_tds,
            rush_yds: lamar.rushing_yards,
            rush_tds: lamar.rushing_tds
          })
        } else {
          console.log('❌ Lamar Jackson NOT in API response')
        }
        
        // Log first 3 players to see what we're getting
        console.log('Sample players:', statsData.data.slice(0, 3).map((p: any) => 
          `${p.player?.first_name} ${p.player?.last_name}: ${p.passing_yards || 0}py, ${p.rushing_yards || 0}ry`
        ))
      }
      
      // Update player stats
      for (const playerStat of statsData.data) {
        // Find the player card
        const { data: playerCard, error: playerError } = await supabase
          .from('player_cards')
          .select('id')
          .eq('player_id', playerStat.player.id.toString())
          .single()
        
        if (playerError || !playerCard) {
          console.log(`Player card not found for player ID: ${playerStat.player.id}`)
          continue
        }

        // Prepare stats object - using correct BallDontLie API field names
        const stats = {
          passing_yards: playerStat.passing_yards || 0,
          passing_tds: playerStat.passing_touchdowns || 0,  // Fixed: was passing_tds
          interceptions: playerStat.passing_interceptions || 0,  // Fixed: was interceptions
          rushing_yards: playerStat.rushing_yards || 0,
          rushing_tds: playerStat.rushing_touchdowns || 0,  // Fixed: was rushing_tds
          receptions: playerStat.receptions || 0,
          receiving_yards: playerStat.receiving_yards || 0,
          receiving_tds: playerStat.receiving_touchdowns || 0,  // Fixed: was receiving_tds
          fumbles_lost: playerStat.fumbles_lost || 0,
          two_point_conversions: playerStat.two_point_conversions || 0,
        }

        const fantasyPoints = calculateFantasyPoints(stats)

        // Update player game stats
        const { error: statError } = await supabase
          .from('player_game_stats')
          .upsert({
            game_id: game.id.toString(),
            player_card_id: playerCard.id,
            week_number: weekNumber,
            season_year: seasonYear,
            stats: stats,
            fantasy_points: fantasyPoints,
            last_updated: new Date().toISOString()
          }, {
            onConflict: 'game_id,player_card_id'
          })
        
        if (statError) {
          console.error('Error updating player stats:', statError)
          continue
        }
      }
      } // Close the 'if game not scheduled' conditional

    } // Close the allGames loop

    // Update weekly lineups with new points
    const { data: lineups, error: lineupError } = await supabase
      .from('weekly_lineups')
      .select('id, lineup_snapshot')
      .eq('week_number', weekNumber)
      .eq('season_year', seasonYear)
      .in('status', ['pending', 'active'])
    
    if (lineupError) {
      console.error('Error fetching lineups:', lineupError)
    } else {
      for (const lineup of lineups || []) {
        const snapshot = lineup.lineup_snapshot
        let totalPoints = 0

        // Calculate points for each player in lineup
        for (const [position, playerData] of Object.entries(snapshot)) {
          if (playerData.player_card_id) {
            // Get latest stats for this player
            const { data: playerStats, error: statsError } = await supabase
              .from('player_game_stats')
              .select('fantasy_points')
              .eq('player_card_id', playerData.player_card_id)
              .eq('week_number', weekNumber)
              .eq('season_year', seasonYear)
              .single()
            
            if (!statsError && playerStats) {
              playerData.base_points = playerStats.fantasy_points
              
              // Apply token bonuses if any
              let tokenBonus = 0
              if (playerData.tokens && playerData.tokens.length > 0) {
                for (const tokenId of playerData.tokens) {
                  // Get token details and check if conditions are met
                  const { data: token } = await supabase
                    .from('token_cards')
                    .select('condition, bonus_points')
                    .eq('id', tokenId)
                    .single()
                  
                  if (token) {
                    // Simple condition checking - in production, make this more robust
                    const condition = token.condition
                    if (condition.stat === 'touchdowns' && stats.passing_tds + stats.rushing_tds + stats.receiving_tds >= condition.value) {
                      tokenBonus += token.bonus_points
                    }
                  }
                }
              }
              
              playerData.token_bonus = tokenBonus
              playerData.total_points = playerData.base_points + tokenBonus
              totalPoints += playerData.total_points
            }
          }
        }

        // Update lineup with new totals
        await supabase
          .from('weekly_lineups')
          .update({
            lineup_snapshot: snapshot,
            total_points: totalPoints
          })
          .eq('id', lineup.id)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated stats for ${allGames.length} games`,
        gamesUpdated: allGames.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in update-live-stats:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})