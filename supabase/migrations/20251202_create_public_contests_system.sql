-- ============================================
-- PUBLIC CONTESTS SYSTEM
-- Weekly contests for public teams
-- Applied: December 2, 2025
--
-- NOTE: These are 1-WEEK contests. The elimination/lives system is tracked
-- at the TEAM level (via contest_types), not the contest level.
-- Users enter a new contest each week - losing = team loses a life.
-- ============================================

-- ============================================
-- 1. PUBLIC CONTEST TEMPLATES
-- Pre-defined contest types that get spawned each week
-- Vary by: size, scoring format, difficulty
-- ============================================
CREATE TABLE IF NOT EXISTS public_contest_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  name TEXT NOT NULL UNIQUE,                    -- "Sprint Survivor", "Weekly Grind", etc.
  description TEXT,
  icon TEXT DEFAULT 'trophy',                   -- Icon identifier for UI
  
  -- Size configuration
  max_entries INTEGER NOT NULL CHECK (max_entries >= 4 AND max_entries <= 12),
  
  -- Scoring format
  scoring_type TEXT NOT NULL DEFAULT 'half_ppr' 
    CHECK (scoring_type IN ('standard', 'half_ppr', 'full_ppr')),
  win_condition TEXT NOT NULL DEFAULT 'median'
    CHECK (win_condition IN ('median')),        -- Beat median = win, below = lose
  
  -- NOTE: elimination_type kept for schema but always 'none' for 1-week contests
  -- Team elimination is handled at team level, not contest level
  elimination_type TEXT NOT NULL DEFAULT 'none'
    CHECK (elimination_type IN ('none')),
  max_losses INTEGER DEFAULT NULL,              -- Not used for 1-week contests
  
  -- Display
  difficulty TEXT DEFAULT 'normal'
    CHECK (difficulty IN ('easy', 'normal', 'hard')),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public_contest_templates IS 'Pre-defined 1-week contest templates. Teams enter each week; losing costs a team life.';

-- ============================================
-- 2. PUBLIC CONTESTS (Weekly Instances)
-- ============================================
CREATE TABLE IF NOT EXISTS public_contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template reference
  template_id UUID REFERENCES public_contest_templates(id),
  
  -- Contest identity (copied from template for denormalization)
  name TEXT NOT NULL,
  description TEXT,
  
  -- Size configuration
  max_entries INTEGER NOT NULL CHECK (max_entries >= 4 AND max_entries <= 12),
  current_entries INTEGER DEFAULT 0,
  
  -- Contest rules
  scoring_type TEXT NOT NULL DEFAULT 'half_ppr',
  win_condition TEXT NOT NULL DEFAULT 'median',
  elimination_type TEXT NOT NULL DEFAULT 'none',
  max_losses INTEGER,
  
  -- Timing
  week INTEGER NOT NULL CHECK (week >= 1 AND week <= 18),
  season INTEGER NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'locked', 'in_progress', 'completed', 'cancelled')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  lock_time TIMESTAMPTZ,              -- When entries close (first game kickoff)
  completed_at TIMESTAMPTZ,
  
  -- Unique constraint: one instance per template per week
  UNIQUE(template_id, week, season)
);

CREATE INDEX idx_public_contests_week_status ON public_contests(week, season, status);
CREATE INDEX idx_public_contests_status ON public_contests(status);

COMMENT ON TABLE public_contests IS 'Weekly instances of public contests spawned from templates';

-- ============================================
-- 3. PUBLIC CONTEST ENTRIES
-- ============================================
CREATE TABLE IF NOT EXISTS public_contest_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  contest_id UUID NOT NULL REFERENCES public_contests(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Entry tracking
  entered_at TIMESTAMPTZ DEFAULT now(),
  
  -- Results (updated after week finalization)
  final_score NUMERIC,
  beat_median BOOLEAN,
  final_rank INTEGER,
  
  -- Status
  is_eliminated BOOLEAN DEFAULT false,
  eliminated_at TIMESTAMPTZ,
  
  -- Unique constraints
  UNIQUE(contest_id, team_id),  -- One entry per team per contest
  UNIQUE(team_id, contest_id)   -- Index for reverse lookup
);

CREATE INDEX idx_public_contest_entries_contest ON public_contest_entries(contest_id);
CREATE INDEX idx_public_contest_entries_team ON public_contest_entries(team_id);
CREATE INDEX idx_public_contest_entries_user ON public_contest_entries(user_id);

COMMENT ON TABLE public_contest_entries IS 'Tracks team entries in public contests';

-- ============================================
-- 4. RLS POLICIES
-- ============================================

ALTER TABLE public_contest_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_contest_entries ENABLE ROW LEVEL SECURITY;

-- Templates are publicly readable
CREATE POLICY "Templates are publicly readable"
  ON public_contest_templates FOR SELECT
  USING (is_active = true);

-- Contests are publicly readable
CREATE POLICY "Contests are publicly readable"
  ON public_contests FOR SELECT
  USING (true);

-- Users can view all entries (for leaderboards)
CREATE POLICY "Entries are publicly readable"
  ON public_contest_entries FOR SELECT
  USING (true);

-- Users can only insert their own entries
CREATE POLICY "Users can enter contests"
  ON public_contest_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 5. HELPER FUNCTION: Check if team already entered this week
-- ============================================
CREATE OR REPLACE FUNCTION has_team_entered_contest_this_week(
  p_team_id UUID,
  p_week INTEGER,
  p_season INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public_contest_entries e
    JOIN public_contests c ON c.id = e.contest_id
    WHERE e.team_id = p_team_id
      AND c.week = p_week
      AND c.season = p_season
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION has_team_entered_contest_this_week IS 'Checks if a team has already entered a public contest for a given week';

-- ============================================
-- 6. FUNCTION: Enter a public contest
-- ============================================
CREATE OR REPLACE FUNCTION enter_public_contest(
  p_contest_id UUID,
  p_team_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_contest RECORD;
  v_team RECORD;
  v_week INTEGER;
  v_season INTEGER;
  v_entry_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get contest details
  SELECT * INTO v_contest FROM public_contests WHERE id = p_contest_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contest not found');
  END IF;
  
  -- Check contest is open
  IF v_contest.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contest is not open for entries');
  END IF;
  
  -- Check contest has space
  IF v_contest.current_entries >= v_contest.max_entries THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contest is full');
  END IF;
  
  -- Get team details
  SELECT * INTO v_team FROM teams WHERE id = p_team_id AND user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Team not found or not owned by you');
  END IF;
  
  -- Check team is public
  IF v_team.team_type != 'public' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only public teams can enter public contests');
  END IF;
  
  -- Check team hasn't already entered a contest this week
  IF has_team_entered_contest_this_week(p_team_id, v_contest.week, v_contest.season) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This team has already entered a contest this week');
  END IF;
  
  -- Create entry
  INSERT INTO public_contest_entries (contest_id, team_id, user_id)
  VALUES (p_contest_id, p_team_id, v_user_id)
  RETURNING id INTO v_entry_id;
  
  -- Update contest entry count
  UPDATE public_contests 
  SET current_entries = current_entries + 1
  WHERE id = p_contest_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'entry_id', v_entry_id,
    'message', 'Successfully entered contest'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION enter_public_contest IS 'Allows a user to enter their public team into a public contest with validation';

-- ============================================
-- 7. FUNCTION: Get team's current week contest entry
-- ============================================
CREATE OR REPLACE FUNCTION get_team_contest_entry(
  p_team_id UUID,
  p_week INTEGER DEFAULT NULL,
  p_season INTEGER DEFAULT NULL
)
RETURNS TABLE (
  entry_id UUID,
  contest_id UUID,
  contest_name TEXT,
  contest_description TEXT,
  max_entries INTEGER,
  current_entries INTEGER,
  scoring_type TEXT,
  elimination_type TEXT,
  max_losses INTEGER,
  status TEXT,
  entered_at TIMESTAMPTZ,
  final_score NUMERIC,
  beat_median BOOLEAN,
  final_rank INTEGER
) AS $$
DECLARE
  v_week INTEGER;
  v_season INTEGER;
BEGIN
  -- Get current week/season if not provided
  IF p_week IS NULL OR p_season IS NULL THEN
    SELECT current_week, season_year INTO v_week, v_season
    FROM nfl_season_config
    WHERE is_active = true
    LIMIT 1;
  ELSE
    v_week := p_week;
    v_season := p_season;
  END IF;
  
  RETURN QUERY
  SELECT 
    e.id AS entry_id,
    c.id AS contest_id,
    c.name AS contest_name,
    c.description AS contest_description,
    c.max_entries,
    c.current_entries,
    c.scoring_type,
    c.elimination_type,
    c.max_losses,
    c.status,
    e.entered_at,
    e.final_score,
    e.beat_median,
    e.final_rank
  FROM public_contest_entries e
  JOIN public_contests c ON c.id = e.contest_id
  WHERE e.team_id = p_team_id
    AND c.week = v_week
    AND c.season = v_season;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_team_contest_entry IS 'Gets the current week contest entry for a team if any';

-- ============================================
-- 8. SEED CONTEST TEMPLATES
-- ============================================
INSERT INTO public_contest_templates (name, description, max_entries, scoring_type, elimination_type, max_losses, difficulty, sort_order, icon) VALUES
(
  'Sprint Survivor',
  'Only the top half survive! Small and intense 4-person survivor battle.',
  4,
  'half_ppr',
  'survivor',
  1,
  'extreme',
  1,
  'zap'
),
(
  'The Grind',
  'Mid-size competition with a strike system. 3 losses and you''re out.',
  8,
  'half_ppr',
  'strike',
  3,
  'normal',
  2,
  'target'
),
(
  'Weekly Showdown',
  'Large free-for-all competition. No elimination - pure scoring matters!',
  12,
  'half_ppr',
  'none',
  NULL,
  'easy',
  3,
  'trophy'
),
(
  'Elite Four',
  'Intimate 4-person competition. Every point counts in this small arena.',
  4,
  'half_ppr',
  'none',
  NULL,
  'normal',
  4,
  'crown'
),
(
  'Gauntlet',
  'Tough 10-person bracket. Only 2 losses allowed before elimination.',
  10,
  'half_ppr',
  'strike',
  2,
  'hard',
  5,
  'shield'
),
(
  'PPR Sprint',
  'Full PPR scoring contest. Catch-heavy rosters thrive here!',
  6,
  'full_ppr',
  'none',
  NULL,
  'normal',
  6,
  'activity'
);

-- ============================================
-- 9. FUNCTION: Spawn weekly contests from templates
-- ============================================
CREATE OR REPLACE FUNCTION spawn_weekly_contests(
  p_week INTEGER DEFAULT NULL,
  p_season INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_week INTEGER;
  v_season INTEGER;
  v_lock_time TIMESTAMPTZ;
  v_template RECORD;
  v_count INTEGER := 0;
BEGIN
  -- Get current week/season if not provided
  IF p_week IS NULL OR p_season IS NULL THEN
    SELECT current_week, season_year, first_game_time 
    INTO v_week, v_season, v_lock_time
    FROM nfl_season_config
    WHERE is_active = true
    LIMIT 1;
  ELSE
    v_week := p_week;
    v_season := p_season;
    -- Try to get lock time from config
    SELECT first_game_time INTO v_lock_time
    FROM nfl_season_config
    WHERE is_active = true
    LIMIT 1;
  END IF;
  
  -- Create contests for each active template
  FOR v_template IN 
    SELECT * FROM public_contest_templates WHERE is_active = true ORDER BY sort_order
  LOOP
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
    ) VALUES (
      v_template.id,
      v_template.name,
      v_template.description,
      v_template.max_entries,
      v_template.scoring_type,
      v_template.win_condition,
      v_template.elimination_type,
      v_template.max_losses,
      v_week,
      v_season,
      'open',
      v_lock_time
    )
    ON CONFLICT (template_id, week, season) DO NOTHING;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION spawn_weekly_contests IS 'Creates weekly contest instances from all active templates';
