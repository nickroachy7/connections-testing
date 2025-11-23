import { useOutletContext } from 'react-router-dom';
import RecentActivityFeed from '../components/RecentActivityFeed';

export default function Activity() {
  const { user, activeTeam } = useOutletContext() || {};

  if (!activeTeam) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-primary-black-400">No active team found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-black-950">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-8">
        {/* Page Header */}
        <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-lg sm:rounded-xl mb-3 sm:mb-4 px-3 sm:px-4 py-2 sm:py-4">
          <h1 className="text-sm sm:text-xl font-bold text-primary-black-50">Activity</h1>
          <p className="text-[10px] sm:text-xs text-primary-black-400 mt-0.5">Track your recent transactions</p>
        </div>

        {/* Recent Activity Feed */}
        <RecentActivityFeed 
          teamId={activeTeam.id} 
          userId={user?.id} 
          limit={50} 
        />
      </div>
    </div>
  );
}
