import PropTypes from 'prop-types';
import { getTierColor } from '../../constants/colors';

/**
 * TierBadge - Canonical component for displaying player tier badges
 * 
 * Single source of truth for tier badge styling across the app.
 * Tiers: All-Star (A), Starter (S), Role Player (R), Base (B)
 * 
 * @example
 * <TierBadge tier="all_star" />
 * <TierBadge tier="base" size="sm" />
 */
export default function TierBadge({ 
  tier, 
  size = 'sm',
  showFull = false,
  className = ''
}) {
  const tierConfig = getTierColor(tier);
  
  const tierLabels = {
    all_star: 'All-Star',
    starter: 'Starter',
    role_player: 'Role Player',
    base: 'Base'
  };
  
  const sizeClasses = {
    xs: 'px-1 py-0.5 text-[8px] min-w-[14px]',
    sm: 'px-1 py-0.5 text-[10px] min-w-[16px]',
    md: 'px-1.5 py-0.5 text-xs min-w-[20px]',
    lg: 'px-2 py-1 text-sm min-w-[24px]'
  };

  const label = showFull ? (tierLabels[tier] || 'Base') : (tierConfig.initial || 'B');

  return (
    <span 
      className={`
        inline-flex items-center justify-center
        rounded font-bold text-center
        ${tierConfig.bg} ${tierConfig.text}
        ${sizeClasses[size] || sizeClasses.sm}
        ${className}
      `}
    >
      {label}
    </span>
  );
}

TierBadge.propTypes = {
  tier: PropTypes.oneOf(['all_star', 'starter', 'role_player', 'base']),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),
  showFull: PropTypes.bool,
  className: PropTypes.string
};
