-- ============================================================================
-- ADD MISSING COLUMNS TO WEEKLY_GLOBAL_STATS
-- ============================================================================
-- Purpose: Add columns expected by edge functions (top_score, total_teams)
-- Created: 2024-11-21
-- ============================================================================

-- Add top_score column (alias for highest_score for edge function compatibility)
ALTER TABLE weekly_global_stats 
ADD COLUMN IF NOT EXISTS top_score NUMERIC DEFAULT 0;

-- Add total_teams column (alias for total_active_teams)
ALTER TABLE weekly_global_stats 
ADD COLUMN IF NOT EXISTS total_teams INTEGER DEFAULT 0;

-- Sync existing data
UPDATE weekly_global_stats 
SET 
  top_score = highest_score,
  total_teams = total_active_teams
WHERE top_score = 0 OR total_teams = 0;

-- Add comments
COMMENT ON COLUMN weekly_global_stats.top_score IS 
'Highest score for the week (alias for highest_score for edge function compatibility)';

COMMENT ON COLUMN weekly_global_stats.total_teams IS 
'Total number of teams that participated (alias for total_active_teams)';

-- Verify the changes
SELECT 
  week_number,
  season_year,
  median_score,
  average_score,
  top_score,
  highest_score,
  total_teams,
  total_active_teams
FROM weekly_global_stats
ORDER BY season_year DESC, week_number DESC
LIMIT 5;
