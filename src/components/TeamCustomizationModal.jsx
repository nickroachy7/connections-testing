import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../services/supabase';

const BANNER_THEMES = [
  { id: 'default', name: 'Classic Dark', bg: 'bg-dk-black-secondary', preview: 'linear-gradient(to right, #1a1a1a, #1a1a1a)' },
  { id: 'ocean', name: 'Ocean Blue', bg: 'bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-900', preview: 'linear-gradient(to right, rgb(30, 58, 138), rgb(30, 64, 175), rgb(22, 78, 99))' },
  { id: 'forest', name: 'Forest Green', bg: 'bg-gradient-to-r from-emerald-900 via-green-800 to-teal-900', preview: 'linear-gradient(to right, rgb(6, 78, 59), rgb(22, 101, 52), rgb(19, 78, 74))' },
  { id: 'sunset', name: 'Sunset Orange', bg: 'bg-gradient-to-r from-orange-900 via-red-900 to-pink-900', preview: 'linear-gradient(to right, rgb(124, 45, 18), rgb(127, 29, 29), rgb(131, 24, 67))' },
  { id: 'purple', name: 'Royal Purple', bg: 'bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900', preview: 'linear-gradient(to right, rgb(88, 28, 135), rgb(107, 33, 168), rgb(49, 46, 129))' },
  { id: 'crimson', name: 'Fire Red', bg: 'bg-gradient-to-r from-red-900 via-orange-900 to-yellow-900', preview: 'linear-gradient(to right, rgb(127, 29, 29), rgb(124, 45, 18), rgb(113, 63, 18))' },
  { id: 'midnight', name: 'Midnight Blue', bg: 'bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950', preview: 'linear-gradient(to right, rgb(15, 23, 42), rgb(23, 37, 84), rgb(35, 31, 81))' },
  { id: 'emerald', name: 'Emerald Dream', bg: 'bg-gradient-to-r from-emerald-900 via-green-800 to-lime-900', preview: 'linear-gradient(to right, rgb(6, 78, 59), rgb(22, 101, 52), rgb(54, 83, 20))' },
  { id: 'rose', name: 'Rose Gold', bg: 'bg-gradient-to-r from-pink-900 via-rose-800 to-red-900', preview: 'linear-gradient(to right, rgb(131, 24, 67), rgb(159, 18, 57), rgb(127, 29, 29))' },
  { id: 'arctic', name: 'Arctic Ice', bg: 'bg-gradient-to-r from-cyan-900 via-blue-900 to-indigo-900', preview: 'linear-gradient(to right, rgb(22, 78, 99), rgb(30, 58, 138), rgb(49, 46, 129))' }
];

/**
 * TeamCustomizationModal Component
 * 
 * Modal for editing team name, uploading team photo, and selecting banner theme.
 */
export default function TeamCustomizationModal({
  isOpen,
  onClose,
  teamId,
  teamName,
  teamImage,
  bannerTheme,
  onTeamNameUpdate,
  onTeamImageUpdate,
  onBannerThemeUpdate
}) {
  const [editedName, setEditedName] = useState(teamName);
  const [selectedTheme, setSelectedTheme] = useState(bannerTheme);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setEditedName(teamName);
  }, [teamName]);

  useEffect(() => {
    setSelectedTheme(bannerTheme);
  }, [bannerTheme]);

  if (!isOpen) return null;

  const handleImageSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${teamId}-${Date.now()}.${fileExt}`;

      // Delete old image if exists
      if (teamImage) {
        const oldPath = teamImage.split('/').slice(-2).join('/');
        await supabase.storage.from('team-images').remove([oldPath]);
      }

      // Upload new image
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('team-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('team-images')
        .getPublicUrl(uploadData.path);

      // Update database
      const { error: updateError } = await supabase
        .from('teams')
        .update({ team_image_url: publicUrl })
        .eq('id', teamId);

      if (updateError) throw updateError;
      
      onTeamImageUpdate(publicUrl);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Update team name if changed
      if (editedName.trim() && editedName !== teamName) {
        const { error: nameError } = await supabase
          .from('teams')
          .update({ team_name: editedName.trim() })
          .eq('id', teamId);
        
        if (nameError) throw nameError;
        onTeamNameUpdate(editedName.trim());
      }

      // Update banner theme
      if (selectedTheme !== bannerTheme) {
        localStorage.setItem(`bannerTheme_${teamId}`, selectedTheme);
        onBannerThemeUpdate(selectedTheme);
      }

      onClose();
    } catch (err) {
      console.error('Error saving customization:', err);
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-dk-black-secondary border-2 border-dk-black-light rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-dk-black-tertiary border-b border-dk-black-light px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-dk-display font-black text-dk-white-primary">
              Customize Team
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-dk-black-light transition-colors"
            >
              <svg className="w-6 h-6 text-dk-white-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Team Name */}
            <div>
              <label className="block text-sm font-bold text-dk-white-primary mb-2">
                Team Name
              </label>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                maxLength={30}
                className="w-full px-4 py-3 bg-dk-black-tertiary border-2 border-dk-black-light rounded-lg text-dk-white-primary focus:border-dk-green-primary focus:outline-none transition-colors"
                placeholder="Enter team name..."
              />
              <p className="text-xs text-dk-white-muted mt-1">
                {editedName.length}/30 characters
              </p>
            </div>

            {/* Team Photo */}
            <div>
              <label className="block text-sm font-bold text-dk-white-primary mb-2">
                Team Photo
              </label>
              <div className="flex items-center gap-4">
                {/* Current Image Preview */}
                <div className="flex-shrink-0">
                  {teamImage ? (
                    <img
                      src={teamImage}
                      alt="Team"
                      className="w-24 h-24 rounded-lg object-cover border-2 border-dk-black-light"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-dk-black-tertiary border-2 border-dk-black-light flex items-center justify-center">
                      <svg className="w-10 h-10 text-dk-white-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full px-4 py-3 bg-dk-green-primary hover:bg-dk-green-secondary text-dk-black-primary font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Upload New Photo</span>
                      </>
                    )}
                  </button>
                  <p className="text-xs text-dk-white-muted mt-2">
                    JPG, PNG, or GIF • Max 2MB
                  </p>
                </div>
              </div>
            </div>

            {/* Banner Theme */}
            <div>
              <label className="block text-sm font-bold text-dk-white-primary mb-3">
                Banner Theme
              </label>
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                {BANNER_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      selectedTheme === theme.id
                        ? 'bg-dk-green-primary/20 border-2 border-dk-green-primary'
                        : 'bg-dk-black-tertiary border-2 border-dk-black-light hover:border-dk-black-light/50'
                    }`}
                  >
                    <div
                      className="w-16 h-16 rounded-md border-2 border-dk-black-light flex-shrink-0"
                      style={{ background: theme.preview }}
                    />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-bold text-dk-white-primary">
                        {theme.name}
                      </div>
                      {selectedTheme === theme.id && (
                        <div className="text-xs text-dk-green-primary font-bold mt-0.5">
                          ✓ Selected
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-dk-black-tertiary border-t border-dk-black-light px-6 py-4 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-dk-black-light hover:bg-dk-black-primary text-dk-white-primary font-bold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-dk-green-primary hover:bg-dk-green-secondary text-dk-black-primary font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

TeamCustomizationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  teamId: PropTypes.string.isRequired,
  teamName: PropTypes.string,
  teamImage: PropTypes.string,
  bannerTheme: PropTypes.string,
  onTeamNameUpdate: PropTypes.func.isRequired,
  onTeamImageUpdate: PropTypes.func.isRequired,
  onBannerThemeUpdate: PropTypes.func.isRequired
};