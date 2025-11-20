# Dynamic Pull Rate System

## Overview

Currently, pack openings select players **completely randomly** from the pool of active players. This plan implements a **performance-based pull rate system** where better-performing players are rarer pulls, creating a more realistic and engaging pack economy.

### ⚠️ CRITICAL DISTINCTION: Pull Rate ≠ Card Tier

**Pull Rate Tiers** (this system):
- Controls **probability of pulling a player** from packs
- Based on real-world performance (season PPG, injury status)
- Purely for **pack economy and acquisition rarity**
- Examples: LEGENDARY (1% pull rate), COMMON (50% pull rate)

**Card Tiers** (existing progression system):
- Controls **card strength and scoring multipliers** in gameplay
- Levels: Base → Role Player → Starter → All-Star → Elite
- **ALL pulled players start at Base tier, Level 1** regardless of pull rate
- Cards level up through **gameplay XP and fantasy points**

**Example:** Patrick Mahomes might be **LEGENDARY pull rate** (1% chance to get him from a pack), but when you pull him, he starts as **Base tier, Level 1** just like any other player. You still need to play games to level him up to Elite.

---

## Goals

1. **Reflect Real Player Value**: Elite performers like Patrick Mahomes should be rarer than backup players
2. **Daily Updates**: Pull rates recalculate daily based on latest performance data
3. **Transparent & Fair**: System uses objective stats (season averages, games played, injury status)
4. **Maintain Balance**: Ensure all positions have appropriate distribution of pull rates
5. **Future-Proof**: Support multiple pack types with different pull rate distributions
6. **Show Probabilities**: Users can see pull rate odds in pack shop UI

---

## Data Sources (Already Available)

We already have all the data needed via the `update-projections` Edge Function:

| Field | Purpose | Updated By |
|-------|---------|------------|
| `season_ppg` | Season average fantasy points per game | `update-projections` |
| `games_played_season` | Games played this season | `update-projections` |
| `injury_status` | Current injury designation | `update-projections` |
| `weekly_projected_points` | Projected points this week | `update-projections` |
| `projection_notes` | Human-readable context | `update-projections` |

**No new API calls needed** - we leverage existing daily projection updates.

---

## Pull Rate Tier System

### Player Classification

Players are classified into **5 pull rate tiers** based on performance:

| Tier | Description | Pull Rate | Example Players |
|------|-------------|-----------|----------------|
| **COMMON** | Backups, IR, minimal stats | 50% | Practice squad WRs, 3rd-string RBs |
| **UNCOMMON** | Rotational players, spot starters | 30% | Backup QBs, committee RBs |
| **RARE** | Solid starters, weekly contributors | 15% | Mid-tier WR2s, streaming QBs |
| **EPIC** | Elite performers, weekly must-starts | 4% | Top 10 RBs, elite WR1s |
| **LEGENDARY** | Superstar tier, league winners | 1% | Mahomes, CMC, Hill, Jefferson |

### Position-Specific Thresholds

Different positions have different scoring profiles:

#### Quarterbacks
```
LEGENDARY: 22+ PPG (Elite QB1s)
EPIC:     18-22 PPG (Top 12 QBs)
RARE:     14-18 PPG (Streaming options)
UNCOMMON: 10-14 PPG (Backup-level)
COMMON:    <10 PPG (Deep backups)
```

#### Running Backs
```
LEGENDARY: 18+ PPG (Elite RB1s)
EPIC:     14-18 PPG (Top 12 RBs)
RARE:     10-14 PPG (Flex/RB2)
UNCOMMON:  6-10 PPG (Committee backs)
COMMON:     <6 PPG (Depth pieces)
```

#### Wide Receivers / Tight Ends
```
WR LEGENDARY: 16+ PPG (Elite WR1s)
WR EPIC:     12-16 PPG (Top 20 WRs)
WR RARE:      8-12 PPG (WR2/3)
WR UNCOMMON:  4-8 PPG (Bench WRs)
WR COMMON:     <4 PPG (Depth)

TE LEGENDARY: 14+ PPG (Kelce tier)
TE EPIC:     10-14 PPG (Top 5 TEs)
TE RARE:      6-10 PPG (Streaming TEs)
TE UNCOMMON:  3-6 PPG (Backup TEs)
TE COMMON:     <3 PPG (Depth)
```

---

## Pull Rate Calculation Algorithm

### Step 1: Calculate Base Pull Tier

```sql
-- Pseudo-SQL for tier assignment
CASE 
  -- Injured/Out players default to COMMON
  WHEN injury_status IN ('out', 'ir', 'suspended', 'pup') THEN 'COMMON'
  
  -- Players with no games played
  WHEN games_played_season = 0 THEN 'COMMON'
  
  -- Quarterback tiers
  WHEN position = 'Quarterback' THEN
    CASE
      WHEN season_ppg >= 22 THEN 'LEGENDARY'
      WHEN season_ppg >= 18 THEN 'EPIC'
      WHEN season_ppg >= 14 THEN 'RARE'
      WHEN season_ppg >= 10 THEN 'UNCOMMON'
      ELSE 'COMMON'
    END
  
  -- Running Back tiers
  WHEN position = 'Running Back' THEN
    CASE
      WHEN season_ppg >= 18 THEN 'LEGENDARY'
      WHEN season_ppg >= 14 THEN 'EPIC'
      WHEN season_ppg >= 10 THEN 'RARE'
      WHEN season_ppg >= 6 THEN 'UNCOMMON'
      ELSE 'COMMON'
    END
  
  -- Wide Receiver tiers
  WHEN position = 'Wide Receiver' THEN
    CASE
      WHEN season_ppg >= 16 THEN 'LEGENDARY'
      WHEN season_ppg >= 12 THEN 'EPIC'
      WHEN season_ppg >= 8 THEN 'RARE'
      WHEN season_ppg >= 4 THEN 'UNCOMMON'
      ELSE 'COMMON'
    END
  
  -- Tight End tiers
  WHEN position = 'Tight End' THEN
    CASE
      WHEN season_ppg >= 14 THEN 'LEGENDARY'
      WHEN season_ppg >= 10 THEN 'EPIC'
      WHEN season_ppg >= 6 THEN 'RARE'
      WHEN season_ppg >= 3 THEN 'UNCOMMON'
      ELSE 'COMMON'
    END
  
  ELSE 'COMMON'
END
```

### Step 2: Apply Modifiers

**Games Played Modifier**
- Players with fewer games get slightly downgraded (sample size concern)
- `games_played_season < 4` → Reduce tier by 1 level

**Injury Status Modifier**
- `Questionable/Doubtful` → Reduce tier by 1 level (uncertainty)
- `Out/IR` → Force to COMMON tier

**Example:**
```
Player: Elite WR with 16.5 PPG, 8 games played, Questionable status
Base Tier: LEGENDARY (16.5 PPG)
Games Modifier: -1 tier (only 8 games)
Injury Modifier: -1 tier (Questionable)
Final Tier: RARE
```

---

## Database Schema Changes

### Option A: Add Column to `player_cards` Table (RECOMMENDED)

**Add pull rate tier column:**
```sql
ALTER TABLE player_cards
ADD COLUMN pull_rate_tier TEXT DEFAULT 'COMMON'
  CHECK (pull_rate_tier IN ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'));

ALTER TABLE player_cards
ADD COLUMN pull_rate_weight NUMERIC DEFAULT 50.0
  CHECK (pull_rate_weight > 0 AND pull_rate_weight <= 100);

COMMENT ON COLUMN player_cards.pull_rate_tier IS 
  'Pull rate tier based on performance: COMMON (50%), UNCOMMON (30%), RARE (15%), EPIC (4%), LEGENDARY (1%)';

COMMENT ON COLUMN player_cards.pull_rate_weight IS 
  'Exact pull weight percentage for weighted random selection. Higher = more common.';
```

**Why this approach?**
- ✅ Simple to query and use in pack opening
- ✅ Updated alongside projections (same Edge Function)
- ✅ Easy to debug and visualize
- ✅ No new tables needed

### Option B: Separate Pull Rates Table (ALTERNATIVE)

**Create dedicated table:**
```sql
CREATE TABLE player_pull_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_card_id UUID REFERENCES player_cards(id) ON DELETE CASCADE,
  pull_tier TEXT NOT NULL CHECK (pull_tier IN ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY')),
  pull_weight NUMERIC NOT NULL CHECK (pull_weight > 0),
  season_year INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB, -- Store calculation details (PPG, games played, injury status)
  
  UNIQUE(player_card_id, season_year, week_number)
);

COMMENT ON TABLE player_pull_rates IS 
  'Historical pull rate tiers for players, recalculated daily based on performance data';
```

**Why this approach?**
- ✅ Historical tracking of pull rate changes
- ✅ Can analyze how player tiers evolve over season
- ✅ Keeps `player_cards` table cleaner
- ❌ More complex queries
- ❌ Additional table to maintain

**RECOMMENDATION: Use Option A** for simplicity and performance.

---

## Implementation Plan

### Phase 1: Database Migration (Week 1)

**Create migration file:** `20241119_add_pull_rate_system.sql`

```sql
-- Add pull rate columns to player_cards table
ALTER TABLE player_cards
ADD COLUMN IF NOT EXISTS pull_rate_tier TEXT DEFAULT 'COMMON'
  CHECK (pull_rate_tier IN ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'));

ALTER TABLE player_cards
ADD COLUMN IF NOT EXISTS pull_rate_weight NUMERIC DEFAULT 50.0
  CHECK (pull_rate_weight > 0 AND pull_rate_weight <= 100);

-- Add index for efficient weighted random selection
CREATE INDEX IF NOT EXISTS idx_player_cards_pull_rate 
ON player_cards(pull_rate_tier, pull_rate_weight, is_active)
WHERE is_active = true;

-- Add comments
COMMENT ON COLUMN player_cards.pull_rate_tier IS 
  'Pull rate tier based on performance: COMMON (50%), UNCOMMON (30%), RARE (15%), EPIC (4%), LEGENDARY (1%)';

COMMENT ON COLUMN player_cards.pull_rate_weight IS 
  'Exact pull weight for weighted random selection. Higher = more common. Updated daily by update-projections function.';

-- Initialize all players to COMMON tier (will be calculated on next projection update)
UPDATE player_cards
SET pull_rate_tier = 'COMMON',
    pull_rate_weight = 50.0
WHERE is_active = true;
```

### Phase 2: Update `update-projections` Edge Function (Week 1)

**Add pull rate calculation logic to existing function:**

```typescript
// Add after projection calculation, before database update

function calculatePullRateTier(
  position: string, 
  seasonPPG: number, 
  gamesPlayed: number,
  injuryStatus: string
): { tier: string; weight: number } {
  
  // Force injured/inactive players to COMMON
  if (['out', 'ir', 'suspended', 'pup'].some(s => 
    injuryStatus.toLowerCase().includes(s))) {
    return { tier: 'COMMON', weight: 50.0 };
  }
  
  // No games played = backup
  if (gamesPlayed === 0) {
    return { tier: 'COMMON', weight: 50.0 };
  }
  
  let baseTier = 'COMMON';
  
  // Position-specific thresholds
  const thresholds: Record<string, { legendary: number; epic: number; rare: number; uncommon: number }> = {
    'Quarterback': { legendary: 22, epic: 18, rare: 14, uncommon: 10 },
    'Running Back': { legendary: 18, epic: 14, rare: 10, uncommon: 6 },
    'Wide Receiver': { legendary: 16, epic: 12, rare: 8, uncommon: 4 },
    'Tight End': { legendary: 14, epic: 10, rare: 6, uncommon: 3 },
  };
  
  const threshold = thresholds[position] || thresholds['Wide Receiver'];
  
  if (seasonPPG >= threshold.legendary) baseTier = 'LEGENDARY';
  else if (seasonPPG >= threshold.epic) baseTier = 'EPIC';
  else if (seasonPPG >= threshold.rare) baseTier = 'RARE';
  else if (seasonPPG >= threshold.uncommon) baseTier = 'UNCOMMON';
  else baseTier = 'COMMON';
  
  // Apply modifiers
  const tierOrder = ['LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON'];
  let tierIndex = tierOrder.indexOf(baseTier);
  
  // Downgrade if low games played (small sample size)
  if (gamesPlayed < 4 && tierIndex < tierOrder.length - 1) {
    tierIndex++;
  }
  
  // Downgrade if questionable/doubtful
  if (['questionable', 'doubtful'].some(s => 
    injuryStatus.toLowerCase().includes(s)) && tierIndex < tierOrder.length - 1) {
    tierIndex++;
  }
  
  const finalTier = tierOrder[tierIndex];
  
  // Map tier to weight
  const tierWeights: Record<string, number> = {
    'LEGENDARY': 1.0,   // 1% chance
    'EPIC': 4.0,        // 4% chance
    'RARE': 15.0,       // 15% chance
    'UNCOMMON': 30.0,   // 30% chance
    'COMMON': 50.0      // 50% chance
  };
  
  return { 
    tier: finalTier, 
    weight: tierWeights[finalTier] 
  };
}
```

**Update the database update query to include pull rates:**

```typescript
// Inside the player update loop, add pull rate calculation
const { tier: pullTier, weight: pullWeight } = calculatePullRateTier(
  player.position,
  seasonAvg,
  gamesPlayed,
  injuryStatus
);

// Add to the existing update query
const { error } = await supabase
  .from('player_cards')
  .update({
    // ... existing fields ...
    pull_rate_tier: pullTier,
    pull_rate_weight: pullWeight,
    // ... rest of fields ...
  })
  .eq('id', player.id);
```

### Phase 3: Update `open-pack` Edge Function (Week 1-2)

**Replace random player selection with weighted selection:**

**OLD CODE (Random):**
```typescript
async function generatePlayerCard(supabaseClient: any) {
  const { data: playerCards, error } = await supabaseClient
    .from('player_cards')
    .select('id, player_name, position, team_abbreviation, image_url, projected_points')
    .in('position', ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End'])
    .eq('is_active', true)

  if (error || !playerCards || playerCards.length === 0) {
    console.error('Error fetching player card:', error)
    return null
  }

  // OLD: Completely random selection
  const playerCard = playerCards[Math.floor(Math.random() * playerCards.length)]
  return playerCard
}
```

**NEW CODE (Weighted by Pull Rate):**
```typescript
async function generatePlayerCard(supabaseClient: any) {
  const { data: playerCards, error } = await supabaseClient
    .from('player_cards')
    .select(`
      id, 
      player_name, 
      position, 
      team_abbreviation, 
      image_url, 
      projected_points,
      pull_rate_tier,
      pull_rate_weight,
      season_ppg
    `)
    .in('position', ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End'])
    .eq('is_active', true)

  if (error || !playerCards || playerCards.length === 0) {
    console.error('Error fetching player card:', error)
    return null
  }

  // NEW: Weighted random selection based on pull_rate_weight
  const totalWeight = playerCards.reduce((sum, p) => sum + (p.pull_rate_weight || 50), 0)
  let randomValue = Math.random() * totalWeight
  
  for (const player of playerCards) {
    randomValue -= (player.pull_rate_weight || 50)
    if (randomValue <= 0) {
      console.log(`Selected ${player.player_name} (${player.position}) - Tier: ${player.pull_rate_tier} (${player.season_ppg} PPG)`)
      return player
    }
  }
  
  // Fallback to first player (should never happen)
  return playerCards[0]
}
```

**Benefits:**
- ✅ Elite players (Mahomes, CMC) have 1% chance
- ✅ Common backups have 50% chance
- ✅ Maintains position distribution (still pulling from same position pool)
- ✅ More exciting pack openings (pulling a LEGENDARY feels special)

### Phase 4: Testing & Validation (Week 2)

**Test scenarios:**

1. **Pull Rate Distribution Test**
   - Open 1000 test packs
   - Verify distribution matches expected rates (~50% COMMON, ~30% UNCOMMON, etc.)

2. **Position Balance Test**
   - Ensure QB/RB/WR/TE ratios remain similar to before
   - Verify pack compositions still balanced

3. **Edge Cases**
   - All players are COMMON (unlikely but possible)
   - Injured star player gets downgraded properly
   - Backup QB who suddenly starts gets upgraded

4. **Performance Test**
   - Measure pack opening latency (should be <500ms)
   - Verify database indexes are being used

### Phase 5: UI Enhancements (Week 3 - Optional)

**A) Pack Shop - Show Pull Rate Odds**

Display probability breakdown in pack shop:

```jsx
// In PackShop.jsx, add odds table
<div className="mb-4 p-3 bg-primary-black-700/50 rounded-lg border border-primary-black-600">
  <p className="text-xs font-bold text-primary-green-400 mb-2">Pull Rate Odds:</p>
  <div className="space-y-1 text-xs text-primary-black-300">
    <div className="flex justify-between">
      <span>🏆 LEGENDARY (Elite Stars)</span>
      <span className="text-yellow-400 font-bold">1%</span>
    </div>
    <div className="flex justify-between">
      <span>💜 EPIC (Top Starters)</span>
      <span className="text-purple-400 font-bold">4%</span>
    </div>
    <div className="flex justify-between">
      <span>💎 RARE (Solid Players)</span>
      <span className="text-blue-400 font-bold">15%</span>
    </div>
    <div className="flex justify-between">
      <span>🟢 UNCOMMON (Rotational)</span>
      <span className="text-green-400 font-bold">30%</span>
    </div>
    <div className="flex justify-between">
      <span>⚪ COMMON (Backups)</span>
      <span className="text-gray-400 font-bold">50%</span>
    </div>
  </div>
  <p className="text-[10px] text-primary-black-400 mt-2 italic">
    ℹ️ Pull rates based on real-world performance. All cards start at Base tier Level 1.
  </p>
</div>
```

**B) Pack Opening - Show Pull Rate Badge**

```jsx
// In PackOpening.jsx, display pull rate tier badge (distinct from card tier)
<div className="absolute top-2 left-2">
  <span className={`
    px-2 py-1 rounded text-xs font-bold
    ${item.data.pull_rate_tier === 'LEGENDARY' ? 'bg-yellow-500 text-black' : ''}
    ${item.data.pull_rate_tier === 'EPIC' ? 'bg-purple-500 text-white' : ''}
    ${item.data.pull_rate_tier === 'RARE' ? 'bg-blue-500 text-white' : ''}
    ${item.data.pull_rate_tier === 'UNCOMMON' ? 'bg-green-500 text-white' : ''}
    ${item.data.pull_rate_tier === 'COMMON' ? 'bg-gray-500 text-white' : ''}
  `}>
    {item.data.pull_rate_tier}
  </span>
</div>

{/* Card tier badge stays on right side - separate display */}
<div className="absolute top-2 right-2">
  <span className="px-2 py-1 rounded text-xs font-bold bg-gray-700 text-white">
    Base • L1
  </span>
</div>
```

**C) Add visual effects for rare pulls:**
```jsx
{item.data.pull_rate_tier === 'LEGENDARY' && (
  <>
    <div className="absolute inset-0 animate-pulse bg-yellow-400/20 pointer-events-none"></div>
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
      <span className="text-6xl animate-bounce">🌟</span>
    </div>
  </>
)}

{item.data.pull_rate_tier === 'EPIC' && (
  <div className="absolute inset-0 bg-purple-500/10 pointer-events-none"></div>
)}
```

**D) Player Profile/Inventory - Show Pull Rate**

Show users how rare their players are:

```jsx
// In PlayerCard.jsx or PlayerProfile.jsx
<div className="flex items-center gap-2 text-sm text-primary-black-300">
  <span>Pull Rarity:</span>
  <span className={`font-bold ${
    pullRateTier === 'LEGENDARY' ? 'text-yellow-400' :
    pullRateTier === 'EPIC' ? 'text-purple-400' :
    pullRateTier === 'RARE' ? 'text-blue-400' :
    pullRateTier === 'UNCOMMON' ? 'text-green-400' :
    'text-gray-400'
  }`}>
    {pullRateTier} ({pullRateWeight}% drop rate)
  </span>
</div>
```

---

## Daily Update Schedule

**Existing Cron Job (Already Running):**
- **Function:** `update-projections`
- **Schedule:** Daily at 3 AM EST
- **Actions:** 
  - Fetch season stats from BallDontLie API
  - Fetch injury reports
  - Calculate fantasy projections
  - **NEW:** Calculate and update pull rate tiers

**No additional cron jobs needed** - pull rates update automatically with projections.

---

## Analytics & Monitoring

### Metrics to Track

1. **Pull Rate Distribution**
   ```sql
   SELECT 
     pull_rate_tier,
     COUNT(*) as player_count,
     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
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

2. **Pack Pull Analytics**
   ```sql
   -- Add transaction metadata tracking
   -- When pack is opened, log which tiers were pulled
   INSERT INTO transactions (user_id, team_id, transaction_type, metadata)
   VALUES (
     p_user_id,
     p_team_id,
     'pack_opening',
     jsonb_build_object(
       'pull_tiers', array['COMMON', 'RARE', 'EPIC', 'COMMON', 'UNCOMMON']
     )
   );
   ```

3. **Player Tier Evolution**
   ```sql
   -- Track how players move between tiers week-to-week
   -- (Only if using Option B: separate pull_rates table)
   ```

---

## Future Enhancements

### Pack-Specific Pull Rates

Different pack types could have different tier distributions:

| Pack Type | Common | Uncommon | Rare | Epic | Legendary |
|-----------|--------|----------|------|------|-----------|
| **Bronze** | 60% | 30% | 9% | 1% | 0% |
| **Silver** | 45% | 35% | 15% | 4% | 1% |
| **Gold** | 30% | 35% | 25% | 8% | 2% |
| **Elite** | 15% | 25% | 35% | 20% | 5% |

**Implementation:**
```typescript
// In open-pack function, apply pack-type multiplier
function applyPackTypeModifier(baseTier: string, packType: string): string {
  if (packType === 'elite') {
    // Elite packs shift distribution toward higher tiers
    const upgradeChance = Math.random()
    if (baseTier === 'COMMON' && upgradeChance < 0.4) return 'UNCOMMON'
    if (baseTier === 'UNCOMMON' && upgradeChance < 0.3) return 'RARE'
    if (baseTier === 'RARE' && upgradeChance < 0.2) return 'EPIC'
  }
  return baseTier
}
```

### Dynamic Adjustment Based on Supply

If too many LEGENDARY players exist (e.g., late season with many injured starters), dynamically adjust thresholds:

```typescript
// Rebalance thresholds to maintain ~1% LEGENDARY distribution
const legendaryCount = await supabase
  .from('player_cards')
  .select('id', { count: 'exact' })
  .eq('pull_rate_tier', 'LEGENDARY')
  .eq('is_active', true)

const totalPlayers = 1000 // Approximate
const targetLegendaryPercent = 0.01 // 1%

if (legendaryCount > totalPlayers * targetLegendaryPercent * 1.5) {
  // Increase thresholds to reduce LEGENDARY tier
  // e.g., QB LEGENDARY threshold: 22 → 24 PPG
}
```

---

## Summary

### What Changes

1. **Database:** Add `pull_rate_tier` and `pull_rate_weight` columns to `player_cards`
2. **update-projections function:** Calculate pull rate tier alongside projections (daily at 3 AM)
3. **open-pack function:** Replace random selection with weighted selection based on pull rates
4. **UI (Optional):** 
   - Display pull rate odds in pack shop
   - Show pull rate badges in pack opening (distinct from card tier)
   - Rare pull celebrations/animations

### What Stays the Same

- ✅ Pack types/prices unchanged
- ✅ Position distribution unchanged (still need 1 QB, 2 RBs, etc.)
- ✅ **Card tier system (Base → Elite) COMPLETELY UNCHANGED**
- ✅ **All pulled players start at Base tier, Level 1**
- ✅ Card leveling/XP system unchanged
- ✅ Gameplay scoring and multipliers unchanged
- ✅ API call frequency unchanged (using existing projection data)

### Critical Points to Remember

🔴 **Pull rate tier ≠ Card tier**
- Pull rate = How hard to **acquire** (1% for Mahomes)
- Card tier = How **strong** in gameplay (starts Base, grows to Elite)

🔴 **All players start equal in gameplay**
- Pulling LEGENDARY Mahomes? Starts Base L1
- Pulling COMMON backup QB? Starts Base L1
- Both level up the same way (fantasy points → XP → levels)

🔴 **Pull rate is about collection rarity, not power**
- Like collecting rare Pokémon cards vs using them in battle
- Rare pull = bragging rights, harder to collect
- Card tier = actual in-game power

### User Impact

- 🎯 **More realistic pack economy** - elite real-world players are harder to pull
- 🎉 **Excitement factor** - pulling a LEGENDARY player feels special (even if he starts Base tier)
- ⚖️ **Fairness** - objectively based on real performance data, not arbitrary
- 📊 **Transparency** - users see pull rate odds before buying packs
- 🎮 **Gameplay unchanged** - pulled players still need to be leveled up through play
- 💎 **Collection value** - owning rare players matters even before they're leveled up

---

## Risks & Mitigation

### Risk 1: Too Few LEGENDARY Players

**Problem:** Only 5-10 players qualify as LEGENDARY → extremely rare pulls

**Mitigation:**
- Monitor distribution weekly
- Adjust thresholds if needed (e.g., reduce QB LEGENDARY from 22 to 20 PPG)
- Ensure at least 10-15 players per tier

### Risk 2: Position Imbalance

**Problem:** All LEGENDARYs are RBs, no LEGENDARY QBs

**Mitigation:**
- Position-specific thresholds already account for this
- Monitor tier distribution by position
- Manual overrides for edge cases (e.g., Lamar Jackson is LEGENDARY even if just under threshold)

### Risk 3: Performance Impact

**Problem:** Weighted random selection slows down pack opening

**Mitigation:**
- Database index on `(pull_rate_tier, pull_rate_weight, is_active)`
- Limit player pool to active players only
- Benchmark: Should add <50ms to pack opening

### Risk 4: Mid-Season Tier Shifts

**Problem:** Player gets injured → LEGENDARY → COMMON overnight

**Mitigation:**
- Injury status already reduces tier, not eliminates it immediately
- Gradual tier changes (Questionable → -1 tier, Out → -2 tiers)
- Historical tier tracking could smooth transitions

---

## Next Steps

1. **Review & Approve Plan** - Get stakeholder buy-in
2. **Create Migration** - Add database columns
3. **Update Edge Functions** - Implement tier calculation and weighted selection
4. **Test Locally** - Verify distribution matches expectations
5. **Deploy to Production** - Push migration and function updates
6. **Monitor Analytics** - Track tier distribution and user feedback
7. **Iterate** - Adjust thresholds based on data

---

**Estimated Timeline:** 1-2 weeks for full implementation
**Effort:** Medium (primarily backend logic, minimal UI changes)
**Impact:** High (significantly improves pack economy and user engagement)
