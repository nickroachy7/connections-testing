-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule game sync every 5 minutes on NFL game days (Sun, Mon, Thu)
-- This will automatically keep your game data up to date
SELECT cron.schedule(
  'sync-nfl-live-stats',
  '*/5 * * * 0,1,4',  -- Every 5 minutes on Sunday(0), Monday(1), Thursday(4)
  $$
  SELECT net.http_post(
    url:='https://REPLACE_WITH_YOUR_PROJECT_REF.supabase.co/functions/v1/update-live-stats',
    headers:='{"Authorization": "Bearer REPLACE_WITH_YOUR_ANON_KEY"}'::jsonb
  ) AS request_id;
  $$
);

-- INSTRUCTIONS:
-- 1. Replace REPLACE_WITH_YOUR_PROJECT_REF with your actual Supabase project reference
--    (Found in: Dashboard → Project Settings → API → Project URL)
-- 2. Replace REPLACE_WITH_YOUR_ANON_KEY with your actual anon key
--    (Found in: Dashboard → Project Settings → API → anon/public key)
-- 3. Run this migration in Supabase SQL Editor or via CLI

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To view job run history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- To remove this job (if needed):
-- SELECT cron.unschedule('sync-nfl-live-stats');
