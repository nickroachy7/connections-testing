import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

export default function LiveScoreWidget() {
  const { user } = useAuth();
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(null);

  useEffect(() => {
    if (!user) return;

    loadScoreData();

    // Subscribe to updates - but don't re-subscribe constantly
    const channel = supabase
      .channel('live-score-widget')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weekly_lineups'
        },
        () => {
          loadScoreData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weekly_global_stats'
        },
        () => {
          loadScoreData();
        }
      )
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadScoreData();
    }, 30000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []); // Only subscribe once

  const loadScoreData = async () => {
    try {
      // Calculate current week
      const today = new Date();
      const seasonYear = today.getFullYear();
      const weekNumber = Math.floor((today.getTime() - new Date(seasonYear, 8, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
      
      setCurrentWeek({ week: weekNumber, year: seasonYear });

      // Get user's active team
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (teamsError) throw teamsError;

      // Get user's lineup for this week
      const { data: lineup, error: lineupError } = await supabase
        .from('weekly_lineups')
        .select('total_points, status')
        .eq('team_id', teams.id)
        .eq('week_number', weekNumber)
        .eq('season_year', seasonYear)
        .single();

      if (lineupError && lineupError.code !== 'PGRST116') throw lineupError;

      // Get global stats for this week
      const { data: globalStats, error: globalError } = await supabase
        .from('weekly_global_stats')
        .select('*')
        .eq('week_number', weekNumber)
        .eq('season_year', seasonYear)
        .single();

      if (globalError && globalError.code !== 'PGRST116') throw globalError;

      // Check if any games are currently live
      const { data: games, error: gamesError } = await supabase
        .from('game_scores')
        .select('game_status')
        .eq('week_number', weekNumber)
        .eq('season_year', seasonYear)
        .in('game_status', ['live', 'halftime']);

      if (gamesError) throw gamesError;

      const hasLiveGames = games && games.length > 0;

      if (hasLiveGames && lineup && globalStats) {
        const pointsDiff = lineup.total_points - globalStats.median_score;
        const isWinning = pointsDiff > 0;

        // Calculate rank by counting teams with higher points
        const { data: allLineups } = await supabase
          .from('weekly_lineups')
          .select('total_points')
          .eq('week_number', weekNumber)
          .eq('season_year', seasonYear)
          .gt('total_points', lineup.total_points);

        const rank = (allLineups?.length || 0) + 1;

        setScoreData({
          yourPoints: lineup.total_points,
          avgPoints: globalStats.median_score,
          rank: rank,
          totalTeams: globalStats.total_active_teams || 0,
          pointsDiff: Math.abs(pointsDiff),
          isWinning,
          status: lineup.status
        });
      } else {
        setScoreData(null);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading score data:', err);
      setLoading(false);
    }
  };

  // Don't show widget if still loading initial data
  if (loading) {
    return null;
  }
  
  // If no live games, show a helpful message
  if (!scoreData) {
    return (
      <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">\ud83d\udcc5</span>
            <div>
              <h3 className="text-lg font-bold text-primary-black-50">No Live Games</h3>
              <p className="text-sm text-primary-black-400 mt-1">Check back during NFL game hours for live scoring</p>
            </div>
          </div>
          <div className="text-sm text-primary-black-500">
            Week {currentWeek?.week || '—'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-2xl p-6 mb-8 shadow-lg shadow-green-500/20 animate-pulse-subtle">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🔴</span>
          <h2 className="text-2xl font-bold text-white">LIVE SCORING</h2>
        </div>
        <div className="text-white text-sm font-semibold bg-white/20 px-3 py-1 rounded-full">
          Week {currentWeek?.week}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="text-white/80 text-sm mb-1">Your Score</div>
          <div className="text-3xl font-bold text-white">{scoreData.yourPoints.toFixed(1)}</div>
          <div className="text-white/60 text-xs mt-1">pts</div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="text-white/80 text-sm mb-1">Median</div>
          <div className="text-3xl font-bold text-white">{scoreData.avgPoints.toFixed(1)}</div>
          <div className="text-white/60 text-xs mt-1">pts</div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="text-white/80 text-sm mb-1">Your Rank</div>
          <div className="text-3xl font-bold text-white">#{scoreData.rank}</div>
          <div className="text-white/60 text-xs mt-1">of {scoreData.totalTeams}</div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="text-white/80 text-sm mb-1">
            {scoreData.isWinning ? 'Winning by' : 'Behind by'}
          </div>
          <div className={`text-3xl font-bold ${scoreData.isWinning ? 'text-yellow-300' : 'text-red-200'}`}>
            {scoreData.pointsDiff.toFixed(1)}
          </div>
          <div className="text-white/60 text-xs mt-1">pts</div>
        </div>
      </div>

      {scoreData.isWinning && (
        <div className="mt-4 text-center text-white font-semibold text-lg">
          🏆 You're in the winning zone! Keep it up!
        </div>
      )}
    </div>
  );
}
