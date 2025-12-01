-- ============================================
-- LEAGUE CONTEST CONFIGURATION SYSTEM
-- Enables commissioners to define contest rules for their leagues
-- ============================================

-- ============================================
-- 1. LEAGUE CONTEST CONFIG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS league_contest_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  
  -- SCORING FORMAT
  scoring_type TEXT NOT NULL DEFAULT 'half_ppr' 
    CHECK (scoring_type IN ('standard', 'half_ppr', 'full_ppr')),
  
  -- WIN/LOSS DETERMINATION
  -- 'median' = beat league median for W
  -- 'h2h' = head-to-head matchups
  -- 'both' = must beat opponent AND median (hardcore mode)
  win_condition TEXT NOT NULL DEFAULT 'median'
    CHECK (win_condition IN ('median', 'h2h', 'both')),
  
  -- ELIMINATION RULES
  -- 'none' = no elimination (full season record tracking)
  -- 'strike' = X losses and you're out (traditional)
  -- 'survivor' = single loss elimination (hardcore)
  elimination_type TEXT NOT NULL DEFAULT 'strike'
    CHECK (elimination_type IN ('none', 'strike', 'survivor')),
  max_losses INTEGER NOT NULL DEFAULT 3 
    CHECK (max_losses >= 1 AND max_losses <= 18),
  
  -- RESTART RULES (only applies if elimination_type != 'none')
  -- Restarts are free, commissioner controls if allowed
  restart_allowed BOOLEAN NOT NULL DEFAULT false,
  max_restarts INTEGER DEFAULT NULL -- NULL = unlimited, 0+ = limited
    CHECK (max_restarts IS NULL OR (max_restarts >= 0 AND max_restarts <= 10)),
  restart_reset_record BOOLEAN DEFAULT true, -- true = 0-0, false = keep wins
  
  -- SEASON STRUCTURE
  -- Start week is set when league is created (current NFL week)
  total_weeks INTEGER NOT NULL DEFAULT 18 
    CHECK (total_weeks >= 1 AND total_weeks <= 18),
  start_week INTEGER NOT NULL DEFAULT 1 
    CHECK (start_week >= 1 AND start_week <= 18),
  
  -- STARTER PACK CONFIG (tier boosts for new teams)
  starter_tier_config JSONB DEFAULT '{"role_player": 1, "starter": 0, "all_star": 0}'::jsonb,
  
  -- METADATA
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One config per league
  UNIQUE(league_id)
);

-- Index for quick lookups
CREATE INDEX idx_league_contest_config_league ON league_contest_config(league_id);

-- ============================================
-- 2. HEAD-TO-HEAD MATCHUPS SCAFFOLD
-- For future H2H implementation
-- ============================================
CREATE TABLE IF NOT EXISTS league_matchups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  week INTEGER NOT NULL CHECK (week >= 1 AND week <= 18),
  season INTEGER NOT NULL DEFAULT 2024,
  
  -- The two teams facing off
  team_a_id UUID NOT NULL REFERENCES league_teams(id) ON DELETE CASCADE,
  team_b_id UUID NOT NULL REFERENCES league_teams(id) ON DELETE CASCADE,
  
  -- Scores (populated after week finalizes)
  team_a_score NUMERIC DEFAULT NULL,
  team_b_score NUMERIC DEFAULT NULL,
  
  -- Winner (NULL until finalized)
  winner_team_id UUID REFERENCES league_teams(id) ON DELETE SET NULL,
  is_tie BOOLEAN DEFAULT false,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'active', 'completed')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ DEFAULT NULL,
  
  -- Prevent duplicate matchups
  UNIQUE(league_id, week, season, team_a_id, team_b_id),
  
  -- Teams can't play themselves
  CHECK (team_a_id != team_b_id)
);

CREATE INDEX idx_league_matchups_league_week ON league_matchups(league_id, week, season);
CREATE INDEX idx_league_matchups_team_a ON league_matchups(team_a_id);
CREATE INDEX idx_league_matchups_team_b ON league_matchups(team_b_id);

-- ============================================
-- 3. RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE league_contest_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_matchups ENABLE ROW LEVEL SECURITY;

-- league_contest_config policies
-- Anyone can view config for leagues they're a member of
CREATE POLICY "League members can view contest config"
  ON league_contest_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = league_contest_config.league_id
      AND lm.user_id = auth.uid()
    )
  );

-- Only commissioner can update contest config
CREATE POLICY "Commissioner can update contest config"
  ON league_contest_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.id = league_contest_config.league_id
      AND l.commissioner_id = auth.uid()
    )
  );

-- Insert handled by trigger (system-level)
CREATE POLICY "System can insert contest config"
  ON league_contest_config FOR INSERT
  WITH CHECK (true);

-- league_matchups policies
-- Anyone can view matchups for leagues they're a member of
CREATE POLICY "League members can view matchups"
  ON league_matchups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = league_matchups.league_id
      AND lm.user_id = auth.uid()
    )
  );

-- System handles insert/update via edge functions
CREATE POLICY "System can manage matchups"
  ON league_matchups FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4. AUTO-CREATE CONFIG ON LEAGUE CREATION
-- ============================================

-- Function to auto-create default contest config when league is created
CREATE OR REPLACE FUNCTION create_default_league_contest_config()
RETURNS TRIGGER AS $$
DECLARE
  current_nfl_week INTEGER;
BEGIN
  -- Get current NFL week
  SELECT current_week INTO current_nfl_week
  FROM nfl_season_config
  WHERE is_active = true
  LIMIT 1;
  
  -- Default to week 1 if not found
  IF current_nfl_week IS NULL THEN
    current_nfl_week := 1;
  END IF;

  -- Create default contest config
  INSERT INTO league_contest_config (
    league_id,
    scoring_type,
    win_condition,
    elimination_type,
    max_losses,
    restart_allowed,
    restart_reset_record,
    total_weeks,
    start_week,
    starter_tier_config
  ) VALUES (
    NEW.id,
    'half_ppr',
    'median',
    CASE WHEN NEW.elimination_enabled THEN 'strike' ELSE 'none' END,
    3,
    NEW.restart_allowed,
    true,
    18,
    current_nfl_week,
    '{"role_player": 1, "starter": 0, "all_star": 0}'::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create config
DROP TRIGGER IF EXISTS trigger_create_league_contest_config ON leagues;
CREATE TRIGGER trigger_create_league_contest_config
  AFTER INSERT ON leagues
  FOR EACH ROW
  EXECUTE FUNCTION create_default_league_contest_config();

-- ============================================
-- 5. UPDATE TIMESTAMP TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_league_contest_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_league_contest_config_timestamp ON league_contest_config;
CREATE TRIGGER trigger_update_league_contest_config_timestamp
  BEFORE UPDATE ON league_contest_config
  FOR EACH ROW
  EXECUTE FUNCTION update_league_contest_config_timestamp();

-- ============================================
-- 6. HELPER FUNCTION: Generate H2H Matchups
-- For future use when H2H mode is activated
-- ============================================
CREATE OR REPLACE FUNCTION generate_league_matchups(
  p_league_id UUID,
  p_week INTEGER,
  p_season INTEGER DEFAULT 2024
)
RETURNS INTEGER AS $$
DECLARE
  team_ids UUID[];
  team_count INTEGER;
  matchups_created INTEGER := 0;
  i INTEGER;
BEGIN
  -- Get all active teams in the league
  SELECT ARRAY_AGG(id ORDER BY RANDOM())
  INTO team_ids
  FROM league_teams
  WHERE league_id = p_league_id
  AND is_active = true;
  
  team_count := COALESCE(array_length(team_ids, 1), 0);
  
  -- Need at least 2 teams for matchups
  IF team_count < 2 THEN
    RETURN 0;
  END IF;
  
  -- Pair teams up (simple round-robin for now)
  FOR i IN 1..team_count/2 LOOP
    INSERT INTO league_matchups (
      league_id,
      week,
      season,
      team_a_id,
      team_b_id,
      status
    ) VALUES (
      p_league_id,
      p_week,
      p_season,
      team_ids[i * 2 - 1],
      team_ids[i * 2],
      'scheduled'
    )
    ON CONFLICT (league_id, week, season, team_a_id, team_b_id) DO NOTHING;
    
    matchups_created := matchups_created + 1;
  END LOOP;
  
  -- If odd number of teams, one gets a bye (no matchup created)
  
  RETURN matchups_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. BACKFILL: Create configs for existing leagues
-- ============================================
DO $$
DECLARE
  current_nfl_week INTEGER;
BEGIN
  -- Get current NFL week
  SELECT current_week INTO current_nfl_week
  FROM nfl_season_config
  WHERE is_active = true
  LIMIT 1;
  
  IF current_nfl_week IS NULL THEN
    current_nfl_week := 1;
  END IF;

  -- Create config for any leagues that don't have one
  INSERT INTO league_contest_config (
    league_id,
    scoring_type,
    win_condition,
    elimination_type,
    max_losses,
    restart_allowed,
    restart_reset_record,
    total_weeks,
    start_week,
    starter_tier_config
  )
  SELECT 
    l.id,
    'half_ppr',
    'median',
    CASE WHEN l.elimination_enabled THEN 'strike' ELSE 'none' END,
    3,
    l.restart_allowed,
    true,
    18,
    current_nfl_week,
    '{"role_player": 1, "starter": 0, "all_star": 0}'::jsonb
  FROM leagues l
  WHERE NOT EXISTS (
    SELECT 1 FROM league_contest_config lcc
    WHERE lcc.league_id = l.id
  );
END $$;

-- ============================================
-- 8. VIEW: League with full contest config
-- ============================================
CREATE OR REPLACE VIEW league_full_config AS
SELECT 
  l.*,
  lcc.scoring_type,
  lcc.win_condition,
  lcc.elimination_type,
  lcc.max_losses,
  lcc.restart_allowed AS config_restart_allowed,
  lcc.max_restarts,
  lcc.restart_reset_record,
  lcc.total_weeks,
  lcc.start_week,
  lcc.starter_tier_config
FROM leagues l
LEFT JOIN league_contest_config lcc ON lcc.league_id = l.id;

COMMENT ON TABLE league_contest_config IS 'Contest configuration for private leagues. Commissioners set these rules when creating a league.';
COMMENT ON TABLE league_matchups IS 'Head-to-head matchup pairings for leagues using H2H win condition. Scaffolded for future implementation.';
COMMENT ON VIEW league_full_config IS 'Convenience view joining leagues with their contest configuration.';
