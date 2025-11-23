import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * TokenSelectionModal Component
 * 
 * Mobile-optimized bottom sheet for selecting a token to apply to a specific player.
 * Shows target player and available tokens to choose from.
 */
export default function TokenSelectionModal({
  targetPlayer,
  availableTokens,
  onApply,
  onClose
}) {
  const modalRef = useRef(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll and pointer events when modal is open
  useEffect(() => {
    const mainContent = document.querySelector('main') || document.body;
    
    document.body.style.overflow = 'hidden';
    mainContent.style.pointerEvents = 'none';
    
    return () => {
      document.body.style.overflow = 'unset';
      mainContent.style.pointerEvents = 'auto';
    };
  }, []);

  // Handle token selection
  const handleTokenSelection = (token) => {
    onApply(token, targetPlayer.id);
  };

  // Get position label from slot key
  const getPositionLabel = (slotKey) => {
    if (slotKey === 'FLEX') return 'FLEX';
    if (slotKey?.startsWith('QB')) return 'QB';
    if (slotKey?.startsWith('RB')) return 'RB';
    if (slotKey?.startsWith('WR')) return 'WR';
    if (slotKey?.startsWith('TE')) return 'TE';
    return slotKey;
  };

  // Get position color for lineup players (matching Sleeper app)
  const getPositionColor = (position) => {
    const colors = {
      'QB': 'bg-pink-500 text-white',
      'RB': 'bg-teal-400 text-black',
      'WR': 'bg-blue-400 text-white',
      'TE': 'bg-orange-400 text-black',
      'FLEX': 'bg-gradient-to-r from-teal-400 to-orange-400 text-black'
    };
    return colors[position] || 'bg-primary-black-700 text-primary-black-300';
  };

  // Get position abbreviation
  const getPositionAbbr = (position) => {
    const abbr = {
      'Quarterback': 'QB',
      'Running Back': 'RB',
      'Wide Receiver': 'WR',
      'Tight End': 'TE'
    };
    return abbr[position] || position;
  };

  // Render target player info with grid layout matching TokenApplicationModal
  const renderTargetPlayer = () => {
    const positionLabel = targetPlayer.lineup_position ? getPositionLabel(targetPlayer.lineup_position) : 'BN';
    const badgeColor = targetPlayer.lineup_position ? getPositionColor(getPositionLabel(targetPlayer.lineup_position)) : 'bg-primary-black-700 text-primary-black-300';

    return (
      <div
        className="grid py-2 px-1 transition-all border-l-4 min-h-[56px] bg-primary-black-900 border-primary-green-500/50"
        style={{ 
          gridTemplateColumns: '32px 40px 1fr 60px',
          gap: '4px',
          alignItems: 'center'
        }}
      >
        {/* COLUMN 1: Position Badge */}
        <div className="flex items-center justify-center">
          <span className={`px-1 py-0.5 rounded text-[9px] font-semibold text-center ${badgeColor}`}>
            {positionLabel}
          </span>
        </div>

        {/* COLUMN 2: Player Icon */}
        <div className="rounded bg-primary-black-700 flex items-center justify-center w-10 h-10">
          {targetPlayer.player_card.player_image ? (
            <img
              src={targetPlayer.player_card.player_image}
              alt={targetPlayer.player_card.player_name}
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <svg className="w-6 h-6 text-primary-black-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          )}
        </div>

        {/* COLUMN 3: Player Name & Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <h4 className="font-bold text-primary-black-50 truncate text-[11px] leading-tight">
              {targetPlayer.player_card.player_name}
            </h4>
          </div>
          <div className="flex items-center gap-1 text-[9px] flex-wrap leading-tight">
            {/* Team Badge */}
            <span className="px-1 py-0 bg-primary-black-700 text-primary-black-300 rounded font-semibold">
              {targetPlayer.player_card.team_abbreviation}
            </span>
            {/* Position */}
            <span className="text-primary-black-500 font-semibold">
              {targetPlayer.player_card.position}
            </span>
          </div>
        </div>

        {/* COLUMN 4: Empty for consistency */}
        <div className="text-center">
          <span className="text-[9px] text-primary-black-600">--</span>
        </div>
      </div>
    );
  };

  // Render token row with grid layout matching TokenApplicationModal
  const renderTokenRow = (token) => {
    // Get token emoji based on type
    const getTokenEmoji = (tokenName) => {
      const emojiMap = {
        'multi-td': '🏈',
        'elite performance': '⭐',
        'td scorer': '🎯',
        'big game': '💥'
      };
      return emojiMap[tokenName?.toLowerCase()] || '⚡';
    };

    return (
      <div
        key={token.id}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          handleTokenSelection(token);
        }}
        className="grid py-2 px-1 transition-all border-l-4 min-h-[56px] bg-primary-black-900 border-transparent cursor-pointer hover:bg-yellow-500/10 hover:border-yellow-500 active:bg-yellow-500/20"
        style={{ 
          gridTemplateColumns: '32px 40px 1fr 60px',
          gap: '4px',
          alignItems: 'center'
        }}
      >
        {/* COLUMN 1: TK Badge */}
        <div className="flex items-center justify-center">
          <span className="px-1 py-0.5 bg-yellow-600 text-white rounded text-[9px] font-semibold text-center">
            TK
          </span>
        </div>

        {/* COLUMN 2: Token Emoji */}
        <div className="rounded bg-primary-black-700 flex items-center justify-center w-10 h-10">
          <span className="text-2xl">{getTokenEmoji(token.token_card.token_name)}</span>
        </div>

        {/* COLUMN 3: Token Name & Description */}
        <div className="min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <h4 className="font-bold text-primary-black-50 truncate text-[11px] leading-tight">
              {token.token_card.token_name}
            </h4>
          </div>
          <div className="flex items-center gap-1 text-[9px] flex-wrap leading-tight">
            {/* Rarity Badge */}
            <span className="px-1 py-0 bg-primary-black-700 text-primary-black-300 rounded font-semibold capitalize">
              {token.token_card.rarity}
            </span>
            {/* Description */}
            <span className="text-primary-black-500 truncate">
              {token.token_card.description}
            </span>
          </div>
        </div>

        {/* COLUMN 4: Bonus Points */}
        <div className="text-center">
          <span className="text-sm text-yellow-400 font-bold leading-tight">+{token.token_card.bonus_points}</span>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-fadeIn"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div 
        ref={modalRef}
        className="fixed inset-x-0 bottom-0 z-[101] bg-primary-black-950 rounded-t-3xl shadow-2xl animate-slideUp max-h-[85vh] flex flex-col pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-primary-black-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 border-b border-primary-black-800">
          <h2 className="text-lg font-bold text-primary-black-50 text-center">
            Add Token
          </h2>
          <p className="text-xs text-primary-black-400 text-center mt-1">
            Choose token to apply
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Target Player Section */}
          <div className="border-b border-primary-black-800">
            <div className="px-4 py-2 text-xs font-semibold text-primary-black-400 uppercase tracking-wide bg-primary-black-900">
              Selected Player
            </div>
            {renderTargetPlayer()}
          </div>

          {/* Available Tokens Section */}
          <div>
            <div className="px-4 py-2 text-xs font-semibold text-primary-black-400 uppercase tracking-wide bg-primary-black-900 flex items-center justify-center">
              <div className="h-px flex-1 bg-primary-black-800" />
              <span className="px-3">Choose token</span>
              <div className="h-px flex-1 bg-primary-black-800" />
            </div>

            {availableTokens.length > 0 ? (
              <div>
                {availableTokens.map(token => renderTokenRow(token))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <div className="text-4xl mb-2 opacity-30">💎</div>
                <p className="text-primary-black-400 font-semibold">
                  No tokens available
                </p>
                <p className="text-xs text-primary-black-500 mt-1">
                  All tokens are already applied
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Cancel Button */}
        <div className="p-4 border-t border-primary-black-800 bg-primary-black-900/50">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-primary-black-800 hover:bg-primary-black-700 text-primary-black-200 font-semibold transition-colors active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
      `}</style>
    </>
  );
}

TokenSelectionModal.propTypes = {
  targetPlayer: PropTypes.object.isRequired,
  availableTokens: PropTypes.array.isRequired,
  onApply: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};
