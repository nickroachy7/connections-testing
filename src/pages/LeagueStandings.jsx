import { useState, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Trophy, Plus } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import TeamMenuCard from '../components/TeamMenuCard';

export default function LeagueStandings() {
  const { league, user, userTeamsCount } = useOutletContext();
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStandings();
  }, [leagueId]);

  const loadStandings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('league_teams')
        .select(`
          *,
          teams!inner (
            id,
            team_name,
            user_id,
            total_points
          )
        `)
        .eq('league_id', leagueId)
        .eq('is_active', true)
        .order('league_wins', { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(s => s.teams.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, display_name')
          .in('id', userIds);

        const profileMap = {};
        profiles?.forEach(p => {
          profileMap[p.id] = p;
        });

        // Attach profiles to standings
        const standingsWithProfiles = data.map(standing => ({
          ...standing,
          teams: {
            ...standing.teams,
            profile: profileMap[standing.teams.user_id]
          }
        }));

        setStandings(standingsWithProfiles);
      } else {
        setStandings(data || []);
      }
    } catch (error) {
      console.error('Error loading standings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (standings.length === 0) {
    const canAddTeams = userTeamsCount < league.max_teams_per_user;
    
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
          <Trophy className="w-10 h-10 text-gray-600" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">No Teams Yet</h2>
        <p className="text-gray-400 mb-6 max-w-md">
          {userTeamsCount === 0
            ? "This league doesn't have any teams competing yet. Add your team to get started!"
            : "No teams are competing in this league yet."}
        </p>
        {canAddTeams && (
          <button
            onClick={() => navigate(`/leagues/${leagueId}/add-team`)}
            className="flex items-center gap-2 px-6 py-3 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black font-bold rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Your Team
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-3">
        {standings.map((standing, index) => {
          const isUserTeam = standing.teams.user_id === user.id;
          
          // Create a team object that matches what TeamMenuCard expects
          const teamForCard = {
            ...standing.teams,
            wins: standing.league_wins,
            losses: standing.league_losses,
            contest_type: {
              max_losses: league.elimination_enabled ? league.max_lives || 3 : null
            }
          };
          
          return (
            <div key={standing.id} className="relative">
              {/* Rank Badge */}
              {index < 3 && (
                <div className="absolute -left-2 -top-2 z-10 text-2xl">
                  {index === 0 && '🏆'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                </div>
              )}
              
              {/* Team Card */}
              <div className={isUserTeam ? 'ring-2 ring-primary-green/50 rounded-lg' : ''}>
                <TeamMenuCard
                  team={teamForCard}
                  isActive={isUserTeam}
                  onClick={() => {
                    if (isUserTeam) {
                      navigate(`/fantasy/${standing.teams.id}`);
                    }
                  }}
                />
              </div>
              
              {/* Your Team Badge */}
              {isUserTeam && (
                <div className="absolute top-2 right-2 z-10">
                  <span className="px-2 py-1 bg-primary-green/90 text-primary-black text-xs font-bold rounded">
                    Your Team
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
