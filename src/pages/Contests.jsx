import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Trophy, RefreshCw, Calendar, AlertCircle, Users, Target, TrendingUp, Swords } from 'lucide-react';
import ContestCard from '../components/ContestCard';
import ContestStandings from '../components/ContestStandings';
import TeamScoreBanner from '../components/TeamScoreBanner';
import JoinContestModal from '../components/JoinContestModal';
import { getAvailableContests, getTeamContestEntry, getContestStandings } from '../services/contestService';
import { supabase } from '../services/supabase';

export default function Contests() {
  const { activeTeam, lineup, lineupStats } = useOutletContext();
  
  const [contests, setContests] = useState([]);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [standings, setStandings] = useState([]);
  const [standingsMedian, setStandingsMedian] = useState(0);
  const [loading, setLoading] = useState(true);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nflCurrentWeek, setNflCurrentWeek] = useState(null);
  const [weekStatus, setWeekStatus] = useState(null);
  const [displayWeek, setDisplayWeek] = useState(null);
  
  // Modal state
  const [selectedContest, setSelectedContest] = useState(null);
  
  // Determine contest status
  const isUpcoming = weekStatus === 'building' || weekStatus === 'locked' || 
    (displayWeek && nflCurrentWeek && displayWeek > nflCurrentWeek);
  const isLive = weekStatus === 'live';
  const isFinal = weekStatus === 'final' || weekStatus === 'finalized';
  
  // Determine which week to show contests for
  const getTeamEligibleWeek = useCallback((nflWeek) => {
    if (!activeTeam || !nflWeek) return nflWeek;
    
    if (activeTeam.current_week && activeTeam.current_week > nflWeek) {
      return activeTeam.current_week;
    }
    
    return nflWeek;
  }, [activeTeam]);
  
  // Load standings for entered contest
  const loadStandings = useCallback(async (contestId, week, season, isUpcomingContest) => {
    console.log('📊 loadStandings called:', { contestId, week, season, isUpcomingContest });
    setStandingsLoading(true);
    try {
      const { data, medianScore, error } = await getContestStandings(contestId, week, season, isUpcomingContest);
      console.log('📊 Standings result:', { data, medianScore, error });
      if (error) throw error;
      setStandings(data || []);
      setStandingsMedian(medianScore || 0);
    } catch (err) {
      console.error('Error loading standings:', err);
    } finally {
      setStandingsLoading(false);
    }
  }, []);
  
  // Fetch contests and current entry
  const loadData = useCallback(async () => {
    if (!activeTeam) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get current NFL week and config
      const { data: config } = await supabase
        .from('nfl_season_config')
        .select('current_week, season_year, week_status')
        .eq('is_active', true)
        .single();
      
      setNflCurrentWeek(config?.current_week);
      setWeekStatus(config?.week_status);
      
      // Determine which week to fetch contests for
      const eligibleWeek = getTeamEligibleWeek(config?.current_week);
      setDisplayWeek(eligibleWeek);
      
      // Fetch contests for the eligible week and team entry in parallel
      const [contestsResult, entryResult] = await Promise.all([
        getAvailableContests(eligibleWeek),
        getTeamContestEntry(activeTeam.id)
      ]);
      
      if (contestsResult.error) throw contestsResult.error;
      if (entryResult.error) throw entryResult.error;
      
      setContests(contestsResult.data || []);
      setCurrentEntry(entryResult.data);
      
      // If user has an entry, load standings
      if (entryResult.data?.contest_id) {
        const isUpcomingContest = eligibleWeek > config?.current_week || 
          config?.week_status === 'building' || config?.week_status === 'locked';
        loadStandings(entryResult.data.contest_id, eligibleWeek, config?.season_year, isUpcomingContest);
      }
    } catch (err) {
      console.error('Error loading contests:', err);
      setError(err.message || 'Failed to load contests');
    } finally {
      setLoading(false);
    }
  }, [activeTeam, getTeamEligibleWeek, loadStandings]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Auto-refresh standings when live
  useEffect(() => {
    if (!isLive || !currentEntry?.contest_id) return;
    
    const interval = setInterval(() => {
      const isUpcomingContest = displayWeek > nflCurrentWeek;
      loadStandings(currentEntry.contest_id, displayWeek, nflCurrentWeek, isUpcomingContest);
    }, 30000); // Refresh every 30 seconds when live
    
    return () => clearInterval(interval);
  }, [isLive, currentEntry?.contest_id, displayWeek, nflCurrentWeek, loadStandings]);
  
  // Handle successful entry
  const handleEntrySuccess = () => {
    setSelectedContest(null);
    loadData(); // Refresh data
  };
  
  // Get entered contest details
  const getEnteredContest = () => {
    if (!currentEntry?.contest_id) return null;
    return contests.find(c => c.id === currentEntry.contest_id);
  };
  
  const enteredContest = getEnteredContest();
  
  // Check if team is already in a contest
  const hasEnteredContest = !!currentEntry;
  
  // Get the entered contest ID
  const enteredContestId = currentEntry?.contest_id;
  
  // Check if this is a private team (can't enter public contests)
  const isPrivateTeam = activeTeam?.team_type === 'private';
  
  // Check if we're showing a future week (team starts later)
  const isShowingFutureWeek = displayWeek && nflCurrentWeek && displayWeek > nflCurrentWeek;
  
  // Calculate user's current score and rank from standings
  const userStanding = standings.find(s => s.team_id === activeTeam?.id);
  const userScore = userStanding?.score || lineupStats?.projectedPoints || 0;
  const userRank = userStanding?.rank || null;
  
  // Lineup readiness
  const lineupReady = (lineup?.length > 0) || (lineupStats?.projectedPoints > 0);
  
  // Status badge for header
  const statusBadge = hasEnteredContest ? (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
      isUpcoming ? 'bg-amber-500/20 text-amber-400' :
      isLive ? 'bg-red-500/20 text-red-400' :
      'bg-blue-500/20 text-blue-400'
    }`}>
      {isUpcoming ? 'Upcoming' : isLive ? 'Live' : 'Final'}
    </span>
  ) : displayWeek ? `Week ${displayWeek}` : null;
  
  return (
    <div className="max-w-7xl mx-auto px-3 pb-4">
      {/* Header */}
      <div className="bg-transparent flex items-center justify-between py-2 px-3 sm:px-4">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-white">
            {hasEnteredContest ? 'Your Contest' : 'Contests'}
          </h1>
          {statusBadge}
        </div>
        {loading && (
          <RefreshCw className="w-3 h-3 text-primary-black-400 animate-spin" />
        )}
      </div>
      
      {/* Private Team Warning */}
      {isPrivateTeam && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-semibold text-yellow-200">Private Team</h3>
            <p className="text-xs text-yellow-200/80">
              This team cannot enter public contests. Create a public team to compete.
            </p>
          </div>
        </div>
      )}
      
      {/* ========================================
          ENTERED CONTEST SECTION
          ======================================== */}
      {hasEnteredContest && currentEntry && (
        <div className="mb-6">
            </span>
          </div>
          
          {/* Contest Score Banner */}
          <div className="mb-4">
            <TeamScoreBanner
              week={displayWeek}
              isLive={isLive}
              isFinal={isFinal}
              isUpcoming={isUpcoming}
              userScore={userScore}
              medianScore={standingsMedian || enteredContest?.median_score || 0}
              winPercentage={userScore > 0 ? Math.round((userScore / (standingsMedian || 100)) * 100) : 0}
              userPercentage={userScore > 0 ? Math.min((userScore / (standingsMedian * 1.5 || 150)) * 100, 100) : 0}
              medianPercentage={66.67}
              isAboveMedian={userScore >= (standingsMedian || 0)}
              winCondition={enteredContest?.win_condition || currentEntry?.win_condition || 'median'}
              isInContest={true}
              contestName={enteredContest?.name || currentEntry?.contest_name || 'Contest'}
              contestEntrantCount={standings.length || enteredContest?.current_entries || 1}
              contestMaxEntries={enteredContest?.max_entries}
              contestMedianScore={standingsMedian}
              contestRank={userRank}
              contestWeek={displayWeek}
              lineupReady={lineupReady}
              size="mobile"
            />
          </div>
          
          {/* Live Standings */}
          <ContestStandings
            standings={standings}
            medianScore={standingsMedian}
            winCondition={enteredContest?.win_condition || currentEntry?.win_condition || 'median'}
            currentTeamId={activeTeam?.id}
            isUpcoming={isUpcoming}
            isLive={isLive}
            isFinal={isFinal}
            loading={standingsLoading}
          />
        </div>
      )}
      
      {/* ========================================
          AVAILABLE CONTESTS SECTION
          ======================================== */}
      {!hasEnteredContest && !isPrivateTeam && isShowingFutureWeek && (
        <div className="mb-6 p-4 bg-primary-green-500/10 border border-primary-green-500/30 rounded-xl flex items-start gap-3">
          <Calendar className="w-5 h-5 text-primary-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-primary-green-400">Ready for Week {displayWeek}!</h3>
            <p className="text-sm text-primary-green-200/80">
              Your team will start competing in Week {displayWeek}. 
              Enter a contest below to be ready when the games begin!
            </p>
          </div>
        </div>
      )}
      
      {/* Section Header for Available Contests */}
      {!hasEnteredContest && contests.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary-black-400" />
          <h2 className="text-lg font-bold text-white">Available Contests</h2>
        </div>
      )}
      
      {/* Other Contests - REMOVED when already entered, only show available contests when not entered */}
      
      {/* Loading State */}
      {loading && contests.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-primary-black-800 rounded-xl border border-primary-black-700 p-5 animate-pulse">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-primary-black-700 rounded-lg" />
                <div className="flex-1">
                  <div className="h-5 bg-primary-black-700 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-primary-black-700 rounded w-full" />
                </div>
              </div>
              <div className="flex gap-2 mb-4">
                <div className="h-6 bg-primary-black-700 rounded w-16" />
                <div className="h-6 bg-primary-black-700 rounded w-20" />
              </div>
              <div className="h-10 bg-primary-black-700 rounded" />
            </div>
          ))}
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Contests</h3>
          <p className="text-primary-black-400 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-primary-black-800 hover:bg-primary-black-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Empty State */}
      {!loading && !error && contests.length === 0 && (
        <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-8 md:p-12 border border-primary-black-700 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-primary-green-500/10 rounded-full flex items-center justify-center">
              <Trophy className="w-10 h-10 text-primary-green-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">No Contests Available</h2>
          <p className="text-primary-black-400 max-w-md mx-auto">
            There are no public contests available for Week {displayWeek} yet. 
            Check back soon!
          </p>
        </div>
      )}
      
      {/* Contest Grid - Only show when NOT already entered */}
      {!loading && !error && contests.length > 0 && !hasEnteredContest && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contests.map((contest) => (
              <ContestCard
                key={contest.id}
                contest={contest}
                isEntered={false}
                onJoin={setSelectedContest}
                disabled={isPrivateTeam}
              />
            ))}
        </div>
      )}
      
      {/* Team Info Footer */}
      {activeTeam && !loading && (
        <div className="mt-8 p-4 bg-primary-black-800/60 rounded-xl border border-primary-black-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeTeam.team_image_url ? (
                <img 
                  src={activeTeam.team_image_url} 
                  alt={activeTeam.team_name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-primary-black-700 rounded-lg flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-primary-black-500" />
                </div>
              )}
              <div>
                <div className="text-sm text-primary-black-400">Competing As</div>
                <div className="font-semibold text-white">{activeTeam.team_name}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-primary-black-400">Record</div>
              <div className="font-semibold text-white">{activeTeam.wins}W - {activeTeam.losses}L</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Join Contest Modal */}
      {selectedContest && (
        <JoinContestModal
          contest={selectedContest}
          team={activeTeam}
          onClose={() => setSelectedContest(null)}
          onSuccess={handleEntrySuccess}
        />
      )}
    </div>
  );
}
