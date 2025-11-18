-- ================================================================
-- SIMULATION IMPROVEMENTS - Beat the Average System
-- ================================================================
-- This migration improves the simulated season experience:
-- 1. Better randomness with player quality weighting
-- 2. 3-loss elimination system
-- 3. Results history storage
-- 4. Improved score variance
-- ================================================================

-- 1. Create table to store weekly simulation results
CREATE TABLE IF NOT EXISTS simulated_week_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID NOT NULL REFERENCES simulated_seasons(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  season_year INTEGER NOT NULL,
  average_score DECIMAL(10, 2) NOT NULL,
  highest_score DECIMAL(10, 2) NOT NULL,
  lowest_score DECIMAL(10, 2) NOT NULL,
  teams_above_average INTEGER NOT NULL,
  teams_below_average INTEGER NOT NULL,
  teams_data JSONB NOT NULL, -- Array of {team_id, team_name, score, beat_average, is_bot}
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_season_week UNIQUE(season_id, week_number)
);

CREATE INDEX idx_simulated_results_season ON simulated_week_results(season_id);
CREATE INDEX idx_simulated_results_week ON simulated_week_results(season_id, week_number);

COMMENT ON TABLE simulated_week_results IS 'Stores historical results of simulated weeks for viewing past performance';

-- 2. Improved generate_simulated_points with player quality weighting
CREATE OR REPLACE FUNCTION generate_simulated_points_weighted(
  p_position TEXT,
  p_player_id UUID
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_base_min DECIMAL(10, 2);
  v_base_max DECIMAL(10, 2);
  v_projected DECIMAL(10, 2);
  v_quality_factor DECIMAL(10, 2);
  v_variance DECIMAL(10, 2);
  v_final_score DECIMAL(10, 2);
BEGIN
  -- Get player's weekly projected points (represents their quality/skill level)
  SELECT COALESCE(weekly_projected_points, 0) INTO v_projected
  FROM player_cards
  WHERE id = p_player_id;
  
  -- Set base ranges by position (wider ranges for more variance)
  CASE p_position
    WHEN 'Quarterback' THEN
      v_base_min := 0;
      v_base_max := 45;
    WHEN 'Running Back' THEN
      v_base_min := 0;
      v_base_max := 35;
    WHEN 'Wide Receiver' THEN
      v_base_min := 0;
      v_base_max := 30;
    WHEN 'Tight End' THEN
      v_base_min := 0;
      v_base_max := 20;
    ELSE
      v_base_min := 0;
      v_base_max := 15;
  END CASE;
  
  -- If we have projection data, use it to weight the score
  IF v_projected > 0 THEN
    -- Quality factor: higher projected points = higher floor and ceiling
    -- Scale projected points to 0-1 range based on position max
    v_quality_factor := LEAST(v_projected / v_base_max, 1.0);
    
    -- Generate score with quality weighting
    -- Better players have higher average but still have variance
    v_variance := RANDOM(); -- 0-1
    
    -- Weighted score: (quality * 0.7) + (random * 0.3)
    -- This means elite players are more consistent, backups more volatile
    v_final_score := v_base_min + ((v_quality_factor * 0.7 + v_variance * 0.3) * (v_base_max - v_base_min));
  ELSE
    -- No projection data, use pure random
    v_final_score := v_base_min + (RANDOM() * (v_base_max - v_base_min));
  END IF;
  
  RETURN ROUND(v_final_score, 1);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_simulated_points_weighted IS 'Generates random points weighted by player quality (weekly_projected_points)';

-- 3. Improved simulate_week with elimination and results storage
CREATE OR REPLACE FUNCTION simulate_week(p_season_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_current_week INTEGER;
  v_season_year INTEGER;
  v_team RECORD;
  v_lineup RECORD;
  v_total_points DECIMAL(10, 2);
  v_player_points DECIMAL(10, 2);
  v_position TEXT;
  v_results JSONB := '[]'::JSONB;
  v_all_scores DECIMAL(10, 2)[];
  v_average_score DECIMAL(10, 2);
  v_highest_score DECIMAL(10, 2) := 0;
  v_lowest_score DECIMAL(10, 2) := 999999;
  v_teams_above INTEGER := 0;
  v_teams_below INTEGER := 0;
  v_teams_data JSONB := '[]'::JSONB;
  v_active_teams INTEGER := 0;
BEGIN
  -- Get current week
  SELECT current_week INTO v_current_week
  FROM simulated_seasons
  WHERE id = p_season_id;
  
  -- Get season year
  SELECT season_year INTO v_season_year
  FROM nfl_season_config
  WHERE is_active = true
  LIMIT 1;
  
  -- Count active teams (not eliminated)
  SELECT COUNT(*) INTO v_active_teams
  FROM teams
  WHERE simulated_season_id = p_season_id AND is_active = true;
  
  IF v_active_teams = 0 THEN
    RAISE EXCEPTION 'No active teams remaining in season';
  END IF;
  
  -- Calculate points for each ACTIVE team's lineup
  FOR v_team IN 
    SELECT t.id as team_id, t.team_name, t.is_bot, t.losses
    FROM teams t
    WHERE t.simulated_season_id = p_season_id
      AND t.is_active = true -- Only simulate for active teams
  LOOP
    -- Get lineup for this team and week
    SELECT * INTO v_lineup
    FROM weekly_lineups
    WHERE team_id = v_team.team_id 
      AND week_number = v_current_week
      AND season_year = v_season_year;
    
    -- Skip if no lineup exists
    IF v_lineup.id IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Calculate total points from lineup_snapshot
    v_total_points := 0;
    
    -- Iterate through positions in lineup_snapshot
    FOR v_position IN SELECT * FROM jsonb_object_keys(v_lineup.lineup_snapshot)
    LOOP
      DECLARE
        v_player_data JSONB;
        v_player_id UUID;
        v_player_position TEXT;
      BEGIN
        v_player_data := v_lineup.lineup_snapshot->v_position;
        
        -- Skip if position is empty
        IF v_player_data IS NULL OR v_player_data = 'null'::jsonb THEN
          CONTINUE;
        END IF;
        
        -- Get player info
        v_player_id := (v_player_data->>'player_id')::UUID;
        
        IF v_player_id IS NOT NULL THEN
          -- Get player position from player_cards
          SELECT position INTO v_player_position
          FROM player_cards
          WHERE id = v_player_id;
          
          -- Generate weighted random points for this player
          v_player_points := generate_simulated_points_weighted(v_player_position, v_player_id);
          v_total_points := v_total_points + v_player_points;
        END IF;
      END;
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
    
    -- Track scores for average calculation
    v_all_scores := array_append(v_all_scores, v_total_points);
    v_highest_score := GREATEST(v_highest_score, v_total_points);
    v_lowest_score := LEAST(v_lowest_score, v_total_points);
    
    -- Add to results
    v_results := v_results || jsonb_build_object(
      'team_id', v_team.team_id,
      'team_name', v_team.team_name,
      'points', v_total_points,
      'is_bot', v_team.is_bot,
      'losses_before', v_team.losses
    );
  END LOOP;
  
  -- Calculate average score
  SELECT AVG(score) INTO v_average_score FROM unnest(v_all_scores) AS score;
  
  -- Determine wins/losses based on beating the average
  FOR v_team IN 
    SELECT 
      (r->>'team_id')::UUID as team_id,
      (r->>'team_name')::TEXT as team_name,
      (r->>'points')::DECIMAL(10,2) as points,
      (r->>'is_bot')::BOOLEAN as is_bot,
      (r->>'losses_before')::INTEGER as losses_before
    FROM jsonb_array_elements(v_results) r
  LOOP
    DECLARE
      v_beat_average BOOLEAN;
      v_new_losses INTEGER;
    BEGIN
      v_beat_average := v_team.points >= v_average_score;
      
      IF v_beat_average THEN
        -- Won this week (beat the average)
        UPDATE teams 
        SET wins = wins + 1
        WHERE id = v_team.team_id;
        
        v_teams_above := v_teams_above + 1;
      ELSE
        -- Lost this week (below average)
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
      
      -- Add to teams data for results storage
      v_teams_data := v_teams_data || jsonb_build_object(
        'team_id', v_team.team_id,
        'team_name', v_team.team_name,
        'score', v_team.points,
        'beat_average', v_beat_average,
        'is_bot', v_team.is_bot,
        'eliminated', v_new_losses >= 3
      );
    END;
  END LOOP;
  
  -- Store results in history table
  INSERT INTO simulated_week_results (
    season_id,
    week_number,
    season_year,
    average_score,
    highest_score,
    lowest_score,
    teams_above_average,
    teams_below_average,
    teams_data
  ) VALUES (
    p_season_id,
    v_current_week,
    v_season_year,
    v_average_score,
    v_highest_score,
    v_lowest_score,
    v_teams_above,
    v_teams_below,
    v_teams_data
  );
  
  -- Check if season is complete
  IF v_current_week >= 18 THEN
    UPDATE simulated_seasons
    SET is_complete = true, completed_at = NOW()
    WHERE id = p_season_id;
    
    RETURN jsonb_build_object(
      'week', v_current_week,
      'average', v_average_score,
      'highest', v_highest_score,
      'lowest', v_lowest_score,
      'teams_above', v_teams_above,
      'teams_below', v_teams_below,
      'results', v_results,
      'is_complete', true,
      'message', 'Season complete!'
    );
  ELSE
    -- Advance to next week
    UPDATE simulated_seasons
    SET current_week = v_current_week + 1
    WHERE id = p_season_id;
    
    -- Count remaining active teams
    SELECT COUNT(*) INTO v_active_teams
    FROM teams
    WHERE simulated_season_id = p_season_id AND is_active = true;
    
    RETURN jsonb_build_object(
      'week', v_current_week,
      'average', v_average_score,
      'highest', v_highest_score,
      'lowest', v_lowest_score,
      'teams_above', v_teams_above,
      'teams_below', v_teams_below,
      'active_teams_remaining', v_active_teams,
      'results', v_results,
      'is_complete', false,
      'message', format('Week %s complete! Average: %s pts', v_current_week, v_average_score)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION simulate_week IS 'Simulates a week in beat-the-average mode with elimination logic';

-- 4. Function to get historical week results
CREATE OR REPLACE FUNCTION get_simulated_week_history(
  p_season_id UUID,
  p_week_number INTEGER DEFAULT NULL
)
RETURNS TABLE (
  week INTEGER,
  average DECIMAL(10,2),
  your_score DECIMAL(10,2),
  your_rank INTEGER,
  beat_average BOOLEAN,
  teams_total INTEGER
) AS $$
BEGIN
  IF p_week_number IS NOT NULL THEN
    -- Get specific week
    RETURN QUERY
    SELECT 
      swr.week_number::INTEGER,
      swr.average_score,
      (swr.teams_data->team_idx->>'score')::DECIMAL(10,2),
      (
        SELECT COUNT(*) + 1
        FROM jsonb_array_elements(swr.teams_data) AS other_team
        WHERE (other_team->>'score')::DECIMAL(10,2) > (swr.teams_data->team_idx->>'score')::DECIMAL(10,2)
      )::INTEGER,
      (swr.teams_data->team_idx->>'beat_average')::BOOLEAN,
      jsonb_array_length(swr.teams_data)::INTEGER
    FROM simulated_week_results swr,
         LATERAL (
           SELECT ordinality - 1 AS team_idx
           FROM jsonb_array_elements(swr.teams_data) WITH ORDINALITY
           WHERE (value->>'is_bot')::BOOLEAN = false
           LIMIT 1
         ) user_team
    WHERE swr.season_id = p_season_id
      AND swr.week_number = p_week_number;
  ELSE
    -- Get all weeks
    RETURN QUERY
    SELECT 
      swr.week_number::INTEGER,
      swr.average_score,
      (swr.teams_data->team_idx->>'score')::DECIMAL(10,2),
      (
        SELECT COUNT(*) + 1
        FROM jsonb_array_elements(swr.teams_data) AS other_team
        WHERE (other_team->>'score')::DECIMAL(10,2) > (swr.teams_data->team_idx->>'score')::DECIMAL(10,2)
      )::INTEGER,
      (swr.teams_data->team_idx->>'beat_average')::BOOLEAN,
      jsonb_array_length(swr.teams_data)::INTEGER
    FROM simulated_week_results swr,
         LATERAL (
           SELECT ordinality - 1 AS team_idx
           FROM jsonb_array_elements(swr.teams_data) WITH ORDINALITY
           WHERE (value->>'is_bot')::BOOLEAN = false
           LIMIT 1
         ) user_team
    WHERE swr.season_id = p_season_id
    ORDER BY swr.week_number;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_simulated_week_history IS 'Gets historical performance for user team in simulated season';

-- 5. Grant permissions
GRANT SELECT ON simulated_week_results TO authenticated;
GRANT EXECUTE ON FUNCTION generate_simulated_points_weighted TO authenticated;
GRANT EXECUTE ON FUNCTION simulate_week TO authenticated;
GRANT EXECUTE ON FUNCTION get_simulated_week_history TO authenticated;
