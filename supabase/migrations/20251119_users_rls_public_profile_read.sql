-- Allow all authenticated users to read basic profile info (username, avatar) from users table for leaderboards
CREATE POLICY users_public_profile_read ON users
FOR SELECT
TO authenticated
USING (true);