import PropTypes from 'prop-types';
import {
  getPositionAbbr,
  getTierBadgeInfo,
  getInjuryStatusBadge,
  getPullPercentageColor
} from './tableHelpers.jsx';

/**
 * PlayerTable - Unified player table component with consistent grid layout
 * 
 * This ensures all player tables across the app have identical:
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

const PlayerTable = ({
  players = [],
  // Visual options
  showBulkSelect = false,
  showTierLevel = false,
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
  selectedPlayerId = null,
  
  // Empty state
  emptyMessage = "No players found",
  emptyIcon = "🏈"
}) => {
  // Calculate grid template based on options
  const getGridTemplate = () => {
    let columns = [];
    
    // Checkbox/Add button column (conditional)
    if (showBulkSelect || showAddButton) {
      columns.push('24px'); // Checkbox or Add button
    } else {
      columns.push('24px'); // Empty/drag handle
    }
    
    // Core columns - Better left space utilization, middle section unchanged
    columns.push(
      '60px',   // Position badge
      '60px',   // Icon
      '220px',  // Player name (reduced to shift middle section left)
      '20px',   // Divider 1 (spacer)
      '80px',   // Pull %
      '80px',   // Sell
      '80px',   // Tier
      '20px',   // Divider 2 (spacer)
      '1fr',    // Game info container (flexible, takes remaining space)
      '100px'   // Score (aligns with BONUS)
    );
    
    return columns.join(' ');
  };

  // Mobile grid template - hide Pull % and Tier columns
  const getMobileGridTemplate = () => {
    let columns = [];
    
    // Checkbox/Add button column (conditional)
    if (showBulkSelect || showAddButton) {
      columns.push('28px'); // Smaller add button for mobile
    } else {
      columns.push('20px'); // Empty/drag handle
    }
    
    // Mobile columns - optimized for information density
    columns.push(
      '32px',   // Position badge (compact)
      '1fr',    // Player name + game info (takes most space)
      '50px',   // Sell value (compact)
      '55px'    // Score with projected (compact)
    );
    
    return columns.join(' ');
  };

  const gridTemplate = getGridTemplate();
  const mobileGridTemplate = getMobileGridTemplate();

  if (players.length === 0) {
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
      {/* Vertical Divider Lines - Continuous from top to bottom */}
      <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: 'calc(24px + 60px + 60px + 220px + 8px * 3 + 20px)' }}>
        <div className="h-full border-r border-primary-black-600"></div>
      </div>
      <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: 'calc(24px + 60px + 60px + 220px + 20px + 80px + 80px + 80px + 8px * 6 + 20px)' }}>
        <div className="h-full border-r border-primary-black-600"></div>
      </div>

      {/* Header Row */}
      <div 
        className="hidden md:grid bg-primary-black-800 border-b border-primary-black-700 py-3 px-2"
        style={{ 
          gridTemplateColumns: gridTemplate,
          gap: '8px'
        }}
      >
        {/* Desktop headers */}
        {/* Checkbox or Empty column */}
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center">
          {/* Empty - no checkbox symbol in header */}
        </span>
        
        {/* Core headers */}
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center">SLOT</span>
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center"></span>
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider">PLAYER</span>
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider invisible"></span>
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center">PULL %</span>
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center">SELL</span>
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center">TIER</span>
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider invisible"></span>
        
        {/* Game Info Headers (nested grid matching row structure) */}
        <div className="grid grid-cols-[90px_1fr_90px] gap-2">
          <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider">OPP</span>
          <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center">STATUS</span>
          <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center">PROJ</span>
        </div>
        
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center">SCORE</span>
        
        {/* Custom headers */}
        {renderExtraHeaderColumns && renderExtraHeaderColumns()}
      </div>

      {/* Mobile Header Row */}
      <div 
        className="grid md:hidden bg-primary-black-800 border-b border-primary-black-700 py-1.5 px-1.5"
        style={{ 
          gridTemplateColumns: mobileGridTemplate,
          gap: '4px'
        }}
      >
        <span className="text-[9px] font-bold text-primary-black-500 uppercase tracking-wide text-center"></span>
        <span className="text-[9px] font-bold text-primary-black-500 uppercase tracking-wide text-center"></span>
        <span className="text-[9px] font-bold text-primary-black-500 uppercase tracking-wide">PLAYER</span>
        <span className="text-[9px] font-bold text-primary-black-500 uppercase tracking-wide text-center">SELL</span>
        <span className="text-[9px] font-bold text-primary-black-500 uppercase tracking-wide text-center">SCORE</span>
        {renderExtraHeaderColumns && renderExtraHeaderColumns()}
      </div>

      {/* Player Rows */}
      {players.map((player, index) => (
        <PlayerTableRow
          key={player.id}
          player={player}
          index={index}
          gridTemplate={gridTemplate}
          mobileGridTemplate={mobileGridTemplate}
          showBulkSelect={showBulkSelect}
          showAddButton={showAddButton}
          showTierLevel={showTierLevel}
          isSelected={selectedIds.includes(player.id)}
          isLocked={isRowLocked ? isRowLocked(player) : false}
          onBulkSelectChange={onBulkSelectChange}
          onAddButtonClick={onAddButtonClick}
          onClick={onRowClick}
          onDragStart={onRowDragStart}
          onDragEnd={onRowDragEnd}
          getRowClassName={getRowClassName}
          renderExtraColumns={renderExtraRowColumns}
          isSelectedForAction={selectedPlayerId === player.id}
        />
      ))}
    </div>
  );
};

/**
 * PlayerTableRow - Individual row component
 * Separated for clarity and performance (can be memoized)
 */
const PlayerTableRow = ({
  player,
  index,
  gridTemplate,
  mobileGridTemplate,
  showBulkSelect,
  showAddButton,
  showTierLevel,
  isSelected,
  isLocked,
  onBulkSelectChange,
  onAddButtonClick,
  onClick,
  onDragStart,
  onDragEnd,
  getRowClassName,
  renderExtraColumns,
  isSelectedForAction
}) => {
  const defaultClassName = `
    grid py-3 px-2 md:py-3 md:px-2 transition-all border-l-4
    ${isLocked ? 'cursor-not-allowed opacity-60 bg-red-900/20 border-red-500/50' : 'cursor-move hover:bg-primary-green-500/10 hover:border-primary-green-500 border-transparent'}
    ${index % 2 === 0 && !isLocked ? 'bg-primary-black-900' : !isLocked ? 'bg-primary-black-800/50' : ''}
  `;
  
  // Mobile-specific row styling - tighter spacing like Sleeper
  const mobileRowClassName = `py-1.5 px-1.5`;

  const customClassName = getRowClassName ? getRowClassName(player, index, isLocked) : defaultClassName;

  const handleDragStart = (e) => {
    if (isLocked) {
      e.preventDefault();
      return;
    }
    if (onDragStart) {
      onDragStart(e, player);
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(player);
    }
  };



  return (
    <>
      {/* Desktop Row */}
      <div
        draggable={!isLocked}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onClick={handleClick}
        className={`hidden md:grid ${customClassName}`}
        style={{ 
          gridTemplateColumns: gridTemplate,
          gap: '8px',
          alignItems: 'center'
        }}
      >
      {/* COLUMN 1: Add Button, Checkbox, or Drag Handle */}
      <div className="flex items-center justify-center">
        {showAddButton ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onAddButtonClick && !isLocked) {
                onAddButtonClick(player);
              }
            }}
            disabled={isLocked}
            className={`w-5 h-5 cursor-pointer rounded-full appearance-none border-2 transition-all flex items-center justify-center text-sm font-bold leading-none disabled:opacity-50 disabled:cursor-not-allowed ${
              isSelectedForAction
                ? 'border-primary-green-500 bg-primary-green-500 text-white hover:border-primary-green-400 hover:bg-primary-green-400'
                : 'border-primary-black-600 bg-primary-black-800 hover:border-primary-green-500 hover:bg-primary-green-500/20 text-primary-black-400 hover:text-primary-green-400'
            }`}
            title={isSelectedForAction ? "Selected for swap" : "Add to lineup"}
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
                  onBulkSelectChange(player, e.target.checked);
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
        ) : isLocked ? (
          <span className="text-red-400 text-xs">🔒</span>
        ) : (
          <span className="text-primary-black-600 text-xs">⋮⋮</span>
        )}
      </div>

      {/* COLUMN 2: Position Badge */}
      <div className="flex items-center justify-center">
        <span className="px-1.5 py-0.5 bg-primary-black-700 text-primary-black-300 rounded text-[10px] font-semibold text-center">
          {getPositionAbbr(player.player_card.position)}
        </span>
      </div>

      {/* COLUMN 3: Person Icon */}
      <div className="rounded-md bg-primary-black-700 flex items-center justify-center w-10 h-10">
        <svg className="w-6 h-6 text-primary-black-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>

      {/* COLUMN 4: Player Name & Team */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-bold text-primary-black-50 truncate text-sm">
            {player.player_card.player_name}
          </h4>
          {/* Tier Badge next to name */}
          {player.card_tier && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getTierBadgeInfo(player.card_tier).color} flex-shrink-0`}>
              {getTierBadgeInfo(player.card_tier).initial}
            </span>
          )}
        </div>
        {/* Team Badge */}
        <span className="px-1.5 py-0.5 bg-primary-black-700 text-primary-black-300 rounded text-[10px] font-semibold">
          {player.player_card.team_abbreviation}
        </span>
      </div>

      {/* COLUMN 5: Spacer (divider 1 is absolute positioned) */}
      <div></div>

      {/* COLUMN 6: Pull % */}
      <div className="text-center">
        {player.player_card.pull_percentage ? (
          <span className={`text-xs font-semibold ${getPullPercentageColor(player.player_card.pull_percentage)}`}>
            {player.player_card.pull_percentage.toFixed(1)}%
          </span>
        ) : (
          <span className="text-xs text-primary-black-600">--</span>
        )}
      </div>

      {/* COLUMN 9: Sell Value */}
      <div className="text-center">
        <span className="text-xs text-primary-black-300 font-semibold">
          💰 {player.sellValue || 0}
        </span>
      </div>

      {/* COLUMN 10: Tier */}
      <div className="text-center">
        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${getTierBadgeInfo(player.card_tier).color}`}>
          {getTierBadgeInfo(player.card_tier).initial}
        </span>
      </div>

      {/* COLUMN 9: Spacer (divider 2 is absolute positioned) */}
      <div></div>
      
      {/* COLUMN 10: Game Info Container (OPP + STATUS + PROJ in nested grid) */}
      <div className="grid grid-cols-[90px_1fr_90px] gap-2">
        {/* Opponent */}
        <div>
          {player.isBye ? (
            <span className="text-xs text-primary-black-500 font-semibold">BYE</span>
          ) : player.opponent ? (
            <span className="text-xs text-primary-black-300 font-semibold">
              {player.isHome ? '' : '@'}{player.opponent}
            </span>
          ) : (
            <span className="text-xs text-primary-black-600">--</span>
          )}
        </div>

        {/* Game Status/Time */}
        <div className="text-center">
          {player.isBye ? (
            <span className="text-[10px] text-primary-black-600">--</span>
          ) : player.gameStatus === 'live' || player.gameStatus === 'halftime' ? (
            <span className="text-xs text-red-400 font-bold">Live</span>
          ) : player.gameStatus === 'final' ? (
            <span className="text-xs text-green-400 font-bold">Final</span>
          ) : player.gameStartTime ? (
            <span className="text-[10px] text-primary-black-400">
              {new Date(player.gameStartTime).toLocaleDateString('en-US', { weekday: 'short' })}{' '}
              {new Date(player.gameStartTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </span>
          ) : (
            <span className="text-[10px] text-primary-black-600">--</span>
          )}
        </div>

        {/* Projected Points */}
        <div className="text-center">
          {player.projected && player.projected > 0 ? (
            <div className="text-primary-black-400 text-xs">
              {player.projected.toFixed(1)}
            </div>
          ) : (
            <span className="text-xs text-primary-black-600">--</span>
          )}
        </div>
      </div>

      {/* COLUMN 11: Score (100px, aligns with BONUS) */}
      <div className="text-center">
        {player.isLiveOrFinal && player.score !== undefined ? (
          <span className="text-sm text-white font-bold">{player.score.toFixed(1)}</span>
        ) : (
          <span className="text-xs text-primary-black-600">--</span>
        )}
      </div>

      {/* Custom columns */}
      {renderExtraColumns && renderExtraColumns(player, index)}
      </div>

      {/* Mobile Row */}
      <div
        draggable={!isLocked}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onClick={handleClick}
        className={`grid md:hidden ${customClassName} ${mobileRowClassName}`}
        style={{ 
          gridTemplateColumns: mobileGridTemplate,
          gap: '4px',
          alignItems: 'center'
        }}
      >
        {/* COLUMN 1: Add Button, Checkbox, or Drag Handle */}
        <div className="flex items-center justify-center">
          {showAddButton ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onAddButtonClick && !isLocked) {
                  onAddButtonClick(player);
                }
              }}
              disabled={isLocked}
              className={`w-5 h-5 cursor-pointer rounded-full appearance-none border transition-all flex items-center justify-center text-xs font-bold leading-none disabled:opacity-50 disabled:cursor-not-allowed ${
                isSelectedForAction
                  ? 'border-primary-green-500 bg-primary-green-500 text-white'
                  : 'border-primary-black-600 bg-primary-black-800 text-primary-black-400'
              }`}
              title={isSelectedForAction ? "Selected for swap" : "Add to lineup"}
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
                    onBulkSelectChange(player, e.target.checked);
                  }
                }}
                disabled={isLocked}
                className="w-5 h-5 cursor-pointer rounded appearance-none border border-primary-black-600 bg-primary-black-800 checked:bg-primary-black-700 checked:border-primary-black-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {isSelected && (
                <svg className="absolute w-3 h-3 text-primary-black-200 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          ) : isLocked ? (
            <span className="text-red-400 text-[10px]">🔒</span>
          ) : (
            <span className="text-primary-black-600 text-[10px]">⋮⋮</span>
          )}
        </div>

        {/* COLUMN 2: Position Badge */}
        <div className="flex items-center justify-center">
          <span className="px-1 py-0.5 bg-primary-black-700 text-primary-black-300 rounded text-[9px] font-semibold text-center">
            {getPositionAbbr(player.player_card.position)}
          </span>
        </div>

        {/* COLUMN 3: Player Name & Info (stacked for mobile) - No person icon to save space */}
        <div className="min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <h4 className="font-bold text-primary-black-50 truncate text-[11px]">
              {player.player_card.player_name}
            </h4>
            {/* Tier Badge next to name */}
            {player.card_tier && (
              <span className={`px-1 py-0 rounded text-[8px] font-bold uppercase ${getTierBadgeInfo(player.card_tier).color} flex-shrink-0`}>
                {getTierBadgeInfo(player.card_tier).initial}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[9px] flex-wrap">
            {/* Team Badge */}
            <span className="px-1 py-0 bg-primary-black-700 text-primary-black-300 rounded font-semibold">
              {player.player_card.team_abbreviation}
            </span>
            {/* Opponent and Game Time on same line */}
            {player.isBye ? (
              <span className="text-primary-black-500 font-semibold">BYE</span>
            ) : player.opponent ? (
              <>
                <span className="text-primary-black-300 font-semibold">
                  {player.isHome ? 'vs' : '@'}{player.opponent}
                </span>
                {/* Game Time directly after opponent */}
                {player.gameStartTime && player.gameStatus === 'scheduled' && (
                  <span className="text-primary-black-500">
                    {new Date(player.gameStartTime).toLocaleDateString('en-US', { weekday: 'short' })}{' '}
                    {new Date(player.gameStartTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </span>
                )}
              </>
            ) : null}
            {/* Game Status for live/final games */}
            {!player.isBye && (player.gameStatus === 'live' || player.gameStatus === 'halftime') && (
              <span className="text-red-400 font-bold">🔴 LIVE</span>
            )}
            {!player.isBye && player.gameStatus === 'final' && (
              <span className="text-green-400 font-bold">✓ FINAL</span>
            )}
          </div>
        </div>

        {/* COLUMN 4: Sell Value */}
        <div className="text-center">
          <span className="text-[9px] text-primary-black-300 font-semibold">
            {player.sellValue || 0}
          </span>
        </div>

        {/* COLUMN 5: Score with Projected below */}
        <div className="text-center">
          {player.isLiveOrFinal && player.score !== undefined ? (
            <div className="flex flex-col items-center">
              <span className="text-sm text-white font-bold leading-tight">{player.score.toFixed(1)}</span>
              {player.projected && player.projected > 0 && (
                <span className="text-[7px] text-primary-black-500 leading-tight">{player.projected.toFixed(1)}</span>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {player.projected && player.projected > 0 ? (
                <span className="text-[10px] text-primary-green-400 font-bold">{player.projected.toFixed(1)}</span>
              ) : (
                <span className="text-[9px] text-primary-black-600">--</span>
              )}
            </div>
          )}
        </div>

        {/* Custom columns */}
        {renderExtraColumns && renderExtraColumns(player, index)}
      </div>
    </>
  );
};

PlayerTable.propTypes = {
  players: PropTypes.array.isRequired,
  showBulkSelect: PropTypes.bool,
  showAddButton: PropTypes.bool,
  showTierLevel: PropTypes.bool,
  renderExtraHeaderColumns: PropTypes.func,
  renderExtraRowColumns: PropTypes.func,
  onBulkSelectChange: PropTypes.func,
  selectedIds: PropTypes.array,
  onRowClick: PropTypes.func,
  onRowDragStart: PropTypes.func,
  onRowDragEnd: PropTypes.func,
  onAddButtonClick: PropTypes.func,
  getRowClassName: PropTypes.func,
  isRowLocked: PropTypes.func,
  selectedPlayerId: PropTypes.string,
  emptyMessage: PropTypes.string,
  emptyIcon: PropTypes.string
};

PlayerTableRow.propTypes = {
  player: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  gridTemplate: PropTypes.string.isRequired,
  mobileGridTemplate: PropTypes.string.isRequired,
  showBulkSelect: PropTypes.bool,
  showAddButton: PropTypes.bool,
  showTierLevel: PropTypes.bool,
  isSelected: PropTypes.bool,
  isLocked: PropTypes.bool,
  onBulkSelectChange: PropTypes.func,
  onAddButtonClick: PropTypes.func,
  onClick: PropTypes.func,
  onDragStart: PropTypes.func,
  onDragEnd: PropTypes.func,
  getRowClassName: PropTypes.func,
  renderExtraColumns: PropTypes.func,
  isSelectedForAction: PropTypes.bool
};

export default PlayerTable;
