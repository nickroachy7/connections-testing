import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Trophy, Users, Settings, Share2, Copy, Check } from 'lucide-react';

export default function LeagueDetail() {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const { user } = useOutletContext();

  const [league, setLeague] = useState(null);
  const [members, setMembers] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('standings');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user && leagueId) {
      loadLeagueData();
    }
  }, [user, leagueId]);

  const loadLeagueData = async () => {
    try {
      setLoading(true);

      // Get league details (user must be commissioner)
      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single();

      if (leagueError) {
        // Not commissioner - try to get via membership
        const { data: membershipData, error: membershipError } = await supabase
          .from('league_memberships')
          .select(`
            is_commissioner,
            leagues!inner (*)
          `)
          .eq('league_id', leagueId)
          .eq('user_id', user.id)
          .single();

        if (membershipError) throw membershipError;
        
        setLeague({
          ...membershipData.leagues,
          is_commissioner: membershipData.is_commissioner
        });
      } else {
        setLeague({ ...leagueData, is_commissioner: true });
      }

      // Load members
      await loadMembers();

      // Load standings
      await loadStandings();

    } catch (error) {
      console.error('Error loading league:', error);
      showError('Failed to load league details');
      navigate('/fantasy/leagues');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('league_memberships')
        .select(`
          *,
          profiles:user_id (
            username,
            display_name
          )
        `)
        .eq('league_id', leagueId)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const loadStandings = async () => {
    try {
      const { data, error } = await supabase
        .from('league_teams')
        .select(`
          *,
          teams!inner (
            id,
            team_name,
            user_id,
            total_score
          ),
          profiles:user_id (
            username,
            display_name
          )
        `)
        .eq('league_id', leagueId)
        .eq('is_active', true)
        .order('league_wins', { ascending: false });

      if (error) throw error;
      setStandings(data || []);
    } catch (error) {
      console.error('Error loading standings:', error);
    }
  };

  const copyInviteCode = async () => {
    if (league?.invite_code) {
      await navigator.clipboard.writeText(league.invite_code);
      setCopied(true);
      success('Invite code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <h2 className="text-2xl font-bold text-white mb-2">League Not Found</h2>
        <p className="text-gray-400 mb-6">This league doesn't exist or you don't have access.</p>
        <button
          onClick={() => navigate('/fantasy/leagues')}
          className="btn-primary"
        >
          Back to Leagues
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-black pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-green to-primary-green/80 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-primary-black mb-2">
              {league.name}
            </h1>
            {league.is_commissioner && (
              <div className="flex items-center gap-2 text-primary-black/80 text-sm">
                <Trophy className="w-4 h-4" />
                <span className="font-semibold">Commissioner</span>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate('/fantasy/leagues')}
            className="px-4 py-2 bg-primary-black/20 hover:bg-primary-black/30 text-primary-black font-semibold rounded-lg transition-colors"
          >
            Back
          </button>
        </div>

        {/* Invite Code */}
        {league.is_commissioner && (
          <div className="bg-primary-black/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-black/80 text-sm mb-1">Invite Code</p>
                <p className="text-2xl font-bold text-primary-black tracking-wider">
                  {league.invite_code}
                </p>
              </div>
              <button
                onClick={copyInviteCode}
                className="flex items-center gap-2 px-4 py-2 bg-primary-black hover:bg-primary-black/90 text-primary-green rounded-lg transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-primary-black/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-primary-black/80 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">Members</span>
            </div>
            <p className="text-2xl font-bold text-primary-black">
              {members.length} / {league.max_users}
            </p>
          </div>
          <div className="bg-primary-black/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-primary-black/80 mb-1">
              <Trophy className="w-4 h-4" />
              <span className="text-sm">Teams</span>
            </div>
            <p className="text-2xl font-bold text-primary-black">
              {standings.length}
            </p>
          </div>
        </div>

        {/* League Settings Badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          {league.elimination_enabled && (
            <span className="px-3 py-1 bg-red-500/20 text-red-300 text-sm rounded-full">
              Elimination ON
            </span>
          )}
          {league.restart_allowed && (
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full">
              Restarts Allowed
            </span>
          )}
          {league.fresh_start_required && (
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full">
              Fresh Start Required
            </span>
          )}
          {league.restart_requires_new_team && (
            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 text-sm rounded-full">
              New Team on Restart
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('standings')}
          className={`flex-1 py-4 text-center font-semibold transition-colors ${
            activeTab === 'standings'
              ? 'text-primary-green border-b-2 border-primary-green'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Trophy className="w-5 h-5 inline-block mr-2" />
          Standings
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`flex-1 py-4 text-center font-semibold transition-colors ${
            activeTab === 'members'
              ? 'text-primary-green border-b-2 border-primary-green'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Users className="w-5 h-5 inline-block mr-2" />
          Members
        </button>
        {league.is_commissioner && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-4 text-center font-semibold transition-colors ${
              activeTab === 'settings'
                ? 'text-primary-green border-b-2 border-primary-green'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Settings className="w-5 h-5 inline-block mr-2" />
            Settings
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'standings' && (
          <div>
            {standings.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Teams Yet</h3>
                <p className="text-gray-400 mb-6">
                  Add teams to start competing in this league
                </p>
                <button className="btn-primary">
                  Add Your Team
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {standings.map((standing, index) => (
                  <div
                    key={standing.id}
                    className="bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-gray-500 w-8">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">
                            {standing.teams.team_name}
                          </h3>
                          <p className="text-gray-400 text-sm">
                            {standing.profiles?.display_name || standing.profiles?.username}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-lg">
                          {standing.league_wins}-{standing.league_losses}
                        </p>
                        {league.elimination_enabled && (
                          <p className="text-gray-400 text-sm">
                            {standing.league_lives} {standing.league_lives === 1 ? 'life' : 'lives'} left
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="bg-white/5 rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="text-white font-semibold">
                    {member.profiles?.display_name || member.profiles?.username}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </p>
                </div>
                {member.is_commissioner && (
                  <span className="px-3 py-1 bg-primary-green/20 text-primary-green text-sm rounded-full flex items-center gap-1">
                    <Trophy className="w-4 h-4" />
                    Commissioner
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'settings' && league.is_commissioner && (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">League Settings</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span className="text-gray-300">Maximum Users</span>
                  <span className="text-white font-semibold">{league.max_users}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span className="text-gray-300">Teams Per User</span>
                  <span className="text-white font-semibold">{league.max_teams_per_user}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span className="text-gray-300">Elimination</span>
                  <span className={`font-semibold ${league.elimination_enabled ? 'text-red-400' : 'text-gray-400'}`}>
                    {league.elimination_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span className="text-gray-300">Restarts</span>
                  <span className={`font-semibold ${league.restart_allowed ? 'text-blue-400' : 'text-gray-400'}`}>
                    {league.restart_allowed ? 'Allowed' : 'Not Allowed'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span className="text-gray-300">Fresh Start Required</span>
                  <span className={`font-semibold ${league.fresh_start_required ? 'text-purple-400' : 'text-gray-400'}`}>
                    {league.fresh_start_required ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-300">New Team on Restart</span>
                  <span className={`font-semibold ${league.restart_requires_new_team ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {league.restart_requires_new_team ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
              <h3 className="text-xl font-bold text-red-400 mb-2">Danger Zone</h3>
              <p className="text-gray-400 mb-4">
                Deleting the league will remove all teams, standings, and history. This cannot be undone.
              </p>
              <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors">
                Delete League
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
