-- Simulated Seasons Migration
-- Date: 2024-11-06
-- Purpose: Enable users to run simulated seasons with bot teams for testing

-- 1. Add simulated_season_id to teams table to track which teams belong to a simulated season
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS simulated_season_id UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT false;

COMMENT ON COLUMN teams.simulated_season_id IS 'Links teams to a simulated season for testing purposes';
COMMENT ON COLUMN teams.is_bot IS 'Indicates if this team is a bot team in a simulated season';

CREATE INDEX IF NOT EXISTS idx_teams_simulated_season ON teams(simulated_season_id);

-- 2. Create simulated_seasons table to track seasons
CREATE TABLE IF NOT EXISTS simulated_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_name TEXT NOT NULL,
  current_week INTEGER NOT NULL DEFAULT 1,
  total_weeks INTEGER NOT NULL DEFAULT 18,
  is_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

COMMENT ON TABLE simulated_seasons IS 'Tracks simulated seasons for testing with bot teams';
CREATE INDEX IF NOT EXISTS idx_simulated_seasons_user ON simulated_seasons(user_id);
CREATE INDEX IF NOT EXISTS idx_simulated_seasons_complete ON simulated_seasons(is_complete);

-- 3. Create function to generate a bot team with random lineup
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
  v_token_card RECORD;
  v_bot_name TEXT;
  v_lineup_id UUID;
BEGIN
  -- Generate bot team name
  v_bot_name := 'Bot Team ' || p_bot_number;
  
  -- Get current NFL week
  SELECT current_week, season_year INTO v_current_week, v_season_year
  FROM nfl_season_config
  WHERE is_active = true
  LIMIT 1;
  
  -- Create the bot team (system user ID will be null, indicated by is_bot flag)
  INSERT INTO teams (
    user_id, 
    team_name, 
    is_active, 
    current_week, 
    coins, 
    simulated_season_id,
    is_bot
  )
  SELECT 
    (SELECT user_id FROM simulated_seasons WHERE id = p_season_id),
    v_bot_name,
    false,
    v_current_week,
    1000,
    p_season_id,
    true
  RETURNING id INTO v_team_id;
  
  -- Give bot team players (8 players: 1 QB, 2 RB, 2 WR, 1 TE, 1 K, 1 DEF)
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
    INSERT INTO user_player_inventory (
      user_id,
      team_id, 
      player_card_id
    )
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
    INSERT INTO user_player_inventory (
      user_id,
      team_id, 
      player_card_id
    )
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
    INSERT INTO user_player_inventory (
      user_id,
      team_id, 
      player_card_id
    )
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
    INSERT INTO user_player_inventory (
      user_id,
      team_id, 
      player_card_id
    )
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
    INSERT INTO user_player_inventory (
      user_id,
      team_id, 
      player_card_id
    )
    SELECT 
      (SELECT user_id FROM simulated_seasons WHERE id = p_season_id),
      v_team_id,
      v_player_card;
  END IF;
  
  -- Create a random lineup for the bot for the current week
  INSERT INTO weekly_lineups (team_id, week_number, season_year)
  VALUES (v_team_id, v_current_week, v_season_year)
  RETURNING id INTO v_lineup_id;
  
  -- Set random lineup positions
  -- QB
  INSERT INTO lineup_positions (lineup_id, position_slot, player_card_id)
  SELECT v_lineup_id, 'QB', upi.player_card_id
  FROM user_player_inventory upi
  JOIN player_cards pc ON pc.id = upi.player_card_id
  WHERE upi.team_id = v_team_id AND pc.position = 'Quarterback'
  ORDER BY RANDOM() LIMIT 1;
  
  -- RB1 and RB2
  INSERT INTO lineup_positions (lineup_id, position_slot, player_card_id)
  SELECT v_lineup_id, CASE WHEN row_number() OVER () = 1 THEN 'RB1' ELSE 'RB2' END, upi.player_card_id
  FROM user_player_inventory upi
  JOIN player_cards pc ON pc.id = upi.player_card_id
  WHERE upi.team_id = v_team_id AND pc.position = 'Running Back'
  ORDER BY RANDOM() LIMIT 2;
  
  -- WR1 and WR2
  INSERT INTO lineup_positions (lineup_id, position_slot, player_card_id)
  SELECT v_lineup_id, CASE WHEN row_number() OVER () = 1 THEN 'WR1' ELSE 'WR2' END, upi.player_card_id
  FROM user_player_inventory upi
  JOIN player_cards pc ON pc.id = upi.player_card_id
  WHERE upi.team_id = v_team_id AND pc.position = 'Wide Receiver'
  ORDER BY RANDOM() LIMIT 2;
  
  -- TE
  INSERT INTO lineup_positions (lineup_id, position_slot, player_card_id)
  SELECT v_lineup_id, 'TE', upi.player_card_id
  FROM user_player_inventory upi
  JOIN player_cards pc ON pc.id = upi.player_card_id
  WHERE upi.team_id = v_team_id AND pc.position = 'Tight End'
  ORDER BY RANDOM() LIMIT 1;
  
  -- K
  INSERT INTO lineup_positions (lineup_id, position_slot, player_card_id)
  SELECT v_lineup_id, 'K', upi.player_card_id
  FROM user_player_inventory upi
  JOIN player_cards pc ON pc.id = upi.player_card_id
  WHERE upi.team_id = v_team_id AND pc.position = 'Kicker'
  ORDER BY RANDOM() LIMIT 1;
  
  -- DEF
  INSERT INTO lineup_positions (lineup_id, position_slot, player_card_id)
  SELECT v_lineup_id, 'DEF', upi.player_card_id
  FROM user_player_inventory upi
  JOIN player_cards pc ON pc.id = upi.player_card_id
  WHERE upi.team_id = v_team_id AND pc.position = 'Defense'
  ORDER BY RANDOM() LIMIT 1;
  
  RETURN v_team_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_bot_team IS 'Creates a bot team with random players and lineup for simulated season';

-- 4. Create function to start a simulated season
CREATE OR REPLACE FUNCTION create_simulated_season(
  p_user_id UUID,
  p_team_name TEXT,
  p_team_image_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_team_id UUID;
  v_season_id UUID;
  v_bot_team_id UUID;
  v_bot_number INTEGER;
BEGIN
  -- Create the user's team first (same as create_new_team)
  SELECT create_new_team(p_user_id, p_team_name, p_team_image_url) INTO v_user_team_id;
  
  -- Create the simulated season record
  INSERT INTO simulated_seasons (user_id, user_team_id, season_name, current_week, total_weeks)
  VALUES (p_user_id, v_user_team_id, p_team_name || ' Season', 1, 18)
  RETURNING id INTO v_season_id;
  
  -- Link the user's team to the season
  UPDATE teams 
  SET simulated_season_id = v_season_id
  WHERE id = v_user_team_id;
  
  -- Create 11 bot teams
  FOR v_bot_number IN 1..11 LOOP
    SELECT create_bot_team(v_season_id, v_bot_number) INTO v_bot_team_id;
  END LOOP;
  
  RETURN v_season_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_simulated_season IS 'Creates a simulated season with 1 user team and 11 bot teams';

-- 5. Create function to simulate a week in the season
CREATE OR REPLACE FUNCTION simulate_week(
  p_season_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_current_week INTEGER;
  v_team RECORD;
  v_lineup_id UUID;
  v_total_points DECIMAL(10, 2);
  v_teams UUID[];
  v_team_points JSONB := '[]'::JSONB;
  v_matchup JSONB;
  v_results JSONB := '[]'::JSONB;
BEGIN
  -- Get current week
  SELECT current_week INTO v_current_week
  FROM simulated_seasons
  WHERE id = p_season_id;
  
  -- Get all teams in the season
  SELECT ARRAY_AGG(id) INTO v_teams
  FROM teams
  WHERE simulated_season_id = p_season_id;
  
  -- Calculate points for each team's lineup
  FOR v_team IN 
    SELECT t.id as team_id, t.team_name, t.is_bot
    FROM teams t
    WHERE t.simulated_season_id = p_season_id
  LOOP
    -- Get or create lineup for this week
    SELECT id INTO v_lineup_id
    FROM weekly_lineups
    WHERE team_id = v_team.team_id 
      AND week_number = v_current_week;
    
    -- If no lineup exists, create one (for bots or user)
    IF v_lineup_id IS NULL THEN
      INSERT INTO weekly_lineups (team_id, week_number, season_year)
      SELECT v_team.team_id, v_current_week, season_year
      FROM nfl_season_config WHERE is_active = true LIMIT 1
      RETURNING id INTO v_lineup_id;
      
      -- Auto-populate lineup if it's a bot
      IF v_team.is_bot THEN
        -- Similar logic as in create_bot_team for setting positions
        INSERT INTO lineup_positions (lineup_id, position_slot, player_card_id)
        SELECT v_lineup_id, 'QB', upi.player_card_id
        FROM user_player_inventory upi
        JOIN player_cards pc ON pc.id = upi.player_card_id
        WHERE upi.team_id = v_team.team_id AND pc.position = 'Quarterback'
        ORDER BY RANDOM() LIMIT 1;
        
        INSERT INTO lineup_positions (lineup_id, position_slot, player_card_id)
        SELECT v_lineup_id, CASE WHEN row_number() OVER () = 1 THEN 'RB1' ELSE 'RB2' END, upi.player_card_id
        FROM user_player_inventory upi
        JOIN player_cards pc ON pc.id = upi.player_card_id
        WHERE upi.team_id = v_team.team_id AND pc.position = 'Running Back'
        ORDER BY RANDOM() LIMIT 2;
        
        INSERT INTO lineup_positions (lineup_id, position_slot, player_card_id)
        SELECT v_lineup_id, CASE WHEN row_number() OVER () = 1 THEN 'WR1' ELSE 'WR2' END, upi.player_card_id
        FROM user_player_inventory upi
        JOIN player_cards pc ON pc.id = upi.player_card_id
        WHERE upi.team_id = v_team.team_id AND pc.position = 'Wide Receiver'
        ORDER BY RANDOM() LIMIT 2;
        
        INSERT INTO lineup_positions (lineup_id, position_slot, player_card_id)
        SELECT v_lineup_id, 'TE', upi.player_card_id
        FROM user_player_inventory upi
        JOIN player_cards pc ON pc.id = upi.player_card_id
        WHERE upi.team_id = v_team.team_id AND pc.position = 'Tight End'
        ORDER BY RANDOM() LIMIT 1;
        
        INSERT INTO lineup_positions (lineup_id, position_slot, player_card_id)
        SELECT v_lineup_id, 'K', upi.player_card_id
        FROM user_player_inventory upi
        JOIN player_cards pc ON pc.id = upi.player_card_id
        WHERE upi.team_id = v_team.team_id AND pc.position = 'Kicker'
        ORDER BY RANDOM() LIMIT 1;
        
        INSERT INTO lineup_positions (lineup_id, position_slot, player_card_id)
        SELECT v_lineup_id, 'DEF', upi.player_card_id
        FROM user_player_inventory upi
        JOIN player_cards pc ON pc.id = upi.player_card_id
        WHERE upi.team_id = v_team.team_id AND pc.position = 'Defense'
        ORDER BY RANDOM() LIMIT 1;
      END IF;
    END IF;
    
    -- Calculate total points for the lineup
    SELECT COALESCE(SUM(ps.fantasy_points), 0) INTO v_total_points
    FROM lineup_positions lp
    JOIN player_cards pc ON pc.id = lp.player_card_id
    JOIN player_stats ps ON ps.player_id = pc.player_id 
      AND ps.week = v_current_week
    WHERE lp.lineup_id = v_lineup_id;
    
    -- Store team points
    v_team_points := v_team_points || jsonb_build_object(
      'team_id', v_team.team_id,
      'team_name', v_team.team_name,
      'points', v_total_points,
      'is_bot', v_team.is_bot
    );
  END LOOP;
  
  -- Create matchups and determine winners (simple random pairing for now)
  -- In a real implementation, you'd want a more sophisticated matchup system
  FOR i IN 1..6 LOOP
    DECLARE
      v_team1 JSONB := v_team_points->((i-1)*2);
      v_team2 JSONB := v_team_points->((i-1)*2 + 1);
      v_winner_id UUID;
      v_loser_id UUID;
    BEGIN
      IF v_team1->>'points' > v_team2->>'points' THEN
        v_winner_id := (v_team1->>'team_id')::UUID;
        v_loser_id := (v_team2->>'team_id')::UUID;
      ELSE
        v_winner_id := (v_team2->>'team_id')::UUID;
        v_loser_id := (v_team1->>'team_id')::UUID;
      END IF;
      
      -- Update wins/losses
      UPDATE teams SET wins = wins + 1 WHERE id = v_winner_id;
      UPDATE teams SET losses = losses + 1 WHERE id = v_loser_id;
      
      -- Build matchup result
      v_matchup := jsonb_build_object(
        'team1', v_team1,
        'team2', v_team2,
        'winner_id', v_winner_id
      );
      v_results := v_results || v_matchup;
    END;
  END LOOP;
  
  -- Increment week or mark season complete
  IF v_current_week >= 18 THEN
    UPDATE simulated_seasons
    SET is_complete = true, completed_at = NOW()
    WHERE id = p_season_id;
  ELSE
    UPDATE simulated_seasons
    SET current_week = v_current_week + 1
    WHERE id = p_season_id;
  END IF;
  
  RETURN jsonb_build_object(
    'week', v_current_week,
    'results', v_results,
    'is_complete', v_current_week >= 18
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION simulate_week IS 'Simulates one week of games in a simulated season';

-- 6. Create function to delete a simulated season and all bot teams
CREATE OR REPLACE FUNCTION delete_simulated_season(
  p_season_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_team_id UUID;
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM simulated_seasons 
    WHERE id = p_season_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Season not found or access denied';
  END IF;
  
  -- Delete all bot teams in this season (cascades to inventory, lineups, etc.)
  FOR v_team_id IN 
    SELECT id FROM teams 
    WHERE simulated_season_id = p_season_id AND is_bot = true
  LOOP
    -- Delete team inventories
    DELETE FROM user_player_inventory WHERE team_id = v_team_id;
    DELETE FROM user_token_inventory WHERE team_id = v_team_id;
    
    -- Delete lineups and positions
    DELETE FROM lineup_positions 
    WHERE lineup_id IN (SELECT id FROM weekly_lineups WHERE team_id = v_team_id);
    DELETE FROM weekly_lineups WHERE team_id = v_team_id;
    
    -- Delete transactions
    DELETE FROM transactions WHERE team_id = v_team_id;
    
    -- Delete the team
    DELETE FROM teams WHERE id = v_team_id;
  END LOOP;
  
  -- Unlink user team from season (keep the team, just remove season reference)
  UPDATE teams 
  SET simulated_season_id = NULL
  WHERE simulated_season_id = p_season_id AND is_bot = false;
  
  -- Delete the season record
  DELETE FROM simulated_seasons WHERE id = p_season_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION delete_simulated_season IS 'Deletes a simulated season and all associated bot teams';

-- 7. Add RLS policies for simulated_seasons
ALTER TABLE simulated_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own simulated seasons"
  ON simulated_seasons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own simulated seasons"
  ON simulated_seasons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own simulated seasons"
  ON simulated_seasons FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own simulated seasons"
  ON simulated_seasons FOR DELETE
  USING (auth.uid() = user_id);
