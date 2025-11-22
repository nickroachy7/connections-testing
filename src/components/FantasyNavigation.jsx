import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';

export default function FantasyNavigation({ teamId }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isViewMode = location.pathname.includes('/view');

  const allNavItems = [
    { path: `/teams/${teamId}/starting-lineup`, label: 'STARTING LINEUP' },
    { path: `/teams/${teamId}/inventory`, label: 'INVENTORY' },
    { path: `/teams/${teamId}/pack-shop`, label: 'PACK SHOP' },
    { path: `/teams/${teamId}/leaderboard`, label: 'LEADERBOARD' },
    { path: `/teams/${teamId}/activity`, label: 'ACTIVITY' }
  ];

  const navItems = isViewMode 
    ? allNavItems.filter(item => item.label === 'STARTING LINEUP' || item.label === 'INVENTORY')
    : allNavItems;

  return (
    <div className="bg-dk-black-secondary border-b border-dk-black-light">
      <div className="max-w-7xl mx-auto px-1 sm:px-2 md:px-6 lg:px-8 py-1 md:py-3">
        <div className="flex flex-wrap gap-0.5 md:gap-2">
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`px-1.5 md:px-4 py-0.5 md:py-2 rounded text-[9px] md:text-sm font-dk-display font-bold transition-all duration-200 whitespace-nowrap ${
                location.pathname === item.path
                  ? 'bg-dk-green-primary text-dk-black-primary'
                  : 'bg-dk-black-tertiary text-dk-white-secondary border border-dk-black-light hover:bg-dk-black-light'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

FantasyNavigation.propTypes = {
  teamId: PropTypes.string.isRequired
};
