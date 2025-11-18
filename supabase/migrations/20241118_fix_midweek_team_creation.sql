-- Fix Mid-Week Team Creation
-- Date: 2024-11-18
-- Purpose: Ensure teams created mid-week or after week finalization start fresh on the next week
--
-- Problem: Teams created when current_week is already finalized would get assigned that week
-- and immediately get a win/loss when finalize-week runs, even though they just joined.
--
-- Solution: When creating a team, check if current week is finalized. If so, assign team to next week.

-- ============================================================================
-- STEP 1: Create helper function to get the correct starting week for new teams
-- ============================================================================

CREATE OR REPLACE FUNCTION get_starting_week_for_new_team()
RETURNS TABLE(week_number INTEGER, season_year INTEGER) AS $$
DECLARE
  v_current_week INTEGER;
  v_season_year INTEGER;
  v_week_finalized BOOLEAN;
  v_max_week INTEGER := 18; -- NFL regular season max week
BEGIN
  -- Get current week from config
  SELECT nfl_season_config.current_week, nfl_season_config.season_year 
  INTO v_current_week, v_season_year
  FROM nfl_season_config
  WHERE nfl_season_config.is_active = true
  LIMIT 1;
  
  -- Check if current week has already been finalized
  -- A week is considered finalized if there are any weekly_lineups with status='completed' for that week
  SELECT EXISTS(
    SELECT 1 
    FROM weekly_lineups 
    WHERE weekly_lineups.week_number = v_current_week 
      AND weekly_lineups.season_year = v_season_year
      AND weekly_lineups.status = 'completed'
    LIMIT 1
  ) INTO v_week_finalized;
  
  -- If week is finalized, assign team to next week (unless we're at max week)
  IF v_week_finalized THEN
    IF v_current_week >= v_max_week THEN
      -- Season is over - team starts at current week (they won't compete)
      week_number := v_current_week;
      season_year := v_season_year;
    ELSE
      -- Move to next week
      week_number := v_current_week + 1;
      season_year := v_season_year;
    END IF;
  ELSE
    -- Week not finalized yet - team can join current week
    week_number := v_current_week;
    season_year := v_season_year;
  END IF;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_starting_week_for_new_team IS 'Returns the appropriate starting week for a new team. If current week is finalized, returns next week to prevent immediate win/loss assignment.';

-- ============================================================================
-- STEP 2: Update create_new_team function to use dynamic week assignment
-- ============================================================================

CREATE OR REPLACE FUNCTION create_new_team(
  p_user_id UUID,
  p_team_name TEXT,
  p_contest_type_id UUID,
  p_team_image_url TEXT DEFAULT NULL
)
RETURNS TABLE(team_id UUID) AS $$
DECLARE
  v_team_id UUID;
  v_starting_week INTEGER;
  v_season_year INTEGER;
  v_starter_pack_id UUID;
  v_player_card_id UUID;
  v_token_card_id UUID;
BEGIN
  -- Validate contest type exists and is active
  IF NOT EXISTS (SELECT 1 FROM contest_types WHERE id = p_contest_type_id AND is_active = true) THEN
    RAISE EXCEPTION 'Invalid or inactive contest type: %', p_contest_type_id;
  END IF;
  
  -- Get the correct starting week for this new team
  -- If current week is finalized, this will return next week
  SELECT week_number, season_year 
  INTO v_starting_week, v_season_year
  FROM get_starting_week_for_new_team();
  
  -- Create the new team
  -- Note: teams table doesn't have season_year column
  INSERT INTO teams (
    user_id, 
    team_name, 
    contest_type_id,
    is_active, 
    current_week, 
    coins,
    losses,
    is_bot,
    team_image_url
  )
  VALUES (
    p_user_id, 
    p_team_name, 
    p_contest_type_id,
    true,  -- Active by default
    v_starting_week,  -- Use calculated starting week
    1000,  -- Starting coins
    0,     -- No losses yet
    false, -- Not a bot
    p_team_image_url
  )
  RETURNING id INTO v_team_id;
  
  -- Get starter pack ID
  SELECT id INTO v_starter_pack_id
  FROM packs
  WHERE pack_type = 'starter'
  LIMIT 1;
  
  -- Award starter pack inventory (8 random players + 2 random tokens)
  -- Note: Only insert columns that exist in the tables
  
  -- Players (user_player_inventory has: user_id, team_id, player_card_id)
  FOR v_player_card_id IN (
    SELECT id
    FROM player_cards
    WHERE is_active = true
    ORDER BY RANDOM()
    LIMIT 8
  )
  LOOP
    INSERT INTO user_player_inventory (
      user_id,
      team_id,
      player_card_id
    )
    VALUES (
      p_user_id,
      v_team_id,
      v_player_card_id
    );
  END LOOP;

  -- Tokens (user_token_inventory has: user_id, team_id, token_card_id)
  -- Note: token_cards table doesn't have is_active column
  FOR v_token_card_id IN (
    SELECT id
    FROM token_cards
    ORDER BY RANDOM()
    LIMIT 2
  )
  LOOP
    INSERT INTO user_token_inventory (
      user_id,
      team_id,
      token_card_id
    )
    VALUES (
      p_user_id,
      v_team_id,
      v_token_card_id
    );
  END LOOP;
  
  RETURN QUERY SELECT v_team_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_new_team IS 'Creates a new team with starter pack (8 players + 2 tokens + 1000 coins) linked to a specific contest type. Automatically assigns team to next week if current week is already finalized. Returns table with team_id.';

-- ============================================================================
-- STEP 3: Update create_bot_team to use same logic
-- ============================================================================

CREATE OR REPLACE FUNCTION create_bot_team(
  p_season_id UUID,
  p_bot_number INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_team_id UUID;
  v_starting_week INTEGER;
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
  
  -- Get the correct starting week for bot teams
  SELECT week_number, season_year 
  INTO v_starting_week, v_season_year
  FROM get_starting_week_for_new_team();
  
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
    v_starting_week,  -- Use calculated starting week
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

COMMENT ON FUNCTION create_bot_team IS 'Creates a bot team with random players for simulated seasons, using the season''s contest type. Assigns to next week if current week is finalized.';

-- ============================================================================
-- STEP 4: Add constraint to prevent weekly_lineup creation for teams before their start week
-- ============================================================================

-- This function will be called as a BEFORE INSERT trigger on weekly_lineups
-- It prevents creating lineup records for weeks before the team's current_week (starting week)
CREATE OR REPLACE FUNCTION check_team_starting_week()
RETURNS TRIGGER AS $$
DECLARE
  v_team_current_week INTEGER;
BEGIN
  -- Get the team's starting week (stored in teams.current_week)
  SELECT current_week INTO v_team_current_week
  FROM teams
  WHERE id = NEW.team_id;
  
  -- If team's current_week is greater than the weekly_lineup's week_number,
  -- this means the team hasn't started yet - reject the insert
  IF v_team_current_week > NEW.week_number THEN
    RAISE NOTICE 'Skipping weekly_lineup creation for team % - their first week is % (tried to create lineup for week %)', 
      NEW.team_id, v_team_current_week, NEW.week_number;
    RETURN NULL; -- Prevent the insert
  END IF;
  
  -- Team has started or is starting this week - allow the insert
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS prevent_premature_lineup_creation ON weekly_lineups;
CREATE TRIGGER prevent_premature_lineup_creation
  BEFORE INSERT ON weekly_lineups
  FOR EACH ROW
  EXECUTE FUNCTION check_team_starting_week();

COMMENT ON FUNCTION check_team_starting_week IS 'Prevents creating weekly_lineup records for teams before their starting week (teams.current_week). This ensures mid-week team signups don''t get assigned to already-finalized weeks.';

-- ============================================================================
-- VERIFICATION & TESTING
-- ============================================================================

-- Test the helper function:
-- SELECT * FROM get_starting_week_for_new_team();

-- Should return next week if current week has completed lineups:
-- INSERT INTO weekly_lineups (team_id, week_number, season_year, status, total_points)
-- VALUES ('some-uuid', (SELECT current_week FROM nfl_season_config WHERE is_active = true), 2024, 'completed', 100);
-- SELECT * FROM get_starting_week_for_new_team();  -- Should be current_week + 1

-- Test trigger prevents early lineup creation:
-- 1. Create a team with starting week = next week
-- 2. Try to insert weekly_lineup for current week (should be rejected)
-- 3. Insert weekly_lineup for next week (should succeed)

