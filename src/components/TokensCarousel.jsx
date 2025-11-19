import PropTypes from 'prop-types';

/**
 * TokensCarousel Component
 * 
 * List view of available tokens for easy token application.
 * Features:
 * - Compact list display showing all token info
 * - Drag onto players to apply
 * - No scrolling needed for reasonable token counts
 */
export default function TokensCarousel({
  availableTokens,
  onTokenDragStart,
  onTokenDragEnd
}) {
  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-600 to-orange-600 text-yellow-100 border-yellow-500/30';
      case 'epic': return 'from-purple-600 to-pink-600 text-purple-100 border-purple-500/30';
      case 'rare': return 'from-blue-600 to-cyan-600 text-blue-100 border-blue-500/30';
      default: return 'from-gray-600 to-gray-700 text-gray-100 border-gray-500/30';
    }
  };

  const getRarityGlow = (rarity) => {
    switch (rarity) {
      case 'legendary': return 'shadow-lg shadow-yellow-500/30';
      case 'epic': return 'shadow-lg shadow-purple-500/30';
      case 'rare': return 'shadow-lg shadow-blue-500/30';
      default: return '';
    }
  };

  if (availableTokens.length === 0) {
    return null; // Don't show section if no tokens
  }

  return (
    <div className="bg-primary-black-900 rounded-2xl">
      {/* Header */}
      <div className="border-b border-primary-black-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">💎</span>
            <div>
              <h3 className="text-lg font-bold text-primary-black-50">Available Tokens</h3>
              <p className="text-xs text-primary-black-400">
                {availableTokens.length} {availableTokens.length === 1 ? 'token' : 'tokens'} • Drag onto players to boost
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* List View */}
      <div className="px-4 py-3">
        <div className="space-y-2">
          {availableTokens.map((token) => (
            <div
              key={token.id}
              draggable
              onDragStart={(e) => onTokenDragStart(e, token)}
              onDragEnd={onTokenDragEnd}
              className={`
                flex items-center gap-4 p-4 rounded-lg border-2 transition-all cursor-move
                bg-gradient-to-r ${getRarityColor(token.token_card.rarity)} ${getRarityGlow(token.token_card.rarity)}
                hover:scale-[1.02] hover:shadow-xl
              `}
            >
              {/* Token Icon */}
              <div className="text-3xl">💎</div>

              {/* Token Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-sm truncate">
                    {token.token_card.token_name}
                  </h4>
                  <span className="text-xs opacity-75 uppercase tracking-wide font-semibold">
                    {token.token_card.token_type}
                  </span>
                </div>
                <p className="text-xs opacity-90 line-clamp-1">
                  {token.token_card.description}
                </p>
              </div>

              {/* Bonus Points */}
              <div className="flex-shrink-0 text-right">
                <div className="text-2xl font-bold">
                  +{token.token_card.bonus_points}
                </div>
                <div className="text-xs opacity-75">points</div>
              </div>

              {/* Value */}
              <div className="flex-shrink-0 text-xs opacity-75">
                💰 {token.token_card.base_value}
              </div>

              {/* Drag Handle */}
              <div className="flex-shrink-0 text-white/50 text-xl">
                ⋮⋮
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instruction */}
      <div className="border-t border-primary-black-700 px-6 py-2">
        <p className="text-xs text-primary-black-500 text-center">
          💡 Drag tokens directly onto player cards in your lineup to apply bonuses
        </p>
      </div>
    </div>
  );
}

TokensCarousel.propTypes = {
  availableTokens: PropTypes.array.isRequired,
  onTokenDragStart: PropTypes.func.isRequired,
  onTokenDragEnd: PropTypes.func
};
