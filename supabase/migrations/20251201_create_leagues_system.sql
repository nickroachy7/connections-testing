-- Leagues System Migration
-- Creates tables for league management, memberships, teams, and stats

-- ============================================
-- 1. LEAGUES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  commissioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- League capacity settings
  max_users INTEGER NOT NULL DEFAULT 10 CHECK (max_users > 0 AND max_users <= 100),
  max_teams_per_user INTEGER NOT NULL DEFAULT 1 CHECK (max_teams_per_user >= 1 AND max_teams_per_user <= 3),
  
  -- Elimination settings
  elimination_enabled BOOLEAN NOT NULL DEFAULT true,
  restart_allowed BOOLEAN NOT NULL DEFAULT false,
  
  -- Entry requirements
  fresh_start_required BOOLEAN NOT NULL DEFAULT false,
  restart_requires_new_team BOOLEAN NOT NULL DEFAULT false,
  
  -- League access
  invite_code TEXT UNIQUE NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT true,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  season INTEGER NOT NULL DEFAULT 2024,
  
  -- Future features
  entry_fee INTEGER DEFAULT 0,
  prize_pool_enabled BOOLEAN DEFAULT false
);

CREATE INDEX idx_leagues_commissioner ON leagues(commissioner_id);
CREATE INDEX idx_leagues_invite_code ON leagues(invite_code);
CREATE INDEX idx_leagues_status ON leagues(status);

-- More tables and functions follow...