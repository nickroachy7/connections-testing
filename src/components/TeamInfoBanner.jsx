import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import TeamHeader from './TeamHeader';
import WeekStatusBar from './WeekStatusBar';

const BANNER_THEMES = [
  { id: 'default', name: 'Classic Dark', bg: 'bg-dk-black-secondary' },
  { id: 'ocean', name: 'Ocean Blue', bg: 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500' },
  { id: 'forest', name: 'Forest Green', bg: 'bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500' },
  { id: 'sunset', name: 'Sunset Orange', bg: 'bg-gradient-to-r from-orange-500 via-red-500 to-pink-500' },
  { id: 'purple', name: 'Royal Purple', bg: 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500' },
  { id: 'crimson', name: 'Fire Red', bg: 'bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500' },
  { id: 'midnight', name: 'Midnight Blue', bg: 'bg-gradient-to-r from-slate-800 via-blue-900 to-indigo-900' },
  { id: 'emerald', name: 'Emerald Dream', bg: 'bg-gradient-to-r from-emerald-600 via-green-500 to-lime-500' },
  { id: 'rose', name: 'Rose Gold', bg: 'bg-gradient-to-r from-pink-500 via-rose-400 to-red-400' },
  { id: 'arctic', name: 'Arctic Ice', bg: 'bg-gradient-to-r from-cyan-500 via-blue-400 to-indigo-400' }
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

  useEffect(() => {
    if (teamId) {
      const savedTheme = localStorage.getItem(`bannerTheme_${teamId}`);
      setBannerTheme(savedTheme || 'forest');
    }
  }, [teamId]);

  const getCurrentTheme = () => BANNER_THEMES.find(t => t.id === bannerTheme) || BANNER_THEMES[2];

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