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
-- VERIFICATION QUERIES (commented out)
-- =====================================================
-- Check new pack costs:
-- SELECT pack_type, coin_cost FROM packs ORDER BY coin_cost;

-- Check base value distribution:
-- SELECT MIN(base_value) as min_val, MAX(base_value) as max_val, ROUND(AVG(base_value)) as avg_val FROM player_cards;

-- Check XP thresholds:
-- SELECT level, tier, experience_required, stat_multiplier FROM card_level_thresholds ORDER BY level;
