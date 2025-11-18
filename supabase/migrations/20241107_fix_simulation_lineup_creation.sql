-- ================================================================
-- FIX: Auto-create lineups before simulation
-- ================================================================
-- The simulate_week function needs lineups to exist before calculating
-- points. This update ensures lineups are created if missing.
-- ================================================================

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
  v_lineup_snapshot JSONB;
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
  
  -- FIRST: Ensure all active teams have lineups for this week
  -- Copy from week 1 if needed (bots and user team)
  FOR v_team IN 
    SELECT t.id as team_id, t.team_name, t.is_bot
    FROM teams t
    WHERE t.simulated_season_id = p_season_id
      AND t.is_active = true
  LOOP
    -- Check if lineup exists for this week
    SELECT id INTO v_lineup
    FROM weekly_lineups
    WHERE team_id = v_team.team_id 
      AND week_number = v_current_week
      AND season_year = v_season_year;
    
    -- If no lineup exists, create one by copying from week 1
    IF v_lineup IS NULL THEN
      -- Get week 1 lineup snapshot
      SELECT lineup_snapshot INTO v_lineup_snapshot
      FROM weekly_lineups
      WHERE team_id = v_team.team_id
        AND week_number = 1
        AND season_year = v_season_year
      LIMIT 1;
      
      -- Only create if we found a week 1 lineup
      IF v_lineup_snapshot IS NOT NULL THEN
        INSERT INTO weekly_lineups (
          team_id,
          week_number,
          season_year,
          lineup_snapshot,
          status
        ) VALUES (
          v_team.team_id,
          v_current_week,
          v_season_year,
          v_lineup_snapshot,
          'pending'
        );
      END IF;
    END IF;
  END LOOP;
  
  -- NOW: Calculate points for each ACTIVE team's lineup
  FOR v_team IN 
    SELECT t.id as team_id, t.team_name, t.is_bot, t.losses
    FROM teams t
    WHERE t.simulated_season_id = p_season_id
      AND t.is_active = true
  LOOP
    -- Get lineup for this team and week (should exist now)
    SELECT * INTO v_lineup
    FROM weekly_lineups
    WHERE team_id = v_team.team_id 
      AND week_number = v_current_week
      AND season_year = v_season_year;
    
    -- Skip if no lineup exists (shouldn't happen now)
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
    
    -- Build result for this team
    v_results := v_results || jsonb_build_object(
      'team_id', v_team.team_id,
      'team_name', v_team.team_name,
      'is_bot', v_team.is_bot,
      'score', v_total_points
    );
  END LOOP;
  
  -- Calculate average score from all teams
  IF array_length(v_all_scores, 1) > 0 THEN
    SELECT AVG(score) INTO v_average_score
    FROM unnest(v_all_scores) AS score;
  ELSE
    RAISE EXCEPTION 'No teams with scores found';
  END IF;
  
  -- Update wins/losses based on beating the average
  FOR v_team IN 
    SELECT t.id as team_id, t.team_name, t.losses, wl.total_points
    FROM teams t
    JOIN weekly_lineups wl ON wl.team_id = t.id
    WHERE t.simulated_season_id = p_season_id
      AND t.is_active = true
      AND wl.week_number = v_current_week
      AND wl.season_year = v_season_year
  LOOP
    IF v_team.total_points >= v_average_score THEN
      -- Beat the average - WIN
      UPDATE teams
      SET wins = wins + 1
      WHERE id = v_team.team_id;
      
      v_teams_above := v_teams_above + 1;
      
      -- Add to teams_data
      v_teams_data := v_teams_data || jsonb_build_object(
        'team_id', v_team.team_id,
        'team_name', v_team.team_name,
        'score', v_team.total_points,
        'beat_average', true
      );
    ELSE
      -- Below average - LOSS
      UPDATE teams
      SET losses = losses + 1
      WHERE id = v_team.team_id;
      
      v_teams_below := v_teams_below + 1;
      
      -- Check if team should be eliminated (3 losses)
      IF v_team.losses + 1 >= 3 THEN
        UPDATE teams
        SET is_active = false,
            eliminated_at = NOW()
        WHERE id = v_team.team_id;
      END IF;
      
      -- Add to teams_data
      v_teams_data := v_teams_data || jsonb_build_object(
        'team_id', v_team.team_id,
        'team_name', v_team.team_name,
        'score', v_team.total_points,
        'beat_average', false
      );
    END IF;
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
  
  -- Advance to next week
  UPDATE simulated_seasons
  SET current_week = current_week + 1
  WHERE id = p_season_id;
  
  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'week', v_current_week,
    'average_score', v_average_score,
    'highest_score', v_highest_score,
    'lowest_score', v_lowest_score,
    'teams_above_average', v_teams_above,
    'teams_below_average', v_teams_below,
    'teams_data', v_teams_data
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION simulate_week IS 'Simulates a week for all active teams in a simulated season, auto-creating lineups if needed';
