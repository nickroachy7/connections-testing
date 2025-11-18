-- Simulated Season Improvements Migration
-- Date: 2024-11-06
-- Purpose: Fix bot team lineup creation and improve simulated season functionality

-- 1. Fix create_bot_team to use lineup_snapshot instead of lineup_positions
CREATE OR REPLACE FUNCTION create_bot_team(
  p_season_id UUID,
  p_bot_number INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_team_id UUID;
  v_current_week INTEGER;
  v_season_year INTEGER;
  v_player_card RECORD;
  v_bot_name TEXT;
  v_user_id UUID;
  v_qb_id UUID;
  v_rb1_id UUID;
  v_rb2_id UUID;
  v_wr1_id UUID;
  v_wr2_id UUID;
  v_te_id UUID;
BEGIN
  -- Generate bot team name
  v_bot_name := 'Bot Team ' || p_bot_number;
  
  -- Get current NFL week
  SELECT current_week, season_year INTO v_current_week, v_season_year
  FROM nfl_season_config
  WHERE is_active = true
  LIMIT 1;
  
  -- Get user_id from season
  SELECT user_id INTO v_user_id FROM simulated_seasons WHERE id = p_season_id;
  
  -- Create the bot team
  INSERT INTO teams (
    user_id, 
    team_name, 
    is_active, 
    current_week, 
    coins, 
    simulated_season_id,
    is_bot
  )
  VALUES (
    v_user_id,
    v_bot_name,
    false,
    v_current_week,
    1000,
    p_season_id,
    true
  )
  RETURNING id INTO v_team_id;
  
  -- Give bot team 6 players (1 QB, 2 RB, 2 WR, 1 TE)
  -- QB
  SELECT id INTO v_qb_id FROM player_cards 
  WHERE position = 'Quarterback' AND is_active = true 
  ORDER BY RANDOM() LIMIT 1;
  
  IF v_qb_id IS NOT NULL THEN
    INSERT INTO user_player_inventory (user_id, team_id, player_card_id, is_in_lineup, lineup_position)
    VALUES (v_user_id, v_team_id, v_qb_id, true, 'QB');
  END IF;
  
  -- RB (2)
  SELECT id INTO v_rb1_id FROM player_cards 
  WHERE position = 'Running Back' AND is_active = true 
  ORDER BY RANDOM() LIMIT 1;
  
  IF v_rb1_id IS NOT NULL THEN
    INSERT INTO user_player_inventory (user_id, team_id, player_card_id, is_in_lineup, lineup_position)
    VALUES (v_user_id, v_team_id, v_rb1_id, true, 'RB1');
  END IF;
  
  SELECT id INTO v_rb2_id FROM player_cards 
  WHERE position = 'Running Back' AND is_active = true AND id != v_rb1_id
  ORDER BY RANDOM() LIMIT 1;
  
  IF v_rb2_id IS NOT NULL THEN
    INSERT INTO user_player_inventory (user_id, team_id, player_card_id, is_in_lineup, lineup_position)
    VALUES (v_user_id, v_team_id, v_rb2_id, true, 'RB2');
  END IF;
  
  -- WR (2)
  SELECT id INTO v_wr1_id FROM player_cards 
  WHERE position = 'Wide Receiver' AND is_active = true 
  ORDER BY RANDOM() LIMIT 1;
  
  IF v_wr1_id IS NOT NULL THEN
    INSERT INTO user_player_inventory (user_id, team_id, player_card_id, is_in_lineup, lineup_position)
    VALUES (v_user_id, v_team_id, v_wr1_id, true, 'WR1');
  END IF;
  
  SELECT id INTO v_wr2_id FROM player_cards 
  WHERE position = 'Wide Receiver' AND is_active = true AND id != v_wr1_id
  ORDER BY RANDOM() LIMIT 1;
  
  IF v_wr2_id IS NOT NULL THEN
    INSERT INTO user_player_inventory (user_id, team_id, player_card_id, is_in_lineup, lineup_position)
    VALUES (v_user_id, v_team_id, v_wr2_id, true, 'WR2');
  END IF;
  
  -- TE
  SELECT id INTO v_te_id FROM player_cards 
  WHERE position = 'Tight End' AND is_active = true 
  ORDER BY RANDOM() LIMIT 1;
  
  IF v_te_id IS NOT NULL THEN
    INSERT INTO user_player_inventory (user_id, team_id, player_card_id, is_in_lineup, lineup_position)
    VALUES (v_user_id, v_team_id, v_te_id, true, 'TE');
  END IF;
  
  -- Create weekly_lineup with lineup_snapshot
  INSERT INTO weekly_lineups (team_id, week_number, season_year, lineup_snapshot, total_points)
  VALUES (
    v_team_id,
    v_current_week,
    v_season_year,
    jsonb_build_object(
      'QB', (
        SELECT jsonb_build_object(
          'player_id', pc.id,
          'name', pc.player_name,
          'position', pc.position
        )
        FROM player_cards pc
        WHERE pc.id = v_qb_id
      ),
      'RB1', (
        SELECT jsonb_build_object(
          'player_id', pc.id,
          'name', pc.player_name,
          'position', pc.position
        )
        FROM player_cards pc
        WHERE pc.id = v_rb1_id
      ),
      'RB2', (
        SELECT jsonb_build_object(
          'player_id', pc.id,
          'name', pc.player_name,
          'position', pc.position
        )
        FROM player_cards pc
        WHERE pc.id = v_rb2_id
      ),
      'WR1', (
        SELECT jsonb_build_object(
          'player_id', pc.id,
          'name', pc.player_name,
          'position', pc.position
        )
        FROM player_cards pc
        WHERE pc.id = v_wr1_id
      ),
      'WR2', (
        SELECT jsonb_build_object(
          'player_id', pc.id,
          'name', pc.player_name,
          'position', pc.position
        )
        FROM player_cards pc
        WHERE pc.id = v_wr2_id
      ),
      'TE', (
        SELECT jsonb_build_object(
          'player_id', pc.id,
          'name', pc.player_name,
          'position', pc.position
        )
        FROM player_cards pc
        WHERE pc.id = v_te_id
      )
    ),
    0.00
  );
  
  RETURN v_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create function to generate simulated fantasy points
CREATE OR REPLACE FUNCTION generate_simulated_points(p_position TEXT)
RETURNS DECIMAL(10, 2) AS $$
BEGIN
  -- Generate random fantasy points based on position
  RETURN CASE p_position
    WHEN 'Quarterback' THEN (6 + RANDOM() * 24)::DECIMAL(10, 2) -- 6-30 points
    WHEN 'Running Back' THEN (2 + RANDOM() * 20)::DECIMAL(10, 2) -- 2-22 points
    WHEN 'Wide Receiver' THEN (1 + RANDOM() * 18)::DECIMAL(10, 2) -- 1-19 points
    WHEN 'Tight End' THEN (2 + RANDOM() * 12)::DECIMAL(10, 2) -- 2-14 points
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_simulated_points IS 'Generates random fantasy points for a player position in simulated games';

-- 3. Update simulate_week to use simulated stats and lineup_snapshot
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
  
  -- Calculate points for each team's lineup
  FOR v_team IN 
    SELECT t.id as team_id, t.team_name, t.is_bot
    FROM teams t
    WHERE t.simulated_season_id = p_season_id
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
          
          -- Generate random points for this player
          v_player_points := generate_simulated_points(v_player_position);
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
    
    -- Add to results
    v_results := v_results || jsonb_build_object(
      'team_id', v_team.team_id,
      'team_name', v_team.team_name,
      'points', v_total_points,
      'is_bot', v_team.is_bot
    );
  END LOOP;
  
  -- Determine winners based on points (simple implementation - pair teams and compare)
  -- In production, you might want more sophisticated matchmaking
  
  -- Increment week or mark season complete
  IF v_current_week >= 18 THEN
    UPDATE simulated_seasons
    SET is_complete = true, completed_at = NOW()
    WHERE id = p_season_id;
    
    RETURN jsonb_build_object(
      'week', v_current_week,
      'results', v_results,
      'is_complete', true
    );
  ELSE
    UPDATE simulated_seasons
    SET current_week = v_current_week + 1
    WHERE id = p_season_id;
    
    RETURN jsonb_build_object(
      'week', v_current_week,
      'results', v_results,
      'is_complete', false
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fix delete_simulated_season to accept single parameter
CREATE OR REPLACE FUNCTION delete_simulated_season(p_season_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_team_id UUID;
BEGIN
  -- Delete all teams in this season (cascades via foreign keys)
  DELETE FROM teams WHERE simulated_season_id = p_season_id;
  
  -- Delete the season record
  DELETE FROM simulated_seasons WHERE id = p_season_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_simulated_season IS 'Deletes a simulated season and all associated teams';
