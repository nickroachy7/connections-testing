# NFL Weekly Automation Flow

This document explains how the game advances week-to-week, when edge functions run, and why.

## Overview

The game follows the NFL weekly schedule. Each week has several automated processes that run at specific times to:
1. Lock players when their games start
2. Update live stats during games
3. Finalize week results
4. Advance to the next week
5. Update player projections

---

## Weekly Timeline

### **During the Week (Sunday-Monday)**

#### **Every 5 minutes on Sun/Mon/Thu** - Player Locking & Live Stats
```
Cron: */5 * * * 0,1,4  (Every 5 min on Sunday, Monday, Thursday)
```

**Two functions run in sequence:**

1. **`lock-lineups`** - Locks players whose games are starting
   - Checks for games starting within next 2 minutes
   - Locks ALL players (lineup + bench) from teams with games starting
   - Creates weekly lineup snapshots if they don't exist yet
   - **Why:** Prevents users from swapping live players into lineup mid-game

2. **`update-live-stats`** - Updates player stats during games
   - Fetches live game data from NFL API
   - Updates `game_scores` table with current scores/status
   - Updates `player_game_stats` with individual player performance
   - Calculates fantasy points based on scoring rules
   - **Why:** Keeps game stats and fantasy points current during live games

### **Tuesday 12:01 AM** - Week Results Finalized
```
Cron: 1 0 * * 2  (Tuesday at 12:01 AM)
Function: finalize-week
```

**What it does:**
- Fetches all `weekly_lineups` with status='pending' for the completed week
- Calculates global average score across all teams
- Determines win/loss for each team (beat average = win, below = loss)
- Updates team records (wins/losses)
- Marks teams as eliminated if they hit loss limit (default: 3 losses)
- Sets lineup status to 'finalized'
- Logs transactions for each team's result

**Why Tuesday 12:01 AM:**
- All Week N games are complete (including Monday Night Football)
- Results can be safely calculated without risk of ongoing games

### **Tuesday 8:00 PM** - Advance to Next Week
```
Cron: 0 20 * * 2  (Tuesday at 8:00 PM)
Database Function: advance_nfl_week()
```

**What it does:**
- Increments `nfl_season_config.current_week` from N to N+1
- Updates week date ranges
- Creates `weekly_global_stats` entry for new week
- **Unlocks ALL players** so users can set lineups for next week

**Why it's a database function (not edge function):**
- Simpler and faster (no HTTP overhead)
- Called directly by cron
- Easier to debug and monitor
- No deployment needed - just SQL

**Why Tuesday 8:00 PM:**
- Gives users time to review Week N results
- Plenty of time before Thursday night game (Week N+1 starts)

### **Tuesday 8:05 PM** - Update Player Projections
```
Cron: 5 20 * * 2  (Tuesday at 8:05 PM)
Function: update-projections
```

**What it does:**
- Fetches latest player stats and season averages from BallDontLie API
- Calculates projected fantasy points for upcoming week
- Updates `weekly_projected_points` and `projected_points` fields
- Updates injury status and designations
- Sets `season_ppg` and `games_played_season` for reference
- Generates projection notes (injury impacts, usage trends, etc.)

**Why 5 minutes after advance-week:**
- Ensures week has been advanced before calculating new projections
- Fresh projections ready when users start setting Week N+1 lineups

### **Sunday 6:00 PM** - Refresh Projections (Pre-Games)
```
Cron: 0 18 * * 0  (Sunday at 6:00 PM)
Function: update-projections
```

**What it does:**
- Re-runs projection updates to catch any late-week stat changes
- Updates injury statuses from latest API data
- Ensures projections are fresh before games start

**Why Sunday 6:00 PM:**
- Runs before most Sunday games (1:00 PM ET start)
- Catches any practice report updates from Friday/Saturday
- Gives users latest data for last-minute lineup decisions

---

## Edge Functions vs Database Functions

### When to Use **Edge Functions** (Deno/TypeScript)
✅ Need to call external APIs (NFL data, etc.)
✅ Complex business logic that benefits from TypeScript
✅ Need structured error handling and logging
✅ HTTP endpoints that users/webhooks can call

**Examples:**
- `update-live-stats` - Calls ESPN/NFL API
- `update-projections` - Calls ESPN API for player data
- `open-pack` - User-initiated action via HTTP
- `lock-lineups` - Creates snapshots + locks players (complex logic)

### When to Use **Database Functions** (PL/pgSQL)
✅ Simple database operations (INSERT/UPDATE/DELETE)
✅ Data transformations within the database
✅ Called by cron directly (no HTTP needed)
✅ Performance-critical operations

**Examples:**
- `advance_nfl_week()` - Just updates config table
- `get_current_nfl_week()` - Simple SELECT query
- Triggers and stored procedures

---

## Current Cron Jobs

| Job Name | Schedule | What It Does | Type |
|----------|----------|--------------|------|
| `sync-nfl-live-stats` | `*/5 * * * 0,1,4` | Locks players + updates live game stats | Edge Function |
| `finalize-week-results` | `1 0 * * 2` | Calculates win/loss, updates records | Edge Function |
| `advance-to-next-week` | `0 20 * * 2` | Moves to next week, unlocks players | DB Function |
| `update-projections-after-advance` | `5 20 * * 2` | Updates player projections for new week | Edge Function |
| `update-projections-sunday-refresh` | `0 18 * * 0` | Pre-game projection refresh (catches injury updates) | Edge Function |

---

## Important Functions Reference

### Database Functions (PL/pgSQL)
```sql
-- Get current week info
SELECT * FROM get_current_nfl_week();

-- Manually advance week (normally done by cron)
SELECT * FROM advance_nfl_week();
```

### Edge Functions (Called via HTTP)
```bash
# Lock players whose games are starting
POST https://[PROJECT].supabase.co/functions/v1/lock-lineups

# Update live game stats
POST https://[PROJECT].supabase.co/functions/v1/update-live-stats

# Finalize completed week
POST https://[PROJECT].supabase.co/functions/v1/finalize-week

# Update player projections
POST https://[PROJECT].supabase.co/functions/v1/update-projections
```

---

## System Status

**✅ FULLY OPERATIONAL** as of November 17, 2025

- Fixed column ambiguity bug in `advance_nfl_week()` function
- System tested and working
- Currently on Week 11 (Nov 13-19, 2025)
- Next automatic advancement: Tuesday, Nov 19 at 8:00 PM

---

## How Player Locking Works

1. **Thursday 8:15 PM** - First game of Week N starts
   - Cron runs at 8:15, 8:20, 8:25... (every 5 min)
   - `lock-lineups` detects game starting within 2 minutes
   - Locks all players from teams playing (e.g., KC, BAL)
   - Creates lineup snapshots for teams without one

2. **Sunday 1:00 PM** - Most games start
   - `lock-lineups` locks all Sunday afternoon game players
   - Continues every 5 minutes through Sunday Night Football

3. **Monday 8:15 PM** - Monday Night Football
   - Locks remaining players whose games are starting

4. **Players stay locked** until Tuesday 8pm when week advances

---

## Troubleshooting

### Check current week
```sql
SELECT * FROM nfl_season_config WHERE is_active = true;
```

### View cron jobs
```sql
SELECT * FROM cron.job;
```

### Check cron job history
```sql
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

### Manually advance week (for testing)
```sql
SELECT * FROM advance_nfl_week();
```

### Check edge function logs
```sql
SELECT * FROM edge_function_logs 
ORDER BY created_at DESC 
LIMIT 20;
```

---

## Key Design Decisions

1. **Why unlock players on Tuesday, not immediately after finalization?**
   - Gives users time to review results
   - Clear separation: finalize Week N → advance to Week N+1

2. **Why lock entire bench, not just lineup?**
   - Prevents swapping live bench players into lineup mid-game
   - Ensures fairness - your Week N lineup is set once games start

3. **Why database function for advance_nfl_week?**
   - Simpler than edge function (just updates one table)
   - No external API calls needed
   - Faster and easier to debug

4. **Why create lineup snapshots at lock time?**
   - Captures the exact lineup + tokens when games start
   - Immutable record for scoring calculations
   - Prevents retroactive lineup changes
