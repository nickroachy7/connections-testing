import { useAuth } from '../hooks/useAuth';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import LeaderboardWidget from '../components/LeaderboardWidget';

export default function Leaderboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { teamId } = useParams();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary-black-50 text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  // activeTeam will be loaded by the widget from teamId if needed
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      {/* Page Header */}
      <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-xl mb-4 px-4 py-4 mt-6">
        <h1 className="text-xl font-bold text-primary-black-50">Leaderboard</h1>
        <p className="text-xs text-primary-black-400 mt-0.5">See how you rank against others</p>
      </div>
      
      <LeaderboardWidget 
        activeTeam={{ id: teamId }}
        userId={user.id}
        compact={false}
        showFilters={true}
        limit={50}
        defaultSort="season"
      />
    </div>
  );
}
