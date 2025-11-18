import PropTypes from 'prop-types';
import { useNavigate, useLocation } from 'react-router-dom';

export default function TeamsPageBanner({ username, totalTeams, onCreateClick }) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/fantasy', label: 'MY TEAMS' },
    { path: '/lobby', label: 'LOBBY' }
  ];

  return (
    <>
      <div className="bg-primary-black-900 border-b-2 border-primary-black-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 h-[180px]">
          {/* Header Section */}
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <h1 className="text-2xl md:text-3xl font-bold text-primary-black-50 tracking-tight leading-tight">
                  My Fantasy <span className="text-primary-green-500">Teams</span>
                </h1>
                <p className="text-sm text-primary-black-300">
                  Select a team to manage or create a new one
                </p>
              </div>
            </div>
            
            {/* Desktop Stats & Button - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-6">
              <div className="text-right">
                <div className="text-4xl font-bold text-primary-green-500 leading-none">
                  {totalTeams || 0}
                </div>
                <div className="text-xs text-primary-black-400 uppercase tracking-wide mt-1">Your Teams</div>
              </div>
              
              <button
                onClick={onCreateClick}
                className="px-6 py-3 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Team
              </button>
            </div>
          </div>

          {/* Mobile Stats & Action */}
          <div className="md:hidden flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-primary-black-800 border border-primary-black-700 rounded text-xs">
              <span>📋</span>
              <span className="font-bold text-primary-green-500">
                {totalTeams || 0}
              </span>
            </div>
            
            <button
              onClick={onCreateClick}
              className="flex-1 px-4 py-2 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded text-sm transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Team
            </button>
          </div>

          {/* Info Banner */}
          <div className="mt-3">
            {username && (
              <div className="px-4 py-3 bg-primary-black-800 border border-primary-black-700 rounded-lg flex items-center gap-3">
                <svg className="w-5 h-5 text-primary-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-primary-black-300">
                  <span className="font-bold text-primary-green-400">{username}</span> • Each team has independent players, tokens, and coins
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="bg-primary-black-900 border-b-2 border-primary-black-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-2">
            {navItems.map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-4 py-2 rounded text-sm font-bold transition-all duration-200 ${
                  location.pathname === item.path
                    ? 'bg-primary-green-500 text-primary-black-950'
                    : 'bg-primary-black-800 text-primary-black-300 border border-primary-black-700 hover:bg-primary-black-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

TeamsPageBanner.propTypes = {
  username: PropTypes.string,
  totalTeams: PropTypes.number,
  onCreateClick: PropTypes.func
};
