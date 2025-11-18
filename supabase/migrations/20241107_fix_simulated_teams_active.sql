-- Fix: Ensure all simulated season teams start with is_active = true
-- This fixes the "No active teams remaining" error on first simulation

-- Update any existing simulated teams that don't have is_active set
UPDATE teams
SET is_active = true
WHERE simulated_season_id IS NOT NULL
  AND (is_active IS NULL OR is_active = false)
  AND eliminated_at IS NULL;

-- Ensure teams table has proper default
ALTER TABLE teams ALTER COLUMN is_active SET DEFAULT true;
