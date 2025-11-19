-- Allow all authenticated users to SELECT from teams for leaderboard
CREATE POLICY leaderboard_global_read ON teams
FOR SELECT
TO authenticated
USING (true);