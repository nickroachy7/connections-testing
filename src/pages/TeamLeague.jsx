import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import TeamMenuCard from '../components/TeamMenuCard';
import { 
  Users, AlertCircle, Trophy, Target, Shield, Zap, Calendar, 
  Copy, Check, Trash2, AlertTriangle, Crown, Heart, TrendingUp,
  ChevronDown, ChevronUp, Settings, Award
} from 'lucide-react';

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
const formatEliminationType = (type, maxLosses) => {
  const types = {
    none: 'No Elimination',
    strike: `Strike System (${maxLosses} Lives)`,
    survivor: 'Survivor Mode',
  };
  return types[type] || type;
};

export default function TeamLeague() {
  const { activeTeam, user } = useOutletContext();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [leagueInfo, setLeagueInfo] = useState(null);
  const [error, setError] = useState(null);
  
  // Standings state
  const [standings, setStandings] = useState([]);
  const [loadingStandings, setLoadingStandings] = useState(false);
  
  // League Activity state
  const [leagueActivity, setLeagueActivity] = useState([]);
  
  // Contest config state
  const [contestConfig, setContestConfig] = useState(null);
  
  // Commissioner settings
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (activeTeam) {
      loadLeagueData();
    }
  }, [activeTeam?.id]);

  const loadLeagueData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get league info for this team
      const { data: leagueTeam, error: leagueError } = await supabase
        .from('league_teams')
        .select(`
          *,
          league:leagues(
            id,
            name,
            commissioner_id,
            max_users,
            max_teams_per_user,
            elimination_enabled,
            restart_allowed,
            invite_code,
            fresh_start_required,
            restart_requires_new_team
          )
        `)
        .eq('team_id', activeTeam.id)
        .eq('is_active', true)
        .single();

      if (leagueError) {
        if (leagueError.code === 'PGRST116') {
          setError('This team is not currently in a league.');
        } else {
          throw leagueError;
        }
        return;
      }

      const isCommissioner = leagueTeam.league.commissioner_id === user.id;

      setLeagueInfo({
        ...leagueTeam,
        league: {
          ...leagueTeam.league,
          is_commissioner: isCommissioner
        }
      });
      
      // Load all data in parallel
      await Promise.all([
        loadStandings(leagueTeam.league.id),
        loadContestConfig(leagueTeam.league.id),
        loadLeagueActivity(leagueTeam.league.id)
      ]);
    } catch (error) {
      console.error('Error loading league info:', error);
      setError('Failed to load league information.');
    } finally {
      setLoading(false);
    }
  };

  const loadStandings = async (leagueId) => {
    if (!leagueId) return;
    
    try {
      setLoadingStandings(true);
      const { data, error } = await supabase
        .from('league_teams')
        .select(`
          *,
          teams!inner (
            id,
            team_name,
            user_id,
            total_points
          )
        `)
        .eq('league_id', leagueId)
        .eq('is_active', true)
        .order('league_wins', { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(s => s.teams.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, display_name')
          .in('id', userIds);

        const profileMap = {};
        profiles?.forEach(p => {
          profileMap[p.id] = p;
        });

        const standingsWithProfiles = data.map(standing => ({
          ...standing,
          teams: {
            ...standing.teams,
            profile: profileMap[standing.teams.user_id]
          }
        }));

        setStandings(standingsWithProfiles);
      } else {
        setStandings(data || []);
      }
    } catch (error) {
      console.error('Error loading standings:', error);
    } finally {
      setLoadingStandings(false);
    }
  };

  const loadContestConfig = async (leagueId) => {
    if (!leagueId) return;
    
    try {
      const { data, error } = await supabase
        .from('league_contest_config')
        .select('*')
        .eq('league_id', leagueId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching contest config:', error);
      }
      
      setContestConfig(data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const loadLeagueActivity = async (leagueId) => {
    if (!leagueId) return;
    
    try {
      // Get weekly results for all teams in the league
      const { data: leagueTeams } = await supabase
        .from('league_teams')
        .select('team_id, teams(team_name)')
        .eq('league_id', leagueId)
        .eq('is_active', true);

      if (!leagueTeams || leagueTeams.length === 0) return;

      const teamIds = leagueTeams.map(lt => lt.team_id);
      
      // Get last 3 weeks of results
      const { data: weeklyResults, error } = await supabase
        .from('weekly_lineups')
        .select('team_id, week, total_points, beat_median, created_at')
        .in('team_id', teamIds)
        .order('week', { ascending: false })
        .limit(30);

      if (error) throw error;

      // Build team name map
      const teamNameMap = {};
      leagueTeams.forEach(lt => {
        teamNameMap[lt.team_id] = lt.teams?.team_name || 'Unknown Team';
      });

      // Attach team names to results
      const activityWithTeams = (weeklyResults || []).map(result => ({
        ...result,
        team_name: teamNameMap[result.team_id]
      }));

      setLeagueActivity(activityWithTeams);
    } catch (error) {
      console.error('Error loading league activity:', error);
    }
  };

  const copyInviteCode = async () => {
    if (leagueInfo?.league?.invite_code) {
      await navigator.clipboard.writeText(leagueInfo.league.invite_code);
      setCopied(true);
      success('Invite code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDeleteLeague = async () => {
    try {
      setDeleting(true);

      const { error: deleteError } = await supabase
        .from('leagues')
        .delete()
        .eq('id', leagueInfo.league.id);

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

  // Find user's position in standings
  const getUserPosition = () => {
    const position = standings.findIndex(s => s.team_id === activeTeam.id);
    return position >= 0 ? position + 1 : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" message="Loading league info..." />
      </div>
    );
  }

  if (error || !leagueInfo) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-6 sm:p-12 border border-primary-black-700 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">No League Found</h1>
          <p className="text-base sm:text-lg text-primary-black-300 mb-8">
            {error || 'This team is not currently enrolled in any league.'}
          </p>
          <button
            onClick={() => navigate('/fantasy/leagues')}
            className="px-6 py-3 bg-primary-green-500 hover:bg-primary-green-600 text-primary-black-950 font-bold rounded-lg transition-colors"
          >
            Browse Leagues
          </button>
        </div>
      </div>
    );
  }

  const { league } = leagueInfo;
  const isCommissioner = league.is_commissioner;
  const userPosition = getUserPosition();

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      
      {/* League Header with Name */}
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-primary-black-700">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary-green-500/10 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 text-primary-green-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{league.name}</h1>
              {isCommissioner && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-primary-green-500/20 text-primary-green-500 text-xs font-semibold rounded whitespace-nowrap">
                  <Crown className="w-3 h-3" />
                  Commissioner
                </span>
              )}
            </div>
            <p className="text-primary-black-400 text-sm">{standings.length} Teams Competing</p>
          </div>
        </div>
      </div>

      {/* Your Position Highlight Card */}
      {userPosition && (
        <div className="bg-gradient-to-r from-primary-green-500/10 to-primary-green-500/5 rounded-xl p-4 sm:p-5 border border-primary-green-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Rank Display */}
              <div className="relative">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary-green-500/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl sm:text-3xl font-bold text-primary-green-500">
                    {userPosition}
                  </span>
                </div>
                {userPosition <= 3 && (
                  <span className="absolute -top-1 -right-1 text-lg">
                    {userPosition === 1 && '🏆'}
                    {userPosition === 2 && '🥈'}
                    {userPosition === 3 && '🥉'}
                  </span>
                )}
              </div>
              
              {/* Position Details */}
              <div>
                <div className="text-white font-semibold text-sm sm:text-base">Your Position</div>
                <div className="text-primary-black-400 text-xs sm:text-sm">
                  {userPosition === 1 ? "You're in the lead!" : `${userPosition - 1} team${userPosition - 1 > 1 ? 's' : ''} ahead`}
                </div>
              </div>
            </div>
            
            {/* Record & Lives */}
            <div className="text-right">
              <div className="text-white font-bold text-lg sm:text-xl">
                {leagueInfo.league_wins}-{leagueInfo.league_losses}
              </div>
              {leagueInfo.league_lives !== undefined && leagueInfo.league_lives !== null && (
                <div className="flex items-center justify-end gap-0.5 mt-1">
                  {[...Array(contestConfig?.max_losses || 3)].map((_, i) => (
                    <Heart 
                      key={i} 
                      className={`w-3.5 h-3.5 ${i < leagueInfo.league_lives ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contest Format Badges */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {contestConfig?.scoring_type && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary-black-800/60 rounded-lg border border-primary-black-700">
            <Target className="w-4 h-4 text-blue-400" />
            <span className="text-xs sm:text-sm text-white">{formatScoringType(contestConfig.scoring_type)}</span>
          </div>
        )}
        {contestConfig?.win_condition && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary-black-800/60 rounded-lg border border-primary-black-700">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-xs sm:text-sm text-white">{formatWinCondition(contestConfig.win_condition)}</span>
          </div>
        )}
        {contestConfig?.elimination_type && contestConfig.elimination_type !== 'none' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary-black-800/60 rounded-lg border border-primary-black-700">
            <Shield className="w-4 h-4 text-red-400" />
            <span className="text-xs sm:text-sm text-white">{formatEliminationType(contestConfig.elimination_type, contestConfig.max_losses)}</span>
          </div>
        )}
      </div>

      {/* League Standings */}
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-primary-black-700">
        <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary-green-500" />
          Standings
        </h2>
        
        {loadingStandings ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : standings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Trophy className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Teams Yet</h3>
            <p className="text-gray-400 text-sm">No teams are competing in this league yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {standings.map((standing, index) => {
              const isCurrentTeam = standing.team_id === activeTeam.id;
              const isUserTeam = standing.teams.user_id === user.id;
              
              return (
                <div
                  key={standing.id}
                  onClick={() => isUserTeam && navigate(`/teams/${standing.teams.id}`)}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isCurrentTeam 
                      ? 'bg-primary-green-500/10 border border-primary-green-500/30' 
                      : 'bg-primary-black-900/30 hover:bg-primary-black-900/50'
                  } ${isUserTeam ? 'cursor-pointer' : ''}`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center">
                    {index < 3 ? (
                      <span className="text-lg">
                        {index === 0 && '🏆'}
                        {index === 1 && '🥈'}
                        {index === 2 && '🥉'}
                      </span>
                    ) : (
                      <span className="text-primary-black-400 font-semibold">{index + 1}</span>
                    )}
                  </div>
                  
                  {/* Team Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold truncate ${isCurrentTeam ? 'text-primary-green-500' : 'text-white'}`}>
                        {standing.teams.team_name}
                      </span>
                      {isCurrentTeam && (
                        <span className="px-1.5 py-0.5 bg-primary-green-500/20 text-primary-green-500 text-[10px] font-bold rounded">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-primary-black-400">
                      {standing.teams.profile?.display_name || standing.teams.profile?.username || 'Unknown'}
                    </div>
                  </div>
                  
                  {/* Record */}
                  <div className="text-right">
                    <div className="font-bold text-white text-sm sm:text-base">
                      {standing.league_wins}-{standing.league_losses}
                    </div>
                    {standing.league_lives !== undefined && standing.league_lives !== null && (
                      <div className="flex items-center justify-end gap-0.5">
                        {[...Array(Math.min(standing.league_lives, 5))].map((_, i) => (
                          <Heart key={i} className="w-2.5 h-2.5 text-red-500 fill-red-500" />
                        ))}
                        {standing.league_lives > 5 && (
                          <span className="text-[10px] text-red-400">+{standing.league_lives - 5}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* League Activity Feed */}
      {leagueActivity.length > 0 && (
        <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-primary-black-700">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-green-500" />
            Recent Results
          </h2>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {leagueActivity.slice(0, 15).map((result, idx) => (
              <div
                key={`${result.team_id}-${result.week}-${idx}`}
                className={`flex items-center justify-between p-2.5 rounded-lg ${
                  result.beat_median 
                    ? 'bg-primary-green-500/5 border border-primary-green-500/10' 
                    : 'bg-red-500/5 border border-red-500/10'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    result.beat_median ? 'bg-primary-green-500/20' : 'bg-red-500/20'
                  }`}>
                    {result.beat_median 
                      ? <TrendingUp className="w-3 h-3 text-primary-green-500" />
                      : <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />
                    }
                  </div>
                  <div className="min-w-0">
                    <div className={`text-sm font-medium truncate ${
                      result.team_id === activeTeam.id ? 'text-primary-green-500' : 'text-white'
                    }`}>
                      {result.team_name}
                    </div>
                    <div className="text-[10px] text-primary-black-400">Week {result.week}</div>
                  </div>
                </div>
                <div className={`text-sm font-bold ${result.beat_median ? 'text-primary-green-500' : 'text-red-500'}`}>
                  {result.total_points?.toFixed(1)} pts
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commissioner Settings (Collapsible) */}
      {isCommissioner && (
        <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl border border-primary-black-700 overflow-hidden">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-primary-black-400" />
              <span className="font-semibold text-white">Commissioner Settings</span>
            </div>
            {showSettings ? (
              <ChevronUp className="w-5 h-5 text-primary-black-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-primary-black-400" />
            )}
          </button>
          
          {showSettings && (
            <div className="p-4 sm:p-5 pt-0 border-t border-primary-black-700 space-y-4">
              {/* Invite Code */}
              {league.invite_code && (
                <div>
                  <label className="text-sm text-primary-black-400 mb-2 block">Invite Code</label>
                  <button
                    onClick={copyInviteCode}
                    className="flex items-center gap-2 px-4 py-3 bg-primary-black-700 hover:bg-primary-black-600 rounded-lg transition-colors w-full justify-center"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-primary-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-primary-black-400" />
                    )}
                    <span className="font-mono font-semibold text-white">{league.invite_code}</span>
                  </button>
                </div>
              )}
              
              {/* League Settings Summary */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-primary-black-900/30 rounded-lg p-3">
                  <div className="text-primary-black-400 text-xs">Max Users</div>
                  <div className="text-white font-semibold">{league.max_users}</div>
                </div>
                <div className="bg-primary-black-900/30 rounded-lg p-3">
                  <div className="text-primary-black-400 text-xs">Teams Per User</div>
                  <div className="text-white font-semibold">{league.max_teams_per_user}</div>
                </div>
                <div className="bg-primary-black-900/30 rounded-lg p-3">
                  <div className="text-primary-black-400 text-xs">Elimination</div>
                  <div className="text-white font-semibold">{league.elimination_enabled ? 'Enabled' : 'Disabled'}</div>
                </div>
                <div className="bg-primary-black-900/30 rounded-lg p-3">
                  <div className="text-primary-black-400 text-xs">Restart Allowed</div>
                  <div className="text-white font-semibold">{league.restart_allowed ? 'Yes' : 'No'}</div>
                </div>
              </div>

              {/* Delete League */}
              <div className="pt-4 border-t border-primary-black-700">
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors w-full justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete League
                  </button>
                ) : (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-500 mb-3">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-semibold">Confirm Deletion</span>
                    </div>
                    <p className="text-sm text-primary-black-300 mb-4">
                      This will permanently delete the league and remove all teams from it. This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 px-4 py-2 bg-primary-black-700 hover:bg-primary-black-600 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteLeague}
                        disabled={deleting}
                        className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
