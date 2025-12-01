import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import { Trash2, AlertTriangle, Trophy, Target, Users, Shield, Zap, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';

// Helper to format scoring type
const formatScoringType = (type) => {
  const types = {
    standard: 'Standard (0 PPR)',
    half_ppr: 'Half PPR (0.5)',
    full_ppr: 'Full PPR (1.0)',
  };
  return types[type] || type;
};

// Helper to format win condition
const formatWinCondition = (condition) => {
  const conditions = {
    median: 'Beat the Median',
    h2h: 'Head-to-Head',
    both: 'Both (Hardcore)',
  };
  return conditions[condition] || condition;
};

// Helper to format elimination type
const formatEliminationType = (type) => {
  const types = {
    none: 'No Elimination',
    strike: 'Strike System',
    survivor: 'Survivor Mode',
  };
  return types[type] || type;
};

export default function LeagueSettings() {
  const { league } = useOutletContext();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [contestConfig, setContestConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Fetch contest configuration
  useEffect(() => {
    const fetchContestConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('league_contest_config')
          .select('*')
          .eq('league_id', league.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching contest config:', error);
        }
        
        setContestConfig(data);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoadingConfig(false);
      }
    };

    if (league?.id) {
      fetchContestConfig();
    }
  }, [league?.id]);

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
      {/* Contest Configuration */}
      {contestConfig && (
        <div className="bg-gradient-to-br from-primary-green-500/10 to-primary-black-800 border border-primary-green-500/30 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-6 h-6 text-primary-green-500" />
            <h2 className="text-2xl font-bold text-white">Contest Rules</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Scoring Type */}
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary-black-400" />
                <span className="text-sm text-primary-black-400">Scoring Format</span>
              </div>
              <span className="text-lg font-bold text-white">
                {formatScoringType(contestConfig.scoring_type)}
              </span>
            </div>

            {/* Win Condition */}
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary-black-400" />
                <span className="text-sm text-primary-black-400">How to Win</span>
              </div>
              <span className="text-lg font-bold text-white">
                {formatWinCondition(contestConfig.win_condition)}
              </span>
            </div>

            {/* Elimination Type */}
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {contestConfig.elimination_type === 'survivor' ? (
                  <Zap className="w-4 h-4 text-yellow-400" />
                ) : contestConfig.elimination_type === 'strike' ? (
                  <Shield className="w-4 h-4 text-red-400" />
                ) : (
                  <Trophy className="w-4 h-4 text-primary-black-400" />
                )}
                <span className="text-sm text-primary-black-400">Elimination Mode</span>
              </div>
              <span className={`text-lg font-bold ${
                contestConfig.elimination_type === 'survivor' 
                  ? 'text-yellow-400' 
                  : contestConfig.elimination_type === 'strike'
                    ? 'text-red-400'
                    : 'text-white'
              }`}>
                {formatEliminationType(contestConfig.elimination_type)}
              </span>
              {contestConfig.elimination_type === 'strike' && (
                <p className="text-xs text-primary-black-400 mt-1">
                  {contestConfig.max_losses} lives before elimination
                </p>
              )}
            </div>

            {/* Season Info */}
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-primary-black-400" />
                <span className="text-sm text-primary-black-400">Season</span>
              </div>
              <span className="text-lg font-bold text-white">
                {contestConfig.total_weeks} Weeks
              </span>
              <p className="text-xs text-primary-black-400 mt-1">
                Starting Week {contestConfig.start_week}
              </p>
            </div>
          </div>

          {/* Restart Settings */}
          {contestConfig.elimination_type !== 'none' && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-4">
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  contestConfig.restart_allowed 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {contestConfig.restart_allowed ? '✓ Restarts Allowed' : '✗ No Restarts'}
                </div>
                {contestConfig.restart_allowed && contestConfig.max_restarts !== null && (
                  <span className="text-sm text-primary-black-400">
                    (Max {contestConfig.max_restarts} restart{contestConfig.max_restarts !== 1 ? 's' : ''})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* League Configuration */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-white mb-6">League Settings</h2>
        
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

      {/* Invite Code */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-white mb-4">Invite Code</h2>
        <div className="flex items-center gap-4">
          <code className="flex-1 px-4 py-3 bg-primary-black-900 rounded-lg text-primary-green-500 font-mono text-lg tracking-wider">
            {league.invite_code}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(league.invite_code);
              success('Invite code copied!');
            }}
            className="px-4 py-3 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-lg transition-colors"
          >
            Copy
          </button>
        </div>
        <p className="text-sm text-primary-black-400 mt-2">
          Share this code with friends to invite them to your league
        </p>
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
