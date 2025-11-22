/**
 * Custom hook for detecting clicks outside an element
 * 
 * Useful for modals, dropdowns, and popovers
 */

import { useEffect, useRef } from 'react';

/**
 * Hook to detect clicks outside of a ref element
 * @param {Function} handler - Callback when click outside occurs
 * @param {boolean} enabled - Whether the hook is enabled
 * @returns {Object} Ref to attach to the element
 */
export function useClickOutside(handler, enabled = true) {
  const ref = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        handler(event);
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [handler, enabled]);

  return ref;
}

/**
 * Hook to detect Escape key press
 * @param {Function} handler - Callback when Escape is pressed
 * @param {boolean} enabled - Whether the hook is enabled
 */
export function useEscapeKey(handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        handler(event);
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [handler, enabled]);
}
