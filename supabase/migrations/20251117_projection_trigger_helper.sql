-- Helper function to manually trigger projection updates
-- Can be called from Supabase SQL Editor: SELECT trigger_projection_update();

CREATE OR REPLACE FUNCTION trigger_projection_update()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Call the update-projections edge function
  SELECT net.http_post(
    url:=current_setting('app.settings.supabase_url') || '/functions/v1/update-projections',
    headers:=jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    )
  )::jsonb INTO result;
  
  RETURN result;
END;
$$;

COMMENT ON FUNCTION trigger_projection_update() IS 
'Manually triggers the update-projections edge function to refresh player weekly_projected_points. 
Useful for testing or forcing an immediate update outside the normal cron schedule.';
