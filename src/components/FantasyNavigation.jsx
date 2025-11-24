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

  const navIcons = {
    'STARTING LINEUP': (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    'INVENTORY': (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    'PACK SHOP': (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
    'LEADERBOARD': (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    'ACTIVITY': (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-6 lg:px-8 pt-3 md:pt-4">
      {/* Rounded Container */}
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl overflow-hidden">
        {/* Mobile: Icon Navigation */}
        <div className="flex md:hidden justify-around items-center px-2 py-2">
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1 py-1 flex-1 transition-all duration-200"
            >
              <div className={location.pathname === item.path ? 'text-primary-green-500' : 'text-primary-black-400'}>
                {navIcons[item.label]}
              </div>
              <span className={`text-[10px] font-medium ${
                location.pathname === item.path ? 'text-primary-green-500' : 'text-primary-black-400'
              }`}>
                {item.label === 'STARTING LINEUP' ? 'Lineup' : 
                 item.label === 'INVENTORY' ? 'Inventory' :
                 item.label === 'PACK SHOP' ? 'Shop' :
                 item.label === 'LEADERBOARD' ? 'Leaders' :
                 'Activity'}
              </span>
            </button>
          ))}
        </div>

        {/* Desktop: Original Button Layout */}
        <div className="hidden md:flex flex-wrap gap-2 p-2">
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap ${
                location.pathname === item.path
                  ? 'bg-primary-green-500 text-primary-black-950'
                  : 'bg-primary-black-700 text-primary-black-300 hover:bg-primary-black-600 hover:text-primary-black-100'
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