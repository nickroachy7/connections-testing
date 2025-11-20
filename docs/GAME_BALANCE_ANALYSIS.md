# Game Balance Analysis & Rebalancing Plan

**Date**: November 19, 2025  
**Status**: CRITICAL - Economy Requires Immediate Rebalancing

---

## Executive Summary

After comprehensive audit of the game economy, **MAJOR BALANCE ISSUES** have been identified that make the game too easy and reduce long-term engagement. Players are receiving excessive rewards, pack values are too high, and progression is too fast.

### Critical Problems Identified

1. ❌ **Starting coins too high** (750 coins)
2. ❌ **Pack costs too low** relative to rewards
3. ❌ **Sell values too generous** (cards selling for 200-500+ coins)
4. ❌ **Pull rates give too many good players** (solid starters are 45% pull rate)
5. ❌ **Player card base values inflated** (25-250 coins, avg 54)
6. ❌ **Token base values too high** (likely similar issue)
7. ❌ **Progression too fast** (XP thresholds too low)
8. ❌ **No coin sinks** - players accumulate wealth easily

---

## Current Economy Audit

### Starting Resources
| Resource | Current Value | Issue |
|----------|---------------|-------|
| Starting Coins | **750** | WAY too high - player can buy 7+ Bronze packs immediately |
| Starter Pack | 6 players + 4 tokens | Reasonable |

### Pack Pricing & Contents
| Pack Type | Cost | Players | Tokens | Value Analysis |
|-----------|------|---------|--------|----------------|
| Bronze | 100 coins | 3 | 1 | ⚠️ Too cheap - avg return ~150-200 coins from selling |
| Silver | 250 coins | 5 | 2 | ⚠️ Too cheap - avg return ~400-500 coins |
| Gold | 500 coins | 7 | 3 | ⚠️ Neutral to profitable |
| Elite | 1000 coins | 10 | 5 | ⚠️ Guaranteed profit on average |

**Problem**: Players can buy packs, sell unwanted cards, and **make a profit** or break even. This creates an infinite loop where skilled players never run out of resources.

### Sell Value Economics

**Current Formula**:
```javascript
base_value × tier_mult × scarcity_mult × performance_mult
```

**Multipliers**:
- Tier: 1.0x (base) → 3.0x (elite)
- Scarcity: 1.0x (common) → 3.0x (legendary, ≤5% pull rate)
- Performance: 0.8x (bad) → 1.5x (elite, ≥20 PPG)

**Example Calculations**:
- Base tier trash player (50% pull rate, 5 PPG): `100 × 1.0 × 1.0 × 0.8 = 80 coins`
- Base tier solid starter (45% pull rate, 12 PPG): `100 × 1.0 × 1.2 × 1.1 = 132 coins`
- Base tier elite player (2% pull rate, 22 PPG): `100 × 1.0 × 3.0 × 1.5 = 450 coins`

**Problem**: Even BASE tier cards sell for 50-450 coins. A Bronze pack (100 coins) gives 3 players, which on average sell for 150-300 coins total = **50-200% profit**.

### Pull Rate Distribution

**Current Distribution** (from calculate-pull-rates function):
| Pull Tier | Pull % | Player Quality | Issue |
|-----------|--------|----------------|-------|
| Elite | 2% | 22+ PPG | ⚠️ Should be rarer (0.5-1%) |
| Top | 18% | 18-22 PPG | ⚠️ Too common |
| Solid | 45% | 14-18 PPG | ⚠️ WAY too common - should be ~25% |
| Rotational | 70% | 10-14 PPG | ⚠️ Should be more common |
| Backup | 95% | <10 PPG | ⚠️ Should be most common (~40-50%) |

**Note**: Lower pull_percentage = rarer/better (inverted system). The current distribution gives players solid starters (45%) most often, which is too generous.

### Card Leveling & Progression

**Current XP Thresholds**:
| Level | XP Required | Tier | Multiplier | Issue |
|-------|-------------|------|------------|-------|
| 1 | 0 | Base | 1.00x | ✅ |
| 2 | 100 | Base | 1.05x | ⚠️ Too easy |
| 3 | 250 | Role Player | 1.10x | ⚠️ Too easy |
| 4 | 500 | Role Player | 1.15x | ⚠️ Too easy |
| 5 | 1000 | Starter | 1.20x | ⚠️ Too easy |
| 6 | 1750 | Starter | 1.25x | OK |
| 7 | 2750 | All-Star | 1.30x | OK |
| 8 | 4000 | All-Star | 1.35x | OK |
| 9 | 6000 | Elite | 1.40x | OK |
| 10 | 10000 | Elite | 1.50x | OK |

**XP Award Rate**: Players earn XP equal to fantasy points scored. A good performance (15-20 pts) awards 15-20 XP.

**Problem**: 
- Level 2 achieved in **1 good game** (100 XP)
- Level 3 achieved in **2-3 games** (250 XP)
- Level 5 (Starter tier) achieved in **~5-7 weeks** of active play

This is **TOO FAST**. Players should feel like leveling cards is a long-term goal, not something achieved in a few weeks.

### Player Card Base Values

**Current Range**: 25-250 coins (avg: 54 coins)

**Problem**: Base values are too high. Even the worst cards sell for 25 coins minimum, making it impossible to lose money on pack purchases.

---

## Identified Exploits & Gameplay Issues

### 1. **Pack Flipping Exploit** 🚨 CRITICAL
**How it works**:
1. Player buys Bronze pack (100 coins)
2. Gets 3 random players
3. Sells all 3 players (avg 40-60 coins each = 120-180 coins)
4. Net profit: 20-80 coins per pack
5. Repeat infinitely

**Impact**: Players can never run out of coins as long as they keep flipping packs.

### 2. **No Coin Sinks**
**Problem**: Players accumulate coins from:
- Contest rewards
- Selling cards
- (Future) daily login bonuses

But there are **NO recurring expenses**:
- No lineup entry fees (contests are free)
- No maintenance costs
- No prestige/cosmetic items to chase
- No limited-time offers

**Impact**: Veteran players have thousands of unused coins.

### 3. **Base Value Floor Too High**
**Problem**: Minimum sell value is 50 coins (even trash cards).

**Impact**: 
- Bronze pack (100 coins) = 3 cards × 50 = 150 coins minimum
- Silver pack (250 coins) = 5 cards × 50 = 250 coins minimum
- Players literally cannot lose money

### 4. **Pull Rates Too Generous**
**Problem**: 45% of all pulls are "Solid Starters" (14-18 PPG players).

**Impact**: Every pack feels like a "win". Players expect good cards every time, reducing excitement and devaluing rare cards.

### 5. **Fast Leveling Devalues Tiers**
**Problem**: Players reach Starter tier (Level 5) in ~7 weeks of play.

**Impact**: 
- No long-term progression goal
- Elite tier feels achievable too quickly
- New players' rosters look similar to veterans within a month

### 6. **Sell Multipliers Stack Too Generously**
**Problem**: Tier (3x) × Scarcity (3x) × Performance (1.5x) = up to 13.5x multiplier on elite cards.

**Impact**: Pulling a rare elite player = instant 600+ coin windfall.

---

## Rebalancing Goals

### Primary Objectives
1. ✅ **Reduce starting coins** to create early scarcity (200-300 range)
2. ✅ **Increase pack costs** to make purchases meaningful decisions
3. ✅ **Lower sell values** to prevent pack flipping exploits
4. ✅ **Rebalance pull rates** to make good cards feel special
5. ✅ **Slow progression** to create long-term engagement
6. ✅ **Add coin sinks** to prevent wealth accumulation
7. ✅ **Maintain fun factor** - game should still feel rewarding

### Design Principles
- **Scarcity drives engagement**: Players should carefully consider every purchase
- **Progression should be visible but gradual**: Leveling up should feel earned
- **Rare cards should feel rare**: Pulling an elite player should be exciting
- **Losses are healthy**: Players should sometimes make suboptimal decisions and learn
- **Comeback mechanics**: Eliminated players should have paths to rebuild

---

## Proposed Rebalancing Changes

### Phase 1: Economy Adjustments (IMMEDIATE)

#### 1.1 Starting Resources
```sql
-- Current: 750 coins
-- Proposed: 200 coins

ALTER TABLE teams ALTER COLUMN coins SET DEFAULT 200;
```

**Rationale**: 
- 200 coins = 2 Bronze packs OR 0.8 Silver packs
- Forces meaningful choice: "Do I buy 2 Bronze or save for Silver?"
- Creates early-game scarcity without being punishing
- Starter pack still gives 6 players, so user isn't stuck

#### 1.2 Pack Pricing
| Pack Type | Current Cost | New Cost | Change | Rationale |
|-----------|--------------|----------|--------|-----------|
| Bronze | 100 | **150** | +50% | Should be decision, not impulse |
| Silver | 250 | **400** | +60% | Mid-tier investment |
| Gold | 500 | **750** | +50% | Premium purchase |
| Elite | 1000 | **1500** | +50% | Luxury/whale tier |

**Expected returns** (after rebalancing sell values):
- Bronze: 100-130 coins (loss of 20-50)
- Silver: 250-350 coins (loss of 50-150)
- Gold: 450-600 coins (loss of 150-300)
- Elite: 900-1200 coins (loss of 300-600)

#### 1.3 Player Card Base Values
```sql
-- Current: 25-250 coins (avg 54)
-- Proposed: 5-75 coins (avg ~18)

-- Apply 70% reduction across the board
UPDATE player_cards 
SET base_value = GREATEST(5, ROUND(base_value * 0.3));
```

**Impact**:
- Top players: 250 → 75 coins
- Average players: 50 → 15 coins
- Trash players: 25 → 5 coins
- Minimum floor: 5 coins (prevents worthless cards)

#### 1.4 Sell Value Formula Adjustments

**Reduce multiplier stacking**:
```javascript
// OLD: base × tier × scarcity × performance
// NEW: base × tier × (scarcity_adj) × (performance_adj)

// Scarcity multiplier (REDUCED)
if (pullPercentage <= 5) scarcityMultiplier = 2.0;        // Was 3.0
else if (pullPercentage <= 15) scarcityMultiplier = 1.5;  // Was 2.0
else if (pullPercentage <= 30) scarcityMultiplier = 1.3;  // Was 1.5
else if (pullPercentage <= 50) scarcityMultiplier = 1.1;  // Was 1.2
// else 1.0 (common)

// Performance multiplier (REDUCED)
if (seasonPPG >= 20) performanceMultiplier = 1.3;      // Was 1.5
else if (seasonPPG >= 15) performanceMultiplier = 1.2; // Was 1.3
else if (seasonPPG >= 10) performanceMultiplier = 1.1; // Was 1.1
else if (seasonPPG >= 5) performanceMultiplier = 1.0;  // Was 1.0
else performanceMultiplier = 0.7;                       // Was 0.8

// Minimum sell value: 5 coins (was 50)
```

**Example New Calculations**:
- Base tier trash (50% pull, 5 PPG): `15 × 1.0 × 1.0 × 0.7 = 11 coins` (was 80)
- Base tier solid (45% pull, 12 PPG): `15 × 1.0 × 1.1 × 1.1 = 18 coins` (was 132)
- Base tier elite (2% pull, 22 PPG): `75 × 1.0 × 2.0 × 1.3 = 195 coins` (was 450)
- Elite tier elite (2% pull, 22 PPG): `75 × 3.0 × 2.0 × 1.3 = 585 coins` (was 1350)

#### 1.5 Token Base Values
```sql
-- Assuming similar reduction as player cards
UPDATE token_cards 
SET base_value = GREATEST(5, ROUND(base_value * 0.3));
```

### Phase 2: Pull Rate Rebalancing

#### 2.1 Adjusted Pull Percentage Algorithm

**Goal**: Make backups/rotational more common, elite players rare.

```typescript
// UPDATED calculatePullPercentage() function

// Position thresholds (RAISED for stricter tiers)
const thresholds: Record<string, any> = {
  'Quarterback': { elite: 24, top: 20, solid: 16, rotational: 12 },  // Was 22/18/14/10
  'Running Back': { elite: 20, top: 16, solid: 12, rotational: 8 },   // Was 18/14/10/6
  'Wide Receiver': { elite: 18, top: 14, solid: 10, rotational: 6 },  // Was 16/12/8/4
  'Tight End': { elite: 16, top: 12, solid: 8, rotational: 4 },       // Was 14/10/6/3
};

// NEW Pull percentage assignments (INVERTED - lower is rarer)
if (seasonPPG >= threshold.elite) basePercentage = 1.0;        // Was 2.0 - LEGENDARY
else if (seasonPPG >= threshold.top) basePercentage = 10.0;    // Was 18.0 - EPIC
else if (seasonPPG >= threshold.solid) basePercentage = 25.0;  // Was 45.0 - RARE
else if (seasonPPG >= threshold.rotational) basePercentage = 55.0; // Was 70.0 - UNCOMMON
// else: 85.0% (was 95.0%) - COMMON backups
```

**Expected Distribution**:
| Pull Tier | Old % | New % | Change |
|-----------|-------|-------|--------|
| Elite (1-2%) | Too common at 2% | **~0.5-1%** | Rarer |
| Top (10-15%) | 18% too common | **~8-12%** | Reduced |
| Solid (25-30%) | 45% WAY too high | **~20-25%** | Halved |
| Rotational (55%) | 70% | **~45-55%** | Increased |
| Backup (85%) | 95% | **~10-15%** | Slightly reduced |

**Rationale**: 
- Most pulls (45-55%) should be rotational/role players
- Solid starters (25%) feel earned, not guaranteed
- Elite players (<1%) feel like jackpot moments

### Phase 3: Progression Rebalancing

#### 3.1 XP Threshold Adjustments

**Goal**: Slow down early levels, maintain late-game grind.

```sql
-- Current vs Proposed XP Thresholds
UPDATE card_level_thresholds SET experience_required = 
  CASE level
    WHEN 2 THEN 200  -- Was 100 (2x harder)
    WHEN 3 THEN 500  -- Was 250 (2x harder)
    WHEN 4 THEN 1000 -- Was 500 (2x harder)
    WHEN 5 THEN 2000 -- Was 1000 (2x harder)
    WHEN 6 THEN 3500 -- Was 1750 (2x harder)
    WHEN 7 THEN 5500 -- Was 2750 (2x harder)
    WHEN 8 THEN 8000 -- Was 4000 (2x harder)
    WHEN 9 THEN 12000 -- Was 6000 (2x harder)
    WHEN 10 THEN 20000 -- Was 10000 (2x harder)
    ELSE experience_required
  END;
```

**Impact**:
- Level 2: Now 2 good games (was 1)
- Level 3 (Role Player): Now ~4 weeks (was 2-3 games)
- Level 5 (Starter): Now ~14-16 weeks (was 7 weeks)
- Level 10 (Elite Max): Now full season+ investment

**Games to Level Calculation** (assuming 15 pts/game avg):
| Level | Old XP | Old Games | New XP | New Games | Weeks (1 game/week) |
|-------|--------|-----------|--------|-----------|---------------------|
| 2 | 100 | 7 | 200 | 13 | 13 |
| 3 | 250 | 17 | 500 | 33 | 33 |
| 5 | 1000 | 67 | 2000 | 133 | 133 (2.5 seasons) |
| 10 | 10000 | 667 | 20000 | 1333 | Never (5+ seasons) |

**Note**: This might be TOO harsh. Consider **1.5x multiplier** instead of 2x:
- Level 5: 1500 XP (100 games = 1.5 seasons)
- Level 10: 15000 XP (1000 games = ~3 full seasons)

#### 3.2 XP Award Rate Options

**Option A**: Reduce XP awards
```sql
-- Award 50% of fantasy points as XP instead of 1:1
award_player_xp(..., p_fantasy_points * 0.5)
```

**Option B**: Keep 1:1 ratio but use 1.5x XP thresholds (RECOMMENDED)

### Phase 4: New Coin Sinks

#### 4.1 Contest Entry Fees (Optional)
```sql
-- Add entry fee to contest_types table
ALTER TABLE contest_types ADD COLUMN entry_fee INTEGER DEFAULT 0;

-- Premium contests with better rewards
INSERT INTO contest_types (name, display_name, entry_fee, ...) VALUES
  ('premium_3w', 'Premium 3-Week Sprint', 50, ...);
```

**Rationale**: Free contests still exist, but premium contests offer better rewards for players willing to invest.

#### 4.2 Lineup Optimization Tool (Coin Cost)
```javascript
// Charge 25 coins to use AI lineup optimizer
const OPTIMIZER_COST = 25;
```

#### 4.3 Cosmetics & Vanity Items
```sql
-- Team badges, profile banners, card skins
CREATE TABLE cosmetic_shop (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL, -- 'badge', 'banner', 'card_skin'
  coin_cost INTEGER NOT NULL,
  is_limited_time BOOLEAN DEFAULT FALSE
);
```

#### 4.4 Pack Insurance (Optional)
```javascript
// Pay 20% extra for "guaranteed rare or better" in pack
const INSURANCE_MULTIPLIER = 1.2;
```

---

## Implementation Priority

### 🔴 CRITICAL (Do First)
1. **Reduce starting coins** (750 → 200)
2. **Increase pack costs** (Bronze 100 → 150, etc.)
3. **Lower player base values** (70% reduction)
4. **Update sell value multipliers** (reduce scarcity/performance bonuses)

### 🟡 HIGH PRIORITY (Do Soon)
5. **Rebalance pull rates** (make elite rarer, solid less common)
6. **Adjust XP thresholds** (1.5x-2x harder to level)

### 🟢 MEDIUM PRIORITY (Nice to Have)
7. **Add coin sinks** (premium contests, cosmetics, optimizer fees)
8. **Roster limits enforcement** (prevent hoarding)

---

## Testing & Validation

### Pre-Launch Checks
- [ ] Simulate 100 Bronze pack purchases → Avg loss 20-50 coins
- [ ] Simulate 100 Silver pack purchases → Avg loss 50-150 coins
- [ ] Check pull rate distribution matches target (25% solid, <1% elite)
- [ ] Verify new player with 200 coins + starter pack can build full lineup
- [ ] Verify leveling a card to Level 5 takes ~1.5 seasons

### Metrics to Monitor Post-Launch
- Average coins per active user (target: 100-500)
- Pack purchase frequency (target: 2-3 per week)
- Card sell rate (target: 30-50% of pulls sold)
- Average roster size (target: 15-25 players)
- Days to reach Level 5 (target: 90-120 days)

---

## Migration Strategy

### Option A: Hard Reset (RECOMMENDED for Beta)
```sql
-- Reset all user coins to 200
UPDATE teams SET coins = 200;

-- Update pack costs
UPDATE packs SET coin_cost = 
  CASE pack_type
    WHEN 'bronze' THEN 150
    WHEN 'silver' THEN 400
    WHEN 'gold' THEN 750
    WHEN 'elite' THEN 1500
    ELSE coin_cost
  END;

-- Reduce base values
UPDATE player_cards SET base_value = GREATEST(5, ROUND(base_value * 0.3));
UPDATE token_cards SET base_value = GREATEST(5, ROUND(base_value * 0.3));

-- Update XP thresholds
UPDATE card_level_thresholds SET experience_required = 
  CASE level
    WHEN 2 THEN 150  -- 1.5x multiplier
    WHEN 3 THEN 375
    WHEN 4 THEN 750
    WHEN 5 THEN 1500
    WHEN 6 THEN 2625
    WHEN 7 THEN 4125
    WHEN 8 THEN 6000
    WHEN 9 THEN 9000
    WHEN 10 THEN 15000
  END;
```

### Option B: Grandfathered Users (Production)
- Existing users keep current coins
- New users start with 200 coins
- Gradually adjust economy through events/rewards

---

## Success Metrics

### Week 1 Post-Rebalance
- ✅ Average user coins: 100-300 (down from 500-1000)
- ✅ Pack purchase rate: 2-3 per week (was 5-10)
- ✅ Players selling <40% of pulled cards (was ~70%)

### Month 1 Post-Rebalance
- ✅ Players feel scarcity but not frustration
- ✅ Elite card pulls feel exciting (not expected)
- ✅ Leveling to Starter tier feels earned

### Season 1 Post-Rebalance
- ✅ Top players have 5-10 Starter+ tier cards
- ✅ Elite tier cards are rare (< 5% of active rosters)
- ✅ Players still engaged despite slower progression

---

## Appendix: Mathematical Models

### Pack EV (Expected Value) Calculations

**Bronze Pack (150 coins, 3 players)**:
```
Expected pulls:
- 45% solid (18 coins) = 0.81 coins per pull
- 45% rotational (12 coins) = 0.54 coins per pull
- 8% top (50 coins) = 0.40 coins per pull
- 2% elite (195 coins) = 0.39 coins per pull

Avg value per pull = 2.14 coins
3 pulls = 6.42 coins
+ 1 token (~10 coins) = 16.42 coins total

EV: 16.42 / 150 = 10.9% return
Expected loss: 133.58 coins (89% of cost)
```

**This seems TOO punishing. Adjust model:**

Better target: **60-70% return** on packs.
- Bronze (150): Should return ~100 coins → 50 coin loss
- Silver (400): Should return ~280 coins → 120 coin loss

### Revised Base Values (70% return target)

With 3 players per Bronze pack:
- Target return: 100 coins
- Avg per player: 33 coins
- Current avg: 18 coins (too low)

**Better approach: 50% reduction instead of 70%**:
```sql
UPDATE player_cards SET base_value = GREATEST(10, ROUND(base_value * 0.5));
```

New averages:
- Top players: 250 → 125 coins
- Average: 50 → 25 coins
- Trash: 25 → 10 coins (minimum 10)

**Recalculated EV**:
- Avg value per pull = ~30 coins
- 3 pulls = 90 coins
- + 1 token (~15 coins) = 105 coins
- EV: 105/150 = 70% return ✅

---

**END OF ANALYSIS**

Next steps: Review this document and approve changes before implementation.
