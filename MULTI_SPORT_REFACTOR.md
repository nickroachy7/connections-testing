# Multi-Sport Platform Refactor Plan

**Goal:** Transform NFL-specific codebase into sport-agnostic fantasy platform

**Status:** Planning Phase  
**Created:** 2026-01-31

---

## Current State Analysis

### ✅ Already Sport-Agnostic
- Pack opening system
- Coin economy
- User authentication & profiles
- Team management core logic
- Leaderboard system (mostly)
- Card leveling system

### ⚠️ Needs Abstraction
1. **Position Slots** - Hardcoded QB/RB/WR/TE everywhere
2. **Game Schedule** - Assumes NFL weekly cycle
3. **Data Sources** - BallDontLie NFL API only
4. **Scoring Logic** - Fantasy points calculation is football-specific
5. **UI Labels** - "NFL" references in 122 files
6. **Weekly Cycle** - Cron jobs assume Sun/Mon/Thu games

### ❌ Sport-Specific (Needs Replacement)
- `player_cards` schema (positions, stats)
- `player_game_stats` schema (football stat columns)
- Weekly projections logic
- Live stats tracking

---

## Phase 1: Database Schema Abstraction

### 1.1 Create Sport Configuration System

**New Tables:**

```sql
-- Core sports metadata
CREATE TABLE sports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL, -- 'nfl', 'nba', 'mlb', 'nhl'
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  season_type TEXT, -- 'weekly', 'daily', 'seasonal'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sport-specific positions
CREATE TABLE sport_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport_id UUID REFERENCES sports(id),
  code TEXT NOT NULL, -- 'QB', 'PG', 'P', 'C'
  display_name TEXT NOT NULL,
  short_name TEXT,
  sort_order INT,
  UNIQUE(sport_id, code)
);

-- Lineup slot configurations (sport + contest type specific)
CREATE TABLE lineup_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport_id UUID REFERENCES sports(id),
  contest_type_id UUID REFERENCES contest_types(id),
  slot_name TEXT NOT NULL, -- 'QB', 'RB1', 'FLEX', 'UTIL'
  position_code TEXT NOT NULL, -- References sport_positions.code
  is_flex BOOLEAN DEFAULT false,
  allowed_positions TEXT[], -- For FLEX slots: ['RB', 'WR', 'TE']
  sort_order INT,
  UNIQUE(sport_id, contest_type_id, slot_name)
);

-- Stat definitions per sport
CREATE TABLE sport_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport_id UUID REFERENCES sports(id),
  stat_code TEXT NOT NULL, -- 'pass_yds', 'rush_td', 'pts', 'reb'
  display_name TEXT NOT NULL,
  category TEXT, -- 'passing', 'rushing', 'scoring'
  data_type TEXT DEFAULT 'integer', -- 'integer', 'decimal'
  UNIQUE(sport_id, stat_code)
);

-- Sport-specific scoring rules
CREATE TABLE scoring_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport_id UUID REFERENCES sports(id),
  contest_type_id UUID REFERENCES contest_types(id),
  stat_code TEXT NOT NULL,
  points_per_unit DECIMAL NOT NULL, -- e.g., 0.04 for pass_yds, 6 for pass_td
  min_threshold DECIMAL, -- Minimum stat value to score points
  UNIQUE(sport_id, contest_type_id, stat_code)
);
```

### 1.2 Refactor Existing Tables

**player_cards:**
```sql
-- Add sport_id column
ALTER TABLE player_cards ADD COLUMN sport_id UUID REFERENCES sports(id);

-- Make position flexible (remove hardcoded constraints)
-- Stats will move to separate JSON column or normalized table
ALTER TABLE player_cards ADD COLUMN stats JSONB DEFAULT '{}'::jsonb;
```

**weekly_lineups:**
```sql
-- Replace hardcoded position columns with flexible slot system
-- Old: qb_id, rb1_id, rb2_id, wr1_id, etc.
-- New: lineup_slots JSONB or separate table

CREATE TABLE lineup_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weekly_lineup_id UUID REFERENCES weekly_lineups(id) ON DELETE CASCADE,
  slot_name TEXT NOT NULL, -- 'QB', 'RB1', 'FLEX'
  player_card_id UUID REFERENCES player_cards(id),
  projected_points DECIMAL,
  actual_points DECIMAL,
  UNIQUE(weekly_lineup_id, slot_name)
);
```

**player_game_stats:**
```sql
-- Replace hardcoded stat columns with flexible system
ALTER TABLE player_game_stats ADD COLUMN stats JSONB DEFAULT '{}'::jsonb;

-- Keep common fields: player_id, game_id, fantasy_points
-- Move sport-specific stats to JSONB
```

---

## Phase 2: API Abstraction Layer

### 2.1 Create Unified Data Source Interface

**File:** `src/services/sportsData/index.js`

```javascript
// Abstract interface all sports must implement
class SportDataSource {
  async getPlayers(filters) {}
  async getPlayerStats(playerId, season, week) {}
  async getLiveGameData(gameId) {}
  async getProjections(week) {}
  async getSchedule(week) {}
}

// NFL Implementation
class NFLDataSource extends SportDataSource {
  constructor() {
    this.api = new BallDontLieClient();
  }
  // Implement all methods
}

// NBA Implementation (future)
class NBADataSource extends SportDataSource {
  // Different API, same interface
}

// Factory to get correct source
export function getSportDataSource(sportCode) {
  switch(sportCode) {
    case 'nfl': return new NFLDataSource();
    case 'nba': return new NBADataSource();
    default: throw new Error(`Unknown sport: ${sportCode}`);
  }
}
```

### 2.2 Data Source Options

**NFL:** BallDontLie (current)  
**NBA:** BallDontLie, ESPN API, NBA Stats API  
**MLB:** ESPN API, MLB Stats API  
**NHL:** NHL Stats API  
**Soccer:** Football-Data.org, ESPN API  

---

## Phase 3: UI Component Abstraction

### 3.1 Replace Hardcoded Positions

**Before:**
```jsx
<select>
  <option value="QB">Quarterback</option>
  <option value="RB">Running Back</option>
  // ... hardcoded options
</select>
```

**After:**
```jsx
const { positions } = useSportConfig(team.sport_id);

<select>
  {positions.map(pos => (
    <option key={pos.code} value={pos.code}>
      {pos.display_name}
    </option>
  ))}
</select>
```

### 3.2 Dynamic Lineup Grid

Current `LineupGrid.jsx` has 9 hardcoded slots. Needs to be:

```jsx
function DynamicLineupGrid({ sportId, contestTypeId }) {
  const { slots } = useLineupConfiguration(sportId, contestTypeId);
  
  return (
    <div className="lineup-grid">
      {slots.map(slot => (
        <LineupSlot 
          key={slot.name}
          slot={slot}
          allowedPositions={slot.allowed_positions}
        />
      ))}
    </div>
  );
}
```

### 3.3 Sport-Specific Stat Display

```jsx
function PlayerStatsCard({ player, sportId }) {
  const { stats } = useSportStats(sportId);
  
  return (
    <div>
      {stats.map(stat => (
        <StatRow 
          key={stat.code}
          label={stat.display_name}
          value={player.stats[stat.code] || 0}
        />
      ))}
    </div>
  );
}
```

---

## Phase 4: Contest Type System

### 4.1 Make Contest Types Sport-Aware

```sql
ALTER TABLE contest_types ADD COLUMN sport_id UUID REFERENCES sports(id);
```

Examples:
- NFL Median 3-Week (Half PPR)
- NBA DFS Daily (Standard)
- MLB Season-Long (5x5 Roto)
- NHL Bracket Challenge

### 4.2 Pluggable Scoring Methods

Beyond median:
- **DFS (Salary Cap)** - Build roster under budget, highest score wins
- **Head-to-Head** - Beat specific opponent
- **Bracket** - Predict tournament outcomes
- **Survivor Pool** - Pick one team per week, can't repeat
- **Best Ball** - Auto-optimize lineup, no management needed

---

## Phase 5: Migration Strategy

### Option A: Clean Slate (Recommended for MVP)
1. Build multi-sport system from scratch in `v2/` directory
2. Keep current NFL app running as-is
3. Launch new platform when ready
4. Migrate users with data export/import

### Option B: In-Place Refactor (Risky)
1. Add sport configuration tables
2. Migrate NFL data to new schema
3. Refactor components one-by-one
4. High risk of breaking production

### Option C: Parallel Development
1. Run NFL app on `nfl.yourdomain.com`
2. Build multi-sport platform on `app.yourdomain.com`
3. Share user accounts but separate databases
4. Merge when stable

---

## Recommended Approach: **Phased Rollout**

**Phase 1: Foundation (2 weeks)**
- Create sport configuration tables
- Build API abstraction layer
- Implement for NFL only (prove it works)

**Phase 2: UI Flexibility (2 weeks)**
- Refactor components to use sport configs
- Test with NFL data (should look identical)

**Phase 3: Add Second Sport (2 weeks)**
- Implement NBA data source
- Create NBA contest types
- Launch beta with both sports

**Phase 4: Scale (Ongoing)**
- Add MLB, NHL, Soccer
- New contest types per sport
- Optimize based on usage

---

## Questions for Nick

1. **Priority sports?** (NBA, MLB, NHL, Soccer - rank them)
2. **Timeline?** (Weeks, months, or ship NFL then add sports later?)
3. **Current users?** (Do we need zero-downtime migration?)
4. **Contest types?** (Which beyond median: DFS, H2H, bracket, survivor?)
5. **Brand name?** (Affects URL structure, might want multi-sport domain)

---

**Next Steps:**
1. Get Nick's input on priorities
2. Choose migration strategy
3. Create first PR for database schema changes
4. Build proof-of-concept with dynamic positions

---

**Max - Ready to build this the right way. 🏀⚾🏒⚽**
