-- Add helper functions for testing live updates

-- Function to get a random lineup for testing
CREATE OR REPLACE FUNCTION get_random_lineup(week_number INTEGER, season_year INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    lineup_record RECORD;
BEGIN
    -- Get a random lineup
    SELECT 
        id as lineup_id,
        team_id,
        total_points,
        status
    INTO lineup_record
    FROM weekly_lineups
    WHERE week_number = get_random_lineup.week_number
      AND season_year = get_random_lineup.season_year
      AND status IN ('pending', 'active')
    ORDER BY RANDOM()
    LIMIT 1;
    
    IF FOUND THEN
        result := json_build_object(
            'lineup_id', lineup_record.lineup_id,
            'team_id', lineup_record.team_id,
            'current_points', lineup_record.total_points,
            'status', lineup_record.status
        );
    ELSE
        result := json_build_object('error', 'No lineups found');
    END IF;
    
    RETURN result;
END;
$$;

-- Function to update global stats for testing
CREATE OR REPLACE FUNCTION update_global_stats(week_number INTEGER, season_year INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_teams INTEGER;
    total_points NUMERIC;
    avg_score NUMERIC;
    highest_score NUMERIC;
    lowest_score NUMERIC;
    result JSON;
BEGIN
    -- Calculate stats from all active lineups
    SELECT 
        COUNT(*) as team_count,
        COALESCE(SUM(total_points), 0) as total_points,
        COALESCE(AVG(total_points), 0) as avg_score,
        COALESCE(MAX(total_points), 0) as highest_score,
        COALESCE(MIN(total_points), 0) as lowest_score
    INTO total_teams, total_points, avg_score, highest_score, lowest_score
    FROM weekly_lineups
    WHERE week_number = update_global_stats.week_number
      AND season_year = update_global_stats.season_year
      AND status IN ('active', 'completed');
    
    -- Upsert global stats
    INSERT INTO weekly_global_stats (
        week_number,
        season_year,
        total_active_teams,
        total_points_scored,
        average_score,
        highest_score,
        lowest_score
    ) VALUES (
        update_global_stats.week_number,
        update_global_stats.season_year,
        total_teams,
        total_points,
        avg_score,
        highest_score,
        lowest_score
    )
    ON CONFLICT (week_number, season_year)
    DO UPDATE SET
        total_active_teams = EXCLUDED.total_active_teams,
        total_points_scored = EXCLUDED.total_points_scored,
        average_score = EXCLUDED.average_score,
        highest_score = EXCLUDED.highest_score,
        lowest_score = EXCLUDED.lowest_score,
        updated_at = NOW();
    
    result := json_build_object(
        'success', true,
        'week_number', update_global_stats.week_number,
        'season_year', update_global_stats.season_year,
        'total_teams', total_teams,
        'average_score', avg_score,
        'highest_score', highest_score
    );
    
    RETURN result;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_random_lineup TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_global_stats TO anon, authenticated;