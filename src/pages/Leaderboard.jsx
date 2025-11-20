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
    <LeaderboardWidget 
      activeTeam={{ id: teamId }}
      userId={user.id}
      compact={false}
      showFilters={true}
      limit={50}
      defaultSort="season"
    />
  );
}
