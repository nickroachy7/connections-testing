# Backend Infrastructure Revamp Plan

## 📋 Overview

This document outlines a comprehensive plan to rebuild the Supabase backend infrastructure (database, edge functions, cron jobs) for the Connections Testing fantasy NFL application. The goal is to create a clean, maintainable, and properly sequenced system.

**Created:** December 18, 2025  
**Last Updated:** December 18, 2025  
**Status:** ✅ PHASE 0-1 COMPLETE - Database & Security Fixes Applied

---

## 🎉 Completed Work Summary

### Phase 0: Critical Database Fixes ✅
| Task | Status | Details |
|------|--------|---------|
| Add Missing FK Indexes | ✅ Complete | Added 5 indexes for FK columns |
| Remove Duplicate Constraints | ✅ Complete | Dropped `player_game_stats_game_player_unique` and `weekly_global_stats_week_season_key` |
| Fix RLS Policy Performance | ✅ Complete | Converted 27 policies from `auth.uid()` to `(select auth.uid())` |
| Consolidate Permissive Policies | ✅ Complete | Merged overlapping SELECT policies on 6 tables |

### Phase 1: Security Fixes ✅
| Task | Status | Details |
|------|--------|---------|
| Fix SECURITY_DEFINER Views | ✅ Complete | Converted 4 views to SECURITY INVOKER |
| Fix Function search_path | ✅ Complete | Fixed 63 functions with `SET search_path = public` |
| Leaked Password Protection | ⚠️ Manual | Enable in Supabase Dashboard → Auth → Security |

### Remaining Manual Tasks ⚠️
1. **Delete deprecated edge functions** - Must be done via Supabase Dashboard:
   - `finalize-week-new` 
   - `update-live-stats`
   - `lock-lineups`
   - `lock-players`
   - `start-live-week`
   - `track-live-stats`
   - `calculate-global-average`
   - `sync-week-schedule`
   - `create-lineup-snapshots`

2. **Enable Leaked Password Protection** - Supabase Dashboard → Authentication → Security

---

## 🔍 Current State Analysis

### Existing Tables (32 total)
| Table | Rows | Purpose | Status |
|-------|------|---------|--------|
| `users` | 6 | User accounts | ✅ Keep |
| `teams` | 16 | Fantasy teams | ✅ Keep |
| `player_cards` | 1012 | NFL player catalog | ✅ Keep |
| `token_cards` | 8 | Token definitions | ✅ Keep |
| `user_player_inventory` | 227 | User's player cards | ✅ Keep |
| `user_token_inventory` | 75 | User's tokens | ✅ Keep |
| `weekly_lineups` | 20 | Weekly lineup snapshots | ✅ Keep |
| `game_scores` | 241 | NFL game scores | ✅ Keep |
| `player_game_stats` | 5057 | Per-game player stats | ✅ Keep |
| `weekly_global_stats` | 17 | Median/stats per week | ✅ Keep |
| `packs` | 5 | Pack definitions | ✅ Keep |
| `transactions` | 89 | Coin transactions | ✅ Keep |
| `nfl_season_config` | 1 | Current week/season | ✅ Keep |
| `user_packs` | 38 | Unopened packs | ✅ Keep |
| `contest_types` | 9 | Contest definitions | ✅ Keep |
| `leagues` | 3 | Private leagues | ✅ Keep |
| `league_*` tables | Various | League subsystem | ✅ Keep |
| `public_contest_*` tables | Various | Public contests | ✅ Keep |
| `free_agency_*` tables | Various | Free agent system | ✅ Keep |
| `simulated_*` tables | 0 | Simulated seasons | 🔄 Review |

### Existing Edge Functions (23 total)
| Function | Purpose | Status |
|----------|---------|--------|
| `game-day-orchestrator` | Main game loop (runs every 5 min) | 🔄 Refactor |
| `update-live-stats` | Fetch/update live player stats | ⚠️ Duplicate of orchestrator |
| `update-projections` | Update player projections | ✅ Keep but refactor |
| `finalize-week` | Finalize week results | ⚠️ Duplicate of orchestrator |
| `finalize-week-new` | Never used | ❌ Delete |
| `advance-week` | Advance to next week | ⚠️ Duplicate of orchestrator |
| `lock-lineups` | Lock lineups at game time | ⚠️ Duplicate of orchestrator |
| `lock-players` | Lock players at game time | ⚠️ Duplicate of orchestrator |
| `start-live-week` | Start live scoring | ⚠️ Duplicate of orchestrator |
| `track-live-stats` | Track stats during games | ⚠️ Duplicate of orchestrator |
| `calculate-global-average` | Calculate median | ⚠️ Duplicate of orchestrator |
| `sync-week-schedule` | Sync game schedule | ⚠️ Duplicate of orchestrator |
| `create-lineup-snapshots` | Create lineup snapshots | ⚠️ Duplicate of orchestrator |
| `calculate-pull-rates` | Calculate pack pull rates | ✅ Keep |
| `open-pack` | Open a pack | ✅ Keep |
| `start-new-team` | Create new team + starter pack | ✅ Keep |
| `quick-sell-card` | Sell cards for coins | ✅ Keep |
| `sync-active-players` | Sync player database | ✅ Keep |
| `update-injuries` | Update injury status | ✅ Keep but integrate |
| `create-league` | Create private league | ✅ Keep |
| `join-league` | Join private league | ✅ Keep |
| `add-team-to-league` | Add team to league | ✅ Keep |
| `calculate-league-median` | Calculate league median | ✅ Keep |

### Security Issues Detected
1. **4 SECURITY_DEFINER views** - Need to be converted to INVOKER
2. **50+ functions with mutable search_path** - Need `SET search_path = public`
3. **Leaked password protection disabled** - Enable in Auth settings

### Performance Issues Detected
1. **5 Missing Foreign Key Indexes:**
   - `free_agency_claims.free_agency_player_id`
   - `free_agency_claims.user_id`
   - `free_agency_players.player_card_id`
   - `league_matchups.winner_team_id`
   - `league_team_history.user_id`

2. **30+ RLS Policies with Inefficient auth() Calls:**
   - Replace `auth.uid()` with `(select auth.uid())`
   - Affects: leagues, league_memberships, league_teams, teams, etc.

3. **60+ Unused Indexes** - Consider removing to reduce write overhead

4. **2 Duplicate Index Sets:**
   - `player_game_stats`: game_id_player_card_id_key & game_player_unique
   - `weekly_global_stats`: week_number_season_year_key & week_season_key

5. **18+ Multiple Permissive Policies** - Consolidate for better performance

---

## 🎯 Revamp Goals

1. **Single Responsibility**: Each edge function does ONE thing well
2. **Clear Sequencing**: Functions trigger in proper order via orchestration
3. **No Duplicates**: Remove redundant functions
4. **Proper Logging**: Comprehensive execution logs
5. **Error Handling**: Graceful failures with retries
6. **Clean Database**: Fix security issues, add missing indexes
7. **Testability**: Each function can be tested independently

---

## 🏗️ New Architecture

### Edge Function Categories

#### Category 1: Data Sync (External APIs → Database)
Functions that fetch data from BallDontLie API and sync to our database.

```
┌─────────────────────────────────────────────────────────┐
│  DAILY DATA SYNC (runs once per day, ~6 AM ET)          │
├─────────────────────────────────────────────────────────┤
│  1. sync-players       → Updates player_cards           │
│  2. sync-injuries      → Updates injury status          │
│  3. sync-schedule      → Updates game_scores (scheduled)│
│  4. update-projections → Updates weekly_projected_points│
│  5. calculate-pull-rates → Updates pack_weight/rarity   │
└─────────────────────────────────────────────────────────┘
```

#### Category 2: Game Day Operations (Time-Sensitive)
Functions that run during NFL games to track live data.

```
┌─────────────────────────────────────────────────────────┐
│  GAME DAY ORCHESTRATOR (runs every 5 min during games)  │
├─────────────────────────────────────────────────────────┤
│  Checks current state and calls appropriate sub-tasks:  │
│                                                         │
│  If status = 'scheduled' AND games starting soon:       │
│    → lock-player-cards   (lock by game start time)      │
│    → create-lineup-snapshots                            │
│                                                         │
│  If status = 'live':                                    │
│    → fetch-game-scores   (update game_scores)           │
│    → fetch-player-stats  (update player_game_stats)     │
│    → calculate-lineup-scores (update weekly_lineups)    │
│    → calculate-median    (update weekly_global_stats)   │
│                                                         │
│  If all games final:                                    │
│    → finalize-week       (mark win/loss, eliminate)     │
│    → award-xp            (give XP to players/tokens)    │
│    → consume-tokens      (delete used tokens)           │
│                                                         │
│  If status = 'finalized' AND Tuesday 8PM+:              │
│    → advance-week        (next week, reset locks)       │
└─────────────────────────────────────────────────────────┘
```

#### Category 3: User Actions (On-Demand)
Functions called by frontend user actions.

```
┌─────────────────────────────────────────────────────────┐
│  USER ACTION FUNCTIONS (called on demand)               │
├─────────────────────────────────────────────────────────┤
│  start-new-team    → Create team + starter pack         │
│  open-pack         → Open pack, add cards to inventory  │
│  quick-sell-card   → Sell card for coins                │
│  claim-free-agent  → Claim free agency player           │
│                                                         │
│  LEAGUE FUNCTIONS:                                      │
│  create-league     → Create private league              │
│  join-league       → Join league by invite code         │
│  add-team-to-league→ Add existing team to league        │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Implementation Plan

### Phase 0: Critical Database Fixes (Pre-Requisite)
**Estimated Time: 2-3 hours**
**Priority: HIGH - Run before any other changes**

#### 0.1 Add Missing Foreign Key Indexes
```sql
-- Performance: Missing FK indexes cause slow joins
CREATE INDEX IF NOT EXISTS idx_free_agency_claims_free_agency_player_id 
  ON free_agency_claims(free_agency_player_id);

CREATE INDEX IF NOT EXISTS idx_free_agency_claims_user_id 
  ON free_agency_claims(user_id);

CREATE INDEX IF NOT EXISTS idx_free_agency_players_player_card_id 
  ON free_agency_players(player_card_id);

CREATE INDEX IF NOT EXISTS idx_league_matchups_winner_team_id 
  ON league_matchups(winner_team_id);

CREATE INDEX IF NOT EXISTS idx_league_team_history_user_id 
  ON league_team_history(user_id);
```

#### 0.2 Remove Duplicate Indexes
```sql
-- Remove duplicates (keep the first one)
DROP INDEX IF EXISTS player_game_stats_game_player_unique;
DROP INDEX IF EXISTS weekly_global_stats_week_season_key;
```

#### 0.3 Fix RLS Policy Performance
All RLS policies using `auth.uid()` need to be changed to `(select auth.uid())` for performance:

Example fix:
```sql
-- Before (evaluated per row - SLOW)
CREATE POLICY "policy_name" ON table_name
  FOR SELECT USING (user_id = auth.uid());

-- After (evaluated once - FAST)  
CREATE POLICY "policy_name" ON table_name
  FOR SELECT USING (user_id = (select auth.uid()));
```

Tables to fix:
- leagues (5 policies)
- league_memberships (3 policies)
- league_teams (4 policies)
- league_weekly_stats (1 policy)
- league_team_history (2 policies)
- league_contest_config (2 policies)
- league_matchups (1 policy)
- public_contest_entries (1 policy)
- free_agency_claims (2 policies)
- teams (1 policy)
- user_player_inventory (1 policy)
- nfl_season_config (1 policy)
- edge_function_logs (1 policy)
- simulated_week_results (2 policies)

#### 0.4 Consolidate Multiple Permissive Policies
Merge duplicate SELECT policies into single policies on:
- `league_matchups`: Combine "League members can view matchups" + "System can manage matchups"
- `nfl_season_config`: Combine "Anyone can view NFL season config" + "Service role can manage"
- `simulated_week_results`: Combine user and service role policies
- `teams`: Combine "Users can view own teams" + "leaderboard_global_read"
- `users`: Combine "Users can view own profile" + "users_public_profile_read"
- `weekly_lineups`: Combine "Public can view all lineups" + "Users can view own lineups"

---

### Phase 1: Database Cleanup & Security Fixes
**Estimated Time: 1-2 hours**

#### 1.1 Fix Security Definer Views
```sql
-- Convert views to INVOKER (safer default)
ALTER VIEW public.leaderboard_by_contest SET (security_invoker = true);
ALTER VIEW public.league_full_config SET (security_invoker = true);
ALTER VIEW public.teams_with_contest_info SET (security_invoker = true);
ALTER VIEW public.fantasy_data_health SET (security_invoker = true);
```

#### 1.2 Fix Function Search Paths
All database functions need `SET search_path = public` added.

#### 1.3 Add Missing Indexes
```sql
-- Critical query performance indexes
CREATE INDEX IF NOT EXISTS idx_player_game_stats_lookup 
  ON player_game_stats(week_number, season_year, player_card_id);

CREATE INDEX IF NOT EXISTS idx_weekly_lineups_lookup 
  ON weekly_lineups(week_number, season_year, team_id);

CREATE INDEX IF NOT EXISTS idx_game_scores_status 
  ON game_scores(week_number, season_year, game_status);
```

#### 1.4 Clean Up Constraints
Ensure unique constraints exist:
```sql
-- Prevent duplicate lineup snapshots
ALTER TABLE weekly_lineups 
  ADD CONSTRAINT unique_team_week_lineup 
  UNIQUE (team_id, week_number, season_year);

-- Prevent duplicate player game stats
ALTER TABLE player_game_stats 
  ADD CONSTRAINT unique_player_game_stats 
  UNIQUE (game_id, player_card_id);

-- Prevent duplicate global stats
ALTER TABLE weekly_global_stats 
  ADD CONSTRAINT unique_week_global_stats 
  UNIQUE (week_number, season_year);
```

---

### Phase 2: Daily Data Sync Functions
**Estimated Time: 2-3 hours**

#### 2.1 `sync-players` (NEW - Replaces sync-active-players)
**Purpose:** Sync NFL player roster from BallDontLie API
**Schedule:** Daily at 6:00 AM ET
**Dependencies:** None

```typescript
// Pseudocode
1. Fetch all active players from BallDontLie API
2. For each player:
   - Upsert into player_cards
   - Map position to our position enum
   - Set is_active based on team assignment
3. Mark players without teams as inactive
4. Log results to edge_function_logs
```

#### 2.2 `sync-injuries` (Refactor existing)
**Purpose:** Update player injury status
**Schedule:** Daily at 6:15 AM ET (after sync-players)
**Dependencies:** sync-players must run first

```typescript
// Pseudocode
1. Fetch all player injuries from BallDontLie API
2. For each injury:
   - Find matching player_card by player_id
   - Update injury_status and injury_designation
3. Clear injury status for players not in injury list
4. Log results
```

#### 2.3 `sync-schedule` (NEW - Extract from orchestrator)
**Purpose:** Sync NFL game schedule for current week
**Schedule:** Daily at 6:30 AM ET (after injuries)
**Dependencies:** None

```typescript
// Pseudocode
1. Get current week from nfl_season_config
2. Fetch games for current week from API
3. Upsert each game into game_scores
4. Update nfl_season_config with:
   - first_game_time
   - last_game_time
   - games_total
5. Log results
```

#### 2.4 `update-projections` (Refactor existing)
**Purpose:** Calculate weekly fantasy point projections
**Schedule:** Daily at 7:00 AM ET (after schedule sync)
**Schedule:** Also runs Sunday 6:00 AM ET (final update before games)
**Dependencies:** sync-players, sync-injuries, sync-schedule

```typescript
// Pseudocode
1. Get all active player_cards
2. For each player:
   - Fetch season stats from API
   - Calculate season average PPG
   - Apply injury multiplier (0, 0.3, 0.8, 0.95, 1.0)
   - Calculate weekly_projected_points
   - Generate projection_notes
3. Update player_cards
4. Log results
```

#### 2.5 `calculate-pull-rates` (Keep existing)
**Purpose:** Calculate pack pull rates based on projections
**Schedule:** Daily at 7:30 AM ET (after projections)
**Dependencies:** update-projections

```typescript
// Pseudocode (existing logic is good)
1. Get all active players with projections
2. Calculate position-relative percentiles
3. Assign rarity_tier based on thresholds
4. Calculate pack_weight for weighted random selection
5. Update player_cards
6. Log results
```

---

### Phase 3: Game Day Orchestrator (Refactor)
**Estimated Time: 3-4 hours**

The orchestrator is currently ~1000 lines with all logic inline. We'll refactor into modular sub-functions that it calls.

#### 3.1 New `game-day-orchestrator` Structure

```typescript
// Main orchestrator - simplified decision tree
async function handleOrchestration() {
  const config = await getSeasonConfig()
  const { week_status, current_week, season_year } = config
  
  // Route based on week status
  switch (week_status) {
    case 'scheduled':
      return await handleScheduledWeek(config)
    case 'live':
      return await handleLiveWeek(config)
    case 'finalized':
      return await handleFinalizedWeek(config)
  }
}

async function handleScheduledWeek(config) {
  // Check if any games starting within 10 minutes
  const gamesStartingSoon = await checkGamesStartingSoon(config)
  
  if (gamesStartingSoon.length > 0) {
    // Lock players for teams with games starting
    await lockPlayersForGames(gamesStartingSoon)
    // Create lineup snapshots for teams without one
    await createMissingLineupSnapshots(config)
  }
  
  // If any games have started, transition to live
  if (await anyGamesInProgress(config)) {
    await updateWeekStatus('live')
  }
}

async function handleLiveWeek(config) {
  // 1. Fetch and update all game scores
  await updateGameScores(config)
  
  // 2. Fetch and update player stats for live/final games
  await updatePlayerStats(config)
  
  // 3. Calculate lineup totals
  await calculateLineupTotals(config)
  
  // 4. Update median
  await updateGlobalMedian(config)
  
  // 5. Check if all games are final
  if (await allGamesComplete(config)) {
    await finalizeWeek(config)
  }
}

async function handleFinalizedWeek(config) {
  // Check if it's time to advance (Tuesday 8 PM+)
  if (shouldAdvanceWeek()) {
    await advanceToNextWeek(config)
  }
}
```

#### 3.2 Sub-Functions (Extracted)

Each of these can be called by the orchestrator OR independently for testing:

| Function | Purpose | Can Run Standalone |
|----------|---------|-------------------|
| `fetch-game-scores` | Get game scores from API | ✅ Yes |
| `fetch-player-stats` | Get player stats from API | ✅ Yes |
| `lock-players-by-game` | Lock players for specific games | ✅ Yes |
| `create-lineup-snapshot` | Create snapshot for one team | ✅ Yes |
| `calculate-lineup-total` | Calculate points for one lineup | ✅ Yes |
| `finalize-week-results` | Process win/loss/elimination | ✅ Yes |
| `advance-week-config` | Move to next week | ✅ Yes |

---

### Phase 4: User Action Functions
**Estimated Time: 2-3 hours**

#### 4.1 `start-new-team` (Refactor)
Keep existing logic but improve:
- Better error handling
- Validate contest type exists
- Ensure proper RLS bypass for service role

#### 4.2 `open-pack` (Keep)
Current implementation is solid. Minor improvements:
- Add transaction logging
- Validate pack exists and is unopened

#### 4.3 `quick-sell-card` (Keep)
Current implementation is solid.

#### 4.4 `claim-free-agent` (NEW)
Currently handled in frontend. Should be edge function:

```typescript
// Pseudocode
1. Validate free_agency_player exists and is active
2. Check user has enough coins
3. Check user doesn't already own player
4. Check user hasn't claimed this player before
5. Deduct coins from team
6. Add player to user_player_inventory
7. Create transaction record
8. Increment claimed_count on free_agency_player
9. Return success with new player card
```

---

### Phase 5: League Functions
**Estimated Time: 1-2 hours**

The league functions are relatively new and well-structured. Minor improvements:

#### 5.1 `create-league` (Minor fixes)
- Add input validation
- Ensure commissioner membership is created

#### 5.2 `join-league` (Minor fixes)
- Validate invite code format
- Check league capacity

#### 5.3 `add-team-to-league` (Minor fixes)
- Validate team belongs to user
- Check league rules

#### 5.4 `calculate-league-median` (Keep)
Good implementation for league-specific median calculation.

---

### Phase 6: Cron Job Configuration
**Estimated Time: 1 hour**

Configure Supabase cron jobs in proper sequence:

```sql
-- Daily Data Sync Chain (6:00 AM - 8:00 AM ET)
SELECT cron.schedule('sync-players', '0 11 * * *', 'SELECT net.http_post(...)');
SELECT cron.schedule('sync-injuries', '15 11 * * *', 'SELECT net.http_post(...)');
SELECT cron.schedule('sync-schedule', '30 11 * * *', 'SELECT net.http_post(...)');
SELECT cron.schedule('update-projections', '0 12 * * *', 'SELECT net.http_post(...)');
SELECT cron.schedule('calculate-pull-rates', '30 12 * * *', 'SELECT net.http_post(...)');

-- Sunday Morning Final Projection Update
SELECT cron.schedule('sunday-projections', '0 11 * * 0', 'SELECT net.http_post(...)');

-- Game Day Orchestrator (Every 5 minutes, always)
SELECT cron.schedule('game-day-orchestrator', '*/5 * * * *', 'SELECT net.http_post(...)');
```

---

### Phase 7: Delete Deprecated Functions
**Estimated Time: 30 minutes**

Remove these redundant functions:
1. `finalize-week-new` - Never used
2. `update-live-stats` - Merged into orchestrator
3. `lock-lineups` - Merged into orchestrator
4. `lock-players` - Merged into orchestrator
5. `start-live-week` - Merged into orchestrator
6. `track-live-stats` - Merged into orchestrator
7. `calculate-global-average` - Merged into orchestrator
8. `sync-week-schedule` - Replaced by sync-schedule
9. `create-lineup-snapshots` - Merged into orchestrator

Keep `finalize-week` and `advance-week` as standalone callable functions that orchestrator can use.

---

## 🔧 BallDontLie API Reference

### Endpoints We Use

| Endpoint | Purpose | Rate Limit |
|----------|---------|------------|
| `GET /players/active` | Get active NFL players | 60/min |
| `GET /player_injuries` | Get injury reports | 60/min |
| `GET /games?seasons[]=&weeks[]=` | Get games for a week | 60/min |
| `GET /stats?game_ids[]=` | Get per-game player stats | 60/min |
| `GET /season_stats?season=` | Get season averages | 60/min |

### SDK Usage (JavaScript)

```javascript
import { BalldontlieAPI } from '@balldontlie/sdk';

const api = new BalldontlieAPI({ apiKey: process.env.BALLDONTLIE_API_KEY });

// Get active players
const players = await api.nfl.getActivePlayers({ per_page: 100 });

// Get injuries
const injuries = await api.nfl.getPlayerInjuries({ per_page: 100 });

// Get games for week
const games = await api.nfl.getGames({ seasons: [2025], weeks: [16] });

// Get stats for games
const stats = await api.nfl.getStats({ game_ids: [12345] });

// Get season stats
const seasonStats = await api.nfl.getSeasonStats({ season: 2025 });
```

### Pagination Pattern

```javascript
async function* paginate(path, params = {}) {
  let cursor = undefined;
  while (true) {
    const page = await api.nfl[path]({ ...params, cursor, per_page: 100 });
    yield* page.data;
    cursor = page.meta?.next_cursor;
    if (!cursor) break;
  }
}
```

### Rate Limit Handling

```javascript
async function fetchWithRetry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < retries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
}
```

---

## 📊 Data Flow Diagrams

### Daily Sync Flow
```
6:00 AM  → sync-players ──────→ player_cards
6:15 AM  → sync-injuries ─────→ player_cards.injury_status
6:30 AM  → sync-schedule ─────→ game_scores
7:00 AM  → update-projections → player_cards.weekly_projected_points
7:30 AM  → calculate-pull-rates → player_cards.pack_weight
```

### Game Day Flow
```
Every 5 min:
┌──────────────────────────────────────────────────────────────┐
│                    game-day-orchestrator                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Check nfl_season_config.week_status                         │
│                                                              │
│  'scheduled' ─→ Check if games starting soon                 │
│                 │                                            │
│                 ├─→ Lock players (user_player_inventory)     │
│                 └─→ Create snapshots (weekly_lineups)        │
│                                                              │
│  'live' ────────→ Fetch game scores (game_scores)            │
│                   │                                          │
│                   ├─→ Fetch player stats (player_game_stats) │
│                   ├─→ Update lineup totals (weekly_lineups)  │
│                   └─→ Update median (weekly_global_stats)    │
│                                                              │
│  All games final → Finalize week                             │
│                    │                                         │
│                    ├─→ Process win/loss (teams)              │
│                    ├─→ Award XP (user_player_inventory)      │
│                    └─→ Consume tokens (user_token_inventory) │
│                                                              │
│  'finalized' ───→ Check if Tuesday 8 PM+                     │
│                   │                                          │
│                   └─→ Advance to next week                   │
└──────────────────────────────────────────────────────────────┘
```

### User Action Flow
```
User clicks "Open Pack"
        │
        ▼
    open-pack
        │
        ├─→ Validate pack ownership
        ├─→ Generate random players (weighted by pack_weight)
        ├─→ Insert into user_player_inventory
        ├─→ Generate random tokens
        ├─→ Insert into user_token_inventory
        ├─→ Mark pack as opened
        └─→ Return cards for reveal animation
```

---

## ✅ Implementation Checklist

### Phase 0: Critical Database Fixes (DO FIRST)
- [ ] Add 5 missing foreign key indexes
- [ ] Remove 2 duplicate index sets
- [ ] Fix 27 RLS policies with inefficient auth() calls
- [ ] Consolidate 18 multiple permissive policies
- [ ] Test query performance after changes

### Phase 1: Database Cleanup
- [ ] Fix 4 security definer views
- [ ] Fix 50+ function search paths
- [ ] Add missing indexes
- [ ] Add unique constraints
- [ ] Enable leaked password protection

### Phase 2: Daily Sync Functions
- [ ] Refactor `sync-players` (from sync-active-players)
- [ ] Refactor `sync-injuries` (integrate properly)
- [ ] Create `sync-schedule` (extract from orchestrator)
- [ ] Refactor `update-projections`
- [ ] Verify `calculate-pull-rates`

### Phase 3: Game Day Orchestrator
- [ ] Refactor into modular structure
- [ ] Extract `fetch-game-scores`
- [ ] Extract `fetch-player-stats`
- [ ] Extract `calculate-lineup-total`
- [ ] Extract `finalize-week-results`
- [ ] Add comprehensive logging
- [ ] Add error handling with retries

### Phase 4: User Action Functions
- [ ] Refactor `start-new-team`
- [ ] Review `open-pack`
- [ ] Review `quick-sell-card`
- [ ] Create `claim-free-agent`

### Phase 5: League Functions
- [ ] Review `create-league`
- [ ] Review `join-league`
- [ ] Review `add-team-to-league`
- [ ] Review `calculate-league-median`

### Phase 6: Cron Configuration
- [ ] Configure daily sync chain
- [ ] Configure game-day orchestrator
- [ ] Test cron scheduling
- [ ] Document cron times

### Phase 7: Cleanup
- [ ] Delete `finalize-week-new`
- [ ] Delete `update-live-stats`
- [ ] Delete `lock-lineups`
- [ ] Delete `lock-players`
- [ ] Delete `start-live-week`
- [ ] Delete `track-live-stats`
- [ ] Delete `calculate-global-average`
- [ ] Delete `sync-week-schedule`
- [ ] Delete `create-lineup-snapshots`

---

## 🚨 Migration Strategy

### Step 1: Create New Functions First
Deploy new/refactored functions without removing old ones.

### Step 2: Update Cron Jobs
Point crons to new functions but keep old functions deployed.

### Step 3: Monitor
Run both systems in parallel for one week if needed.

### Step 4: Remove Old Functions
Once confident, delete deprecated functions.

### Step 5: Document
Update all documentation to reflect new architecture.

---

## 📈 Success Metrics

After revamp, we should see:
1. **Clear logs** for every function execution
2. **No duplicate processing** of lineups/stats
3. **Proper sequencing** of all operations
4. **Under 30s** execution time for orchestrator
5. **Zero security warnings** in advisors
6. **100% test coverage** for critical paths

---

## 🔜 Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize phases** based on urgency
3. **Begin Phase 1** (database cleanup) - lowest risk
4. **Test each phase** before moving to next
5. **Monitor production** after each deployment

---

*Document maintained by development team. Last updated: December 18, 2025*
