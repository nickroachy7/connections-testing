-- Contest-Specific Leaderboards
-- Date: 2024-11-07
-- Purpose: Create separate leaderboards for each contest type for fair competition

-- ============================================================================
-- STEP 1: Create main leaderboard view (contest-specific)
-- ============================================================================

CREATE OR REPLACE VIEW leaderboard_by_contest AS
SELECT 
  -- Team info
  t.id as team_id,
  t.team_name,
  t.user_id,
  t.wins,
  t.losses,
  t.total_points,
  t.current_week,
  t.is_active,
  t.eliminated_at,
  t.created_at,
  
  -- Contest info
  t.contest_type_id,
  ct.name as contest_type_name,
  ct.display_name as contest_display_name,
  ct.total_weeks as contest_total_weeks,
  ct.max_losses as contest_max_losses,
  ct.scoring_type,
  
  -- Calculated stats
  (ct.max_losses - t.losses) as losses_remaining,
  (ct.total_weeks - t.current_week) as weeks_remaining,
  ROUND((t.wins::numeric / NULLIF(t.wins + t.losses, 0)) * 100, 1) as win_percentage,
  ROUND(t.total_points / NULLIF(t.wins + t.losses, 0), 2) as avg_points_per_week,
  
  -- Rankings (partitioned by contest type for fair comparison)
  RANK() OVER (
    PARTITION BY t.contest_type_id 
    ORDER BY t.total_points DESC
  ) as rank_by_points,
  
  RANK() OVER (
    PARTITION BY t.contest_type_id 
    ORDER BY t.wins DESC, t.losses ASC
  ) as rank_by_record,
  
  DENSE_RANK() OVER (
    PARTITION BY t.contest_type_id 
    ORDER BY t.total_points DESC
  ) as dense_rank_by_points,
  
  -- User info
  u.username,
  u.avatar_url
  
FROM teams t
JOIN contest_types ct ON ct.id = t.contest_type_id
LEFT JOIN users u ON u.id = t.user_id
WHERE t.is_bot = false -- Exclude bot teams from public leaderboards
ORDER BY t.contest_type_id, t.total_points DESC;

COMMENT ON VIEW leaderboard_by_contest IS 'Contest-specific leaderboards with rankings partitioned by contest type for fair competition';

-- ============================================================================
-- STEP 2: Create weekly leaderboard view
-- ============================================================================

CREATE OR REPLACE VIEW weekly_leaderboard_by_contest AS
SELECT 
  wl.id as lineup_id,
  wl.team_id,
  wl.week_number,
  wl.season_year,
  wl.total_points as week_points,
  wl.status,
  
  -- Team info
  t.team_name,
  t.user_id,
  t.contest_type_id,
  
  -- Contest info
  ct.display_name as contest_display_name,
  ct.scoring_type,
  
  -- Weekly rankings (partitioned by contest type AND week)
  RANK() OVER (
    PARTITION BY wl.week_number, wl.season_year, t.contest_type_id 
    ORDER BY wl.total_points DESC
  ) as week_rank,
  
  DENSE_RANK() OVER (
    PARTITION BY wl.week_number, wl.season_year, t.contest_type_id 
    ORDER BY wl.total_points DESC
  ) as week_dense_rank,
  
  -- User info
  u.username,
  u.avatar_url
  
FROM weekly_lineups wl
JOIN teams t ON t.id = wl.team_id
JOIN contest_types ct ON ct.id = t.contest_type_id
LEFT JOIN users u ON u.id = t.user_id
WHERE wl.status = 'completed' AND t.is_bot = false
ORDER BY wl.week_number DESC, t.contest_type_id, wl.total_points DESC;

COMMENT ON VIEW weekly_leaderboard_by_contest IS 'Weekly leaderboards showing top performers in each contest type for each week';

-- ============================================================================
-- STEP 3: Create global leaderboard (across all contest types)
-- ============================================================================

CREATE OR REPLACE VIEW global_leaderboard AS
SELECT 
  -- Team info
  t.id as team_id,
  t.team_name,
  t.user_id,
  t.wins,
  t.losses,
  t.total_points,
  
  -- Contest info (for context)
  ct.display_name as contest_display_name,
  ct.scoring_type,
  
  -- Stats
  ROUND((t.wins::numeric / NULLIF(t.wins + t.losses, 0)) * 100, 1) as win_percentage,
  
  -- Global ranking (all teams, all contests)
  RANK() OVER (ORDER BY t.total_points DESC) as global_rank,
  
  -- User info
  u.username,
  u.avatar_url
  
FROM teams t
JOIN contest_types ct ON ct.id = t.contest_type_id
LEFT JOIN users u ON u.id = t.user_id
WHERE t.is_bot = false
ORDER BY t.total_points DESC;

COMMENT ON VIEW global_leaderboard IS 'Global leaderboard showing all teams across all contest types (NOTE: not fair for comparison due to different rules)';

-- ============================================================================
-- STEP 4: Create function to get contest leaderboard with pagination
-- ============================================================================

CREATE OR REPLACE FUNCTION get_contest_leaderboard(
  p_contest_type_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  username TEXT,
  avatar_url TEXT,
  wins INTEGER,
  losses INTEGER,
  total_points NUMERIC,
  win_percentage NUMERIC,
  rank_position BIGINT,
  losses_remaining INTEGER,
  weeks_remaining INTEGER,
  is_eliminated BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lbc.team_id,
    lbc.team_name,
    lbc.username,
    lbc.avatar_url,
    lbc.wins,
    lbc.losses,
    lbc.total_points,
    lbc.win_percentage,
    lbc.rank_by_points as rank_position,
    lbc.losses_remaining,
    lbc.weeks_remaining,
    (lbc.eliminated_at IS NOT NULL) as is_eliminated
  FROM leaderboard_by_contest lbc
  WHERE lbc.contest_type_id = p_contest_type_id
  ORDER BY lbc.rank_by_points
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_contest_leaderboard IS 'Gets paginated leaderboard for a specific contest type';

-- ============================================================================
-- STEP 5: Create function to get user's rank in their contest
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_contest_rank(
  p_team_id UUID
)
RETURNS TABLE (
  rank_position BIGINT,
  total_teams BIGINT,
  percentile NUMERIC,
  contest_display_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lbc.rank_by_points as rank_position,
    COUNT(*) OVER (PARTITION BY lbc.contest_type_id) as total_teams,
    ROUND((1 - (lbc.rank_by_points::numeric / COUNT(*) OVER (PARTITION BY lbc.contest_type_id))) * 100, 1) as percentile,
    lbc.contest_display_name
  FROM leaderboard_by_contest lbc
  WHERE lbc.team_id = p_team_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_contest_rank IS 'Gets a team''s rank, total teams, and percentile within their contest type';

-- ============================================================================
-- STEP 6: Create materialized view for high-performance leaderboards (optional)
-- ============================================================================

-- For production with many users, consider materializing the leaderboard
-- and refreshing it periodically (e.g., after each week finalization)

CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_materialized AS
SELECT * FROM leaderboard_by_contest;

CREATE UNIQUE INDEX idx_leaderboard_mat_team ON leaderboard_materialized(team_id);
CREATE INDEX idx_leaderboard_mat_contest_rank ON leaderboard_materialized(contest_type_id, rank_by_points);

COMMENT ON MATERIALIZED VIEW leaderboard_materialized IS 'Cached leaderboard for performance. Refresh after week finalization.';

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_leaderboard_cache()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_materialized;
  RAISE NOTICE 'Leaderboard cache refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_leaderboard_cache IS 'Refreshes the materialized leaderboard view. Call after week finalization.';

-- ============================================================================
-- STEP 7: Create RLS policies for leaderboard access
-- ============================================================================

-- Note: Views don't have RLS, but we can control access via functions
-- All leaderboards are publicly visible (common in fantasy sports)

-- ============================================================================
-- VERIFICATION QUERIES (commented out, for manual testing)
-- ============================================================================

-- View leaderboard for a specific contest:
-- SELECT * FROM get_contest_leaderboard(
--   (SELECT id FROM contest_types WHERE name = '18w_7l_1rp_half'),
--   10, -- limit
--   0   -- offset
-- );

-- Get user's rank:
-- SELECT * FROM get_user_contest_rank('<team_id>');

-- Compare leaderboards across contest types:
-- SELECT 
--   contest_display_name,
--   COUNT(*) as total_teams,
--   AVG(total_points) as avg_points,
--   MAX(total_points) as top_score
-- FROM leaderboard_by_contest
-- GROUP BY contest_type_id, contest_display_name
-- ORDER BY contest_type_id;

-- Top 10 in each contest type:
-- SELECT 
--   contest_display_name,
--   team_name,
--   total_points,
--   rank_by_points
-- FROM leaderboard_by_contest
-- WHERE rank_by_points <= 10
-- ORDER BY contest_type_id, rank_by_points;
