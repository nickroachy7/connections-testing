# Game Rebalancing - Implementation Plan

**Reference**: See `GAME_BALANCE_ANALYSIS.md` for full analysis  
**Priority**: 🔴 CRITICAL  
**Estimated Time**: 4-6 hours

---

## Quick Summary

The game economy is **too generous** - players get too many coins, packs are too cheap, cards sell for too much, and progression is too fast. This creates "pack flipping exploits" where players can buy packs, sell cards, and profit infinitely.

**Key changes**:
1. ✂️ Starting coins: 750 → **200**
2. 📈 Pack costs: +50-60% across the board
3. 📉 Card base values: -50% reduction
4. 🎯 Pull rates: Make elite players rarer, solid starters less common
5. ⏱️ XP thresholds: 1.5x harder to level up
6. 💰 Add coin sinks (optional): Premium contests, cosmetics

---

## Implementation Steps

### Step 1: Database Migration - Economy Values (30 min)

Create migration: `20251119_rebalance_economy.sql`

```sql
-- =====================================================
-- ECONOMY REBALANCING MIGRATION
-- Date: 2025-11-19
-- Purpose: Fix overly generous economy and prevent pack flipping
-- =====================================================

-- 1. Reduce starting coins (750 → 200)
ALTER TABLE teams ALTER COLUMN coins SET DEFAULT 200;

COMMENT ON COLUMN teams.coins IS 'Team coins - Default 200 (rebalanced from 750 on 2025-11-19)';

-- 2. Update pack costs
UPDATE packs SET coin_cost = 
  CASE pack_type
    WHEN 'bronze' THEN 150  -- Was 100 (+50%)
    WHEN 'silver' THEN 400  -- Was 250 (+60%)
    WHEN 'gold' THEN 750    -- Was 500 (+50%)
    WHEN 'elite' THEN 1500  -- Was 1000 (+50%)
    ELSE coin_cost
  END;

COMMENT ON TABLE packs IS 'Pack shop inventory - Costs rebalanced 2025-11-19 to prevent pack flipping';

-- 3. Reduce player card base values (50% reduction for balanced EV)
UPDATE player_cards 
SET base_value = GREATEST(10, ROUND(base_value * 0.5))
WHERE base_value IS NOT NULL;

COMMENT ON COLUMN player_cards.base_value IS 'Base sell value in coins - Rebalanced 2025-11-19 (50% reduction)';

-- 4. Reduce token card base values (50% reduction)
UPDATE token_cards 
SET base_value = GREATEST(10, ROUND(base_value * 0.5))
WHERE base_value IS NOT NULL;

COMMENT ON COLUMN token_cards.base_value IS 'Base sell value in coins - Rebalanced 2025-11-19 (50% reduction)';

-- 5. Update XP thresholds (1.5x harder to level)
UPDATE card_level_thresholds SET experience_required = 
  CASE level
    WHEN 2 THEN 150   -- Was 100 (1.5x)
    WHEN 3 THEN 375   -- Was 250 (1.5x)
    WHEN 4 THEN 750   -- Was 500 (1.5x)
    WHEN 5 THEN 1500  -- Was 1000 (1.5x) - Starter tier
    WHEN 6 THEN 2625  -- Was 1750 (1.5x)
    WHEN 7 THEN 4125  -- Was 2750 (1.5x) - All-Star tier
    WHEN 8 THEN 6000  -- Was 4000 (1.5x)
    WHEN 9 THEN 9000  -- Was 6000 (1.5x) - Elite tier
    WHEN 10 THEN 15000 -- Was 10000 (1.5x) - Max level
    ELSE experience_required
  END;

COMMENT ON TABLE card_level_thresholds IS 'Card leveling XP requirements - Rebalanced 2025-11-19 (1.5x harder)';

-- =====================================================
-- OPTIONAL: Reset existing user coins (for beta testing)
-- =====================================================
-- Uncomment if you want to reset all active teams to 200 coins
-- UPDATE teams SET coins = 200 WHERE is_active = true;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Check new pack costs
-- SELECT pack_type, coin_cost FROM packs ORDER BY coin_cost;

-- Check base value distribution
-- SELECT 
--   MIN(base_value) as min_val, 
--   MAX(base_value) as max_val, 
--   ROUND(AVG(base_value)) as avg_val 
-- FROM player_cards;

-- Check XP thresholds
-- SELECT level, tier, experience_required, stat_multiplier 
-- FROM card_level_thresholds 
-- ORDER BY level;
```

**Run migration**:
```bash
# Use Supabase MCP tool
mcp_supabase_apply_migration with the above SQL
```

---

### Step 2: Update Sell Value Multipliers (20 min)

Update: `supabase/functions/quick-sell-card/index.ts`

**Changes needed**:
1. Reduce scarcity multipliers
2. Reduce performance multipliers
3. Lower minimum sell value (50 → 10)

```typescript
// In calculateDynamicSellValue function

// UPDATED: Scarcity multiplier (REDUCED from original)
let scarcityMultiplier = 1.0
if (pullPercentage <= 5) scarcityMultiplier = 2.0        // Was 3.0 - LEGENDARY
else if (pullPercentage <= 15) scarcityMultiplier = 1.5   // Was 2.0 - EPIC
else if (pullPercentage <= 30) scarcityMultiplier = 1.3   // Was 1.5 - RARE
else if (pullPercentage <= 50) scarcityMultiplier = 1.1   // Was 1.2 - UNCOMMON
// else COMMON = 1.0

// UPDATED: Performance multiplier (REDUCED from original)
let performanceMultiplier = 1.0
if (seasonPPG >= 20) performanceMultiplier = 1.3      // Was 1.5 - Elite performers
else if (seasonPPG >= 15) performanceMultiplier = 1.2  // Was 1.3 - High performers
else if (seasonPPG >= 10) performanceMultiplier = 1.1  // Was 1.1 - Solid performers
else if (seasonPPG >= 5) performanceMultiplier = 1.0   // Was 1.0 - Average performers
else if (seasonPPG < 5) performanceMultiplier = 0.7    // Was 0.8 - Low performers

// ... rest of calculation

// UPDATED: Minimum sell value (was 50, now 10)
const roundedValue = Math.round(rawValue / 5) * 5
return Math.max(10, roundedValue)
```

**Also update**: `src/utils/sellValueCalculator.js` (frontend copy)

---

### Step 3: Update Pull Rate Algorithm (30 min)

Update: `supabase/functions/calculate-pull-rates/index.ts`

**Changes needed**:
1. Raise PPG thresholds for tier assignments
2. Lower pull percentages for elite/top players
3. Raise pull percentages for solid starters (make less common)

```typescript
// In calculatePullPercentage function

// UPDATED: Position thresholds (RAISED for stricter tiers)
const thresholds: Record<string, any> = {
  'Quarterback': { elite: 24, top: 20, solid: 16, rotational: 12 },   // Was 22/18/14/10
  'Running Back': { elite: 20, top: 16, solid: 12, rotational: 8 },    // Was 18/14/10/6
  'Wide Receiver': { elite: 18, top: 14, solid: 10, rotational: 6 },   // Was 16/12/8/4
  'Tight End': { elite: 16, top: 12, solid: 8, rotational: 4 },        // Was 14/10/6/3
};

// UPDATED: Pull percentage assignments (lower % = rarer)
let basePercentage = 85.0; // Default for backups (was 95.0)

if (seasonPPG >= threshold.elite) basePercentage = 1.0;        // Was 2.0 - LEGENDARY (0.5-1%)
else if (seasonPPG >= threshold.top) basePercentage = 10.0;    // Was 18.0 - EPIC (8-12%)
else if (seasonPPG >= threshold.solid) basePercentage = 25.0;  // Was 45.0 - RARE (20-25%)
else if (seasonPPG >= threshold.rotational) basePercentage = 55.0; // Was 70.0 - UNCOMMON (45-55%)
// else: 85.0% (was 95.0%) - COMMON backups (10-15%)

// ... rest of modifiers stay the same
```

**Deploy edge function**:
```bash
mcp_supabase_deploy_edge_function with updated code
```

**Trigger recalculation**:
```bash
curl -X POST "https://zgxzxfjlpnrdvtjekncg.supabase.co/functions/v1/calculate-pull-rates" \
  -H "Authorization: Bearer <ANON_KEY>"
```

---

### Step 4: Update Frontend Display Values (15 min)

Update: `src/pages/PackShop.jsx`

**Change pack cost displays** (should auto-update from database, but verify):

```jsx
// Verify pack costs are fetched from database
const { data: packs } = await supabase
  .from('packs')
  .select('*')
  .eq('is_available', true);

// Costs should now show:
// Bronze: 150 (was 100)
// Silver: 400 (was 250)
// Gold: 750 (was 500)
// Elite: 1500 (was 1000)
```

Update: `src/utils/sellValueCalculator.js`

**Apply same multiplier changes** as in `quick-sell-card/index.ts` (Step 2).

---

### Step 5: Testing & Validation (60 min)

#### 5.1 Database Checks

```sql
-- Verify pack costs updated
SELECT pack_type, coin_cost FROM packs ORDER BY coin_cost;
-- Expected: Bronze 150, Silver 400, Gold 750, Elite 1500

-- Verify base values reduced
SELECT 
  MIN(base_value) as min_val, 
  MAX(base_value) as max_val, 
  ROUND(AVG(base_value)) as avg_val 
FROM player_cards;
-- Expected: min ~10, max ~125, avg ~27

-- Verify XP thresholds increased
SELECT level, tier, experience_required 
FROM card_level_thresholds 
ORDER BY level;
-- Expected: L2=150, L3=375, L5=1500, L10=15000

-- Check pull rate distribution
SELECT 
  CASE 
    WHEN pull_percentage <= 2 THEN 'Elite (≤2%)'
    WHEN pull_percentage <= 15 THEN 'Top (2-15%)'
    WHEN pull_percentage <= 30 THEN 'Solid (15-30%)'
    WHEN pull_percentage <= 60 THEN 'Rotational (30-60%)'
    ELSE 'Backup (60%+)'
  END as tier,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as pct
FROM player_cards
WHERE is_active = true
GROUP BY 1
ORDER BY 1;
-- Expected distribution:
-- Elite: ~0.5-1%
-- Top: ~8-12%
-- Solid: ~20-25%
-- Rotational: ~45-55%
-- Backup: ~10-15%
```

#### 5.2 Functional Tests

**Test 1: New Team Creation**
1. Create a new team
2. Verify starting coins = **200** (not 750)
3. Open starter pack
4. Verify received 6 players + 4 tokens
5. Check that user has exactly 200 coins after pack

**Test 2: Pack Economics**
1. Buy Bronze pack (150 coins)
2. Open pack (3 players, 1 token)
3. Quick sell all cards
4. Verify total return is ~80-110 coins (loss of 40-70)
5. Confirm user cannot infinitely profit from pack flipping

**Test 3: Sell Values**
1. Find a base tier, common player (~50% pull rate, 12 PPG)
2. Verify sell value ~12-20 coins (was ~80-130)
3. Find an elite tier, legendary player (2% pull rate, 22 PPG)
4. Verify sell value ~300-400 coins (was ~1000+)

**Test 4: Leveling Progression**
1. Create test player card with 0 XP
2. Award 150 XP (simulating ~10 games)
3. Verify player is Level 2 (was previously Level 3)
4. Award 1500 XP total
5. Verify player reaches Level 5 / Starter tier

**Test 5: Pull Rate Distribution**
1. Simulate 100 pack openings
2. Track player quality distribution
3. Verify ~20-25% are solid starters (was ~45%)
4. Verify <1% are elite players (was ~2%)

#### 5.3 Edge Cases

- [ ] User with 0 coins cannot buy packs
- [ ] User with 100 coins cannot buy Bronze pack (150 cost)
- [ ] Selling a card with 10 base_value returns minimum 10 coins
- [ ] Leveling from L9 → L10 requires 15000 XP (not 10000)

---

### Step 6: Deployment Checklist

**Pre-Deployment**:
- [ ] Review `GAME_BALANCE_ANALYSIS.md` for rationale
- [ ] Test migration on local/dev Supabase instance
- [ ] Backup current `teams`, `packs`, `player_cards`, `card_level_thresholds` tables
- [ ] Notify active users of economy changes (if in production)

**Deployment Order**:
1. [ ] Run database migration (`20251119_rebalance_economy.sql`)
2. [ ] Deploy `quick-sell-card` edge function
3. [ ] Deploy `calculate-pull-rates` edge function
4. [ ] Trigger pull rate recalculation
5. [ ] Update frontend (`sellValueCalculator.js`)
6. [ ] Deploy frontend changes (Vercel)

**Post-Deployment**:
- [ ] Monitor error logs for 24 hours
- [ ] Check average user coins (target: 100-300)
- [ ] Verify pack purchase rate decreased
- [ ] Gather user feedback on economy changes

---

## Rollback Plan

If rebalance causes major issues:

```sql
-- ROLLBACK MIGRATION

-- Restore starting coins
ALTER TABLE teams ALTER COLUMN coins SET DEFAULT 750;

-- Restore pack costs
UPDATE packs SET coin_cost = 
  CASE pack_type
    WHEN 'bronze' THEN 100
    WHEN 'silver' THEN 250
    WHEN 'gold' THEN 500
    WHEN 'elite' THEN 1000
    ELSE coin_cost
  END;

-- Restore base values (2x increase)
UPDATE player_cards SET base_value = base_value * 2;
UPDATE token_cards SET base_value = base_value * 2;

-- Restore XP thresholds
UPDATE card_level_thresholds SET experience_required = 
  CASE level
    WHEN 2 THEN 100
    WHEN 3 THEN 250
    WHEN 4 THEN 500
    WHEN 5 THEN 1000
    WHEN 6 THEN 1750
    WHEN 7 THEN 2750
    WHEN 8 THEN 4000
    WHEN 9 THEN 6000
    WHEN 10 THEN 10000
    ELSE experience_required
  END;
```

Then redeploy original edge functions and frontend.

---

## Optional Enhancements (Phase 2)

### Coin Sinks

**1. Premium Contests** (30 min)
```sql
-- Add entry fees to contest types
ALTER TABLE contest_types ADD COLUMN IF NOT EXISTS entry_fee INTEGER DEFAULT 0;

-- Create premium contest
INSERT INTO contest_types (name, display_name, entry_fee, total_weeks, max_losses, ...) 
VALUES ('premium_3w', 'Premium 3-Week Sprint', 50, 3, 1, ...);
```

**2. Cosmetic Shop** (2 hours)
```sql
CREATE TABLE cosmetic_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('badge', 'banner', 'card_frame')),
  coin_cost INTEGER NOT NULL,
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  is_available BOOLEAN DEFAULT TRUE
);

CREATE TABLE user_cosmetics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cosmetic_id UUID REFERENCES cosmetic_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cosmetic_id)
);
```

**3. Lineup Optimizer Fee** (15 min)
```javascript
// In LineupOptimizer component
const OPTIMIZER_COST = 25;

const handleOptimize = async () => {
  if (userCoins < OPTIMIZER_COST) {
    toast.error('Not enough coins to use optimizer');
    return;
  }
  
  // Deduct coins
  await supabase.rpc('deduct_team_coins', { 
    p_team_id: activeTeam.id, 
    p_amount: OPTIMIZER_COST 
  });
  
  // Run optimizer
  // ...
};
```

---

## Success Metrics (Track for 2 Weeks)

### Week 1
- [ ] Average user coins: 100-300 (down from 500-1000)
- [ ] Pack purchases per user: 2-3/week (down from 5-10)
- [ ] Card sell rate: <40% of pulls (down from ~70%)
- [ ] User complaints about "too hard" < 10%

### Week 2
- [ ] Players with 0 coins: <5% (indicates good balance)
- [ ] Elite card ownership: <5% of rosters
- [ ] Average player level: 2-3 (was 3-5)
- [ ] Retention rate: ≥80% of pre-rebalance

---

## Communication Plan

**Announcement Template** (for users):

> **🎮 Economy Rebalancing Update**
>
> We've made important changes to improve long-term game balance:
>
> **What's Changed:**
> - Starting coins reduced to make early choices more meaningful
> - Pack costs increased to create strategic purchasing decisions
> - Card values adjusted for healthier economy
> - Leveling progression extended to reward long-term investment
>
> **Why?**
> - Prevent infinite pack-flipping exploits
> - Make rare cards feel truly rare
> - Create more engaging progression
> - Ensure game remains fun for months, not just weeks
>
> **What This Means for You:**
> - Coins are more valuable - spend wisely!
> - Pack openings feel more rewarding
> - Building elite rosters takes dedication
> - Your strategic choices matter more
>
> Thanks for your patience as we balance the game. Your feedback is invaluable!

---

**END OF IMPLEMENTATION PLAN**

All changes ready for execution. Review and approve before proceeding.
