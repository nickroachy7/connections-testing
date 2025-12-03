import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';

/**
 * BottomSheet - Mobile-optimized modal that slides up from bottom
 * 
 * Features:
 * - Smooth slide-up animation
 * - Optional drag handle for mobile UX
 * - Backdrop dismiss
 * - Custom footer support
 * - Configurable max height
 * 
 * @component
 */
function BottomSheet({ 
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

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-40 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`
          fixed bottom-0 left-0 right-0 z-50
          bg-primary-black-800 
          rounded-t-2xl
          shadow-2xl
          animate-slide-up
          ${className}
        `}
        style={{ maxHeight }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'bottom-sheet-title' : undefined}
      >
        {/* Drag Handle (optional) */}
        {showDragHandle && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-primary-black-600 rounded-full" />
          </div>
        )}

        {/* Header */}
        {(title || subtitle) && (
          <div className="flex items-start justify-between px-4 py-3 border-b border-primary-black-700">
            <div className="flex-1">
              {title && (
                <h3 
                  id="bottom-sheet-title"
                  className="text-lg font-bold text-white"
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-primary-black-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="
                ml-4 p-1.5 rounded-lg
                text-primary-black-400 hover:text-white
                hover:bg-primary-black-700
                transition-colors
              "
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto px-4 py-4">
          {children}
        </div>

        {/* Footer (optional) */}
        {footer && (
          <div className="border-t border-primary-black-700 px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </>
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

export default BottomSheet;