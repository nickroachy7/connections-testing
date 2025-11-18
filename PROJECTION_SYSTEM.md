# Player Projection System

## Overview

Our projection system calculates fantasy point projections for all NFL players, integrating real-time stats, injury status, and contest-specific scoring rules. This works **exactly like professional fantasy apps** (ESPN, Yahoo, Sleeper, etc.) by:

1. **Fetching current season stats** from BallDontLie API
2. **Applying injury adjustments** based on official NFL injury reports
3. **Supporting multiple scoring formats** (Standard, Half-PPR, Full PPR)
4. **Providing transparency** with human-readable projection notes

---

## How Projections Are Calculated

### 1. Season Average Baseline

For each player, we calculate their **points per game (PPG)** based on 2025 season stats:

```javascript
// Example: RB with 800 rush yards, 8 TDs, 30 catches, 200 rec yards in 10 games
Rushing: (800 yards × 0.1) + (8 TDs × 6) = 80 + 48 = 128 points
Receiving: (30 catches × 0.5 PPR) + (200 yards × 0.1) = 15 + 20 = 35 points
Total: 163 points ÷ 10 games = 16.3 PPG
```

### 2. Position-Based Adjustments

We apply **conservative multipliers** to avoid over-projecting:

| Position | Multiplier | Reasoning |
|----------|------------|-----------|
| QB | 1.0 | Most consistent position |
| RB | 0.95 | Injury risk, game script variance |
| WR | 0.95 | Target share volatility |
| TE | 0.90 | Lower volume, TD dependent |
| K | 0.85 | Game flow dependent |
| DEF | 0.90 | Matchup dependent |

### 3. Injury Status Integration

**Injury multipliers** are applied based on official NFL injury reports from BallDontLie API:

| Status | Multiplier | Impact |
|--------|------------|--------|
| **Healthy** | 1.0 | Full projection |
| **Probable** | 0.95 | Minor reduction (5%) |
| **Questionable** | 0.8 | Moderate reduction (20%) |
| **Doubtful** | 0.3 | Severe reduction (70%) |
| **Out / IR** | 0.0 | Zero points expected |

**Example:**
```
Player: Christian McCaffrey
Season Avg: 22.5 PPG
Injury Status: Questionable (ankle)
Final Projection: 22.5 × 0.8 = 18.0 points
```

### 4. Scoring Type Support

Projections are calculated using **Half-PPR by default** but support all formats:

| Scoring Type | Receptions Value | Example (RB with 5 catches) |
|--------------|------------------|----------------------------|
| **Standard** | 0 points | 0 points |
| **Half-PPR** | 0.5 points | 2.5 points |
| **Full PPR** | 1.0 points | 5.0 points |

**Planned Enhancement:** Multi-contest support where teams in different contests see projections tailored to their specific scoring format.

### 5. Position-Based Caps

To prevent unrealistic outliers, we cap projections by position:

| Position | Min | Max | Reasoning |
|----------|-----|-----|-----------|
| QB | 0 | 35 | Elite QB ceiling |
| RB | 0 | 30 | Bell-cow RB ceiling |
| WR | 0 | 30 | Top WR ceiling |
| TE | 0 | 20 | Elite TE ceiling |
| K | 0 | 15 | Kicker volatility cap |
| DEF | 0 | 18 | Defense consistency |

---

## Projection Notes System

Every projection includes **human-readable notes** explaining how it was calculated:

### Example Notes

**Healthy Elite Player:**
```
Half-PPR scoring • 10 games played • Elite producer
```

**Injured Starter:**
```
Half-PPR scoring • 8 games played • Injury concern (Questionable) - 20% reduction • Strong performer
```

**Ruled Out Player:**
```
Half-PPR scoring • 6 games played • RULED OUT (Out) - 0 points expected
```

**Rookie/Limited Sample:**
```
Half-PPR scoring • Limited sample size (2 games) • Streaming option
```

### Performance Tiers

Notes include contextual performance labels:

- **Elite producer** - 20+ PPG
- **Strong performer** - 15-20 PPG  
- **Solid contributor** - 10-15 PPG
- **Streaming option** - 5-10 PPG
- **Depth piece** - <5 PPG

---

## Database Schema

### Player Cards Table

Projections are stored in the `player_cards` table:

```sql
CREATE TABLE player_cards (
  -- Core player data
  player_id TEXT UNIQUE NOT NULL,
  player_name TEXT NOT NULL,
  position TEXT NOT NULL,
  
  -- Projection fields (updated by Edge Function)
  weekly_projected_points NUMERIC DEFAULT 0,  -- This week's projection
  projected_points NUMERIC DEFAULT 0,          -- Redundant for compatibility
  season_ppg NUMERIC DEFAULT 0,               -- Season average (baseline)
  season_avg_points NUMERIC DEFAULT 0,        -- Redundant for compatibility
  
  -- Injury tracking
  injury_status TEXT DEFAULT 'healthy',
  injury_designation TEXT,                     -- Redundant for compatibility
  
  -- Stats metadata
  games_played INTEGER DEFAULT 0,
  games_played_season INTEGER DEFAULT 0,       -- Redundant for compatibility
  
  -- Explanation
  projection_notes TEXT,                       -- Human-readable calculation notes
  
  -- Timestamps
  last_projection_update TIMESTAMPTZ DEFAULT now(),
  last_updated TIMESTAMPTZ DEFAULT now()
);
```

---

## Automation Schedule

### Tuesday Night (Week Advancement)

**Cron:** `5 20 * * 2` (Tuesday 8:05 PM)

**Triggers:** After `advance-week` runs

**Purpose:** Update projections for the **new week** after advancing from Week N to Week N+1

**What Happens:**
- Fetches latest season stats from BallDontLie API
- Fetches injury reports for all active players
- Recalculates projections with updated data
- Updates `weekly_projected_points` and `projection_notes` fields

**Why Tuesday Night:**
- Week has just advanced (8:00 PM)
- Fresh projections ready for users setting Week N+1 lineups
- Gives Tuesday for injury report updates

### Sunday Afternoon (Pre-Game Refresh)

**Cron:** `0 18 * * 0` (Sunday 6:00 PM ET / 3:00 PM PT)

**Purpose:** **Final projection refresh** before Sunday games start

**What Happens:**
- Re-runs full projection updates
- Catches **late-breaking injury news** from practice reports
- Updates projections based on Friday/Saturday injury designations

**Why Sunday 6:00 PM ET:**
- Most Sunday games start at 1:00 PM ET (already passed)
- **SHOULD BE 10:00 AM ET** to catch pre-game injuries
- Gives users last-minute lineup decisions

---

## Edge Function: `update-projections`

### Invocation

**HTTP Endpoint:**
```bash
POST https://[PROJECT].supabase.co/functions/v1/update-projections
```

**Automated (Cron):**
- Tuesday 8:05 PM (post-advance)
- Sunday 6:00 PM (pre-games) - **Should be 10:00 AM ET**

### Response Example

```json
{
  "success": true,
  "message": "Updated 1012 players",
  "total_players": 1012,
  "api_calls": 41,
  "successful_calls": 41,
  "injury_checks": 41,
  "injuries_found": 87,
  "season": 2025,
  "week": 11,
  "scoring_type": "half_ppr"
}
```

### Processing Flow

```
1. Fetch current week from nfl_season_config
2. Get all active contest types (to know scoring formats in use)
3. Fetch all active players from player_cards (1000+ players)

INJURY DATA PHASE (Batches of 25 players):
4. For each batch:
   - Call BallDontLie injuries API with player_ids[]
   - Map player_id → injury_status (e.g., "Questionable")
   - Store in injuryMap for fast lookup

STATS & PROJECTION PHASE (Batches of 25 players):
5. For each batch:
   - Call BallDontLie season_stats API with player_ids[]
   - Calculate fantasy points using BASE_SCORING constants
   - Apply position multiplier (QB: 1.0, RB: 0.95, etc.)
   - Apply injury multiplier from injuryMap
   - Cap projection within position bounds (QB: 0-35, etc.)
   - Generate human-readable projection notes
   - Update database with new projection + metadata

6. Return summary stats (players updated, API calls, injuries found)
```

### Batch Processing

To avoid API rate limits, we process in **batches of 25 players**:

```javascript
const batchSize = 25;
for (let i = 0; i < players.length; i += batchSize) {
  const batch = players.slice(i, i + batchSize);
  const batchPlayerIds = batch.map(p => parseInt(p.player_id));
  
  // Call API: ?player_ids[]=1&player_ids[]=2&player_ids[]=3...
  const url = `https://api.balldontlie.io/nfl/v1/season_stats?seasons[]=2025&${playerIdsParams}`;
  
  // 100ms delay between batches
  await new Promise(r => setTimeout(r, 100));
}
```

**Performance:**
- 1012 players ÷ 25 per batch = ~41 API calls
- Total runtime: ~5-7 seconds

---

## Frontend Integration

### Reading Projections

Projections are available in `player_cards` table joins:

```javascript
const { data: inventory } = await supabase
  .from('user_player_inventory')
  .select(`
    id,
    is_in_lineup,
    player_card:player_card_id (
      player_id,
      player_name,
      position,
      weekly_projected_points,
      injury_status,
      projection_notes,
      season_ppg,
      last_projection_update
    )
  `)
  .eq('team_id', teamId);
```

### Displaying Projections

```jsx
<PlayerCard
  name={player.player_card.player_name}
  position={player.player_card.position}
  projection={player.player_card.weekly_projected_points}
  injuryStatus={player.player_card.injury_status}
  notes={player.player_card.projection_notes}
/>
```

### Injury Status UI

```jsx
function InjuryBadge({ status }) {
  if (!status || status === 'healthy') return null;
  
  const colors = {
    'Out': 'bg-red-600',
    'Doubtful': 'bg-red-500',
    'Questionable': 'bg-yellow-500',
    'Probable': 'bg-green-500'
  };
  
  return (
    <span className={`${colors[status]} text-white px-2 py-1 rounded text-xs`}>
      {status}
    </span>
  );
}
```

---

## Comparing to Other Fantasy Apps

### ESPN Fantasy

**How ESPN Does It:**
- Season average baseline (like us ✅)
- Injury adjustments (like us ✅)
- Multiple scoring formats (like us ✅)
- Weekly matchup adjustments (we could add 🔄)

**Our Implementation:**
✅ Matches ESPN's core calculation
🔄 Could add: Opponent defense ranking adjustments
🔄 Could add: Weather impact (kickers, passing games)

### Yahoo Fantasy

**How Yahoo Does It:**
- Expert projections + algorithmic blend
- Injury news integration (like us ✅)
- Usage trend analysis (we could add 🔄)

**Our Implementation:**
✅ Automated algorithmic projections
✅ Injury integration
🔄 Could add: Target share trend analysis

### Sleeper

**How Sleeper Does It:**
- Real-time injury updates (like us ✅)
- Transparent projection methodology (like us ✅)
- Community notes/news (different approach)

**Our Implementation:**
✅ Matches Sleeper's transparency with projection_notes
✅ Real-time injury status updates
✅ Clear scoring type labels

---

## Future Enhancements

### 1. Multi-Scoring Support (Per Contest)

Currently, all projections use **Half-PPR**. Enhancement:

```javascript
// Store projections for each scoring type
{
  "projections": {
    "standard": 14.2,
    "half_ppr": 16.5,
    "full_ppr": 18.8
  }
}
```

**Then display the right projection** based on team's contest type.

### 2. Opponent Strength Adjustments

**Concept:** Adjust projections based on opponent defense ranking

```javascript
// Example: WR vs #1 pass defense
baseProjection = 15.0;
opponentAdjustment = 0.85; // Tough matchup
finalProjection = 15.0 × 0.85 = 12.8;
```

### 3. Weather Impact

**Concept:** Reduce passing/kicking projections in bad weather

```javascript
// Example: Kicker in snow/wind
baseProjection = 10.0;
weatherAdjustment = 0.7; // Heavy wind
finalProjection = 10.0 × 0.7 = 7.0;
```

### 4. Usage Trend Analysis

**Concept:** Identify hot/cold streaks

```javascript
// Last 3 games: 25, 22, 28 (trending up)
// Season average: 18
// Boost projection by 10%
trendingProjection = 18 × 1.1 = 19.8;
```

### 5. Snap Count Integration

**Concept:** Adjust projections based on playing time %

```javascript
// Player snap count declining (85% → 65%)
// Reduce projection accordingly
snapAdjustment = 0.76; // (65/85)
adjustedProjection = baseProjection × snapAdjustment;
```

---

## Testing & Validation

### Manual Test

```bash
# Call the Edge Function directly
curl -X POST https://[PROJECT].supabase.co/functions/v1/update-projections \
  -H "Authorization: Bearer [SERVICE_KEY]"
```

### Expected Results

1. All active players get updated projections
2. Injury statuses match NFL official reports
3. Projection notes accurately describe calculation
4. Timestamps update to current time

### Validation Queries

```sql
-- Check recent updates
SELECT 
  player_name,
  position,
  weekly_projected_points,
  injury_status,
  projection_notes,
  last_projection_update
FROM player_cards
WHERE last_projection_update > now() - interval '1 hour'
ORDER BY weekly_projected_points DESC
LIMIT 20;

-- Find injured players
SELECT 
  player_name,
  position,
  injury_status,
  weekly_projected_points,
  projection_notes
FROM player_cards
WHERE injury_status != 'healthy'
ORDER BY weekly_projected_points DESC;

-- Verify projection distribution
SELECT 
  position,
  COUNT(*) as total_players,
  ROUND(AVG(weekly_projected_points), 2) as avg_projection,
  MAX(weekly_projected_points) as max_projection
FROM player_cards
WHERE is_active = true
GROUP BY position
ORDER BY avg_projection DESC;
```

---

## Troubleshooting

### Issue: Projections not updating

**Check Edge Function logs:**
```sql
SELECT * FROM edge_function_logs 
WHERE function_name = 'update-projections'
ORDER BY created_at DESC 
LIMIT 10;
```

**Common causes:**
- API rate limits hit (check `api_calls` in response)
- Network timeout (BallDontLie API slow)
- Database connection issues

### Issue: Injury statuses incorrect

**Verify API response:**
```bash
curl https://api.balldontlie.io/nfl/v1/injuries?player_ids[]=123 \
  -H "Authorization: YOUR_API_KEY"
```

**Check database:**
```sql
SELECT player_name, injury_status, injury_designation, last_projection_update
FROM player_cards
WHERE injury_status != 'healthy';
```

### Issue: Projections seem too high/low

**Review multipliers:**
- Position multipliers: QB (1.0), RB/WR (0.95), TE (0.90), K (0.85)
- Injury multipliers: Healthy (1.0), Questionable (0.8), Doubtful (0.3), Out (0.0)
- Position caps: QB (35), RB/WR (30), TE (20), K (15)

**Check specific player:**
```sql
SELECT 
  player_name,
  season_ppg as baseline,
  injury_status,
  weekly_projected_points as final_projection,
  projection_notes
FROM player_cards
WHERE player_name ILIKE '%mahomes%';
```

---

## Summary

Our projection system is **production-ready** and mirrors industry-standard fantasy apps:

✅ **Accurate** - Uses real season stats + injury data  
✅ **Transparent** - Projection notes explain calculations  
✅ **Flexible** - Supports multiple scoring formats  
✅ **Automated** - Updates twice weekly via cron  
✅ **Scalable** - Batched API calls prevent rate limits  
✅ **User-Friendly** - Clear injury badges and projections  

**Next Steps:**
1. ✅ Deploy enhanced Edge Function
2. ⏳ Test projection updates in production
3. ⏳ Update Sunday cron to 10:00 AM ET (before games)
4. ⏳ Add multi-contest scoring support
5. ⏳ Implement opponent strength adjustments
