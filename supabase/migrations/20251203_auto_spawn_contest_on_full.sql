-- ============================================
-- Auto-spawn new contest when one fills up
-- ============================================

-- Function to spawn a new contest of the same type when one fills up
CREATE OR REPLACE FUNCTION spawn_contest_on_full()
RETURNS TRIGGER AS $$
DECLARE
  v_template_id UUID;
  v_new_contest_id UUID;
  v_existing_open_count INTEGER;
BEGIN
  -- Only run when contest becomes full
  IF NEW.current_entries >= NEW.max_entries AND OLD.current_entries < NEW.max_entries THEN
    v_template_id := NEW.template_id;
    
    -- Check if there's already an open contest of this type for this week
    SELECT COUNT(*) INTO v_existing_open_count
    FROM public_contests
    WHERE template_id = v_template_id
      AND week = NEW.week
      AND season = NEW.season
      AND status = 'open'
      AND current_entries < max_entries;
    
    -- Only spawn a new one if there isn't already an open one available
    IF v_existing_open_count = 0 THEN
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
      )
      SELECT 
        t.id,
        t.name,
        t.description,
        t.max_entries,
        t.scoring_type,
        t.win_condition,
        t.elimination_type,
        t.max_losses,
        NEW.week,
        NEW.season,
        'open',
        NEW.lock_time
      FROM public_contest_templates t
      WHERE t.id = v_template_id
      RETURNING id INTO v_new_contest_id;
      
      RAISE NOTICE 'Auto-spawned new contest % from template % for week %', 
        v_new_contest_id, v_template_id, NEW.week;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-spawn contests
DROP TRIGGER IF EXISTS trigger_spawn_contest_on_full ON public_contests;

CREATE TRIGGER trigger_spawn_contest_on_full
  AFTER UPDATE OF current_entries ON public_contests
  FOR EACH ROW
  EXECUTE FUNCTION spawn_contest_on_full();

COMMENT ON FUNCTION spawn_contest_on_full IS 'Automatically creates a new contest of the same type when one fills up';
