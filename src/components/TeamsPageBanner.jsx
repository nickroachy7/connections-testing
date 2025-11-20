import PropTypes from 'prop-types';
import { useNavigate, useLocation } from 'react-router-dom';

export default function TeamsPageBanner({ username, totalTeams, onCreateClick }) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/fantasy', label: 'MY TEAMS', enabled: true },
    { path: '/lobby', label: 'LOBBY', enabled: false, badge: 'COMING SOON' }
  ];

  return (
    <>
      <div className="bg-dk-black-secondary border-b-2 border-dk-black-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header Section */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-dk-display font-bold text-dk-white-primary mb-1">
                Fantasy Teams
              </h1>
              <p className="text-sm text-dk-white-tertiary">
                {username && <span className="text-dk-green-primary font-semibold">{username}</span>}
                {username && <span> • </span>}
                {totalTeams || 0} {totalTeams === 1 ? 'Team' : 'Teams'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="bg-dk-black-secondary border-b border-dk-black-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-2">
            {navItems.map(item => (
              item.enabled ? (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`px-4 py-2 rounded text-sm font-dk-display font-bold transition-all duration-200 ${
                    location.pathname === item.path
                      ? 'bg-dk-green-primary text-dk-black-primary'
                      : 'bg-dk-black-tertiary text-dk-white-secondary border border-dk-black-light hover:bg-dk-black-light'
                  }`}
                >
                  {item.label}
                </button>
              ) : (
                <div
                  key={item.path}
                  className="px-4 py-2 rounded text-sm font-dk-display font-bold bg-dk-black-tertiary text-dk-white-tertiary border border-dk-black-light opacity-50 cursor-not-allowed flex items-center gap-2"
                >
                  {item.label}
                  {item.badge && (
                    <span className="px-2 py-0.5 bg-dk-black-light text-dk-white-tertiary rounded text-xs">
                      {item.badge}
                    </span>
                  )}
                </div>
              )
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
