# NFL Weekly Schedule - Quick Reference

## Visual Timeline

```
THURSDAY
├─ 8:15 PM → First game of Week N starts
│             🔒 lock-lineups runs every 5 min
│             📊 update-live-stats runs every 5 min
│
FRIDAY-SATURDAY
├─ Players locked, stats frozen
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

## Cron Jobs At-a-Glance

| Time | Day(s) | Job | Function Type | What Happens |
|------|--------|-----|---------------|--------------|
| Every 5 min | Sun, Mon, Thu | `sync-nfl-live-stats` | Edge | Lock players + update stats |
| 12:01 AM | Tuesday | `finalize-week-results` | Edge | Calculate week results |
| 8:00 PM | Tuesday | `advance-to-next-week` | **Database** | Move to next week |
| 8:05 PM | Tuesday | `update-projections-after-advance` | Edge | Update projections |

---

## Player Lock States

### During Week (Thu-Mon)
```
Player states change as games start:

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

## Testing Commands

### Check current week
```sql
SELECT * FROM nfl_season_config WHERE is_active = true;
```

### Manually advance week (testing only!)
```sql
SELECT * FROM advance_nfl_week();
```

### Check next scheduled cron runs
```sql
SELECT 
  jobname,
  schedule,
  active,
  cron.schedule_to_next_run(schedule) as next_run
FROM cron.job
ORDER BY next_run;
```

### View recent cron executions
```sql
SELECT 
  jobname,
  start_time,
  status,
  return_message
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

---

## Key Files

- **`WEEKLY_AUTOMATION_FLOW.md`** - Detailed explanation of entire flow
- **`EDGE_FUNCTIONS_GUIDE.md`** - Complete edge function documentation
- **`/supabase/functions/`** - All edge function code
- **`/supabase/migrations/`** - Database function definitions

---

## Emergency Procedures

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

## Week Advancement Checklist

✅ All Week N games marked as 'final'  
✅ `finalize-week` ran successfully (Tue 12:01 AM)  
✅ All teams have win/loss recorded  
✅ `advance_nfl_week()` ran successfully (Tue 8:00 PM)  
✅ `current_week` incremented in `nfl_season_config`  
✅ All players unlocked (`is_locked = false`)  
✅ `update-projections` ran successfully (Tue 8:05 PM)  
✅ Week N+1 projections updated  

---

## Contact & Support

For issues with automation:
1. Check `edge_function_logs` table
2. Check `cron.job_run_details` table
3. Review logs in Supabase Dashboard → Edge Functions
4. Check database logs in Supabase Dashboard → Logs → Postgres
