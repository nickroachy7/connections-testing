import PropTypes from 'prop-types';
import { Zap, Target, Trophy, Star, Flame } from 'lucide-react';

/**
 * TokenRowCompact - Compact token display for modals and selection lists
 * 
 * A simplified, consistent token row for use in:
 * - Token selection modals
 * - Token application modals
 * - Token inventory lists
 * 
 * Uses Lucide icons instead of emojis per design system.
 * 
 * @example
 * <TokenRowCompact 
 *   token={token} 
 *   onClick={() => handleSelect(token)}
 * />
 */

// Token type to icon mapping (no emojis - per design system)
const TOKEN_ICONS = {
  'explosive yards': Zap,
  'yards bonus': Zap,
  'elite performance': Star,
  'big game': Flame,
  'td scorer': Target,
  'multi-td': Trophy,
  'default': Zap
};

function getTokenIcon(tokenName) {
  if (!tokenName) return TOKEN_ICONS.default;
  const key = tokenName.toLowerCase();
  return TOKEN_ICONS[key] || TOKEN_ICONS.default;
}

export default function TokenRowCompact({
  token,
  isSelected = false,
  isDisabled = false,
  onClick = null,
  className = ''
}) {
  if (!token?.token_card) return null;

  const { token_card } = token;
  const IconComponent = getTokenIcon(token_card.token_name);

  return (
    <div
      onClick={() => !isDisabled && onClick?.()}
      className={`
        grid py-2 px-3 transition-all min-h-[56px]
        ${isSelected 
          ? 'bg-yellow-500/10 border-l-4 border-yellow-500' 
          : 'bg-primary-black-900 border-l-4 border-transparent'
        }
        ${isDisabled 
          ? 'opacity-50 cursor-not-allowed' 
          : onClick ? 'cursor-pointer hover:bg-yellow-500/10 hover:border-yellow-500' : ''
        }
        ${className}
      `}
      style={{ 
        gridTemplateColumns: '32px 40px 1fr 50px',
        gap: '8px',
        alignItems: 'center'
      }}
    >
      {/* Token Badge */}
      <div className="flex items-center justify-center">
        <span className="px-1.5 py-0.5 bg-yellow-600 text-white rounded text-[10px] font-bold">
          TK
        </span>
      </div>

      {/* Token Icon */}
      <div className="rounded bg-primary-black-700 flex items-center justify-center w-10 h-10">
        <IconComponent className="w-5 h-5 text-yellow-400" />
      </div>

      {/* Token Info */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-semibold text-white text-sm truncate">
            {token_card.token_name}
          </span>
        </div>
        <div className="text-xs text-primary-black-400 truncate">
          {token_card.description}
        </div>
      </div>

      {/* Bonus Points */}
      <div className="text-right">
        <span className="text-sm font-bold text-yellow-400">
          +{token_card.bonus_points}
        </span>
      </div>
    </div>
  );
}

TokenRowCompact.propTypes = {
  token: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    token_card: PropTypes.shape({
      token_name: PropTypes.string,
      description: PropTypes.string,
      bonus_points: PropTypes.number,
      rarity: PropTypes.string
    })
  }).isRequired,
  isSelected: PropTypes.bool,
  isDisabled: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string
};
