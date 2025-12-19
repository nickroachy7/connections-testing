/**
 * Calculate dynamic sell value for player cards
 * Formula: base_value × tier_multiplier × scarcity_multiplier × performance_multiplier
 * 
 * MICRO-ECONOMY (2025-12-19): Base values are now 1-8 coins, target player balance 5-100
 * 
 * @param {Object} player - Player inventory object
 * @param {string} player.card_tier - Card tier (base, role_player, starter, all_star, elite)
 * @param {Object} player.player_card - Player card details
 * @param {number} player.player_card.base_value - Base sell value (1-8 in micro-economy)
 * @param {number} player.player_card.pull_percentage - Pull percentage (0-100)
 * @param {number} player.player_card.season_ppg - Season points per game
 * @returns {number} Calculated sell value in coins
 */
export function calculatePlayerSellValue(player) {
  if (!player?.player_card) {
    return 0;
  }

  // MICRO-ECONOMY: Base values are now 1-8, default to 2 (common)
  const baseValue = player.player_card.base_value || 2;
  const cardTier = player.card_tier || 'base';
  const pullPercentage = player.player_card.pull_percentage || 50;
  const seasonPPG = player.player_card.season_ppg || 0;

  // Tier multiplier - rewards leveling up cards
  // MICRO-ECONOMY: Kept same multipliers, but with lower base values
  const tierMultipliers = {
    base: 1.0,
    role_player: 1.25,
    starter: 1.5,
    all_star: 2.0,
    elite: 3.0
  };

  // Scarcity multiplier based on pull percentage (lower % = rarer = more valuable)
  // MICRO-ECONOMY 2025-12-19: Reduced multipliers for tighter value range
  let scarcityMultiplier = 1.0;
  if (pullPercentage <= 5) scarcityMultiplier = 1.5;        // LEGENDARY
  else if (pullPercentage <= 15) scarcityMultiplier = 1.3;   // EPIC
  else if (pullPercentage <= 30) scarcityMultiplier = 1.2;   // RARE
  else if (pullPercentage <= 50) scarcityMultiplier = 1.1;   // UNCOMMON
  // else COMMON = 1.0

  // Performance multiplier based on season PPG (real-world performance)
  // MICRO-ECONOMY 2025-12-19: Tightened range for smaller swings
  let performanceMultiplier = 1.0;
  if (seasonPPG >= 20) performanceMultiplier = 1.2;       // Elite performers
  else if (seasonPPG >= 15) performanceMultiplier = 1.1;   // High performers
  else if (seasonPPG >= 10) performanceMultiplier = 1.0;   // Solid performers
  else if (seasonPPG >= 5) performanceMultiplier = 0.9;    // Average performers
  else if (seasonPPG < 5) performanceMultiplier = 0.8;     // Low performers

  const tierMult = tierMultipliers[cardTier] || 1.0;
  const rawValue = baseValue * tierMult * scarcityMultiplier * performanceMultiplier;

  // MICRO-ECONOMY: Round to nearest whole coin, minimum 1 coin
  const roundedValue = Math.round(rawValue);
  return Math.max(1, roundedValue);
}

/**
 * Calculate sell value for token cards (static for now)
 * 
 * MICRO-ECONOMY (2025-12-19): Token base values are now 2-8 coins
 * 
 * @param {Object} token - Token inventory object
 * @param {Object} token.token_card - Token card details
 * @param {number} token.token_card.base_value - Base sell value (2-8 in micro-economy)
 * @returns {number} Sell value in coins
 */
export function calculateTokenSellValue(token) {
  if (!token?.token_card) {
    return 0;
  }
  
  // MICRO-ECONOMY: Tokens use static base_value (2-8 coins), default to 2
  return token.token_card.base_value || 2;
}

/**
 * Get a human-readable breakdown of sell value calculation
 * Useful for tooltips/UI explanations
 * 
 * MICRO-ECONOMY (2025-12-19): Updated for new value ranges
 * 
 * @param {Object} player - Player inventory object
 * @returns {string} Breakdown explanation
 */
export function getSellValueBreakdown(player) {
  if (!player?.player_card) {
    return 'Unable to calculate';
  }

  const baseValue = player.player_card.base_value || 2;
  const cardTier = player.card_tier || 'base';
  const pullPercentage = player.player_card.pull_percentage || 50;
  const seasonPPG = player.player_card.season_ppg || 0;

  const tierMultipliers = {
    base: 1.0,
    role_player: 1.25,
    starter: 1.5,
    all_star: 2.0,
    elite: 3.0
  };

  let scarcityMultiplier = 1.0;
  let scarcityLabel = 'COMMON';
  if (pullPercentage <= 5) {
    scarcityMultiplier = 1.5;
    scarcityLabel = 'LEGENDARY';
  } else if (pullPercentage <= 15) {
    scarcityMultiplier = 1.3;
    scarcityLabel = 'EPIC';
  } else if (pullPercentage <= 30) {
    scarcityMultiplier = 1.2;
    scarcityLabel = 'RARE';
  } else if (pullPercentage <= 50) {
    scarcityMultiplier = 1.1;
    scarcityLabel = 'UNCOMMON';
  }

  let performanceMultiplier = 1.0;
  if (seasonPPG >= 20) performanceMultiplier = 1.2;
  else if (seasonPPG >= 15) performanceMultiplier = 1.1;
  else if (seasonPPG >= 10) performanceMultiplier = 1.0;
  else if (seasonPPG >= 5) performanceMultiplier = 0.9;
  else if (seasonPPG < 5) performanceMultiplier = 0.8;

  const tierMult = tierMultipliers[cardTier] || 1.0;
  const finalValue = calculatePlayerSellValue(player);

  return `${baseValue} base × ${tierMult}× (${cardTier}) × ${scarcityMultiplier}× (${scarcityLabel}) × ${performanceMultiplier}× (${seasonPPG.toFixed(1)} PPG) = ${finalValue} coins`;
}
