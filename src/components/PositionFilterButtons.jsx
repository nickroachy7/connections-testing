import PropTypes from 'prop-types';
import { useSport } from '../contexts/SportContext';

/**
 * Position Filter Buttons - Dynamically renders position filter buttons based on current sport
 * 
 * @param {string} activePosition - Currently active position filter
 * @param {function} onFilterChange - Callback when position filter changes
 */
export default function PositionFilterButtons({ activePosition, onFilterChange }) {
  const { currentSport } = useSport();
  
  const isActive = (position) => activePosition === position;
  
  const getButtonClasses = (position) => {
    return `px-4 py-2 rounded-dk font-dk-display font-bold transition-all duration-200 text-sm ${
      isActive(position)
        ? 'bg-dk-green-primary text-dk-black-primary'
        : 'bg-dk-black-tertiary text-dk-white-secondary border border-dk-black-light hover:bg-dk-black-light'
    }`;
  };
  
  return (
    <>
      {/* All positions button */}
      <button 
        className={getButtonClasses('all')}
        onClick={() => onFilterChange('all')}
      >
        ALL
      </button>
      
      {/* Sport-specific position buttons */}
      {currentSport.positions.map(position => (
        <button 
          key={position.id}
          className={getButtonClasses(position.id)}
          onClick={() => onFilterChange(position.id)}
        >
          {position.shortName}
        </button>
      ))}
    </>
  );
}

PositionFilterButtons.propTypes = {
  activePosition: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired
};
