import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../services/supabase';
import LoadingSpinner from '../components/LoadingSpinner';
import TeamInfoExpanded from '../components/TeamInfoExpanded';
import { 
  Calendar, TrendingUp, Award, Package, Coins, Heart, 
  CheckCircle, XCircle, ChevronDown, ChevronUp
} from 'lucide-react';

/**
 * TeamInfo Page - Team settings and detailed stats
 * 
 * Uses TeamInfoExpanded for settings (name, photo, theme, delete)
 * and adds extended sections for weekly history, roster breakdown, and activity.
 */
export default function TeamInfo() {
  const { activeTeam, inventory, refetchTeamData } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [weeklyHistory, setWeeklyHistory] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [showAllWeeks, setShowAllWeeks] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(activeTeam?.banner_theme || 'forest');

  useEffect(() => {
    if (activeTeam) {
      loadTeamData();
      setSelectedTheme(activeTeam.banner_theme || 'forest');
    }
  }, [activeTeam?.id, activeTeam?.banner_theme]);

  const loadTeamData = async () => {
    try {
      setLoading(true);

      // Load weekly performance history
      const { data: weeklyData, error: weeklyError } = await supabase
        .from('weekly_lineups')
        .select('week, total_points, beat_median, created_at')
        .eq('team_id', activeTeam.id)
        .order('week', { ascending: false });

      if (!weeklyError && weeklyData) {
        setWeeklyHistory(weeklyData);
      }

      // Load recent transactions for activity
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('team_id', activeTeam.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!txError) {
        setRecentActivity(transactions || []);
      }
    } catch (error) {
      console.error('Error loading team info:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate roster stats from inventory
  const rosterStats = {
    totalPlayers: inventory?.players?.length || 0,
    totalValue: inventory?.players?.reduce((sum, p) => sum + (p.player_card?.quick_sell_value || 0), 0) || 0,
    byTier: {
      role_player: inventory?.players?.filter(p => p.player_card?.tier === 'role_player').length || 0,
      starter: inventory?.players?.filter(p => p.player_card?.tier === 'starter').length || 0,
      all_star: inventory?.players?.filter(p => p.player_card?.tier === 'all_star').length || 0,
      superstar: inventory?.players?.filter(p => p.player_card?.tier === 'superstar').length || 0,
      mvp: inventory?.players?.filter(p => p.player_card?.tier === 'mvp').length || 0,
    },
    tokens: inventory?.tokens?.length || 0,
  };

  const formatTransactionType = (type) => {
    const typeMap = {
      pack_purchase: 'Pack Purchase',
      quick_sell: 'Quick Sell',
      starter_pack: 'Starter Pack',
      reward: 'Reward',
      week_win: 'Week Win Bonus',
      week_loss: 'Week Loss',
      free_agent_claim: 'Free Agent Claim'
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

  const getTierColor = (tier) => {
    const colors = {
      role_player: 'text-gray-400',
      starter: 'text-green-400',
      all_star: 'text-blue-400',
      superstar: 'text-purple-400',
      mvp: 'text-yellow-400',
    };
    return colors[tier] || 'text-gray-400';
  };

  const getTierLabel = (tier) => {
    const labels = {
      role_player: 'Role Player',
      starter: 'Starter',
      all_star: 'All-Star',
      superstar: 'Superstar',
      mvp: 'MVP',
    };
    return labels[tier] || tier;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" message="Loading team info..." />
      </div>
    );
  }

  const displayedWeeks = showAllWeeks ? weeklyHistory : weeklyHistory.slice(0, 5);
  const winRate = activeTeam.wins + activeTeam.losses > 0 
    ? ((activeTeam.wins / (activeTeam.wins + activeTeam.losses)) * 100).toFixed(0)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      
      {/* Team Settings - Uses unified TeamInfoExpanded component */}
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl border border-primary-black-700 overflow-hidden">
        <TeamInfoExpanded
          team={activeTeam}
          inventory={inventory}
          selectedTheme={selectedTheme}
          onThemeChange={setSelectedTheme}
          onTeamUpdate={refetchTeamData}
          showDeleteOption={true}
        />
      </div>

      {/* Performance Summary - Mobile Optimized 2x2 Grid */}
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-primary-black-700">
        <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-primary-green-500" />
          Team Performance
        </h2>
        
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Wins */}
          <div className="bg-primary-black-900/50 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-primary-black-400 text-xs sm:text-sm">Wins</span>
              <CheckCircle className="w-4 h-4 text-primary-green-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-primary-green-500">{activeTeam.wins}</div>
          </div>
          
          {/* Losses */}
          <div className="bg-primary-black-900/50 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-primary-black-400 text-xs sm:text-sm">Losses</span>
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-red-500">{activeTeam.losses}</div>
          </div>
          
          {/* Total Points */}
          <div className="bg-primary-black-900/50 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-primary-black-400 text-xs sm:text-sm">Total Points</span>
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white">
              {activeTeam.total_points?.toFixed(1) || '0.0'}
            </div>
          </div>
          
          {/* Win Rate */}
          <div className="bg-primary-black-900/50 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-primary-black-400 text-xs sm:text-sm">Win Rate</span>
              <span className="text-xs text-primary-black-500">%</span>
            </div>
            <div className={`text-2xl sm:text-3xl font-bold ${
              winRate >= 50 ? 'text-primary-green-500' : 'text-yellow-500'
            }`}>
              {winRate}%
            </div>
          </div>
        </div>

        {/* Lives indicator for elimination modes */}
        {activeTeam.lives !== undefined && activeTeam.lives !== null && (
          <div className="mt-4 pt-4 border-t border-primary-black-700">
            <div className="flex items-center justify-between">
              <span className="text-primary-black-300 text-sm">Lives Remaining</span>
              <div className="flex items-center gap-1">
                {[...Array(activeTeam.contest_type?.max_losses || 3)].map((_, i) => (
                  <Heart 
                    key={i} 
                    className={`w-5 h-5 ${i < activeTeam.lives ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} 
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Weekly Performance History */}
      {weeklyHistory.length > 0 && (
        <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-primary-black-700">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-green-500" />
            Weekly Results
          </h2>
          
          <div className="space-y-2">
            {displayedWeeks.map((week) => (
              <div
                key={week.week}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  week.beat_median 
                    ? 'bg-primary-green-500/10 border border-primary-green-500/30'
                    : 'bg-red-500/10 border border-red-500/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  {week.beat_median ? (
                    <CheckCircle className="w-5 h-5 text-primary-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <div>
                    <div className="font-bold text-white">Week {week.week}</div>
                    <div className={`text-xs ${week.beat_median ? 'text-primary-green-500' : 'text-red-500'}`}>
                      {week.beat_median ? 'Beat Median' : 'Below Median'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${week.beat_median ? 'text-primary-green-500' : 'text-red-500'}`}>
                    {week.total_points?.toFixed(1) || '0.0'}
                  </div>
                  <div className="text-xs text-primary-black-400">points</div>
                </div>
              </div>
            ))}
          </div>
          
          {weeklyHistory.length > 5 && (
            <button
              onClick={() => setShowAllWeeks(!showAllWeeks)}
              className="w-full mt-3 py-2 text-sm text-primary-black-400 hover:text-white flex items-center justify-center gap-1 transition-colors"
            >
              {showAllWeeks ? (
                <>Show Less <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Show All {weeklyHistory.length} Weeks <ChevronDown className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>
      )}

      {/* Roster Breakdown */}
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-primary-black-700">
        <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary-green-500" />
          Roster Breakdown
        </h2>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-primary-black-900/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">{rosterStats.totalPlayers}</div>
            <div className="text-xs text-primary-black-400">Players</div>
          </div>
          <div className="bg-primary-black-900/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-400">{rosterStats.tokens}</div>
            <div className="text-xs text-primary-black-400">Tokens</div>
          </div>
          <div className="bg-primary-black-900/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-xl font-bold text-yellow-400">
                {rosterStats.totalValue >= 1000 
                  ? `${(rosterStats.totalValue / 1000).toFixed(1)}k` 
                  : rosterStats.totalValue}
              </span>
            </div>
            <div className="text-xs text-primary-black-400">Value</div>
          </div>
        </div>

        {/* Tier Breakdown */}
        <div className="space-y-2">
          {Object.entries(rosterStats.byTier).map(([tier, count]) => (
            count > 0 && (
              <div key={tier} className="flex items-center justify-between py-2 px-3 bg-primary-black-900/30 rounded-lg">
                <span className={`text-sm font-medium ${getTierColor(tier)}`}>
                  {getTierLabel(tier)}
                </span>
                <span className="text-white font-bold">{count}</span>
              </div>
            )
          ))}
          {rosterStats.totalPlayers === 0 && (
            <div className="text-center py-4 text-primary-black-400 text-sm">
              No players in inventory
            </div>
          )}
        </div>
      </div>

      {/* Team Activity */}
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-primary-black-700">
        <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-green-500" />
          Recent Activity
        </h2>
        
        {recentActivity.length === 0 ? (
          <div className="text-center py-8 text-primary-black-400">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-primary-black-900/30 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white text-sm truncate">
                    {formatTransactionType(transaction.transaction_type)}
                  </div>
                  <div className="text-xs text-primary-black-400">
                    {formatDate(transaction.created_at)}
                  </div>
                </div>
                
                <div className={`text-sm font-bold whitespace-nowrap ml-3 ${
                  transaction.coins_change > 0 ? 'text-primary-green-500' : 'text-red-500'
                }`}>
                  {transaction.coins_change > 0 ? '+' : ''}{transaction.coins_change}
                  <span className="text-xs ml-0.5">coins</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
