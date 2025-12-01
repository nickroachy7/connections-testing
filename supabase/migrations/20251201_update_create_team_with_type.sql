-- Update create_new_team function to accept team_type parameter
-- This allows distinguishing between public (contest) and private (league) teams

CREATE OR REPLACE FUNCTION create_new_team(
  p_user_id UUID,
  p_team_name TEXT,
  p_contest_type_id UUID DEFAULT NULL,
  p_team_image_url TEXT DEFAULT NULL,
  p_team_type TEXT DEFAULT 'public'
)
RETURNS TABLE(team_id UUID, starter_pack_user_pack_id UUID) AS $$
DECLARE
  v_team_id UUID;
  v_current_week INTEGER;
  v_season_year INTEGER;
  v_starter_pack_id UUID;
  v_user_pack_id UUID;
  v_player_card RECORD;
  v_token_card RECORD;
BEGIN
  -- Validate team_type
  IF p_team_type NOT IN ('public', 'private') THEN
    RAISE EXCEPTION 'Invalid team_type. Must be either public or private.';
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
    team_type,
    is_active, 
    current_week, 
    coins, 
    team_image_url
  )
  VALUES (
    p_user_id, 
    p_team_name, 
    p_contest_type_id,
    p_team_type,
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
  
  IF v_starter_pack_id IS NULL THEN
    RAISE EXCEPTION 'Starter pack not found';
  END IF;

  -- Create a user_packs record for the starter pack
  INSERT INTO user_packs (user_id, pack_id, team_id, status)
  VALUES (p_user_id, v_starter_pack_id, v_team_id, 'unopened')
  RETURNING id INTO v_user_pack_id;
  
  -- Return both team_id and starter_pack_user_pack_id
  RETURN QUERY SELECT v_team_id, v_user_pack_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_new_team IS 'Creates a new team with specified type (public or private). Public teams are for contests, private teams are for leagues.';
