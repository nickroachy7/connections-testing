# Automation Status & Health Check

## ✅ System Status: FULLY OPERATIONAL

**Last Updated:** November 17, 2025 at 7:48 PM ET

---

## Current Week Status

```
Season: 2025
Current Week: 11
Week Range: Nov 13 - Nov 19, 2025
Players Locked: 0 (all unlocked)
Last Advancement: November 17, 2025 (manual fix)
```

---

## 🔧 What Was Fixed

### The Problem
- **Week advancement was broken since Nov 4th**
- System stuck on Week 10 for 13 days
- Database function `advance_nfl_week()` had a PostgreSQL column name conflict
- Cron jobs were configured but function never executed successfully

### The Solution
1. ✅ Fixed column ambiguity in `advance_nfl_week()` function
2. ✅ Manually advanced from Week 10 → Week 11
3. ✅ Verified all players unlocked (80/80 unlocked)
4. ✅ Created `weekly_global_stats` entry for Week 11
5. ✅ Tested function - now works perfectly

### Root Cause
PostgreSQL variable naming conflict:
- RETURN TABLE had `season_year` column
- Function had `v_season_year` variable
- INSERT statement referenced `season_year` which was ambiguous
- **Fix:** Fully qualified table column names and used explicit variables

---

## 📅 Automated Schedule (Cron Jobs)

All cron jobs are **ACTIVE** and will run automatically:

### During Week (Sun-Thu)
| Job | Schedule | Next Run* | Function |
|-----|----------|-----------|----------|
| `lock-lineups` | Every 5 min on Sun/Mon/Thu | Next game day | Lock players when games start |
| `update-live-stats-working` | Every 2 min on Sun/Mon/Thu | Next game day | Update scores/stats live |
| `calculate-global-average-optimized` | Every 10 min on Sun/Mon/Thu | Next game day | Calculate league averages |
| `fix-live-game-status` | Every 30 sec (always) | Continuous | Fix game status issues |
| `sync-active-players` | Daily at 8 AM | Nov 18, 8:00 AM | Sync active rosters |
| `update-projections-daily` | Daily at 6 AM | Nov 18, 6:00 AM | Update projections |

### Week Transition (Tuesday)
| Job | Schedule | Next Run | Function |
|-----|----------|----------|----------|
| `finalize-week-results` | Tue 12:01 AM | Nov 19, 12:01 AM | Calculate week 11 results |
| `advance-to-next-week` | Tue 8:00 PM | Nov 19, 8:00 PM | **Advance to Week 12** |
| `update-projections-after-advance` | Tue 8:05 PM | Nov 19, 8:05 PM | Update Week 12 projections |

*Dates are relative to current week 11 (Nov 13-19, 2025)

---

## 🎯 What Happens Next

### **This Week (Week 11)**

**Today - Thursday, Nov 17**
- Games are ongoing or about to start
- Players should start getting locked as games begin
- Live stats will update every 2 minutes

**Sunday, Nov 17 - Monday, Nov 18**
- Most games happen
- `lock-lineups` runs every 5 min → locks players whose games are starting
- `update-live-stats` runs every 2 min → updates scores/fantasy points
- Your lineup snapshot will be created when first player's game starts

**Tuesday, Nov 19 at 12:01 AM**
- `finalize-week-results` runs
- Calculates global average for Week 11
- Determines if you beat average (win) or below (loss)
- Updates your team record

**Tuesday, Nov 19 at 8:00 PM**
- `advance-to-next-week` runs
- **Advances to Week 12 automatically**
- Unlocks all players
- Creates Week 12 stats entries

**Tuesday, Nov 19 at 8:05 PM**
- `update-projections-after-advance` runs
- Updates all player projections for Week 12
- You can start setting your Week 12 lineup

---

## 🔍 How to Monitor

### Check Current Week
```sql
SELECT 
  current_week,
  season_year,
  week_start_date,
  week_end_date,
  updated_at
FROM nfl_season_config
WHERE is_active = true;
```

### Check If Automation Ran
```sql
-- Check recent cron job executions
SELECT 
  j.jobname,
  jrd.start_time,
  jrd.end_time,
  jrd.status,
  jrd.return_message
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE jrd.start_time > NOW() - INTERVAL '1 day'
ORDER BY jrd.start_time DESC
LIMIT 20;
```

### Check Player Lock Status
```sql
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN is_locked THEN 1 ELSE 0 END) as locked,
  SUM(CASE WHEN NOT is_locked THEN 1 ELSE 0 END) as unlocked
FROM user_player_inventory;
```

### Test Week Advancement (DO NOT RUN IN PRODUCTION!)
```sql
-- This will advance the week - only use for testing!
SELECT * FROM advance_nfl_week();
```

---

## ⚠️ What To Watch For

### Week Doesn't Advance on Tuesday 8pm
1. Check cron job ran:
   ```sql
   SELECT * FROM cron.job_run_details jrd
   JOIN cron.job j ON j.jobid = jrd.jobid
   WHERE j.jobname = 'advance-to-next-week'
   ORDER BY start_time DESC LIMIT 1;
   ```

2. If it didn't run or failed, manually advance:
   ```sql
   SELECT * FROM advance_nfl_week();
   ```

### Players Don't Lock During Games
1. Check if `lock-lineups` is running:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'lock-lineups';
   ```

2. Check execution logs:
   ```sql
   SELECT * FROM edge_function_logs
   WHERE function_name = 'lock-lineups'
   ORDER BY created_at DESC LIMIT 5;
   ```

### Stats Don't Update During Games
1. Check `update-live-stats-working` is running every 2 min
2. Check edge function logs for errors
3. Verify ESPN API is responding (external dependency)

---

## 🚀 Manual Triggers (For Testing/Emergency)

### Manually Advance Week
```sql
SELECT * FROM advance_nfl_week();
-- Returns: old_week, new_week, season_year
```

### Manually Lock Lineups
```bash
curl -X POST https://zgxzxfjlpnrdvtjekncg.supabase.co/functions/v1/lock-lineups \
  -H "Authorization: Bearer [YOUR_ANON_KEY]" \
  -H "Content-Type: application/json"
```

### Manually Finalize Week
```bash
curl -X POST https://zgxzxfjlpnrdvtjekncg.supabase.co/functions/v1/finalize-week \
  -H "Authorization: Bearer [YOUR_ANON_KEY]" \
  -H "Content-Type: application/json"
```

### Manually Update Projections
```bash
curl -X POST https://zgxzxfjlpnrdvtjekncg.supabase.co/functions/v1/update-projections \
  -H "Authorization: Bearer [YOUR_ANON_KEY]" \
  -H "Content-Type: application/json"
```

---

## 📊 Health Check Queries

Run these periodically to ensure system health:

```sql
-- System Overview
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
  'Active Teams',
  COUNT(*)::text
FROM teams WHERE is_active = true
UNION ALL
SELECT 
  'Pending Lineups',
  COUNT(*)::text
FROM weekly_lineups WHERE status = 'pending';

-- Recent Cron Job Success Rate (last 24 hours)
SELECT 
  j.jobname,
  COUNT(*) as executions,
  SUM(CASE WHEN jrd.status = 'succeeded' THEN 1 ELSE 0 END) as successes,
  SUM(CASE WHEN jrd.status != 'succeeded' THEN 1 ELSE 0 END) as failures
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE jrd.start_time > NOW() - INTERVAL '24 hours'
GROUP BY j.jobname
ORDER BY executions DESC;

-- Games This Week
SELECT 
  game_id,
  home_team,
  away_team,
  game_start_time,
  game_status
FROM game_scores
WHERE week_number = (SELECT current_week FROM nfl_season_config WHERE is_active = true)
  AND season_year = 2025
ORDER BY game_start_time;
```

---

## ✅ Verification Checklist

After week advancement, verify:
- [ ] `current_week` incremented in `nfl_season_config`
- [ ] `updated_at` timestamp is recent
- [ ] All players unlocked (`is_locked = false`)
- [ ] New `weekly_global_stats` entry created
- [ ] Previous week's lineups are finalized
- [ ] Cron job logged successful execution

---

## 🎓 Key Learnings

1. **Database functions > Edge functions for simple operations**
   - Faster, cheaper, more reliable
   - No HTTP overhead or deployment needed

2. **Always test with real data**
   - The function worked in isolation but failed with column conflicts
   - Load testing would have caught this earlier

3. **Monitoring is critical**
   - Cron jobs can fail silently
   - Need alerts for failed executions

4. **Variable naming matters in PL/pgSQL**
   - RETURN TABLE columns create implicit variables
   - Always use explicit variable names with prefixes (v_)

---

## 📚 Related Documentation

- **`WEEKLY_AUTOMATION_FLOW.md`** - Complete flow explanation
- **`EDGE_FUNCTIONS_GUIDE.md`** - All edge functions documented
- **`WEEKLY_SCHEDULE.md`** - Quick reference timeline
- **`SYSTEM_ARCHITECTURE.md`** - Data flow and table relationships

---

## 🔮 Future Improvements

- [ ] Add Slack/email alerts for failed cron jobs
- [ ] Create admin dashboard to view automation status
- [ ] Add retry logic for failed edge functions
- [ ] Implement week advancement validation (all games must be final)
- [ ] Add rollback capability for week advancement
- [ ] Create automated health checks that run daily
