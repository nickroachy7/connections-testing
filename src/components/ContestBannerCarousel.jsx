import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import PropTypes from 'prop-types';
import TeamScoreBanner from './TeamScoreBanner';

/**
 * MemoizedContestBanner
 * 
 * Memoized wrapper for TeamScoreBanner to prevent unnecessary re-renders.
 * Only re-renders when props actually change.
 */
const MemoizedContestBanner = memo(function MemoizedContestBanner({ 
  contestItem, 
  userScore, 
  fallbackMedian,
  winPercentage,
  displayWeek,
  isLive,
  isFinal,
  lineupReady,
  onContestClick
}) {
  const contestMedianVal = contestItem.contestMedian || fallbackMedian;
  const contestIsAboveMedian = userScore >= contestMedianVal;
  const contestMaxScore = Math.max(userScore, contestMedianVal, 150);
  const contestUserPct = Math.round((userScore / contestMaxScore) * 100);
  const contestMedianPct = Math.round((contestMedianVal / contestMaxScore) * 100);

  return (
    <TeamScoreBanner
      week={contestItem.eligibleWeek || displayWeek?.week}
      isLive={contestItem.isLive || isLive}
      isFinal={contestItem.isFinal || isFinal}
      isUpcoming={contestItem.isUpcoming}
      userScore={userScore}
      medianScore={contestMedianVal}
      winPercentage={winPercentage}
      userPercentage={contestUserPct}
      medianPercentage={contestMedianPct}
      isAboveMedian={contestIsAboveMedian}
      size="mobile"
      winCondition={contestItem.winCondition || 'median'}
      opponentName={contestItem.opponentName}
      opponentScore={contestItem.opponentScore}
      isInLeague={false}
      isInContest={true}
      noDataYet={!contestItem.contestMedian && !contestItem.opponentScore}
      contestName={contestItem.contestName}
      contestEntrantCount={contestItem.entrantCount}
      contestMaxEntries={contestItem.maxEntries}
      contestMedianScore={contestItem.contestMedian}
      contestRank={contestItem.contestRank}
      contestWeek={contestItem.eligibleWeek}
      onContestClick={onContestClick}
      lineupReady={lineupReady}
    />
  );
});

MemoizedContestBanner.propTypes = {
  contestItem: PropTypes.object.isRequired,
  userScore: PropTypes.number,
  fallbackMedian: PropTypes.number,
  winPercentage: PropTypes.number,
  displayWeek: PropTypes.object,
  isLive: PropTypes.bool,
  isFinal: PropTypes.bool,
  lineupReady: PropTypes.bool,
  onContestClick: PropTypes.func
};

/**
 * ContestBannerCarousel
 * 
 * A smooth, native-feeling swipeable carousel specifically for contest banners.
 * Uses CSS transforms with hardware acceleration and proper touch handling.
 */
function ContestBannerCarousel({
  contests,
  selectedIndex = 0,
  onIndexChange,
  userScore,
  fallbackMedian,
  winPercentage,
  displayWeek,
  isLive,
  isFinal,
  lineupReady,
  onContestClick
}) {
  const containerRef = useRef(null);
  const trackRef = useRef(null);
  
  // Use a single ref object for all touch state to avoid closures issues
  const stateRef = useRef({
    isActive: false,
    startX: 0,
    startY: 0,
    currentOffset: 0,
    startOffset: 0,
    velocity: 0,
    lastX: 0,
    lastTime: 0,
    isHorizontal: null,
    containerWidth: 0
  });
  
  // Visual offset state - only this triggers re-renders
  const [translateX, setTranslateX] = useState(() => -selectedIndex * 100);
  const [isDragging, setIsDragging] = useState(false);
  
  // Update translate when selectedIndex changes externally
  useEffect(() => {
    if (!stateRef.current.isActive) {
      setTranslateX(-selectedIndex * 100);
    }
  }, [selectedIndex]);
  
  // Get container width
  const getWidth = useCallback(() => {
    return containerRef.current?.offsetWidth || 300;
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (contests.length <= 1) return;
    
    const touch = e.touches[0];
    const state = stateRef.current;
    const width = getWidth();
    
    state.isActive = true;
    state.startX = touch.clientX;
    state.startY = touch.clientY;
    state.lastX = touch.clientX;
    state.lastTime = performance.now();
    state.velocity = 0;
    state.isHorizontal = null;
    state.containerWidth = width;
    state.startOffset = -selectedIndex * width;
    state.currentOffset = state.startOffset;
    
    setIsDragging(true);
  }, [contests.length, selectedIndex, getWidth]);

  const handleTouchMove = useCallback((e) => {
    const state = stateRef.current;
    if (!state.isActive || contests.length <= 1) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - state.startX;
    const deltaY = touch.clientY - state.startY;
    
    // Determine direction on first significant movement
    if (state.isHorizontal === null) {
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        state.isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
        if (!state.isHorizontal) {
          state.isActive = false;
          setIsDragging(false);
          return;
        }
      } else {
        return;
      }
    }
    
    if (e.cancelable) {
      e.preventDefault();
    }
    
    // Update velocity
    const now = performance.now();
    const dt = now - state.lastTime;
    if (dt > 0) {
      const instantV = (touch.clientX - state.lastX) / dt;
      state.velocity = state.velocity * 0.6 + instantV * 0.4;
    }
    state.lastX = touch.clientX;
    state.lastTime = now;
    
    // Calculate offset with edge resistance
    let newOffset = state.startOffset + deltaX;
    const minOffset = -(contests.length - 1) * state.containerWidth;
    const maxOffset = 0;
    
    if (newOffset > maxOffset) {
      newOffset = maxOffset + (newOffset - maxOffset) * 0.2;
    } else if (newOffset < minOffset) {
      newOffset = minOffset + (newOffset - minOffset) * 0.2;
    }
    
    state.currentOffset = newOffset;
    
    // Convert to percentage for transform
    const pct = (newOffset / state.containerWidth) * 100;
    setTranslateX(pct);
  }, [contests.length]);

  const handleTouchEnd = useCallback(() => {
    const state = stateRef.current;
    if (!state.isActive) return;
    
    state.isActive = false;
    setIsDragging(false);
    
    if (state.isHorizontal === false || state.isHorizontal === null) {
      return;
    }
    
    const velocity = state.velocity;
    const currentOffset = state.currentOffset;
    const width = state.containerWidth;
    
    // Determine target based on position and velocity
    const progress = -currentOffset / width;
    let targetIndex;
    
    if (Math.abs(velocity) > 0.25) {
      targetIndex = velocity < 0 ? Math.ceil(progress) : Math.floor(progress);
    } else {
      targetIndex = Math.round(progress);
    }
    
    targetIndex = Math.max(0, Math.min(targetIndex, contests.length - 1));
    
    // Animate to target
    setTranslateX(-targetIndex * 100);
    
    if (targetIndex !== selectedIndex && onIndexChange) {
      onIndexChange(targetIndex);
    }
  }, [contests.length, selectedIndex, onIndexChange]);

  const goToIndex = useCallback((index) => {
    const clamped = Math.max(0, Math.min(index, contests.length - 1));
    setTranslateX(-clamped * 100);
    if (clamped !== selectedIndex && onIndexChange) {
      onIndexChange(clamped);
    }
  }, [contests.length, selectedIndex, onIndexChange]);

  // Memoize the banners array to prevent recreation
  const banners = useMemo(() => {
    return contests.map((contestItem, index) => (
      <div 
        key={contestItem.id || index} 
        className="w-full flex-shrink-0 px-0.5"
        style={{ backfaceVisibility: 'hidden' }}
      >
        <MemoizedContestBanner
          contestItem={contestItem}
          userScore={userScore}
          fallbackMedian={fallbackMedian}
          winPercentage={winPercentage}
          displayWeek={displayWeek}
          isLive={isLive}
          isFinal={isFinal}
          lineupReady={lineupReady}
          onContestClick={onContestClick}
        />
      </div>
    ));
  }, [contests, userScore, fallbackMedian, winPercentage, displayWeek, isLive, isFinal, lineupReady, onContestClick]);

  if (!contests || contests.length === 0) {
    return null;
  }

  if (contests.length === 1) {
    return banners[0];
  }

  return (
    <div className="relative">
      {/* Carousel track */}
      <div
        ref={containerRef}
        className="overflow-hidden"
        style={{ touchAction: 'pan-y' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div
          ref={trackRef}
          className="flex"
          style={{
            transform: `translate3d(${translateX}%, 0, 0)`,
            transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            willChange: 'transform'
          }}
        >
          {banners}
        </div>
      </div>

      {/* Pagination dots */}
      <div className="flex justify-center items-center gap-2 mt-3">
        {contests.map((_, index) => (
          <button
            key={index}
            onClick={() => goToIndex(index)}
            aria-label={`Contest ${index + 1} of ${contests.length}`}
            className={`
              rounded-full transition-all duration-200
              ${index === selectedIndex 
                ? 'w-6 h-2 bg-primary-green-500' 
                : 'w-2 h-2 bg-primary-black-600 active:bg-primary-black-400'
              }
            `}
          />
        ))}
      </div>
    </div>
  );
}

ContestBannerCarousel.propTypes = {
  contests: PropTypes.array.isRequired,
  selectedIndex: PropTypes.number,
  onIndexChange: PropTypes.func,
  userScore: PropTypes.number,
  fallbackMedian: PropTypes.number,
  winPercentage: PropTypes.number,
  displayWeek: PropTypes.object,
  isLive: PropTypes.bool,
  isFinal: PropTypes.bool,
  lineupReady: PropTypes.bool,
  onContestClick: PropTypes.func
};

export default memo(ContestBannerCarousel);
