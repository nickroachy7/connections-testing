# Dynamic Pull Percentage System

## Overview

Currently, pack openings select players **completely randomly** from the pool of active players. This plan implements a **performance-based pull percentage system** where better-performing players have lower pull percentages (harder to get), creating a more realistic and engaging pack economy.

### ⚠️ CRITICAL: Pull Percentage ≠ Card Tier/Rarity

**Pull Percentage** (NEW - this system):
- Just a number (0.1% to 60%)
- Controls **how likely** you are to pull a player from packs
- Based on real-world performance (season PPG, injury status)
- Lower % = harder to get, higher % = easier to get
- Example: Mahomes = 0.5%, backup QB = 50%
- **No visual tiers/badges** - just math for weighted selection

**Card Tier/Rarity** (EXISTING - your leveling system):
- Base → Role Player → Starter → All-Star → Elite
- Players level up through **XP earned from fantasy points**
- Affects **gameplay multipliers** and card strength
- **Completely independent** of pull percentage
- This is your existing progression system - unchanged

**In Simple Terms:**
- Pull % = How hard to **acquire** the player
- Card Tier = How **strong** the player is in gameplay

---

## Goals

1. **Reflect Real Player Value**: Elite performers should be harder to pull
2. **Daily Updates**: Pull percentages recalculate daily with projections (3 AM)
3. **Transparent**: Show users pull probabilities in pack shop
4. **Fair**: Based on objective stats, not arbitrary
5. **No Gameplay Impact**: Pull % doesn't affect card strength - that's your tier system

---

## Data Sources (Already Available)

We already have all the data via the `update-projections` Edge Function:

| Field | Purpose | Updated By |
|-------|---------|------------|
| `season_ppg` | Season average fantasy points per game | `update-projections` |
| `games_played_season` | Games played this season | `update-projections` |
| `injury_status` | Current injury designation | `update-projections` |

**No new API calls needed** - we leverage existing daily projection updates.

---

## Pull Percentage Calculation

### Performance Ranges (Bell Curve Distribution)

**Goal:** Most pulls should be **playable mid-tier starters**, not trash or superstars.

| Performance Level | Pull % | PPG Thresholds | Examples |
|-------------------|--------|----------------|----------|
| **Elite** | 1-3% | QB: 22+, RB: 18+, WR: 16+, TE: 14+ | Mahomes, CMC, Hill (RARE) |
| **Top Starter** | 15-20% | QB: 18+, RB: 14+, WR: 12+, TE: 10+ | Top 12 at position |
| **Solid Starter** | 50-60% | QB: 14+, RB: 10+, WR: 8+, TE: 6+ | **MOST COMMON - usable players** |
| **Rotational** | 10-15% | QB: 10+, RB: 6+, WR: 4+, TE: 3+ | Streaming options (less common) |
| **Backup/Injured** | 1-5% | Below thresholds or injured | Trash players (RARE) |

**Key Insight:** Backups/injured players get **low pull %** (rare) so users don't get garbage teams. Mid-tier starters get **high pull %** (common) so packs feel rewarding.

### Position-Specific Thresholds

```typescript
const thresholds = {
  'Quarterback': { elite: 22, top: 18, solid: 14, rotational: 10 },
  'Running Back': { elite: 18, top: 14, solid: 10, rotational: 6 },
  'Wide Receiver': { elite: 16, top: 12, solid: 8, rotational: 4 },
  'Tight End': { elite: 14, top: 10, solid: 6, rotational: 3 },
};
```

### Modifiers (Inverted Logic)

**Games Played:**
- `< 4 games` → **Decrease % by 80%** (trash player, make rare)
- Example: If they'd be 50% → reduce to 10% (don't want backups)

**Injury Status:**
- `Questionable/Doubtful` → **Decrease % by 50%** (less desirable)
- `Out/IR` → **Force to 1-2%** (trash players are rare pulls)

**Example Calculation:**
```
Player: Saquon Barkley (RB)
Season PPG: 19.5
Games Played: 11
Injury: Healthy

Base %: 2% (elite RB, 19.5 > 18 threshold)
Games Modifier: None (11 games > 4)
Injury Modifier: None (healthy)
Final Pull %: 2% (rare - elite player)
```

```
Player: Jaylen Warren (RB - solid starter)
Season PPG: 10.5
Games Played: 9
Injury: Healthy

Base %: 55% (solid starter, 10.5 > 10 threshold)
Games Modifier: None (9 games > 4)
Injury Modifier: None (healthy)
Final Pull %: 55% (COMMON - most packs get players like this)
```

```
Player: Backup RB (practice squad)
Season PPG: 2.1
Games Played: 2
Injury: Healthy

Base %: Would be 50% (below rotational threshold)
Games Modifier: 50% × 0.2 = 10% (only 2 games - trash player, make rare)
Injury Modifier: None
Final Pull %: 10% (rare - don't want trash filling packs)
```

```
Player: Injured Star (IR)
Season PPG: 15.0 (was good before injury)
Games Played: 4
Injury: Out (IR)

Base %: Would be 55% (solid)
Injury Modifier: Force to 2% (injured = trash right now, make rare)
Final Pull %: 2% (rare - don't want injured players)
```

---

## Database Schema Changes

### Add Column to `player_cards` Table

```sql
-- Migration: 20241119_add_pull_percentage.sql

ALTER TABLE player_cards
ADD COLUMN pull_percentage NUMERIC DEFAULT 50.0
  CHECK (pull_percentage > 0 AND pull_percentage <= 100);

COMMENT ON COLUMN player_cards.pull_percentage IS 
  'Pull probability weight for pack openings. Lower % = rarer. Based on performance, updated daily.';

-- Index for efficient weighted selection
CREATE INDEX idx_player_cards_pull_percentage 
ON player_cards(pull_percentage, is_active)
WHERE is_active = true;

-- Initialize all players to backup/common rate
UPDATE player_cards
SET pull_percentage = 50.0
WHERE is_active = true;
```

**Why this approach:**
- ✅ Simple - just one column
- ✅ Updated alongside projections
- ✅ Easy to query and use
- ✅ No additional tables

---

## Implementation

### Phase 1: Database Migration (10 min)

```bash
# Create and apply migration
supabase db push
```

### Phase 2: Update `update-projections` Function (30 min)

Add calculation function:

```typescript
function calculatePullPercentage(
  position: string,
  seasonPPG: number,
  gamesPlayed: number,
  injuryStatus: string
): number {
  
  // Injured/inactive = RARE (don't want trash in packs)
  if (['out', 'ir', 'suspended', 'pup'].some(s => 
    injuryStatus.toLowerCase().includes(s))) {
    return 2.0; // Very rare - injured players are trash
  }
  
  // No games = backup = RARE
  if (gamesPlayed === 0) {
    return 5.0; // Rare - backups shouldn't dominate packs
  }
  
  // Position thresholds
  const thresholds: Record<string, any> = {
    'Quarterback': { elite: 22, top: 18, solid: 14, rotational: 10 },
    'Running Back': { elite: 18, top: 14, solid: 10, rotational: 6 },
    'Wide Receiver': { elite: 16, top: 12, solid: 8, rotational: 4 },
    'Tight End': { elite: 14, top: 10, solid: 6, rotational: 3 },
  };
  
  const threshold = thresholds[position] || thresholds['Wide Receiver'];
  let basePercentage = 5.0; // Default for trash players (below rotational)
  
  // Bell curve: solid starters are MOST common
  if (seasonPPG >= threshold.elite) basePercentage = 2.0;        // Rare - elite
  else if (seasonPPG >= threshold.top) basePercentage = 18.0;    // Uncommon - top starters
  else if (seasonPPG >= threshold.solid) basePercentage = 55.0;  // COMMON - mid-tier starters (sweet spot)
  else if (seasonPPG >= threshold.rotational) basePercentage = 12.0; // Less common - rotational
  // else: 5.0% (trash/backup - rare)
  
  // Apply modifiers (INVERTED - bad players get rarer)
  if (gamesPlayed < 4) {
    basePercentage *= 0.2; // Multiply by 0.2 = reduce to 20% (make rare)
  }
  
  if (['questionable', 'doubtful'].some(s => 
    injuryStatus.toLowerCase().includes(s))) {
    basePercentage *= 0.5; // Reduce by 50% (injury concern = less desirable)
  }
  
  // Cap at reasonable bounds
  return Math.min(60.0, Math.max(0.5, basePercentage));
}
```

Add to database update:

```typescript
// In the player update loop
const pullPercentage = calculatePullPercentage(
  player.position,
  seasonAvg,
  gamesPlayed,
  injuryStatus
);

const { error } = await supabase
  .from('player_cards')
  .update({
    // ... existing fields ...
    pull_percentage: Math.round(pullPercentage * 100) / 100, // Round to 2 decimals
  })
  .eq('id', player.id);
```

### Phase 3: Update `open-pack` Function (20 min)

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

  if (error || !playerCards || playerCards.length === 0) {
    console.error('Error fetching player card:', error)
    return null
  }

  // Weighted random selection based on pull_percentage
  const totalWeight = playerCards.reduce((sum, p) => sum + (p.pull_percentage || 50), 0)
  let randomValue = Math.random() * totalWeight
  
  for (const player of playerCards) {
    randomValue -= (player.pull_percentage || 50)
    if (randomValue <= 0) {
      console.log(`Pulled ${player.player_name} (${player.position}) - ${player.pull_percentage}% weight`)
      return player
    }
  }
  
  // Fallback (should never happen)
  return playerCards[0]
}
```

---

## Testing & Validation

### Test Queries

**1. Check pull percentage distribution:**
```sql
SELECT 
  CASE 
    WHEN pull_percentage < 1 THEN 'Elite (<1%)'
    WHEN pull_percentage < 5 THEN 'Top (1-5%)'
    WHEN pull_percentage < 15 THEN 'Solid (5-15%)'
    WHEN pull_percentage < 30 THEN 'Rotational (15-30%)'
    ELSE 'Common (30%+)'
  END as category,
  COUNT(*) as count,
  ROUND(AVG(pull_percentage), 2) as avg_percentage
FROM player_cards
WHERE is_active = true
GROUP BY category
ORDER BY MIN(pull_percentage);
```

**Expected (Bell Curve):**
```
Elite (1-3%):       10-20 players (rare superstars)
Top (15-20%):       50-70 players (uncommon good starters)
Solid (50-60%):     400-500 players (MOST COMMON - usable players)
Rotational (10-15%): 100-150 players (less common streamers)
Trash (1-5%):       50-100 players (rare - backups/injured)
```

**2. See rarest players:**
```sql
SELECT player_name, position, season_ppg, pull_percentage
FROM player_cards
WHERE is_active = true
ORDER BY pull_percentage ASC
LIMIT 20;
```

**3. See most common players:**
```sql
SELECT player_name, position, season_ppg, injury_status, pull_percentage
FROM player_cards
WHERE is_active = true
ORDER BY pull_percentage DESC
LIMIT 20;
```

### Simulation Test

Open 100 test packs and track distribution:

```typescript
const results = { elite: 0, top: 0, solid: 0, rotational: 0, common: 0 };

for (let i = 0; i < 100; i++) {
  // Open pack (8 players)
  for (let j = 0; j < 8; j++) {
    const player = await generatePlayerCard(supabase);
    if (player.pull_percentage < 1) results.elite++;
    else if (player.pull_percentage < 5) results.top++;
    else if (player.pull_percentage < 15) results.solid++;
    else if (player.pull_percentage < 30) results.rotational++;
    else results.common++;
  }
}

console.log('Distribution after 100 packs (800 players):');
console.log('Elite:', results.elite, '(~1% expected)');
console.log('Top:', results.top, '(~5% expected)');
console.log('Solid:', results.solid, '(~15% expected)');
console.log('Rotational:', results.rotational, '(~30% expected)');
console.log('Common:', results.common, '(~50% expected)');
```

---

## UI Enhancements (Optional)

### Pack Shop - Show Probabilities

```jsx
// PackShop.jsx - add transparency
<div className="mb-4 p-3 bg-primary-black-700/50 rounded-lg border border-primary-black-600">
  <p className="text-xs font-bold text-primary-green-400 mb-2">
    📊 Pull Rates Based on Real Performance
  </p>
  <div className="text-xs text-primary-black-300 space-y-1">
    <div>• Elite players (22+ PPG): ~1% chance</div>
    <div>• Top starters (15+ PPG): ~5% chance</div>
    <div>• Solid players (10+ PPG): ~15% chance</div>
    <div>• All others: Higher rates</div>
  </div>
  <p className="text-[10px] text-primary-black-400 mt-2 italic">
    Pull rates update daily. All cards start at Base tier Level 1.
  </p>
</div>
```

### Player Profile - Show Pull Rarity (Optional)

```jsx
// In PlayerProfile.jsx or inventory
<div className="text-sm text-primary-black-300">
  <span className="font-medium">Pull Rate:</span> 
  <span className={`ml-2 ${
    pullPercentage < 1 ? 'text-yellow-400 font-bold' :
    pullPercentage < 5 ? 'text-purple-400 font-bold' :
    pullPercentage < 15 ? 'text-blue-400' :
    'text-gray-400'
  }`}>
    {pullPercentage}% 
    {pullPercentage < 1 && ' (Elite!)'}
    {pullPercentage >= 1 && pullPercentage < 5 && ' (Rare)'}
  </span>
</div>
```

---

## Daily Update Schedule

**Existing Cron Job (No Changes):**
- **Function:** `update-projections`
- **Schedule:** Daily at 3 AM EST
- **Actions:**
  - Fetch season stats
  - Fetch injury reports
  - Calculate projections
  - **NEW:** Calculate pull percentages

No additional cron jobs needed.

---

## Expected Distribution

After daily updates, you should see approximately:

| Category | Pull % Range | Count | % of Pool | Typical Result in Pack |
|----------|--------------|-------|-----------|------------------------|
| Elite | 1-3% | 10-20 | ~1-2% | 0-1 per 10 packs (rare) |
| Top Starter | 15-20% | 50-70 | ~6-8% | 1-2 per pack |
| **Solid Starter** | **50-60%** | **400-500** | **~45-55%** | **4-5 per pack (MOST)** |
| Rotational | 10-15% | 100-150 | ~12-18% | 1 per pack |
| Trash/Injured | 1-5% | 50-100 | ~5-10% | 0-1 per 10 packs (rare) |

**Pack Experience:** Most 8-card packs should contain 4-5 solid usable starters, 1-2 top-tier players, 1 rotational, and rarely a trash/injured player.

---

## Future Enhancements

### Pack-Type Specific Modifiers

Elite packs could reduce all percentages (make better pulls):

```typescript
function applyPackTypeModifier(basePercentage: number, packType: string): number {
  if (packType === 'elite') {
    return basePercentage * 0.3; // Elite packs are 3x better odds
  }
  if (packType === 'gold') {
    return basePercentage * 0.6; // Gold packs are 1.67x better
  }
  return basePercentage; // Bronze/Silver/Starter unchanged
}
```

### Dynamic Rebalancing

If distribution gets skewed, auto-adjust:

```typescript
// If too many elite players exist (e.g., late season)
const eliteCount = await countPlayersByPercentageRange(0, 1);
if (eliteCount > 20) {
  // Increase elite threshold (QB 22 → 24 PPG)
  // This reduces number of elite-tier players
}
```

---

## Summary

### What Changes
1. **Database:** Add `pull_percentage` column
2. **update-projections:** Calculate pull % alongside projections
3. **open-pack:** Use weighted selection instead of random
4. **UI (Optional):** Show pull rates in pack shop

### What Stays the Same
- ✅ Card tier system (Base → Elite) unchanged
- ✅ All players start Base Level 1 regardless of pull %
- ✅ Card leveling/XP system unchanged
- ✅ Gameplay multipliers unchanged
- ✅ Pack types/prices unchanged
- ✅ Position distribution unchanged

### Key Points
- **Pull % = acquisition rarity** (how hard to get)
- **Card tier = gameplay power** (how strong)
- **These are independent systems**
- Pull % is just a number, no visual badges or tier names
- Updates daily with existing projection function

---

## Rollback Plan

If issues arise:

```typescript
// In open-pack, comment out weighted selection:
// const totalWeight = ... (weighted code)

// Re-enable random:
const playerCard = playerCards[Math.floor(Math.random() * playerCards.length)]
```

Column can be dropped later if needed:
```sql
ALTER TABLE player_cards DROP COLUMN pull_percentage;
```
