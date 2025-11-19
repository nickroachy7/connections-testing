-- Add SECURITY and SET search_path to all functions for SQL injection protection
-- Date: 2025-11-18

-- This fixes the "Function Search Path Mutable" security warning
-- by setting a fixed search_path for all functions

-- =====================================================
-- CARD LEVEL FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_card_level(p_experience_points INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_level INTEGER := 1;
BEGIN
  -- Get the highest level this XP qualifies for
  SELECT COALESCE(MAX(level), 1)
  INTO v_level
  FROM card_level_thresholds
  WHERE experience_required <= p_experience_points;
  
  RETURN v_level;
END;
$$;

CREATE OR REPLACE FUNCTION update_player_card_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.card_level := calculate_card_level(NEW.experience_points);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_token_card_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.card_level := calculate_card_level(NEW.experience_points);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_card_level_from_xp(
  p_inventory_id UUID,
  p_table_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_xp INTEGER;
  v_new_level INTEGER;
BEGIN
  IF p_table_name = 'user_player_inventory' THEN
    SELECT experience_points INTO v_xp
    FROM user_player_inventory
    WHERE id = p_inventory_id;
    
    v_new_level := calculate_card_level(v_xp);
    
    UPDATE user_player_inventory
    SET card_level = v_new_level
    WHERE id = p_inventory_id;
  ELSIF p_table_name = 'user_token_inventory' THEN
    SELECT experience_points INTO v_xp
    FROM user_token_inventory
    WHERE id = p_inventory_id;
    
    v_new_level := calculate_card_level(v_xp);
    
    UPDATE user_token_inventory
    SET card_level = v_new_level
    WHERE id = p_inventory_id;
  END IF;
END;
$$;

-- =====================================================
-- SEASON/WEEK FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION get_current_nfl_week()
RETURNS TABLE(season_year INTEGER, week_number INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nfl_season_config.season_year,
    nfl_season_config.current_week as week_number
  FROM nfl_season_config
  WHERE is_active = true
  LIMIT 1;
END;
$$;

-- =====================================================
-- USER/AUTH FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.users (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =====================================================
-- GLOBAL STATS FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION update_global_stats_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_teams INTEGER;
  v_avg_score NUMERIC;
  v_median_score NUMERIC;
  v_highest_score NUMERIC;
  v_lowest_score NUMERIC;
BEGIN
  -- Only update when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Calculate stats for this week
    SELECT 
      COUNT(*),
      AVG(total_points),
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_points),
      MAX(total_points),
      MIN(total_points)
    INTO 
      v_total_teams,
      v_avg_score,
      v_median_score,
      v_highest_score,
      v_lowest_score
    FROM weekly_lineups
    WHERE week_number = NEW.week_number
      AND season_year = NEW.season_year
      AND status = 'completed';
    
    -- Upsert global stats
    INSERT INTO weekly_global_stats (
      week_number,
      season_year,
      total_active_teams,
      average_score,
      median_score,
      highest_score,
      lowest_score
    ) VALUES (
      NEW.week_number,
      NEW.season_year,
      v_total_teams,
      v_avg_score,
      v_median_score,
      v_highest_score,
      v_lowest_score
    )
    ON CONFLICT (week_number, season_year)
    DO UPDATE SET
      total_active_teams = EXCLUDED.total_active_teams,
      average_score = EXCLUDED.average_score,
      median_score = EXCLUDED.median_score,
      highest_score = EXCLUDED.highest_score,
      lowest_score = EXCLUDED.lowest_score,
      last_updated = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_global_stats_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM update_global_stats_on_status_change();
  RETURN NULL;
END;
$$;

-- =====================================================
-- TEAM MANAGEMENT FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION delete_team(p_team_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM user_player_inventory WHERE team_id = p_team_id;
  DELETE FROM user_token_inventory WHERE team_id = p_team_id;
  DELETE FROM weekly_lineups WHERE team_id = p_team_id;
  DELETE FROM transactions WHERE team_id = p_team_id;
  DELETE FROM teams WHERE id = p_team_id;
END;
$$;

-- =====================================================
-- PROJECTION FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION generate_weekly_simulated_projection(
  p_player_card_id UUID,
  p_week_number INTEGER
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_position TEXT;
  v_base_avg NUMERIC;
  v_weekly_proj NUMERIC;
  v_seed INTEGER;
  v_variance NUMERIC;
BEGIN
  SELECT position INTO v_position
  FROM player_cards
  WHERE id = p_player_card_id;
  
  -- Position baselines
  v_base_avg := CASE v_position
    WHEN 'Quarterback' THEN 18
    WHEN 'Running Back' THEN 12
    WHEN 'Wide Receiver' THEN 10
    WHEN 'Tight End' THEN 8
    ELSE 8
  END;
  
  -- Generate weekly variance
  v_seed := (substring(p_player_card_id::text from 1 for 8)::bit(32))::integer;
  v_variance := ((v_seed * 37 + p_week_number * 997) % 1000 - 500) / 1500.0;
  
  v_weekly_proj := v_base_avg * (1 + v_variance);
  
  RETURN v_weekly_proj;
END;
$$;

-- =====================================================
-- INVENTORY FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION give_starter_players(
  p_user_id UUID,
  p_team_id UUID,
  p_count INTEGER DEFAULT 8
)
RETURNS SETOF user_player_inventory
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH random_players AS (
    SELECT id
    FROM player_cards
    WHERE is_active = true
    AND position IN ('Quarterback', 'Running Back', 'Wide Receiver', 'Tight End')
    ORDER BY RANDOM()
    LIMIT p_count
  )
  INSERT INTO user_player_inventory (
    user_id,
    team_id,
    player_card_id,
    card_level,
    card_tier,
    experience_points
  )
  SELECT
    p_user_id,
    p_team_id,
    id,
    1,
    'base',
    0
  FROM random_players
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION insert_player_to_inventory(
  p_user_id UUID,
  p_team_id UUID,
  p_player_card_id UUID,
  p_card_level INTEGER DEFAULT 1,
  p_card_tier TEXT DEFAULT 'base',
  p_experience_points INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inventory_id UUID;
BEGIN
  INSERT INTO user_player_inventory (
    user_id,
    team_id,
    player_card_id,
    card_level,
    card_tier,
    experience_points
  ) VALUES (
    p_user_id,
    p_team_id,
    p_player_card_id,
    p_card_level,
    p_card_tier::card_tier,
    p_experience_points
  )
  RETURNING id INTO v_inventory_id;
  
  RETURN v_inventory_id;
END;
$$;

CREATE OR REPLACE FUNCTION insert_token_to_inventory(
  p_user_id UUID,
  p_team_id UUID,
  p_token_card_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inventory_id UUID;
BEGIN
  INSERT INTO user_token_inventory (
    user_id,
    team_id,
    token_card_id
  ) VALUES (
    p_user_id,
    p_team_id,
    p_token_card_id
  )
  RETURNING id INTO v_inventory_id;
  
  RETURN v_inventory_id;
END;
$$;

-- =====================================================
-- TOKEN FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION increment_token_triggers(token_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE user_token_inventory
  SET 
    times_triggered = times_triggered + 1,
    experience_points = experience_points + 50
  WHERE id = token_id;
END;
$$;

-- =====================================================
-- PURCHASE FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION purchase_pack(
  p_user_id UUID,
  p_team_id UUID,
  p_pack_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pack_cost INTEGER;
  v_user_coins INTEGER;
  v_user_pack_id UUID;
BEGIN
  -- Get pack cost
  SELECT coin_cost INTO v_pack_cost
  FROM packs
  WHERE id = p_pack_id;
  
  -- Get user coins (team-specific)
  SELECT coins INTO v_user_coins
  FROM teams
  WHERE id = p_team_id AND user_id = p_user_id;
  
  IF v_user_coins < v_pack_cost THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;
  
  -- Deduct coins
  UPDATE teams
  SET coins = coins - v_pack_cost
  WHERE id = p_team_id;
  
  -- Create user pack
  INSERT INTO user_packs (user_id, team_id, pack_id)
  VALUES (p_user_id, p_team_id, p_pack_id)
  RETURNING id INTO v_user_pack_id;
  
  -- Log transaction
  INSERT INTO transactions (user_id, team_id, transaction_type, coins_change, coins_after, metadata)
  SELECT 
    p_user_id,
    p_team_id,
    'pack_purchase',
    -v_pack_cost,
    coins,
    jsonb_build_object('pack_id', p_pack_id)
  FROM teams
  WHERE id = p_team_id;
  
  RETURN v_user_pack_id;
END;
$$;

COMMENT ON FUNCTION purchase_pack IS 'All functions now have SET search_path for security';
