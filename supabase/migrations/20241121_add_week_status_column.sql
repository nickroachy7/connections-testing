-- ============================================================================
-- ADD WEEK STATUS COLUMN TO NFL_SEASON_CONFIG
-- ============================================================================
-- Purpose: Track the current state of the NFL week for automated workflows
-- Created: 2024-11-21
-- 
-- Week Status Flow:
-- 'scheduled' → 'live' → 'finalized' → back to 'scheduled' (next week)
-- ============================================================================

-- Add week_status column
ALTER TABLE nfl_season_config 
ADD COLUMN IF NOT EXISTS week_status TEXT DEFAULT 'scheduled' 
CHECK (week_status IN ('scheduled', 'live', 'finalized'));

-- Add comment explaining the column
COMMENT ON COLUMN nfl_season_config.week_status IS 
'Current state of the NFL week: scheduled (before games), live (games in progress), finalized (all games complete)';

-- Set current week to 'scheduled' if it's actually live (you can adjust this manually)
UPDATE nfl_season_config 
SET week_status = 'scheduled' 
WHERE is_active = true;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_nfl_season_config_week_status 
ON nfl_season_config(week_status) 
WHERE is_active = true;

-- Verify the change
SELECT 
  season_year,
  current_week,
  week_status,
  week_start_date,
  week_end_date,
  is_active
FROM nfl_season_config
WHERE is_active = true;
