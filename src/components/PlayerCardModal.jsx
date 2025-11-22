import { useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * PlayerCardModal Component
 * 
 * Modal that appears when clicking a player card in the lineup
 * Provides options to remove or swap the player
 */
export default function PlayerCardModal({ player, onClose, onRemove, onSwap, slotKey }) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!player) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-primary-black-900 border-2 border-primary-black-600 rounded-xl p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Player Info */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-primary-black-50 mb-1">
            {player.player_card.player_name}
          </h3>
          <p className="text-sm text-primary-black-400">
            {player.player_card.position} · {player.player_card.team_abbreviation}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => {
              onSwap(slotKey);
              onClose();
            }}
            className="w-full py-3 px-4 bg-primary-green-600 hover:bg-primary-green-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span>🔄</span>
            <span>Swap with Another Player</span>
          </button>

          <button
            onClick={() => {
              onRemove();
              onClose();
            }}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span>✕</span>
            <span>Remove from Lineup</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-primary-black-700 hover:bg-primary-black-600 text-primary-black-300 hover:text-primary-black-100 font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

PlayerCardModal.propTypes = {
  player: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onSwap: PropTypes.func.isRequired,
  slotKey: PropTypes.string.isRequired
};
