import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import LeaderboardTable from '../components/tables/LeaderboardTable';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Leaderboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading..." />
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="pb-4 sm:pb-8">
      {/* Page Header */}
      <div className="mb-3 sm:mb-4 px-2 sm:px-4 py-2 sm:py-4 mt-3 sm:mt-6 max-w-7xl mx-auto">
        <h1 className="text-sm sm:text-xl font-bold text-primary-black-50">Leaderboard</h1>
        <p className="text-[10px] sm:text-xs text-primary-black-400 mt-0.5">See how you rank against others</p>
      </div>
      
      <LeaderboardTable 
        currentUserId={user.id}
        limit={50}
        defaultSort="season"
        showAvatars={true}
        showRecordColumn={true}
      />
    </div>
  );
}