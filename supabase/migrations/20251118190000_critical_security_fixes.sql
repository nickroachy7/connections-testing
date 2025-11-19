-- Critical Security & Performance Fixes
-- Date: 2025-11-18
-- Description: Fixes RLS, indexes, duplicate policies, and function security

-- =====================================================
-- PART 1: ENABLE RLS ON PUBLIC TABLES
-- =====================================================

-- Enable RLS on tables that were missing it
ALTER TABLE edge_function_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfl_season_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulated_week_results ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for edge_function_logs (service role only)
CREATE POLICY "Service role can manage function logs"
ON edge_function_logs
FOR ALL
USING (auth.role() = 'service_role');

-- Add RLS policy for nfl_season_config (public read, service role write)
CREATE POLICY "Anyone can view NFL season config"
ON nfl_season_config
FOR SELECT
USING (true);

CREATE POLICY "Service role can manage season config"
ON nfl_season_config
FOR ALL
USING (auth.role() = 'service_role');

-- Add RLS policy for simulated_week_results (users can view own seasons)
CREATE POLICY "Users can view own simulated week results"
ON simulated_week_results
FOR SELECT
USING (
  season_id IN (
    SELECT id FROM simulated_seasons WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage simulated results"
ON simulated_week_results
FOR ALL
USING (auth.role() = 'service_role');

-- =====================================================
-- PART 2: ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

-- These indexes improve query performance on foreign key lookups
CREATE INDEX IF NOT EXISTS idx_simulated_seasons_user_team_id 
ON simulated_seasons(user_team_id);

CREATE INDEX IF NOT EXISTS idx_user_packs_pack_id 
ON user_packs(pack_id);

CREATE INDEX IF NOT EXISTS idx_user_player_inventory_player_card_id 
ON user_player_inventory(player_card_id);

CREATE INDEX IF NOT EXISTS idx_user_token_inventory_team_id 
ON user_token_inventory(team_id);

CREATE INDEX IF NOT EXISTS idx_user_token_inventory_token_card_id 
ON user_token_inventory(token_card_id);

-- =====================================================
-- PART 3: ADD INDEXES FOR COMMON QUERY PATTERNS
-- =====================================================

-- Leaderboard queries
CREATE INDEX IF NOT EXISTS idx_weekly_lineups_week_status 
ON weekly_lineups(week_number, season_year, status);

-- Live game lookups
CREATE INDEX IF NOT EXISTS idx_game_scores_week_status 
ON game_scores(week_number, season_year, game_status);

-- User team queries
CREATE INDEX IF NOT EXISTS idx_teams_user_active 
ON teams(user_id, is_active);

-- Contest type lookups
CREATE INDEX IF NOT EXISTS idx_contest_types_active_order 
ON contest_types(is_active, sort_order) WHERE is_active = true;

-- =====================================================
-- PART 4: REMOVE DUPLICATE INDEXES
-- =====================================================

-- player_game_stats has duplicate indexes
DROP INDEX IF EXISTS player_game_stats_game_id_player_card_id_key;
-- Keeping: player_game_stats_game_player_unique

-- weekly_global_stats has 3 identical indexes
DROP INDEX IF EXISTS idx_weekly_global_week;
DROP INDEX IF EXISTS weekly_global_stats_week_season_key;
-- Keeping: weekly_global_stats_week_number_season_year_key

-- =====================================================
-- PART 5: REMOVE DUPLICATE RLS POLICIES
-- =====================================================

-- Remove duplicate INSERT policies on user_player_inventory
DROP POLICY IF EXISTS "Users can insert into own inventory" ON user_player_inventory;
-- Keeping: "Users can insert own inventory"

-- Remove duplicate INSERT policies on user_token_inventory
DROP POLICY IF EXISTS "Users can insert into own token inventory" ON user_token_inventory;
-- Keeping: "Users can insert own tokens"

-- =====================================================
-- PART 6: OPTIMIZE RLS POLICIES (Wrap auth.uid in subquery)
-- =====================================================

-- This prevents re-evaluation of auth.uid() for each row

-- Teams policies
DROP POLICY IF EXISTS "Users can view own teams" ON teams;
CREATE POLICY "Users can view own teams"
ON teams
FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own teams" ON teams;
CREATE POLICY "Users can insert own teams"
ON teams
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own teams" ON teams;
CREATE POLICY "Users can update own teams"
ON teams
FOR UPDATE
USING (user_id = (SELECT auth.uid()));

-- User player inventory policies
DROP POLICY IF EXISTS "Users can view own inventory" ON user_player_inventory;
CREATE POLICY "Users can view own inventory"
ON user_player_inventory
FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own inventory" ON user_player_inventory;
CREATE POLICY "Users can insert own inventory"
ON user_player_inventory
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own inventory" ON user_player_inventory;
CREATE POLICY "Users can update own inventory"
ON user_player_inventory
FOR UPDATE
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete from own inventory" ON user_player_inventory;
CREATE POLICY "Users can delete from own inventory"
ON user_player_inventory
FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- User token inventory policies
DROP POLICY IF EXISTS "Users can view own token inventory" ON user_token_inventory;
CREATE POLICY "Users can view own token inventory"
ON user_token_inventory
FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own tokens" ON user_token_inventory;
CREATE POLICY "Users can insert own tokens"
ON user_token_inventory
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own token inventory" ON user_token_inventory;
CREATE POLICY "Users can update own token inventory"
ON user_token_inventory
FOR UPDATE
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete from own token inventory" ON user_token_inventory;
CREATE POLICY "Users can delete from own token inventory"
ON user_token_inventory
FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- Weekly lineups policies
DROP POLICY IF EXISTS "Users can view own lineups" ON weekly_lineups;
CREATE POLICY "Users can view own lineups"
ON weekly_lineups
FOR SELECT
USING (
  team_id IN (
    SELECT id FROM teams WHERE user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert own lineups" ON weekly_lineups;
CREATE POLICY "Users can insert own lineups"
ON weekly_lineups
FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT id FROM teams WHERE user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can update own lineups" ON weekly_lineups;
CREATE POLICY "Users can update own lineups"
ON weekly_lineups
FOR UPDATE
USING (
  team_id IN (
    SELECT id FROM teams WHERE user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can delete own lineups" ON weekly_lineups;
CREATE POLICY "Users can delete own lineups"
ON weekly_lineups
FOR DELETE
USING (
  team_id IN (
    SELECT id FROM teams WHERE user_id = (SELECT auth.uid())
  )
);

-- Transactions policies
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions"
ON transactions
FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
CREATE POLICY "Users can insert own transactions"
ON transactions
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

-- Users table policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile"
ON users
FOR SELECT
USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
ON users
FOR UPDATE
USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Enable insert for authentication" ON users;
CREATE POLICY "Enable insert for authentication"
ON users
FOR INSERT
WITH CHECK (id = (SELECT auth.uid()));

-- User packs policies
DROP POLICY IF EXISTS "Users can view own packs" ON user_packs;
CREATE POLICY "Users can view own packs"
ON user_packs
FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own packs" ON user_packs;
CREATE POLICY "Users can insert own packs"
ON user_packs
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own packs" ON user_packs;
CREATE POLICY "Users can update own packs"
ON user_packs
FOR UPDATE
USING (user_id = (SELECT auth.uid()));

-- Simulated seasons policies
DROP POLICY IF EXISTS "Users can view their own simulated seasons" ON simulated_seasons;
CREATE POLICY "Users can view their own simulated seasons"
ON simulated_seasons
FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create their own simulated seasons" ON simulated_seasons;
CREATE POLICY "Users can create their own simulated seasons"
ON simulated_seasons
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own simulated seasons" ON simulated_seasons;
CREATE POLICY "Users can update their own simulated seasons"
ON simulated_seasons
FOR UPDATE
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own simulated seasons" ON simulated_seasons;
CREATE POLICY "Users can delete their own simulated seasons"
ON simulated_seasons
FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- =====================================================
-- PART 7: ADD TRANSACTION TYPES FOR WEEK RESULTS
-- =====================================================

-- finalize-week function needs these transaction types
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_type' AND e.enumlabel = 'week_win') THEN
    ALTER TYPE transaction_type ADD VALUE 'week_win';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_type' AND e.enumlabel = 'week_loss') THEN
    ALTER TYPE transaction_type ADD VALUE 'week_loss';
  END IF;
END $$;

-- =====================================================
-- PART 8: ADD WEEK ADVANCEMENT ADVISORY LOCK
-- =====================================================

-- Prevent race conditions during week advancement
CREATE OR REPLACE FUNCTION advance_nfl_week()
RETURNS TABLE(
  previous_week INTEGER,
  new_week INTEGER,
  season_year INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_week INTEGER;
  v_current_year INTEGER;
  v_new_week INTEGER;
BEGIN
  -- Try to acquire advisory lock (prevent concurrent execution)
  IF NOT pg_try_advisory_lock(12345678) THEN
    RAISE NOTICE 'Week advancement already in progress';
    RETURN;
  END IF;

  BEGIN
    -- Get current week
    SELECT current_week, season_year 
    INTO v_current_week, v_current_year
    FROM nfl_season_config 
    WHERE is_active = true;

    IF v_current_week IS NULL THEN
      RAISE EXCEPTION 'No active NFL season config found';
    END IF;

    -- Calculate new week
    v_new_week := v_current_week + 1;

    -- Update to new week
    UPDATE nfl_season_config
    SET 
      current_week = v_new_week,
      updated_at = NOW()
    WHERE is_active = true;

    -- Return results
    RETURN QUERY SELECT v_current_week, v_new_week, v_current_year;

  EXCEPTION
    WHEN OTHERS THEN
      -- Release lock on error
      PERFORM pg_advisory_unlock(12345678);
      RAISE;
  END;

  -- Release advisory lock
  PERFORM pg_advisory_unlock(12345678);
END;
$$;

COMMENT ON FUNCTION advance_nfl_week() IS 'Advances NFL week with advisory lock to prevent race conditions';
