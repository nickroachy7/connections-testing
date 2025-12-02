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
      .from('nfl_season_config')
      .select('*')
      .eq('is_active', true)
      .single()
    
    if (weekError || !weekConfig) {
      throw new Error('Failed to get current NFL week from config')
    }
    
    const { season_year: seasonYear, current_week: weekNumber } = weekConfig

    console.log(`Creating lineup snapshots for Week ${weekNumber}, ${seasonYear}`)

    // Get all active teams
    const { data: activeTeams, error: teamsError } = await supabase
      .from('teams')
      .select('id, user_id, team_name')
      .eq('is_active', true)

    if (teamsError) {
      throw new Error(`Error fetching teams: ${teamsError.message}`)
    }

    let snapshotsCreated = 0
    let snapshotsSkipped = 0
    let teamsWithoutLineups = 0

    // Batch check for existing snapshots
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
        snapshotsSkipped++
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
            team_abbreviation,
            weekly_projected_points
          )
        `)
        .eq('team_id', team.id)
        .eq('is_in_lineup', true)

      if (lineupError) {
        console.error(`Error fetching lineup for team ${team.id}:`, lineupError)
        continue
      }

      if (!lineup || lineup.length === 0) {
        console.log(`No lineup set for team ${team.team_name} (${team.id})`)
        teamsWithoutLineups++
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
            player_id: player.id,
            player_card_id: player.player_card_id,
            player_name: player.player_card.player_name,
            position: player.player_card.position,
            team: player.player_card.team_abbreviation,
            card_tier: player.card_tier,
            card_level: player.card_level,
            projected_points: player.player_card.weekly_projected_points || 0,
            tokens: appliedToken ? [appliedToken.id] : [],
            token_names: appliedToken ? [appliedToken.name] : [],
            base_points: 0,
            token_bonus: 0,
            total_points: 0
          }
        }
      })

      // Calculate total projected points from lineup snapshot
      const totalProjectedPoints = Object.values(lineupSnapshot).reduce((sum: number, player: any) => {
        return sum + (parseFloat(player.projected_points) || 0);
      }, 0);

      // Create snapshot with projected_points for historical tracking
      const { error: insertError } = await supabase
        .from('weekly_lineups')
        .insert({
          team_id: team.id,
          week_number: weekNumber,
          season_year: seasonYear,
          lineup_snapshot: lineupSnapshot,
          total_points: 0,
          projected_points: Math.round(totalProjectedPoints * 10) / 10, // Round to 1 decimal
          status: 'pending'
        })

      if (insertError) {
        console.error(`Error creating snapshot for team ${team.id}:`, insertError)
      } else {
        snapshotsCreated++
        console.log(`Created snapshot for team ${team.team_name} (${team.id})`)
      }
    }

    console.log(`\nSummary:`)
    console.log(`  - Snapshots created: ${snapshotsCreated}`)
    console.log(`  - Snapshots skipped (already exist): ${snapshotsSkipped}`)
    console.log(`  - Teams without lineups: ${teamsWithoutLineups}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created ${snapshotsCreated} lineup snapshots for Week ${weekNumber}`,
        snapshots_created: snapshotsCreated,
        snapshots_skipped: snapshotsSkipped,
        teams_without_lineups: teamsWithoutLineups,
        week_number: weekNumber,
        season_year: seasonYear
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in create-lineup-snapshots:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
