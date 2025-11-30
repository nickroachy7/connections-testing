import PropTypes from 'prop-types';
import SwipeableRow from '../SwipeableRow';
import { getTokenRarityColor, getRarityTextColor } from './tableHelpers.jsx';

/**
 * TokenRow - CANONICAL token row component
 * 
 * This is the SINGLE SOURCE OF TRUTH for how a token row looks across the entire app.
 * Used in: Bench Tokens, Inventory Tokens
 * 
 * Mobile-optimized with:
 * - 72px row height
 * - 14px token names (text-sm)
 * - 12px metadata (text-xs)
 * - 48px touch targets
 * - 16px padding, 12px gaps
 */
const TokenRow = ({
  token,
  index = 0,
  
  // Visual options
  showAddButton = false,
  showBulkSelect = false,
  
  // State
  isSelected = false,
  isLocked = false,
  isSelectedForAction = false,
  
  // Interactions
  onClick = null,
  onDragStart = null,
  onDragEnd = null,
  onBulkSelectChange = null,
  onAddButtonClick = null,
  onSell = null,
  
  // Customization
  getRowClassName = null,
  renderExtraColumns = null
}) => {
  // Default row styling
  const defaultClassName = `
    grid transition-all min-h-[72px] md:min-h-[48px]
    ${isLocked ? 'cursor-not-allowed opacity-60 bg-primary-black-900 md:border-primary-black-600' : 'cursor-move md:border-transparent'}
    ${index % 2 === 0 && !isLocked ? 'bg-primary-black-800/20' : !isLocked ? 'bg-primary-black-800/40' : ''}
  `;

  const customClassName = getRowClassName ? getRowClassName(token, index, isLocked) : defaultClassName;

  // Desktop grid: checkbox/drag | badge | icon | info | rarity | sell | bonus
  const desktopGridTemplate = '24px 40px 50px 1fr 90px 90px 80px';
  
  // Mobile grid: badge | icon | info | bonus (optimized to match PlayerRow)
  const mobileGridTemplate = '32px 40px 1fr 56px';

  const handleDragStart = (e) => {
    if (isLocked) {
      e.preventDefault();
      return;
    }
    if (onDragStart) {
      onDragStart(e, token);
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(token);
    }
  };

  return (
    <>
      {/* DESKTOP ROW */}
      <div
        draggable={!isLocked}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onClick={handleClick}
        className={`hidden md:grid items-center ${customClassName} md:py-2 md:px-2 md:border-l-4`}
        style={{ 
          gridTemplateColumns: desktopGridTemplate,
          gap: '8px'
        }}
      >
        {/* Checkbox/Add Button/Drag Handle */}
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
                isSelectedForAction
                  ? 'border-yellow-500 bg-yellow-500 text-white hover:border-yellow-400 hover:bg-yellow-400'
                  : 'border-primary-black-600 bg-primary-black-800 hover:border-primary-green-500 hover:bg-primary-green-500/20 text-primary-black-400 hover:text-primary-green-400'
              }`}
              title={isSelectedForAction ? "Selected for application" : "Apply to player"}
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
                  if (onBulkSelectChange && !isLocked) {
                    onBulkSelectChange(token, e.target.checked);
                  }
                }}
                disabled={isLocked}
                className="w-5 h-5 cursor-pointer rounded-full appearance-none border-2 border-primary-black-600 bg-primary-black-800 checked:bg-primary-black-700 checked:border-primary-black-500 hover:border-primary-black-500 disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Rarity Badge */}
        <div className="flex items-center justify-center">
          <span className="px-2 py-1 bg-primary-black-700 text-primary-black-400 rounded text-xs font-bold">
            TK
          </span>
        </div>

        {/* Token Icon */}
        <div className={`rounded flex items-center justify-center text-2xl bg-gradient-to-br ${getTokenRarityColor(token.token_card.rarity)} w-12 h-12`}>
          💎
        </div>

        {/* Token Info - Name + Description */}
        <div className="min-w-0 overflow-hidden">
          {/* Line 1: Token Name + Type */}
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-primary-black-50 truncate text-sm leading-tight">
              {token.token_card.token_name}
            </h4>
            <span className="px-1.5 py-0.5 bg-primary-black-700 text-primary-black-400 rounded text-[9px] font-semibold uppercase flex-shrink-0">
              TK
            </span>
          </div>
          
          {/* Line 2: Description */}
          <div className="text-[11px] text-primary-black-400 leading-tight truncate">
            {token.token_card.description}
          </div>
        </div>

        {/* Pull % */}
        <div className="hidden lg:flex items-center justify-center">
          <span className="text-xs font-semibold text-primary-black-400">
            {token.token_card.pull_percentage ? `${token.token_card.pull_percentage.toFixed(1)}%` : '--'}
          </span>
        </div>

        {/* Sell Value */}
        <div className="hidden lg:flex items-center justify-center">
          <span className="text-xs text-primary-black-300 font-semibold">
            💰 {token.sellValue || 0}
          </span>
        </div>

        {/* Bonus */}
        <div className="flex items-center justify-center">
          <span className="text-base font-bold text-primary-green-400 leading-tight">
            +{token.token_card.bonus_points}
          </span>
        </div>

        {renderExtraColumns && renderExtraColumns(token, index)}
      </div>

      {/* MOBILE ROW */}
      {onSell && !isLocked && !token.is_active ? (
        <SwipeableRow
          onSell={() => onSell(token)}
          sellValue={token.sellValue || 0}
          disabled={isLocked || token.is_active}
          className="md:hidden"
        >
          <div
            className={`grid ${customClassName} py-2.5 px-3`}
            style={{ 
              gridTemplateColumns: mobileGridTemplate,
              gap: '10px',
              alignItems: 'center',
              minHeight: '76px'
            }}
          >
            <MobileRowContent 
              token={token}
              handleClick={handleClick}
              renderExtraColumns={renderExtraColumns}
              index={index}
            />
          </div>
        </SwipeableRow>
      ) : (
        <div
          draggable={!isLocked}
          onDragStart={handleDragStart}
          onDragEnd={onDragEnd}
          className={`grid md:hidden ${customClassName} py-2.5 px-3`}
          style={{ 
            gridTemplateColumns: mobileGridTemplate,
            gap: '10px',
            alignItems: 'center',
            minHeight: '76px'
          }}
        >
          <MobileRowContent 
            token={token}
            handleClick={handleClick}
            renderExtraColumns={renderExtraColumns}
            index={index}
          />
        </div>
      )}
    </>
  );
};

/**
 * MobileRowContent - Extracted mobile row content to avoid duplication
 */
const MobileRowContent = ({
  token,
  handleClick,
  renderExtraColumns,
  index
}) => (
  <>
    {/* Rarity Badge */}
    <div 
      className="flex items-center justify-center cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        handleClick();
      }}
    >
      <span className="px-1.5 py-0.5 bg-primary-black-700 text-primary-black-400 rounded text-[10px] font-bold text-center min-w-[28px]">
        TK
      </span>
    </div>

    {/* Token Icon */}
    <div className={`rounded flex items-center justify-center text-xl bg-gradient-to-br ${getTokenRarityColor(token.token_card.rarity)} w-10 h-10`}>
      💎
    </div>

    {/* Token Info */}
    <div className="min-w-0">
      {/* Line 1: Token Name */}
      <div className="flex items-center gap-1.5 mb-0.5">
        <h4 className="font-bold text-primary-black-50 truncate text-sm leading-tight">
          {token.token_card.token_name}
        </h4>
      </div>
      
      {/* Line 2-3: Description (two lines with ellipsis) */}
      <div className="text-[11px] text-primary-black-400 leading-snug line-clamp-2">
        {token.token_card.description}
      </div>
    </div>

    {/* Bonus */}
    <div className="text-center">
      <span className="text-sm font-bold text-primary-green-400">
        +{token.token_card.bonus_points}
      </span>
    </div>

    {renderExtraColumns && renderExtraColumns(token, index)}
  </>
);

TokenRow.propTypes = {
  token: PropTypes.object.isRequired,
  index: PropTypes.number,
  showAddButton: PropTypes.bool,
  showBulkSelect: PropTypes.bool,
  isSelected: PropTypes.bool,
  isLocked: PropTypes.bool,
  isSelectedForAction: PropTypes.bool,
  onClick: PropTypes.func,
  onDragStart: PropTypes.func,
  onDragEnd: PropTypes.func,
  onBulkSelectChange: PropTypes.func,
  onAddButtonClick: PropTypes.func,
  onSell: PropTypes.func,
  getRowClassName: PropTypes.func,
  renderExtraColumns: PropTypes.func
};

MobileRowContent.propTypes = {
  token: PropTypes.object.isRequired,
  handleClick: PropTypes.func.isRequired,
  renderExtraColumns: PropTypes.func,
  index: PropTypes.number
};

export default TokenRow;
