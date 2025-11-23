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
  team
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

  const themeOptions = [
    { id: 'default', name: 'Classic Dark', bg: 'bg-dk-black-secondary', preview: 'linear-gradient(to right, #1a1a1a, #1a1a1a)' },
    { id: 'ocean', name: 'Ocean Blue', bg: 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500', preview: 'linear-gradient(to right, rgb(37, 99, 235), rgb(59, 130, 246), rgb(6, 182, 212))' },
    { id: 'forest', name: 'Forest Green', bg: 'bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500', preview: 'linear-gradient(to right, rgb(22, 163, 74), rgb(16, 185, 129), rgb(20, 184, 166))' },
    { id: 'sunset', name: 'Sunset Orange', bg: 'bg-gradient-to-r from-orange-500 via-red-500 to-pink-500', preview: 'linear-gradient(to right, rgb(249, 115, 22), rgb(239, 68, 68), rgb(236, 72, 153))' },
    { id: 'purple', name: 'Royal Purple', bg: 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500', preview: 'linear-gradient(to right, rgb(147, 51, 234), rgb(168, 85, 247), rgb(99, 102, 241))' },
    { id: 'crimson', name: 'Fire Red', bg: 'bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500', preview: 'linear-gradient(to right, rgb(220, 38, 38), rgb(249, 115, 22), rgb(234, 179, 8))' },
    { id: 'midnight', name: 'Midnight Blue', bg: 'bg-gradient-to-r from-slate-800 via-blue-900 to-indigo-900', preview: 'linear-gradient(to right, rgb(30, 41, 59), rgb(30, 58, 138), rgb(49, 46, 129))' },
    { id: 'emerald', name: 'Emerald Dream', bg: 'bg-gradient-to-r from-emerald-600 via-green-500 to-lime-500', preview: 'linear-gradient(to right, rgb(5, 150, 105), rgb(34, 197, 94), rgb(132, 204, 22))' },
    { id: 'rose', name: 'Rose Gold', bg: 'bg-gradient-to-r from-pink-500 via-rose-400 to-red-400', preview: 'linear-gradient(to right, rgb(236, 72, 153), rgb(251, 113, 133), rgb(248, 113, 113))' },
    { id: 'arctic', name: 'Arctic Ice', bg: 'bg-gradient-to-r from-cyan-500 via-blue-400 to-indigo-400', preview: 'linear-gradient(to right, rgb(6, 182, 212), rgb(96, 165, 250), rgb(129, 140, 248))' }
  ];

  useEffect(() => {
    const savedTheme = localStorage.getItem(`bannerTheme_${teamId}`);
    setBannerTheme(savedTheme || 'default');
  }, [teamId]);

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

  const handleThemeChange = (themeId) => {
    setBannerTheme(themeId);
    localStorage.setItem(`bannerTheme_${teamId}`, themeId);
    setShowColorPicker(false);
  };

  const getCurrentTheme = () => themeOptions.find(t => t.id === bannerTheme) || themeOptions[0];

  useEffect(() => {
    if (teamId) {
      const fetchTeamData = async () => {
        const { data, error } = await supabase
          .from('teams')
          .select('team_image_url, team_name')
          .eq('id', teamId)
          .single();

        if (!error && data) {
          setTeamImage(data.team_image_url);
          setLocalTeamName(data.team_name);
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
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 md:gap-3">
              {/* Team Image */}
              <button onClick={handleImageClick} disabled={uploading} className="relative group flex-shrink-0" title="Click to change team image">
                {teamImage ? (
                  <div className="relative">
                    <img
                      src={teamImage}
                      alt={localTeamName || 'Team'}
                      className="w-12 h-12 md:w-16 md:h-16 rounded-md object-cover border-2 border-black/40 shadow-xl group-hover:border-white/60 transition-all"
                    />
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                        <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm rounded-md">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-md bg-black/40 backdrop-blur-sm border-2 border-white/20 shadow-lg flex items-center justify-center transition-all group-hover:border-white/50 group-hover:bg-black/60">
                    <svg className="w-6 h-6 md:w-8 md:h-8 text-dk-white-muted group-hover:text-dk-green-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                )}
              </button>
              
              {/* Team Name and Username */}
              <div className="flex flex-col min-w-0 flex-1">
                {isEditingName ? (
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={editedName}
                    onChange={handleNameChange}
                    onBlur={handleNameBlur}
                    onKeyDown={handleNameKeyDown}
                    maxLength={30}
                    className="text-base md:text-3xl font-dk-display font-black text-dk-white-primary tracking-tight bg-dk-black-tertiary border-2 border-dk-green-primary rounded px-2 py-1 focus:outline-none"
                  />
                ) : (
                  <div className="flex items-center gap-1 md:gap-2">
                    <button
                      onClick={handleNameClick}
                      className="text-base md:text-3xl font-dk-display font-black text-white drop-shadow-lg tracking-tight hover:scale-[1.02] transition-all text-left group truncate"
                      title="Click to edit team name"
                    >
                      {localTeamName || 'Your Team'}
                      <svg className="hidden md:inline-block ml-2 w-4 h-4 md:w-5 md:h-5 text-dk-white-muted group-hover:text-dk-green-primary transition-colors opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
                {username && <span className="text-[10px] md:text-sm text-white/90 font-dk drop-shadow truncate">{username}</span>}
              </div>
            </div>

            {/* Coins, Wins, Losses - Mobile & Desktop */}
            <div className="flex md:grid md:grid-cols-3 items-center justify-around md:gap-2 py-1 md:py-0">
              {/* Coins */}
              <div className="flex md:bg-black/30 md:backdrop-blur-sm md:rounded-md md:px-3 md:py-2.5 md:border md:border-white/10 items-center md:flex-col gap-0.5 md:gap-1">
                <svg className="w-3.5 h-3.5 md:w-5 md:h-5 text-yellow-400 drop-shadow-md" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <span className="text-sm md:text-base font-dk-display font-bold text-white drop-shadow-sm leading-none">{coins?.toLocaleString() || '0'}</span>
                <span className="text-[9px] md:text-[9px] text-white/70 font-dk uppercase tracking-wide md:hidden">Coins</span>
              </div>

              {/* Wins */}
              <div className="flex md:bg-black/30 md:backdrop-blur-sm md:rounded-md md:px-3 md:py-2.5 md:border md:border-white/10 items-center md:flex-col gap-0.5 md:gap-1">
                <svg className="w-3.5 h-3.5 md:w-5 md:h-5 text-green-400 drop-shadow-md" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm md:text-base font-dk-display font-bold text-white drop-shadow-sm leading-none">{wins || 0}</span>
                <span className="text-[9px] md:text-[9px] text-white/70 font-dk uppercase tracking-wide md:hidden">Wins</span>
              </div>

              {/* Losses Until Elim */}
              <div className="flex md:bg-black/30 md:backdrop-blur-sm md:rounded-md md:px-3 md:py-2.5 md:border md:border-white/10 items-center md:flex-col gap-0.5 md:gap-1">
                <svg className="w-3.5 h-3.5 md:w-5 md:h-5 text-red-400 drop-shadow-md" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span className="text-sm md:text-base font-dk-display font-bold text-white drop-shadow-sm leading-none">{(team?.contest_type?.max_losses || 3) - (losses || 0)}</span>
                <span className="text-[9px] md:text-[9px] text-white/70 font-dk uppercase tracking-wide leading-tight text-center md:block">Until<br className="md:hidden" /> Elim</span>
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
  team: PropTypes.object
};