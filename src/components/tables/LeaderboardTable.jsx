import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../../services/supabase';
import LoadingSpinner from '../LoadingSpinner';
import { TrophyIcon } from '@heroicons/react/24/solid';
import { STARTING_POSITIONS } from '../../constants/lineup';

/**
 * LeaderboardTable - Global leaderboard with consistent styling matching PlayerTable
 * 
 * Features:
 * - Same row heights and grid layout as PlayerTable for consistency
 * - Season and weekly leaderboards
 * - Highlights current user's team
 * - Trophy icons for top 3
 * - Responsive design with mobile optimization
 */
const LeaderboardTable = ({
  currentUserId = null,
  limit = 50,
  showAvatars = true,
  showRecordColumn = true,
  onTeamClick = null,
  defaultSort = 'season'
}) => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [seasonYear, setSeasonYear] = useState(null);
  const [hasLiveGames, setHasLiveGames] = useState(false);

  // Fetch current week on mount
  useEffect(() => {
    fetchCurrentWeek();
  }, []);

  // Fetch leaderboard when current week loads
  useEffect(() => {
    if (currentWeek && seasonYear) {
      fetchLeaderboard();
    }
  }, [currentWeek, seasonYear]);

  // Auto-refresh during live games every 30 seconds
  useEffect(() => {
    if (!hasLiveGames || !currentWeek || !seasonYear) return;

    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing leaderboard (live games in progress)');
      fetchLeaderboard();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [hasLiveGames, currentWeek, seasonYear]);

  const fetchCurrentWeek = async () => {
    try {
      const { data, error } = await supabase
        .from('nfl_season_config')
        .select('current_week, season_year')
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setCurrentWeek(data.current_week);
      setSeasonYear(data.season_year);
    } catch (err) {
      console.error('Error fetching current week:', err);
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get all teams
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, team_name, user_id, wins, losses, users(username, avatar_url)')
        .eq('is_active', true);

      if (teamsError) throw teamsError;
      if (!teams?.length) {
        setLeaderboardData([]);
        setLoading(false);
        return;
      }

      // Fetch games once for all teams
      const { data: gamesData } = await supabase
        .from('game_scores')
        .select('game_id, game_status')
        .eq('week_number', currentWeek)
        .eq('season_year', seasonYear);

      const gameIds = gamesData?.map(g => g.game_id) || [];
      
      // Check if any games are live/halftime for auto-refresh
      const isLive = gamesData?.some(g => 
        g.game_status === 'live' || g.game_status === 'halftime'
      ) || false;
      setHasLiveGames(isLive);
      
      // Create game status map
      const gameStatusMap = new Map(
        gamesData?.map(g => [g.game_id, g.game_status]) || []
      );

      // Calculate live scores for each team using inventory
      const leaderboardWithScores = await Promise.all(
        teams.map(async (team) => {
          // Get inventory for this team (same query as getUserInventory)
          const { data: inventoryData, error: inventoryError } = await supabase
            .from('user_player_inventory')
            .select(`
              *,
              player_card:player_cards!inner(
                player_id,
                player_name,
                weekly_projected_points,
                projected_points
              )
            `)
            .eq('team_id', team.id);

          if (inventoryError) {
            console.error(`Error fetching inventory for ${team.team_name}:`, inventoryError);
          }

          if (!inventoryData || inventoryData.length === 0) {
            return {
              team_id: team.id,
              team_name: team.team_name,
              user_id: team.user_id,
              username: team.users?.username,
              avatar_url: team.users?.avatar_url,
              wins: team.wins || 0,
              losses: team.losses || 0,
              current_week_score: 0
            };
          }

          // Filter to only STARTING lineup players (exclude bench)
          const lineupPlayers = inventoryData.filter(p => 
            p.is_in_lineup && 
            p.player_card && 
            STARTING_POSITIONS.includes(p.lineup_position)
          );

          if (!lineupPlayers.length) {
            return {
              team_id: team.id,
              team_name: team.team_name,
              user_id: team.user_id,
              username: team.users?.username,
              avatar_url: team.users?.avatar_url,
              wins: team.wins || 0,
              losses: team.losses || 0,
              current_week_score: 0
            };
          }

          // Get player game stats for these games (using gameIds from outer scope)
          const { data: allGameStats, error: gameStatsError } = await supabase
            .from('player_game_stats')
            .select(`
              fantasy_points,
              game_id,
              player_cards!inner(player_id)
            `)
            .in('game_id', gameIds);

          if (gameStatsError) {
            console.error(`Error fetching game stats for ${team.team_name}:`, gameStatsError);
          }

          // Filter to only stats for players in this team's lineup
          const playerIds = lineupPlayers.map(p => p.player_card.player_id);
          const gameStats = allGameStats?.filter(stat => 
            playerIds.includes(stat.player_cards.player_id)
          ) || [];

          // Create map of player stats with game status from game_scores
          const statsMap = new Map(
            gameStats?.map(stat => [
              stat.player_cards.player_id, 
              {
                fantasy_points: stat.fantasy_points,
                game_status: gameStatusMap.get(stat.game_id)
              }
            ]) || []
          );

          // Calculate total score (LIVE POINTS ONLY - same as banner)
          let totalScore = 0;
          
          if (team.team_name === 'A new team') {
            console.log('=== DEBUG A new team ===');
            console.log('Lineup players count:', lineupPlayers.length);
            console.log('Players:', lineupPlayers.map(p => ({
              name: p.player_card.player_name,
              position: p.lineup_position,
              weeklyProj: p.player_card.weekly_projected_points,
              proj: p.player_card.projected_points
            })));
          }
          
          lineupPlayers.forEach(player => {
            const playerId = player.player_card.player_id;
            const playerName = player.player_card.player_name;
            const gameStat = statsMap.get(playerId);
            const gameStatus = gameStat?.game_status?.toLowerCase() || 'scheduled';
            const isGameStarted = ['live', 'halftime', 'final'].includes(gameStatus);

            let playerScore = 0;
            // ONLY count live/final games - scheduled games count as 0 (same as banner livePoints)
            if (isGameStarted && gameStat?.fantasy_points != null) {
              playerScore = parseFloat(gameStat.fantasy_points);
            }
            
            if (team.team_name === 'A new team') {
              console.log(`  ${playerName} (${player.lineup_position}): ${playerScore.toFixed(1)} - ${isGameStarted ? 'LIVE' : 'SCHEDULED'} (${gameStatus})`);
            }
            
            totalScore += playerScore;
          });
          
          if (team.team_name === 'A new team') {
            console.log('Total score:', totalScore.toFixed(1));
            console.log('===================');
          }

          return {
            team_id: team.id,
            team_name: team.team_name,
            user_id: team.user_id,
            username: team.users?.username,
            avatar_url: team.users?.avatar_url,
            wins: team.wins || 0,
            losses: team.losses || 0,
            current_week_score: totalScore
          };
        })
      );

      // Sort by score and add ranks
      const sorted = leaderboardWithScores
        .sort((a, b) => b.current_week_score - a.current_week_score)
        .map((entry, index) => ({
          ...entry,
          rank_by_points: index + 1
        }))
        .slice(0, limit);

      setLeaderboardData(sorted);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <TrophyIcon className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <TrophyIcon className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <TrophyIcon className="w-5 h-5 text-amber-600" />;
    return null;
  };

  const getRankDisplay = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  // Grid template matching PlayerTable structure
  const getGridTemplate = () => {
    const columns = [
      '60px',   // Rank
      '40px',   // Avatar
      '1fr',    // Team info (name + username)
      '100px'   // Week Points
    ];
    return columns.join(' ');
  };

  const getMobileGridTemplate = () => {
    const columns = [
      '40px',   // Rank
      '1fr',    // Team info
      '80px'    // Points
    ];
    return columns.join(' ');
  };

  const gridTemplate = getGridTemplate();
  const mobileGridTemplate = getMobileGridTemplate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" message="Loading leaderboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Leaderboard Table */}
      <div className="overflow-hidden relative w-full">
        {/* Desktop Header Row */}
        <div 
          className="hidden md:grid bg-primary-black-800/30 border-b border-primary-black-700 py-2 px-2"
          style={{ 
            gridTemplateColumns: gridTemplate,
            gap: '4px'
          }}
        >
          <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center">RANK</span>
          <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center"></span>
          <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider">TEAM</span>
          <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-right">WEEK {currentWeek}</span>
        </div>

        {/* Leaderboard Rows */}
        {leaderboardData.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-center">
            <div>
              <div className="text-4xl mb-2 opacity-30">🏆</div>
              <p className="text-primary-black-400 font-semibold">No leaderboard data available</p>
            </div>
          </div>
        ) : (
          leaderboardData.map((entry, index) => (
            <LeaderboardRow
              key={entry.team_id}
              entry={entry}
              index={index}
              currentUserId={currentUserId}
              currentWeek={currentWeek}
              showAvatars={showAvatars}
              gridTemplate={gridTemplate}
              mobileGridTemplate={mobileGridTemplate}
              getRankIcon={getRankIcon}
              getRankDisplay={getRankDisplay}
              onTeamClick={onTeamClick}
            />
          ))
        )}
      </div>

      {/* Footer Note */}
      <div className="text-xs text-primary-black-500 text-center mt-2 max-w-7xl mx-auto px-2 sm:px-4">
        Week {currentWeek} live rankings
      </div>
    </div>
  );
};

/**
 * LeaderboardRow - Individual row component
 * Separated for clarity and performance
 */
const LeaderboardRow = ({
  entry,
  index,
  currentUserId,
  currentWeek,
  showAvatars,
  gridTemplate,
  mobileGridTemplate,
  getRankIcon,
  getRankDisplay,
  onTeamClick
}) => {
  const isCurrentUser = entry.user_id === currentUserId;
  const rank = entry.rank_by_points;
  
  // Base alternating background
  const bgColor = index % 2 === 0 ? 'bg-primary-black-800/20' : 'bg-primary-black-800/40';
  
  const defaultClassName = `
    grid transition-all min-h-[56px] cursor-pointer
    ${bgColor}
    hover:bg-primary-black-700/50
  `;

  const handleClick = () => {
    if (onTeamClick) {
      onTeamClick(entry);
    }
  };

  return (
    <>
      {/* Desktop Row */}
      <div
        onClick={handleClick}
        className={`hidden md:grid items-center py-2 px-2 ${defaultClassName}`}
        style={{ 
          gridTemplateColumns: gridTemplate,
          gap: '4px'
        }}
      >
        {/* Rank */}
        <div className="flex items-center justify-center gap-1">
          {getRankIcon(rank)}
          <span className={`font-bold ${
            rank <= 3 ? 'text-base' : 'text-[11px] text-primary-black-100'
          }`}>
            {rank <= 3 ? getRankDisplay(rank) : `#${rank}`}
          </span>
        </div>

        {/* Avatar */}
        <div className="flex items-center justify-center">
          {showAvatars && entry.avatar_url ? (
            <img 
              src={entry.avatar_url} 
              alt="" 
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-black-700 flex items-center justify-center">
              <span className="text-primary-black-400 text-xs font-bold">
                {entry.team_name?.charAt(0) || '?'}
              </span>
            </div>
          )}
        </div>

        {/* Team Info */}
        <div className="min-w-0 overflow-hidden">
          <div className="flex items-baseline gap-1 mb-0.5">
            <h4 className="font-bold truncate text-[11px] leading-tight text-primary-black-50">
              {entry.team_name}
            </h4>
          </div>
          <div className="text-[9px] text-primary-black-400 leading-tight">
            @{entry.username}
          </div>
        </div>

        {/* Week Points */}
        <div className="flex items-center justify-end">
          <span className="font-bold text-primary-black-50 text-[11px]">
            {entry.current_week_score !== undefined ? Number(entry.current_week_score).toFixed(1) : '0.0'}
          </span>
        </div>
      </div>

      {/* Mobile Row */}
      <div
        onClick={handleClick}
        className={`md:hidden grid items-center py-2 px-2 ${defaultClassName}`}
        style={{ 
          gridTemplateColumns: mobileGridTemplate,
          gap: '4px'
        }}
      >
        {/* Rank */}
        <div className="flex items-center justify-center">
          <span className={`font-bold ${
            rank <= 3 ? 'text-sm' : 'text-[11px] text-primary-black-100'
          }`}>
            {rank <= 3 ? getRankDisplay(rank) : `#${rank}`}
          </span>
        </div>

        {/* Team Info */}
        <div className="min-w-0 overflow-hidden">
          <div className="flex items-baseline gap-1 mb-0.5">
            {showAvatars && entry.avatar_url && (
              <img 
                src={entry.avatar_url} 
                alt="" 
                className="w-5 h-5 rounded-full flex-shrink-0"
              />
            )}
            <h4 className="font-bold truncate text-[11px] leading-tight text-primary-black-50">
              {entry.team_name}
            </h4>
          </div>
          <div className="text-[9px] text-primary-black-400 leading-tight">
            @{entry.username}
          </div>
        </div>

        {/* Points */}
        <div className="flex items-center justify-end">
          <span className="font-bold text-primary-black-50 text-[11px]">
            {entry.current_week_score !== undefined ? Number(entry.current_week_score).toFixed(1) : '0.0'}
          </span>
        </div>
      </div>
    </>
  );
};

LeaderboardRow.propTypes = {
  entry: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  currentUserId: PropTypes.string,
  currentWeek: PropTypes.number,
  showAvatars: PropTypes.bool,
  gridTemplate: PropTypes.string.isRequired,
  mobileGridTemplate: PropTypes.string.isRequired,
  getRankIcon: PropTypes.func.isRequired,
  getRankDisplay: PropTypes.func.isRequired,
  onTeamClick: PropTypes.func
};

LeaderboardTable.propTypes = {
  currentUserId: PropTypes.string,
  limit: PropTypes.number,
  showAvatars: PropTypes.bool,
  showRecordColumn: PropTypes.bool,
  onTeamClick: PropTypes.func,
  defaultSort: PropTypes.string
};

export default LeaderboardTable;