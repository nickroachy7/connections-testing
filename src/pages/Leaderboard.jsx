import { useAuth } from '../hooks/useAuth';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import LeaderboardWidget from '../components/LeaderboardWidget';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Leaderboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { teamId } = useParams();
  const [activeTeam, setActiveTeam] = useState(null);
  const [teamLoading, setTeamLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (teamId && user) {
      fetchTeam();
    } else {
      setTeamLoading(false);
    }
  }, [teamId, user]);

  const fetchTeam = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, team_name, contest_type_id, user_id')
        .eq('id', teamId)
        .single();

      if (error) throw error;
      setActiveTeam(data);
    } catch (err) {
      console.error('Error fetching team:', err);
    } finally {
      setTeamLoading(false);
    }
  };

  if (loading || teamLoading) {
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
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 pb-4 sm:pb-8">
      {/* Page Header */}
      <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-lg sm:rounded-xl mb-3 sm:mb-4 px-3 sm:px-4 py-2 sm:py-4 mt-3 sm:mt-6">
        <h1 className="text-sm sm:text-xl font-bold text-primary-black-50">Leaderboard</h1>
        <p className="text-[10px] sm:text-xs text-primary-black-400 mt-0.5">See how you rank against others</p>
      </div>
      
      <LeaderboardWidget 
        activeTeam={activeTeam}
        userId={user.id}
        compact={false}
        showFilters={true}
        limit={50}
        defaultSort="season"
      />
    </div>
  );
}
