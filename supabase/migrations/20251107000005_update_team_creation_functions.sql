-- Update Team Creation Functions for Contest Types
-- Date: 2024-11-07
-- Purpose: Update create_new_team and create_simulated_season to support contest types

-- ============================================================================
-- STEP 1: Update create_new_team function to accept contest_type_id
-- ============================================================================

CREATE OR REPLACE FUNCTION create_new_team(
  p_user_id UUID,
  p_team_name TEXT,
  p_contest_type_id UUID,
  p_team_image_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_team_id UUID;
  v_current_week INTEGER;
  v_season_year INTEGER;
  v_starter_pack_id UUID;
  v_player_card RECORD;
  v_token_card RECORD;
BEGIN
  -- Validate contest type exists and is active
  IF NOT EXISTS (SELECT 1 FROM contest_types WHERE id = p_contest_type_id AND is_active = true) THEN
    RAISE EXCEPTION 'Invalid or inactive contest type: %', p_contest_type_id;
  END IF;
  
  -- Get current NFL week
  SELECT current_week, season_year INTO v_current_week, v_season_year
  FROM nfl_season_config
  WHERE is_active = true
  LIMIT 1;
  
  -- Create the new team (not active by default - user must select it)
  INSERT INTO teams (
    user_id, 
    team_name, 
    contest_type_id,
    is_active, 
    current_week, 
    coins, 
    team_image_url
  )
  VALUES (
    p_user_id, 
    p_team_name, 
    p_contest_type_id,
    false, 
    v_current_week, 
    1000, 
    p_team_image_url
  )
  RETURNING id INTO v_team_id;
  
  -- Get starter pack
  SELECT id INTO v_starter_pack_id
  FROM packs
  WHERE pack_type = 'starter'
  LIMIT 1;
  
  -- Give starter pack players (8 players: 1 QB, 2 RB, 2 WR, 1 TE, 1 K, 1 DEF)
  -- NOTE: Tier assignment happens in open-pack Edge Function based on contest_type's starter_tier_config
  
  -- QB
  SELECT id INTO v_player_card FROM player_cards 
  WHERE position = 'Quarterback' AND is_active = true 
  ORDER BY RANDOM() LIMIT 1;
  IF FOUND THEN
    INSERT INTO user_player_inventory (user_id, team_id, player_card_id)
    VALUES (p_user_id, v_team_id, v_player_card);
  END IF;
  
  -- RB (2)
  FOR v_player_card IN 
    SELECT id FROM player_cards 
    WHERE position = 'Running Back' AND is_active = true 
    ORDER BY RANDOM() LIMIT 2
  LOOP
    INSERT INTO user_player_inventory (user_id, team_id, player_card_id)
    VALUES (p_user_id, v_team_id, v_player_card.id);
  END LOOP;
  
  -- WR (2)
  FOR v_player_card IN 
    SELECT id FROM player_cards 
    WHERE position = 'Wide Receiver' AND is_active = true 
    ORDER BY RANDOM() LIMIT 2
  LOOP
    INSERT INTO user_player_inventory (user_id, team_id, player_card_id)
    VALUES (p_user_id, v_team_id, v_player_card.id);
  END LOOP;
  
  -- TE
  SELECT id INTO v_player_card FROM player_cards 
  WHERE position = 'Tight End' AND is_active = true 
  ORDER BY RANDOM() LIMIT 1;
  IF FOUND THEN
    INSERT INTO user_player_inventory (user_id, team_id, player_card_id)
    VALUES (p_user_id, v_team_id, v_player_card);
  END IF;
  
  -- K
  SELECT id INTO v_player_card FROM player_cards 
  WHERE position = 'Kicker' AND is_active = true 
  ORDER BY RANDOM() LIMIT 1;
  IF FOUND THEN
    INSERT INTO user_player_inventory (user_id, team_id, player_card_id)
    VALUES (p_user_id, v_team_id, v_player_card);
  END IF;
  
  -- DEF
  SELECT id INTO v_player_card FROM player_cards 
  WHERE position = 'Defense' AND is_active = true 
  ORDER BY RANDOM() LIMIT 1;
  IF FOUND THEN
    INSERT INTO user_player_inventory (user_id, team_id, player_card_id)
    VALUES (p_user_id, v_team_id, v_player_card);
  END IF;
  
  -- Give starter tokens (3 random tokens)
  FOR v_token_card IN 
    SELECT id FROM token_cards 
    ORDER BY RANDOM() LIMIT 3
  LOOP
    INSERT INTO user_token_inventory (user_id, team_id, token_card_id)
    VALUES (p_user_id, v_team_id, v_token_card.id);
  END LOOP;
  
  -- Log transaction
  INSERT INTO transactions (user_id, team_id, transaction_type, coins_change, coins_after, metadata)
  VALUES (
    p_user_id,
    v_team_id,
    'starter_pack',
    0,
    1000,
    jsonb_build_object(
      'pack_id', v_starter_pack_id, 
      'team_creation', true,
      'contest_type_id', p_contest_type_id
    )
  );
  
  RETURN v_team_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_new_team IS 'Creates a new team with starter pack (8 players + 3 tokens + 1000 coins) linked to a specific contest type';

-- ============================================================================
-- STEP 2: Update create_bot_team for simulated seasons
-- ============================================================================

CREATE OR REPLACE FUNCTION create_bot_team(
  p_season_id UUID,
  p_bot_number INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_team_id UUID;
  v_current_week INTEGER;
  v_season_year INTEGER;
  v_contest_type_id UUID;
  v_player_card RECORD;
  v_token_card RECORD;
  v_bot_name TEXT;
  v_lineup_id UUID;
BEGIN
  -- Get contest type from simulated season
  SELECT contest_type_id INTO v_contest_type_id
  FROM simulated_seasons
  WHERE id = p_season_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Simulated season not found: %', p_season_id;
  END IF;
  
  -- Generate bot team name
  v_bot_name := 'Bot Team ' || p_bot_number;
  
  -- Get current NFL week
  SELECT current_week, season_year INTO v_current_week, v_season_year
  FROM nfl_season_config
  WHERE is_active = true
  LIMIT 1;
  
  -- Create the bot team with contest type
  INSERT INTO teams (
    user_id, 
    team_name,
    contest_type_id,
    is_active, 
    current_week, 
    coins, 
    simulated_season_id,
    is_bot
  )
  SELECT 
    (SELECT user_id FROM simulated_seasons WHERE id = p_season_id),
    v_bot_name,
    v_contest_type_id,
    false,
    v_current_week,
    1000,
    p_season_id,
    true
  RETURNING id INTO v_team_id;
  
  -- Give bot team same starter pack as user would get (8 players)
  -- QB
  SELECT id INTO v_player_card FROM player_cards 
  WHERE position = 'Quarterback' AND is_active = true 
  ORDER BY RANDOM() LIMIT 1;
  IF FOUND THEN
    INSERT INTO user_player_inventory (
      user_id, 
      team_id, 
      player_card_id
    )
    SELECT 
      (SELECT user_id FROM simulated_seasons WHERE id = p_season_id),
      v_team_id,
      v_player_card.id;
  END IF;
  
  -- RB (2)
  FOR v_player_card IN 
    SELECT id FROM player_cards 
    WHERE position = 'Running Back' AND is_active = true 
    ORDER BY RANDOM() LIMIT 2
  LOOP
    INSERT INTO user_player_inventory (user_id, team_id, player_card_id)
    SELECT 
      (SELECT user_id FROM simulated_seasons WHERE id = p_season_id),
      v_team_id,
      v_player_card.id;
  END LOOP;
  
  -- WR (2)
  FOR v_player_card IN 
    SELECT id FROM player_cards 
    WHERE position = 'Wide Receiver' AND is_active = true 
    ORDER BY RANDOM() LIMIT 2
  LOOP
    INSERT INTO user_player_inventory (user_id, team_id, player_card_id)
    SELECT 
      (SELECT user_id FROM simulated_seasons WHERE id = p_season_id),
      v_team_id,
      v_player_card.id;
  END LOOP;
  
  -- TE
  SELECT id INTO v_player_card FROM player_cards 
  WHERE position = 'Tight End' AND is_active = true 
  ORDER BY RANDOM() LIMIT 1;
  IF FOUND THEN
    INSERT INTO user_player_inventory (user_id, team_id, player_card_id)
    SELECT 
      (SELECT user_id FROM simulated_seasons WHERE id = p_season_id),
      v_team_id,
      v_player_card;
  END IF;
  
  -- K
  SELECT id INTO v_player_card FROM player_cards 
  WHERE position = 'Kicker' AND is_active = true 
  ORDER BY RANDOM() LIMIT 1;
  IF FOUND THEN
    INSERT INTO user_player_inventory (user_id, team_id, player_card_id)
    SELECT 
      (SELECT user_id FROM simulated_seasons WHERE id = p_season_id),
      v_team_id,
      v_player_card;
  END IF;
  
  -- DEF
  SELECT id INTO v_player_card FROM player_cards 
  WHERE position = 'Defense' AND is_active = true 
  ORDER BY RANDOM() LIMIT 1;
  IF FOUND THEN
    INSERT INTO user_player_inventory (user_id, team_id, player_card_id)
    SELECT 
      (SELECT user_id FROM simulated_seasons WHERE id = p_season_id),
      v_team_id,
      v_player_card;
  END IF;
  
  RETURN v_team_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_bot_team IS 'Creates a bot team with random players for simulated seasons, using the season''s contest type';

-- ============================================================================
-- STEP 3: Update create_simulated_season to accept contest_type_id
-- ============================================================================

CREATE OR REPLACE FUNCTION create_simulated_season(
  p_user_id UUID,
  p_team_name TEXT,
  p_contest_type_id UUID,
  p_team_image_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_team_id UUID;
  v_season_id UUID;
  v_bot_team_id UUID;
  v_bot_number INTEGER;
  v_contest_display_name TEXT;
BEGIN
  -- Validate contest type
  SELECT display_name INTO v_contest_display_name
  FROM contest_types 
  WHERE id = p_contest_type_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive contest type: %', p_contest_type_id;
  END IF;
  
  -- Create the user's team first (with contest type)
  SELECT create_new_team(p_user_id, p_team_name, p_contest_type_id, p_team_image_url) 
  INTO v_user_team_id;
  
  -- Create the simulated season record
  INSERT INTO simulated_seasons (
    user_id, 
    user_team_id, 
    season_name, 
    contest_type_id,
    current_week
  )
  VALUES (
    p_user_id, 
    v_user_team_id, 
    p_team_name || ' Season (' || v_contest_display_name || ')',
    p_contest_type_id,
    1
  )
  RETURNING id INTO v_season_id;
  
  -- Link the user's team to the season
  UPDATE teams 
  SET simulated_season_id = v_season_id
  WHERE id = v_user_team_id;
  
  -- Create 11 bot teams
  FOR v_bot_number IN 1..11 LOOP
    SELECT create_bot_team(v_season_id, v_bot_number) INTO v_bot_team_id;
  END LOOP;
  
  -- Return both IDs for frontend use
  RETURN jsonb_build_object(
    'season_id', v_season_id,
    'team_id', v_user_team_id,
    'contest_type_id', p_contest_type_id,
    'contest_display_name', v_contest_display_name
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_simulated_season IS 'Creates a simulated season with 1 user team and 11 bot teams, all using the specified contest type';

-- ============================================================================
-- VERIFICATION QUERIES (commented out, for manual testing)
-- ============================================================================

-- Test creating a team with a specific contest type:
-- SELECT create_new_team(
--   '<user_id>'::uuid,
--   'Test Team',
--   (SELECT id FROM contest_types WHERE name = '12w_5l_2rp_1s_half')
-- );

-- Verify team has correct contest type:
-- SELECT 
--   t.team_name,
--   ct.display_name as contest_type,
--   ct.total_weeks,
--   ct.max_losses,
--   ct.scoring_type
-- FROM teams t
-- JOIN contest_types ct ON ct.id = t.contest_type_id
-- WHERE t.team_name = 'Test Team';
