# Edge Functions Guide

## Active Edge Functions

These are the currently deployed and active edge functions. Each serves a specific purpose in the game's weekly automation flow.

---

### 1. `lock-lineups`

**Purpose:** Lock players whose games are starting and create lineup snapshots

**Schedule:** Every 5 minutes on Sunday, Monday, Thursday
```
Cron: */5 * * * 0,1,4
```

**What it does:**
1. Checks for games starting within the next 2 minutes
2. Locks ALL players (lineup + bench) from teams with games starting
3. Creates weekly lineup snapshots if they don't exist yet
4. Prevents users from making lineup changes once games begin

**Why it's an edge function:**
- Complex logic involving multiple database operations
- Needs to query game schedule and player inventory
- Creates immutable lineup snapshots for scoring

**Key Code:**
```typescript
// Get games starting soon
const { data: upcomingGames } = await supabase
  .from('game_scores')
  .lte('game_start_time', twoMinutesFromNow)

// Lock all players from those teams
await supabase
  .from('user_player_inventory')
  .update({ is_locked: true })
  .in('player_card_id', playerCardIds)
```

---

### 2. `update-live-stats`

**Purpose:** Fetch and update live NFL game data and player stats

**Schedule:** Every 5 minutes on Sunday, Monday, Thursday
```
Cron: */5 * * * 0,1,4
```

**What it does:**
1. Calls ESPN API to get live game scores and status
2. Updates `game_scores` table with current scores, quarter, time remaining
3. Fetches player stats (passing, rushing, receiving, etc.)
4. Calculates fantasy points based on scoring rules
5. Updates `player_game_stats` and `weekly_lineups` tables

**Why it's an edge function:**
- Makes external API calls to ESPN
- Complex data transformation from ESPN format to our schema
- Needs to handle API rate limits and errors gracefully

**Dependencies:**
- ESPN API (public, no auth required)
- Runs immediately after `lock-lineups` in the same cron cycle

---

### 3. `finalize-week`

**Purpose:** Calculate week results, determine winners/losers, update team records

**Schedule:** Tuesday at 12:01 AM
```
Cron: 1 0 * * 2
```

**What it does:**
1. Gets all pending `weekly_lineups` for the completed week
2. Calculates global average score across all teams
3. Determines if each team beat or fell below average
4. Updates team wins/losses records
5. Marks teams as eliminated if they hit loss limit
6. Changes lineup status from 'pending' to 'finalized'
7. Logs transaction records for each team's result

**Why it's an edge function:**
- Complex business logic for win/loss determination
- Multiple database operations need to be orchestrated
- Benefit from TypeScript for calculations and error handling

**Key Logic:**
```typescript
const globalAverage = totalPoints / weeklyLineups.length
const beatMedian = lineup.total_points >= globalMedian
const isEliminated = newLosses >= 3  // configurable per contest type
```

---

### 4. `update-projections`

**Purpose:** Update player fantasy point projections for upcoming week

**Schedule:** Tuesday at 8:05 PM (5 minutes after week advance)
```
Cron: 5 20 * * 2
```

**What it does:**
1. Calls ESPN API to get player season stats
2. Calculates average points per game
3. Adjusts projections based on injury status
4. Updates `player_cards.weekly_projected_points`
5. Generates human-readable projection notes

**Why it's an edge function:**
- Makes external API calls to ESPN
- Complex projection logic based on multiple factors
- Injury status needs real-time API data

**Why 5 minutes after advance-week:**
- Ensures week has advanced before calculating projections
- Fresh projections ready when users start setting lineups

---

### 5. `open-pack`

**Purpose:** Handle pack opening logic for users

**Triggered by:** User action (HTTP POST)

**What it does:**
1. Validates user has unopened pack
2. Randomly selects players based on pack rarity/tier
3. Randomly selects token cards
4. Adds cards to user inventory
5. Marks pack as opened
6. Returns opened cards to display

**Why it's an edge function:**
- User-initiated action (not cron)
- Complex randomization logic
- Transactional - needs all operations to succeed/fail together

---

### 6. `quick-sell-card`

**Purpose:** Allow users to sell cards for coins

**Triggered by:** User action (HTTP POST)

**What it does:**
1. Validates user owns the card
2. Calculates sell value based on card tier/level
3. Removes card from inventory
4. Adds coins to team balance
5. Logs transaction

**Why it's an edge function:**
- User-initiated action
- Transactional - must ensure atomic operation
- Benefit from TypeScript for calculations

---

### 7. `start-new-team`

**Purpose:** Create a new team and give starter pack

**Triggered by:** User action (HTTP POST)

**What it does:**
1. Creates team record
2. Gives starter pack based on contest type
3. Auto-boosts certain players based on tier config
4. Sets initial coins and stats

**Why it's an edge function:**
- User-initiated action
- Complex setup with multiple steps
- Contest-type specific logic

---

### 8. `calculate-global-average`

**Purpose:** Recalculate global statistics for a week

**Triggered by:** Manual/admin action

**What it does:**
- Recalculates average, median, highest, lowest scores
- Updates `weekly_global_stats` table
- Used for corrections or recalculations

---

## Deprecated Edge Functions

### ❌ `advance-week`

**Status:** DEPRECATED - Do not deploy or use

**Why deprecated:**
- Week advancement is now handled by database function `advance_nfl_week()`
- Database function is simpler, faster, and more reliable
- No external API calls needed - just updates config table
- Called directly by cron (no HTTP overhead)

**Migration:**
The cron job now calls the database function directly:
```sql
SELECT cron.schedule(
  'advance-to-next-week',
  '0 20 * * 2',
  'SELECT advance_nfl_week();'
);
```

---

## When to Create an Edge Function vs Database Function

### Use Edge Function When:
- ✅ Need to call external APIs (ESPN, NFL.com, etc.)
- ✅ Complex business logic benefits from TypeScript
- ✅ User-initiated actions via HTTP endpoints
- ✅ Need structured error handling and logging
- ✅ Multiple async operations need orchestration

### Use Database Function When:
- ✅ Simple CRUD operations (INSERT/UPDATE/DELETE)
- ✅ Data transformations entirely within database
- ✅ Performance-critical operations
- ✅ Called by cron directly (no HTTP needed)
- ✅ Leveraging SQL's set-based operations

---

## Deployment Checklist

Before deploying an edge function:

1. **Test locally** with `supabase functions serve`
2. **Verify dependencies** in `import_map.json` if using external packages
3. **Check environment variables** are set in Supabase dashboard
4. **Deploy:** `supabase functions deploy function-name`
5. **Test deployed version** with curl/Postman
6. **Monitor logs** for first few runs
7. **Set up cron job** if automated (not user-triggered)
8. **Document** in this guide and `WEEKLY_AUTOMATION_FLOW.md`

---

## Monitoring & Debugging

### View function logs
```sql
SELECT * FROM edge_function_logs 
WHERE function_name = 'lock-lineups'
ORDER BY created_at DESC 
LIMIT 20;
```

### Check cron job runs
```sql
SELECT * FROM cron.job_run_details 
WHERE jobname = 'sync-nfl-live-stats'
ORDER BY start_time DESC 
LIMIT 10;
```

### Manual testing
```bash
# Test locally
supabase functions serve lock-lineups

# Test deployed version
curl -X POST https://[PROJECT].supabase.co/functions/v1/lock-lineups \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json"
```

---

## Current Function Status

| Function | Status | Deployed | Cron Job | Purpose |
|----------|--------|----------|----------|---------|
| `lock-lineups` | ✅ Active | Yes | Every 5 min (Sun/Mon/Thu) | Lock players when games start |
| `update-live-stats` | ✅ Active | Yes | Every 5 min (Sun/Mon/Thu) | Update live game stats |
| `finalize-week` | ✅ Active | Yes | Tue 12:01 AM | Calculate week results |
| `update-projections` | ✅ Active | Yes | Tue 8:05 PM | Update player projections |
| `open-pack` | ✅ Active | Yes | User-triggered | Handle pack opening |
| `quick-sell-card` | ✅ Active | Yes | User-triggered | Sell cards for coins |
| `start-new-team` | ✅ Active | Yes | User-triggered | Create new team |
| `calculate-global-average` | ✅ Active | Yes | Manual/Admin | Recalculate stats |
| `advance-week` | ❌ Deprecated | No | - | Use DB function instead |

---

## Future Improvements

- [ ] Add edge function execution time tracking to `edge_function_logs`
- [ ] Implement retry logic for failed external API calls
- [ ] Add function execution alerts for failures
- [ ] Create admin dashboard to manually trigger functions
- [ ] Add rate limiting for user-triggered functions
- [ ] Implement function versioning/rollback capability
