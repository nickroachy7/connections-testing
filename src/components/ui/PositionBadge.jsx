import PropTypes from 'prop-types';
import { getPositionColorClasses } from '../../constants/colors';

/**
 * PositionBadge - Canonical component for displaying position badges
 * 
 * Single source of truth for position badge styling across the app.
 * Used in: Starting Lineup, Bench, Inventory, Modals
 * 
 * @example
 * <PositionBadge position="QB" />
 * <PositionBadge position="RB1" size="sm" />
 * <PositionBadge position="BN" isLocked />
 */
export default function PositionBadge({ 
  position, 
  size = 'sm',
  isLocked = false,
  className = ''
}) {
  // Normalize position display
  const getDisplayLabel = (pos) => {
    if (!pos) return '--';
    const upper = pos.toUpperCase();
    
    // Handle numbered positions (RB1 → RB, WR2 → WR)
    if (upper.match(/^(RB|WR)\d$/)) return upper.slice(0, 2);
    
    // Handle special positions
    if (upper === 'SUPERFLEX') return 'SFLX';
    if (upper === 'FLEX') return 'FLX';
    if (upper === 'BENCH') return 'BN';
    
    return upper;
  };

  const label = getDisplayLabel(position);
  const colorClasses = getPositionColorClasses(position, isLocked);
  
  const sizeClasses = {
    xs: 'px-1 py-0.5 text-[9px] min-w-[24px]',
    sm: 'px-1.5 py-0.5 text-[10px] min-w-[28px]',
    md: 'px-2 py-1 text-xs min-w-[32px]',
    lg: 'px-2.5 py-1 text-sm min-w-[40px]'
  };

  return (
    <span 
      className={`
        inline-flex items-center justify-center
        rounded font-bold text-center
        ${sizeClasses[size] || sizeClasses.sm}
        ${colorClasses}
        ${className}
      `}
    >
      {label}
    </span>
  );
}

PositionBadge.propTypes = {
  position: PropTypes.string,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),
  isLocked: PropTypes.bool,
  className: PropTypes.string
};
