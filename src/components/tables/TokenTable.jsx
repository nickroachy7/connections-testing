import React from 'react';
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
  showAddButton = false,
  
  // Custom column rendering
  renderExtraHeaderColumns = null,
  renderExtraRowColumns = null,
  
  // Interaction handlers
  onBulkSelectChange = null,
  selectedIds = [],
  onRowClick = null,
  onRowDragStart = null,
  onRowDragEnd = null,
  onAddButtonClick = null,
  
  // Row customization
  getRowClassName = null,
  isRowLocked = null,
  selectedTokenId = null,
  
  // Empty state
  emptyMessage = "No tokens found",
  emptyIcon = "💎"
}) => {
  // Grid template for token table - ALIGNED WITH PLAYER TABLE
  const getGridTemplate = () => {
    let columns = [];
    
    // Checkbox/Add button column (conditional)
    if (showBulkSelect || showAddButton) {
      columns.push('24px'); // Checkbox or Add button
    } else {
      columns.push('24px'); // Empty/drag handle
    }
    
    // THREE SECTIONS:
    // 1. LEFT SECTION (always visible): Icon + Token Info
    // 2. MIDDLE SECTION (hidden md, shown lg+): Pull% + Sell (with borders as dividers)
    // 3. RIGHT SECTION (always visible): Bonus
    
    columns.push(
      '40px',   // Rarity badge (LEFT SECTION)
      '50px',   // Token icon (LEFT SECTION)
      '400px', // Token info (LEFT SECTION) - fixed width for perfect alignment
      // MIDDLE SECTION (borders serve as dividers)
      '90px',   // Pull % (fixed width for alignment)
      '90px',   // Sell (fixed width for alignment)
      // RIGHT SECTION (always visible)
      '80px'    // Bonus
    );
    
    return columns.join(' ');
  };

  // Mobile grid template - match BenchPlayerSwapModal exactly
  const getMobileGridTemplate = () => {
    let columns = [];
    
    // Mobile columns - exact match to swap modal dimensions
    columns.push(
      '32px',   // TK badge (matches position badge width)
      '40px',   // Token icon (matches player icon)
      '1fr',    // Token name & description (matches modal)
      '60px'    // Bonus (matches FPTS column)
    );
    
    return columns.join(' ');
  };

  const gridTemplate = getGridTemplate();
  const mobileGridTemplate = getMobileGridTemplate();

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
    <div className="overflow-hidden relative w-full">
      {/* Continuous vertical divider lines - absolute positioned to span full height - SAME position as PlayerTable */}
      <div className="absolute top-0 bottom-0 hidden lg:block pointer-events-none" style={{ left: 'calc(24px + 8px + 40px + 8px + 50px + 8px + 400px + 8px - 1px)', width: '1px', backgroundColor: 'rgb(64, 64, 64)' }}></div>
      <div className="absolute top-0 bottom-0 hidden lg:block pointer-events-none" style={{ left: 'calc(24px + 8px + 40px + 8px + 50px + 8px + 400px + 8px + 90px + 8px + 90px + 8px)', width: '1px', backgroundColor: 'rgb(64, 64, 64)' }}></div>

      {/* Header Row - Desktop */}
      <div 
        className="hidden md:grid bg-primary-black-800/30 border-b border-primary-black-700 py-2 px-2"
        style={{ 
          gridTemplateColumns: gridTemplate,
          gap: '8px'
        }}
      >
        {/* Checkbox or Empty column */}
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center">
          {/* Empty */}
        </span>
        
        {/* LEFT SECTION - always visible */}
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center">TK</span>
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center"></span>
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider">TOKEN</span>
        
        {/* MIDDLE SECTION - hidden on md, shown on lg (continuous borders via absolute divs) */}
        <span className="hidden lg:flex items-center justify-center text-[10px] font-bold text-primary-black-500 uppercase tracking-wider">PULL %</span>
        <span className="hidden lg:flex items-center justify-center text-[10px] font-bold text-primary-black-500 uppercase tracking-wider">SELL</span>
        
        {/* RIGHT SECTION - always visible */}
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center">BONUS</span>
        
        {/* Custom headers */}
        {renderExtraHeaderColumns && renderExtraHeaderColumns()}
      </div>

      {/* Mobile Header Row - REMOVED for cleaner look */}

      {/* Token Rows */}
      {tokens.map((token, index) => {
        const isLocked = isRowLocked ? isRowLocked(token) : false;
        const defaultClassName = `
          grid transition-all md:border-l-4 md:border-transparent min-h-[64px] md:min-h-[48px]
          ${
            isLocked
              ? 'cursor-not-allowed opacity-60'
              : 'cursor-move'
          }
          ${index % 2 === 0 ? 'bg-primary-black-800/20' : 'bg-primary-black-800/40'}
        `;

        const customClassName = getRowClassName ? getRowClassName(token, index) : defaultClassName;

        const handleDragStart = (e) => {
          if (isLocked) {
            e.preventDefault();
            return;
          }
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
          <React.Fragment key={token.id}>
            {/* Desktop Row - Compact */}
            <div
              draggable={!isLocked}
              onDragStart={handleDragStart}
              onDragEnd={onRowDragEnd}
              onClick={handleClick}
              className={`hidden md:grid items-center ${customClassName} py-2 px-2`}
              style={{
                gridTemplateColumns: gridTemplate,
                gap: '8px'
              }}
            >
            {/* COLUMN 1: Add Button, Checkbox, or Drag Handle */}
            <div className="flex items-center justify-center">
              {showAddButton ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onAddButtonClick && !isLocked) {
                      onAddButtonClick(token);
                    }
                  }}
                  disabled={isLocked}
                  className={`w-5 h-5 cursor-pointer rounded-full appearance-none border-2 transition-all flex items-center justify-center text-sm font-bold leading-none disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedTokenId === token.id
                      ? 'border-yellow-500 bg-yellow-500 text-white hover:border-yellow-400 hover:bg-yellow-400'
                      : 'border-primary-black-600 bg-primary-black-800 hover:border-primary-green-500 hover:bg-primary-green-500/20 text-primary-black-400 hover:text-primary-green-400'
                  }`}
                  title={selectedTokenId === token.id ? "Selected for application" : "Apply to player"}
                >
                  +
                </button>
              ) : showBulkSelect ? (
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      if (onBulkSelectChange) {
                        onBulkSelectChange(token, e.target.checked);
                      }
                    }}
                    className="w-5 h-5 cursor-pointer rounded-full appearance-none border-2 border-primary-black-600 bg-primary-black-800 checked:bg-primary-black-700 checked:border-primary-black-500 hover:border-primary-black-500"
                  />
                  {isSelected && (
                    <svg className="absolute w-3 h-3 text-primary-black-200 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              ) : (
                <span className="text-primary-black-600 text-sm">⋮⋮</span>
              )}
            </div>
            
            {/* COLUMN 2: Rarity Badge */}
            <div className="flex items-center justify-center">
              <span className="px-2 py-1 bg-primary-black-700 text-primary-black-400 rounded text-xs font-bold">
                TK
              </span>
            </div>
            
            {/* COLUMN 3: Token Icon */}
            <div className={`rounded flex items-center justify-center text-2xl bg-gradient-to-br ${getTokenRarityColor(token.token_card.rarity)} w-12 h-12`}>
              💎
            </div>

            {/* COLUMN 4: Token Info - Name + Type on top, Description below */}
            <div className="min-w-0 overflow-hidden">
              {/* Top line: Token Name + Type */}
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-primary-black-50 truncate text-sm leading-tight">
                  {token.token_card.token_name}
                </h4>
                <span className="px-1.5 py-0.5 bg-primary-black-700 text-primary-black-400 rounded text-[9px] font-semibold uppercase flex-shrink-0">
                  TK
                </span>
              </div>
              {/* Bottom line: Description */}
              <div className="text-[11px] text-primary-black-400 leading-tight truncate">
                {token.token_card.description}
              </div>
            </div>

            {/* COLUMN 4: Divider Left (MIDDLE SECTION - hidden on md, shown on lg) */}
            {/* Border on Pull% column serves as left divider */}

            {/* COLUMN 5: Pull % (MIDDLE SECTION - hidden on md, shown on lg) */}
            <div className="hidden lg:flex items-center justify-center">
              <span className="text-xs font-semibold text-primary-black-400">
                {token.token_card.pull_percentage ? `${token.token_card.pull_percentage.toFixed(1)}%` : '--'}
              </span>
            </div>

            {/* COLUMN 6: Sell Value (MIDDLE SECTION - hidden on md, shown on lg) */}
            <div className="hidden lg:flex items-center justify-center">
              <span className="text-xs text-primary-black-300 font-semibold">
                💰 {token.sellValue || 0}
              </span>
            </div>

            {/* COLUMN 7: Divider Right (MIDDLE SECTION - hidden on md, shown on lg) */}
            {/* Border on Sell column serves as right divider */}

            {/* COLUMN 8: Bonus (RIGHT SECTION - always visible) */}
            <div className="flex items-center justify-center">
              <span className="text-base font-bold text-primary-green-400 leading-tight">
                +{token.token_card.bonus_points}
              </span>
            </div>

            {/* Custom columns */}
            {renderExtraRowColumns && renderExtraRowColumns(token, index)}
            </div>

            {/* Mobile Row - MATCH PlayerTable */}
            <div
              draggable={!isLocked}
              onDragStart={handleDragStart}
              onDragEnd={onRowDragEnd}
              className={`grid md:hidden ${customClassName} py-2 px-2`}
              style={{
                gridTemplateColumns: mobileGridTemplate,
                gap: '4px',
                alignItems: 'center',
                minHeight: '56px'
              }}
            >
              {/* COLUMN 1: TK Badge - match modal styling - CLICKABLE ONLY */}
              <div 
                className="flex items-center justify-center cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
              >
                <span className="px-1 py-0.5 bg-primary-black-700 text-primary-black-400 rounded text-[9px] font-semibold text-center">
                  TK
                </span>
              </div>

              {/* COLUMN 2: Token Icon - match modal dimensions */}
              <div className={`rounded flex items-center justify-center text-xl bg-gradient-to-br ${getTokenRarityColor(token.token_card.rarity)} w-10 h-10`}>
                💎
              </div>

              {/* COLUMN 3: Token Name with Description - Sleeper-style dense layout */}
              <div className="min-w-0">
                {/* Line 1: Name + Type */}
                <div className="flex items-baseline gap-1 mb-0.5">
                  <h4 className="font-bold text-primary-black-50 truncate text-[11px] leading-tight">
                    {token.token_card.token_name}
                  </h4>
                  <span className="text-[9px] text-primary-black-400 font-semibold flex-shrink-0 uppercase">
                    {token.token_card.token_type}
                  </span>
                </div>
                {/* Line 2: Description */}
                <p className="text-[9px] text-primary-black-400 truncate leading-tight">
                  {token.token_card.description}
                </p>
              </div>

              {/* COLUMN 4: Bonus - match modal styling */}
              <div className="text-center">
                <span className="text-sm font-bold text-primary-green-400">
                  +{token.token_card.bonus_points}
                </span>
              </div>

              {/* Custom columns */}
              {renderExtraRowColumns && renderExtraRowColumns(token, index)}
            </div>
          </React.Fragment>
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
