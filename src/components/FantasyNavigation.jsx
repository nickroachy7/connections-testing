import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';

export default function FantasyNavigation({ teamId }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isViewMode = location.pathname.includes('/view');

  // Navigation items for DFS teams
  const allNavItems = [
    { path: `/teams/${teamId}/starting-lineup`, label: 'LINEUP' },
    { path: `/teams/${teamId}/inventory`, label: 'INVENTORY' },
    { path: `/teams/${teamId}/market`, label: 'MARKET' },
    { path: `/teams/${teamId}/contests`, label: 'CONTESTS' }
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
  teamId: PropTypes.string.isRequired
};