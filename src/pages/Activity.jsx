import { useOutletContext } from 'react-router-dom';
import RecentActivityFeed from '../components/RecentActivityFeed';
import PageHeader from '../components/PageHeader';

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
        <PageHeader
          title="Activity"
          subtitle="Track your recent transactions"
        />

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
