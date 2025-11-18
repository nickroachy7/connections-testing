# Quick Start Guide - Week Automation

## ✅ System is Now Working Automatically

You don't need to do anything - the system will advance weeks automatically every Tuesday at 8pm.

---

## What You Need to Know

### Current Status
- **Week:** 11 (Nov 13-19, 2025)
- **Automation:** Fully operational
- **Next Advancement:** Tuesday, Nov 19 at 8:00 PM

### What Happens Automatically

**During Week (Thu-Mon)**
- Players lock when games start
- Stats update every 2 minutes during live games
- You can set lineups until games begin

**Tuesday 12:01 AM**
- Week results calculated
- Your record updated (wins/losses)

**Tuesday 8:00 PM**
- **Week advances automatically**
- All players unlock
- You can set next week's lineup

**Tuesday 8:05 PM**
- Player projections update for next week

---

## How to Check If It's Working

### In Your App
- Refresh the page
- Check the current week number at the top
- Should increment by 1 every Tuesday at 8pm

### In Database (Advanced)
```sql
SELECT current_week, updated_at 
FROM nfl_season_config 
WHERE is_active = true;
```

If `updated_at` is recent and `current_week` increased, it's working!

---

## What If It Doesn't Advance?

### Tuesday Night (after 8pm) - Week Didn't Advance

**Quick Fix:**
1. Go to Supabase SQL Editor
2. Run this command:
   ```sql
   SELECT * FROM advance_nfl_week();
   ```
3. Refresh your app

**What This Does:**
- Advances to next week
- Unlocks all players
- Creates stats for new week

### Check Why It Failed
```sql
-- See if the cron job ran
SELECT 
  j.jobname,
  jrd.start_time,
  jrd.status,
  jrd.return_message
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname = 'advance-to-next-week'
ORDER BY jrd.start_time DESC 
LIMIT 1;
```

---

## Key Things to Remember

1. **Don't manually change the week** unless automation fails
2. **Players lock when their game starts** - set lineups before kickoff
3. **Week advances Tuesday 8pm** - not immediately after Monday Night Football
4. **All cron jobs run automatically** - you don't need to trigger them

---

## Emergency Contacts

If automation completely breaks:

1. Check `AUTOMATION_STATUS.md` for detailed diagnostics
2. Run health check queries
3. Manually trigger functions if needed
4. Check cron job logs

---

## That's It!

The system now runs itself. Just set your lineups before Thursday and check back Tuesday night to see if you won or lost!
