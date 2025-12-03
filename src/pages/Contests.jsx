import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Trophy, RefreshCw, Calendar, AlertCircle, Heart } from 'lucide-react';
import ContestCard from '../components/ContestCard';
import ExpandableContestBanner from '../components/ExpandableContestBanner';
import JoinContestModal from '../components/JoinContestModal';
import { getAvailableContests, getTeamContestEntryStatus, getTeamContestEntries } from '../services/contestService';
import { supabase } from '../services/supabase';

export default function Contests() {
  const { activeTeam, lineup, lineupStats } = useOutletContext();
  
  const [contests, setContests] = useState([]);
  const [currentEntries, setCurrentEntries] = useState([]); // Array of entries
  const [entryStatus, setEntryStatus] = useState(null); // Lives/entries status
  const [loading, setLoading] = useState(true);
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
  
  // Fetch contests and current entries
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
      
      // Fetch contests, entry status, and entries in parallel
      const [contestsResult, statusResult, entriesResult] = await Promise.all([
        getAvailableContests(eligibleWeek),
        getTeamContestEntryStatus(activeTeam.id, eligibleWeek, config?.season_year),
        getTeamContestEntries(activeTeam.id, eligibleWeek, config?.season_year)
      ]);
      
      if (contestsResult.error) throw contestsResult.error;
      
      setContests(contestsResult.data || []);
      setEntryStatus(statusResult.data);
      setCurrentEntries(entriesResult.data || []);
    } catch (err) {
      console.error('Error loading contests:', err);
      setError(err.message || 'Failed to load contests');
    } finally {
      setLoading(false);
    }
  }, [activeTeam, getTeamEligibleWeek]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Handle successful entry
  const handleEntrySuccess = () => {
    setSelectedContest(null);
    loadData(); // Refresh data
  };
  
  // Check if team has entered any contests
  const hasEnteredContest = currentEntries.length > 0;
  
  // Check if team can enter more contests (based on lives)
  const canEnterMore = entryStatus?.can_enter_more ?? true;
  const livesRemaining = entryStatus?.lives_remaining ?? 3;
  const entriesThisWeek = entryStatus?.entries_count ?? currentEntries.length;
  const remainingEntries = entryStatus?.remaining_entries ?? (livesRemaining - entriesThisWeek);
  
  // Get IDs of contests already entered
  const enteredContestIds = currentEntries.map(e => e.contest_id || e.contest?.id);
  
  // Check if this is a private team (can't enter public contests)
  const isPrivateTeam = activeTeam?.team_type === 'private';
  
  // Check if we're showing a future week (team starts later)
  const isShowingFutureWeek = displayWeek && nflCurrentWeek && displayWeek > nflCurrentWeek;
  
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
      {/* Minimal Header - just loading indicator when needed */}
      {loading && (
        <div className="flex justify-end py-2 px-1">
          <RefreshCw className="w-3 h-3 text-primary-black-400 animate-spin" />
        </div>
      )}
      
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
          ENTERED CONTESTS SECTION
          ======================================== */}
      {hasEnteredContest && currentEntries.length > 0 && (
        <div className="space-y-3">
          {/* Section Header with lives */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-primary-black-400 uppercase tracking-wide">
                Your Contests
              </h2>
              {statusBadge}
            </div>
            {/* Lives indicator */}
            {!isPrivateTeam && livesRemaining > 0 && (
              <div className="flex items-center gap-1">
                {[...Array(livesRemaining)].map((_, i) => (
                  <Heart 
                    key={i} 
                    className={`w-3 h-3 ${i < (livesRemaining - remainingEntries) ? 'text-red-500 fill-red-500' : 'text-red-500/30'}`} 
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Contest Banners */}
          {currentEntries.map((entry) => {
            const contest = entry.contest || contests.find(c => c.id === entry.contest_id);
            const entryScore = lineupStats?.projectedPoints || 0;
            
            return (
              <ExpandableContestBanner
                key={entry.id}
                entry={entry}
                contest={contest}
                displayWeek={displayWeek}
                isLive={isLive}
                isFinal={isFinal}
                isUpcoming={isUpcoming}
                userScore={entryScore}
                lineupReady={lineupReady}
                teamId={activeTeam?.id}
              />
            );
          })}
        </div>
      )}
      
      {/* ========================================
          AVAILABLE CONTESTS SECTION
          ======================================== */}
      
      {/* Future week info - only show if no contests entered yet */}
      {!isPrivateTeam && isShowingFutureWeek && !hasEnteredContest && (
        <div className="mb-4 p-3 bg-primary-green-500/10 border border-primary-green-500/30 rounded-lg flex items-start gap-2">
          <Calendar className="w-4 h-4 text-primary-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-primary-green-300">
              Your team starts Week {displayWeek}. Enter a contest to compete!
            </p>
          </div>
        </div>
      )}
      
      {/* Can Enter More - subtle inline message */}
      {contests.length > 0 && (canEnterMore || !hasEnteredContest) && !isPrivateTeam && (
        <div className="mt-8 mb-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold text-primary-black-400 uppercase tracking-wide">
              {hasEnteredContest ? 'Enter More Contests' : 'Available Contests'}
            </h2>
            {hasEnteredContest && canEnterMore && remainingEntries > 0 && (
              <span className="text-[10px] text-primary-green-400">
                {remainingEntries} entr{remainingEntries === 1 ? 'y' : 'ies'} remaining
              </span>
            )}
          </div>
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
      
      {/* Contest Grid - Stack on mobile, grid on larger screens */}
      {!loading && !error && contests.length > 0 && (canEnterMore || !hasEnteredContest) && !isPrivateTeam && (
        <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
          {contests.map((contest) => {
            const isAlreadyEntered = enteredContestIds.includes(contest.id);
            return (
              <ContestCard
                key={contest.id}
                contest={contest}
                isEntered={isAlreadyEntered}
                onJoin={setSelectedContest}
                disabled={isPrivateTeam || isAlreadyEntered}
              />
            );
          })}
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
