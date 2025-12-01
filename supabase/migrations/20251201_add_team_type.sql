-- Add team_type column to teams table
-- 'public' = created from teams page (available for public contests)
-- 'private' = created through leagues (for private league use)

ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS team_type TEXT NOT NULL DEFAULT 'public' CHECK (team_type IN ('public', 'private'));

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_teams_user_type ON teams(user_id, team_type);

-- Update existing teams created through leagues to be 'private'
-- (Teams that exist in league_teams table)
UPDATE teams
SET team_type = 'private'
WHERE id IN (
  SELECT DISTINCT team_id 
  FROM league_teams
);

COMMENT ON COLUMN teams.team_type IS 'Type of team: public (created from teams page) or private (created through leagues)';
