-- =====================================================
-- Multi-Sport Foundation: Core Tables
-- =====================================================
-- This migration adds sport-agnostic tables to support NBA, MLB, NFL
-- Backwards compatible: Existing NFL data continues to work

-- =====================================================
-- 1. SPORTS TABLE
-- =====================================================
-- Defines available sports in the platform

CREATE TABLE IF NOT EXISTS sports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL, -- 'nfl', 'nba', 'mlb'
  name TEXT NOT NULL, -- 'National Football League', 'National Basketball Association'
  display_name TEXT NOT NULL, -- 'NFL', 'NBA', 'MLB'
  is_active BOOLEAN DEFAULT true,
  season_type TEXT NOT NULL, -- 'weekly', 'daily', 'seasonal'
  default_roster_size INT DEFAULT 50,
  default_starting_lineup_size INT DEFAULT 9,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert initial sports
INSERT INTO sports (code, name, display_name, season_type, default_roster_size, default_starting_lineup_size) VALUES
  ('nfl', 'National Football League', 'NFL', 'weekly', 50, 9),
  ('nba', 'National Basketball Association', 'NBA', 'daily', 40, 8),
  ('mlb', 'Major League Baseball', 'MLB', 'daily', 60, 10)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 2. SPORT POSITIONS TABLE
-- =====================================================
-- Defines positions for each sport

CREATE TABLE IF NOT EXISTS sport_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  code TEXT NOT NULL, -- 'QB', 'PG', 'P'
  display_name TEXT NOT NULL, -- 'Quarterback', 'Point Guard', 'Pitcher'
  short_name TEXT, -- 'QB', 'PG', 'P'
  abbreviation TEXT, -- 'QB', 'G', 'P'
  sort_order INT DEFAULT 0,
  is_flex_eligible BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sport_id, code)
);

CREATE INDEX idx_sport_positions_sport ON sport_positions(sport_id);
CREATE INDEX idx_sport_positions_code ON sport_positions(sport_id, code);

-- Insert NFL positions
INSERT INTO sport_positions (sport_id, code, display_name, short_name, sort_order, is_flex_eligible)
SELECT 
  s.id,
  pos.code,
  pos.display_name,
  pos.short_name,
  pos.sort_order,
  pos.is_flex_eligible
FROM sports s
CROSS JOIN (VALUES
  ('QB', 'Quarterback', 'QB', 1, false),
  ('RB', 'Running Back', 'RB', 2, true),
  ('WR', 'Wide Receiver', 'WR', 3, true),
  ('TE', 'Tight End', 'TE', 4, true),
  ('K', 'Kicker', 'K', 5, false),
  ('DEF', 'Defense/Special Teams', 'DEF', 6, false)
) AS pos(code, display_name, short_name, sort_order, is_flex_eligible)
WHERE s.code = 'nfl'
ON CONFLICT (sport_id, code) DO NOTHING;

-- Insert NBA positions
INSERT INTO sport_positions (sport_id, code, display_name, short_name, sort_order, is_flex_eligible)
SELECT 
  s.id,
  pos.code,
  pos.display_name,
  pos.short_name,
  pos.sort_order,
  pos.is_flex_eligible
FROM sports s
CROSS JOIN (VALUES
  ('PG', 'Point Guard', 'PG', 1, true),
  ('SG', 'Shooting Guard', 'SG', 2, true),
  ('SF', 'Small Forward', 'SF', 3, true),
  ('PF', 'Power Forward', 'PF', 4, true),
  ('C', 'Center', 'C', 5, true)
) AS pos(code, display_name, short_name, sort_order, is_flex_eligible)
WHERE s.code = 'nba'
ON CONFLICT (sport_id, code) DO NOTHING;

-- Insert MLB positions
INSERT INTO sport_positions (sport_id, code, display_name, short_name, sort_order, is_flex_eligible)
SELECT 
  s.id,
  pos.code,
  pos.display_name,
  pos.short_name,
  pos.sort_order,
  pos.is_flex_eligible
FROM sports s
CROSS JOIN (VALUES
  ('P', 'Pitcher', 'P', 1, false),
  ('C', 'Catcher', 'C', 2, false),
  ('1B', 'First Base', '1B', 3, true),
  ('2B', 'Second Base', '2B', 4, true),
  ('3B', 'Third Base', '3B', 5, true),
  ('SS', 'Shortstop', 'SS', 6, true),
  ('OF', 'Outfield', 'OF', 7, true),
  ('DH', 'Designated Hitter', 'DH', 8, true)
) AS pos(code, display_name, short_name, sort_order, is_flex_eligible)
WHERE s.code = 'mlb'
ON CONFLICT (sport_id, code) DO NOTHING;

-- =====================================================
-- 3. LINEUP CONFIGURATIONS TABLE
-- =====================================================
-- Defines lineup slots for each sport + contest type combo

CREATE TABLE IF NOT EXISTS lineup_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  contest_type_id UUID REFERENCES contest_types(id) ON DELETE CASCADE,
  slot_name TEXT NOT NULL, -- 'QB', 'RB1', 'RB2', 'FLEX', 'UTIL'
  display_name TEXT NOT NULL, -- 'Quarterback', 'Running Back 1', 'Flex'
  position_code TEXT NOT NULL, -- References sport_positions.code
  is_flex BOOLEAN DEFAULT false,
  allowed_positions TEXT[], -- For FLEX: ['RB', 'WR', 'TE']
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sport_id, contest_type_id, slot_name)
);

CREATE INDEX idx_lineup_config_sport ON lineup_configurations(sport_id);
CREATE INDEX idx_lineup_config_contest ON lineup_configurations(contest_type_id);

-- =====================================================
-- 4. SPORT STATS TABLE
-- =====================================================
-- Defines available stats for each sport

CREATE TABLE IF NOT EXISTS sport_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  stat_code TEXT NOT NULL, -- 'pass_yds', 'rush_td', 'pts', 'reb'
  display_name TEXT NOT NULL, -- 'Passing Yards', 'Points', 'Rebounds'
  short_name TEXT, -- 'PaYd', 'Pts', 'Reb'
  category TEXT, -- 'passing', 'rushing', 'scoring'
  data_type TEXT DEFAULT 'integer', -- 'integer', 'decimal'
  is_counting_stat BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sport_id, stat_code)
);

CREATE INDEX idx_sport_stats_sport ON sport_stats(sport_id);
CREATE INDEX idx_sport_stats_code ON sport_stats(sport_id, stat_code);

-- =====================================================
-- 5. SCORING RULES TABLE
-- =====================================================
-- Defines how stats convert to fantasy points

CREATE TABLE IF NOT EXISTS scoring_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  contest_type_id UUID REFERENCES contest_types(id) ON DELETE CASCADE,
  stat_code TEXT NOT NULL, -- References sport_stats.stat_code
  points_per_unit DECIMAL NOT NULL, -- 0.04 for pass_yds, 6 for pass_td
  min_threshold DECIMAL DEFAULT 0, -- Minimum stat value to earn points
  bonus_threshold DECIMAL, -- Bonus if stat exceeds this (e.g., 300 pass yds)
  bonus_points DECIMAL, -- Points awarded for bonus
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sport_id, contest_type_id, stat_code)
);

CREATE INDEX idx_scoring_rules_sport ON scoring_rules(sport_id);
CREATE INDEX idx_scoring_rules_contest ON scoring_rules(contest_type_id);

-- =====================================================
-- 6. ADD SPORT_ID TO EXISTING TABLES
-- =====================================================

-- Add sport_id to contest_types (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contest_types' AND column_name = 'sport_id'
  ) THEN
    ALTER TABLE contest_types ADD COLUMN sport_id UUID REFERENCES sports(id);
    
    -- Set existing contest types to NFL
    UPDATE contest_types SET sport_id = (SELECT id FROM sports WHERE code = 'nfl');
    
    -- Make NOT NULL after backfill
    ALTER TABLE contest_types ALTER COLUMN sport_id SET NOT NULL;
    
    CREATE INDEX idx_contest_types_sport ON contest_types(sport_id);
  END IF;
END $$;

-- Add sport_id to player_cards (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'player_cards' AND column_name = 'sport_id'
  ) THEN
    ALTER TABLE player_cards ADD COLUMN sport_id UUID REFERENCES sports(id);
    
    -- Set existing players to NFL
    UPDATE player_cards SET sport_id = (SELECT id FROM sports WHERE code = 'nfl');
    
    -- Make NOT NULL after backfill
    ALTER TABLE player_cards ALTER COLUMN sport_id SET NOT NULL;
    
    CREATE INDEX idx_player_cards_sport ON player_cards(sport_id);
    CREATE INDEX idx_player_cards_sport_position ON player_cards(sport_id, position);
  END IF;
END $$;

-- =====================================================
-- 7. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sport_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineup_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sport_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_rules ENABLE ROW LEVEL SECURITY;

-- Public read access (all users can see sport configs)
CREATE POLICY "Sports are publicly readable" 
  ON sports FOR SELECT 
  USING (true);

CREATE POLICY "Sport positions are publicly readable" 
  ON sport_positions FOR SELECT 
  USING (true);

CREATE POLICY "Lineup configurations are publicly readable" 
  ON lineup_configurations FOR SELECT 
  USING (true);

CREATE POLICY "Sport stats are publicly readable" 
  ON sport_stats FOR SELECT 
  USING (true);

CREATE POLICY "Scoring rules are publicly readable" 
  ON scoring_rules FOR SELECT 
  USING (true);

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to get sport by code
CREATE OR REPLACE FUNCTION get_sport_by_code(sport_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sport_uuid UUID;
BEGIN
  SELECT id INTO sport_uuid FROM sports WHERE code = sport_code;
  RETURN sport_uuid;
END;
$$;

-- Function to get positions for a sport
CREATE OR REPLACE FUNCTION get_sport_positions(sport_code TEXT)
RETURNS TABLE (
  code TEXT,
  display_name TEXT,
  short_name TEXT,
  is_flex_eligible BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT sp.code, sp.display_name, sp.short_name, sp.is_flex_eligible
  FROM sport_positions sp
  JOIN sports s ON sp.sport_id = s.id
  WHERE s.code = sport_code
  ORDER BY sp.sort_order;
END;
$$;

COMMENT ON TABLE sports IS 'Available sports in the platform';
COMMENT ON TABLE sport_positions IS 'Positions for each sport';
COMMENT ON TABLE lineup_configurations IS 'Lineup slot definitions per sport and contest type';
COMMENT ON TABLE sport_stats IS 'Available statistics for each sport';
COMMENT ON TABLE scoring_rules IS 'Fantasy point conversion rules';
