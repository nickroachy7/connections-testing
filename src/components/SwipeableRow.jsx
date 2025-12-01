import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * SwipeableRow Component
 * 
 * Wraps content in a swipeable container that reveals action buttons on swipe
 * Mobile-optimized for touch gestures
 */
export default function SwipeableRow({ 
  children, 
  onSell,
  sellValue,
  disabled = false,
  className = ''
}) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hasSwiped, setHasSwiped] = useState(false); // Track if user actually swiped
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const containerRef = useRef(null);
  const isHorizontalSwipeRef = useRef(false);

  const SWIPE_THRESHOLD = 80; // Minimum swipe distance to reveal button
  const MAX_SWIPE = 100; // Maximum swipe distance

  useEffect(() => {
    // Reset swipe when disabled changes
    if (disabled) {
      setSwipeOffset(0);
    }
  }, [disabled]);

  const handleTouchStart = (e) => {
    if (disabled) return;
    
    const touch = e.touches ? e.touches[0] : e;
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    currentXRef.current = swipeOffset;
    isHorizontalSwipeRef.current = false;
    // Only set dragging for touch events or when already swiped open
    // This allows mouse clicks to pass through without triggering drag state
    if (e.touches || swipeOffset > 0) {
      setIsDragging(true);
    }
    setHasSwiped(false); // Reset swipe flag
  };

  const handleTouchMove = (e) => {
    if (disabled) return;

    const touch = e.touches ? e.touches[0] : e;
    const deltaX = startXRef.current - touch.clientX;
    const deltaY = Math.abs(startYRef.current - touch.clientY);
    
    // Start dragging if user has moved enough (prevents accidental drags on clicks)
    if (!isDragging && Math.abs(deltaX) > 5) {
      setIsDragging(true);
    }
    
    if (!isDragging) return;
    
    // Determine if this is a horizontal swipe
    if (!isHorizontalSwipeRef.current && Math.abs(deltaX) > 5) {
      isHorizontalSwipeRef.current = Math.abs(deltaX) > deltaY;
    }
    
    // Only process horizontal swipes
    if (isHorizontalSwipeRef.current) {
      const newOffset = currentXRef.current + deltaX;
      
      // Only allow left swipe (positive offset)
      if (newOffset >= 0 && newOffset <= MAX_SWIPE) {
        setSwipeOffset(newOffset);
        setHasSwiped(true); // Mark that user has swiped
        // Prevent vertical scrolling during horizontal swipe
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (disabled) return;
    
    setIsDragging(false);
    isHorizontalSwipeRef.current = false;

    // Snap to either closed or open based on threshold
    if (swipeOffset > SWIPE_THRESHOLD / 2) {
      setSwipeOffset(SWIPE_THRESHOLD); // Snap to open
    } else {
      setSwipeOffset(0); // Snap to closed
      // If we're closing and didn't actually swipe, reset the flag
      if (!hasSwiped) {
        setHasSwiped(false);
      }
    }
  };

  const handleSellClick = (e) => {
    e.stopPropagation();
    if (onSell) {
      onSell();
    }
    // Close the swipe after action
    setSwipeOffset(0);
  };

  const handleBackgroundClick = (e) => {
    // Close swipe when tapping the background (only if user actually swiped)
    if (swipeOffset > 0) {
      e.stopPropagation();
      setSwipeOffset(0);
      return;
    }
    // If swipeOffset is 0 and user didn't swipe, allow click to propagate to children
    // This enables onClick on PlayerRow to work for opening the modal
  };

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onClick={handleBackgroundClick}
    >
      {/* Swipe hint indicator - subtle gradient on right edge */}
      {!disabled && swipeOffset === 0 && (
        <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-red-900/10 to-transparent" />
      )}
      
      {/* Action buttons background - revealed on swipe */}
      <div 
        className="absolute right-0 top-0 bottom-0 flex items-center justify-end"
        style={{ width: `${SWIPE_THRESHOLD}px` }}
      >
        <button
          onClick={handleSellClick}
          disabled={disabled}
          className="h-full px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-sm transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ width: `${SWIPE_THRESHOLD}px` }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <span className="text-[10px]">{sellValue}</span>
          </div>
        </button>
      </div>

      {/* Main content - slides left on swipe */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(-${swipeOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          WebkitTransform: `translateX(-${swipeOffset}px)`, // Safari support
        }}
        className="w-full touch-pan-y relative z-10 bg-primary-black-900"
      >
        {children}
      </div>
    </div>
  );
}

SwipeableRow.propTypes = {
  children: PropTypes.node.isRequired,
  onSell: PropTypes.func,
  sellValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  disabled: PropTypes.bool,
  className: PropTypes.string
};
