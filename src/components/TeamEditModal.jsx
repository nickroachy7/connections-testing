import { useState } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../services/supabase';

export default function TeamEditModal({ isOpen, onClose, teamId, currentTeamName, currentTeamImage, onUpdate }) {
  const [teamName, setTeamName] = useState(currentTeamName || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState(currentTeamImage || null);
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB');
      return;
    }

    setError('');
    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      let imageUrl = currentTeamImage;

      // Upload image if a new one was selected
      if (imageFile) {
        setUploading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Create unique filename
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${teamId}-${Date.now()}.${fileExt}`;

        // Delete old image if it exists
        if (currentTeamImage) {
          const oldPath = currentTeamImage.split('/').slice(-2).join('/');
          await supabase.storage
            .from('team-images')
            .remove([oldPath]);
        }

        // Upload new image
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('team-images')
          .upload(fileName, imageFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('team-images')
          .getPublicUrl(uploadData.path);

        imageUrl = publicUrl;
        setUploading(false);
      }

      // Update team in database
      const { error: updateError } = await supabase
        .from('teams')
        .update({
          team_name: teamName.trim(),
          team_image_url: imageUrl
        })
        .eq('id', teamId);

      if (updateError) throw updateError;

      // Call the onUpdate callback to refresh parent component
      if (onUpdate) {
        onUpdate({ teamName: teamName.trim(), teamImageUrl: imageUrl });
      }

      onClose();
    } catch (err) {
      console.error('Error saving team:', err);
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-dk-black-secondary border-2 border-dk-black-light rounded-xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-dk-black-light">
          <h2 className="text-2xl font-dk-display font-bold text-dk-white-primary">
            Edit Team
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-600 text-red-300 rounded text-sm">
              {error}
            </div>
          )}

          {/* Team Name Input */}
          <div>
            <label htmlFor="teamName" className="block text-sm font-dk-display font-bold text-dk-white-secondary mb-2">
              Team Name
            </label>
            <input
              type="text"
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={30}
              className="w-full px-4 py-2 bg-dk-black-tertiary border border-dk-black-light rounded text-dk-white-primary focus:outline-none focus:border-dk-green-primary transition-colors"
              placeholder="Enter team name"
            />
            <p className="text-xs text-dk-white-muted mt-1">
              {teamName.length}/30 characters
            </p>
          </div>

          {/* Team Image Upload */}
          <div>
            <label className="block text-sm font-dk-display font-bold text-dk-white-secondary mb-2">
              Team Image
            </label>
            
            {/* Image Preview */}
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Team preview"
                  className="w-32 h-32 rounded-lg object-cover border-2 border-dk-black-light"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="w-32 h-32 border-2 border-dashed border-dk-black-light rounded-lg flex items-center justify-center text-dk-white-muted">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}

            {/* Upload Button */}
            <label htmlFor="imageUpload" className="inline-block mt-3 px-4 py-2 bg-dk-black-tertiary border border-dk-black-light text-dk-white-secondary rounded cursor-pointer hover:bg-dk-black-light transition-colors text-sm font-dk-display font-bold">
              {imagePreview ? 'Change Image' : 'Upload Image'}
            </label>
            <input
              type="file"
              id="imageUpload"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <p className="text-xs text-dk-white-muted mt-1">
              Recommended: Square image, max 2MB
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-dk-black-light flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving || uploading}
            className="px-4 py-2 bg-dk-black-tertiary border border-dk-black-light text-dk-white-secondary rounded hover:bg-dk-black-light transition-colors font-dk-display font-bold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading || !teamName.trim()}
            className="px-4 py-2 bg-dk-green-primary text-dk-black-primary rounded hover:bg-green-500 transition-colors font-dk-display font-bold disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </>
            ) : saving ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

TeamEditModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  teamId: PropTypes.string.isRequired,
  currentTeamName: PropTypes.string,
  currentTeamImage: PropTypes.string,
  onUpdate: PropTypes.func
};
