import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export default function LeagueSettings() {
  const { league } = useOutletContext();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!league.is_commissioner) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-gray-400">
          Only the league commissioner can access settings.
        </p>
      </div>
    );
  }

  const handleDeleteLeague = async () => {
    try {
      setDeleting(true);

      const { error: deleteError } = await supabase
        .from('leagues')
        .delete()
        .eq('id', league.id);

      if (deleteError) throw deleteError;

      success('League deleted successfully');
      navigate('/fantasy/leagues');
    } catch (error) {
      console.error('Error deleting league:', error);
      showError('Failed to delete league');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* League Configuration */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-white mb-6">League Configuration</h2>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-white/10">
            <div>
              <h3 className="text-white font-semibold">League Name</h3>
              <p className="text-gray-400 text-sm">The name of your league</p>
            </div>
            <span className="text-white font-semibold">{league.name}</span>
          </div>

          <div className="flex justify-between items-center py-3 border-b border-white/10">
            <div>
              <h3 className="text-white font-semibold">Maximum Users</h3>
              <p className="text-gray-400 text-sm">Total members allowed</p>
            </div>
            <span className="text-white font-semibold">{league.max_users}</span>
          </div>

          <div className="flex justify-between items-center py-3 border-b border-white/10">
            <div>
              <h3 className="text-white font-semibold">Teams Per User</h3>
              <p className="text-gray-400 text-sm">How many teams each member can enter</p>
            </div>
            <span className="text-white font-semibold">{league.max_teams_per_user}</span>
          </div>

          <div className="flex justify-between items-center py-3 border-b border-white/10">
            <div>
              <h3 className="text-white font-semibold">Elimination</h3>
              <p className="text-gray-400 text-sm">Teams eliminated after 3 losses</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              league.elimination_enabled 
                ? 'bg-red-500/20 text-red-400' 
                : 'bg-gray-500/20 text-gray-400'
            }`}>
              {league.elimination_enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          <div className="flex justify-between items-center py-3 border-b border-white/10">
            <div>
              <h3 className="text-white font-semibold">Restarts</h3>
              <p className="text-gray-400 text-sm">Allow eliminated teams to restart</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              league.restart_allowed 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'bg-gray-500/20 text-gray-400'
            }`}>
              {league.restart_allowed ? 'Allowed' : 'Not Allowed'}
            </span>
          </div>

          <div className="flex justify-between items-center py-3 border-b border-white/10">
            <div>
              <h3 className="text-white font-semibold">Fresh Start Required</h3>
              <p className="text-gray-400 text-sm">Members must create new teams to join</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              league.fresh_start_required 
                ? 'bg-purple-500/20 text-purple-400' 
                : 'bg-gray-500/20 text-gray-400'
            }`}>
              {league.fresh_start_required ? 'Yes' : 'No'}
            </span>
          </div>

          <div className="flex justify-between items-center py-3">
            <div>
              <h3 className="text-white font-semibold">New Team on Restart</h3>
              <p className="text-gray-400 text-sm">Requires creating a new team when restarting</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              league.restart_requires_new_team 
                ? 'bg-yellow-500/20 text-yellow-400' 
                : 'bg-gray-500/20 text-gray-400'
            }`}>
              {league.restart_requires_new_team ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-xl font-bold text-red-400 mb-1">Danger Zone</h2>
            <p className="text-gray-400 text-sm">
              Deleting the league will permanently remove all teams, standings, weekly stats, and history. 
              This action cannot be undone.
            </p>
          </div>
        </div>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete League
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-white font-semibold">
              Are you absolutely sure? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteLeague}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white font-semibold rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting...' : 'Yes, Delete League'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
