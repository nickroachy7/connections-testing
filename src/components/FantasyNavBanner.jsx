import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../services/supabase';

// ============================================================================
// CONSTANTS
// ============================================================================

const THEME_OPTIONS = [
  { id: 'default', name: 'Classic Dark', bg: 'bg-dk-black-secondary', preview: 'linear-gradient(to right, #1a1a1a, #1a1a1a)' },
  { id: 'ocean', name: 'Ocean Blue', bg: 'bg-gradient-to-r from-blue-900 to-blue-800', preview: 'linear-gradient(to right, #1e3a8a, #1e40af)' },
  { id: 'forest', name: 'Forest Green', bg: 'bg-gradient-to-r from-emerald-900 to-green-800', preview: 'linear-gradient(to right, #064e3b, #166534)' },
  { id: 'sunset', name: 'Sunset Orange', bg: 'bg-gradient-to-r from-orange-900 to-red-900', preview: 'linear-gradient(to right, #7c2d12, #7f1d1d)' },
  { id: 'purple', name: 'Royal Purple', bg: 'bg-gradient-to-r from-purple-900 to-indigo-900', preview: 'linear-gradient(to right, #581c87, #312e81)' },
  { id: 'crimson', name: 'Crimson Red', bg: 'bg-gradient-to-r from-red-950 to-rose-900', preview: 'linear-gradient(to right, #450a0a, #881337)' },
  { id: 'matrix', name: 'Matrix Code', bg: 'bg-gradient-to-b from-black via-green-950 to-black', preview: 'linear-gradient(to bottom, #000000, #052e16, #000000)' },
];

const NAV_ITEMS = [
  { path: 'starting-lineup', label: 'STARTING LINEUP' },
  { path: 'inventory', label: 'INVENTORY' },
  { path: 'pack-shop', label: 'PACK SHOP' },
  { path: 'leaderboard', label: 'LEADERBOARD' },
  { path: 'activity', label: 'ACTIVITY' }
];

const VIEW_MODE_NAV_ITEMS = ['STARTING LINEUP', 'INVENTORY'];
const LINEUP_POSITIONS = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'FLEX'];

// ============================================================================
// SUB-COMPONENTS - Extracted for better organization
// ============================================================================

function ThemePicker({ currentTheme, onThemeChange, show, onClose }) {
  const pickerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div ref={pickerRef} className="absolute top-full right-0 mt-2 w-72 bg-dk-black-tertiary border-2 border-dk-black-light rounded-lg shadow-2xl overflow-hidden z-50">
      <div className="p-3 bg-dk-black-secondary border-b border-dk-black-light">
        <h3 className="text-sm font-dk-display font-bold text-dk-white-primary">Banner Theme</h3>
      </div>
      <div className="p-2 max-h-96 overflow-y-auto">
        {THEME_OPTIONS.map(theme => (
          <button
            key={theme.id}
            onClick={() => onThemeChange(theme.id)}
            className={`w-full flex items-center gap-3 p-2.5 rounded-lg mb-1.5 transition-all ${
              currentTheme === theme.id 
                ? 'bg-dk-green-primary/20 border-2 border-dk-green-primary' 
                : 'bg-dk-black-secondary border-2 border-transparent hover:border-dk-black-light'
            }`}
          >
            <div className="w-12 h-12 rounded-md border-2 border-dk-black-light flex-shrink-0" style={{ background: theme.preview }} />
            <div className="flex-1 text-left">
              <div className="text-sm font-dk-display font-bold text-dk-white-primary">{theme.name}</div>
              {currentTheme === theme.id && <div className="text-xs text-dk-green-primary mt-0.5">✓ Active</div>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

ThemePicker.propTypes = {
  currentTheme: PropTypes.string.isRequired,
  onThemeChange: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

function TeamImage({ imageUrl, teamName, uploading, onImageClick }) {
  return (
    <button onClick={onImageClick} disabled={uploading} className="relative group flex-shrink-0" title="Change team image">
      {imageUrl ? (
        <div className="relative">
          <img src={imageUrl} alt={teamName || 'Team'} className="w-16 h-16 rounded-lg object-cover border-2 border-dk-black-light group-hover:opacity-75 transition-opacity" />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>
      ) : (
        <div className="w-16 h-16 rounded-lg bg-dk-black-tertiary border-2 border-dk-black-light flex items-center justify-center group-hover:border-dk-green-primary group-hover:bg-dk-black-light transition-colors">
          <svg className="w-8 h-8 text-dk-white-muted group-hover:text-dk-green-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      )}
    </button>
  );
}

TeamImage.propTypes = {
  imageUrl: PropTypes.string,
  teamName: PropTypes.string,
  uploading: PropTypes.bool,
  onImageClick: PropTypes.func.isRequired
};

function TeamNameEditor({ teamName, username, isEditing, editedName, onEdit, onChange, onBlur, onKeyDown, inputRef }) {
  return (
    <div className="flex flex-col">
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editedName}
          onChange={onChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          maxLength={30}
          className="text-2xl md:text-3xl font-dk-display font-black text-dk-white-primary bg-dk-black-tertiary border-2 border-dk-green-primary rounded px-2 py-1 focus:outline-none"
        />
      ) : (
        <button onClick={onEdit} className="text-2xl md:text-3xl font-dk-display font-black text-dk-white-primary hover:text-dk-green-primary transition-colors text-left group" title="Edit team name">
          {teamName || 'Your Team'}
          <svg className="inline-block ml-2 w-5 h-5 text-dk-white-muted group-hover:text-dk-green-primary transition-colors opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}
      {username && <span className="text-sm text-dk-white-muted font-dk">{username}</span>}
    </div>
  );
}

TeamNameEditor.propTypes = {
  teamName: PropTypes.string,
  username: PropTypes.string,
  isEditing: PropTypes.bool.isRequired,
  editedName: PropTypes.string.isRequired,
  onEdit: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func.isRequired,
  inputRef: PropTypes.object
};

function ScoreProgressBar({ userScore, averageScore, maxScore, isFinal, isLive }) {
  const userPercentage = Math.min((userScore / maxScore) * 100, 100);
  const averagePercentage = Math.min((averageScore / maxScore) * 100, 100);

  return (
    <div className="relative flex-1 h-2.5 bg-dk-black-tertiary rounded-full overflow-hidden border border-dk-black-light">
      <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10" style={{ left: `${averagePercentage}%` }} />
      <div
        className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ${
          isFinal ? 'bg-gradient-to-r from-blue-500 to-blue-400' : isLive ? 'bg-gradient-to-r from-red-500 to-red-400' : 'bg-gradient-to-r from-slate-500 to-slate-400'
        }`}
        style={{ width: `${userPercentage}%` }}
      />
    </div>
  );
}

ScoreProgressBar.propTypes = {
  userScore: PropTypes.number.isRequired,
  averageScore: PropTypes.number.isRequired,
  maxScore: PropTypes.number.isRequired,
  isFinal: PropTypes.bool.isRequired,
  isLive: PropTypes.bool.isRequired
};

function ScoreBadge({ label, score, isFinal, isLive }) {
  return (
    <div className={`rounded-lg px-3 py-1.5 shadow-lg border-2 ${
      isFinal ? 'bg-gradient-to-r from-blue-600 to-blue-700 border-blue-400' : isLive ? 'bg-gradient-to-r from-red-600 to-red-700 border-red-400' : 'bg-gradient-to-r from-slate-700 to-slate-800 border-slate-600'
    }`}>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-white/90 font-semibold uppercase tracking-wider">{label}</span>
        <span className="text-xl text-white font-black leading-none">{score.toFixed(1)}</span>
      </div>
    </div>
  );
}

ScoreBadge.propTypes = {
  label: PropTypes.string.isRequired,
  score: PropTypes.number.isRequired,
  isFinal: PropTypes.bool,
  isLive: PropTypes.bool
};

function StatsDisplay({ coins, wins, losses, maxLosses, contestType }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Coins */}
      <div className="flex items-center gap-1.5 bg-dk-black-tertiary/60 px-2.5 py-1.5 rounded-md border border-dk-black-light/50">
        <span className="text-sm">💰</span>
        <span className="text-sm font-dk-display font-bold text-dk-white-primary">{coins?.toLocaleString() || '0'}</span>
      </div>
      
      {/* Wins */}
      <div className="flex items-center gap-1.5 bg-dk-black-tertiary/60 px-2.5 py-1.5 rounded-md border border-dk-black-light/50">
        <span className="text-sm">🏆</span>
        <span className="text-sm font-dk-display font-bold text-dk-white-primary">{wins || 0}</span>
        <span className="text-xs text-dk-white-muted/70 uppercase">W</span>
      </div>
      
      {/* Losses */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5">
          {Array.from({ length: maxLosses || 3 }, (_, index) => (
            <div
              key={index}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                index < (losses || 0) ? 'bg-red-500 border-red-600 shadow-md' : 'bg-dk-black-tertiary border-dk-black-light'
              }`}
            >
              {index < (losses || 0) && <span className="text-white text-[10px] font-bold">✗</span>}
            </div>
          ))}
        </div>
        <span className="text-xs text-dk-white-muted font-medium">
          {contestType ? (
            <>
              <span className="font-dk-display font-bold text-dk-white-primary text-sm">{maxLosses - (losses || 0)}</span>
              <span className="text-dk-white-muted/80"> {maxLosses - (losses || 0) === 1 ? 'Loss' : 'Losses'} Left</span>
              <span className="ml-1.5 text-dk-white-muted/50 text-[10px]">({contestType.display_name})</span>
            </>
          ) : (
            <>
              <span className="font-dk-display font-bold text-dk-white-primary text-sm">{3 - (losses || 0)}</span>
              <span className="text-dk-white-muted/80"> {3 - (losses || 0) === 1 ? 'Loss' : 'Losses'} Left</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}

StatsDisplay.propTypes = {
  coins: PropTypes.number,
  wins: PropTypes.number,
  losses: PropTypes.number,
  maxLosses: PropTypes.number,
  contestType: PropTypes.object
};

// ============================================================================
// CUSTOM HOOKS - Extracted for better organization
// ============================================================================

function useTeamData(teamId) {
  const [teamImage, setTeamImage] = useState(null);
  const [localTeamName, setLocalTeamName] = useState('');
  const [simulatedSeasonId, setSimulatedSeasonId] = useState(null);

  useEffect(() => {
    if (!teamId) return;

    const fetchTeamData = async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('team_image_url, team_name, simulated_season_id')
        .eq('id', teamId)
        .single();

      if (!error && data) {
        setTeamImage(data.team_image_url);
        setLocalTeamName(data.team_name);
        setSimulatedSeasonId(data.simulated_season_id);
      }
    };

    fetchTeamData();
  }, [teamId]);

  return { teamImage, setTeamImage, localTeamName, setLocalTeamName, simulatedSeasonId };
}

function useTheme(teamId) {
  const [bannerTheme, setBannerTheme] = useState('default');

  useEffect(() => {
    const savedTheme = localStorage.getItem(`bannerTheme_${teamId}`);
    setBannerTheme(savedTheme || 'default');
  }, [teamId]);

  const handleThemeChange = (themeId) => {
    setBannerTheme(themeId);
    localStorage.setItem(`bannerTheme_${teamId}`, themeId);
  };

  const getCurrentTheme = () => {
    return THEME_OPTIONS.find(t => t.id === bannerTheme) || THEME_OPTIONS[0];
  };

  return { bannerTheme, handleThemeChange, getCurrentTheme };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FantasyNavBanner({ 
  username, 
  teamName, 
  wins, 
  losses, 
  coins,
  teamId,
  userId,
  liveGameData,
  lineup,
  projections,
  team,
  currentWeek: contextCurrentWeek,
  previewMode = false
}) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Custom hooks
  const { teamImage, setTeamImage, localTeamName, setLocalTeamName, simulatedSeasonId } = useTeamData(teamId);
  const { bannerTheme, handleThemeChange, getCurrentTheme } = useTheme(teamId);
  
  // Refs
  const nameInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const averageCalculatedRef = useRef(false);

  // UI State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(teamName);
  const [uploading, setUploading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Week & Game State
  const [currentWeek, setCurrentWeek] = useState(contextCurrentWeek || null);
  const [displayWeek, setDisplayWeek] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [isFinal, setIsFinal] = useState(false);
  const [weekIsFinalized, setWeekIsFinalized] = useState(false);
  const [hasWeeklyLineup, setHasWeeklyLineup] = useState(false);

  // Score State
  const [projectedPoints, setProjectedPoints] = useState(0);
  const [livePoints, setLivePoints] = useState(0);
  const [projectedFinal, setProjectedFinal] = useState(0);
  const [globalStats, setGlobalStats] = useState(null);
  const [simulatedAverage, setSimulatedAverage] = useState(null);

  const isViewMode = location.pathname.includes('/view');

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleNameClick = () => {
    setIsEditingName(true);
    setEditedName(localTeamName);
  };

  const handleNameChange = (e) => setEditedName(e.target.value);

  const handleNameBlur = async () => {
    if (editedName.trim() && editedName !== localTeamName) {
      try {
        const { error } = await supabase
          .from('teams')
          .update({ team_name: editedName.trim() })
          .eq('id', teamId);
        if (error) throw error;
        setLocalTeamName(editedName.trim());
      } catch (err) {
        console.error('Error updating team name:', err);
        setEditedName(localTeamName);
      }
    } else {
      setEditedName(localTeamName);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      nameInputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditedName(localTeamName);
      setIsEditingName(false);
    }
  };

  const handleImageClick = () => fileInputRef.current?.click();

  const handleImageSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('Image must be less than 2MB'); return; }

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${teamId}-${Date.now()}.${fileExt}`;

      if (teamImage) {
        const oldPath = teamImage.split('/').slice(-2).join('/');
        await supabase.storage.from('team-images').remove([oldPath]);
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('team-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('team-images').getPublicUrl(uploadData.path);
      const { error: updateError } = await supabase.from('teams').update({ team_image_url: publicUrl }).eq('id', teamId);
      if (updateError) throw updateError;

      setTeamImage(publicUrl);
    } catch (err) {
      console.error('Error uploading image:', err);
      alert(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const calculateSimulatedAverage = async (seasonId) => {
    if (!currentWeek || !teamId || !seasonId) return;
    
    try {
      const { data: botLineups, error } = await supabase
        .from('weekly_lineups')
        .select('lineup_snapshot, team_id, team:teams!inner(simulated_season_id, is_bot)')
        .eq('team.simulated_season_id', seasonId)
        .eq('team.is_bot', true)
        .eq('week_number', currentWeek.week)
        .eq('season_year', currentWeek.year);
      
      if (error || !botLineups || botLineups.length === 0) return;
      
      let totalProjected = 0;
      let teamCount = 0;
      
      for (const lineup of botLineups) {
        if (!lineup.lineup_snapshot) continue;
        
        let teamProjected = 0;
        const positions = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE'];
        
        for (const pos of positions) {
          const playerData = lineup.lineup_snapshot[pos];
          if (playerData && playerData.player_id) {
            const positionMap = {
              'Quarterback': { min: 12, max: 30 },
              'Running Back': { min: 6, max: 22 },
              'Wide Receiver': { min: 4, max: 19 },
              'Tight End': { min: 3, max: 14 }
            };
            
            let position = playerData.position;
            if (!position) {
              const { data: playerCard } = await supabase
                .from('player_cards')
                .select('position')
                .eq('id', playerData.player_id)
                .single();
              position = playerCard?.position;
            }
            
            const range = positionMap[position] || { min: 5, max: 15 };
            const baseAvg = (range.min + range.max) / 2;
            const seed = parseInt(playerData.player_id.replace(/-/g, '').substring(0, 8), 16);
            const weekSeed = (seed * 37 + (currentWeek?.week || 1) * 997) % 1000;
            const weekVariance = ((weekSeed % 200) - 100) / 333;
            let points = baseAvg * (1 + weekVariance);
            points = Math.max(range.min * 0.7, Math.min(range.max * 1.3, points));
            teamProjected += points;
          }
        }
        
        if (teamProjected > 0) {
          totalProjected += teamProjected;
          teamCount++;
        }
      }
      
      if (teamCount > 0) {
        const avg = totalProjected / teamCount;
        setSimulatedAverage(avg.toFixed(1));
      }
    } catch (error) {
      console.error('Error calculating simulated average:', error);
    }
  };

  const getNavItems = () => {
    return NAV_ITEMS
      .filter(item => !isViewMode || VIEW_MODE_NAV_ITEMS.includes(item.label))
      .map(item => ({ ...item, path: `/teams/${teamId}/${item.path}` }));
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    setLocalTeamName(teamName);
    setEditedName(teamName);
  }, [teamName]);

  useEffect(() => {
    if (contextCurrentWeek) setCurrentWeek(contextCurrentWeek);
  }, [contextCurrentWeek]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (simulatedSeasonId && currentWeek && !averageCalculatedRef.current) {
      averageCalculatedRef.current = true;
      calculateSimulatedAverage(simulatedSeasonId);
    }
  }, [simulatedSeasonId, currentWeek]);

  // Check week status and set display week
  useEffect(() => {
    if (!currentWeek || !teamId) {
      setDisplayWeek(null);
      return;
    }

    const checkWeekStatus = async () => {
      if (team?.current_week && team.current_week > currentWeek.week) {
        const teamStartWeek = { week: team.current_week, year: currentWeek.year };
        setDisplayWeek(teamStartWeek);
        setWeekIsFinalized(false);
        setIsLive(false);
        setIsFinal(false);
        setGlobalStats(null);
        setHasWeeklyLineup(false);
        return;
      }
      
      const { data: lineupData } = await supabase
        .from('weekly_lineups')
        .select('status')
        .eq('team_id', teamId)
        .eq('week_number', currentWeek.week)
        .eq('season_year', currentWeek.year)
        .maybeSingle();

      const isFinalized = lineupData?.status === 'completed';
      setWeekIsFinalized(isFinalized);

      if (previewMode && isFinalized) {
        const nextWeek = { week: currentWeek.week + 1, year: currentWeek.year };
        setDisplayWeek(nextWeek);
        setIsLive(false);
        setIsFinal(false);
        setGlobalStats(null);
        setHasWeeklyLineup(false);
      } else {
        setDisplayWeek(currentWeek);
      }
    };

    checkWeekStatus();
  }, [currentWeek, teamId, previewMode, team?.current_week]);

  // Calculate projected points from lineup
  useEffect(() => {
    if (!lineup) return;
    
    let total = 0;
    LINEUP_POSITIONS.forEach(pos => {
      const player = lineup[pos];
      if (player?.player_card) {
        const weeklyProj = player.player_card.weekly_projected_points;
        if (weeklyProj && parseFloat(weeklyProj) > 0) {
          total += parseFloat(weeklyProj);
        } else if (projections && projections.size > 0) {
          const projection = projections.get(player.player_card.player_id);
          if (projection?.projected) total += projection.projected;
        }
      }
    });
    
    setProjectedPoints(total);
  }, [lineup, projections]);

  // Fetch stats - simplified version
  useEffect(() => {
    if (!displayWeek || !teamId) return;

    let subscription = null;
    let pollingInterval = null;

    const fetchStats = async () => {
      try {
        if (simulatedSeasonId) setIsLive(false);
        
        const { data: globalData } = await supabase
          .from('weekly_global_stats')
          .select('*')
          .eq('week_number', displayWeek.week)
          .eq('season_year', displayWeek.year)
          .maybeSingle();
        
        setGlobalStats(globalData);

        const { data: lineupData } = await supabase
          .from('weekly_lineups')
          .select('total_points, status, lineup_snapshot')
          .eq('team_id', teamId)
          .eq('week_number', displayWeek.week)
          .eq('season_year', displayWeek.year)
          .maybeSingle();

        const weekFinalizedStatus = lineupData?.status === 'completed';
        setIsFinal(weekFinalizedStatus);
        setWeekIsFinalized(weekFinalizedStatus);
        setHasWeeklyLineup(!!lineupData);

        if (previewMode && weekFinalizedStatus && displayWeek.week > currentWeek.week) {
          setIsLive(false);
          setIsFinal(false);
          setGlobalStats(null);
          setHasWeeklyLineup(false);
          return;
        }

        let weekIsLive = false;
        if (lineupData && !simulatedSeasonId && !weekFinalizedStatus) {
          const { data: startedGames } = await supabase
            .from('game_scores')
            .select('id')
            .eq('week_number', displayWeek.week)
            .eq('season_year', displayWeek.year)
            .in('game_status', ['live', 'halftime', 'final']);
          weekIsLive = startedGames && startedGames.length > 0;
        }
        setIsLive(weekIsLive);

        if (lineupData) {
          if (weekFinalizedStatus) {
            const finalScore = lineupData.total_points || 0;
            setLivePoints(finalScore);
            setProjectedFinal(finalScore);
          } else if (weekIsLive && lineup) {
            let calculatedTotal = 0;
            let projectedFinalTotal = 0;
            
            LINEUP_POSITIONS.forEach(pos => {
              const player = lineup[pos];
              if (player?.player_card?.player_id) {
                const gameData = liveGameData?.get(player.player_card.player_id);
                const statusLower = gameData?.gameStatus?.toLowerCase();
                
                if (gameData && (statusLower === 'final' || statusLower === 'live' || statusLower === 'halftime')) {
                  const pts = gameData.currentPoints || 0;
                  calculatedTotal += pts;
                  projectedFinalTotal += pts;
                } else {
                  const projection = projections?.get(player.player_card.player_id);
                  if (projection?.projected) projectedFinalTotal += projection.projected;
                }
              }
            });
            
            setLivePoints(calculatedTotal);
            setProjectedFinal(projectedFinalTotal);
          } else if (lineupData.lineup_snapshot) {
            let calculatedProjected = 0;
            Object.keys(lineupData.lineup_snapshot).forEach(pos => {
              const playerData = lineupData.lineup_snapshot[pos];
              if (playerData && playerData.projected_points) {
                calculatedProjected += parseFloat(playerData.projected_points);
              }
            });
            setProjectedFinal(calculatedProjected);
          }
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    const setupSubscription = () => {
      subscription = supabase
        .channel('banner-stats')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_lineups', filter: `team_id=eq.${teamId}` }, () => fetchStats())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_global_stats', filter: `week_number=eq.${displayWeek.week}` }, (payload) => {
          if (payload.new) setGlobalStats(payload.new);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_scores' }, () => fetchStats())
        .subscribe();
    };

    fetchStats();
    setupSubscription();
    pollingInterval = setInterval(fetchStats, 10000);

    return () => {
      if (subscription) subscription.unsubscribe();
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [displayWeek, teamId, simulatedSeasonId, liveGameData, lineup, previewMode]);

  // ============================================================================
  // CALCULATED VALUES
  // ============================================================================

  const userScore = (isLive || isFinal) ? livePoints : projectedPoints;
  const hasGlobalStats = globalStats && globalStats.total_active_teams > 0;
  const averageScore = simulatedSeasonId && simulatedAverage ? parseFloat(simulatedAverage) : (hasGlobalStats ? (globalStats?.median_score || 0) : userScore);
  const maxScore = hasGlobalStats ? (globalStats?.highest_score || userScore * 1.5) : (userScore * 1.5);
  const isAboveAverage = hasGlobalStats ? userScore >= averageScore : true;
  const teamHasntStarted = team?.current_week && currentWeek?.week && (team.current_week > currentWeek.week || (team.current_week === currentWeek.week && !hasWeeklyLineup));

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {teamHasntStarted && (
        <div className="bg-blue-900/30 border-b-2 border-blue-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="text-blue-100 font-semibold text-sm">
                Your first week will be Week {team.current_week}. The current week ({currentWeek.week}) is already in progress.
              </span>
            </div>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

      <div className={`${getCurrentTheme().bg} border-b border-dk-black-light transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          
          {/* Team Header with Theme Picker */}
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-3">
              <TeamImage imageUrl={teamImage} teamName={localTeamName} uploading={uploading} onImageClick={handleImageClick} />
              <TeamNameEditor 
                teamName={localTeamName}
                username={username}
                isEditing={isEditingName}
                editedName={editedName}
                onEdit={handleNameClick}
                onChange={handleNameChange}
                onBlur={handleNameBlur}
                onKeyDown={handleNameKeyDown}
                inputRef={nameInputRef}
              />
            </div>
            
            {/* Theme Picker Button - Right Side */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-1.5 rounded-lg bg-black/30 hover:bg-black/50 border border-white/20 transition-all group"
                title="Customize banner"
              >
                <svg className="w-4 h-4 text-white/80 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </button>
              <ThemePicker currentTheme={bannerTheme} onThemeChange={handleThemeChange} show={showColorPicker} onClose={() => setShowColorPicker(false)} />
            </div>
          </div>

          {/* Score Display - Compact Design */}
          <div className="space-y-2">
            {/* Week & Score Row */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 min-w-fit">
                {displayWeek ? (
                  <span className="text-xs font-dk-display font-bold text-dk-white-muted uppercase tracking-wide">Week {displayWeek.week}</span>
                ) : (
                  <span className="text-xs font-dk-display font-bold text-dk-white-muted uppercase opacity-50">Loading...</span>
                )}
                {(isLive || isFinal) && !previewMode && (
                  <span className={`px-1.5 py-0.5 ${isFinal ? 'bg-blue-600' : 'bg-red-500'} text-white text-[10px] font-dk-display font-bold rounded flex items-center gap-1`}>
                    {!isFinal && <span className="w-1 h-1 bg-white rounded-full animate-pulse"></span>}
                    {isFinal ? 'FINAL' : 'LIVE'}
                  </span>
                )}
              </div>

              <div className="flex-1 flex items-center gap-2">
                <ScoreProgressBar userScore={userScore} averageScore={averageScore} maxScore={maxScore} isFinal={isFinal} isLive={isLive} />
                <span className="text-[10px] text-dk-white-muted font-dk whitespace-nowrap font-semibold">Avg {averageScore.toFixed(1)}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {isLive && !isFinal && projectedFinal >= livePoints && (
                  <ScoreBadge label="PROJ FINAL" score={projectedFinal} />
                )}
                <ScoreBadge label={isFinal ? 'FINAL' : (isLive ? 'LIVE' : 'PROJECTED')} score={userScore} isFinal={isFinal} isLive={isLive} />
              </div>
            </div>

            {/* Stats Row with Median Comparison */}
            <div className="flex items-center justify-between gap-3">
              <StatsDisplay coins={coins} wins={wins} losses={losses} maxLosses={team?.contest_type?.max_losses} contestType={team?.contest_type} />
              {hasGlobalStats && (
                <p className={`text-[10px] font-dk-display font-bold whitespace-nowrap ${
                  userScore > averageScore 
                    ? 'text-blue-400' 
                    : userScore < averageScore
                      ? 'text-orange-400'
                      : 'text-dk-white-muted'
                }`}>
                  {userScore > averageScore 
                    ? `↑ ${(userScore - averageScore).toFixed(1)} above`
                    : userScore < averageScore
                      ? `↓ ${(averageScore - userScore).toFixed(1)} below`
                      : `= At median`
                  }
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-dk-black-secondary border-b border-dk-black-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex flex-wrap gap-2">
            {getNavItems().map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-3 py-1.5 rounded text-xs font-dk-display font-bold transition-all ${
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
    </>
  );
}

FantasyNavBanner.propTypes = {
  username: PropTypes.string,
  teamName: PropTypes.string,
  wins: PropTypes.number,
  losses: PropTypes.number,
  coins: PropTypes.number,
  teamId: PropTypes.string,
  userId: PropTypes.string,
  liveGameData: PropTypes.instanceOf(Map),
  lineup: PropTypes.object,
  projections: PropTypes.instanceOf(Map),
  team: PropTypes.object,
  currentWeek: PropTypes.object,
  previewMode: PropTypes.bool
};
