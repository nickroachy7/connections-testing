import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import LoadingSpinner from '../components/LoadingSpinner';
import { Calendar, TrendingUp, Award, Users } from 'lucide-react';

export default function TeamInfo() {
  const { activeTeam, user } = useOutletContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [leagueInfo, setLeagueInfo] = useState(null);

  const isPrivateTeam = activeTeam?.team_type === 'private';

  useEffect(() => {
    if (activeTeam) {
      loadTeamData();
    }
  }, [activeTeam?.id]);

  const loadTeamData = async () => {
    try {
      setLoading(true);

      // Load recent transactions for activity
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('team_id', activeTeam.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (txError) throw txError;
      setRecentActivity(transactions || []);

      // If private team, load league info
      if (isPrivateTeam) {
        const { data: leagueTeam, error: leagueError } = await supabase
          .from('league_teams')
          .select(`
            *,
            league:leagues(
              id,
              name,
              commissioner_id,
              max_users,
              elimination_enabled,
              restart_allowed
            )
          `)
          .eq('team_id', activeTeam.id)
          .eq('is_active', true)
          .single();

        if (!leagueError && leagueTeam) {
          setLeagueInfo(leagueTeam);
        }
      }
    } catch (error) {
      console.error('Error loading team info:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTransactionType = (type) => {
    const typeMap = {
      pack_purchase: 'Pack Purchase',
      quick_sell: 'Quick Sell',
      starter_pack: 'Starter Pack',
      reward: 'Reward',
      week_win: 'Week Win',
      week_loss: 'Week Loss'
    };
    return typeMap[type] || type;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" message="Loading team info..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Team Stats Overview */}
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-6 border border-primary-black-700">
        <h2 className="text-2xl font-bold text-primary-green-500 mb-6 flex items-center gap-2">
          <Award className="w-6 h-6" />
          Team Statistics
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-primary-black-900/50 rounded-lg p-4">
            <div className="text-primary-black-400 text-sm mb-1">Wins</div>
            <div className="text-3xl font-bold text-primary-green-500">{activeTeam.wins}</div>
          </div>
          
          <div className="bg-primary-black-900/50 rounded-lg p-4">
            <div className="text-primary-black-400 text-sm mb-1">Losses</div>
            <div className="text-3xl font-bold text-red-500">{activeTeam.losses}</div>
          </div>
          
          <div className="bg-primary-black-900/50 rounded-lg p-4">
            <div className="text-primary-black-400 text-sm mb-1">Total Points</div>
            <div className="text-3xl font-bold text-white">{activeTeam.total_points?.toFixed(1) || '0.0'}</div>
          </div>
          
          <div className="bg-primary-black-900/50 rounded-lg p-4">
            <div className="text-primary-black-400 text-sm mb-1">Current Week</div>
            <div className="text-3xl font-bold text-white">{activeTeam.current_week || 1}</div>
          </div>
        </div>
      </div>

      {/* League Info (Private Teams Only) */}
      {isPrivateTeam && leagueInfo && (
        <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-6 border border-primary-black-700">
          <h2 className="text-2xl font-bold text-primary-green-500 mb-6 flex items-center gap-2">
            <Users className="w-6 h-6" />
            League Settings
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-primary-black-700">
              <span className="text-primary-black-300">League Name</span>
              <span className="text-white font-semibold">{leagueInfo.league.name}</span>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-primary-black-700">
              <span className="text-primary-black-300">League Lives</span>
              <span className="text-white font-semibold">{leagueInfo.league_lives}</span>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-primary-black-700">
              <span className="text-primary-black-300">League W/L</span>
              <span className="text-white font-semibold">
                {leagueInfo.league_wins}W - {leagueInfo.league_losses}L
              </span>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-primary-black-700">
              <span className="text-primary-black-300">Max Teams</span>
              <span className="text-white font-semibold">{leagueInfo.league.max_users}</span>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-primary-black-700">
              <span className="text-primary-black-300">Elimination</span>
              <span className={`font-semibold ${leagueInfo.league.elimination_enabled ? 'text-red-500' : 'text-primary-green-500'}`}>
                {leagueInfo.league.elimination_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-3">
              <span className="text-primary-black-300">Restart Allowed</span>
              <span className={`font-semibold ${leagueInfo.league.restart_allowed ? 'text-primary-green-500' : 'text-red-500'}`}>
                {leagueInfo.league.restart_allowed ? 'Yes' : 'No'}
              </span>
            </div>

            <button
              onClick={() => navigate(`/leagues/${leagueInfo.league.id}`)}
              className="w-full mt-4 px-4 py-3 bg-primary-green-500 hover:bg-primary-green-600 text-primary-black-950 font-bold rounded-lg transition-colors"
            >
              View Full League
            </button>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-6 border border-primary-black-700">
        <h2 className="text-2xl font-bold text-primary-green-500 mb-6 flex items-center gap-2">
          <TrendingUp className="w-6 h-6" />
          Recent Activity
        </h2>
        
        {recentActivity.length === 0 ? (
          <div className="text-center py-8 text-primary-black-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-primary-black-900/50 rounded-lg p-4 flex items-center justify-between hover:bg-primary-black-900/70 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-semibold text-white mb-1">
                    {formatTransactionType(transaction.transaction_type)}
                  </div>
                  <div className="text-sm text-primary-black-400">
                    {formatDate(transaction.created_at)}
                  </div>
                </div>
                
                <div className={`text-xl font-bold ${
                  transaction.coins_change > 0 ? 'text-primary-green-500' : 'text-red-500'
                }`}>
                  {transaction.coins_change > 0 ? '+' : ''}{transaction.coins_change}
                  <span className="text-sm ml-1">coins</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
