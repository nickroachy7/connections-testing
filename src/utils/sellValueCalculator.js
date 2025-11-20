/**
 * Calculate dynamic sell value for player cards
 * Formula: base_value × tier_multiplier × scarcity_multiplier × performance_multiplier
 * 
 * @param {Object} player - Player inventory object
 * @param {string} player.card_tier - Card tier (base, role_player, starter, all_star, elite)
 * @param {Object} player.player_card - Player card details
 * @param {number} player.player_card.base_value - Base sell value
 * @param {number} player.player_card.pull_percentage - Pull percentage (0-100)
 * @param {number} player.player_card.season_ppg - Season points per game
 * @returns {number} Calculated sell value in coins
 */
export function calculatePlayerSellValue(player) {
  if (!player?.player_card) {
    return 0;
  }

  const baseValue = player.player_card.base_value || 100;
  const cardTier = player.card_tier || 'base';
  const pullPercentage = player.player_card.pull_percentage || 50;
  const seasonPPG = player.player_card.season_ppg || 0;

  // Tier multiplier - rewards leveling up cards
  const tierMultipliers = {
    base: 1.0,
    role_player: 1.25,
    starter: 1.5,
    all_star: 2.0,
    elite: 3.0
  };

  // Scarcity multiplier based on pull percentage (lower % = rarer = more valuable)
  // REBALANCED 2025-11-19: Reduced multipliers to prevent excessive sell values
  let scarcityMultiplier = 1.0;
  if (pullPercentage <= 5) scarcityMultiplier = 2.0;        // Was 3.0 - LEGENDARY
  else if (pullPercentage <= 15) scarcityMultiplier = 1.5;   // Was 2.0 - EPIC
  else if (pullPercentage <= 30) scarcityMultiplier = 1.3;   // Was 1.5 - RARE
  else if (pullPercentage <= 50) scarcityMultiplier = 1.1;   // Was 1.2 - UNCOMMON
  // else COMMON = 1.0

  // Performance multiplier based on season PPG (real-world performance)
  // REBALANCED 2025-11-19: Reduced multipliers to prevent excessive sell values
  let performanceMultiplier = 1.0;
  if (seasonPPG >= 20) performanceMultiplier = 1.3;      // Was 1.5 - Elite performers
  else if (seasonPPG >= 15) performanceMultiplier = 1.2;  // Was 1.3 - High performers
  else if (seasonPPG >= 10) performanceMultiplier = 1.1;  // Was 1.1 - Solid performers
  else if (seasonPPG >= 5) performanceMultiplier = 1.0;   // Was 1.0 - Average performers
  else if (seasonPPG < 5) performanceMultiplier = 0.7;    // Was 0.8 - Low performers

  const tierMult = tierMultipliers[cardTier] || 1.0;
  const rawValue = baseValue * tierMult * scarcityMultiplier * performanceMultiplier;

  // Round to nearest 5 coins for clean numbers, minimum 10 coins
  // REBALANCED 2025-11-19: Reduced from 50 to 10 to allow lower-value cards
  const roundedValue = Math.round(rawValue / 5) * 5;
  return Math.max(10, roundedValue);
}

/**
 * Calculate sell value for token cards (static for now)
 * 
 * @param {Object} token - Token inventory object
 * @param {Object} token.token_card - Token card details
 * @param {number} token.token_card.base_value - Base sell value
 * @returns {number} Sell value in coins
 */
export function calculateTokenSellValue(token) {
  if (!token?.token_card) {
    return 0;
  }
  
  // Tokens use static base_value for now
  // Could be enhanced later with rarity multipliers
  return token.token_card.base_value || 50;
}

/**
 * Get a human-readable breakdown of sell value calculation
 * Useful for tooltips/UI explanations
 * 
 * @param {Object} player - Player inventory object
 * @returns {string} Breakdown explanation
 */
export function getSellValueBreakdown(player) {
  if (!player?.player_card) {
    return 'Unable to calculate';
  }

  const baseValue = player.player_card.base_value || 100;
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
    scarcityMultiplier = 3.0;
    scarcityLabel = 'LEGENDARY';
  } else if (pullPercentage <= 15) {
    scarcityMultiplier = 2.0;
    scarcityLabel = 'EPIC';
  } else if (pullPercentage <= 30) {
    scarcityMultiplier = 1.5;
    scarcityLabel = 'RARE';
  } else if (pullPercentage <= 50) {
    scarcityMultiplier = 1.2;
    scarcityLabel = 'UNCOMMON';
  }

  let performanceMultiplier = 1.0;
  if (seasonPPG >= 20) performanceMultiplier = 1.5;
  else if (seasonPPG >= 15) performanceMultiplier = 1.3;
  else if (seasonPPG >= 10) performanceMultiplier = 1.1;
  else if (seasonPPG >= 5) performanceMultiplier = 1.0;
  else if (seasonPPG < 5) performanceMultiplier = 0.8;

  const tierMult = tierMultipliers[cardTier] || 1.0;
  const finalValue = calculatePlayerSellValue(player);

  return `${baseValue} base × ${tierMult}× (${cardTier}) × ${scarcityMultiplier}× (${scarcityLabel}) × ${performanceMultiplier}× (${seasonPPG.toFixed(1)} PPG) = ${finalValue} coins`;
}
