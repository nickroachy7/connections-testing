-- Dynamic Fantasy Points Calculation with PPR Support
-- Date: 2024-11-07
-- Purpose: Calculate fantasy points dynamically based on contest type PPR scoring

-- ============================================================================
-- STEP 1: Create function to calculate fantasy points with dynamic PPR
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_fantasy_points(
  p_stats JSONB,
  p_position TEXT,
  p_scoring_type TEXT DEFAULT 'half_ppr'
)
RETURNS NUMERIC AS $$
DECLARE
  v_points NUMERIC := 0;
  v_receptions INTEGER;
  v_ppr_multiplier NUMERIC;
BEGIN
  -- Determine PPR multiplier based on scoring type
  CASE p_scoring_type
    WHEN 'full_ppr' THEN v_ppr_multiplier := 1.0;
    WHEN 'half_ppr' THEN v_ppr_multiplier := 0.5;
    WHEN 'standard' THEN v_ppr_multiplier := 0.0;
    ELSE v_ppr_multiplier := 0.5; -- Default to half PPR
  END CASE;
  
  -- ==========================
  -- PASSING STATS (QB, WR trick plays, etc.)
  -- ==========================
  v_points := v_points + COALESCE((p_stats->>'passing_yards')::numeric, 0) * 0.04;  -- 1 pt per 25 yards
  v_points := v_points + COALESCE((p_stats->>'passing_tds')::numeric, 0) * 4;       -- 4 pts per TD
  v_points := v_points + COALESCE((p_stats->>'interceptions')::numeric, 0) * -2;    -- -2 pts per INT
  v_points := v_points + COALESCE((p_stats->>'passing_2pt')::numeric, 0) * 2;       -- 2 pts per 2PT conversion
  
  -- ==========================
  -- RUSHING STATS (RB, QB, WR)
  -- ==========================
  v_points := v_points + COALESCE((p_stats->>'rushing_yards')::numeric, 0) * 0.1;   -- 1 pt per 10 yards
  v_points := v_points + COALESCE((p_stats->>'rushing_tds')::numeric, 0) * 6;       -- 6 pts per TD
  v_points := v_points + COALESCE((p_stats->>'rushing_2pt')::numeric, 0) * 2;       -- 2 pts per 2PT conversion
  
  -- ==========================
  -- RECEIVING STATS (WR, RB, TE)
  -- ==========================
  v_receptions := COALESCE((p_stats->>'receptions')::integer, 0);
  v_points := v_points + COALESCE((p_stats->>'receiving_yards')::numeric, 0) * 0.1; -- 1 pt per 10 yards
  v_points := v_points + COALESCE((p_stats->>'receiving_tds')::numeric, 0) * 6;     -- 6 pts per TD
  v_points := v_points + COALESCE((p_stats->>'receiving_2pt')::numeric, 0) * 2;     -- 2 pts per 2PT conversion
  
  -- Apply PPR (Points Per Reception)
  v_points := v_points + (v_receptions * v_ppr_multiplier);
  
  -- ==========================
  -- KICKING STATS (K)
  -- ==========================
  IF p_position = 'Kicker' THEN
    -- Field Goals
    v_points := v_points + COALESCE((p_stats->>'fg_made_0_19')::numeric, 0) * 3;    -- 0-19 yards
    v_points := v_points + COALESCE((p_stats->>'fg_made_20_29')::numeric, 0) * 3;   -- 20-29 yards
    v_points := v_points + COALESCE((p_stats->>'fg_made_30_39')::numeric, 0) * 3;   -- 30-39 yards
    v_points := v_points + COALESCE((p_stats->>'fg_made_40_49')::numeric, 0) * 4;   -- 40-49 yards
    v_points := v_points + COALESCE((p_stats->>'fg_made_50_plus')::numeric, 0) * 5; -- 50+ yards
    
    -- Extra Points
    v_points := v_points + COALESCE((p_stats->>'extra_points_made')::numeric, 0) * 1;
    
    -- Missed kicks penalties
    v_points := v_points + COALESCE((p_stats->>'fg_missed')::numeric, 0) * -1;
    v_points := v_points + COALESCE((p_stats->>'extra_points_missed')::numeric, 0) * -1;
  END IF;
  
  -- ==========================
  -- DEFENSIVE STATS (DEF)
  -- ==========================
  IF p_position = 'Defense' THEN
    -- Points allowed (inverse scoring)
    DECLARE
      v_points_allowed INTEGER := COALESCE((p_stats->>'points_allowed')::integer, 0);
    BEGIN
      IF v_points_allowed = 0 THEN
        v_points := v_points + 10;
      ELSIF v_points_allowed <= 6 THEN
        v_points := v_points + 7;
      ELSIF v_points_allowed <= 13 THEN
        v_points := v_points + 4;
      ELSIF v_points_allowed <= 20 THEN
        v_points := v_points + 1;
      ELSIF v_points_allowed <= 27 THEN
        v_points := v_points + 0;
      ELSIF v_points_allowed <= 34 THEN
        v_points := v_points - 1;
      ELSE
        v_points := v_points - 4;
      END IF;
    END;
    
    -- Defensive stats
    v_points := v_points + COALESCE((p_stats->>'sacks')::numeric, 0) * 1;
    v_points := v_points + COALESCE((p_stats->>'interceptions')::numeric, 0) * 2;
    v_points := v_points + COALESCE((p_stats->>'fumbles_recovered')::numeric, 0) * 2;
    v_points := v_points + COALESCE((p_stats->>'safeties')::numeric, 0) * 2;
    v_points := v_points + COALESCE((p_stats->>'defensive_tds')::numeric, 0) * 6;
    v_points := v_points + COALESCE((p_stats->>'blocked_kicks')::numeric, 0) * 2;
  END IF;
  
  -- ==========================
  -- FUMBLES (applies to all positions)
  -- ==========================
  v_points := v_points + COALESCE((p_stats->>'fumbles_lost')::numeric, 0) * -2;
  
  RETURN ROUND(v_points, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_fantasy_points IS 'Calculates fantasy points from raw stats with dynamic PPR scoring (standard, half_ppr, full_ppr)';

-- ============================================================================
-- STEP 2: Create view for player stats with dynamic fantasy points
-- ============================================================================

CREATE OR REPLACE VIEW player_game_stats_with_contest_scoring AS
SELECT 
  pgs.id,
  pgs.game_id,
  pgs.player_card_id,
  pgs.week_number,
  pgs.season_year,
  pgs.stats,
  pgs.last_updated,
  
  -- Player info
  pc.player_name,
  pc.position,
  pc.team_abbreviation,
  
  -- Original fantasy points (for reference/migration)
  pgs.fantasy_points as original_fantasy_points,
  
  -- Dynamically calculated points for each scoring type
  calculate_fantasy_points(pgs.stats, pc.position, 'standard') as points_standard,
  calculate_fantasy_points(pgs.stats, pc.position, 'half_ppr') as points_half_ppr,
  calculate_fantasy_points(pgs.stats, pc.position, 'full_ppr') as points_full_ppr
  
FROM player_game_stats pgs
JOIN player_cards pc ON pc.id = pgs.player_card_id;

COMMENT ON VIEW player_game_stats_with_contest_scoring IS 'Player game stats with fantasy points calculated for all three PPR scoring types';

-- ============================================================================
-- STEP 3: Create function to get fantasy points for a specific team's scoring type
-- ============================================================================

CREATE OR REPLACE FUNCTION get_player_fantasy_points_for_team(
  p_player_card_id UUID,
  p_week_number INTEGER,
  p_season_year INTEGER,
  p_team_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
  v_scoring_type TEXT;
  v_stats JSONB;
  v_position TEXT;
  v_points NUMERIC;
BEGIN
  -- Get the team's contest scoring type
  SELECT ct.scoring_type INTO v_scoring_type
  FROM teams t
  JOIN contest_types ct ON ct.id = t.contest_type_id
  WHERE t.id = p_team_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team not found or has no contest type: %', p_team_id;
  END IF;
  
  -- Get player stats and position
  SELECT pgs.stats, pc.position INTO v_stats, v_position
  FROM player_game_stats pgs
  JOIN player_cards pc ON pc.id = pgs.player_card_id
  WHERE pgs.player_card_id = p_player_card_id
    AND pgs.week_number = p_week_number
    AND pgs.season_year = p_season_year;
  
  IF NOT FOUND THEN
    RETURN 0; -- No stats recorded yet
  END IF;
  
  -- Calculate points using team's scoring type
  v_points := calculate_fantasy_points(v_stats, v_position, v_scoring_type);
  
  RETURN v_points;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_player_fantasy_points_for_team IS 'Gets fantasy points for a player in a specific week using the team''s contest type scoring system';

-- ============================================================================
-- STEP 4: Create function to calculate lineup total for a team
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_lineup_total_for_team(
  p_lineup_id UUID,
  p_team_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
  v_total_points NUMERIC := 0;
  v_scoring_type TEXT;
  v_player RECORD;
BEGIN
  -- Get team's scoring type
  SELECT ct.scoring_type INTO v_scoring_type
  FROM teams t
  JOIN contest_types ct ON ct.id = t.contest_type_id
  WHERE t.id = p_team_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Sum up all players in the lineup using correct scoring
  FOR v_player IN
    SELECT 
      pgs.stats,
      pc.position
    FROM weekly_lineups wl
    JOIN LATERAL jsonb_array_elements(wl.lineup_snapshot->'starters') AS starter ON true
    JOIN player_cards pc ON pc.id = (starter->>'player_card_id')::uuid
    LEFT JOIN player_game_stats pgs ON pgs.player_card_id = pc.id 
      AND pgs.week_number = wl.week_number 
      AND pgs.season_year = wl.season_year
    WHERE wl.id = p_lineup_id
  LOOP
    IF v_player.stats IS NOT NULL THEN
      v_total_points := v_total_points + calculate_fantasy_points(
        v_player.stats, 
        v_player.position, 
        v_scoring_type
      );
    END IF;
  END LOOP;
  
  RETURN ROUND(v_total_points, 2);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_lineup_total_for_team IS 'Calculates total fantasy points for a lineup using the team''s contest type scoring';

-- ============================================================================
-- VERIFICATION QUERIES (commented out, for manual testing)
-- ============================================================================

-- Test PPR differences for a player:
-- SELECT 
--   player_name,
--   position,
--   stats->>'receptions' as receptions,
--   points_standard,
--   points_half_ppr,
--   points_full_ppr,
--   (points_full_ppr - points_standard) as ppr_difference
-- FROM player_game_stats_with_contest_scoring
-- WHERE week_number = 1
-- ORDER BY ppr_difference DESC
-- LIMIT 10;

-- Test calculate_fantasy_points directly:
-- SELECT calculate_fantasy_points(
--   '{"receptions": 8, "receiving_yards": 95, "receiving_tds": 1}'::jsonb,
--   'Wide Receiver',
--   'full_ppr'
-- ) as full_ppr_points,
-- calculate_fantasy_points(
--   '{"receptions": 8, "receiving_yards": 95, "receiving_tds": 1}'::jsonb,
--   'Wide Receiver',
--   'half_ppr'
-- ) as half_ppr_points;
