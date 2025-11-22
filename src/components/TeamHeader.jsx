import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../services/supabase';

/**
 * TeamHeader Component
 * 
 * Displays team identity information:
 * - Team logo (editable via click-to-upload)
 * - Team name (inline editable)
 * - Coins, Wins, Losses stats
 * - Theme customization (9 color options)
 * - Simulated season elimination status
 * 
 * Persists theme preferences in localStorage per team.
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
    { id: 'ocean', name: 'Ocean Blue', bg: 'bg-gradient-to-r from-blue-900 to-blue-800', preview: 'linear-gradient(to right, #1e3a8a, #1e40af)' },
    { id: 'forest', name: 'Forest Green', bg: 'bg-gradient-to-r from-emerald-900 to-green-800', preview: 'linear-gradient(to right, #064e3b, #166534)' },
    { id: 'sunset', name: 'Sunset Orange', bg: 'bg-gradient-to-r from-orange-900 to-red-900', preview: 'linear-gradient(to right, #7c2d12, #7f1d1d)' },
    { id: 'purple', name: 'Royal Purple', bg: 'bg-gradient-to-r from-purple-900 to-indigo-900', preview: 'linear-gradient(to right, #581c87, #312e81)' },
    { id: 'crimson', name: 'Crimson Red', bg: 'bg-gradient-to-r from-red-900 to-rose-900', preview: 'linear-gradient(to right, #7f1d1d, #881337)' },
    { id: 'gold', name: 'Golden Hour', bg: 'bg-gradient-to-r from-yellow-900 to-amber-900', preview: 'linear-gradient(to right, #713f12, #78350f)' },
    { id: 'teal', name: 'Teal Wave', bg: 'bg-gradient-to-r from-teal-900 to-cyan-900', preview: 'linear-gradient(to right, #134e4a, #164e63)' },
    { id: 'slate', name: 'Midnight Slate', bg: 'bg-gradient-to-r from-slate-900 to-gray-900', preview: 'linear-gradient(to right, #0f172a, #111827)' }
  ];

  const currentTheme = themeOptions.find(t => t.id === bannerTheme) || themeOptions[0];

  // Load theme from localStorage
  useEffect(() => {
    if (teamId) {
      const savedTheme = localStorage.getItem(`team-banner-theme-${teamId}`);
      if (savedTheme) {
        setBannerTheme(savedTheme);
      }
    }
  }, [teamId]);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColorPicker]);

  const handleThemeChange = (themeId) => {
    setBannerTheme(themeId);
    if (teamId) {
      localStorage.setItem(`team-banner-theme-${teamId}`, themeId);
    }
    setShowColorPicker(false);
  };

  useEffect(() => {
    setLocalTeamName(teamName);
    setEditedName(teamName);
  }, [teamName]);

  useEffect(() => {
    if (team?.team_image_url) {
      setTeamImage(team.team_image_url);
    }
  }, [team?.team_image_url]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (event) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `${teamId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('team-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('team-images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('teams')
        .update({ team_image_url: publicUrl })
        .eq('id', teamId);

      if (updateError) throw updateError;

      setTeamImage(publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleNameClick = () => {
    setIsEditingName(true);
  };

  const handleNameChange = (e) => {
    setEditedName(e.target.value);
  };

  const handleNameBlur = async () => {
    setIsEditingName(false);
    if (editedName.trim() && editedName !== localTeamName) {
      try {
        const { error } = await supabase
          .from('teams')
          .update({ team_name: editedName.trim() })
          .eq('id', teamId);

        if (error) throw error;
        setLocalTeamName(editedName.trim());
      } catch (error) {
        console.error('Error updating team name:', error);
        setEditedName(localTeamName);
      }
    } else {
      setEditedName(localTeamName);
    }
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      nameInputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditedName(localTeamName);
      setIsEditingName(false);
    }
  };

  return (
    <div className={`${currentTheme.bg} border-b border-dk-black-light relative`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Team Identity */}
          <div className="flex items-center gap-4">
            {/* Team Logo */}
            <div className="relative group">
              <button
                onClick={handleImageClick}
                disabled={uploading}
                className="relative w-16 h-16 rounded-lg overflow-hidden bg-dk-black-tertiary border-2 border-dk-black-light hover:border-dk-green-primary transition-colors disabled:opacity-50"
              >
                {teamImage ? (
                  <img src={teamImage} alt="Team logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-dk-white-muted">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </button>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                  Change
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Team Name & Username */}
            <div className="flex flex-col">
              {isEditingName ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={editedName}
                  onChange={handleNameChange}
                  onBlur={handleNameBlur}
                  onKeyDown={handleNameKeyDown}
                  className="text-2xl font-dk-display font-black text-dk-white bg-dk-black-tertiary border-2 border-dk-green-primary rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-dk-green-primary"
                  maxLength={30}
                />
              ) : (
                <button
                  onClick={handleNameClick}
                  className="text-2xl font-dk-display font-black text-dk-white hover:text-dk-green-primary transition-colors text-left group flex items-center gap-2"
                >
                  {localTeamName}
                  <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
              <span className="text-sm text-dk-white-muted font-dk">@{username}</span>
            </div>
          </div>

          {/* Right: Stats & Theme */}
          <div className="flex items-center gap-6">
            {/* Stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-dk-black-tertiary px-3 py-1.5 rounded-lg border border-dk-black-light">
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <span className="text-lg font-dk-display font-bold text-dk-white">{coins?.toLocaleString() || 0}</span>
              </div>

              <div className="flex items-center gap-3 bg-dk-black-tertiary px-3 py-1.5 rounded-lg border border-dk-black-light">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-dk-white-muted uppercase tracking-wider font-dk-display font-semibold">W</span>
                  <span className="text-lg font-dk-display font-bold text-dk-green-primary">{wins || 0}</span>
                </div>
                <div className="w-px h-6 bg-dk-black-light"></div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-dk-white-muted uppercase tracking-wider font-dk-display font-semibold">L</span>
                  <span className="text-lg font-dk-display font-bold text-red-400">{losses || 0}</span>
                </div>
              </div>

              {team?.contest_type === 'simulated_season' && team?.is_eliminated && (
                <div className="bg-red-900/30 border border-red-500 px-3 py-1.5 rounded-lg">
                  <span className="text-xs font-dk-display font-bold text-red-400 uppercase tracking-wider">Eliminated</span>
                </div>
              )}
            </div>

            {/* Theme Picker */}
            <div className="relative" ref={colorPickerRef}>
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-2 bg-dk-black-tertiary hover:bg-dk-black-light border border-dk-black-light rounded-lg transition-colors group"
                title="Change theme"
              >
                <svg className="w-5 h-5 text-dk-white-muted group-hover:text-dk-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </button>

              {showColorPicker && (
                <div className="absolute right-0 top-full mt-2 bg-dk-black-secondary border border-dk-black-light rounded-lg shadow-2xl p-3 z-50 min-w-[200px]">
                  <div className="text-xs text-dk-white-muted uppercase tracking-wider font-dk-display font-semibold mb-2">Banner Theme</div>
                  <div className="space-y-2">
                    {themeOptions.map(theme => (
                      <button
                        key={theme.id}
                        onClick={() => handleThemeChange(theme.id)}
                        className={`w-full flex items-center gap-2 p-2 rounded hover:bg-dk-black-light transition-colors ${
                          bannerTheme === theme.id ? 'bg-dk-black-light ring-2 ring-dk-green-primary' : ''
                        }`}
                      >
                        <div 
                          className="w-8 h-8 rounded border border-dk-black-light"
                          style={{ background: theme.preview }}
                        />
                        <span className="text-sm text-dk-white font-dk">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

TeamHeader.propTypes = {
  username: PropTypes.string,
  teamName: PropTypes.string,
  wins: PropTypes.number,
  losses: PropTypes.number,
  coins: PropTypes.number,
  teamId: PropTypes.string,
  team: PropTypes.object
};