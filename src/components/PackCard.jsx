import PropTypes from 'prop-types';

/**
 * PackCard Component
 * 
 * Clean, minimal pack card matching inventory/lineup design patterns.
 * No bright colors, emojis, or gradients - just simple dark styling.
 */

// Simple tier labels (no emojis)
const TIER_LABELS = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  elite: 'Elite',
  starter: 'Starter'
};

export default function PackCard({
  pack,
  onPurchase,
  isOpening = false,
  userCoins = 0,
  disabled = false
}) {
  const canAfford = userCoins >= pack.coin_cost;
  const isPurchasable = !disabled && canAfford && !isOpening;

  const handleClick = () => {
    if (isPurchasable) {
      onPurchase(pack);
    }
  };

  return (
    <div
      className={`
        w-full
        bg-primary-black-800
        border border-primary-black-700
        rounded-lg
        transition-colors duration-200
        ${isPurchasable ? 'cursor-pointer hover:bg-primary-black-750 hover:border-primary-black-600' : ''}
        ${!canAfford && !disabled ? 'opacity-60' : ''}
      `}
      onClick={handleClick}
      role={isPurchasable ? 'button' : undefined}
      tabIndex={isPurchasable ? 0 : -1}
    >
      {/* Main Row */}
      <div className="flex items-center gap-3 p-3">
        {/* Pack Image */}
        <div className="flex-shrink-0 w-12 h-12">
          <img 
            src="/green-pack.png" 
            alt={pack.pack_name}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Pack Info */}
        <div className="flex-1 min-w-0">
          {/* Line 1: Name + Tier Badge */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-primary-black-50 truncate">
              {pack.pack_name}
            </h3>
            <span className="px-1.5 py-0.5 bg-primary-black-700 text-primary-black-400 rounded text-[10px] font-semibold uppercase flex-shrink-0">
              {TIER_LABELS[pack.pack_type] || pack.pack_type}
            </span>
          </div>
          
          {/* Line 2: Contents */}
          <div className="flex items-center gap-2 text-xs text-primary-black-400">
            <span>{pack.player_count} players</span>
            <span className="text-primary-black-600">·</span>
            <span>{pack.token_count} tokens</span>
          </div>
        </div>

        {/* Right Side: Price + CTA */}
        <div className="flex-shrink-0 flex items-center gap-3">
          {/* Price */}
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" />
            </svg>
            <span className="text-sm font-semibold text-white">
              {pack.coin_cost}
            </span>
          </div>

          {/* CTA */}
          {isOpening ? (
            <div className="w-16 flex justify-center">
              <svg className="animate-spin h-5 w-5 text-primary-black-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : !canAfford ? (
            <span className="text-xs text-red-400 whitespace-nowrap">
              Need {pack.coin_cost - userCoins}
            </span>
          ) : disabled ? (
            <span className="text-xs text-primary-black-500">
              Select Team
            </span>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPurchase(pack);
              }}
              className="px-3 py-1.5 bg-primary-green-500 hover:bg-primary-green-400 rounded-md transition-colors"
            >
              <span className="text-xs font-semibold text-primary-black-950">
                Buy
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

PackCard.propTypes = {
  pack: PropTypes.shape({
    id: PropTypes.string.isRequired,
    pack_name: PropTypes.string.isRequired,
    pack_type: PropTypes.string.isRequired,
    player_count: PropTypes.number.isRequired,
    token_count: PropTypes.number.isRequired,
    coin_cost: PropTypes.number.isRequired,
    description: PropTypes.string,
  }).isRequired,
  onPurchase: PropTypes.func.isRequired,
  isOpening: PropTypes.bool,
  userCoins: PropTypes.number,
  disabled: PropTypes.bool,
};
