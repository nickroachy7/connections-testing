# Week Advancement Cron Jobs - Setup Instructions

## ✅ What I Created

1. **Migration File**: `supabase/migrations/20251118_setup_week_advancement_crons.sql`
   - Sets up `finalize-week-results` cron job (Tuesday 12:01 AM)
   - Sets up `advance-to-next-week` cron job (Tuesday 8:00 PM)
   - Uses your actual Supabase URL and anon key

## 🚀 How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of `supabase/migrations/20251118_setup_week_advancement_crons.sql`
6. Click **Run**

### Option 2: Supabase CLI
```bash
supabase db push
```

## 📋 Verification Steps

After running the migration, verify the cron jobs were created:

### Check Cron Jobs Exist
```sql
SELECT 
  jobname,
  schedule,
  active,
  command
FROM cron.job 
WHERE jobname IN ('finalize-week-results', 'advance-to-next-week')
ORDER BY jobname;
```

**Expected Output:**
- `finalize-week-results` → Schedule: `1 0 * * 2` → Active: `true`
- `advance-to-next-week` → Schedule: `0 20 * * 2` → Active: `true`

### Check Recent Execution History
```sql
SELECT 
  j.jobname,
  jrd.start_time,
  jrd.end_time,
  jrd.status,
  jrd.return_message
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname IN ('finalize-week-results', 'advance-to-next-week')
ORDER BY jrd.start_time DESC 
LIMIT 10;
```

## 📅 What Happens Next

### **Tonight/Tomorrow Morning (Tuesday, Nov 19 at 12:01 AM)**
✅ `finalize-week-results` runs
- Calculates global average for Week 11
- Compares each team's score to average
- Awards Win/Loss based on performance
- Updates team records
- Checks for eliminations

### **Tomorrow Evening (Tuesday, Nov 19 at 8:00 PM)**
✅ `advance-to-next-week` runs
- Increments `nfl_season_config.current_week` from 11 → 12
- Updates week date ranges
- Creates `weekly_global_stats` entry for Week 12
- **Unlocks ALL players** so users can edit lineups

## 🔧 Manual Testing (Optional)

If you want to test the functions manually:

### Test Week Advancement
```sql
SELECT * FROM advance_nfl_week();
```

### Test Finalize Week (via edge function)
```bash
curl -X POST https://zgxzxfjlpnrdvtjekncg.supabase.co/functions/v1/finalize-week \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpneHp4ZmpscG5yZHZ0amVrbmNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODg2MjEsImV4cCI6MjA3NzE2NDYyMX0.J_90pcGgZV2nwGDmIilc9FiX0lAVg4E__Z7xN94g-jo"
```

## 📊 Monitoring

After Tuesday, check if the jobs ran:

```sql
-- Check last 5 executions
SELECT 
  j.jobname,
  jrd.start_time,
  jrd.status,
  LEFT(jrd.return_message, 100) as message
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname IN ('finalize-week-results', 'advance-to-next-week')
ORDER BY jrd.start_time DESC 
LIMIT 5;
```

## 🆘 Troubleshooting

### If jobs don't run:

1. **Check if jobs are active:**
   ```sql
   SELECT jobname, active FROM cron.job 
   WHERE jobname IN ('finalize-week-results', 'advance-to-next-week');
   ```

2. **Check for errors:**
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE status = 'failed' 
   ORDER BY start_time DESC LIMIT 5;
   ```

3. **Manually trigger week advancement:**
   ```sql
   SELECT * FROM advance_nfl_week();
   ```

## ✅ Success Criteria

After Tuesday Nov 19, 8:00 PM, you should see:
- [ ] `nfl_season_config.current_week` = 12
- [ ] All players unlocked (`is_locked = false`)
- [ ] `weekly_global_stats` entry exists for Week 12
- [ ] Week 11 results finalized in `weekly_lineups`
- [ ] Team win/loss records updated

---

**Everything is ready! Just run the migration in Supabase SQL Editor.**
