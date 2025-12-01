import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../services/supabase';
import NavigationTabs from './NavigationTabs';

const BANNER_THEMES = [
  { id: 'default', name: 'Classic Dark', bg: 'bg-dk-black-secondary' },
  { id: 'ocean', name: 'Ocean Blue', bg: 'bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-900' },
  { id: 'forest', name: 'Forest Green', bg: 'bg-gradient-to-r from-emerald-900 via-green-800 to-teal-900' },
  { id: 'sunset', name: 'Sunset Orange', bg: 'bg-gradient-to-r from-orange-900 via-red-900 to-pink-900' },
  { id: 'purple', name: 'Royal Purple', bg: 'bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900' },
  { id: 'crimson', name: 'Fire Red', bg: 'bg-gradient-to-r from-red-900 via-orange-900 to-yellow-900' },
  { id: 'midnight', name: 'Midnight Blue', bg: 'bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950' },
  { id: 'emerald', name: 'Emerald Dream', bg: 'bg-gradient-to-r from-emerald-900 via-green-800 to-lime-900' },
  { id: 'rose', name: 'Rose Gold', bg: 'bg-gradient-to-r from-pink-900 via-rose-800 to-red-900' },
  { id: 'arctic', name: 'Arctic Ice', bg: 'bg-gradient-to-r from-cyan-900 via-blue-900 to-indigo-900' }
];

/**
 * FantasyHomeBanner - Banner component for Fantasy Home page
 * 
 * Matches the style/height of TeamMatchupBanner but shows aggregate stats across all teams.
 * Shows: User avatar, username, total teams, aggregate W-L, total coins
 */
export default function FantasyHomeBanner({ username, totalTeams, profile, teams = [] }) {
  const [bannerTheme] = useState('forest');
  const [aggregateStats, setAggregateStats] = useState({
    totalWins: 0,
    totalLosses: 0,
    totalCoins: 0,
    bestRank: null
  });

  const getCurrentTheme = () => BANNER_THEMES.find(t => t.id === bannerTheme) || BANNER_THEMES[2];

  // Calculate aggregate stats from all teams
  useEffect(() => {
    if (teams && teams.length > 0) {
      const stats = teams.reduce((acc, team) => {
        acc.totalWins += team.wins || 0;
        acc.totalLosses += team.losses || 0;
        acc.totalCoins += team.coins || 0;
        return acc;
      }, { totalWins: 0, totalLosses: 0, totalCoins: 0, bestRank: null });

      setAggregateStats(stats);
    }
  }, [teams]);

  // Fetch best global rank from all teams
  useEffect(() => {
    const fetchBestRank = async () => {
      if (!teams || teams.length === 0) return;

      try {
        const { data: allTeams } = await supabase
          .from('teams')
          .select('id, wins, losses, total_points')
          .eq('is_active', true)
          .order('wins', { ascending: false })
          .order('total_points', { ascending: false });

        if (allTeams) {
          const userTeamRanks = teams.map(team => {
            const rank = allTeams.findIndex(t => t.id === team.id) + 1;
            return rank > 0 ? rank : null;
          }).filter(r => r !== null);

          const bestRank = userTeamRanks.length > 0 ? Math.min(...userTeamRanks) : null;
          setAggregateStats(prev => ({ ...prev, bestRank }));
        }
      } catch (error) {
        console.error('Error fetching ranks:', error);
      }
    };

    fetchBestRank();
  }, [teams]);

  // Fantasy Home Navigation Items
  const navItems = [
    { 
      path: '/fantasy/feed', 
      label: 'FEED', 
      enabled: false,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      mobileLabel: 'Feed'
    },
    { 
      path: '/fantasy', 
      label: 'TEAMS', 
      enabled: true,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      mobileLabel: 'Teams'
    },
    { 
      path: '/fantasy/contest-lobby', 
      label: 'CONTEST LOBBY', 
      enabled: false,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      mobileLabel: 'Lobby'
    },
    { 
      path: '/fantasy/leagues', 
      label: 'LEAGUES', 
      enabled: true,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      mobileLabel: 'Leagues'
    },
    { 
      path: '/fantasy/players', 
      label: 'PLAYERS', 
      enabled: false,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      mobileLabel: 'Players'
    }
  ];

  const theme = getCurrentTheme();

  return (
    <>
      {/* Main Banner Section - Matches TeamMatchupBanner height/style */}
      <div className={`${theme.bg} border-b-2 border-primary-black-700/50`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">

            {/* Fantasy Title & Stats - Left/Center */}
            <div className="flex-1 min-w-0">
              {/* Fantasy Title */}
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg sm:text-2xl font-bold text-white">
                  Fantasy
                </h1>
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-white/70">
                <span className="font-semibold text-white/90">{totalTeams || 0} {totalTeams === 1 ? 'Team' : 'Teams'}</span>
                <span className="text-white/40">•</span>
                <span>
                  <span className="text-green-400 font-semibold">{aggregateStats.totalWins}</span>
                  <span className="text-white/50"> - </span>
                  <span className="text-red-400 font-semibold">{aggregateStats.totalLosses}</span>
                </span>
                <span className="text-white/40">•</span>
                <span className="text-white/50">
                  Season 2025
                </span>
              </div>
            </div>

            {/* Settings Icon - Right Side */}
            <div className="flex-shrink-0">
              <button
                onClick={() => {/* Future: Open profile settings */}}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors border border-white/10"
                aria-label="Settings"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <NavigationTabs navItems={navItems} />
    </>
  );
}

FantasyHomeBanner.propTypes = {
  username: PropTypes.string,
  totalTeams: PropTypes.number,
  profile: PropTypes.object,
  teams: PropTypes.array
};
