# Dynamic Pull Rate System - Visual Flow

⚠️ **IMPORTANT DISTINCTION:**
- **Pull Rate Tier** = Probability of getting player in pack (LEGENDARY = 1% chance)
- **Card Tier** = Player strength in gameplay (Base → Elite via XP/leveling)
- **All pulled players start at Base tier, Level 1** regardless of pull rate

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DAILY PULL RATE UPDATE FLOW                         │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │  CRON TRIGGER    │
    │   (3:00 AM)      │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────────────┐
    │ update-projections       │
    │   Edge Function          │
    └────────┬─────────────────┘
             │
             ├─────────────────────────────────────────┐
             │                                         │
             ▼                                         ▼
    ┌──────────────────┐                    ┌──────────────────┐
    │ BallDontLie API  │                    │  Calculate       │
    │  - Season Stats  │                    │  Projections     │
    │  - Injury Status │                    │  - Fantasy PPG   │
    └────────┬─────────┘                    │  - Injury Impact │
             │                               └────────┬─────────┘
             │                                        │
             └────────────┬───────────────────────────┘
                          │
                          ▼
             ┌────────────────────────────┐
             │  Calculate Pull Rate Tier  │
             │                            │
             │  Inputs:                   │
             │  - Position                │
             │  - Season PPG              │
             │  - Games Played            │
             │  - Injury Status           │
             │                            │
             │  Output:                   │
             │  - Tier (LEGENDARY-COMMON) │
             │  - Weight (1.0-50.0)       │
             └────────────┬───────────────┘
                          │
                          ▼
             ┌────────────────────────────┐
             │  Update player_cards Table │
             │                            │
             │  SET:                      │
             │  - pull_rate_tier          │
             │  - pull_rate_weight        │
             │  - season_ppg              │
             │  - injury_status           │
             │  - weekly_projected_points │
             └────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                        PACK OPENING FLOW (USER ACTION)                      │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │  User Opens Pack │
    │  (Frontend)      │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────────────┐
    │ open-pack Edge Function  │
    │                          │
    │ Loop: Generate 8 Players │
    └────────┬─────────────────┘
             │
             ▼
    ┌────────────────────────────────────┐
    │  Fetch Active Players              │
    │                                    │
    │  SELECT:                           │
    │  - player_name, position           │
    │  - pull_rate_tier                  │
    │  - pull_rate_weight                │
    │                                    │
    │  WHERE:                            │
    │  - is_active = true                │
    │  - position IN (QB, RB, WR, TE)    │
    └────────┬───────────────────────────┘
             │
             ▼
    ┌────────────────────────────────────┐
    │  Weighted Random Selection         │
    │                                    │
    │  1. Sum all pull_rate_weights      │
    │     Total = 20,000 (example)       │
    │                                    │
    │  2. Generate random(0, 20000)      │
    │     Random = 15,234                │
    │                                    │
    │  3. Iterate through players:       │
    │     - Player A (COMMON, w=50)      │
    │       15,234 - 50 = 15,184         │
    │     - Player B (RARE, w=15)        │
    │       15,184 - 15 = 15,169         │
    │     ...                            │
    │     - Player N (LEGENDARY, w=1)    │
    │       45 - 1 = 44                  │
    │     - Player O (COMMON, w=50)      │
    │       44 - 50 = -6 ✓ SELECTED!    │
    │                                    │
    │  Higher weight = more likely       │
    │  COMMON (50) is 50x more likely    │
    │  than LEGENDARY (1)                │
    └────────┬───────────────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │  Return Player to User   │
    │  + tier badge (optional) │
    └──────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                           TIER CALCULATION LOGIC                            │
└─────────────────────────────────────────────────────────────────────────────┘

    Player: Saquon Barkley (RB)
    Season PPG: 19.5
    Games Played: 11
    Injury Status: Healthy

    ┌─────────────────────────┐
    │  Step 1: Base Tier      │
    │  (Position Thresholds)  │
    └────────┬────────────────┘
             │
             │  RB Thresholds:
             │  - LEGENDARY: 18+ PPG  ← 19.5 qualifies!
             │  - EPIC: 14-18 PPG
             │  - RARE: 10-14 PPG
             │  - UNCOMMON: 6-10 PPG
             │  - COMMON: <6 PPG
             │
             ▼
        Base Tier: LEGENDARY

    ┌─────────────────────────┐
    │  Step 2: Modifiers      │
    └────────┬────────────────┘
             │
             ├─► Games Played: 11 → ✓ No downgrade (>4 games)
             │
             ├─► Injury Status: Healthy → ✓ No downgrade
             │
             ▼
        Final Tier: LEGENDARY
        Weight: 1.0 (1% pull rate)


    Player: Jordan Mason (RB)
    Season PPG: 11.2
    Games Played: 3
    Injury Status: Questionable

    ┌─────────────────────────┐
    │  Step 1: Base Tier      │
    └────────┬────────────────┘
             │
             │  RB Thresholds:
             │  - RARE: 10-14 PPG  ← 11.2 qualifies
             │
             ▼
        Base Tier: RARE

    ┌─────────────────────────┐
    │  Step 2: Modifiers      │
    └────────┬────────────────┘
             │
             ├─► Games Played: 3 → ❌ Downgrade -1 tier (<4 games)
             │   RARE → UNCOMMON
             │
             ├─► Injury Status: Questionable → ❌ Downgrade -1 tier
             │   UNCOMMON → COMMON
             │
             ▼
        Final Tier: COMMON
        Weight: 50.0 (50% pull rate)


┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXPECTED TIER DISTRIBUTION                           │
└─────────────────────────────────────────────────────────────────────────────┘

    Total Active Players: ~1000 (QB/RB/WR/TE only)

    ┌──────────────┬───────┬─────────┬─────────────────────────────┐
    │ Tier         │ Rate  │ Count   │ Examples                    │
    ├──────────────┼───────┼─────────┼─────────────────────────────┤
    │ LEGENDARY 🏆 │  1%   │  10-15  │ Mahomes, CMC, Hill, Kelce   │
    │ EPIC      💜 │  4%   │  40-50  │ Top 10-12 at each position  │
    │ RARE      💎 │ 15%   │ 150-180 │ Weekly starters, Flex plays │
    │ UNCOMMON  🟢 │ 30%   │ 300-320 │ Streaming options, backups  │
    │ COMMON    ⚪ │ 50%   │ 490-520 │ Deep bench, IR, practice sq │
    └──────────────┴───────┴─────────┴─────────────────────────────┘

    Pack Opening Simulation (8 players):
    ───────────────────────────────────────
    Expected result per 100 packs opened:

    - LEGENDARY pulls: ~8 total (0.08 per pack)
    - EPIC pulls: ~32 total (0.32 per pack)
    - RARE pulls: ~120 total (1.2 per pack)
    - UNCOMMON pulls: ~240 total (2.4 per pack)
    - COMMON pulls: ~400 total (4.0 per pack)

    Most packs will contain:
    ✓ 4-5 COMMON players
    ✓ 2-3 UNCOMMON players
    ✓ 0-2 RARE players
    ✓ 0-1 EPIC player
    ✓ 0 LEGENDARY (very rare!)


┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE SCHEMA CHANGES                            │
└─────────────────────────────────────────────────────────────────────────────┘

    player_cards table (BEFORE):
    ┌──────────────────────┬──────────┬─────────────────────────┐
    │ Column               │ Type     │ Description             │
    ├──────────────────────┼──────────┼─────────────────────────┤
    │ id                   │ UUID     │ Primary key             │
    │ player_name          │ TEXT     │ Name                    │
    │ position             │ TEXT     │ QB/RB/WR/TE             │
    │ season_ppg           │ NUMERIC  │ Season average PPG      │
    │ games_played_season  │ INTEGER  │ Games played            │
    │ injury_status        │ TEXT     │ Injury designation      │
    │ is_active            │ BOOLEAN  │ Active roster status    │
    └──────────────────────┴──────────┴─────────────────────────┘

    player_cards table (AFTER):
    ┌──────────────────────┬──────────┬─────────────────────────┐
    │ Column               │ Type     │ Description             │
    ├──────────────────────┼──────────┼─────────────────────────┤
    │ id                   │ UUID     │ Primary key             │
    │ player_name          │ TEXT     │ Name                    │
    │ position             │ TEXT     │ QB/RB/WR/TE             │
    │ season_ppg           │ NUMERIC  │ Season average PPG      │
    │ games_played_season  │ INTEGER  │ Games played            │
    │ injury_status        │ TEXT     │ Injury designation      │
    │ pull_rate_tier       │ TEXT     │ ⭐ NEW: Tier rank       │
    │ pull_rate_weight     │ NUMERIC  │ ⭐ NEW: Pull weight     │
    │ is_active            │ BOOLEAN  │ Active roster status    │
    └──────────────────────┴──────────┴─────────────────────────┘

    Index for Performance:
    ───────────────────────
    CREATE INDEX idx_player_cards_pull_rate 
    ON player_cards(pull_rate_tier, pull_rate_weight, is_active)
    WHERE is_active = true;

    Why this index?
    - Speeds up weighted selection queries
    - Only indexes active players (smaller index)
    - Covers all columns used in WHERE/ORDER BY


┌─────────────────────────────────────────────────────────────────────────────┐
│                              TESTING CHECKLIST                              │
└─────────────────────────────────────────────────────────────────────────────┘

    ☐ 1. Run Migration
       → Verify columns added successfully
       → Check all players default to COMMON tier

    ☐ 2. Trigger Projection Update
       → Run update-projections Edge Function manually
       → Verify pull_rate_tier and pull_rate_weight populated

    ☐ 3. Verify Tier Distribution
       → Run distribution query
       → Ensure ~1% LEGENDARY, ~4% EPIC, etc.

    ☐ 4. Test Pack Opening
       → Open 10 test packs
       → Verify weighted selection works
       → Check console logs for tier info

    ☐ 5. Simulate 1000 Packs
       → Script to open packs in loop
       → Calculate actual vs expected distribution
       → Ensure within ±5% margin

    ☐ 6. Performance Test
       → Measure pack opening latency
       → Should be <500ms per pack
       → Check database query execution plans

    ☐ 7. Edge Cases
       → All players injured (all COMMON)
       → Newly activated player (0 games)
       → Player crosses tier threshold mid-season

    ☐ 8. Rollback Test
       → Revert to random selection
       → Verify system still works
       → Re-enable weighted selection


┌─────────────────────────────────────────────────────────────────────────────┐
│                           MONITORING DASHBOARD                              │
└─────────────────────────────────────────────────────────────────────────────┘

    Daily Check Queries:
    ────────────────────

    1. Tier Distribution Health Check
       ┌──────────────┬───────┬─────────┐
       │ Tier         │ Count │ Target  │
       ├──────────────┼───────┼─────────┤
       │ LEGENDARY    │   12  │  10-20  │ ✓ Healthy
       │ EPIC         │   45  │  40-60  │ ✓ Healthy
       │ RARE         │  165  │ 140-200 │ ✓ Healthy
       │ UNCOMMON     │  315  │ 280-350 │ ✓ Healthy
       │ COMMON       │  463  │ 450-550 │ ✓ Healthy
       └──────────────┴───────┴─────────┘

    2. Position Balance Check
       ┌──────────┬────┬────┬────┬────┬────┐
       │ Position │ LEG│ EPC│ RRE│ UNC│ COM│
       ├──────────┼────┼────┼────┼────┼────┤
       │ QB       │  2 │  8 │ 25 │ 40 │ 75 │
       │ RB       │  4 │ 15 │ 55 │ 95 │145 │
       │ WR       │  5 │ 18 │ 65 │135 │185 │
       │ TE       │  1 │  4 │ 20 │ 45 │ 58 │
       └──────────┴────┴────┴────┴────┴────┘

    3. Recent Tier Changes
       (Track players who moved tiers in last 24h)

    4. Pull Success Metrics
       - Avg LEGENDARY pulls per 100 packs: 0.8
       - Avg EPIC pulls per 100 packs: 3.2
       - Avg pack opening time: 285ms


┌─────────────────────────────────────────────────────────────────────────────┐
│                            FUTURE ENHANCEMENTS                              │
└─────────────────────────────────────────────────────────────────────────────┘

    Phase 2: Pack-Specific Rates
    ─────────────────────────────
    Elite Pack: Shift distribution toward higher tiers
    - LEGENDARY: 1% → 5%
    - EPIC: 4% → 20%
    - RARE: 15% → 35%
    - UNCOMMON: 30% → 25%
    - COMMON: 50% → 15%

    Phase 3: Dynamic Balancing
    ───────────────────────────
    Auto-adjust thresholds if distribution gets skewed
    - Too many LEGENDARYs? Increase PPG threshold
    - Too few EPICs? Lower threshold

    Phase 4: Tier Evolution Tracking
    ────────────────────────────────
    Show players who recently changed tiers
    - "🔥 Trending Up: Puka Nacua (RARE → EPIC)"
    - "📉 Cooling Down: Travis Etienne (EPIC → RARE)"

    Phase 5: Guaranteed Minimums
    ────────────────────────────
    Elite Pack: Guaranteed 1 EPIC or higher
    Gold Pack: Guaranteed 1 RARE or higher
