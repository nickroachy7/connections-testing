-- ============================================================================
-- FIX ALL AUTOMATION - Complete Cron Job Setup
-- ============================================================================
-- This migration ensures ALL edge functions run automatically
-- Created: 2025-11-18
-- Updated: Added missing automation jobs that should have been running

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- Unschedule existing jobs (to avoid duplicates)
-- ============================================================================
SELECT cron.unschedule('update-live-stats-auto') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'update-live-stats-auto');
SELECT cron.unschedule('lock-lineups-auto') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lock-lineups-auto');
SELECT cron.unschedule('calculate-global-average-auto') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'calculate-global-average-auto');
SELECT cron.unschedule('update-projections-after-advance') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'update-projections-after-advance');

-- ============================================================================
-- DURING GAMES: Update Live Stats (Every 2 minutes on game days)
-- ============================================================================
-- Runs: Sunday, Monday, Thursday (game days)
-- Updates game scores and player stats in real-time
SELECT cron.schedule(
  'update-live-stats-auto',
  '*/2 * * * 0,1,4',  -- Every 2 minutes on Sun, Mon, Thu
  $$
  SELECT net.http_post(
    url:=current_setting('app.settings.supabase_url') || '/functions/v1/update-live-stats',
    headers:=jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key'),
      'Content-Type', 'application/json'
    ),
    body:='{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================================
-- DURING GAMES: Lock Lineups (Every 5 minutes on game days)
-- ============================================================================
-- Runs: Sunday, Monday, Thursday (game days)
-- Locks players whose games are starting
SELECT cron.schedule(
  'lock-lineups-auto',
  '*/5 * * * 0,1,4',  -- Every 5 minutes on Sun, Mon, Thu
  $$
  SELECT net.http_post(
    url:=current_setting('app.settings.supabase_url') || '/functions/v1/lock-lineups',
    headers:=jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key'),
      'Content-Type', 'application/json'
    ),
    body:='{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================================
-- DURING GAMES: Calculate Global Average (Every 10 minutes on game days)
-- ============================================================================
-- Runs: Sunday, Monday, Thursday (game days)
-- Keeps average score updated as games progress
SELECT cron.schedule(
  'calculate-global-average-auto',
  '*/10 * * * 0,1,4',  -- Every 10 minutes on Sun, Mon, Thu
  $$
  SELECT net.http_post(
    url:=current_setting('app.settings.supabase_url') || '/functions/v1/calculate-global-average',
    headers:=jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key'),
      'Content-Type', 'application/json'
    ),
    body:='{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================================
-- TUESDAY 12:01 AM: Finalize Week Results
-- ============================================================================
-- Calculates wins/losses, updates team records, marks week as complete
SELECT cron.schedule(
  'finalize-week-results',
  '1 0 * * 2',  -- Tuesday at 12:01 AM
  $$
  SELECT net.http_post(
    url:=current_setting('app.settings.supabase_url') || '/functions/v1/finalize-week',
    headers:=jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key'),
      'Content-Type', 'application/json'
    ),
    body:='{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================================
-- TUESDAY 8:00 PM: Advance to Next Week
-- ============================================================================
-- Increments week, unlocks all players
SELECT cron.schedule(
  'advance-to-next-week',
  '0 20 * * 2',  -- Tuesday at 8:00 PM
  $$
  SELECT advance_nfl_week();
  $$
);

-- ============================================================================
-- TUESDAY 8:05 PM: Update Projections After Advancement
-- ============================================================================
-- Updates player projections for the new week
SELECT cron.schedule(
  'update-projections-after-advance',
  '5 20 * * 2',  -- Tuesday at 8:05 PM
  $$
  SELECT net.http_post(
    url:=current_setting('app.settings.supabase_url') || '/functions/v1/update-projections',
    headers:=jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key'),
      'Content-Type', 'application/json'
    ),
    body:='{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================================
-- VERIFICATION: View all cron jobs
-- ============================================================================
SELECT 
  jobname,
  schedule,
  active,
  CASE 
    WHEN jobname = 'update-live-stats-auto' THEN '✓ Updates stats every 2 min during games (Sun/Mon/Thu)'
    WHEN jobname = 'lock-lineups-auto' THEN '✓ Locks players every 5 min during games (Sun/Mon/Thu)'
    WHEN jobname = 'calculate-global-average-auto' THEN '✓ Updates averages every 10 min during games (Sun/Mon/Thu)'
    WHEN jobname = 'finalize-week-results' THEN '✓ Finalizes week results (Tuesday 12:01 AM)'
    WHEN jobname = 'advance-to-next-week' THEN '✓ Advances to next week (Tuesday 8:00 PM)'
    WHEN jobname = 'update-projections-after-advance' THEN '✓ Updates projections (Tuesday 8:05 PM)'
    ELSE 'Unknown'
  END as description
FROM cron.job 
WHERE jobname IN (
  'update-live-stats-auto',
  'lock-lineups-auto',
  'calculate-global-average-auto',
  'finalize-week-results',
  'advance-to-next-week',
  'update-projections-after-advance'
)
ORDER BY jobname;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Ensure postgres user can execute http requests
GRANT USAGE ON SCHEMA net TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO postgres;

COMMENT ON EXTENSION pg_cron IS 'Enables ALL automated weekly operations - stats, locking, finalization, advancement';
