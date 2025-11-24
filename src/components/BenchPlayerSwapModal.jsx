import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { getTierBadgeInfo } from './tables/tableHelpers.jsx';

/**
 * BenchPlayerSwapModal Component
 * 
 * Unified modal for player-slot interactions on mobile.
 * Handles two scenarios:
 * 1. Bench player selected → shows eligible lineup slots to add to
 * 2. Empty lineup slot selected → shows available bench players to add
 * 
 * Features:
 * - Shows selected player/slot at top
 * - Lists eligible options below
 * - Clear distinction between empty slots and swap scenarios
 * - Mobile-optimized bottom sheet
 */
export default function BenchPlayerSwapModal({
  benchPlayer,
  eligibleSlots,
  lineup,
  onSwap,
  onClose,
  liveGameData,
  projections,
  // New props for reverse mode (empty slot → select bench player)
  mode = 'bench-to-lineup', // 'bench-to-lineup' or 'slot-to-bench'
  targetSlot = null,
  availablePlayers = []
}) {
  const modalRef = useRef(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll and pointer events when modal is open
  useEffect(() => {
    const mainContent = document.querySelector('main') || document.body;
    
    document.body.style.overflow = 'hidden';
    mainContent.style.pointerEvents = 'none';
    
    return () => {
      document.body.style.overflow = 'unset';
      mainContent.style.pointerEvents = 'auto';
    };
  }, []);

  // ... rest of file content ...