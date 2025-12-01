import { useState, useEffect } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Trophy, Users } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function LeagueMembers() {
  const { league } = useOutletContext();
  const { leagueId } = useParams();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, [leagueId]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('league_memberships')
        .select(`
          *,
          users:user_id (
            username,
            display_name
          )
        `)
        .eq('league_id', leagueId)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      // Get team counts for each member
      const membersWithTeams = await Promise.all(
        (data || []).map(async (member) => {
          const { count: teamCount } = await supabase
            .from('league_teams')
            .select('id', { count: 'exact', head: true })
            .eq('league_id', leagueId)
            .eq('user_id', member.user_id)
            .eq('is_active', true);

          return {
            ...member,
            teamCount: teamCount || 0
          };
        })
      );

      setMembers(membersWithTeams);
    } catch (error) {
      console.error('Error loading members:', error);
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">
          League Members
        </h2>
        <p className="text-gray-400 text-sm">
          {members.length} of {league.max_users} members
        </p>
      </div>

      <div className="space-y-3">
        {members.map((member, index) => (
          <div
            key={member.id}
            className="bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-colors border border-white/5"
          >
            <div className="flex items-center justify-between">
              {/* Left Side - Member Info */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Member Number */}
                <div className="w-8 text-center text-gray-500 font-semibold">
                  {index + 1}
                </div>

                {/* Profile Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold truncate">
                      {member.users?.display_name || member.users?.username}
                    </h3>
                    {member.is_commissioner && (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 bg-primary-green/20 text-primary-green text-xs font-semibold rounded-full">
                        <Trophy className="w-3 h-3" />
                        Commissioner
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">
                    Joined {new Date(member.joined_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>

              {/* Right Side - Team Count */}
              <div className="text-right ml-4">
                <div className="flex items-center gap-1.5 text-white">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold">
                    {member.teamCount} {member.teamCount === 1 ? 'team' : 'teams'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {league.is_commissioner && members.length < league.max_users && (
        <div className="mt-6 p-4 bg-primary-green/10 border border-primary-green/30 rounded-lg">
          <p className="text-primary-green text-sm">
            <span className="font-semibold">
              {league.max_users - members.length} {league.max_users - members.length === 1 ? 'spot' : 'spots'} remaining
            </span>
            {' '}— Share your invite code to fill the league
          </p>
        </div>
      )}
    </div>
  );
}
