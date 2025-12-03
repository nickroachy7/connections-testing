import PropTypes from 'prop-types';

/**
 * PageHeader Component
 * 
 * Compact, single-row header for all pages. Ensures visual consistency.
 * 
 * Layout: Title [Subtitle?] -------- [Actions]
 * 
 * Design:
 * - Single row, compact height
 * - Transparent background
 * - Title: text-sm font-semibold text-white
 * - Subtitle: text-xs text-muted, inline with title
 */
export default function PageHeader({ 
  title, 
  subtitle, 
  actions,
  className = ''
}) {
  return (
    <div className={`bg-transparent flex items-center justify-between py-2 px-3 sm:px-4 ${className}`}>
      {/* Left: Title + Subtitle */}
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold text-white">
          {title}
        </h1>
        {subtitle && (
          <span className="text-xs text-primary-black-400">
            {typeof subtitle === 'string' ? subtitle : subtitle}
          </span>
        )}
      </div>
      
      {/* Right: Actions */}
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.node,
  actions: PropTypes.node,
  className: PropTypes.string
};
