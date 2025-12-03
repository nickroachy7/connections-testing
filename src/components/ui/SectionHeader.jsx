import PropTypes from 'prop-types';

/**
 * SectionHeader Component
 * 
 * Sub-section header for dividing content within a page.
 * Use for sections like "Bench", "Tokens", "Players" within a larger page.
 * 
 * HIERARCHY:
 * - PageHeader: Top-level page title (one per page)
 * - SectionHeader: Sub-sections within pages (multiple per page)
 * 
 * Design:
 * - Transparent background (page color shows through)
 * - Smaller text than PageHeader
 * - Optional count displayed inline (not as badge)
 * - Optional right-side actions
 * - Consistent horizontal padding with content below
 */
export default function SectionHeader({ 
  title, 
  count = null,
  actions = null,
  className = ''
}) {
  return (
    <div className={`bg-transparent flex items-center justify-between px-2 sm:px-4 py-1.5 ${className}`}>
      {/* Left: Title with optional count */}
      <h3 className="text-xs font-medium text-primary-black-400 flex items-center gap-1.5">
        {title}
        {count !== null && (
          <span className="text-xs font-normal text-primary-black-500">
            {count}
          </span>
        )}
      </h3>
      
      {/* Right: Optional actions */}
      {actions && (
        <div className="flex items-center gap-1.5">
          {actions}
        </div>
      )}
    </div>
  );
}

SectionHeader.propTypes = {
  title: PropTypes.string.isRequired,
  count: PropTypes.number,
  actions: PropTypes.node,
  className: PropTypes.string
};
