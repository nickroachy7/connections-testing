import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import CreateLeagueModal from '../components/CreateLeagueModal';
import JoinLeagueModal from '../components/JoinLeagueModal';

export default function Leagues() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const { user } = useOutletContext();
  
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

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
            *,
            league_teams!left (
              id,
              user_id,
              is_active
            )
          )
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      // Enrich with member counts and user's team count
      const enrichedLeagues = await Promise.all((data || []).map(async (membership) => {
        const league = membership.leagues;
        
        // Count total members
        const { count: memberCount } = await supabase
          .from('league_memberships')
          .select('id', { count: 'exact', head: true })
          .eq('league_id', league.id);

        // Count user's teams in this league
        const userTeamsCount = league.league_teams?.filter(lt => lt.user_id === user.id).length || 0;

        // Count total active teams
        const { count: totalTeams } = await supabase
          .from('league_teams')
          .select('id', { count: 'exact', head: true })
          .eq('league_id', league.id)
          .eq('is_active', true);

        return {
          ...league,
          memberCount: memberCount || 0,
          userTeamsCount,
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
    success('Successfully joined league!');
    setShowJoinModal(false);
    loadLeagues();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-black-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

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
                onClick={() => navigate(`/leagues/${league.id}`)}
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
                    <span className="text-primary-green-500 font-semibold">
                      {league.userTeamsCount} / {league.max_teams_per_user}
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
    </div>
  );
}
