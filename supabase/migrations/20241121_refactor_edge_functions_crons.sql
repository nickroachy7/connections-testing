-- ============================================================================
-- REFACTORED EDGE FUNCTIONS - NEW AUTOMATION CRON JOBS
-- ============================================================================
-- Purpose: Replace monolithic edge functions with clear, single-responsibility functions
-- Created: 2024-11-21
-- 
-- New Architecture:
-- 1. start-live-week: Marks week as live when first game starts
-- 2. lock-players: Locks players when games start
-- 3. track-live-stats: Updates game scores and fantasy points
-- 4. finalize-game: Finalizes individual completed games  
-- 5. finalize-week-new: Finalizes entire week (median, wins/losses)
-- 6. advance-week: Advances to next week (edge function wrapper)
-- ============================================================================

-- Unschedule ALL old jobs
SELECT cron.unschedule('update-live-stats-auto') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'update-live-stats-auto');

SELECT cron.unschedule('lock-lineups-auto') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lock-lineups-auto');

SELECT cron.unschedule('calculate-global-average-auto') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'calculate-global-average-auto');

SELECT cron.unschedule('finalize-week-results') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'finalize-week-results');

SELECT cron.unschedule('advance-to-next-week') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'advance-to-next-week');

SELECT cron.unschedule('update-projections-after-advance') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'update-projections-after-advance');

SELECT cron.unschedule('update-projections-sunday-refresh') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'update-projections-sunday-refresh');

-- ============================================================================
-- NEW CRON JOBS - CLEAR SINGLE-RESPONSIBILITY FUNCTIONS
-- ============================================================================

-- ============================================================================
-- 1. START LIVE WEEK (Every 5 minutes on game days)
-- ============================================================================
-- Marks week as "live" when the very first game of the week starts
-- Only runs if week is currently "scheduled"
SELECT cron.schedule(
  'start-live-week',
  '*/5 * * * 0,1,4',  -- Every 5 minutes on Sun, Mon, Thu
  $$
  SELECT net.http_post(
    url:=current_setting('app.settings.supabase_url') || '/functions/v1/start-live-week',
    headers:=jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key'),
      'Content-Type', 'application/json'
    ),
    body:='{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================================
-- 2. LOCK PLAYERS (Every 5 minutes on game days)
-- ============================================================================
-- Locks players into lineups when their game starts (2-minute buffer)
-- Also creates lineup snapshots if they don't exist
SELECT cron.schedule(
  'lock-players',
  '*/5 * * * 0,1,4',  -- Every 5 minutes on Sun, Mon, Thu
  $$
  SELECT net.http_post(
    url:=current_setting('app.settings.supabase_url') || '/functions/v1/lock-players',
    headers:=jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key'),
      'Content-Type', 'application/json'
    ),
    body:='{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================================
-- 3. TRACK LIVE STATS (Every 3 minutes during games)
-- ============================================================================
-- Fetches and updates game scores and player stats from BallDontLie API
-- Calculates fantasy points and updates weekly_lineups
SELECT cron.schedule(
  'track-live-stats',
  '*/3 * * * 0,1,4',  -- Every 3 minutes on Sun, Mon, Thu
  $$
  SELECT net.http_post(
    url:=current_setting('app.settings.supabase_url') || '/functions/v1/track-live-stats',
    headers:=jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key'),
      'Content-Type', 'application/json'
    ),
    body:='{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================================
-- 4. FINALIZE GAME (Every 10 minutes on game days)
-- ============================================================================
-- Creates zero-stat entries for players who didn't record stats
-- Runs after track-live-stats to ensure games are properly closed out
SELECT cron.schedule(
  'finalize-game',
  '*/10 * * * 0,1,4',  -- Every 10 minutes on Sun, Mon, Thu
  $$
  SELECT net.http_post(
    url:=current_setting('app.settings.supabase_url') || '/functions/v1/finalize-game',
    headers:=jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key'),
      'Content-Type', 'application/json'
    ),
    body:='{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================================
-- 5. FINALIZE WEEK (Tuesday 12:01 AM)
-- ============================================================================
-- Calculates median score, determines wins/losses, updates team records
-- Only runs after ALL games are final
SELECT cron.schedule(
  'finalize-week',
  '1 0 * * 2',  -- Tuesday at 12:01 AM
  $$
  SELECT net.http_post(
    url:=current_setting('app.settings.supabase_url') || '/functions/v1/finalize-week-new',
    headers:=jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key'),
      'Content-Type', 'application/json'
    ),
    body:='{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================================
-- 6. ADVANCE WEEK (Tuesday 8:00 PM)
-- ============================================================================
-- Advances to next week, unlocks all players, resets week status
-- Runs 20 hours after finalize-week to give users time to review
SELECT cron.schedule(
  'advance-week',
  '0 20 * * 2',  -- Tuesday at 8:00 PM
  $$
  SELECT net.http_post(
    url:=current_setting('app.settings.supabase_url') || '/functions/v1/advance-week',
    headers:=jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key'),
      'Content-Type', 'application/json'
    ),
    body:='{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================================
-- 7. UPDATE PROJECTIONS (Tuesday 8:05 PM + Sunday 6:00 PM)
-- ============================================================================
-- Updates player projections after week advance and before Sunday games
SELECT cron.schedule(
  'update-projections-after-advance',
  '5 20 * * 2',  -- Tuesday at 8:05 PM (after advance)
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

SELECT cron.schedule(
  'update-projections-sunday-refresh',
  '0 18 * * 0',  -- Sunday at 6:00 PM (pre-game refresh)
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
-- VERIFICATION: View all active cron jobs
-- ============================================================================
SELECT 
  jobname,
  schedule,
  active,
  CASE 
    WHEN jobname = 'start-live-week' THEN '🏈 Mark week as live when first game starts'
    WHEN jobname = 'lock-players' THEN '🔒 Lock players when games start'
    WHEN jobname = 'track-live-stats' THEN '📊 Update game stats and fantasy points'
    WHEN jobname = 'finalize-game' THEN '🏁 Finalize individual completed games'
    WHEN jobname = 'finalize-week' THEN '✅ Finalize entire week (median/wins/losses)'
    WHEN jobname = 'advance-week' THEN '⏭️  Advance to next week'
    WHEN jobname = 'update-projections-after-advance' THEN '📈 Update projections (post-advance)'
    WHEN jobname = 'update-projections-sunday-refresh' THEN '📈 Update projections (pre-game)'
    ELSE 'Other'
  END as description
FROM cron.job 
WHERE jobname IN (
  'start-live-week',
  'lock-players',
  'track-live-stats',
  'finalize-game',
  'finalize-week',
  'advance-week',
  'update-projections-after-advance',
  'update-projections-sunday-refresh'
)
ORDER BY jobname;

COMMENT ON EXTENSION pg_cron IS 'Refactored automation with single-responsibility edge functions (2024-11-21)';
