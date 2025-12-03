import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import LeaderboardTable from '../components/tables/LeaderboardTable';
import LoadingSpinner from '../components/LoadingSpinner';
import PageHeader from '../components/PageHeader';

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
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <PageHeader
          title="Leaderboard"
          className="mt-2"
        />
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