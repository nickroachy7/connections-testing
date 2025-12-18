import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { supabase } from '../services/supabase';

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
 * TeamMenuCard - Mini version of the team banner
 * 
 * Matches the styling of TeamBanner exactly.
 * Displays team identity with avatar, name, username, and stats.
 */
export default function TeamMenuCard({ 
  team, 
  isActive = false, 
  onClick
}) {
  const navigate = useNavigate();
  const [globalRank, setGlobalRank] = useState(null);
  
  // Use saved theme or default to forest (matches TeamBanner default)
  const bannerTheme = localStorage.getItem(`bannerTheme_${team.id}`) || 'forest';
  const theme = BANNER_THEMES.find(t => t.id === bannerTheme) || BANNER_THEMES[2]; // Default to forest
  
  const maxLosses = team.contest_type?.max_losses || 3;
  const lossesRemaining = maxLosses - (team.losses || 0);

  // Fetch global rank
  useEffect(() => {
    if (!team.id) return;

    const fetchGlobalRank = async () => {
      try {
        const { data: allTeams } = await supabase
          .from('teams')
          .select('id, wins, losses, total_points')
          .eq('is_active', true)
          .order('wins', { ascending: false })
          .order('total_points', { ascending: false });

        if (allTeams) {
          const rank = allTeams.findIndex(t => t.id === team.id) + 1;
          setGlobalRank(rank > 0 ? rank : null);
        }
      } catch (error) {
        console.error('Error fetching global rank:', error);
      }
    };

    fetchGlobalRank();
  }, [team.id]);

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleSettingsClick = (e) => {
    e.stopPropagation();
    navigate(`/teams/${team.id}/info`);
  };

  return (
    <div className="relative">
      <div 
        onClick={handleCardClick}
        className={`${theme.bg} rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02]`}
      >
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 relative">
            {/* Team Avatar */}
            <div className="flex-shrink-0">
              {team.team_image_url ? (
                <img
                  src={team.team_image_url}
                  alt={team.team_name}
                  className="w-16 h-16 rounded-lg object-cover border-2 border-white/30 shadow-xl"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-white/10 border-2 border-white/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Team Info */}
            <div className="flex-1 min-w-0 pr-12 flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <h3 className="text-lg font-bold text-white truncate leading-none">
                  {team.team_name}
                </h3>
                <span className="text-[11px] text-white/50 font-medium">
                  • DFS
                </span>
              </div>
              {team.users?.username && (
                <div className="text-[11px] text-white/70 font-medium truncate mt-0.5">
                  {team.users.username}
                </div>
              )}
              
              {/* Stats Row - matches TeamBanner exactly */}
              <div className="flex items-center gap-1.5 text-[11px] mt-1">
                <span className="font-bold text-white/80">#{globalRank || '--'}</span>
                <span className="text-white/30">•</span>
                <div className="flex items-center gap-0.5">
                  <span className="font-bold text-green-400">{team.wins || 0}</span>
                  <span className="text-white/50">-</span>
                  <span className="font-bold text-red-400">{team.losses || 0}</span>
                </div>
                <span className="text-white/30">•</span>
                <div className="flex items-center gap-0.5">
                  <svg className="w-2.5 h-2.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                  <span className="font-bold text-white">{team.coins?.toLocaleString() || '0'}</span>
                </div>
                <span className="text-white/30">•</span>
                <div className="flex items-center gap-0.5">
                  <svg className="w-2.5 h-2.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  <span className="font-bold text-white">{lossesRemaining}</span>
                </div>
                <span className="text-white/30">•</span>
                <div className="flex items-center gap-0.5">
                  <svg className="w-2.5 h-2.5 text-accent-orange-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z" />
                  </svg>
                  <span className="font-bold text-white">{team.tickets || 0}</span>
                </div>
              </div>
            </div>

            {/* Info Button - Top Right */}
            <button
              onClick={handleSettingsClick}
              className="absolute top-0 right-0 p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all"
              title="Team Info"
            >
              <Info className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

TeamMenuCard.propTypes = {
  team: PropTypes.object.isRequired,
  isActive: PropTypes.bool,
  onClick: PropTypes.func
};
