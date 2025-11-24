import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { formatTimeAgo } from '../utils/time';
import { getActivityIcon } from '../constants/ui';

export default function RecentActivityFeed({ teamId, userId, limit = 10 }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teamId || userId) {
      loadRecentActivity();
    }
  }, [teamId, userId]);

  const loadRecentActivity = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (teamId) {
        query = query.eq('team_id', teamId);
      } else if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setActivities(data || []);
    } catch (err) {
      console.error('Error loading recent activity:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityMessage = (activity) => {
    const metadata = activity.metadata || {};
    
    switch (activity.transaction_type) {
      case 'pack_purchase':
        return `Purchased ${metadata.pack_name || 'a pack'}`;
      case 'quick_sell':
        return `Sold ${metadata.card_name || 'a card'} (${metadata.card_type})`;
      case 'starter_pack':
        return 'Received starter pack';
      case 'reward':
        return `Earned ${metadata.reward_type || 'reward'}`;
      default:
        return 'Unknown activity';
    }
  };

  if (loading) {
    return (
      <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-xl p-6">
        <div className="text-center text-primary-black-400">
          <div className="animate-pulse">Loading activity...</div>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-xl">
        <div className="border-b-2 border-primary-black-700 px-6 py-4">
          <h3 className="text-xl font-bold text-primary-black-50">Recent Activity</h3>
          <p className="text-xs text-primary-black-400 mt-0.5">Your latest transactions</p>
        </div>
        <div className="p-6 text-center text-primary-black-400">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-sm">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-xl">
      <div className="border-b-2 border-primary-black-700 px-6 py-4">
        <h3 className="text-xl font-bold text-primary-black-50">Recent Activity</h3>
        <p className="text-xs text-primary-black-400 mt-0.5">Your latest {activities.length} transactions</p>
      </div>
      <div>
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className={`
              flex items-center gap-3 px-4 py-3 transition-all
              ${index % 2 === 0 ? 'bg-primary-black-900' : 'bg-primary-black-800/50'}
              border-l-4 border-transparent
            `}
          >
            {/* Icon */}
            <div className="text-2xl flex-shrink-0">
              {getActivityIcon(activity.transaction_type)}
            </div>

            {/* Activity Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-primary-black-50 font-medium truncate">
                {getActivityMessage(activity)}
              </p>
              <p className="text-xs text-primary-black-400 mt-0.5">
                {formatTimeAgo(activity.created_at)}
              </p>
            </div>

            {/* Coins Change */}
            <div className="flex-shrink-0">
              <span className={`text-sm font-semibold ${
                activity.coins_change >= 0 ? 'text-primary-green-400' : 'text-red-400'
              }`}>
                {activity.coins_change >= 0 ? '+' : ''}{activity.coins_change}
                <span className="text-xs ml-1">🪙</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
