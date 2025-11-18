# Weekly Automation System

Complete guide to the automated weekly workflow, cron jobs, and edge functions.

---

## 🔄 Weekly Timeline

### Visual Flow
```
THURSDAY
├─ 8:15 PM → First game of Week N starts
│             🔒 lock-lineups runs every 5 min
│             📊 update-live-stats runs every 5 min
│
SUNDAY
├─ 1:00 PM → Most games start
│             🔒 lock-lineups locks Sunday players
│             📊 update-live-stats updates live
│
├─ 8:20 PM → Sunday Night Football
│             🔒 lock-lineups locks SNF players
│             📊 update-live-stats continues
│
MONDAY
├─ 8:15 PM → Monday Night Football
│             🔒 lock-lineups locks MNF players
│             📊 update-live-stats final updates
│
TUESDAY
├─ 12:01 AM → Week N complete
│              ✅ finalize-week calculates results
│              • Determines win/loss for each team
│              • Updates team records
│              • Marks eliminations
│
├─ 8:00 PM → Advance to Week N+1
│             ⏭️  advance_nfl_week() (DB function)
│             • Increments current_week
│             • Unlocks all players
│
├─ 8:05 PM → Fresh projections
│             📈 update-projections
│             • Calculates projections for Week N+1
│             • Updates injury status
│
WEDNESDAY
└─ Users set lineups for Week N+1
   All players unlocked and ready
```

---

## 📋 Active Cron Jobs

| Job Name | Schedule | Function | Type | Purpose |
|----------|----------|----------|------|---------|
| `sync-nfl-live-stats` | `*/5 * * * 0,1,4` | `lock-lineups` + `update-live-stats` | Edge | Lock players + update stats |
| `finalize-week-results` | `1 0 * * 2` | `finalize-week` | Edge | Calculate week results |
| `advance-to-next-week` | `0 20 * * 2` | `advance_nfl_week()` | **Database** | Move to next week |
| `update-projections-after-advance` | `5 20 * * 2` | `update-projections` | Edge | Update projections |
| `update-projections-sunday-refresh` | `0 18 * * 0` | `update-projections` | Edge | Pre-game refresh |

### Cron Schedule Syntax
- `*/5 * * * 0,1,4` = Every 5 minutes on Sunday (0), Monday (1), Thursday (4)
- `1 0 * * 2` = 12:01 AM on Tuesday
- `0 20 * * 2` = 8:00 PM on Tuesday
- `5 20 * * 2` = 8:05 PM on Tuesday
- `0 18 * * 0` = 6:00 PM on Sunday

---

## 🎮 Automated Processes

### 1. Player Locking (`lock-lineups`)
**Schedule:** Every 5 minutes on Sun/Mon/Thu  
**Function Type:** Edge Function

**What it does:**
- Checks for games starting within next 2 minutes
- Locks ALL players (lineup + bench) from teams with games starting
- Creates weekly lineup snapshots if they don't exist
- Prevents lineup changes once games begin

**Why lock entire bench?**
- Prevents swapping live bench players into lineup mid-game
- Ensures fairness - your Week N lineup is set once games start

**Code Reference:** `/supabase/functions/lock-lineups/index.ts`

---

### 2. Live Stats Updates (`update-live-stats`)
**Schedule:** Every 5 minutes on Sun/Mon/Thu (runs after lock-lineups)  
**Function Type:** Edge Function

**What it does:**
- Fetches live game scores from BallDontLie API
- Updates `game_scores` table with current scores/status
- Updates `player_game_stats` with individual performance
- Calculates fantasy points based on scoring rules
- Applies card tier multipliers
- Evaluates token bonuses
- Awards XP to players
- Updates lineup totals

**Fantasy Scoring (Base Rules):**
```javascript
passing_yards: 0.04 pts    // 1 pt per 25 yards
passing_tds: 4 pts
interceptions: -2 pts
rushing_yards: 0.1 pts     // 1 pt per 10 yards
rushing_tds: 6 pts
receptions: varies by PPR  // 0, 0.5, or 1.0
receiving_yards: 0.1 pts   // 1 pt per 10 yards
receiving_tds: 6 pts
fumbles_lost: -2 pts
two_point_conversions: 2 pts
```

**PPR Multipliers (Contest Type Dependent):**
- Standard PPR: 0.0 points per reception
- Half PPR: 0.5 points per reception
- Full PPR: 1.0 points per reception

**Card Tier Multipliers:**
- Base: 1.0x
- Role Player: 1.1x
- Starter: 1.2x
- All-Star: 1.3x
- Elite: 1.5x

**Code Reference:** `/supabase/functions/update-live-stats/index.ts`

---

### 3. Week Finalization (`finalize-week`)
**Schedule:** Tuesday at 12:01 AM  
**Function Type:** Edge Function

**What it does:**
1. Fetches all `weekly_lineups` with status='pending' for completed week
2. Calculates global average score across all teams
3. Determines win/loss for each team (beat average = win, below = loss)
4. Updates team records (wins/losses)
5. Marks teams as eliminated if they hit loss limit
6. Sets lineup status to 'finalized'
7. Logs transactions for each team's result

**Win/Loss Logic:**
```javascript
const globalAverage = totalPoints / weeklyLineups.length
const beatAverage = lineup.total_points >= globalAverage
const result = beatAverage ? 'win' : 'loss'
const isEliminated = newLosses >= team.contest_type.max_losses
```

**Why Tuesday 12:01 AM?**
- All Week N games complete (including Monday Night Football)
- Results can be safely calculated without risk of ongoing games

**Code Reference:** `/supabase/functions/finalize-week/index.ts`

---

### 4. Week Advancement (`advance_nfl_week()`)
**Schedule:** Tuesday at 8:00 PM  
**Function Type:** Database Function (PL/pgSQL)

**What it does:**
- Deactivates current week config
- Creates new config for next week
- Increments `current_week` from N to N+1
- **Unlocks ALL players** (sets `is_locked = false`)
- Creates `weekly_global_stats` entry for new week
- Returns old_week, new_week, season_year

**Why it's a database function (not edge function)?**
- Simpler and faster (no HTTP overhead)
- No external API calls needed
- Easier to debug and monitor
- Called directly by cron via SQL

**Why Tuesday 8:00 PM?**
- Gives users time to review Week N results
- Plenty of time before Thursday night game (Week N+1 starts)

**Code Reference:** See migrations for `advance_nfl_week()` function

---

### 5. Projection Updates (`update-projections`)
**Schedule:** 
- Tuesday at 8:05 PM (after week advance)
- Sunday at 6:00 PM (pre-game refresh)

**Function Type:** Edge Function

**What it does:**
- Fetches latest player stats from BallDontLie API
- Calculates season averages and trends
- Projects fantasy points for upcoming week
- Updates injury status and designations
- Generates projection notes (injury impacts, usage trends)
- Sets `season_ppg` and `games_played_season`

**Why 5 minutes after advance-week?**
- Ensures week has been advanced before calculating projections
- Fresh projections ready when users start setting lineups

**Why Sunday 6:00 PM refresh?**
- Catches late-week stat changes and injury updates
- Runs before most Sunday games start
- Gives users latest data for last-minute decisions

**Code Reference:** `/supabase/functions/update-projections/index.ts`

---

## 🛠️ Edge Functions vs Database Functions

### Use Edge Functions When:
✅ Need to call external APIs (BallDontLie, etc.)  
✅ Complex business logic benefits from TypeScript  
✅ User-initiated actions via HTTP endpoints  
✅ Structured error handling and logging needed  
✅ Multiple async operations need orchestration

**Examples:**
- `update-live-stats` - Calls BallDontLie API
- `update-projections` - Calls BallDontLie API
- `open-pack` - User-initiated via HTTP
- `lock-lineups` - Complex logic + snapshots

### Use Database Functions When:
✅ Simple database operations (INSERT/UPDATE/DELETE)  
✅ Data transformations within the database  
✅ Called by cron directly (no HTTP needed)  
✅ Performance-critical operations

**Examples:**
- `advance_nfl_week()` - Just updates config table
- `get_current_nfl_week()` - Simple SELECT query
- Triggers and stored procedures

---

## 🔍 Monitoring & Debugging

### Check Current Week
```sql
SELECT * FROM nfl_season_config WHERE is_active = true;
```

### Check Cron Job Status
```sql
SELECT 
  jobname,
  schedule,
  active,
  command
FROM cron.job 
ORDER BY jobname;
```

### Check Cron Job History
```sql
SELECT 
  j.jobname,
  jrd.start_time,
  jrd.end_time,
  jrd.status,
  jrd.return_message
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
ORDER BY jrd.start_time DESC 
LIMIT 20;
```

### Check Edge Function Logs
```sql
SELECT * FROM edge_function_logs 
ORDER BY created_at DESC 
LIMIT 20;
```

### Manual Triggers (for testing)
```bash
# Lock lineups
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/lock-lineups \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Update live stats
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/update-live-stats \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Finalize week
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/finalize-week \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Update projections
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/update-projections \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Manually Advance Week (SQL)
```sql
SELECT * FROM advance_nfl_week();
```

---

## 🎯 Player Lock States

### During Week (Thu-Mon)
```
UNLOCKED → User can move player in/out of lineup
   ↓
[Game starts in < 2 min]
   ↓
LOCKED → Player frozen in current position (lineup or bench)
```

### Tuesday Night (8:00 PM)
```
ALL players unlocked for next week

LOCKED → UNLOCKED
```

---

## 🆘 Emergency Procedures

### If week didn't advance automatically
```sql
-- 1. Check if cron job ran
SELECT * FROM cron.job_run_details 
WHERE jobname = 'advance-to-next-week'
ORDER BY start_time DESC LIMIT 1;

-- 2. If it didn't run or failed, manually advance
SELECT * FROM advance_nfl_week();
```

### If players didn't unlock
```sql
-- Manually unlock all players
UPDATE user_player_inventory
SET is_locked = FALSE
WHERE is_locked = TRUE;
```

### If week results weren't finalized
```bash
# Manually trigger finalize-week edge function
curl -X POST https://[PROJECT].supabase.co/functions/v1/finalize-week \
  -H "Authorization: Bearer [ANON_KEY]"
```

---

## ✅ Week Advancement Checklist

Before considering week successfully advanced:

- [ ] All Week N games marked as 'final' in `game_scores`
- [ ] `finalize-week` ran successfully (Tue 12:01 AM)
- [ ] All teams have win/loss recorded in `weekly_lineups`
- [ ] Team records updated in `teams` table
- [ ] `advance_nfl_week()` ran successfully (Tue 8:00 PM)
- [ ] `current_week` incremented in `nfl_season_config`
- [ ] All players unlocked (`is_locked = false` in `user_player_inventory`)
- [ ] `update-projections` ran successfully (Tue 8:05 PM)
- [ ] Week N+1 projections updated in `player_cards`

---

## 🎓 Key Design Decisions

### Why unlock players on Tuesday, not immediately after finalization?
- Gives users time to review results
- Clear separation: finalize Week N → advance to Week N+1
- Prevents confusion about which week is active

### Why lock entire bench, not just lineup?
- Prevents swapping live bench players into lineup mid-game
- Ensures fairness - your Week N lineup is set once games start
- Immutable record for scoring calculations

### Why database function for advance_nfl_week?
- Simpler than edge function (just updates one table)
- No external API calls needed
- Faster and easier to debug
- No deployment needed - just SQL

### Why create lineup snapshots at lock time?
- Captures exact lineup + tokens when games start
- Immutable record for scoring calculations
- Prevents retroactive lineup changes
- Historical record for user review

---

## 📊 System Status

**✅ FULLY OPERATIONAL** as of November 18, 2025

- All cron jobs active and running
- Edge functions deployed and tested
- Database functions working correctly
- Player locking automated
- Live stats updating every 2 minutes during games
- Week finalization and advancement automated
- Projections updating regularly

---

## 📚 Related Documentation

- **Edge Function Details:** `EDGE_FUNCTIONS_GUIDE.md`
- **System Architecture:** `../SYSTEM_ARCHITECTURE.md`
- **Gameplay Flow:** `../GAMEPLAY_FLOW.md`
- **Projection System:** `../PROJECTION_SYSTEM.md`
