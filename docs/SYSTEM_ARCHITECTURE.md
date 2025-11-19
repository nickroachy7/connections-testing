# System Architecture: Week Advancement Flow

## Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NFL WEEKLY CYCLE                              │
└─────────────────────────────────────────────────────────────────────┘

WEEK N IN PROGRESS (Thu-Mon)
═══════════════════════════════════════════════════════════════════════

┌──────────────────┐
│  ESPN/NFL API    │  ← External data source
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  🔒 lock-lineups (Edge Function)                                    │
│  Runs: Every 5 min on Sun/Mon/Thu                                   │
├─────────────────────────────────────────────────────────────────────┤
│  1. Query: game_scores (game_start_time <= now + 2 min)            │
│  2. Query: player_cards (team_abbreviation IN games)               │
│  3. UPDATE: user_player_inventory.is_locked = true                 │
│  4. INSERT: weekly_lineups (if not exists)                         │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  📊 update-live-stats (Edge Function)                               │
│  Runs: Every 5 min on Sun/Mon/Thu (after lock-lineups)             │
├─────────────────────────────────────────────────────────────────────┤
│  1. Fetch: ESPN API (game scores, player stats)                    │
│  2. UPDATE: game_scores (score, quarter, time, status)             │
│  3. UPSERT: player_game_stats (stats, fantasy_points)              │
│  4. UPDATE: weekly_lineups.total_points (sum player points)        │
└─────────────────────────────────────────────────────────────────────┘

         Player states during games:
         ┌───────────────────────────┐
         │ user_player_inventory     │
         │   is_locked = TRUE        │
         │   (cannot be changed)     │
         └───────────────────────────┘


WEEK N FINALIZATION (Tue 12:01 AM)
═══════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────┐
│  ✅ finalize-week (Edge Function)                                   │
│  Runs: Tuesday 12:01 AM                                             │
├─────────────────────────────────────────────────────────────────────┤
│  1. Query: weekly_lineups WHERE status = 'pending'                 │
│  2. Calculate: globalMedian = median(total_points)                    │
│  3. For each lineup:                                                │
│     • beatMedian = (total_points >= globalMedian)                   │
│     • result = beatMedian ? 'win' : 'loss'                         │
│  4. UPDATE: weekly_lineups.status = 'finalized'                    │
│  5. UPDATE: teams (wins++, losses++, is_active)                    │
│  6. INSERT: transactions (log result)                              │
│  7. UPSERT: weekly_global_stats (median_score, etc.)               │
└─────────────────────────────────────────────────────────────────────┘

         Database state after finalization:
         ┌───────────────────────────┐
         │ teams                     │
         │   wins = N                │
         │   losses = M              │
         │   is_active = (M < 3)     │
         ├───────────────────────────┤
         │ weekly_lineups            │
         │   status = 'finalized'    │
         │   beat_median = true/false│
         └───────────────────────────┘


WEEK ADVANCEMENT (Tue 8:00 PM)
═══════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────┐
│  ⏭️  advance_nfl_week() (Database Function)                         │
│  Runs: Tuesday 8:00 PM via cron                                     │
│  Called directly: SELECT advance_nfl_week();                        │
├─────────────────────────────────────────────────────────────────────┤
│  1. SELECT: nfl_season_config WHERE is_active = true               │
│  2. v_new_week = current_week + 1                                   │
│  3. UPDATE: nfl_season_config                                       │
│     SET current_week = v_new_week                                   │
│         week_start_date = old_end + 1 sec                          │
│         week_end_date = old_end + 7 days                           │
│  4. INSERT: weekly_global_stats (new week entry)                   │
│  5. UPDATE: user_player_inventory.is_locked = FALSE (ALL)          │
│  6. RETURN: old_week, new_week, season_year                        │
└─────────────────────────────────────────────────────────────────────┘

         Database state after advancement:
         ┌───────────────────────────┐
         │ nfl_season_config         │
         │   current_week = N+1      │
         ├───────────────────────────┤
         │ user_player_inventory     │
         │   is_locked = FALSE       │
         │   (all players unlocked)  │
         └───────────────────────────┘


PROJECTIONS UPDATE (Tue 8:05 PM)
═══════════════════════════════════════════════════════════════════════

┌──────────────────┐
│  ESPN/NFL API    │  ← Fetch season stats
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  📈 update-projections (Edge Function)                              │
│  Runs: Tuesday 8:05 PM (5 min after advance)                        │
├─────────────────────────────────────────────────────────────────────┤
│  1. Fetch: ESPN API (player season averages, injuries)             │
│  2. For each player:                                                │
│     • Calculate: avg PPG from season stats                         │
│     • Adjust: for injury status (OUT = 0, Q = 75%, etc.)          │
│     • Generate: projection_notes                                    │
│  3. UPDATE: player_cards                                            │
│     SET weekly_projected_points = calculated_projection             │
│         injury_status = current_status                             │
│         season_ppg = avg_points                                     │
│         projection_notes = explanation                              │
└─────────────────────────────────────────────────────────────────────┘

         Database state after projections:
         ┌───────────────────────────┐
         │ player_cards              │
         │   weekly_projected_points │
         │   injury_status           │
         │   season_ppg              │
         └───────────────────────────┘


READY FOR WEEK N+1 (Wed-Thu)
═══════════════════════════════════════════════════════════════════════

         Users can now:
         ┌───────────────────────────┐
         │ • View Week N+1 projections│
         │ • Set lineups             │
         │ • Swap players            │
         │ • Apply tokens            │
         │ • Buy packs               │
         └───────────────────────────┘

         Cycle repeats Thursday when first game starts...
```

---

## Key Tables & Their Roles

### Configuration Tables
```sql
nfl_season_config
├─ current_week: INT           -- The active NFL week (1-18)
├─ season_year: INT            -- Current NFL season year
├─ week_start_date: TIMESTAMP  -- When this week started
├─ week_end_date: TIMESTAMP    -- When this week ends
└─ is_active: BOOLEAN          -- Always TRUE (only 1 active row)

Purpose: Single source of truth for "what week is it?"
Updated by: advance_nfl_week() function
```

### Game Data Tables
```sql
game_scores
├─ game_id: TEXT               -- Unique game identifier
├─ week_number: INT            -- Which week this game is in
├─ season_year: INT
├─ home_team: TEXT             -- Team abbreviation (e.g., 'KC')
├─ away_team: TEXT
├─ game_status: ENUM           -- scheduled, live, halftime, final
├─ game_start_time: TIMESTAMP  -- When game starts (for locking)
├─ home_score: INT
└─ away_score: INT

Purpose: Track all NFL games and their status
Updated by: update-live-stats edge function
Used by: lock-lineups (to determine which players to lock)

player_game_stats
├─ game_id: TEXT               -- Links to game_scores
├─ player_card_id: UUID        -- Links to player_cards
├─ week_number: INT
├─ season_year: INT
├─ stats: JSONB                -- Raw stats (pass_yds, rush_yds, etc.)
└─ fantasy_points: NUMERIC     -- Calculated fantasy points

Purpose: Store individual player performance in each game
Updated by: update-live-stats edge function
Used by: Scoring calculations, lineup point totals
```

### Lineup & Scoring Tables
```sql
weekly_lineups
├─ team_id: UUID               -- Which team this lineup belongs to
├─ week_number: INT            -- Which week this is for
├─ season_year: INT
├─ lineup_snapshot: JSONB      -- Frozen lineup when locked
├─ total_points: NUMERIC       -- Sum of all player points
└─ status: ENUM                -- pending, active, completed

Purpose: Immutable record of each team's lineup for a week
Created by: lock-lineups (when first game starts)
Updated by: update-live-stats (total_points), finalize-week (status)

weekly_global_stats
├─ week_number: INT
├─ season_year: INT
├─ average_score: NUMERIC      -- Global average (for win/loss)
├─ median_score: NUMERIC
├─ highest_score: NUMERIC
└─ lowest_score: NUMERIC

Purpose: Track league-wide statistics for each week
Created by: advance_nfl_week() (empty entry)
Updated by: finalize-week (calculates actual stats)
```

### Player & Inventory Tables
```sql
user_player_inventory
├─ user_id: UUID
├─ team_id: UUID
├─ player_card_id: UUID        -- Links to player_cards
├─ is_in_lineup: BOOLEAN       -- Is player in active lineup?
├─ lineup_position: TEXT       -- QB1, RB1, FLEX, etc.
├─ is_locked: BOOLEAN          -- TRUE when game starts, FALSE Tue 8pm
├─ card_level: INT             -- Player progression level
└─ card_tier: ENUM             -- base, role_player, starter, etc.

Purpose: User's collection of players, their positions, lock state
Locked by: lock-lineups edge function
Unlocked by: advance_nfl_week() database function

player_cards
├─ player_id: TEXT             -- Unique player identifier
├─ player_name: TEXT
├─ position: TEXT              -- QB, RB, WR, TE, K, DEF
├─ team_abbreviation: TEXT     -- NFL team (used for locking)
├─ weekly_projected_points: NUMERIC  -- Week N+1 projection
├─ season_ppg: NUMERIC         -- Season average
└─ injury_status: TEXT         -- healthy, questionable, out, IR

Purpose: Master catalog of all NFL players
Updated by: update-projections edge function
Used by: Lineup builder, projections display
```

### Team Management Tables
```sql
teams
├─ user_id: UUID
├─ team_name: TEXT
├─ is_active: BOOLEAN          -- FALSE if eliminated
├─ current_week: INT           -- Which week team is on
├─ wins: INT                   -- Total wins
├─ losses: INT                 -- Total losses (3 = elimination)
├─ total_points: NUMERIC       -- Cumulative season points
└─ coins: INT                  -- Team currency for packs

Purpose: Track each team's record and status
Updated by: finalize-week (wins/losses/is_active)
```

---

## Data Consistency Rules

### Rule 1: Single Active Config
```sql
-- Only ONE row should have is_active = true
SELECT COUNT(*) FROM nfl_season_config WHERE is_active = true;
-- Expected: 1
```

### Rule 2: Player Lock States
```sql
-- During games (Thu-Mon): Some players locked
-- After advance (Tue 8pm): ALL players unlocked
SELECT COUNT(*) FROM user_player_inventory WHERE is_locked = true;
-- Expected: 0 (on Tue night), >0 (during week)
```

### Rule 3: Lineup Status Progression
```sql
-- pending → finalized (never goes backwards)
-- A lineup cannot be finalized before the week ends
SELECT status FROM weekly_lineups 
WHERE week_number = (SELECT current_week FROM nfl_season_config WHERE is_active = true);
-- Expected: 'pending' (during week), 'finalized' (after Tue 12:01am)
```

### Rule 4: Week Synchronization
```sql
-- All active systems should agree on current week
SELECT DISTINCT current_week FROM (
  SELECT current_week FROM nfl_season_config WHERE is_active = true
  UNION
  SELECT MAX(week_number) FROM game_scores WHERE season_year = 2025
  UNION
  SELECT MAX(week_number) FROM weekly_lineups WHERE status = 'pending'
) AS weeks;
-- Expected: Single value
```

---

## Performance Considerations

### Indexing Strategy
```sql
-- Critical indexes for performance
CREATE INDEX idx_game_scores_week_time ON game_scores(week_number, game_start_time);
CREATE INDEX idx_player_inventory_locked ON user_player_inventory(is_locked);
CREATE INDEX idx_weekly_lineups_status ON weekly_lineups(week_number, status);
CREATE INDEX idx_player_cards_team ON player_cards(team_abbreviation);
```

### Why Database Function for Advance Week?
- **Speed**: No HTTP overhead, runs in-database
- **Atomicity**: Single transaction, all-or-nothing
- **Simplicity**: ~40 lines of SQL vs Edge Function + HTTP + Error handling
- **Reliability**: No network failures, no timeout issues
- **Cost**: Free (no Edge Function execution time)

---

## Error Handling & Recovery

### If Edge Function Fails
```bash
# Check edge function logs
SELECT * FROM edge_function_logs 
WHERE function_name = 'lock-lineups' AND status = 'error'
ORDER BY created_at DESC;

# Manually trigger
curl -X POST https://[PROJECT].supabase.co/functions/v1/lock-lineups
```

### If Database Function Fails
```sql
-- Check error in cron logs
SELECT return_message FROM cron.job_run_details 
WHERE jobname = 'advance-to-next-week'
ORDER BY start_time DESC LIMIT 1;

-- Manually execute
SELECT * FROM advance_nfl_week();
```

### If Week Gets Out of Sync
```sql
-- Reset to specific week
UPDATE nfl_season_config
SET current_week = 11
WHERE is_active = true;

-- Unlock all players
UPDATE user_player_inventory
SET is_locked = FALSE;
```

---

## Monitoring Queries

```sql
-- Check system health
SELECT 
  'Current Week' as metric,
  current_week::text as value
FROM nfl_season_config WHERE is_active = true
UNION ALL
SELECT 
  'Locked Players',
  COUNT(*)::text
FROM user_player_inventory WHERE is_locked = true
UNION ALL
SELECT 
  'Pending Lineups',
  COUNT(*)::text
FROM weekly_lineups WHERE status = 'pending'
UNION ALL
SELECT 
  'Active Teams',
  COUNT(*)::text
FROM teams WHERE is_active = true;
```
