import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import LoadingSpinner from '../components/LoadingSpinner';
import { Users, AlertCircle } from 'lucide-react';

export default function TeamLeague() {
  const { activeTeam } = useOutletContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leagueInfo, setLeagueInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (activeTeam) {
      loadLeagueInfo();
    }
  }, [activeTeam?.id]);

  const loadLeagueInfo = async () => {
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
            restart_allowed
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

      setLeagueInfo(leagueTeam);
    } catch (error) {
      console.error('Error loading league info:', error);
      setError('Failed to load league information.');
    } finally {
      setLoading(false);
    }
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
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-8 md:p-12 border border-primary-black-700 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">No League Found</h1>
          <p className="text-lg text-primary-black-300 mb-8">
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-6 border border-primary-black-700">
        {/* League Header */}
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-primary-black-700">
          <div className="w-16 h-16 bg-primary-green-500/10 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-primary-green-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{leagueInfo.league.name}</h1>
            <p className="text-primary-black-400">League Overview</p>
          </div>
        </div>

        {/* Team Stats in League */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-primary-black-900/50 rounded-lg p-4">
            <div className="text-primary-black-400 text-sm mb-1">League Lives</div>
            <div className="text-3xl font-bold text-primary-green-500">{leagueInfo.league_lives}</div>
          </div>
          
          <div className="bg-primary-black-900/50 rounded-lg p-4">
            <div className="text-primary-black-400 text-sm mb-1">League Wins</div>
            <div className="text-3xl font-bold text-primary-green-500">{leagueInfo.league_wins}</div>
          </div>
          
          <div className="bg-primary-black-900/50 rounded-lg p-4">
            <div className="text-primary-black-400 text-sm mb-1">League Losses</div>
            <div className="text-3xl font-bold text-red-500">{leagueInfo.league_losses}</div>
          </div>
          
          <div className="bg-primary-black-900/50 rounded-lg p-4">
            <div className="text-primary-black-400 text-sm mb-1">Status</div>
            <div className={`text-xl font-bold ${leagueInfo.is_active ? 'text-primary-green-500' : 'text-red-500'}`}>
              {leagueInfo.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>

        {/* League Settings */}
        <div className="bg-primary-black-900/30 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">League Settings</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-primary-black-800">
              <span className="text-primary-black-300">Max Teams</span>
              <span className="text-white font-semibold">{leagueInfo.league.max_users}</span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-primary-black-800">
              <span className="text-primary-black-300">Teams Per User</span>
              <span className="text-white font-semibold">{leagueInfo.league.max_teams_per_user}</span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-primary-black-800">
              <span className="text-primary-black-300">Elimination</span>
              <span className={`font-semibold ${leagueInfo.league.elimination_enabled ? 'text-red-500' : 'text-primary-green-500'}`}>
                {leagueInfo.league.elimination_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <span className="text-primary-black-300">Restart Allowed</span>
              <span className={`font-semibold ${leagueInfo.league.restart_allowed ? 'text-primary-green-500' : 'text-red-500'}`}>
                {leagueInfo.league.restart_allowed ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => navigate(`/leagues/${leagueInfo.league.id}`)}
          className="w-full px-6 py-4 bg-primary-green-500 hover:bg-primary-green-600 text-primary-black-950 font-bold rounded-lg transition-colors"
        >
          View Full League Standings
        </button>
      </div>
    </div>
  );
}
