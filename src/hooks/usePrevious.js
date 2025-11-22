/**
 * Custom hook for managing previous value
 * 
 * Tracks the previous value of a state or prop
 */

import { useEffect, useRef } from 'react';

/**
 * Hook to get the previous value of a variable
 * @param {any} value - Current value
 * @returns {any} Previous value
 */
export function usePrevious(value) {
  const ref = useRef();
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}

/**
 * Hook to detect if a value has changed
 * @param {any} value - Value to track
 * @returns {boolean} True if value changed since last render
 */
export function useHasChanged(value) {
  const prevValue = usePrevious(value);
  return prevValue !== value;
}

/**
 * Hook to track multiple previous values
 * @param {any} value - Current value
 * @param {number} count - Number of previous values to track
 * @returns {Array} Array of previous values
 */
export function usePreviousValues(value, count = 5) {
  const ref = useRef([]);
  
  useEffect(() => {
    ref.current = [value, ...ref.current].slice(0, count);
  }, [value, count]);
  
  return ref.current;
}
