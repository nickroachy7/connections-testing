import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * NavigationTabs - Reusable tab navigation component
 * 
 * Matches the exact styling of FantasyNavigation for consistency
 * Used across different pages (Fantasy Home, individual teams, etc.)
 */
export default function NavigationTabs({ navItems = [] }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if current path matches (exact match only for Fantasy Home tabs)
  const isActive = (itemPath) => {
    return location.pathname === itemPath;
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-6 lg:px-8 pt-3 md:pt-4">
      {/* Rounded Container - EXACT match to FantasyNavigation */}
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl overflow-hidden">
        {/* Mobile: Icon Navigation */}
        <div className="flex md:hidden justify-around items-center px-2 py-2">
          {navItems.map(item => {
            const active = isActive(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => item.enabled && navigate(item.path)}
                disabled={!item.enabled}
                className={`flex flex-col items-center gap-1 py-1 flex-1 transition-all duration-200 ${
                  !item.enabled ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <div className={active && item.enabled ? 'text-primary-green-500' : 'text-primary-black-400'}>
                  {item.icon}
                </div>
                <span className={`text-[10px] font-medium ${
                  active && item.enabled ? 'text-primary-green-500' : 'text-primary-black-400'
                }`}>
                  {item.mobileLabel || item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Desktop: Original Button Layout */}
        <div className="hidden md:flex flex-wrap gap-2 p-2">
          {navItems.map(item => {
            const active = isActive(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => item.enabled && navigate(item.path)}
                disabled={!item.enabled}
                className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap ${
                  active && item.enabled
                    ? 'bg-primary-green-500 text-primary-black-950'
                    : !item.enabled
                    ? 'bg-primary-black-800 text-primary-black-500 cursor-not-allowed opacity-50'
                    : 'bg-primary-black-700 text-primary-black-300 hover:bg-primary-black-600 hover:text-primary-black-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

NavigationTabs.propTypes = {
  navItems: PropTypes.arrayOf(
    PropTypes.shape({
      path: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      enabled: PropTypes.bool,
      icon: PropTypes.node,
      mobileLabel: PropTypes.string
    })
  ).isRequired
};
