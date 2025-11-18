import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';

export default function NFLNavBanner() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/nfl?tab=players', label: 'PLAYERS', emoji: '👤' },
    { path: '/nfl?tab=teams', label: 'TEAMS', emoji: '🏈' },
    { path: '/nfl?tab=standings', label: 'STANDINGS', emoji: '🏆' }
  ];

  const getCurrentTab = () => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'players';
  };

  const currentTab = getCurrentTab();

  return (
    <>
      {/* Compact Header - Single Row Design with Fixed Height */}
      <div className="bg-dk-black-secondary border-b border-dk-black-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 h-[180px]">
          {/* Single Row Layout - Title */}
          <div className="flex items-center justify-between gap-4 mb-3">
            {/* Page Title */}
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-dk-display font-black text-dk-white-primary uppercase tracking-tight">
                NFL <span className="text-dk-green-primary">DASHBOARD</span>
              </h1>
            </div>

            {/* Desktop Tab Count - matches fantasy teams banner style */}
            <div className="hidden md:flex items-center gap-6">
              <div className="text-right">
                <div className="text-4xl font-dk-display font-black text-dk-green-primary leading-none">
                  {currentTab === 'players' && '100'}
                  {currentTab === 'teams' && '32'}
                  {currentTab === 'standings' && '32'}
                </div>
                <div className="text-xs text-dk-white-muted font-dk uppercase tracking-wide mt-1">
                  {currentTab === 'players' && 'Active Players'}
                  {currentTab === 'teams' && 'NFL Teams'}
                  {currentTab === 'standings' && 'Teams Ranked'}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Stats */}
          <div className="md:hidden flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-dk-black-tertiary rounded text-xs">
              <span>{currentTab === 'players' ? '👤' : currentTab === 'teams' ? '🏈' : '🏆'}</span>
              <span className="font-dk-display font-bold text-dk-green-primary">
                {currentTab === 'players' && '100'}
                {currentTab === 'teams' && '32'}
                {currentTab === 'standings' && '32'}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="mt-3">
            <div className="px-4 py-3 bg-dk-black-tertiary border border-dk-black-light rounded-lg">
              <p className="text-sm text-dk-white-secondary">
                {currentTab === 'players' && '📊 Browse the complete NFL player database with advanced filtering and stats'}
                {currentTab === 'teams' && '🏈 Explore all 32 NFL teams organized by conference and division'}
                {currentTab === 'standings' && '🏆 Track 2024 season standings, playoff positions, and team performance'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap gap-2">
          {navItems.map(item => {
            const tabParam = item.path.split('tab=')[1];
            const isActive = currentTab === tabParam;
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-4 py-2 rounded text-sm font-dk-display font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-dk-green-primary text-dk-black-primary'
                    : 'bg-dk-black-tertiary text-dk-white-secondary border border-dk-black-light hover:bg-dk-black-light'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{item.emoji}</span>
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

NFLNavBanner.propTypes = {};
