import { useState, useEffect } from 'react';

/**
 * useMediaQuery Hook
 * 
 * Listens to a media query and returns whether it matches.
 * Useful for responsive behavior based on screen size.
 * 
 * @param {string} query - CSS media query string (e.g., '(max-width: 768px)')
 * @returns {boolean} - Whether the media query matches
 * 
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)');
 * const isDesktop = useMediaQuery('(min-width: 1024px)');
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    // Initial value - check if window exists (SSR safety)
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    // Create media query list
    const mediaQuery = window.matchMedia(query);
    
    // Update state
    const updateMatches = (e) => {
      setMatches(e.matches);
    };

    // Set initial value
    setMatches(mediaQuery.matches);

    // Listen for changes
    // Use addEventListener for modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateMatches);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(updateMatches);
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', updateMatches);
      } else {
        mediaQuery.removeListener(updateMatches);
      }
    };
  }, [query]);

  return matches;
}

/**
 * Convenience hook for mobile detection
 * Uses Tailwind's md breakpoint (768px)
 */
export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)');
}

/**
 * Convenience hook for tablet detection
 * Between md (768px) and lg (1024px)
 */
export function useIsTablet() {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

/**
 * Convenience hook for desktop detection
 * lg breakpoint and above (1024px+)
 */
export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)');
}
