import PropTypes from 'prop-types';

/**
 * SectionHeader Component
 * 
 * Consistent styling for sub-section headers within a page.
 * Use this for sections like "Bench", "Tokens", "Players" within a larger page.
 * 
 * HIERARCHY:
 * - PageHeader: Top-level page title (e.g., "Inventory", "Starting Lineup")
 * - SectionHeader: Sub-sections within a page (e.g., "Bench (5)", "Tokens (6)")
 * 
 * Design principles:
 * - Smaller than PageHeader
 * - Optional count badge
 * - Optional right-side actions
 * - Consistent padding with list items below
 */
export default function SectionHeader({ 
  title, 
  count = null,
  actions = null,
  className = ''
}) {
  return (
    <div className={`flex items-center justify-between px-2 sm:px-4 py-2 ${className}`}>
      {/* Left: Title with optional count */}
      <h3 className="text-sm font-semibold text-primary-black-200 flex items-center gap-2">
        {title}
        {count !== null && (
          <span className="text-xs font-medium text-primary-black-400 bg-primary-black-800 px-1.5 py-0.5 rounded">
            {count}
          </span>
        )}
      </h3>
      
      {/* Right: Optional actions */}
      {actions && (
        <div className="flex items-center gap-2">
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
