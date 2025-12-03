import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';

export default function FantasyNavigation({ teamId, teamType = 'public' }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isViewMode = location.pathname.includes('/view');
  const isPublicTeam = teamType === 'public';

  // Base navigation items (same for both types)
  const baseNavItems = [
    { path: `/teams/${teamId}/starting-lineup`, label: 'LINEUP' },
    { path: `/teams/${teamId}/inventory`, label: 'INVENTORY' },
    { path: `/teams/${teamId}/market`, label: 'MARKET' }
  ];

  // Public team specific items
  const publicOnlyItems = [
    { path: `/teams/${teamId}/contests`, label: 'CONTESTS' }
  ];

  // Private team specific items
  const privateOnlyItems = [
    { path: `/teams/${teamId}/league`, label: 'LEAGUE' }
  ];

  // Build full nav based on team type
  const allNavItems = [
    ...baseNavItems,
    ...(isPublicTeam ? publicOnlyItems : privateOnlyItems)
  ];

  const navItems = isViewMode 
    ? allNavItems.filter(item => item.label === 'LINEUP' || item.label === 'INVENTORY')
    : allNavItems;

  return (
    <div className="bg-primary-black-900/95 backdrop-blur-md">
      {/* Sleeper-style Tab Navigation */}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-around md:justify-start md:gap-0">
          {navItems.map(item => {
            const isActive = location.pathname === item.path || 
              (item.label === 'LINEUP' && location.pathname.includes('/starting-lineup'));
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative flex-1 md:flex-none px-4 md:px-6 py-3 text-xs md:text-sm font-bold tracking-wide transition-all duration-200 ${
                  isActive
                    ? 'text-white'
                    : 'text-primary-black-400 hover:text-primary-black-200'
                }`}
              >
                {item.label}
                {/* Active indicator underline */}
                {isActive && (
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

FantasyNavigation.propTypes = {
  teamId: PropTypes.string.isRequired,
  teamType: PropTypes.oneOf(['public', 'private'])
};