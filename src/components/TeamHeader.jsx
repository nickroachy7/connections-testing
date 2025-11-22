import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../services/supabase';

export default function TeamHeader({ teamId, team, username, teamName, wins, losses, coins }) {
  const [editing, setEditing] = useState(false);
  const [editedName, setEditedName] = useState(teamName || '');
  const [teamImage, setTeamImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [bannerTheme, setBannerTheme] = useState('default');
  const fileInputRef = useRef(null);
  const editInputRef = useRef(null);
  const colorPickerRef = useRef(null);

  useEffect(() => {
    if (teamId) {
      const savedTheme = localStorage.getItem(`bannerTheme_${teamId}`);
      if (savedTheme) setBannerTheme(savedTheme);
    }
  }, [teamId]);

  useEffect(() => {
    if (editing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themeOptions = [
    { id: 'default', name: 'Classic Green', bg: 'bg-gradient-to-r from-dk-green-secondary to-dk-green-primary', preview: 'linear-gradient(to right, #0d4d3d, #10b981)' },
    { id: 'ocean', name: 'Ocean Blue', bg: 'bg-gradient-to-r from-blue-900 to-blue-800', preview: 'linear-gradient(to right, #1e3a8a, #1e40af)' },
    { id: 'forest', name: 'Forest Green', bg: 'bg-gradient-to-r from-emerald-900 to-green-800', preview: 'linear-gradient(to right, #064e3b, #166534)' },
    { id: 'sunset', name: 'Sunset Orange', bg: 'bg-gradient-to-r from-orange-900 to-red-900', preview: 'linear-gradient(to right, #7c2d12, #7f1d1d)' },
    { id: 'purple', name: 'Royal Purple', bg: 'bg-gradient-to-r from-purple-900 to-indigo-900', preview: 'linear-gradient(to right, #581c87, #312e81)' },
    { id: 'crimson', name: 'Crimson Red', bg: 'bg-gradient-to-r from-red-950 to-rose-900', preview: 'linear-gradient(to right, #450a0a, #881337)' },
    { id: 'cow', name: 'Moo Cow', bg: 'bg-gradient-to-br from-zinc-100 via-zinc-900 to-zinc-100', preview: 'linear-gradient(135deg, #f4f4f5, #18181b, #f4f4f5)' },
    { id: 'matrix', name: 'Matrix Code', bg: 'bg-gradient-to-b from-black via-green-950 to-black', preview: 'linear-gradient(to bottom, #000000, #052e16, #000000)' },
    { id: 'lava', name: 'Molten Lava', bg: 'bg-gradient-to-r from-red-600 via-orange-600 to-yellow-500', preview: 'linear-gradient(to right, #dc2626, #ea580c, #eab308)' }
  ];

  const getCurrentTheme = () => themeOptions.find(t => t.id === bannerTheme) || themeOptions[0];

  const handleThemeChange = (themeId) => {
    setBannerTheme(themeId);
    localStorage.setItem(`bannerTheme_${teamId}`, themeId);
    setShowColorPicker(false);
  };

  useEffect(() => {
    if (team?.team_image_url) {
      setTeamImage(team.team_image_url);
    }
  }, [team]);

  const handleImageClick = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !teamId) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${teamId}-${Date.now()}.${fileExt}`;
      const filePath = `${teamId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('team-images')
        .upload(filePath, file, { upsert: true });

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
    } catch (err) {
      console.error('Error uploading image:', err);
      alert(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleNameClick = () => setEditing(true);

  const handleNameSave = async () => {
    if (!editedName.trim() || editedName === teamName) {
      setEditing(false);
      setEditedName(teamName || '');
      return;
    }

    try {
      const { error } = await supabase
        .from('teams')
        .update({ team_name: editedName })
        .eq('id', teamId);

      if (error) throw error;
      setEditing(false);
    } catch (err) {
      console.error('Error updating team name:', err);
      alert('Failed to update team name');
      setEditedName(teamName || '');
      setEditing(false);
    }
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditing(false);
      setEditedName(teamName || '');
    }
  };

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

      <div className={`${getCurrentTheme().bg} transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 relative">
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
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-dk-black-light transition-colors group mb-1"
                    >
                      <div 
                        className="w-12 h-12 rounded-lg border-2 border-dk-black-light group-hover:border-dk-green-primary transition-colors"
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
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              {/* Team Image */}
              <button onClick={handleImageClick} disabled={uploading} className="relative group flex-shrink-0" title="Click to change team image">
                {teamImage ? (
                  <div className="relative">
                    <img
                      src={teamImage}
                      alt="Team"
                      className="w-16 h-16 rounded-lg object-cover border-2 border-dk-black-light group-hover:border-dk-green-primary transition-colors"
                    />
                    {uploading && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
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
                  <div className="w-16 h-16 rounded-lg bg-dk-black-tertiary border-2 border-dk-black-light flex items-center justify-center transition-colors group-hover:border-dk-green-primary group-hover:bg-dk-black-light">
                    <svg className="w-8 h-8 text-dk-white-muted group-hover:text-dk-green-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                )}
              </button>
              
              {/* Team Name and Username */}
              <div className="flex flex-col">
                {editing ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onBlur={handleNameSave}
                    onKeyDown={handleNameKeyDown}
                    className="text-2xl font-dk-display font-black text-dk-white bg-black/30 border-2 border-dk-green-primary rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-dk-green-primary"
                    maxLength={30}
                  />
                ) : (
                  <button
                    onClick={handleNameClick}
                    className="text-2xl font-dk-display font-black text-dk-white hover:text-dk-green-primary transition-colors text-left group flex items-center gap-2"
                    title="Click to edit team name"
                  >
                    {teamName}
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
                <span className="text-sm text-dk-white/70 font-dk">{username}</span>
              </div>
            </div>

            {/* Stats Section */}
            <div className="flex items-center gap-4">
              {/* Coins */}
              <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <span className="text-lg font-dk-display font-bold text-dk-white">{coins}</span>
                <span className="text-xs text-dk-white/70 font-dk uppercase">Coins</span>
              </div>

              {/* Record */}
              <div className="flex items-center gap-3 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-dk-white/70 font-dk uppercase">W</span>
                  <span className="text-lg font-dk-display font-bold text-dk-green-primary">{wins}</span>
                </div>
                <div className="w-px h-5 bg-white/20" />
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-dk-white/70 font-dk uppercase">L</span>
                  <span className="text-lg font-dk-display font-bold text-red-400">{losses}</span>
                </div>
              </div>

              {/* Simulated Season Elimination Status */}
              {team?.simulated_season_id && team?.is_eliminated && (
                <div className="bg-red-900/30 border border-red-500/50 px-3 py-1.5 rounded-lg">
                  <span className="text-xs font-dk-display font-bold text-red-400 uppercase">Eliminated</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

TeamHeader.propTypes = {
  teamId: PropTypes.string.isRequired,
  team: PropTypes.object,
  username: PropTypes.string,
  teamName: PropTypes.string,
  wins: PropTypes.number,
  losses: PropTypes.number,
  coins: PropTypes.number
};
