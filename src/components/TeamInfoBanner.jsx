import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import TeamHeader from './TeamHeader';
import WeekStatusBar from './WeekStatusBar';
import { supabase } from '../services/supabase';

// v2.0 - Unified background with dark gradients (900/950 shades)
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
 * TeamInfoBanner Component
 * 
 * Wrapper component that composes team identity and week status displays.
 * Refactored from 685-line monolithic component to clean composition pattern.
 */
export default function TeamInfoBanner({ 
  username, 
  teamName, 
  wins, 
  losses, 
  coins,
  teamId,
  team,
  previewMode = false
}) {
  const [bannerTheme, setBannerTheme] = useState('forest');
  const [globalRank, setGlobalRank] = useState(null);

  useEffect(() => {
    if (teamId) {
      // Clear old cached themes to force reload with new dark gradients
      const oldThemes = ['ocean', 'forest', 'sunset', 'purple', 'crimson', 'emerald', 'rose', 'arctic'];
      const savedTheme = localStorage.getItem(`bannerTheme_${teamId}`);
      
      // Reset to default if it was one of the old bright themes
      if (savedTheme && oldThemes.includes(savedTheme)) {
        localStorage.removeItem(`bannerTheme_${teamId}`);
        setBannerTheme('forest');
      } else {
        setBannerTheme(savedTheme || 'forest');
      }
    }
  }, [teamId]);

  // Fetch global rank
  useEffect(() => {
    if (!teamId) return;

    const fetchGlobalRank = async () => {
      try {
        const { data: allTeams } = await supabase
          .from('teams')
          .select('id, wins, losses, total_points')
          .eq('is_active', true)
          .order('wins', { ascending: false })
          .order('total_points', { ascending: false });

        if (allTeams) {
          const rank = allTeams.findIndex(t => t.id === teamId) + 1;
          setGlobalRank(rank > 0 ? rank : null);
        }
      } catch (error) {
        console.error('Error fetching global rank:', error);
      }
    };

    fetchGlobalRank();
    const interval = setInterval(fetchGlobalRank, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [teamId, wins, losses]);

  const getCurrentTheme = () => BANNER_THEMES.find(t => t.id === bannerTheme) || BANNER_THEMES[2];

  // Calculate lives remaining
  const maxLosses = team?.contest_type?.max_losses || 3;
  const livesRemaining = maxLosses - (losses || 0);

  return (
    <div className={`${getCurrentTheme().bg} transition-all duration-300`}>
      <TeamHeader 
        teamId={teamId}
        team={team}
        username={username}
        teamName={teamName}
        wins={wins}
        losses={losses}
        coins={coins}
        lives={livesRemaining}
        rank={globalRank}
        bannerTheme={bannerTheme}
        setBannerTheme={setBannerTheme}
      />
      <WeekStatusBar 
        teamId={teamId}
        team={team}
        losses={losses}
        previewMode={previewMode}
      />
    </div>
  );
}

TeamInfoBanner.propTypes = {
  username: PropTypes.string,
  teamName: PropTypes.string,
  wins: PropTypes.number,
  losses: PropTypes.number,
  coins: PropTypes.number,
  teamId: PropTypes.string,
  team: PropTypes.object,
  previewMode: PropTypes.bool
};