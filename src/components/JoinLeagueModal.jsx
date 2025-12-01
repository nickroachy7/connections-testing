import { useState } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';

export default function JoinLeagueModal({ onClose, onSuccess }) {
  const { error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!inviteCode.trim()) {
      showError('Please enter an invite code');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/join-league`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ invite_code: inviteCode.toUpperCase().trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to join league');
      }

      onSuccess();
    } catch (error) {
      console.error('Error joining league:', error);
      showError(error.message || 'Failed to join league');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-primary-black-800 rounded-xl border border-primary-black-700 max-w-md w-full">
        {/* Header */}
        <div className="border-b border-primary-black-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Join League</h2>
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
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Invite Code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Enter 8-character code..."
              maxLength={8}
              className="w-full px-4 py-3 bg-primary-black-900 border border-primary-black-600 rounded-lg text-white placeholder-primary-black-500 focus:outline-none focus:border-primary-green-500 transition-colors font-mono text-lg tracking-wider"
            />
            <p className="text-xs text-primary-black-400 mt-2">
              Ask the league commissioner for the invite code
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-primary-black-900 rounded-lg p-4 border border-primary-black-700">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white mb-1">What happens next?</h4>
                <ul className="text-xs text-primary-black-400 space-y-1">
                  <li>• You'll become a member of the league</li>
                  <li>• You'll need to add a team to start competing</li>
                  <li>• Your team will compete against the league median</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-primary-black-700 hover:bg-primary-black-600 text-white font-bold rounded-lg transition-all duration-200 border border-primary-black-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !inviteCode.trim()}
              className="flex-1 px-6 py-3 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Joining...' : 'Join League'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

JoinLeagueModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};
