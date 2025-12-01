import { useState, useEffect } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { supabase, startNewTeam } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Trophy, CheckCircle, XCircle, AlertCircle, Plus, ArrowLeft, X } from 'lucide-react';

export default function AddTeamToLeague() {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const { user, league, userTeamsCount, profile } = useOutletContext();
  const { success, error: showError } = useToast();

  const [userTeams, setUserTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [teamName, setTeamName] = useState(`${profile?.username}'s Team`);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    loadUserTeams();
  }, [user.id, league.id]);

  const loadUserTeams = async () => {
    try {
      setLoading(true);

      // Get all user's teams
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (teamsError) throw teamsError;

      // Get teams already in this league
      const { data: leagueTeams, error: leagueTeamsError } = await supabase
        .from('league_teams')
        .select('team_id')
        .eq('league_id', leagueId)
        .eq('user_id', user.id);

      if (leagueTeamsError) throw leagueTeamsError;

      const leagueTeamIds = new Set(leagueTeams?.map(lt => lt.team_id) || []);

      // Enrich teams with validation info
      const enrichedTeams = teams.map(team => {
        const alreadyInLeague = leagueTeamIds.has(team.id);
        const isFreshStart = league.fresh_start_required
          ? new Date(team.created_at) > new Date(league.created_at)
          : true;

        return {
          ...team,
          alreadyInLeague,
          isFreshStart,
          canAdd: !alreadyInLeague && isFreshStart
        };
      });

      setUserTeams(enrichedTeams);
    } catch (error) {
      console.error('Error loading teams:', error);
      showError('Failed to load your teams');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeam = async () => {
    if (!selectedTeamId) return;

    try {
      setSubmitting(true);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-team-to-league`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({
            league_id: leagueId,
            team_id: selectedTeamId
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add team');
      }

      success('Team added to league successfully!');
      navigate(`/leagues/${leagueId}`);
    } catch (error) {
      console.error('Error adding team:', error);
      showError(error.message || 'Failed to add team to league');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);

    try {
      const result = await startNewTeam(teamName);
      
      // Automatically add team to league
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-team-to-league`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            league_id: leagueId,
            team_id: result.team.id
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add team to league');
      }

      success(`Team "${teamName}" created and added to league!`);
      navigate(`/leagues/${leagueId}`);
    } catch (err) {
      console.error('Error creating team:', err);
      setCreateError(err.message || 'Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  const canAddMoreTeams = userTeamsCount < league.max_teams_per_user;
  const availableTeams = userTeams.filter(t => t.canAdd);

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      {/* Compact Header */}
      <div className="mb-4">
        <button
          onClick={() => navigate(`/leagues/${leagueId}`)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to League</span>
        </button>
        <h1 className="text-xl font-bold text-white mb-1">Add Team to League</h1>
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-400">
            <span className="text-primary-green-500 font-semibold">{league.name}</span>
            {league.fresh_start_required && <span className="text-purple-400 ml-2">• Fresh Start Required</span>}
          </p>
          <span className="text-gray-400">
            {userTeamsCount} / {league.max_teams_per_user} teams
          </span>
        </div>
      </div>

      {/* Max Teams Reached */}
      {!canAddMoreTeams && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
          <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
          <h3 className="text-lg font-bold text-white mb-1">Maximum Teams Reached</h3>
          <p className="text-gray-400 text-sm">
            You've added {league.max_teams_per_user} team{league.max_teams_per_user > 1 ? 's' : ''} (limit reached)
          </p>
        </div>
      )}

      {/* Create New Team Button */}
      {canAddMoreTeams && (
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full rounded-lg p-3 mb-3 bg-primary-green-500/10 border-2 border-primary-green-500/30 hover:border-primary-green-500 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-green-500/20 group-hover:bg-primary-green-500/30 rounded-lg flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5 text-primary-green-500" />
            </div>
            <div className="text-left flex-1">
              <h3 className="text-white font-bold">Create New Team</h3>
              <p className="text-gray-400 text-sm">Automatically added to league</p>
            </div>
          </div>
        </button>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
          <div className="bg-primary-black-800 border-2 border-primary-green-500 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Create New Team</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError('');
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam}>
              <div className="mb-4">
                <label className="block text-white font-semibold mb-2">Team Name</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter your team name..."
                  maxLength={50}
                  required
                  className="w-full px-4 py-3 bg-primary-black-700 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-green-500 transition-colors"
                />
                <p className="text-gray-500 text-sm mt-1">{teamName.length}/50 characters</p>
              </div>

              <div className="mb-4 p-3 bg-primary-green-500/10 border border-primary-green-500/30 rounded-lg">
                <p className="text-primary-green-500 font-semibold text-sm">
                  Starter Pack Included: <span className="text-white">8 players + 3 tokens + 1,000 coins</span>
                </p>
              </div>

              {createError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{createError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={creating || !teamName.trim()}
                  className="flex-1 px-6 py-3 bg-primary-green-500 hover:bg-primary-green-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-primary-black font-bold rounded-lg transition-colors"
                >
                  {creating ? 'Creating Team...' : 'Create Team'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError('');
                  }}
                  disabled={creating}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Team List */}
      {userTeams.length > 0 && canAddMoreTeams && (
        <>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2 px-1">
            Your Teams {availableTeams.length > 0 && `(${availableTeams.length} eligible)`}
          </div>
          <div className="space-y-2 mb-4">
            {userTeams.map((team) => {
              const isSelected = selectedTeamId === team.id;
              const isAvailable = team.canAdd;
              const isInLeague = team.alreadyInLeague;
              const notFresh = !team.isFreshStart && !team.alreadyInLeague;

              return (
                <div
                  key={team.id}
                  onClick={() => isAvailable && setSelectedTeamId(team.id)}
                  className={`rounded-lg p-3 transition-all ${
                    isAvailable
                      ? isSelected
                        ? 'bg-primary-green-500/20 border-2 border-primary-green-500 cursor-pointer'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer'
                      : 'bg-white/5 border border-white/10 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Trophy className={`w-8 h-8 flex-shrink-0 ${
                      isInLeague ? 'text-blue-400' : 
                      notFresh ? 'text-red-400' : 
                      'text-primary-green-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold truncate">{team.team_name}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{team.wins}W-{team.losses}L</span>
                        <span>•</span>
                        <span>{team.total_points} pts</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isInLeague && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded">
                          In League
                        </span>
                      )}
                      {notFresh && (
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-semibold rounded">
                          Not Fresh
                        </span>
                      )}
                      {isAvailable && (
                        isSelected ? (
                          <div className="w-5 h-5 bg-primary-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-primary-black" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-600 rounded-full" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* No Teams Message */}
      {userTeams.length === 0 && canAddMoreTeams && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
          <Trophy className="w-12 h-12 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No teams yet. Create one to get started!</p>
        </div>
      )}

      {/* Action Button */}
      {canAddMoreTeams && availableTeams.length > 0 && (
        <button
          onClick={handleAddTeam}
          disabled={!selectedTeamId || submitting}
          className="w-full px-6 py-3 bg-primary-green-500 hover:bg-primary-green-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-primary-black font-bold rounded-lg transition-colors"
        >
          {submitting ? 'Adding Team...' : 'Add Selected Team'}
        </button>
      )}
    </div>
  );
}
