import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
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
 * TeamMenuCard - Compact team card for burger menu
 * 
 * Displays team identity and stats.
 * Uses the team's selected banner theme for visual consistency.
 * Clickable to switch to that team.
 */
export default function TeamMenuCard({ 
  team, 
  isActive = false, 
  onClick,
  onDelete = null,
  showDelete = false,
  isDeleting = false
}) {
  const [globalRank, setGlobalRank] = useState(null);
  
  const bannerTheme = localStorage.getItem(`bannerTheme_${team.id}`) || 'forest';
  const theme = BANNER_THEMES.find(t => t.id === bannerTheme) || BANNER_THEMES[2];
  
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

  return (
    <div className="relative w-full">
      <button
        onClick={onClick}
        className="w-full text-left transition-all"
      >
        <div className={`${theme.bg} rounded-lg p-3 border-2 ${
          isActive ? 'border-white/40' : 'border-white/20'
        }`}>
          {/* Team Identity Row */}
          <div className="flex items-center gap-2.5">
          {/* Team Avatar */}
          <div className="flex-shrink-0">
            {team.team_image_url ? (
              <img
                src={team.team_image_url}
                alt={team.team_name}
                className="w-12 h-12 rounded-lg object-cover border border-white/30"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-white/10 border border-white/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>

          {/* Team Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm sm:text-base font-dk-display font-black text-white truncate leading-tight">
                {team.team_name}
              </h3>
              {/* Team Type Badge */}
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                team.team_type === 'private' 
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}>
                {team.team_type === 'private' ? 'PRIVATE' : 'PUBLIC'}
              </span>
            </div>
            {team.users?.username && (
              <div className="text-xs sm:text-sm text-white/70 truncate">
                @{team.users.username}
              </div>
            )}
            
            {/* Inline Stats */}
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs mt-0.5">
              <span className="font-dk-display font-bold text-white/90">#{globalRank || '--'}</span>
              <span className="text-white/40">•</span>
              <div className="flex items-center gap-0.5">
                <span className="font-dk-display font-bold text-green-400">{team.wins || 0}</span>
                <span className="text-white/60">-</span>
                <span className="font-dk-display font-bold text-red-400">{team.losses || 0}</span>
              </div>
              <span className="text-white/40">•</span>
              <div className="flex items-center gap-0.5">
                <svg className="w-2.5 h-2.5 text-white/90" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <span className="font-dk-display font-bold text-white/90">{team.coins?.toLocaleString() || '0'}</span>
              </div>
              <span className="text-white/40">•</span>
              <div className="flex items-center gap-0.5">
                <svg className="w-2.5 h-2.5 text-white/90" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                <span className="font-dk-display font-bold text-white/90">{lossesRemaining}</span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </button>
      
      {/* Delete Button Overlay */}
      {showDelete && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(team.id, team.team_name);
          }}
          disabled={isDeleting}
          className="absolute top-2 right-2 p-1.5 bg-red-500/90 hover:bg-red-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          title="Delete team"
        >
          {isDeleting ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

TeamMenuCard.propTypes = {
  team: PropTypes.object.isRequired,
  isActive: PropTypes.bool,
  onClick: PropTypes.func,
  onDelete: PropTypes.func,
  showDelete: PropTypes.bool,
  isDeleting: PropTypes.bool
};
