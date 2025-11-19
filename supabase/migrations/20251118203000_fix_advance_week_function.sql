-- Fix advance_nfl_week function - resolve column ambiguity
-- Issue: Variable names conflict with column names causing SQL error

CREATE OR REPLACE FUNCTION advance_nfl_week()
RETURNS TABLE(
  previous_week INTEGER,
  new_week INTEGER,
  season_year INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_week INTEGER;
  v_current_year INTEGER;
  v_new_week INTEGER;
BEGIN
  -- Try to acquire advisory lock (prevent concurrent execution)
  IF NOT pg_try_advisory_lock(12345678) THEN
    RAISE NOTICE 'Week advancement already in progress';
    RETURN;
  END IF;

  BEGIN
    -- Get current week (use table alias to avoid ambiguity)
    SELECT nsc.current_week, nsc.season_year 
    INTO v_current_week, v_current_year
    FROM nfl_season_config nsc
    WHERE nsc.is_active = true;

    IF v_current_week IS NULL THEN
      RAISE EXCEPTION 'No active NFL season config found';
    END IF;

    -- Calculate new week
    v_new_week := v_current_week + 1;

    -- Update to new week
    UPDATE nfl_season_config
    SET 
      current_week = v_new_week,
      updated_at = NOW()
    WHERE is_active = true;

    -- Unlock all players for the new week
    UPDATE user_player_inventory
    SET is_locked = FALSE
    WHERE is_locked = TRUE;

    -- Return results (explicit assignment to avoid ambiguity)
    previous_week := v_current_week;
    new_week := v_new_week;
    season_year := v_current_year;
    RETURN NEXT;

  EXCEPTION
    WHEN OTHERS THEN
      -- Release lock on error
      PERFORM pg_advisory_unlock(12345678);
      RAISE;
  END;

  -- Release advisory lock
  PERFORM pg_advisory_unlock(12345678);
END;
$$;

COMMENT ON FUNCTION advance_nfl_week() IS 'Advances NFL week with advisory lock to prevent race conditions - fixed column ambiguity';
