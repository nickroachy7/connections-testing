-- ================================================================
-- ADD RANDOM BOT NAMES & USERNAMES
-- ================================================================
-- This migration adds realistic names to bot teams and creates
-- a function to generate random names for future bots
-- ================================================================

-- Array of first names for random generation
CREATE OR REPLACE FUNCTION get_random_first_name()
RETURNS TEXT AS $$
DECLARE
  first_names TEXT[] := ARRAY[
    'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery',
    'Blake', 'Cameron', 'Dakota', 'Drew', 'Ellis', 'Finley', 'Harper', 'Hayden',
    'Jamie', 'Jesse', 'Kai', 'Kennedy', 'Logan', 'Marley', 'Parker', 'Peyton',
    'Reese', 'Rory', 'Sage', 'Skyler', 'Spencer', 'Tatum', 'Phoenix', 'River',
    'Charlie', 'Emerson', 'Jules', 'Kendall', 'Micah', 'Rowan', 'Sam', 'Winter'
  ];
BEGIN
  RETURN first_names[floor(random() * array_length(first_names, 1) + 1)];
END;
$$ LANGUAGE plpgsql;

-- Array of last names for random generation
CREATE OR REPLACE FUNCTION get_random_last_name()
RETURNS TEXT AS $$
DECLARE
  last_names TEXT[] := ARRAY[
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
    'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris',
    'Clark', 'Lewis', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright',
    'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Carter', 'Mitchell', 'Roberts'
  ];
BEGIN
  RETURN last_names[floor(random() * array_length(last_names, 1) + 1)];
END;
$$ LANGUAGE plpgsql;

-- Generate a random team name
CREATE OR REPLACE FUNCTION get_random_team_name()
RETURNS TEXT AS $$
DECLARE
  adjectives TEXT[] := ARRAY[
    'Thunder', 'Lightning', 'Storm', 'Blaze', 'Phoenix', 'Titans', 'Warriors', 'Knights',
    'Dragons', 'Eagles', 'Hawks', 'Falcons', 'Vipers', 'Cobras', 'Panthers', 'Tigers',
    'Lions', 'Bears', 'Wolves', 'Sharks', 'Raptors', 'Spartans', 'Gladiators', 'Vikings',
    'Pirates', 'Bandits', 'Mavericks', 'Rebels', 'Outlaws', 'Legends', 'Champions', 'Dominators',
    'Crushers', 'Destroyers', 'Conquerors', 'Avengers', 'Defenders', 'Guardians', 'Rangers', 'Sentinels'
  ];
  cities TEXT[] := ARRAY[
    'Boston', 'Chicago', 'Dallas', 'Denver', 'Detroit', 'Houston', 'Miami', 'Phoenix',
    'Seattle', 'Austin', 'Atlanta', 'Portland', 'Charlotte', 'Nashville', 'Vegas', 'Brooklyn',
    'Oakland', 'Tampa', 'Orlando', 'Memphis', 'Baltimore', 'Cleveland', 'Pittsburgh', 'Cincinnati'
  ];
BEGIN
  RETURN cities[floor(random() * array_length(cities, 1) + 1)] || ' ' ||
         adjectives[floor(random() * array_length(adjectives, 1) + 1)];
END;
$$ LANGUAGE plpgsql;

-- Update existing bot teams with random names
DO $$
DECLARE
  bot_record RECORD;
  random_first TEXT;
  random_last TEXT;
  random_username TEXT;
  random_team TEXT;
  bot_user_id UUID;
BEGIN
  FOR bot_record IN 
    SELECT t.id as team_id, t.user_id, u.username
    FROM teams t
    JOIN users u ON u.id = t.user_id
    WHERE t.is_bot = true AND t.simulated_season_id IS NOT NULL
  LOOP
    -- Generate random names
    random_first := get_random_first_name();
    random_last := get_random_last_name();
    random_username := lower(random_first || random_last || floor(random() * 100)::text);
    random_team := get_random_team_name();
    
    -- Update user's username
    UPDATE users
    SET username = random_username
    WHERE id = bot_record.user_id;
    
    -- Update team name
    UPDATE teams
    SET team_name = random_team
    WHERE id = bot_record.team_id;
    
    RAISE NOTICE 'Updated bot: % -> %', bot_record.username, random_username;
  END LOOP;
END $$;

-- Update create_bot_team function to use random names
CREATE OR REPLACE FUNCTION create_bot_team(
  p_season_id UUID,
  p_bot_number INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_team_id UUID;
  v_season_year INTEGER;
  v_random_first TEXT;
  v_random_last TEXT;
  v_random_username TEXT;
  v_random_team TEXT;
BEGIN
  -- Generate random names
  v_random_first := get_random_first_name();
  v_random_last := get_random_last_name();
  v_random_username := lower(v_random_first || v_random_last || floor(random() * 100)::text);
  v_random_team := get_random_team_name();
  
  -- Get current season year
  SELECT season_year INTO v_season_year
  FROM nfl_season_config
  WHERE is_active = true
  LIMIT 1;
  
  -- Create a bot user
  INSERT INTO users (username, email, is_bot)
  VALUES (
    v_random_username,
    v_random_username || '@bot.local',
    true
  )
  RETURNING id INTO v_user_id;
  
  -- Create bot team with random name
  INSERT INTO teams (
    user_id,
    team_name,
    is_bot,
    simulated_season_id,
    is_active
  )
  VALUES (
    v_user_id,
    v_random_team,
    true,
    p_season_id,
    true
  )
  RETURNING id INTO v_team_id;
  
  -- Give bot 5 random players (one per position requirement)
  -- QB
  INSERT INTO user_player_inventory (user_id, team_id, player_card_id, is_in_lineup)
  SELECT v_user_id, v_team_id, id, true
  FROM player_cards
  WHERE position = 'Quarterback' AND season_year = v_season_year
  ORDER BY RANDOM()
  LIMIT 1;
  
  -- RB (2)
  INSERT INTO user_player_inventory (user_id, team_id, player_card_id, is_in_lineup)
  SELECT v_user_id, v_team_id, id, true
  FROM player_cards
  WHERE position = 'Running Back' AND season_year = v_season_year
  ORDER BY RANDOM()
  LIMIT 2;
  
  -- WR (2)
  INSERT INTO user_player_inventory (user_id, team_id, player_card_id, is_in_lineup)
  SELECT v_user_id, v_team_id, id, true
  FROM player_cards
  WHERE position = 'Wide Receiver' AND season_year = v_season_year
  ORDER BY RANDOM()
  LIMIT 2;
  
  -- TE
  INSERT INTO user_player_inventory (user_id, team_id, player_card_id, is_in_lineup)
  SELECT v_user_id, v_team_id, id, true
  FROM player_cards
  WHERE position = 'Tight End' AND season_year = v_season_year
  ORDER BY RANDOM()
  LIMIT 1;
  
  RETURN v_team_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_bot_team IS 'Creates a bot team with random name and username for simulated seasons';
COMMENT ON FUNCTION get_random_first_name IS 'Returns a random first name for bot generation';
COMMENT ON FUNCTION get_random_last_name IS 'Returns a random last name for bot generation';
COMMENT ON FUNCTION get_random_team_name IS 'Returns a random team name for bot teams';
