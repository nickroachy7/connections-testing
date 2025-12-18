import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../services/supabase';

/**
 * TeamHeader Component
 * 
 * Displays team identity information:
 * - Team image (clickable to upload)
 * - Team name (editable)
 * - Username
 * - Coins, Wins, Losses
 * - Theme customization
 */
export default function TeamHeader({ 
  username, 
  teamName, 
  wins, 
  losses, 
  coins,
  teamId,
  team,
  rank,
  lives
}) {
  const [teamImage, setTeamImage] = useState(null);
  const [localTeamName, setLocalTeamName] = useState(teamName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(teamName);
  const [uploading, setUploading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [bannerTheme, setBannerTheme] = useState('default');
  const nameInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const colorPickerRef = useRef(null);

  // themeOptions must match TeamBanner.jsx exactly - darker -900 colors
  const themeOptions = [
    { id: 'default', name: 'Classic Dark', bg: 'bg-dk-black-secondary', preview: 'linear-gradient(to right, #1a1a1a, #1a1a1a)' },
    { id: 'ocean', name: 'Ocean Blue', bg: 'bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-900', preview: 'linear-gradient(to right, rgb(30, 58, 138), rgb(30, 64, 175), rgb(22, 78, 99))' },
    { id: 'forest', name: 'Forest Green', bg: 'bg-gradient-to-r from-emerald-900 via-green-800 to-teal-900', preview: 'linear-gradient(to right, rgb(6, 78, 59), rgb(22, 101, 52), rgb(19, 78, 74))' },
    { id: 'sunset', name: 'Sunset Orange', bg: 'bg-gradient-to-r from-orange-900 via-red-900 to-pink-900', preview: 'linear-gradient(to right, rgb(124, 45, 18), rgb(127, 29, 29), rgb(131, 24, 67))' },
    { id: 'purple', name: 'Royal Purple', bg: 'bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900', preview: 'linear-gradient(to right, rgb(88, 28, 135), rgb(107, 33, 168), rgb(49, 46, 129))' },
    { id: 'crimson', name: 'Fire Red', bg: 'bg-gradient-to-r from-red-900 via-orange-900 to-yellow-900', preview: 'linear-gradient(to right, rgb(127, 29, 29), rgb(124, 45, 18), rgb(113, 63, 18))' },
    { id: 'midnight', name: 'Midnight Blue', bg: 'bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950', preview: 'linear-gradient(to right, rgb(15, 23, 42), rgb(23, 37, 84), rgb(30, 27, 75))' },
    { id: 'emerald', name: 'Emerald Dream', bg: 'bg-gradient-to-r from-emerald-900 via-green-800 to-lime-900', preview: 'linear-gradient(to right, rgb(6, 78, 59), rgb(22, 101, 52), rgb(54, 83, 20))' },
    { id: 'rose', name: 'Rose Gold', bg: 'bg-gradient-to-r from-pink-900 via-rose-800 to-red-900', preview: 'linear-gradient(to right, rgb(131, 24, 67), rgb(159, 18, 57), rgb(127, 29, 29))' },
    { id: 'arctic', name: 'Arctic Ice', bg: 'bg-gradient-to-r from-cyan-900 via-blue-900 to-indigo-900', preview: 'linear-gradient(to right, rgb(22, 78, 99), rgb(30, 58, 138), rgb(49, 46, 129))' }
  ];

  // Click outside handler for color picker
  useEffect(() => {
    function handleClickOutside(event) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setShowColorPicker(false);
      }
    }
    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColorPicker]);

  const handleThemeChange = async (themeId) => {
    setBannerTheme(themeId);
    setShowColorPicker(false);
    
    // Save to database
    try {
      const { error } = await supabase
        .from('teams')
        .update({ banner_theme: themeId })
        .eq('id', teamId);
      
      if (!error) {
        // Also update localStorage for backwards compatibility
        localStorage.setItem(`bannerTheme_${teamId}`, themeId);
      }
    } catch (err) {
      console.error('Error saving theme:', err);
    }
  };

  const getCurrentTheme = () => themeOptions.find(t => t.id === bannerTheme) || themeOptions[0];

  useEffect(() => {
    if (teamId) {
      const fetchTeamData = async () => {
        const { data, error } = await supabase
          .from('teams')
          .select('team_image_url, team_name, banner_theme')
          .eq('id', teamId)
          .single();

        if (!error && data) {
          setTeamImage(data.team_image_url);
          setLocalTeamName(data.team_name);
          // Load theme from database, fallback to localStorage
          setBannerTheme(data.banner_theme || localStorage.getItem(`bannerTheme_${teamId}`) || 'default');
        }
      };
      fetchTeamData();
    }
  }, [teamId]);

  useEffect(() => {
    setLocalTeamName(teamName);
    setEditedName(teamName);
  }, [teamName]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

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

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB');
      return;
    }

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

      const { data: { publicUrl } } = supabase.storage
        .from('team-images')
        .getPublicUrl(uploadData.path);

      const { error: updateError } = await supabase
        .from('teams')
        .update({ team_image_url: publicUrl })
        .eq('id', teamId);

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

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative">
        {/* Color Picker Button - Top Right */}
        <div className="absolute top-3 right-4 z-10" ref={colorPickerRef}>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-2 rounded-lg bg-black/30 hover:bg-black/50 border border-white/20 transition-all duration-200 group"
              title="Customize banner color"
            >
              <svg className="w-5 h-5 text-white/80 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </button>

            {showColorPicker && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-dk-black-tertiary border-2 border-dk-black-light rounded-lg shadow-2xl overflow-hidden">
                <div className="p-3 bg-dk-black-secondary border-b border-dk-black-light">
                  <h3 className="text-sm font-dk-display font-bold text-dk-white-primary">Choose Banner Theme</h3>
                </div>
                <div className="p-2 max-h-96 overflow-y-auto">
                  {themeOptions.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeChange(theme.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg mb-1.5 transition-all duration-200 ${
                        bannerTheme === theme.id 
                          ? 'bg-dk-green-primary/20 border-2 border-dk-green-primary' 
                          : 'bg-dk-black-secondary border-2 border-transparent hover:border-dk-black-light'
                      }`}
                    >
                      <div 
                        className="w-12 h-12 rounded-md border-2 border-dk-black-light flex-shrink-0"
                        style={{ background: theme.preview }}
                      />
                      <div className="flex-1 text-left">
                        <div className="text-sm font-dk-display font-bold text-dk-white-primary">{theme.name}</div>
                        {bannerTheme === theme.id && <div className="text-xs text-dk-green-primary mt-0.5">✓ Active</div>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Team Identity Row */}
          <div className="flex items-start gap-4">
            {/* Team Image */}
            <button onClick={handleImageClick} disabled={uploading} className="relative group flex-shrink-0" title="Click to change team image">
              {teamImage ? (
                <div className="relative">
                  <img
                    src={teamImage}
                    alt={localTeamName || 'Team'}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover border-2 border-black/40 shadow-xl group-hover:border-white/60 transition-all"
                  />
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                      <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg bg-black/40 backdrop-blur-sm border-2 border-white/20 shadow-lg flex items-center justify-center transition-all group-hover:border-white/50 group-hover:bg-black/60">
                  <svg className="w-8 h-8 md:w-10 md:h-10 text-dk-white-muted group-hover:text-dk-green-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              )}
            </button>
            
            {/* Team Info: Name, Username, and Stats */}
            <div className="flex flex-col min-w-0 flex-1 gap-1">
              {/* Team Name */}
              {isEditingName ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={editedName}
                  onChange={handleNameChange}
                  onBlur={handleNameBlur}
                  onKeyDown={handleNameKeyDown}
                  maxLength={30}
                  className="text-xl md:text-4xl font-dk-display font-black text-dk-white-primary tracking-tight bg-dk-black-tertiary border-2 border-dk-green-primary rounded px-2 py-1 focus:outline-none"
                />
              ) : (
                <button
                  onClick={handleNameClick}
                  className="text-xl md:text-4xl font-dk-display font-black text-white drop-shadow-lg tracking-tight hover:scale-[1.02] transition-all text-left group truncate"
                  title="Click to edit team name"
                >
                  {localTeamName || 'Your Team'}
                  <svg className="hidden md:inline-block ml-2 w-4 h-4 md:w-5 md:h-5 text-dk-white-muted group-hover:text-dk-green-primary transition-colors opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}

              {/* Username */}
              {username && (
                <span className="text-xs md:text-base text-white/80 font-dk drop-shadow truncate">
                  @{username}
                </span>
              )}

              {/* Inline Stats Row: Rank, Record, Coins, Lives */}
              <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm mt-0.5">
                {/* Rank */}
                {rank && (
                  <>
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="font-dk-display font-bold text-white/90">#{rank}</span>
                    </div>
                    <span className="text-white/40">•</span>
                  </>
                )}

                {/* Record */}
                <div className="flex items-center gap-1">
                  <span className="font-dk-display font-bold text-green-400">{wins || 0}</span>
                  <span className="text-white/60">-</span>
                  <span className="font-dk-display font-bold text-red-400">{losses || 0}</span>
                </div>

                <span className="text-white/40">•</span>

                {/* Coins */}
                <div className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                  <span className="font-dk-display font-bold text-white/90">{coins?.toLocaleString() || '0'}</span>
                </div>

                {/* Lives */}
                {lives !== undefined && (
                  <>
                    <span className="text-white/40">•</span>
                    <div className="flex items-center gap-1 bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/30">
                      <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                      <span className="font-dk-display font-bold text-white/90">{lives}</span>
                      <span className="text-[10px] md:text-xs text-white/70 font-dk">lives</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
    </>
  );
}

TeamHeader.propTypes = {
  username: PropTypes.string,
  teamName: PropTypes.string,
  wins: PropTypes.number,
  losses: PropTypes.number,
  coins: PropTypes.number,
  teamId: PropTypes.string.isRequired,
  team: PropTypes.object,
  rank: PropTypes.number,
  lives: PropTypes.number
};