-- Multi-Team Support Migration
-- Date: 2024-11-05
-- Purpose: Enable users to create and manage multiple teams, each with isolated resources

-- 1. Add coins column to teams table (team-specific coins instead of user-level)
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 1000;

COMMENT ON COLUMN teams.coins IS 'Team-specific coins for pack purchases. Each team starts with 1000 coins.';

-- 2. Create index for better performance when querying user teams
CREATE INDEX IF NOT EXISTS idx_teams_user_active ON teams(user_id, is_active);

-- 3. Migrate existing team coins from users table
UPDATE teams t
SET coins = u.total_coins
FROM users u
WHERE t.user_id = u.id;

-- 4. Create function to create a new team with starter pack
CREATE OR REPLACE FUNCTION create_new_team(
  p_user_id UUID,
  p_team_name TEXT,
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
  -- Get current NFL week
  SELECT current_week, season_year INTO v_current_week, v_season_year
  FROM nfl_season_config
  WHERE is_active = true
  LIMIT 1;
  
  -- Create the new team (not active by default - user must select it)
  INSERT INTO teams (user_id, team_name, is_active, current_week, coins, team_image_url)
  VALUES (p_user_id, p_team_name, false, v_current_week, 1000, p_team_image_url)
  RETURNING id INTO v_team_id;
  
  -- Get starter pack
  SELECT id INTO v_starter_pack_id
  FROM packs
  WHERE pack_type = 'starter'
  LIMIT 1;
  
  -- Give starter pack players (8 players: 1 QB, 2 RB, 2 WR, 1 TE, 1 K, 1 DEF)
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
    jsonb_build_object('pack_id', v_starter_pack_id, 'team_creation', true)
  );
  
  RETURN v_team_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_new_team IS 'Creates a new team for a user with starter pack (8 players + 3 tokens + 1000 coins)';

-- 5. Verify data isolation is already in place
-- All relevant tables already have team_id foreign keys:
-- - user_player_inventory (team_id) - Players are team-specific ✅
-- - user_token_inventory (team_id) - Tokens are team-specific ✅
-- - weekly_lineups (team_id) - Lineups are team-specific ✅
-- - transactions (team_id) - Transactions are team-specific ✅
-- - teams (user_id, wins, losses, total_points, coins) - Stats are team-specific ✅

-- 6. Example: Query to verify multi-team isolation
-- SELECT 
--   t.team_name,
--   t.coins,
--   t.wins,
--   t.losses,
--   (SELECT COUNT(*) FROM user_player_inventory WHERE team_id = t.id) as players,
--   (SELECT COUNT(*) FROM user_token_inventory WHERE team_id = t.id) as tokens
-- FROM teams t
-- WHERE t.user_id = '<user_id>'
-- ORDER BY t.created_at DESC;
