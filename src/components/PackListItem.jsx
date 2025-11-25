import PropTypes from 'prop-types';

/**
 * PackListItem Component
 * 
 * Mobile-optimized horizontal row layout for pack display
 * Matches the list-based patterns used in PlayerTable/TokenTable
 */
export default function PackListItem({
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

  const handleButtonClick = (e) => {
    e.stopPropagation();
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
        rounded-xl 
        p-3 sm:p-4
        transition-all duration-200
        ${!canAfford && !disabled ? 'animate-shake' : ''}
      `}
      aria-label={`${pack.pack_name} - ${pack.coin_cost} coins`}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        {/* LEFT SECTION: Icon + Pack Info (40%) */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          {/* Pack Image */}
          <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14">
            <img 
              src="/green-pack.png" 
              alt="Pack"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Pack Name & Stats */}
          <div className="flex flex-col items-start min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-bold text-primary-black-50 truncate w-full text-left">
              {pack.pack_name}
            </h3>
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-primary-black-400">
              <div className="flex items-center gap-1">
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
                <span className="font-medium text-primary-black-50">{pack.player_count}</span>
              </div>
              <span className="text-primary-black-600">•</span>
              <div className="flex items-center gap-1">
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span className="font-medium text-primary-black-50">{pack.token_count}</span>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION: Empty spacer for alignment */}
        <div className="flex-shrink-0 hidden sm:block" style={{ width: '80px' }}></div>

        {/* RIGHT SECTION: Price + CTA (35%) */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* Price */}
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
            </svg>
            <span className="text-base sm:text-lg font-bold text-white">
              {pack.coin_cost}
            </span>
          </div>

          {/* CTA or Status */}
          {isOpening ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-primary-green-500/20 rounded-lg">
              <svg className="animate-spin h-3 w-3 text-primary-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-xs font-medium text-primary-green-400">Opening...</span>
            </div>
          ) : !canAfford ? (
            <span className="text-[10px] sm:text-xs bg-red-600/20 text-red-400 px-3 py-1 rounded-lg border border-red-600/30 font-medium">
              Insufficient Coins
            </span>
          ) : disabled ? (
            <span className="text-[10px] sm:text-xs bg-gray-600/20 text-gray-400 px-3 py-1 rounded-lg border border-gray-600/30 font-medium">
              Select Team
            </span>
          ) : (
            <button
              onClick={handleButtonClick}
              className="px-3 py-1 bg-primary-green-500 hover:bg-primary-green-400 active:scale-95 rounded-lg transition-all"
            >
              <span className="text-xs sm:text-sm font-bold text-primary-black-950">
                Open Pack
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Optional: Pack Description (Expandable on mobile) */}
      {pack.description && (
        <div className="mt-2 pt-2 border-t border-primary-black-700/50">
          <p className="text-[10px] sm:text-xs text-primary-black-400 text-left line-clamp-1 sm:line-clamp-2">
            {pack.description}
          </p>
        </div>
      )}
    </div>
  );
}

PackListItem.propTypes = {
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
