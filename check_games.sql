-- Check current game statuses
SELECT 
  game_id,
  home_team,
  away_team,
  game_status,
  game_start_time,
  home_score,
  away_score,
  quarter,
  time_remaining
FROM game_scores
WHERE week_number = 10 
  AND season_year = 2024
ORDER BY game_start_time;
