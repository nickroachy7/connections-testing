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
    <div className="bg-primary-black-900/95 backdrop-blur-md">
      {/* Sleeper-style Tab Navigation - matches FantasyNavigation exactly */}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-around md:justify-start md:gap-0">
          {navItems.map(item => {
            const active = isActive(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => item.enabled && navigate(item.path)}
                disabled={!item.enabled}
                className={`relative flex-1 md:flex-none px-4 md:px-6 py-3 text-xs md:text-sm font-bold tracking-wide transition-all duration-200 ${
                  active && item.enabled
                    ? 'text-white'
                    : !item.enabled
                    ? 'text-primary-black-500 cursor-not-allowed opacity-50'
                    : 'text-primary-black-400 hover:text-primary-black-200'
                }`}
              >
                {item.label}
                {/* Active indicator underline */}
                {active && item.enabled && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 md:w-12 h-0.5 bg-primary-green-500 rounded-full" />
                )}
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
