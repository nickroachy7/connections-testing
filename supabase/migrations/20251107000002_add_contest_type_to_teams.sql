-- Add Contest Type Support to Teams
-- Date: 2024-11-07
-- Purpose: Link teams to contest types and add simulated_seasons support

-- ============================================================================
-- STEP 1: Add contest_type_id to teams table
-- ============================================================================

ALTER TABLE teams 
ADD COLUMN contest_type_id UUID REFERENCES contest_types(id) ON DELETE RESTRICT;

COMMENT ON COLUMN teams.contest_type_id IS 'The contest type/ruleset this team is competing in. Determines weeks, loss limits, PPR scoring, and starter pack boosts.';

-- Create index for performance
CREATE INDEX idx_teams_contest_type ON teams(contest_type_id);
CREATE INDEX idx_teams_contest_active ON teams(contest_type_id, is_active) WHERE is_bot = false;

-- ============================================================================
-- STEP 2: Set default contest type for existing teams (backwards compatibility)
-- ============================================================================

-- Update all existing teams to use the default 18-week half-PPR contest
UPDATE teams 
SET contest_type_id = get_default_contest_type_id()
WHERE contest_type_id IS NULL;

-- Make contest_type_id required for new teams
ALTER TABLE teams 
ALTER COLUMN contest_type_id SET NOT NULL;

-- ============================================================================
-- STEP 3: Add contest_type_id to simulated_seasons table
-- ============================================================================

ALTER TABLE simulated_seasons
ADD COLUMN contest_type_id UUID REFERENCES contest_types(id) ON DELETE RESTRICT;

COMMENT ON COLUMN simulated_seasons.contest_type_id IS 'Contest type rules for this simulated season';

-- Set default for existing simulated seasons
UPDATE simulated_seasons 
SET contest_type_id = get_default_contest_type_id()
WHERE contest_type_id IS NULL;

-- Make it required
ALTER TABLE simulated_seasons
ALTER COLUMN contest_type_id SET NOT NULL;

-- Create index
CREATE INDEX idx_simulated_seasons_contest_type ON simulated_seasons(contest_type_id);

-- ============================================================================
-- STEP 4: Update simulated_seasons to use dynamic total_weeks from contest_type
-- ============================================================================

-- Drop the hardcoded total_weeks column (we'll get it from contest_types now)
ALTER TABLE simulated_seasons
DROP COLUMN IF EXISTS total_weeks;

-- ============================================================================
-- STEP 5: Create view to show teams with contest info
-- ============================================================================

CREATE OR REPLACE VIEW teams_with_contest_info AS
SELECT 
  t.id,
  t.user_id,
  t.team_name,
  t.is_active,
  t.current_week,
  t.wins,
  t.losses,
  t.total_points,
  t.coins,
  t.created_at,
  t.eliminated_at,
  t.is_bot,
  t.simulated_season_id,
  
  -- Contest type info
  ct.id as contest_type_id,
  ct.name as contest_type_name,
  ct.display_name as contest_display_name,
  ct.total_weeks as contest_total_weeks,
  ct.max_losses as contest_max_losses,
  ct.scoring_type,
  ct.starter_tier_config,
  
  -- Calculated fields
  (ct.max_losses - t.losses) as losses_remaining,
  (ct.total_weeks - t.current_week) as weeks_remaining,
  (t.losses >= ct.max_losses) as is_eliminated_by_losses,
  ROUND((t.wins::numeric / NULLIF(t.wins + t.losses, 0)) * 100, 1) as win_percentage
  
FROM teams t
JOIN contest_types ct ON ct.id = t.contest_type_id;

COMMENT ON VIEW teams_with_contest_info IS 'Teams joined with their contest type details and calculated progress metrics';

-- ============================================================================
-- STEP 6: Create function to check if team should be eliminated
-- ============================================================================

CREATE OR REPLACE FUNCTION should_eliminate_team(p_team_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_team RECORD;
BEGIN
  SELECT 
    t.losses,
    ct.max_losses
  INTO v_team
  FROM teams t
  JOIN contest_types ct ON ct.id = t.contest_type_id
  WHERE t.id = p_team_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Team should be eliminated if they've reached max losses
  RETURN v_team.losses >= v_team.max_losses;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION should_eliminate_team IS 'Checks if a team has reached their contest type maximum loss limit';

-- ============================================================================
-- STEP 7: Create trigger to auto-eliminate teams at max losses
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_eliminate_team_on_max_losses()
RETURNS TRIGGER AS $$
DECLARE
  v_max_losses INTEGER;
BEGIN
  -- Only check when losses are updated
  IF NEW.losses != OLD.losses THEN
    -- Get max losses for this team's contest type
    SELECT max_losses INTO v_max_losses
    FROM contest_types
    WHERE id = NEW.contest_type_id;
    
    -- If team has reached max losses and isn't already eliminated
    IF NEW.losses >= v_max_losses AND NEW.eliminated_at IS NULL THEN
      NEW.eliminated_at := NOW();
      NEW.is_active := false;
      
      RAISE NOTICE 'Team % eliminated: % losses (max: %)', NEW.team_name, NEW.losses, v_max_losses;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_eliminate_on_losses
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION auto_eliminate_team_on_max_losses();

COMMENT ON TRIGGER trigger_auto_eliminate_on_losses ON teams IS 'Automatically eliminates teams when they reach their contest type max loss limit';

-- ============================================================================
-- VERIFICATION QUERIES (commented out, for manual testing)
-- ============================================================================

-- Check all teams have contest types assigned:
-- SELECT id, team_name, contest_type_id FROM teams;

-- View teams with contest info:
-- SELECT team_name, contest_display_name, wins, losses, losses_remaining FROM teams_with_contest_info WHERE is_bot = false;

-- Test elimination logic:
-- SELECT team_name, losses, contest_max_losses, should_eliminate_team(id) as should_eliminate FROM teams_with_contest_info;
