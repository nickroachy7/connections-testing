import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { getRosterStatus, getRosterLimitErrorMessage, getRosterCount, ROSTER_LIMIT } from '../utils/rosterLimits';

/**
 * RosterLimitBanner Component
 * 
 * Displays roster count and warning when over limit
 * Shows at top of pages where roster limits matter
 */
export default function RosterLimitBanner({ inventory, showDetails = true }) {
  const navigate = useNavigate();
  
  if (!inventory) return null;
  
  const rosterStatus = getRosterStatus(inventory);
  
  // Only show banner when actually over the limit, not when at limit
  if (!rosterStatus.isOverLimit) {
    return null;
  }
  
  const handleGoToTeamManager = () => {
    navigate('/manage-team');
  };
  
  return (
    <div className="bg-yellow-900/60 border border-yellow-700/50 rounded-lg p-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg flex-shrink-0">⚠️</span>
          <div className="flex items-baseline gap-2">
            <h3 className="text-yellow-200 font-semibold text-sm">
              Roster Over Limit!
            </h3>
            <p className="text-yellow-200/90 text-xs">
              Sell cards to meet roster limit
            </p>
          </div>
        </div>
        {showDetails && (
          <button
            onClick={handleGoToTeamManager}
            className="px-3 py-1.5 bg-yellow-700/80 hover:bg-yellow-700 text-yellow-100 rounded-md text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0"
          >
            👉 Go to Team Manager
          </button>
        )}
      </div>
    </div>
  );
}

RosterLimitBanner.propTypes = {
  inventory: PropTypes.shape({
    players: PropTypes.array,
    tokens: PropTypes.array
  }),
  showDetails: PropTypes.bool
};
