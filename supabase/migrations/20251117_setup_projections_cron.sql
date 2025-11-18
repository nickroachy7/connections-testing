-- Setup automated projection updates
-- Runs every Tuesday at 8:05 PM (after week advancement at 8:00 PM)

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule if it already exists (for re-running migration)
SELECT cron.unschedule('update-projections-after-advance') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'update-projections-after-advance'
);

-- Schedule projection updates every Tuesday at 8:05 PM
SELECT cron.schedule(
  'update-projections-after-advance',
  '5 20 * * 2',  -- Tuesday at 8:05 PM (5 minutes after week advance)
  $$
  SELECT net.http_post(
    url:=current_setting('app.settings.supabase_url') || '/functions/v1/update-projections',
    headers:=jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    )
  ) AS request_id;
  $$
);

-- Also schedule a Sunday evening refresh (to catch any Monday game stats)
SELECT cron.unschedule('update-projections-sunday-refresh') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'update-projections-sunday-refresh'
);

SELECT cron.schedule(
  'update-projections-sunday-refresh',
  '0 18 * * 0',  -- Sunday at 6:00 PM (before most games start)
  $$
  SELECT net.http_post(
    url:=current_setting('app.settings.supabase_url') || '/functions/v1/update-projections',
    headers:=jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    )
  ) AS request_id;
  $$
);

-- Add comments for documentation
COMMENT ON EXTENSION pg_cron IS 'Enables scheduled jobs for automated weekly operations';

-- Instructions for viewing cron jobs:
-- SELECT * FROM cron.job;
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
