import { useOutletContext } from 'react-router-dom';
import { User, Mail, Calendar, Trophy, Coins } from 'lucide-react';

/**
 * Profile Page - User profile and settings
 * 
 * Shows user information, stats across all teams, and account settings.
 */
export default function Profile() {
  const { user, profile, teams } = useOutletContext();

  // Calculate aggregate stats from all teams
  const aggregateStats = (teams || []).reduce((acc, team) => {
    acc.totalWins += team.wins || 0;
    acc.totalLosses += team.losses || 0;
    acc.totalCoins += team.coins || 0;
    return acc;
  }, { totalWins: 0, totalLosses: 0, totalCoins: 0 });

  const totalTeams = teams?.length || 0;
  const username = profile?.username || profile?.display_name || user?.email?.split('@')[0] || 'User';
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  }) : 'Unknown';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Profile Header */}
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-6 border border-primary-black-700">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-20 h-20 bg-primary-green-500/20 rounded-full flex items-center justify-center border-2 border-primary-green-500/30">
            <User className="w-10 h-10 text-primary-green-500" />
          </div>
          
          {/* User Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{username}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-primary-black-400">
              {user?.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Joined {memberSince}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-4 border border-primary-black-700">
          <div className="flex items-center gap-2 text-primary-black-400 mb-2">
            <Trophy className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase">Teams</span>
          </div>
          <div className="text-2xl font-bold text-white">{totalTeams}</div>
        </div>

        <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-4 border border-primary-black-700">
          <div className="flex items-center gap-2 text-primary-black-400 mb-2">
            <Trophy className="w-4 h-4 text-green-500" />
            <span className="text-xs font-semibold uppercase">Total Wins</span>
          </div>
          <div className="text-2xl font-bold text-green-500">{aggregateStats.totalWins}</div>
        </div>

        <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-4 border border-primary-black-700">
          <div className="flex items-center gap-2 text-primary-black-400 mb-2">
            <Trophy className="w-4 h-4 text-red-500" />
            <span className="text-xs font-semibold uppercase">Total Losses</span>
          </div>
          <div className="text-2xl font-bold text-red-500">{aggregateStats.totalLosses}</div>
        </div>

        <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-4 border border-primary-black-700">
          <div className="flex items-center gap-2 text-primary-black-400 mb-2">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="text-xs font-semibold uppercase">Total Coins</span>
          </div>
          <div className="text-2xl font-bold text-yellow-500">{aggregateStats.totalCoins.toLocaleString()}</div>
        </div>
      </div>

      {/* Account Settings Placeholder */}
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-6 border border-primary-black-700">
        <h2 className="text-lg font-bold text-white mb-4">Account Settings</h2>
        <p className="text-primary-black-400 text-sm">
          Account settings and preferences coming soon.
        </p>
      </div>
    </div>
  );
}
