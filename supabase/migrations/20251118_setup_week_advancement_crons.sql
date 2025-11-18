-- ============================================================================
-- WEEK ADVANCEMENT CRON JOBS SETUP
-- ============================================================================
-- This migration sets up automated cron jobs for week finalization and advancement
-- Created: 2025-11-18

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- Setup app settings for edge function URLs
-- ============================================================================
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://zgxzxfjlpnrdvtjekncg.supabase.co';
ALTER DATABASE postgres SET app.settings.supabase_anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpneHp4ZmpscG5yZHZ0amVrbmNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODg2MjEsImV4cCI6MjA3NzE2NDYyMX0.J_90pcGgZV2nwGDmIilc9FiX0lAVg4E__Z7xN94g-jo';

-- ============================================================================
-- Unschedule existing jobs (to avoid duplicates when re-running migration)
-- ============================================================================
SELECT cron.unschedule('finalize-week-results') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'finalize-week-results');

SELECT cron.unschedule('advance-to-next-week') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'advance-to-next-week');

-- ============================================================================
-- Schedule finalize-week-results (Tuesday 12:01 AM)
-- ============================================================================
-- Calculates global average, determines wins/losses, updates team records
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
-- Schedule advance-to-next-week (Tuesday 8:00 PM)
-- ============================================================================
-- Advances to next week, unlocks all players
SELECT cron.schedule(
  'advance-to-next-week',
  '0 20 * * 2',  -- Tuesday at 8:00 PM
  $$
  SELECT advance_nfl_week();
  $$
);

-- ============================================================================
-- Add helpful comments
-- ============================================================================
COMMENT ON EXTENSION pg_cron IS 'Enables scheduled jobs for automated weekly operations';

-- ============================================================================
-- VERIFICATION: View created cron jobs
-- ============================================================================
SELECT 
  jobname,
  schedule,
  active,
  CASE 
    WHEN command LIKE '%finalize-week%' THEN '✓ Calls finalize-week edge function (Tue 12:01 AM)'
    WHEN command LIKE '%advance_nfl_week%' THEN '✓ Calls advance_nfl_week DB function (Tue 8:00 PM)'
    ELSE LEFT(command, 50)
  END as description
FROM cron.job 
WHERE jobname IN ('finalize-week-results', 'advance-to-next-week')
ORDER BY jobname;
