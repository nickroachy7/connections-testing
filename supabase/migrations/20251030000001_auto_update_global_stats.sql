-- Create function to automatically update global stats when lineups change
CREATE OR REPLACE FUNCTION update_global_stats_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    week_num INTEGER;
    season_year INTEGER;
BEGIN
    -- Get week and season from the updated lineup
    week_num := COALESCE(NEW.week_number, OLD.week_number);
    season_year := COALESCE(NEW.season_year, OLD.season_year);
    
    -- Update global stats for this week
    INSERT INTO weekly_global_stats (
        week_number,
        season_year,
        total_active_teams,
        total_points_scored,
        average_score,
        highest_score,
        lowest_score
    )
    SELECT 
        week_num,
        season_year,
        COUNT(*) as total_teams,
        COALESCE(SUM(total_points), 0) as total_points,
        COALESCE(AVG(total_points), 0) as avg_score,
        COALESCE(MAX(total_points), 0) as highest_score,
        COALESCE(MIN(total_points), 0) as lowest_score
    FROM weekly_lineups
    WHERE week_number = week_num
      AND season_year = season_year
      AND status IN ('active', 'completed')
    ON CONFLICT (week_number, season_year) DO UPDATE SET
        total_active_teams = EXCLUDED.total_active_teams,
        total_points_scored = EXCLUDED.total_points_scored,
        average_score = EXCLUDED.average_score,
        highest_score = EXCLUDED.highest_score,
        lowest_score = EXCLUDED.lowest_score,
        updated_at = NOW();
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for weekly_lineups table
DROP TRIGGER IF EXISTS weekly_lineups_update_global_stats ON weekly_lineups;
CREATE TRIGGER weekly_lineups_update_global_stats
    AFTER INSERT OR UPDATE OR DELETE
    ON weekly_lineups
    FOR EACH ROW
    EXECUTE FUNCTION update_global_stats_trigger();

-- Also create a trigger for when lineup status changes to active/completed
CREATE OR REPLACE FUNCTION update_global_stats_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only update if status changed to/from active or completed
    IF TG_OP = 'UPDATE' AND (
        (OLD.status NOT IN ('active', 'completed') AND NEW.status IN ('active', 'completed')) OR
        (OLD.status IN ('active', 'completed') AND NEW.status NOT IN ('active', 'completed'))
    ) THEN
        PERFORM update_global_stats_trigger();
    ELSIF TG_OP = 'INSERT' AND NEW.status IN ('active', 'completed') THEN
        PERFORM update_global_stats_trigger();
    ELSIF TG_OP = 'DELETE' AND OLD.status IN ('active', 'completed') THEN
        PERFORM update_global_stats_trigger();
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Replace the previous trigger with this more specific one
DROP TRIGGER IF EXISTS weekly_lineups_update_global_stats ON weekly_lineups;
CREATE TRIGGER weekly_lineups_update_global_stats
    AFTER INSERT OR UPDATE OR DELETE
    ON weekly_lineups
    FOR EACH ROW
    EXECUTE FUNCTION update_global_stats_on_status_change();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_global_stats_trigger TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_global_stats_on_status_change TO anon, authenticated;