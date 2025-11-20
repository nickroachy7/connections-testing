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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary-black-50 mb-2">
            Recent Activity
          </h1>
          <p className="text-primary-black-400">
            Track all your transactions and team activities
          </p>
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
