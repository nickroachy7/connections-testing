import { useState } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';

export default function CreateLeagueModal({ onClose, onSuccess }) {
  const { error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    max_users: 10,
    max_teams_per_user: 1,
    elimination_enabled: true,
    restart_allowed: false,
    fresh_start_required: false,
    restart_requires_new_team: false,
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showError('Please enter a league name');
      return;
    }

    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Not authenticated. Please log in again.');
      }
      
      console.log('Creating league with data:', formData);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-league`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      let result;
      try {
        result = await response.json();
      } catch (e) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      console.log('Response:', result);

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to create league');
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating league:', error);
      showError(error.message || 'Failed to create league');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-primary-black-800 rounded-xl border border-primary-black-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-primary-black-800 border-b border-primary-black-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Create League</h2>
          <button
            onClick={onClose}
            className="text-primary-black-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* League Name */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              League Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter league name..."
              maxLength={50}
              className="w-full px-4 py-3 bg-primary-black-900 border border-primary-black-600 rounded-lg text-white placeholder-primary-black-500 focus:outline-none focus:border-primary-green-500 transition-colors"
            />
          </div>

          {/* Max Users */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Maximum Users
            </label>
            <select
              value={formData.max_users}
              onChange={(e) => handleChange('max_users', parseInt(e.target.value))}
              className="w-full px-4 py-3 bg-primary-black-900 border border-primary-black-600 rounded-lg text-white focus:outline-none focus:border-primary-green-500 transition-colors"
            >
              {[5, 10, 15, 20, 30, 50, 100].map(num => (
                <option key={num} value={num}>{num} users</option>
              ))}
            </select>
          </div>

          {/* Max Teams Per User */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Teams Per User
            </label>
            <select
              value={formData.max_teams_per_user}
              onChange={(e) => handleChange('max_teams_per_user', parseInt(e.target.value))}
              className="w-full px-4 py-3 bg-primary-black-900 border border-primary-black-600 rounded-lg text-white focus:outline-none focus:border-primary-green-500 transition-colors"
            >
              <option value={1}>1 team</option>
              <option value={2}>2 teams</option>
              <option value={3}>3 teams</option>
            </select>
            <p className="text-xs text-primary-black-400 mt-1">
              How many teams each user can enter into this league
            </p>
          </div>

          {/* Elimination Settings */}
          <div className="bg-primary-black-900 rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-bold text-white">Elimination Rules</h3>
            
            {/* Elimination Enabled */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.elimination_enabled}
                onChange={(e) => handleChange('elimination_enabled', e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-primary-black-600 text-primary-green-500 focus:ring-primary-green-500"
              />
              <div>
                <div className="text-sm font-semibold text-white">Enable Elimination</div>
                <div className="text-xs text-primary-black-400">
                  Teams are eliminated after 3 losses (vs league median)
                </div>
              </div>
            </label>

            {/* Restart Allowed (only if elimination enabled) */}
            {formData.elimination_enabled && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.restart_allowed}
                  onChange={(e) => handleChange('restart_allowed', e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-primary-black-600 text-primary-green-500 focus:ring-primary-green-500"
                />
                <div>
                  <div className="text-sm font-semibold text-white">Allow Restarts</div>
                  <div className="text-xs text-primary-black-400">
                    Eliminated teams can restart (free, resets to 3 lives)
                  </div>
                </div>
              </label>
            )}

            {/* Restart Requires New Team (only if restarts allowed) */}
            {formData.elimination_enabled && formData.restart_allowed && (
              <label className="flex items-start gap-3 cursor-pointer ml-8">
                <input
                  type="checkbox"
                  checked={formData.restart_requires_new_team}
                  onChange={(e) => handleChange('restart_requires_new_team', e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-primary-black-600 text-primary-green-500 focus:ring-primary-green-500"
                />
                <div>
                  <div className="text-sm font-semibold text-white">Require New Team on Restart</div>
                  <div className="text-xs text-primary-black-400">
                    Users must create a new team when restarting
                  </div>
                </div>
              </label>
            )}
          </div>

          {/* Entry Requirements */}
          <div className="bg-primary-black-900 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.fresh_start_required}
                onChange={(e) => handleChange('fresh_start_required', e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-primary-black-600 text-primary-green-500 focus:ring-primary-green-500"
              />
              <div>
                <div className="text-sm font-semibold text-white">Require Fresh Start</div>
                <div className="text-xs text-primary-black-400">
                  Users must create a new team to join (can't use existing teams)
                </div>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-primary-black-700 hover:bg-primary-black-600 text-white font-bold rounded-lg transition-all duration-200 border border-primary-black-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create League'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

CreateLeagueModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};
