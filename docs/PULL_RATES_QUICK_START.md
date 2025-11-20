# Dynamic Pull Rates - Quick Start Guide

## TL;DR

**Goal:** Replace completely random pack pulls with performance-based pull percentages

**How:** Use existing player stats (season PPG, games played, injury status) to calculate each player's pull probability

**When:** Pull percentages update daily alongside existing projection updates (3 AM EST)

**IMPORTANT:** Pull percentages are **completely separate from card tiers** (Base → Elite). Pull percentages only affect **how likely you are to get a player in a pack**. Card tiers/rarities are your existing leveling system for gameplay multipliers.

---

## Implementation Checklist

### ✅ Step 1: Database Migration (10 min)

Add one column to `player_cards` table:

```sql
-- File: supabase/migrations/20241119_add_pull_percentage_system.sql

ALTER TABLE player_cards
ADD COLUMN pull_percentage NUMERIC DEFAULT 50.0
  CHECK (pull_percentage > 0 AND pull_percentage <= 100);

COMMENT ON COLUMN player_cards.pull_percentage IS 
  'Pull probability weight for pack openings. Higher = more common. Based on performance data, updated daily.';

CREATE INDEX idx_player_cards_pull_percentage 
ON player_cards(pull_percentage, is_active)
WHERE is_active = true;
```

### ✅ Step 2: Update `update-projections` Function (30 min)

Add tier calculation to existing projection updates:

**Add this function:**
```typescript
function calculatePullPercentage(
  position: string, 
  seasonPPG: number, 
  gamesPlayed: number,
  injuryStatus: string
): number {
  
  // Injured/inactive players - high pull rate (common)
  if (['out', 'ir', 'suspended'].some(s => 
    injuryStatus.toLowerCase().includes(s))) {
    return 50.0;
  }
  
  if (gamesPlayed === 0) {
    return 50.0; // Backups/no stats = common
  }
  
  // Position-specific thresholds for elite/top/solid/rotational
  const thresholds = {
    'Quarterback': { elite: 22, top: 18, solid: 14, rotational: 10 },
    'Running Back': { elite: 18, top: 14, solid: 10, rotational: 6 },
    'Wide Receiver': { elite: 16, top: 12, solid: 8, rotational: 4 },
    'Tight End': { elite: 14, top: 10, solid: 6, rotational: 3 },
  };
  
  const threshold = thresholds[position] || thresholds['Wide Receiver'];
  let basePercentage = 50.0; // Default backup percentage
  
  if (seasonPPG >= threshold.elite) basePercentage = 0.5;
  else if (seasonPPG >= threshold.top) basePercentage = 3.0;
  else if (seasonPPG >= threshold.solid) basePercentage = 12.0;
  else if (seasonPPG >= threshold.rotational) basePercentage = 25.0;
  
  // Apply modifiers (increase percentage = more common = worse)
  if (gamesPlayed < 4) basePercentage *= 1.5; // Small sample = less reliable
  if (['questionable', 'doubtful'].some(s => 
    injuryStatus.toLowerCase().includes(s))) {
    basePercentage *= 1.3; // Injury concern = less desirable
  }
  
  // Cap at reasonable bounds
  return Math.min(60.0, Math.max(0.1, basePercentage));
}
```

**Update database write:**
```typescript
const pullPercentage = calculatePullPercentage(
  player.position, seasonAvg, gamesPlayed, injuryStatus
);

await supabase
  .from('player_cards')
  .update({
    // ... existing fields ...
    pull_percentage: pullPercentage,
  })
  .eq('id', player.id);
```

### ✅ Step 3: Update `open-pack` Function (20 min)

Replace random selection with weighted selection:

**OLD (line ~250):**
```typescript
const playerCard = playerCards[Math.floor(Math.random() * playerCards.length)]
```

**NEW:**
```typescript
async function generatePlayerCard(supabaseClient: any) {
  const { data: playerCards, error } = await supabaseClient
    .from('player_cards')
    .select(`
      id, player_name, position, team_abbreviation, 
      image_url, projected_points, pull_percentage, season_ppg
    `)
    .in('position', ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End'])
    .eq('is_active', true)

  if (error || !playerCards?.length) return null

  // Weighted random selection based on pull_percentage
  const totalWeight = playerCards.reduce((sum, p) => sum + (p.pull_percentage || 50), 0)
  let randomValue = Math.random() * totalWeight
  
  for (const player of playerCards) {
    randomValue -= (player.pull_percentage || 50)
    if (randomValue <= 0) {
      console.log(`✨ Pulled ${player.player_name} (${player.pull_percentage}% weight)`)
      return player
    }
  }
  
  return playerCards[0] // Fallback
}
```

### ✅ Step 4: Test & Deploy (30 min)

**Test Query:**
```sql
-- Check tier distribution
SELECT 
  pull_rate_tier,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as pct
FROM player_cards
WHERE is_active = true
GROUP BY pull_rate_tier
ORDER BY 
  CASE pull_rate_tier
    WHEN 'LEGENDARY' THEN 1
    WHEN 'EPIC' THEN 2
    WHEN 'RARE' THEN 3
    WHEN 'UNCOMMON' THEN 4
    WHEN 'COMMON' THEN 5
  END;
```

**Expected Distribution:**
```
LEGENDARY:  ~1-2% (elite performers)
EPIC:       ~4-6% (top-tier starters)
RARE:       ~15-20% (solid starters)
UNCOMMON:   ~30-35% (rotational players)
COMMON:     ~45-50% (backups/injured)
```

---

## Pull Percentage Categories

Performance directly maps to pull probability (not visible tier names):

| Performance Level | Pull Weight | PPG Thresholds | Examples |
|-------------------|-------------|----------------|----------|
| Elite Performers | 0.5-1% | QB: 22+, RB: 18+, WR: 16+, TE: 14+ | Mahomes, CMC, Hill, Kelce |
| Top Starters | 2-4% | QB: 18+, RB: 14+, WR: 12+, TE: 10+ | Top 12 at position |
| Solid Starters | 8-15% | QB: 14+, RB: 10+, WR: 8+, TE: 6+ | Weekly starters |
| Rotational | 20-30% | QB: 10+, RB: 6+, WR: 4+, TE: 3+ | Streaming options |
| Backups/Injured | 40-60% | Below thresholds or 0 games | Depth players, IR |

---

## Key Benefits

✅ **Uses Existing Data** - No new API calls, leverages projection system
✅ **Daily Updates** - Tiers recalculate automatically with projections
✅ **Performance-Based** - Objective stats (PPG, games played, injury status)
✅ **Position-Balanced** - Each position has appropriate thresholds
✅ **Easy to Adjust** - Change thresholds if distribution is off

---

## Optional UI Enhancement

Show pull percentages in pack shop to provide transparency:

```jsx
// PackShop.jsx - show pack odds
<div className="mb-4 p-3 bg-primary-black-700/50 rounded-lg border border-primary-black-600">
  <p className="text-xs font-bold text-primary-green-400 mb-2">
    📊 Pull Rates Based on Real Performance
  </p>
  <p className="text-xs text-primary-black-300">
    Elite players (22+ PPG): ~1% chance<br/>
    Top starters (15+ PPG): ~5% chance<br/>
    Solid players (10+ PPG): ~15% chance<br/>
    All others: Higher rates
  </p>
</div>
```

---

## Monitoring Queries

**Check pull percentage distribution:**
```sql
SELECT 
  CASE 
    WHEN pull_percentage < 1 THEN 'Elite (<1%)'
    WHEN pull_percentage < 5 THEN 'Top (1-5%)'
    WHEN pull_percentage < 15 THEN 'Solid (5-15%)'
    WHEN pull_percentage < 30 THEN 'Rotational (15-30%)'
    ELSE 'Common (30%+)'
  END as category,
  COUNT(*) as count
FROM player_cards 
WHERE is_active = true 
GROUP BY category
ORDER BY MIN(pull_percentage);
```

**See elite players (lowest pull %):**
```sql
SELECT player_name, position, season_ppg, pull_percentage
FROM player_cards
WHERE is_active = true
ORDER BY pull_percentage ASC
LIMIT 20;
```

**See most common pulls:**
```sql
SELECT player_name, position, season_ppg, pull_percentage, injury_status
FROM player_cards
WHERE is_active = true
ORDER BY pull_percentage DESC
LIMIT 20;
```

---

## Rollback Plan

If issues arise, easily revert to random selection:

```typescript
// In open-pack function, comment out weighted selection:
// const totalWeight = ... (weighted code)

// Re-enable random selection:
const playerCard = playerCards[Math.floor(Math.random() * playerCards.length)]
```

Database columns remain, but aren't used. Can be dropped later if needed.

---

## Full Documentation

See [`DYNAMIC_PULL_RATES.md`](./DYNAMIC_PULL_RATES.md) for complete details including:
- Algorithm details
- Future enhancements (pack-specific rates)
- Risk mitigation strategies
- Analytics tracking
- Historical tier evolution
