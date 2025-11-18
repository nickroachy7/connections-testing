import PropTypes from 'prop-types';
import { getRosterCount, ROSTER_LIMIT } from '../utils/rosterLimits';

/**
 * RosterCount Component
 * 
 * Simple, compact roster count display (e.g., "20/20")
 */
export default function RosterCount({ inventory, className = '' }) {
  if (!inventory) return null;
  
  const count = getRosterCount(inventory);
  const isOverLimit = count > ROSTER_LIMIT;
  const isAtLimit = count === ROSTER_LIMIT;
  
  // Color based on status
  const colorClass = isOverLimit 
    ? 'text-yellow-400' 
    : isAtLimit 
      ? 'text-yellow-300' 
      : 'text-primary-black-400';
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm font-medium text-primary-black-500">Roster:</span>
      <span className={`text-sm font-bold ${colorClass}`}>
        {count}/{ROSTER_LIMIT}
      </span>
    </div>
  );
}

RosterCount.propTypes = {
  inventory: PropTypes.shape({
    players: PropTypes.array,
    tokens: PropTypes.array
  }),
  className: PropTypes.string
};
