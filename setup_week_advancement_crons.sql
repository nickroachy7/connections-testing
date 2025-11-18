-- ============================================================================
-- WEEK ADVANCEMENT CRON JOBS SETUP
-- ============================================================================
-- This script sets up the automated cron jobs for week finalization and advancement
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- STEP 1: Check existing cron jobs
-- ============================================================================
SELECT 
  jobname,
  schedule,
  active,
  command
FROM cron.job 
WHERE jobname IN (
  'finalize-week-results', 
  'advance-to-next-week',
  'update-projections-after-advance',
  'sync-nfl-live-stats',
  'lock-lineups',
  'update-live-stats-working',
  'calculate-global-average-optimized'
)
ORDER BY jobname;

-- ============================================================================
-- STEP 2: Check recent execution history
-- ============================================================================
SELECT 
  j.jobname,
  jrd.start_time,
  jrd.end_time,
  jrd.status,
  LEFT(jrd.return_message, 100) as message_preview
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname IN (
  'finalize-week-results', 
  'advance-to-next-week',
  'update-projections-after-advance'
)
ORDER BY jrd.start_time DESC 
LIMIT 10;

-- ============================================================================
-- STEP 3: Set app settings (REPLACE WITH YOUR ACTUAL VALUES)
-- ============================================================================
-- Get these from: Supabase Dashboard → Project Settings → API

-- IMPORTANT: Replace these values before running!
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';
ALTER DATABASE postgres SET app.settings.supabase_anon_key = 'YOUR_ANON_KEY_HERE';

-- To verify settings were saved:
SELECT current_setting('app.settings.supabase_url', true) as url,
       LEFT(current_setting('app.settings.supabase_anon_key', true), 20) || '...' as anon_key_preview;

-- ============================================================================
-- STEP 4: Create database function for week advancement (if not exists)
-- ============================================================================
CREATE OR REPLACE FUNCTION advance_nfl_week()
RETURNS TABLE(
  old_week INTEGER,
  new_week INTEGER,
  season_year INTEGER
) AS $$
DECLARE
  v_current_week INTEGER;
  v_new_week INTEGER;
  v_season_year INTEGER;
BEGIN
  -- Get current week
  SELECT current_week, season_year 
  INTO v_current_week, v_season_year
  FROM nfl_season_config 
  WHERE is_active = true
  LIMIT 1;

  -- Calculate new week
  v_new_week := v_current_week + 1;

  -- Update to new week
  UPDATE nfl_season_config
  SET 
    current_week = v_new_week,
    week_start_date = week_end_date + INTERVAL '1 second',
    week_end_date = week_end_date + INTERVAL '7 days'
  WHERE is_active = true;

  -- Create weekly_global_stats entry for new week
  INSERT INTO weekly_global_stats (week_number, season_year, average_score, total_teams)
  VALUES (v_new_week, v_season_year, 0, 0)
  ON CONFLICT (week_number, season_year) DO NOTHING;

  -- Unlock all players
  UPDATE user_player_inventory
  SET is_locked = FALSE
  WHERE is_locked = TRUE;

  -- Return results
  RETURN QUERY SELECT v_current_week, v_new_week, v_season_year;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: Unschedule existing jobs (to avoid duplicates)
-- ============================================================================
SELECT cron.unschedule('finalize-week-results') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'finalize-week-results');

SELECT cron.unschedule('advance-to-next-week') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'advance-to-next-week');

-- ============================================================================
-- STEP 6: Schedule finalize-week-results (Tuesday 12:01 AM)
-- ============================================================================
SELECT cron.schedule(
  'finalize-week-results',
  '1 0 * * 2',  -- Tuesday at 12:01 AM
  $$
  SELECT net.http_post(
    url:=current_setting('app.settings.supabase_url') || '/functions/v1/finalize-week',
    headers:=jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    )
  ) AS request_id;
  $$
);

-- ============================================================================
-- STEP 7: Schedule advance-to-next-week (Tuesday 8:00 PM)
-- ============================================================================
SELECT cron.schedule(
  'advance-to-next-week',
  '0 20 * * 2',  -- Tuesday at 8:00 PM
  $$
  SELECT advance_nfl_week();
  $$
);

-- ============================================================================
-- STEP 8: Verify jobs were created
-- ============================================================================
SELECT 
  jobname,
  schedule,
  active,
  CASE 
    WHEN command LIKE '%finalize-week%' THEN '✓ Calls finalize-week edge function'
    WHEN command LIKE '%advance_nfl_week%' THEN '✓ Calls database function'
    ELSE LEFT(command, 50)
  END as description
FROM cron.job 
WHERE jobname IN ('finalize-week-results', 'advance-to-next-week')
ORDER BY jobname;

-- ============================================================================
-- STEP 9: Manual test commands (optional)
-- ============================================================================
-- Test week advancement manually:
-- SELECT * FROM advance_nfl_week();

-- Test finalize-week manually (requires curl or similar):
-- You'll need to call the edge function from your terminal or Postman

-- ============================================================================
-- SUCCESS! 
-- ============================================================================
-- Your cron jobs are now set up:
-- - Tuesday 12:01 AM: Finalize week results (calculate wins/losses)
-- - Tuesday 8:00 PM: Advance to next week (unlock players)
-- 
-- Next steps:
-- 1. Replace the app settings values above with your actual Supabase URL and anon key
-- 2. Verify the jobs are listed in the verification query
-- 3. Check cron.job_run_details after Tuesday to confirm they ran
-- ============================================================================
