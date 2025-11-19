-- ============================================================================
-- SWITCH FROM AVERAGE TO MEDIAN SCORING
-- ============================================================================
-- This migration updates the system to use median scores instead of average
-- scores for determining wins/losses across all game modes.
--
-- Changes:
-- 1. Rename beat_average column to beat_median (keep old for compatibility)
-- 2. Update simulated season functions to use median
-- 3. Update trigger functions to calculate and use median
-- ============================================================================

-- ============================================================================
-- PART 1: Add beat_median column (keep beat_average for backward compatibility)
-- ============================================================================

-- Add beat_median column to weekly_lineups if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'weekly_lineups' 
    AND column_name = 'beat_median'
  ) THEN
    ALTER TABLE weekly_lineups ADD COLUMN beat_median BOOLEAN;
    
    COMMENT ON COLUMN weekly_lineups.beat_median IS 'Whether this lineup scored at or above the median score for the week';
  END IF;
  
  -- Also add beat_average if it doesn't exist (for compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'weekly_lineups' 
    AND column_name = 'beat_average'
  ) THEN
    ALTER TABLE weekly_lineups ADD COLUMN beat_average BOOLEAN;
    
    COMMENT ON COLUMN weekly_lineups.beat_average IS 'LEGACY: Same as beat_median, kept for compatibility';
  END IF;
END $$;

-- ============================================================================
-- PART 2: Update simulate_week function to use MEDIAN instead of AVERAGE
-- ============================================================================

CREATE OR REPLACE FUNCTION simulate_week(p_season_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_season_year INTEGER;
  v_current_week INTEGER;
  v_team RECORD;
  v_player RECORD;
  v_lineup RECORD;
  v_total_points DECIMAL(10, 2);
  v_all_scores DECIMAL(10, 2)[] := ARRAY[]::DECIMAL[];
  v_median_score DECIMAL(10, 2);
  v_highest_score DECIMAL(10, 2) := 0;
  v_lowest_score DECIMAL(10, 2) := 999999;
  v_results JSONB := '[]'::JSONB;
  v_teams_data JSONB := '[]'::JSONB;
  v_teams_above INTEGER := 0;
  v_teams_below INTEGER := 0;
  v_active_count INTEGER;
BEGIN
  -- Get season info
  SELECT season_year, current_week + 1 
  INTO v_season_year, v_current_week
  FROM simulated_seasons
  WHERE id = p_season_id;
  
  IF v_season_year IS NULL THEN
    RAISE EXCEPTION 'Season not found: %', p_season_id;
  END IF;
  
  RAISE NOTICE 'Simulating Week % for season %', v_current_week, v_season_year;
  
  -- Get all active teams in this simulation
  FOR v_team IN 
    SELECT t.id as team_id, t.team_name, t.user_id, t.is_bot, t.losses
    FROM teams t
    WHERE t.simulated_season_id = p_season_id 
      AND t.is_active = true
  LOOP
    v_total_points := 0;
    
    -- Get lineup for this week
    SELECT * INTO v_lineup
    FROM weekly_lineups
    WHERE team_id = v_team.team_id
      AND week_number = v_current_week
      AND season_year = v_season_year;
    
    IF v_lineup.id IS NULL THEN
      RAISE NOTICE 'No lineup found for team % week %', v_team.team_name, v_current_week;
      CONTINUE;
    END IF;
    
    -- Calculate points from lineup_snapshot
    FOR v_player IN 
      SELECT 
        (player->>'position')::TEXT as position,
        (player->>'fantasy_points')::DECIMAL(10,2) as fantasy_points
      FROM jsonb_array_elements(v_lineup.lineup_snapshot) player
    LOOP
      v_total_points := v_total_points + COALESCE(v_player.fantasy_points, 0);
    END LOOP;
    
    -- Update lineup with total points
    UPDATE weekly_lineups
    SET total_points = v_total_points,
        status = 'completed'
    WHERE id = v_lineup.id;
    
    -- Update team's total points
    UPDATE teams
    SET total_points = total_points + v_total_points
    WHERE id = v_team.team_id;
    
    -- Track scores for median calculation
    v_all_scores := array_append(v_all_scores, v_total_points);
    v_highest_score := GREATEST(v_highest_score, v_total_points);
    v_lowest_score := LEAST(v_lowest_score, v_total_points);
    
    -- Build result for this team
    v_results := v_results || jsonb_build_object(
      'team_id', v_team.team_id,
      'team_name', v_team.team_name,
      'is_bot', v_team.is_bot,
      'score', v_total_points,
      'losses_before', v_team.losses
    );
  END LOOP;
  
  -- Calculate MEDIAN score (instead of average)
  IF array_length(v_all_scores, 1) > 0 THEN
    -- Sort scores
    SELECT score INTO v_median_score
    FROM unnest(v_all_scores) AS score
    ORDER BY score
    LIMIT 1 OFFSET (array_length(v_all_scores, 1) / 2);
    
    -- For even number of scores, take average of middle two
    IF array_length(v_all_scores, 1) % 2 = 0 THEN
      DECLARE
        v_mid1 DECIMAL(10, 2);
        v_mid2 DECIMAL(10, 2);
      BEGIN
        SELECT score INTO v_mid1
        FROM unnest(v_all_scores) AS score
        ORDER BY score
        LIMIT 1 OFFSET (array_length(v_all_scores, 1) / 2 - 1);
        
        SELECT score INTO v_mid2
        FROM unnest(v_all_scores) AS score
        ORDER BY score
        LIMIT 1 OFFSET (array_length(v_all_scores, 1) / 2);
        
        v_median_score := (v_mid1 + v_mid2) / 2;
      END;
    END IF;
  ELSE
    v_median_score := 0;
  END IF;
  
  -- Determine wins/losses based on beating the MEDIAN
  FOR v_team IN 
    SELECT 
      (r->>'team_id')::UUID as team_id,
      (r->>'team_name')::TEXT as team_name,
      (r->>'score')::DECIMAL(10,2) as points,
      (r->>'is_bot')::BOOLEAN as is_bot,
      (r->>'losses_before')::INTEGER as losses_before
    FROM jsonb_array_elements(v_results) r
  LOOP
    DECLARE
      v_beat_median BOOLEAN;
      v_new_losses INTEGER;
    BEGIN
      v_beat_median := v_team.points >= v_median_score;
      
      IF v_beat_median THEN
        -- Won this week (beat the median)
        UPDATE teams 
        SET wins = wins + 1
        WHERE id = v_team.team_id;
        
        v_teams_above := v_teams_above + 1;
      ELSE
        -- Lost this week (below median)
        UPDATE teams 
        SET losses = losses + 1
        WHERE id = v_team.team_id
        RETURNING losses INTO v_new_losses;
        
        v_teams_below := v_teams_below + 1;
        
        -- Check for elimination (3 losses)
        IF v_new_losses >= 3 THEN
          UPDATE teams
          SET is_active = false,
              eliminated_at = NOW()
          WHERE id = v_team.team_id;
          
          RAISE NOTICE 'Team % eliminated with 3 losses', v_team.team_name;
        END IF;
      END IF;
      
      -- Update lineup with beat_median flag
      UPDATE weekly_lineups
      SET beat_median = v_beat_median,
          beat_average = v_beat_median  -- Keep beat_average in sync for now
      WHERE team_id = v_team.team_id
        AND week_number = v_current_week
        AND season_year = v_season_year;
      
      -- Add to teams data for results storage
      v_teams_data := v_teams_data || jsonb_build_object(
        'team_id', v_team.team_id,
        'team_name', v_team.team_name,
        'score', v_team.points,
        'beat_median', v_beat_median,
        'beat_average', v_beat_median,  -- Keep for compatibility
        'is_bot', v_team.is_bot,
        'eliminated', v_new_losses >= 3
      );
    END;
  END LOOP;
  
  -- Store results in history table (update to use median_score)
  INSERT INTO simulated_week_results (
    season_id,
    week_number,
    season_year,
    average_score,  -- Keep for compatibility, will equal median
    median_score,
    highest_score,
    lowest_score,
    teams_above_average,  -- Keep naming for compatibility
    teams_below_average,
    teams_data
  ) VALUES (
    p_season_id,
    v_current_week,
    v_season_year,
    v_median_score,  -- Store median in average field for compatibility
    v_median_score,
    v_highest_score,
    v_lowest_score,
    v_teams_above,
    v_teams_below,
    v_teams_data
  );
  
  -- Update season's current week
  UPDATE simulated_seasons
  SET current_week = v_current_week,
      updated_at = NOW()
  WHERE id = p_season_id;
  
  -- Count remaining active teams
  SELECT COUNT(*) INTO v_active_count
  FROM teams
  WHERE simulated_season_id = p_season_id AND is_active = true;
  
  RETURN jsonb_build_object(
    'success', true,
    'week', v_current_week,
    'season_year', v_season_year,
    'median_score', v_median_score,
    'average_score', v_median_score,  -- Return same value for compatibility
    'highest_score', v_highest_score,
    'lowest_score', v_lowest_score,
    'teams_above', v_teams_above,
    'teams_below', v_teams_below,
    'active_teams', v_active_count,
    'message', format('Week %s complete! Median: %s pts', v_current_week, v_median_score)
  );
END;
$$;

COMMENT ON FUNCTION simulate_week IS 'Simulates a week in beat-the-median mode with elimination logic';

-- ============================================================================
-- PART 3: Add median_score column to simulated_week_results if needed
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'simulated_week_results' 
    AND column_name = 'median_score'
  ) THEN
    ALTER TABLE simulated_week_results ADD COLUMN median_score DECIMAL(10, 2);
    
    -- Copy average_score to median_score for existing data
    UPDATE simulated_week_results SET median_score = average_score WHERE median_score IS NULL;
    
    COMMENT ON COLUMN simulated_week_results.median_score IS 'Median score for the week (used for win/loss determination)';
  END IF;
END $$;

-- ============================================================================
-- DONE
-- ============================================================================
-- The system now uses MEDIAN scoring for determining wins/losses
-- - Real contests: finalize-week edge function uses median_score
-- - Simulated seasons: simulate_week function uses median calculation
-- - Both beat_median and beat_average columns exist (kept in sync for compatibility)
