import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * SwipeableCarousel Component
 * 
 * Horizontal swipeable container with native-feeling physics.
 * Uses spring animations and momentum-based scrolling for smooth UX.
 */
export default function SwipeableCarousel({
  items,
  selectedIndex = 0,
  onIndexChange,
  renderItem,
  showDots = true,
  className = '',
  dotClassName = '',
  disabled = false
}) {
  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const animationRef = useRef(null);
  
  // Touch/drag state refs (using refs to avoid re-renders during gestures)
  const touchStateRef = useRef({
    isActive: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
    isHorizontal: null, // null = undetermined, true = horizontal, false = vertical
    startIndex: 0
  });
  
  // Current visual offset in pixels (for smooth animations)
  const [offset, setOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Get container width for calculations
  const getContainerWidth = useCallback(() => {
    return containerRef.current?.offsetWidth || 300;
  }, []);
  
  // Calculate target offset for a given index
  const getTargetOffset = useCallback((index) => {
    return -index * getContainerWidth();
  }, [getContainerWidth]);

  // Spring animation parameters - tuned for natural feel
  const SPRING_CONFIG = useMemo(() => ({
    tension: 300,      // Spring stiffness (higher = snappier)
    friction: 26,      // Damping (higher = less bouncy)
    precision: 0.5     // Stop animating when within this threshold
  }), []);

  // Animate to target offset with spring physics
  const animateToOffset = useCallback((targetOffset, initialVelocity = 0) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    setIsAnimating(true);
    
    let currentOffset = offset;
    let velocity = initialVelocity * 0.15; // Scale velocity for spring
    let lastTime = performance.now();
    
    const animate = (currentTime) => {
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.064); // Cap at ~15fps minimum
      lastTime = currentTime;
      
      // Spring physics: F = -kx - cv
      const displacement = currentOffset - targetOffset;
      const springForce = -SPRING_CONFIG.tension * displacement;
      const dampingForce = -SPRING_CONFIG.friction * velocity;
      const acceleration = springForce + dampingForce;
      
      velocity += acceleration * deltaTime;
      currentOffset += velocity * deltaTime * 1000;
      
      setOffset(currentOffset);
      
      // Check if animation is complete
      const isSettled = 
        Math.abs(displacement) < SPRING_CONFIG.precision && 
        Math.abs(velocity) < 0.01;
      
      if (isSettled) {
        setOffset(targetOffset);
        setIsAnimating(false);
        animationRef.current = null;
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [offset, SPRING_CONFIG]);

  // Handle index change and animate to new position
  useEffect(() => {
    const targetOffset = getTargetOffset(selectedIndex);
    
    // Only animate if we're not currently dragging
    if (!touchStateRef.current.isActive) {
      animateToOffset(targetOffset, 0);
    }
  }, [selectedIndex, getTargetOffset, animateToOffset]);

  // Update offset immediately when container resizes
  useEffect(() => {
    const handleResize = () => {
      if (!touchStateRef.current.isActive && !isAnimating) {
        setOffset(getTargetOffset(selectedIndex));
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedIndex, getTargetOffset, isAnimating]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (disabled || items.length <= 1) return;
    
    // Cancel any running animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsAnimating(false);
    
    const touch = e.touches ? e.touches[0] : e;
    const state = touchStateRef.current;
    
    state.isActive = true;
    state.startX = touch.clientX;
    state.startY = touch.clientY;
    state.currentX = touch.clientX;
    state.lastX = touch.clientX;
    state.lastTime = performance.now();
    state.velocity = 0;
    state.isHorizontal = null;
    state.startIndex = selectedIndex;
  }, [disabled, items.length, selectedIndex]);

  const handleTouchMove = useCallback((e) => {
    const state = touchStateRef.current;
    if (!state.isActive || disabled || items.length <= 1) return;
    
    const touch = e.touches ? e.touches[0] : e;
    const deltaX = touch.clientX - state.startX;
    const deltaY = touch.clientY - state.startY;
    
    // Determine scroll direction on first significant movement
    if (state.isHorizontal === null) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      if (absX > 8 || absY > 8) {
        state.isHorizontal = absX > absY;
        
        // If vertical scroll, abort and let browser handle it
        if (!state.isHorizontal) {
          state.isActive = false;
          return;
        }
      } else {
        return; // Wait for more movement
      }
    }
    
    // Prevent default scrolling for horizontal swipes
    if (state.isHorizontal && e.cancelable) {
      e.preventDefault();
    }
    
    // Calculate velocity (pixels per millisecond)
    const now = performance.now();
    const timeDelta = now - state.lastTime;
    if (timeDelta > 0) {
      // Smooth velocity with exponential moving average
      const instantVelocity = (touch.clientX - state.lastX) / timeDelta;
      state.velocity = state.velocity * 0.7 + instantVelocity * 0.3;
    }
    state.lastX = touch.clientX;
    state.lastTime = now;
    state.currentX = touch.clientX;
    
    // Calculate new offset with rubber-band effect at edges
    const containerWidth = getContainerWidth();
    const baseOffset = getTargetOffset(state.startIndex);
    let newOffset = baseOffset + deltaX;
    
    // Rubber-band resistance at edges
    const minOffset = getTargetOffset(items.length - 1);
    const maxOffset = 0;
    
    if (newOffset > maxOffset) {
      // Past first item - apply resistance
      const overscroll = newOffset - maxOffset;
      newOffset = maxOffset + overscroll * 0.25;
    } else if (newOffset < minOffset) {
      // Past last item - apply resistance  
      const overscroll = minOffset - newOffset;
      newOffset = minOffset - overscroll * 0.25;
    }
    
    setOffset(newOffset);
  }, [disabled, items.length, getContainerWidth, getTargetOffset]);

  const handleTouchEnd = useCallback(() => {
    const state = touchStateRef.current;
    if (!state.isActive) return;
    
    state.isActive = false;
    
    if (state.isHorizontal === false || state.isHorizontal === null) {
      // Was vertical scroll or no significant movement
      return;
    }
    
    const containerWidth = getContainerWidth();
    const velocity = state.velocity; // pixels per millisecond
    const currentOffset = offset;
    
    // Determine target index based on position and velocity
    // Velocity threshold: 0.3 px/ms is a comfortable flick speed
    const velocityThreshold = 0.3;
    const positionProgress = -currentOffset / containerWidth;
    
    let targetIndex;
    
    if (Math.abs(velocity) > velocityThreshold) {
      // Use velocity to determine direction
      if (velocity < 0) {
        // Swiping left -> go to next
        targetIndex = Math.ceil(positionProgress);
      } else {
        // Swiping right -> go to previous
        targetIndex = Math.floor(positionProgress);
      }
    } else {
      // Use position (snap to nearest)
      targetIndex = Math.round(positionProgress);
    }
    
    // Clamp to valid range
    targetIndex = Math.max(0, Math.min(targetIndex, items.length - 1));
    
    // Calculate target offset and animate with momentum
    const targetOffset = getTargetOffset(targetIndex);
    
    // Update selected index if changed
    if (targetIndex !== selectedIndex && onIndexChange) {
      onIndexChange(targetIndex);
    }
    
    // Animate to final position with spring physics
    // Pass velocity for momentum continuation
    animateToOffset(targetOffset, velocity * 1000);
  }, [offset, getContainerWidth, getTargetOffset, items.length, selectedIndex, onIndexChange, animateToOffset]);

  // Mouse event handlers for desktop testing
  const handleMouseDown = useCallback((e) => {
    if (disabled || items.length <= 1) return;
    e.preventDefault();
    handleTouchStart(e);
    
    const handleMouseMove = (e) => handleTouchMove(e);
    const handleMouseUp = () => {
      handleTouchEnd();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [disabled, items.length, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const goToIndex = useCallback((index) => {
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
    if (clampedIndex !== selectedIndex && onIndexChange) {
      onIndexChange(clampedIndex);
    }
  }, [items.length, selectedIndex, onIndexChange]);

  if (!items || items.length === 0) {
    return null;
  }

  // Single item - no swipe needed
  if (items.length === 1) {
    return (
      <div className={className}>
        {renderItem(items[0], 0, true)}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Carousel Container */}
      <div
        ref={containerRef}
        className="overflow-hidden"
        style={{ touchAction: 'pan-y pinch-zoom' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <div
          ref={trackRef}
          className="flex will-change-transform"
          style={{
            transform: `translate3d(${offset}px, 0, 0)`,
          }}
        >
          {items.map((item, index) => (
            <div
              key={item.id || index}
              className="w-full flex-shrink-0"
              style={{ backfaceVisibility: 'hidden' }}
            >
              {renderItem(item, index, index === selectedIndex)}
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Dots */}
      {showDots && items.length > 1 && (
        <div className={`flex justify-center items-center gap-2 mt-3 ${dotClassName}`}>
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goToIndex(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`
                rounded-full transition-all duration-200 ease-out
                ${index === selectedIndex 
                  ? 'w-6 h-2 bg-primary-green-500' 
                  : 'w-2 h-2 bg-primary-black-600 hover:bg-primary-black-500 active:bg-primary-black-400'
                }
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
}

SwipeableCarousel.propTypes = {
  items: PropTypes.array.isRequired,
  selectedIndex: PropTypes.number,
  onIndexChange: PropTypes.func,
  renderItem: PropTypes.func.isRequired,
  showDots: PropTypes.bool,
  className: PropTypes.string,
  dotClassName: PropTypes.string,
  disabled: PropTypes.bool
};
