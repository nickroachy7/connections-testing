import PropTypes from 'prop-types';
import { getTokenRarityColor, getRarityTextColor } from './tableHelpers.jsx';

/**
 * TokenTable - Unified token table component with consistent grid layout
 * 
 * This ensures all token tables across the app have identical:
 * - Column widths and alignment
 * - Header styling
 * - Row styling and hover states
 * - Grid structure
 * 
 * Customization happens through:
 * - showBulkSelect: adds checkbox column
 * - renderExtraColumns: inject custom columns
 * - onRowClick, onRowDrag: custom interactions
 */

const TokenTable = ({
  tokens = [],
  // Visual options
  showBulkSelect = false,
  
  // Custom column rendering
  renderExtraHeaderColumns = null,
  renderExtraRowColumns = null,
  
  // Interaction handlers
  onBulkSelectChange = null,
  selectedIds = [],
  onRowClick = null,
  onRowDragStart = null,
  onRowDragEnd = null,
  
  // Row customization
  getRowClassName = null,
  
  // Empty state
  emptyMessage = "No tokens found",
  emptyIcon = "💎"
}) => {
  // Grid template for token table - ALIGNED WITH PLAYER TABLE
  const getGridTemplate = () => {
    let columns = [];
    
    // Checkbox column (conditional)
    if (showBulkSelect) {
      columns.push('24px'); // Checkbox
    } else {
      columns.push('24px'); // Empty/drag handle
    }
    
    // Core columns - Better left space utilization, middle section unchanged
    columns.push(
      '60px',   // Type badge
      '60px',   // Icon
      '220px',  // Token name (reduced to shift middle section left)
      '20px',   // Divider 1 (spacer)
      '80px',   // Pull %
      '80px',   // Sell
      '80px',   // Tier
      '20px',   // Divider 2 (spacer)
      '1fr',    // Description (flexible, takes remaining space)
      '100px'   // Bonus (aligned)
    );
    
    return columns.join(' ');
  };

  const gridTemplate = getGridTemplate();

  if (tokens.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-center">
        <div>
          <div className="text-4xl mb-2 opacity-30">{emptyIcon}</div>
          <p className="text-primary-black-400 font-semibold">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-xl overflow-hidden relative w-full">
      {/* Vertical Divider Lines - Continuous from top to bottom - ALIGNED WITH PLAYER TABLE */}
      <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: 'calc(24px + 60px + 60px + 220px + 8px * 3 + 20px)' }}>
        <div className="h-full border-r border-primary-black-600"></div>
      </div>
      <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: 'calc(24px + 60px + 60px + 220px + 20px + 80px + 80px + 80px + 8px * 6 + 20px)' }}>
        <div className="h-full border-r border-primary-black-600"></div>
      </div>

      {/* Header Row */}
      <div 
        className="grid bg-primary-black-800 border-b border-primary-black-700 py-3 px-2"
        style={{ 
          gridTemplateColumns: gridTemplate,
          gap: '8px'
        }}
      >
        {/* Checkbox or Empty column */}
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center">
          {showBulkSelect && '☐'}
        </span>
        
        {/* Core headers */}
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center">TYPE</span>
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center"></span>
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider">TOKEN</span>
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider invisible"></span>
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center">PULL %</span>
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center">SELL</span>
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center">TIER</span>
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider invisible"></span>
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider">DESCRIPTION</span>
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center">BONUS</span>
        
        {/* Custom headers */}
        {renderExtraHeaderColumns && renderExtraHeaderColumns()}
      </div>

      {/* Token Rows */}
      {tokens.map((token, index) => {
        const defaultClassName = `
          grid py-3 px-2 transition-all border-l-4 border-transparent
          cursor-move hover:bg-primary-green-500/10 hover:border-primary-green-500
          ${index % 2 === 0 ? 'bg-primary-black-900' : 'bg-primary-black-800/50'}
        `;

        const customClassName = getRowClassName ? getRowClassName(token, index) : defaultClassName;

        const handleDragStart = (e) => {
          if (onRowDragStart) {
            onRowDragStart(e, token);
          }
        };

        const handleClick = () => {
          if (onRowClick) {
            onRowClick(token);
          }
        };

        const isSelected = selectedIds.includes(token.id);

        return (
          <div
            key={token.id}
            draggable={true}
            onDragStart={handleDragStart}
            onDragEnd={onRowDragEnd}
            onClick={handleClick}
            className={customClassName}
            style={{ 
              gridTemplateColumns: gridTemplate,
              gap: '8px',
              alignItems: 'center'
            }}
          >
            {/* COLUMN 1: Checkbox or Drag Handle */}
            <div className="flex items-center justify-center">
              {showBulkSelect ? (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    if (onBulkSelectChange) {
                      onBulkSelectChange(token, e.target.checked);
                    }
                  }}
                  className="w-4 h-4 cursor-pointer"
                />
              ) : (
                <span className="text-primary-black-600 text-sm">⋮⋮</span>
              )}
            </div>
            
            {/* COLUMN 2: Type Badge */}
            <div className="flex items-center justify-center">
              <span className="px-2 py-1 bg-primary-black-700 text-primary-black-300 rounded text-xs font-semibold text-center">
                TK
              </span>
            </div>

            {/* COLUMN 3: Token Icon */}
            <div className={`rounded-md flex items-center justify-center text-2xl bg-gradient-to-br ${getTokenRarityColor(token.token_card.rarity)} w-10 h-10`}>
              💎
            </div>

            {/* COLUMN 4: Token Name & Type */}
            <div className="min-w-0">
              <h4 className="font-bold text-primary-black-50 truncate text-sm">
                {token.token_card.token_name}
              </h4>
              <div className="text-xs text-primary-black-500 font-medium uppercase">
                {token.token_card.token_type}
              </div>
            </div>

            {/* COLUMN 5: Spacer (divider 1 is absolute positioned) */}
            <div></div>

            {/* COLUMN 6: Pull Percentage */}
            <div className="text-center">
              <span className="text-xs font-semibold text-primary-black-400">
                {token.token_card.pull_percentage ? `${token.token_card.pull_percentage.toFixed(1)}%` : '--'}
              </span>
            </div>

            {/* COLUMN 7: Sell Value */}
            <div className="text-center">
              <span className="text-xs text-primary-black-300 font-semibold">
                💰 {token.sellValue || 0}
              </span>
            </div>

            {/* COLUMN 8: Tier */}
            <div className="flex items-center justify-center">
              <span className="text-xs text-primary-black-600">
                --
              </span>
            </div>

            {/* COLUMN 9: Spacer (divider 2 is absolute positioned) */}
            <div></div>
            
            {/* COLUMN 10: Description (280px - matches OPP+STATUS+PROJ width) */}
            <div className="min-w-0">
              <p className="text-xs text-primary-black-400">
                {token.token_card.description}
              </p>
            </div>

            {/* COLUMN 11: Bonus (120px - aligns with PlayerTable SCORE column) */}
            <div className="text-center">
              <span className="text-xs font-bold text-primary-green-400">
                +{token.token_card.bonus_points}
              </span>
            </div>

            {/* Custom columns */}
            {renderExtraRowColumns && renderExtraRowColumns(token, index)}
          </div>
        );
      })}
    </div>
  );
};

TokenTable.propTypes = {
  tokens: PropTypes.array.isRequired,
  showBulkSelect: PropTypes.bool,
  renderExtraHeaderColumns: PropTypes.func,
  renderExtraRowColumns: PropTypes.func,
  onBulkSelectChange: PropTypes.func,
  selectedIds: PropTypes.array,
  onRowClick: PropTypes.func,
  onRowDragStart: PropTypes.func,
  onRowDragEnd: PropTypes.func,
  getRowClassName: PropTypes.func,
  emptyMessage: PropTypes.string,
  emptyIcon: PropTypes.string
};

export default TokenTable;
