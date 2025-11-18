# Fantasy Football Automation Guide

## 🔄 Automated Weekly Workflow

All processes are now **fully automated** via Supabase Edge Functions and cron jobs.

### Timeline Overview

```
Thursday Evening → Sunday/Monday
├─ Games start throughout the week
├─ Players lock when their game goes live
├─ Live stats update every 2 minutes
└─ Final stats calculated when games end

Tuesday 12:01 AM
├─ Week finalization runs
├─ Wins/losses calculated vs global average
├─ Team records updated
└─ Week remains ACTIVE (no advancement yet)

Tuesday 8:00 PM
├─ Week advances to next week
├─ All players unlock
├─ Users can now edit lineups
└─ Projections update 5 minutes later
```

---

## 📋 Automated Processes

### 1️⃣ **Player Locking** (When Games Go Live)
- **Function**: `lock-lineups`
- **Schedule**: Every 5 minutes on Sun/Mon/Thu
- **What it does**:
  - Checks for games starting within 2 minutes
  - Locks ALL players (lineup + bench) from teams with live games
  - Creates weekly lineup snapshots if not exists
  - Prevents lineup changes during live games

### 2️⃣ **Live Stats Updates** (During Games)
- **Function**: `update-live-stats`
- **Schedule**: Every 2 minutes on Sun/Mon/Thu
- **What it does**:
  - Fetches live game scores from Ball Don't Lie API
  - Updates player stats in real-time
  - Calculates fantasy points with scoring rules
  - Applies card tier multipliers
  - Evaluates token bonuses
  - Awards XP to players
  - Updates lineup totals continuously

**Fantasy Scoring Rules**:
```typescript
passing_yards: 0.04 pts  // 1 pt per 25 yards
passing_tds: 4 pts
interceptions: -2 pts
rushing_yards: 0.1 pts   // 1 pt per 10 yards
rushing_tds: 6 pts
receptions: 1 pt         // PPR
receiving_yards: 0.1 pts // 1 pt per 10 yards
receiving_tds: 6 pts
fumbles_lost: -2 pts
two_point_conversions: 2 pts
```

**Card Tier Multipliers**:
- Base: 1.0x
- Role Player: 1.1x
- Starter: 1.2x
- All-Star: 1.3x
- Elite: 1.5x

### 3️⃣ **Week Finalization** (Tuesday 12:01 AM)
- **Function**: `finalize-week`
- **Schedule**: Tuesday at 12:01 AM (after Monday Night Football)
- **What it does**:
  - Calculates global average score for the week
  - Compares each team's score to average
  - Awards Win/Loss based on performance
  - Updates team records
  - Marks lineups as 'finalized'
  - Checks for team elimination (3 losses)
  - **Does NOT advance week** (players stay locked)

### 4️⃣ **Week Advancement** (Tuesday 8:00 PM)
- **Function**: `advance-week`
- **Schedule**: Tuesday at 8:00 PM
- **What it does**:
  - Advances to next NFL week
  - **Unlocks ALL players** for lineup changes
  - Creates new weekly config
  - Initializes new weekly stats entry
  - Returns old/new week numbers

### 5️⃣ **Projection Updates**
- **Functions**: `update-projections`
- **Schedules**: 
  - Tuesday at 8:05 PM (after week advance)
  - Daily at 6:00 AM (for consistency)
- **What it does**:
  - Fetches fresh player projections
  - Updates for current week
  - Ensures users see accurate data

### 6️⃣ **Global Average Calculation**
- **Function**: `calculate-global-average`
- **Schedule**: Every 10 minutes on Sun/Mon/Thu
- **What it does**:
  - Recalculates average score as games complete
  - Updates weekly_global_stats table
  - Used for win/loss determination

---

## 🎮 User Experience Flow

### Thursday - Sunday
1. User sets their lineup
2. When player's game starts → **Player locks automatically**
3. Live stats appear during game
4. Final stats show when game ends
5. User sees updated fantasy points with bonuses

### Monday Night
1. Last game of the week completes
2. All final stats are calculated
3. User sees total points but week hasn't finalized yet

### Tuesday Morning (12:01 AM)
1. **Automatic finalization** runs
2. User sees:
   - Their final score
   - Global average
   - Win or Loss result
   - Updated record (W-L)
3. **Week number stays the same**
4. **Players remain locked** (no lineup changes allowed)

### Tuesday Evening (8:00 PM)
1. **Week advances automatically**
2. User sees:
   - New week number
   - **All players unlocked**
   - Fresh projections for next week
   - Ability to edit lineup
3. Cycle repeats!

---

## 🛠️ Database Functions

### `get_current_nfl_week()`
Returns the active week configuration:
```sql
SELECT season_year, current_week 
FROM nfl_season_config 
WHERE is_active = TRUE
```

### `advance_nfl_week()`
Advances to the next week:
1. Deactivates current week config
2. Creates new config for next week
3. **Unlocks all players** (sets is_locked = false)
4. Creates weekly_global_stats entry
5. Returns old_week, new_week, season_year

---

## 📊 Active Cron Jobs

| Job Name | Schedule | Function | Purpose |
|----------|----------|----------|---------|
| `lock-lineups` | `*/5 * * * 0,1,4` | Every 5 min (Sun/Mon/Thu) | Lock players when games start |
| `update-live-stats-working` | `*/2 * * * 0,1,4` | Every 2 min (Sun/Mon/Thu) | Update live game stats |
| `calculate-global-average-optimized` | `*/10 * * * 0,1,4` | Every 10 min (Sun/Mon/Thu) | Update global average |
| `finalize-week-results` | `1 0 * * 2` | Tue 12:01 AM | Finalize week, assign W/L |
| `advance-to-next-week` | `0 20 * * 2` | Tue 8:00 PM | Advance to next week |
| `update-projections-after-advance` | `5 20 * * 2` | Tue 8:05 PM | Update projections |
| `update-projections-daily` | `0 6 * * *` | Daily 6:00 AM | Daily projection refresh |
| `sync-active-players` | `0 8 * * *` | Daily 8:00 AM | Sync player data |

---

## ✅ Verification Checklist

- [x] Players lock when games go live
- [x] Live stats update every 2 minutes during games
- [x] Final fantasy points calculated with tier multipliers
- [x] Token bonuses evaluated and applied
- [x] Week finalizes Tuesday 12:01 AM
- [x] Wins/losses assigned based on global average
- [x] Week advances Tuesday 8:00 PM
- [x] All players unlock on week advancement
- [x] Projections update after week advance
- [x] Everything runs automatically via cron jobs

---

## 🔍 Monitoring

### Check Cron Job Status
```sql
SELECT jobname, schedule, active 
FROM cron.job 
ORDER BY jobname;
```

### Check Cron Job History
```sql
SELECT * 
FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 20;
```

### Check Current Week
```sql
SELECT * FROM get_current_nfl_week();
```

### Manual Triggers (for testing)
```bash
# Trigger lock-lineups
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/lock-lineups \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Trigger update-live-stats
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/update-live-stats \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Trigger finalize-week
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/finalize-week \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Trigger advance-week
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/advance-week \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

## 🚨 Important Notes

1. **Ball Don't Lie API Key** must be set as environment variable `BALLDONTLIE_API_KEY`
2. **Supabase Service Role Key** must be available for edge functions
3. **Vault secrets** (`project_url`, `anon_key`) must be configured for cron jobs
4. Players remain locked from game start until Tuesday 8pm
5. Week finalization (12:01 AM) and advancement (8:00 PM) are separate processes
6. Global average is calculated continuously during game days

---

## 📝 Edge Function Locations

- `/supabase/functions/lock-lineups/index.ts`
- `/supabase/functions/update-live-stats/index.ts`
- `/supabase/functions/finalize-week/index.ts`
- `/supabase/functions/advance-week/index.ts`
- `/supabase/functions/update-projections/index.ts`
- `/supabase/functions/calculate-global-average/index.ts`

All functions are deployed and active in Supabase.
