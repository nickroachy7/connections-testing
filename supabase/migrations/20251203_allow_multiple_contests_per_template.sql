-- ============================================
-- Allow multiple contests of the same template per week
-- This enables auto-spawning new contests when one fills up
-- ============================================

-- Drop the unique constraint that limits one contest per template per week
ALTER TABLE public_contests 
DROP CONSTRAINT IF EXISTS public_contests_template_id_week_season_key;

-- Add an index for performance (but not unique)
CREATE INDEX IF NOT EXISTS idx_public_contests_template_week_season 
ON public_contests(template_id, week, season);

-- Update spawn_weekly_contests to not use ON CONFLICT since constraint is gone
CREATE OR REPLACE FUNCTION spawn_weekly_contests(
  p_week INTEGER DEFAULT NULL,
  p_season INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_week INTEGER;
  v_season INTEGER;
  v_lock_time TIMESTAMPTZ;
  v_template RECORD;
  v_count INTEGER := 0;
  v_existing_count INTEGER;
BEGIN
  -- Get current week/season if not provided
  IF p_week IS NULL OR p_season IS NULL THEN
    SELECT current_week, season_year, first_game_time 
    INTO v_week, v_season, v_lock_time
    FROM nfl_season_config
    WHERE is_active = true
    LIMIT 1;
  ELSE
    v_week := p_week;
    v_season := p_season;
    -- Try to get lock time from config
    SELECT first_game_time INTO v_lock_time
    FROM nfl_season_config
    WHERE is_active = true
    LIMIT 1;
  END IF;
  
  -- Create contests for each active template (only if none exist for that template/week)
  FOR v_template IN 
    SELECT * FROM public_contest_templates WHERE is_active = true ORDER BY sort_order
  LOOP
    -- Check if any open contest already exists for this template/week
    SELECT COUNT(*) INTO v_existing_count
    FROM public_contests
    WHERE template_id = v_template.id
      AND week = v_week
      AND season = v_season
      AND status = 'open';
    
    -- Only create if no open contests exist
    IF v_existing_count = 0 THEN
      INSERT INTO public_contests (
        template_id,
        name,
        description,
        max_entries,
        scoring_type,
        win_condition,
        elimination_type,
        max_losses,
        week,
        season,
        status,
        lock_time
      ) VALUES (
        v_template.id,
        v_template.name,
        v_template.description,
        v_template.max_entries,
        v_template.scoring_type,
        v_template.win_condition,
        v_template.elimination_type,
        v_template.max_losses,
        v_week,
        v_season,
        'open',
        v_lock_time
      );
      
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
