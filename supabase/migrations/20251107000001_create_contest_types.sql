-- Contest Types System Migration
-- Date: 2024-11-07
-- Purpose: Enable multiple contest types with configurable rules, weeks, loss limits, PPR scoring, and starter pack tier boosts

-- ============================================================================
-- STEP 1: Create contest_types table
-- ============================================================================

CREATE TABLE contest_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- Internal identifier (e.g., "18w_7l_1rp_half")
  display_name TEXT NOT NULL, -- UI-friendly name (e.g., "18 Weeks - 7 Losses (Half PPR)")
  description TEXT,
  
  -- Contest Duration & Rules
  total_weeks INTEGER NOT NULL DEFAULT 18,
  max_losses INTEGER NOT NULL DEFAULT 7,
  
  -- Scoring Configuration
  scoring_type TEXT NOT NULL DEFAULT 'half_ppr',
  
  -- Starter Pack Tier Boosts (auto-assigned tiers on team creation)
  -- Only applies to initial starter pack, NOT regular pack purchases
  starter_tier_config JSONB NOT NULL DEFAULT '{"role_player": 1, "starter": 0, "all_star": 0}'::jsonb,
  
  -- Display & Availability
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_scoring_type CHECK (scoring_type IN ('standard', 'half_ppr', 'full_ppr')),
  CONSTRAINT valid_weeks CHECK (total_weeks > 0 AND total_weeks <= 18),
  CONSTRAINT valid_losses CHECK (max_losses > 0),
  CONSTRAINT valid_tier_config CHECK (
    (starter_tier_config->>'role_player')::int >= 0 AND
    (starter_tier_config->>'role_player')::int <= 8 AND
    (starter_tier_config->>'starter')::int >= 0 AND
    (starter_tier_config->>'starter')::int <= 8 AND
    (starter_tier_config->>'all_star')::int >= 0 AND
    (starter_tier_config->>'all_star')::int <= 8
  )
);

COMMENT ON TABLE contest_types IS 'Defines different contest types with configurable rules, duration, loss limits, scoring systems, and starter pack tier boosts';
COMMENT ON COLUMN contest_types.name IS 'Unique internal identifier for the contest type';
COMMENT ON COLUMN contest_types.display_name IS 'User-facing display name shown in UI';
COMMENT ON COLUMN contest_types.total_weeks IS 'Number of weeks in this contest (1-18)';
COMMENT ON COLUMN contest_types.max_losses IS 'Maximum losses before elimination';
COMMENT ON COLUMN contest_types.scoring_type IS 'PPR scoring system: standard (0 PPR), half_ppr (0.5 PPR), full_ppr (1.0 PPR)';
COMMENT ON COLUMN contest_types.starter_tier_config IS 'Number of auto-boosted players at each tier in starter pack: {"role_player": N, "starter": N, "all_star": N}';

-- Create indexes
CREATE INDEX idx_contest_types_active ON contest_types(is_active, sort_order);
CREATE INDEX idx_contest_types_name ON contest_types(name);

-- ============================================================================
-- STEP 2: Populate initial contest types
-- ============================================================================

INSERT INTO contest_types (name, display_name, description, total_weeks, max_losses, scoring_type, starter_tier_config, sort_order) VALUES
-- 18 Week Full Season Contests
(
  '18w_7l_1rp_half',
  '18 Weeks - 7 Losses (Half PPR)',
  'Full NFL regular season with 1 Role Player boost. Half point per reception.',
  18,
  7,
  'half_ppr',
  '{"role_player": 1, "starter": 0, "all_star": 0}'::jsonb,
  1
),
(
  '18w_7l_1rp_full',
  '18 Weeks - 7 Losses (Full PPR)',
  'Full NFL regular season with 1 Role Player boost. Full point per reception.',
  18,
  7,
  'full_ppr',
  '{"role_player": 1, "starter": 0, "all_star": 0}'::jsonb,
  2
),

-- 12 Week Mid-Season Contests
(
  '12w_5l_2rp_1s_half',
  '12 Weeks - 5 Losses (Half PPR)',
  '12-week season with 2 Role Players and 1 Starter boost. Half point per reception.',
  12,
  5,
  'half_ppr',
  '{"role_player": 2, "starter": 1, "all_star": 0}'::jsonb,
  3
),
(
  '12w_5l_2rp_1s_full',
  '12 Weeks - 5 Losses (Full PPR)',
  '12-week season with 2 Role Players and 1 Starter boost. Full point per reception.',
  12,
  5,
  'full_ppr',
  '{"role_player": 2, "starter": 1, "all_star": 0}'::jsonb,
  4
),

-- 8 Week Short Contests
(
  '8w_3l_3rp_2s_half',
  '8 Weeks - 3 Losses (Half PPR)',
  '8-week sprint with 3 Role Players and 2 Starters boost. Half point per reception.',
  8,
  3,
  'half_ppr',
  '{"role_player": 3, "starter": 2, "all_star": 0}'::jsonb,
  5
),
(
  '8w_3l_3rp_2s_full',
  '8 Weeks - 3 Losses (Full PPR)',
  '8-week sprint with 3 Role Players and 2 Starters boost. Full point per reception.',
  8,
  3,
  'full_ppr',
  '{"role_player": 3, "starter": 2, "all_star": 0}'::jsonb,
  6
),

-- 3 Week Ultra-Fast Contests
(
  '3w_1l_3rp_2s_1a_half',
  '3 Weeks - 1 Loss (Half PPR)',
  'Ultra-fast 3-week contest with 3 Role Players, 2 Starters, and 1 All-Star boost. Half point per reception.',
  3,
  1,
  'half_ppr',
  '{"role_player": 3, "starter": 2, "all_star": 1}'::jsonb,
  7
),
(
  '3w_1l_3rp_2s_1a_full',
  '3 Weeks - 1 Loss (Full PPR)',
  'Ultra-fast 3-week contest with 3 Role Players, 2 Starters, and 1 All-Star boost. Full point per reception.',
  3,
  1,
  'full_ppr',
  '{"role_player": 3, "starter": 2, "all_star": 1}'::jsonb,
  8
);

-- ============================================================================
-- STEP 3: Add RLS policies
-- ============================================================================

ALTER TABLE contest_types ENABLE ROW LEVEL SECURITY;

-- Everyone can read contest types (public catalog)
CREATE POLICY "Contest types are publicly readable"
  ON contest_types FOR SELECT
  USING (is_active = true);

-- Only admins can modify (future admin panel)
-- For now, we'll use service role for modifications

-- ============================================================================
-- STEP 4: Create helper function to get default contest type
-- ============================================================================

CREATE OR REPLACE FUNCTION get_default_contest_type_id()
RETURNS UUID AS $$
BEGIN
  -- Return the first 18-week half-PPR contest as default
  RETURN (
    SELECT id 
    FROM contest_types 
    WHERE name = '18w_7l_1rp_half' 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_default_contest_type_id IS 'Returns the default contest type ID (18w_7l_1rp_half) for backwards compatibility';

-- ============================================================================
-- VERIFICATION QUERIES (commented out, for manual testing)
-- ============================================================================

-- SELECT * FROM contest_types ORDER BY sort_order;
-- SELECT name, display_name, total_weeks, max_losses, scoring_type, starter_tier_config FROM contest_types;
