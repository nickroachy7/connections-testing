# Projection Updates - Setup Complete ✅

## What Was Done

### 1. **Ran Initial Projection Update** ✅
- Successfully updated **900 players** with current week projections
- All players now have `weekly_projected_points` populated
- Season averages and games played are current

### 2. **Automated Cron Schedule Created** ✅
Two automatic update schedules:

**Tuesday 8:05 PM** (After week advancement)
- Calculates fresh projections for the new week
- Updates all player stats from BallDontLie API
- Runs 5 minutes after the week advances

**Sunday 6:00 PM** (Pre-game refresh)
- Re-runs projections before games start
- Catches late injury updates and practice reports
- Ensures data is fresh for user lineup decisions

### 3. **Migration Files Created** ✅
- `20251117_setup_projections_cron.sql` - Automated cron schedules
- `20251117_projection_trigger_helper.sql` - Manual trigger function

---

## How to Manually Trigger Updates

### Option 1: Via API (Recommended for Testing)
```bash
curl -X POST \
  "YOUR_SUPABASE_URL/functions/v1/update-projections" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Option 2: Via SQL (In Supabase Dashboard)
```sql
SELECT trigger_projection_update();
```

### Option 3: Via Terminal (From Project Root)
```bash
curl -X POST \
  "$(grep SUPABASE_URL .env | cut -d '=' -f2)/functions/v1/update-projections" \
  -H "Authorization: Bearer $(grep SUPABASE_ANON_KEY .env | cut -d '=' -f2)"
```

---

## Verification

### Check Projection Data
```sql
-- View players with projections
SELECT 
  player_name,
  position,
  team_abbreviation,
  weekly_projected_points,
  season_ppg,
  games_played_season,
  injury_status,
  last_projection_update
FROM player_cards
WHERE is_active = true
  AND position IN ('Quarterback', 'Running Back', 'Wide Receiver', 'Tight End')
ORDER BY weekly_projected_points DESC NULLS LAST
LIMIT 20;
```

### Check Cron Status
```sql
-- View scheduled jobs
SELECT * FROM cron.job 
WHERE jobname LIKE '%projection%';

-- View recent runs
SELECT * FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%projection%')
ORDER BY start_time DESC 
LIMIT 10;
```

---

## Current Status

✅ **Projections Populated**: 900 players updated for Week 11
✅ **Cron Jobs Scheduled**: Auto-updates every Tuesday & Sunday
✅ **Manual Trigger Available**: Can force update anytime via SQL function

---

## Schedule Summary

| Day | Time | Action | Purpose |
|-----|------|--------|---------|
| **Tuesday** | 8:05 PM | Update projections | New week prep after advancement |
| **Sunday** | 6:00 PM | Refresh projections | Pre-game update with latest injury data |

Both run automatically - no manual intervention needed!

---

## Next Steps

1. **Apply the migration** (if using Supabase CLI):
   ```bash
   supabase db push
   ```

2. **Or run in SQL Editor** (if using dashboard):
   - Open `supabase/migrations/20251117_setup_projections_cron.sql`
   - Copy content to Supabase SQL Editor
   - Execute

3. **Verify in your app**:
   - Visit `/nfl` page
   - Check that players show projected points
   - No more "Proj: 0.0 pts" or "No projection"

---

## Troubleshooting

### Projections showing 0.0
```sql
-- Force immediate update
SELECT trigger_projection_update();
```

### Check last update time
```sql
SELECT 
  COUNT(*) as total_players,
  COUNT(*) FILTER (WHERE weekly_projected_points > 0) as players_with_projections,
  MAX(last_projection_update) as most_recent_update
FROM player_cards
WHERE is_active = true;
```

### Disable auto-updates (if needed)
```sql
SELECT cron.unschedule('update-projections-after-advance');
SELECT cron.unschedule('update-projections-sunday-refresh');
```

### Re-enable auto-updates
```sql
-- Just re-run the migration file
-- OR use the cron.schedule commands from the migration
```

---

## API Response Example

When successful, you'll see:
```json
{
  "success": true,
  "message": "Updated 900 players",
  "total_players": 900,
  "api_calls": 36,
  "successful_calls": 36,
  "fallback_count": 0,
  "season": 2025,
  "week": 11
}
```

The function:
- Fetches data from BallDontLie API in batches of 25
- Calculates season averages and projections
- Updates all relevant fields in `player_cards` table
- Returns summary of what was updated
