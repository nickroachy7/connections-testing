-- Simplified Token System Migration
-- Date: 2024-11-05
-- Purpose: Simplify token objectives to use only basic stats we reliably have

-- Create function to atomically increment token triggers
CREATE OR REPLACE FUNCTION increment_token_triggers(token_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE user_token_inventory
  SET 
    times_triggered = times_triggered + 1,
    experience_points = experience_points + 50
  WHERE id = token_id;
END;
$$ LANGUAGE plpgsql;

-- Clear existing complex tokens
TRUNCATE token_cards CASCADE;

-- Insert simplified token cards that use only stats we reliably have
INSERT INTO token_cards (token_name, token_type, condition, bonus_points, base_value, description) VALUES
  -- Basic tokens (5 points)
  ('TD Scorer', 'touchdown', 
   '{"stat": "total_tds", "operator": ">=", "value": 1, "game_scope": "single_game"}'::jsonb,
   5, 25, 'Score 1+ TD in a game to earn 5 bonus points'),
  
  ('Yards Bonus', 'yards', 
   '{"stat": "total_yards", "operator": ">=", "value": 100, "game_scope": "single_game"}'::jsonb,
   5, 30, 'Gain 100+ total yards in a game to earn 5 bonus points'),
  
  -- Medium tokens (8-10 points)
  ('Big Reception Game', 'reception', 
   '{"stat": "receptions", "operator": ">=", "value": 8, "game_scope": "single_game"}'::jsonb,
   8, 40, 'Catch 8+ passes in a game to earn 8 bonus points'),
  
  ('Big Game', 'performance', 
   '{"stat": "fantasy_points", "operator": ">=", "value": 15, "game_scope": "single_game"}'::jsonb,
   8, 45, 'Score 15+ fantasy points in a game to earn 8 bonus points'),
  
  ('Multi-TD', 'touchdown', 
   '{"stat": "total_tds", "operator": ">=", "value": 2, "game_scope": "single_game"}'::jsonb,
   10, 50, 'Score 2+ TDs in a game to earn 10 bonus points'),
  
  -- Advanced tokens (12-15 points)
  ('Explosive Yards', 'yards', 
   '{"stat": "total_yards", "operator": ">=", "value": 150, "game_scope": "single_game"}'::jsonb,
   12, 60, 'Gain 150+ total yards in a game to earn 12 bonus points'),
  
  ('Elite Performance', 'performance', 
   '{"stat": "fantasy_points", "operator": ">=", "value": 25, "game_scope": "single_game"}'::jsonb,
   15, 80, 'Score 25+ fantasy points in a game to earn 15 bonus points'),
  
  -- Premium token (20 points)
  ('Hat Trick', 'touchdown', 
   '{"stat": "total_tds", "operator": ">=", "value": 3, "game_scope": "single_game"}'::jsonb,
   20, 100, 'Score 3+ TDs in a game to earn 20 bonus points');

-- Comments documenting the token system
COMMENT ON TABLE token_cards IS 'Token cards that provide bonus fantasy points when conditions are met. Simplified to use only stats we reliably capture: total_tds, total_yards, receptions, and fantasy_points.';

COMMENT ON FUNCTION increment_token_triggers IS 'Atomically increments the times_triggered counter and adds 50 XP when a token condition is successfully met during live stat updates.';
