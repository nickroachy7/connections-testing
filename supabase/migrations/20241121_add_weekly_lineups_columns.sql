-- ============================================================================
-- ADD MISSING COLUMNS TO WEEKLY_LINEUPS
-- ============================================================================
-- Purpose: Add beat_median and beat_average columns for win/loss tracking
-- Created: 2024-11-21
-- ============================================================================

-- Add beat_median column (primary win/loss indicator)
ALTER TABLE weekly_lineups 
ADD COLUMN IF NOT EXISTS beat_median BOOLEAN DEFAULT false;

-- Add beat_average column (legacy compatibility)
ALTER TABLE weekly_lineups 
ADD COLUMN IF NOT EXISTS beat_average BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN weekly_lineups.beat_median IS 
'Whether this lineup scored at or above the median score for the week (determines Win/Loss)';

COMMENT ON COLUMN weekly_lineups.beat_average IS 
'Legacy column kept in sync with beat_median for backward compatibility';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_weekly_lineups_beat_median 
ON weekly_lineups(beat_median) 
WHERE status = 'completed';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'weekly_lineups'
  AND column_name IN ('beat_median', 'beat_average', 'status', 'total_points');
