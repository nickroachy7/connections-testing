import { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Trophy, RefreshCw, Calendar, AlertCircle, Heart } from 'lucide-react';
import AvailableContestBanner from '../components/AvailableContestBanner';
import EnteredContestBanner from '../components/EnteredContestBanner';
import JoinContestModal from '../components/JoinContestModal';
import { useContests } from '../hooks/fantasy/useContests';

export default function Contests() {
  const { activeTeam, lineup, lineupStats } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Use centralized hook with caching - no refetch on every navigation
  const {
    contests,
    currentEntries,
    nflCurrentWeek,
    weekStatus,
    displayWeek,
    loading,
    isRefreshing,
    error,
    hasEnteredContest,
    canEnterMore,
    livesRemaining,
    remainingEntries,
    enteredContestIds,
    isUpcoming,
    isLive,
    isFinal,
    isShowingFutureWeek,
    refresh,
    invalidateCache
  } = useContests(activeTeam?.id, activeTeam?.current_week);
  
  // Modal state
  const [selectedContest, setSelectedContest] = useState(null);
  
  // Get contest ID from URL params (for auto-expand)
  const expandContestId = searchParams.get('expand');
  
  // Clear the expand param after it's been used
  useEffect(() => {
    if (expandContestId && !loading) {
      // Remove the param from URL after a short delay to allow expansion
      const timer = setTimeout(() => {
        setSearchParams({}, { replace: true });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [expandContestId, loading, setSearchParams]);
  
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
  
  // Handle successful entry - invalidate cache and refresh
  const handleEntrySuccess = () => {
    setSelectedContest(null);
    invalidateCache();
  };
  
  return (
    <div className="max-w-7xl mx-auto px-3 pb-4">
      {/* Show loading state for initial load only */}
      {loading && contests.length === 0 && currentEntries.length === 0 && (
        <div className="pt-4 space-y-3">
          {/* Skeleton for section header */}
          <div className="h-4 bg-primary-black-800 rounded w-32 mb-3" />
          
          {/* Skeleton cards matching new compact design */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-primary-black-900 rounded-xl overflow-hidden animate-pulse">
              {/* Header skeleton */}
              <div className="border-b border-primary-black-700/50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 bg-primary-black-700 rounded" />
                    <div className="h-3 bg-primary-black-700 rounded w-24" />
                    <div className="h-2.5 bg-primary-black-700 rounded w-16" />
                  </div>
                  <div className="h-2.5 bg-primary-black-700 rounded w-8" />
                </div>
              </div>
              {/* Content skeleton */}
              <div className="px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <div className="h-5 bg-primary-black-700 rounded w-16" />
                  <div className="h-6 bg-primary-black-700 rounded-full w-14" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Only show content after loading completes OR if we have cached data */}
      {(!loading || contests.length > 0 || currentEntries.length > 0) && (
        <>
          {/* Minimal Header - just loading indicator when refreshing */}
          {isRefreshing && (
            <div className="flex justify-end py-2 px-1">
              <RefreshCw className="w-3 h-3 text-primary-black-400 animate-spin" />
            </div>
          )}
          
          {/* ========================================
              ENTERED CONTESTS SECTION
              ======================================== */}
      {hasEnteredContest && currentEntries.length > 0 && (
        <div className="space-y-3 pt-4">
          {/* Section Header with lives */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-primary-black-400 uppercase tracking-wide">
                Your Contests
              </h2>
              {statusBadge}
            </div>
            {/* Lives indicator */}
            {livesRemaining > 0 && (
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
            const projectedScore = lineupStats?.projectedPoints || 0;
            const contestId = contest?.id || entry.contest_id;
            
            return (
              <EnteredContestBanner
                key={entry.id}
                contest={contest}
                entry={entry}
                teamId={activeTeam?.id}
                userScore={entry.final_score || 0}
                projectedScore={projectedScore}
                medianScore={contest?.median_score || 0}
                isLive={isLive}
                isFinal={isFinal}
                isUpcoming={isUpcoming}
                lineupReady={lineupReady}
                defaultExpanded={expandContestId === contestId}
              />
            );
          })}
        </div>
      )}
      
      {/* ========================================
          AVAILABLE CONTESTS SECTION
          ======================================== */}
      
      {/* Future week info - only show if no contests entered yet */}
      {isShowingFutureWeek && !hasEnteredContest && (
        <div className={`${hasEnteredContest ? 'mt-6' : 'mt-4'} mb-4 p-3 bg-primary-green-500/10 border border-primary-green-500/30 rounded-lg flex items-start gap-2`}>
          <Calendar className="w-4 h-4 text-primary-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-primary-green-300">
              Your team starts Week {displayWeek}. Enter a contest to compete!
            </p>
          </div>
        </div>
      )}
      
      {/* Available Contests Section Header */}
      {(() => {
        const availableContests = contests.filter(contest => {
          const isAlreadyEntered = enteredContestIds.includes(contest.id);
          const isFull = contest.max_entries && contest.current_entries >= contest.max_entries;
          return !isAlreadyEntered && !isFull;
        });
        
        if (availableContests.length === 0) return null;
        
        return (
          <div className={`${hasEnteredContest ? 'mt-6' : 'pt-4'} mb-3`}>
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold text-primary-black-400 uppercase tracking-wide">
                Available Contests
              </h2>
              {hasEnteredContest && (
                <span className={`text-[10px] ${canEnterMore && remainingEntries > 0 ? 'text-primary-green-400' : 'text-primary-black-500'}`}>
                  {canEnterMore && remainingEntries > 0 
                    ? `${remainingEntries} entr${remainingEntries === 1 ? 'y' : 'ies'} remaining`
                    : 'No entries remaining'
                  }
                </span>
              )}
            </div>
          </div>
        );
      })()}
      
      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Contests</h3>
          <p className="text-primary-black-400 mb-4">{error}</p>
          <button
            onClick={refresh}
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
      {/* Filter out already entered contests AND full contests */}
      {!loading && !error && contests.length > 0 && (() => {
        const availableContests = contests.filter(contest => {
          const isAlreadyEntered = enteredContestIds.includes(contest.id);
          const isFull = contest.max_entries && contest.current_entries >= contest.max_entries;
          return !isAlreadyEntered && !isFull;
        });
        
        if (availableContests.length === 0) return null;
        
        // Disable joining if user has no entries remaining
        const cannotJoin = !canEnterMore || remainingEntries <= 0;
        
        return (
          <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
            {availableContests.map((contest) => (
              <AvailableContestBanner
                key={contest.id}
                contest={contest}
                onJoin={setSelectedContest}
                disabled={cannotJoin}
              />
            ))}
          </div>
        );
      })()}
      
      {/* Join Contest Modal */}
      {selectedContest && (
        <JoinContestModal
          contest={selectedContest}
          team={activeTeam}
          onClose={() => setSelectedContest(null)}
          onSuccess={handleEntrySuccess}
        />
      )}
        </>
      )}
    </div>
  );
}
