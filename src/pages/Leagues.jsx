import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase, startNewTeam } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import CreateLeagueModal from '../components/CreateLeagueModal';
import JoinLeagueModal from '../components/JoinLeagueModal';
import { Trophy, Plus, CheckCircle, X, AlertCircle } from 'lucide-react';

export default function Leagues() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const { user, profile } = useOutletContext();
  
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // Add team to league modal state
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [userTeams, setUserTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Create new team modal state
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (user) {
      loadLeagues();
    }
  }, [user]);

  const loadLeagues = async () => {
    try {
      setLoading(true);
      
      // Get user's league memberships with league details
      const { data, error } = await supabase
        .from('league_memberships')
        .select(`
          *,
          leagues!inner (
            *
          )
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      // Enrich with member counts and user's team info
      const enrichedLeagues = await Promise.all((data || []).map(async (membership) => {
        const league = membership.leagues;
        
        // Count total members
        const { count: memberCount } = await supabase
          .from('league_memberships')
          .select('id', { count: 'exact', head: true })
          .eq('league_id', league.id);

        // Get user's teams in this league
        const { data: userTeams } = await supabase
          .from('league_teams')
          .select(`
            id,
            team_id,
            is_active,
            teams!inner (
              id,
              team_name
            )
          `)
          .eq('league_id', league.id)
          .eq('user_id', user.id)
          .eq('is_active', true);

        // Count total active teams
        const { count: totalTeams } = await supabase
          .from('league_teams')
          .select('id', { count: 'exact', head: true })
          .eq('league_id', league.id)
          .eq('is_active', true);

        return {
          ...league,
          memberCount: memberCount || 0,
          userTeams: userTeams || [],
          userTeamsCount: userTeams?.length || 0,
          totalTeams: totalTeams || 0,
          is_commissioner: membership.is_commissioner
        };
      }));

      setLeagues(enrichedLeagues);
    } catch (error) {
      console.error('Error loading leagues:', error);
      showError('Failed to load leagues');
    } finally {
      setLoading(false);
    }
  };

  const handleLeagueCreated = () => {
    success('League created successfully!');
    setShowCreateModal(false);
    loadLeagues();
  };

  const handleLeagueJoined = () => {
    success('Joined league successfully!');
    setShowJoinModal(false);
    loadLeagues();
  };

  const handleLeagueClick = (league) => {
    // If user has a team in the league, navigate to that team's league view
    if (league.userTeams && league.userTeams.length > 0) {
      const primaryTeam = league.userTeams[0]; // Use first team if multiple
      navigate(`/teams/${primaryTeam.team_id}/league`);
    } else {
      // No team yet, show add team modal
      openAddTeamModal(league);
    }
  };

  const openAddTeamModal = async (league) => {
    setSelectedLeague(league);
    setSelectedTeamId(null);
    setShowAddTeamModal(true);
    await loadUserTeams(league);
  };

  const loadUserTeams = async (league) => {
    try {
      setLoadingTeams(true);

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
        .eq('league_id', league.id)
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
      setLoadingTeams(false);
    }
  };

  const handleAddTeam = async () => {
    if (!selectedTeamId || !selectedLeague) return;

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
            league_id: selectedLeague.id,
            team_id: selectedTeamId
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add team');
      }

      success('Team added to league successfully!');
      setShowAddTeamModal(false);
      setSelectedLeague(null);
      
      // Navigate to the team's league tab
      navigate(`/teams/${selectedTeamId}/league`);
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
      const result = await startNewTeam(teamName, null, null, 'private');
      
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
            league_id: selectedLeague.id,
            team_id: result.team.id
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add team to league');
      }

      success(`Team "${teamName}" created and added to league!`);
      setShowCreateTeamModal(false);
      setShowAddTeamModal(false);
      
      // Navigate to pack opening experience for starter pack
      if (result.user_pack_id) {
        navigate(`/teams/${result.team.id}/open-pack/${result.user_pack_id}`);
      } else {
        // Fallback to league tab if no pack
        navigate(`/teams/${result.team.id}/league`);
      }
    } catch (err) {
      console.error('Error creating team:', err);
      setCreateError(err.message || 'Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-black-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const availableTeams = userTeams.filter(t => t.canAdd);
  const canAddMoreTeams = selectedLeague && (selectedLeague.userTeamsCount || 0) < selectedLeague.max_teams_per_user;

  return (
    <div className="min-h-screen bg-primary-black-950">
      {/* Header */}
      <div className="bg-primary-black-900 border-b border-primary-black-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                My <span className="text-primary-green-500">Leagues</span>
              </h1>
              <p className="text-primary-black-300 text-lg">
                Create private leagues or join your friends
              </p>
            </div>
            <div className="hidden md:block">
              <div className="text-right">
                <div className="text-3xl font-bold text-primary-green-500">
                  {leagues.length}
                </div>
                <div className="text-sm text-primary-black-400">TOTAL LEAGUES</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Buttons */}
        <div className="mb-8 flex flex-wrap gap-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-lg transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create League
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="px-6 py-3 bg-primary-black-700 hover:bg-primary-black-600 text-white font-bold rounded-lg transition-all duration-200 border border-primary-black-600 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Join League
          </button>
        </div>

        {/* Leagues List */}
        {leagues.length === 0 ? (
          <div className="bg-primary-black-800 rounded-lg border border-primary-black-700 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-primary-black-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-primary-black-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Leagues Yet</h3>
              <p className="text-primary-black-400 mb-6">
                Create your first league to compete with friends, or join an existing league with an invite code.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-2 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-lg transition-all duration-200"
                >
                  Create League
                </button>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="px-6 py-2 bg-primary-black-700 hover:bg-primary-black-600 text-white font-bold rounded-lg transition-all duration-200 border border-primary-black-600"
                >
                  Join League
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leagues.map((league) => (
              <div
                key={league.id}
                onClick={() => handleLeagueClick(league)}
                className="bg-primary-black-800 rounded-lg border border-primary-black-700 hover:border-primary-green-500/50 p-6 cursor-pointer transition-all duration-200 group"
              >
                {/* League Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-white truncate group-hover:text-primary-green-500 transition-colors">
                      {league.name}
                    </h3>
                    {league.is_commissioner && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-green-500 mt-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                        Commissioner
                      </span>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-primary-black-700 group-hover:bg-primary-green-500/10 rounded-lg flex items-center justify-center transition-colors">
                      <svg className="w-6 h-6 text-primary-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* League Stats */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-primary-black-400">Members</span>
                    <span className="text-white font-semibold">
                      {league.memberCount} / {league.max_users}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-primary-black-400">Total Teams</span>
                    <span className="text-white font-semibold">{league.totalTeams}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-primary-black-400">Your Teams</span>
                    <span className={`font-semibold ${league.userTeamsCount > 0 ? 'text-primary-green-500' : 'text-yellow-400'}`}>
                      {league.userTeamsCount} / {league.max_teams_per_user}
                      {league.userTeamsCount === 0 && <span className="text-xs ml-1">(Add Team)</span>}
                    </span>
                  </div>
                </div>

                {/* League Settings Badges */}
                <div className="mt-4 pt-4 border-t border-primary-black-700 flex flex-wrap gap-2">
                  {league.elimination_enabled ? (
                    <span className="px-2 py-1 bg-red-500/10 text-red-400 text-xs font-medium rounded">
                      Elimination ON
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-primary-black-700 text-primary-black-400 text-xs font-medium rounded">
                      No Elimination
                    </span>
                  )}
                  {league.restart_allowed && (
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs font-medium rounded">
                      Restarts Allowed
                    </span>
                  )}
                  {league.fresh_start_required && (
                    <span className="px-2 py-1 bg-purple-500/10 text-purple-400 text-xs font-medium rounded">
                      Fresh Start
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateLeagueModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleLeagueCreated}
        />
      )}
      {showJoinModal && (
        <JoinLeagueModal
          onClose={() => setShowJoinModal(false)}
          onSuccess={handleLeagueJoined}
        />
      )}

      {/* Add Team to League Modal */}
      {showAddTeamModal && selectedLeague && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-primary-black-800 rounded-xl border border-primary-black-700 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="border-b border-primary-black-700 px-6 py-4 flex items-center justify-between sticky top-0 bg-primary-black-800">
              <div>
                <h2 className="text-xl font-bold text-white">Add Team to League</h2>
                <p className="text-primary-green-500 text-sm font-semibold">{selectedLeague.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowAddTeamModal(false);
                  setSelectedLeague(null);
                }}
                className="text-primary-black-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {loadingTeams ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : !canAddMoreTeams ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
                  <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                  <h3 className="text-lg font-bold text-white mb-1">Maximum Teams Reached</h3>
                  <p className="text-gray-400 text-sm">
                    You've added {selectedLeague.max_teams_per_user} team{selectedLeague.max_teams_per_user > 1 ? 's' : ''} (limit reached)
                  </p>
                </div>
              ) : (
                <>
                  {/* Create New Team Button */}
                  <button
                    onClick={() => {
                      setTeamName(`${profile?.username}'s Team`);
                      setShowCreateTeamModal(true);
                    }}
                    className="w-full rounded-lg p-3 mb-4 bg-primary-green-500/10 border-2 border-primary-green-500/30 hover:border-primary-green-500 transition-all group"
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

                  {/* Existing Teams List */}
                  {userTeams.length > 0 && (
                    <>
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-2 px-1">
                        Your Existing Teams {availableTeams.length > 0 && `(${availableTeams.length} eligible)`}
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
                  {userTeams.length === 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center mb-4">
                      <Trophy className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">No teams yet. Create one to get started!</p>
                    </div>
                  )}

                  {/* Fresh Start Info */}
                  {selectedLeague.fresh_start_required && (
                    <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <p className="text-purple-400 text-sm">
                        <span className="font-semibold">Fresh Start Required:</span> Only teams created after this league was created can be added.
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowAddTeamModal(false);
                        setSelectedLeague(null);
                      }}
                      className="flex-1 px-6 py-3 bg-primary-black-700 hover:bg-primary-black-600 text-white font-bold rounded-lg transition-all duration-200 border border-primary-black-600"
                    >
                      Cancel
                    </button>
                    {availableTeams.length > 0 && (
                      <button
                        onClick={handleAddTeam}
                        disabled={!selectedTeamId || submitting}
                        className="flex-1 px-6 py-3 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Adding...' : 'Add Selected Team'}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create New Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[60]">
          <div className="bg-primary-black-800 border-2 border-primary-green-500 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Create New Team</h2>
              <button
                onClick={() => {
                  setShowCreateTeamModal(false);
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
                    setShowCreateTeamModal(false);
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
    </div>
  );
}
