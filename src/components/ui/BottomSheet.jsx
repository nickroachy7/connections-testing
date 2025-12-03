import { useEffect, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * BottomSheet - Canonical mobile bottom sheet modal component
 * 
 * Base component for all mobile-optimized modals that slide up from bottom.
 * Handles: escape key, body scroll lock, backdrop click, swipe to dismiss
 * 
 * IMPORTANT: The footer (cancel button) should be passed as a separate prop,
 * not included in children, so it stays fixed at the bottom.
 * 
 * Used by: PlayerSwapModal, BenchPlayerSwapModal, TokenSelectionModal, etc.
 */
export default function BottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxHeight = '85vh',
  showDragHandle = true,
  className = ''
}) {
  const sheetRef = useRef(null);
  const contentRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartY = useRef(0);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;

    // Store original styles
    const scrollY = window.scrollY;

    // Lock body scroll
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    return () => {
      // Restore body scroll
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  // Handle drag start
  const handleDragStart = useCallback((e) => {
    const touch = e.touches?.[0] || e;
    const contentScrollTop = contentRef.current?.scrollTop || 0;
    
    // If content is scrolled, don't start drag
    if (contentScrollTop > 5) return;
    
    setIsDragging(true);
    dragStartY.current = touch.clientY;
  }, []);

  // Handle drag move
  const handleDragMove = useCallback((e) => {
    if (!isDragging) return;
    
    const touch = e.touches?.[0] || e;
    const deltaY = touch.clientY - dragStartY.current;
    
    // Only allow dragging down
    if (deltaY > 0) {
      setDragOffset(deltaY);
    }
  }, [isDragging]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // If dragged more than 100px down, close the modal
    if (dragOffset > 100) {
      onClose();
    }
    
    setDragOffset(0);
  }, [isDragging, dragOffset, onClose]);

  // Add touch event listeners
  useEffect(() => {
    if (!isOpen) return;

    const sheet = sheetRef.current;
    if (!sheet) return;

    const options = { passive: true };
    sheet.addEventListener('touchmove', handleDragMove, options);
    sheet.addEventListener('touchend', handleDragEnd);
    sheet.addEventListener('touchcancel', handleDragEnd);

    return () => {
      sheet.removeEventListener('touchmove', handleDragMove);
      sheet.removeEventListener('touchend', handleDragEnd);
      sheet.removeEventListener('touchcancel', handleDragEnd);
    };
  }, [isOpen, handleDragMove, handleDragEnd]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        style={{ opacity: isDragging ? 0.5 : 1 }}
      />
      
      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`
          relative w-full bg-primary-black-900 rounded-t-2xl
          shadow-2xl border-t border-primary-black-700
          flex flex-col
          ${!isDragging ? 'transition-transform duration-200' : ''}
          ${className}
        `}
        style={{ 
          maxHeight,
          transform: `translateY(${dragOffset}px)`,
        }}
      >
        {/* Drag Handle - touchable area for swipe */}
        {showDragHandle && (
          <div 
            className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
            onTouchStart={handleDragStart}
            onMouseDown={handleDragStart}
          >
            <div className="w-12 h-1.5 bg-primary-black-600 rounded-full" />
          </div>
        )}
        
        {/* Header */}
        {(title || subtitle) && (
          <div className="px-4 pb-3 text-center border-b border-primary-black-800 flex-shrink-0">
            {title && (
              <h2 className="text-lg font-bold text-white">{title}</h2>
            )}
            {subtitle && (
              <p className="text-sm text-primary-black-400 mt-0.5">{subtitle}</p>
            )}
          </div>
        )}
        
        {/* Scrollable Content */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ 
            maxHeight: footer ? `calc(${maxHeight} - 180px)` : `calc(${maxHeight} - 100px)`,
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {children}
        </div>

        {/* Fixed Footer */}
        {footer && (
          <div className="flex-shrink-0 border-t border-primary-black-800 bg-primary-black-900">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

BottomSheet.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  children: PropTypes.node,
  footer: PropTypes.node,
  maxHeight: PropTypes.string,
  showDragHandle: PropTypes.bool,
  className: PropTypes.string
};
<<<<<<< HEAD

// Add keyframe animation via style tag
if (typeof document !== 'undefined' && !document.querySelector('#bottom-sheet-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'bottom-sheet-styles';
  styleSheet.textContent = `
    @keyframes slide-up {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(styleSheet);
}
=======
>>>>>>> f6c88b534f0bed3c7c3ec8bf1961173fb66944f5
