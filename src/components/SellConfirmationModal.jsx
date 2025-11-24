import PropTypes from 'prop-types';
import { getTierBadgeInfo, getTokenRarityColor } from './tables/tableHelpers.jsx';

/**
 * SellConfirmationModal Component
 * 
 * Compact mobile-friendly confirmation popup for selling player cards or tokens
 */
export default function SellConfirmationModal({ 
  player,
  sellValue,
  onConfirm,
  onCancel,
  isOpen 
}) {
  if (!isOpen || !player) return null;

  // Check if this is a token or a player
  const isToken = !!player.token_card;
  const tierInfo = !isToken ? getTierBadgeInfo(player.card_tier) : null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-primary-black-800 rounded-lg shadow-2xl border border-primary-black-700 max-w-sm w-full pointer-events-auto animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-primary-black-700">
            <h3 className="text-lg font-bold text-white">Sell {isToken ? 'Token' : 'Player Card'}?</h3>
          </div>

          {/* Card Info */}
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              {/* Icon */}
              {isToken ? (
                <div className={`rounded flex items-center justify-center text-3xl bg-gradient-to-br ${getTokenRarityColor(player.token_card.rarity)} w-14 h-14`}>
                  💎
                </div>
              ) : (
                <div className={`rounded bg-primary-black-700 flex items-center justify-center w-14 h-14 border-2 ${tierInfo.borderColor}`}>
                  <svg className="w-8 h-8 text-primary-black-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              )}

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-base truncate">
                  {isToken ? player.token_card.token_name : player.player_card.player_name}
                </div>
                <div className="text-sm text-primary-black-400">
                  {isToken 
                    ? `${player.token_card.token_type} • +${player.token_card.bonus_points} pts`
                    : `${player.player_card.position} - ${player.player_card.team_abbreviation}`
                  }
                </div>
                {!isToken && (
                  <div className="mt-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${tierInfo.bgColor} ${tierInfo.textColor}`}>
                      {tierInfo.label}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Sell Value */}
            <div className="bg-primary-black-900/50 rounded-lg p-3 mb-4 border border-primary-black-700">
              <div className="flex items-center justify-between">
                <span className="text-primary-black-400 text-sm">You'll receive:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-bold text-yellow-500">{sellValue}</span>
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-2.5 mb-4">
              <p className="text-xs text-red-300 text-center">
                ⚠️ This action cannot be undone
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-4 pb-4 flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 bg-primary-black-700 hover:bg-primary-black-600 text-white rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
            >
              Sell for {sellValue}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

SellConfirmationModal.propTypes = {
  player: PropTypes.object,
  sellValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired
};
