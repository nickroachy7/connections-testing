import PropTypes from 'prop-types';

/**
 * PageHeader Component
 * 
 * Consistent header design across all pages in the application.
 * Layout: 
 * - Left: Page name (large) + helpful info/status below (smaller)
 * - Right: Actions (filters, buttons, view toggles, etc.)
 * 
 * This component is isolated and won't affect the layout of other page components.
 */
export default function PageHeader({ 
  title, 
  subtitle, 
  actions,
  className = ''
}) {
  return (
    <div className={`mb-3 sm:mb-4 py-2 sm:py-4 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        {/* Left: Title and Subtitle */}
        <div className="min-w-0 flex-1">
          <h1 className="text-sm sm:text-xl font-bold text-primary-black-50 truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-primary-black-400 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
        
        {/* Right: Actions */}
        {actions && (
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.node,
  actions: PropTypes.node,
  className: PropTypes.string
};
