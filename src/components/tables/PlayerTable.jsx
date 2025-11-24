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
  showBenchBadge = false,
  
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
    
    // THREE SECTIONS:
    // 1. LEFT SECTION (always visible): Icon + Player Info
    // 2. MIDDLE SECTION (hidden md, shown lg+): Pull% + Sell (with borders as dividers)
    // 3. RIGHT SECTION (always visible): Projected + Score
    
    columns.push(
      '40px',   // Position badge (LEFT SECTION)
      '50px',   // Player icon (LEFT SECTION)
      '400px', // Player info (LEFT SECTION) - fixed width for perfect alignment
      // MIDDLE SECTION (borders serve as dividers)
      '90px',   // Pull % (fixed width for alignment)
      '90px',   // Sell (fixed width for alignment)
      // RIGHT SECTION (always visible)
      '80px'    // FPTS (combined score/projected)
    );
    
    return columns.join(' ');
  };

  // Mobile grid template - match BenchPlayerSwapModal exactly
  const getMobileGridTemplate = () => {
    let columns = [];
    
    // Mobile columns - exact match to swap modal
    columns.push(
      '32px',   // Position badge (matches modal)
      '40px',   // Player icon (matches modal)
      '1fr',    // Player name + team + opponent + game time (matches modal)
      '60px'    // FPTS (matches modal)
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
    <div className="overflow-hidden relative w-full">
      {/* Continuous vertical divider lines - absolute positioned to span full height */}
      <div className="absolute top-0 bottom-0 hidden lg:block pointer-events-none" style={{ left: 'calc(24px + 8px + 40px + 8px + 50px + 8px + 400px + 8px - 1px)', width: '1px', backgroundColor: 'rgb(64, 64, 64)' }}></div>
      <div className="absolute top-0 bottom-0 hidden lg:block pointer-events-none" style={{ left: 'calc(24px + 8px + 40px + 8px + 50px + 8px + 400px + 8px + 90px + 8px + 90px + 8px)', width: '1px', backgroundColor: 'rgb(64, 64, 64)' }}></div>

      {/* Header Row */}
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
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center">POS</span>
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center"></span>
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider">PLAYER</span>
        
        {/* MIDDLE SECTION - hidden on md, shown on lg (continuous borders via absolute divs) */}
        <span className="hidden lg:flex items-center justify-center text-[10px] font-bold text-primary-black-500 uppercase tracking-wider">PULL %</span>
        <span className="hidden lg:flex items-center justify-center text-[10px] font-bold text-primary-black-500 uppercase tracking-wider">SELL</span>
        
        {/* RIGHT SECTION - always visible */}
        <span className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider text-center">FPTS</span>
        
        {/* Custom headers */}
        {renderExtraHeaderColumns && renderExtraHeaderColumns()}
      </div>

      {/* Mobile Header Row - REMOVED for cleaner look */}

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
          showBenchBadge={showBenchBadge}
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
  showBenchBadge,
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
    grid md:py-2 md:px-2 transition-all md:border-l-4 min-h-[64px] md:min-h-[48px]
    ${isLocked ? 'cursor-not-allowed opacity-60 bg-red-900/20 md:border-red-500/50' : 'cursor-move md:border-transparent'}
    ${index % 2 === 0 && !isLocked ? 'bg-primary-black-800/20' : !isLocked ? 'bg-primary-black-800/40' : ''}
  `;


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
        className={`hidden md:grid items-center ${customClassName}`}
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
        <span className="px-2 py-1 bg-primary-black-700 text-primary-black-300 rounded text-xs font-bold">
          {showBenchBadge ? 'BN' : getPositionAbbr(player.player_card.position)}
        </span>
      </div>

      {/* COLUMN 3: Player Icon */}
      <div className={`rounded bg-primary-black-700 flex items-center justify-center w-12 h-12 border-2 ${player.card_tier ? getTierBadgeInfo(player.card_tier).borderColor : 'border-gray-500'}`}>
        <svg className="w-7 h-7 text-primary-black-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>

      {/* COLUMN 4: Player Info - Name + Position + Tier on top, Team + Matchup below */}
      <div className="min-w-0 overflow-hidden">
        {/* Top line: Player Name + Position Badge + Tier Badge */}
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-bold text-primary-black-50 truncate text-sm leading-tight">
            {player.player_card.player_name}
          </h4>
          <span className="px-1.5 py-0.5 bg-primary-black-700 text-primary-black-400 rounded text-[9px] font-semibold flex-shrink-0">
            {getPositionAbbr(player.player_card.position)}
          </span>
          {player.card_tier && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getTierBadgeInfo(player.card_tier).color} flex-shrink-0 leading-tight`}>
              {getTierBadgeInfo(player.card_tier).initial}
            </span>
          )}
        </div>
        {/* Bottom line: Team + Matchup info */}
        <div className="flex items-center gap-1.5 text-[11px] leading-tight">
          <span className="px-1.5 py-0.5 bg-primary-black-700 text-primary-black-300 rounded font-semibold">
            {player.player_card.team_abbreviation}
          </span>
          {player.isBye ? (
            <span className="text-primary-black-500 font-semibold">BYE</span>
          ) : player.opponent ? (
            <>
              <span className="text-primary-black-300 font-semibold">
                {player.isHome ? 'vs' : '@'}{player.opponent}
              </span>
              {player.gameStartTime && player.gameStatus === 'scheduled' && (
                <span className="text-primary-black-400">
                  {new Date(player.gameStartTime).toLocaleDateString('en-US', { weekday: 'short' })}{' '}
                  {new Date(player.gameStartTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </span>
              )}
            </>
          ) : null}
          {/* Live game - show clock, quarter, score, opponent */}
          {!player.isBye && (player.gameStatus === 'live' || player.gameStatus === 'halftime') && (
            <span className="text-primary-black-50 font-semibold">
              LIVE {player.timeRemaining && player.quarter ? `${player.timeRemaining} ${player.quarter} ` : ''}
              {player.homeScore !== undefined && player.awayScore !== undefined && (
                <>
                  {player.isHome 
                    ? `${player.homeScore}-${player.awayScore} ` 
                    : `${player.awayScore}-${player.homeScore} `
                  }
                </>
              )}
              {(() => {
                const opponent = player.opponent || (player.isHome ? player.awayTeam : player.homeTeam);
                return opponent ? `${player.isHome ? 'vs' : '@'} ${opponent}` : '';
              })()}
            </span>
          )}
          {/* Final game - show result, score, opponent */}
          {!player.isBye && player.gameStatus === 'final' && (
            <span className="text-primary-black-50 font-semibold">
              {(() => {
                if (player.homeScore === undefined || player.awayScore === undefined) {
                  const opponent = player.opponent || (player.isHome ? player.awayTeam : player.homeTeam);
                  return `FINAL${opponent ? ` ${player.isHome ? 'vs' : '@'} ${opponent}` : ''}`;
                }
                const playerScore = player.isHome ? player.homeScore : player.awayScore;
                const opponentScore = player.isHome ? player.awayScore : player.homeScore;
                const opponent = player.opponent || (player.isHome ? player.awayTeam : player.homeTeam);
                const result = playerScore > opponentScore ? 'W' : playerScore < opponentScore ? 'L' : 'T';
                const resultColor = result === 'W' ? 'text-green-400' : result === 'L' ? 'text-red-400' : 'text-yellow-400';
                return (
                  <>
                    FINAL <span className={resultColor}>{result}</span> {playerScore}-{opponentScore}{opponent ? ` ${player.isHome ? 'vs' : '@'} ${opponent}` : ''}
                  </>
                );
              })()}
            </span>
          )}
        </div>
      </div>

      {/* COLUMN 4: Divider Left (MIDDLE SECTION - hidden on md, shown on lg) */}
      {/* Border on Pull% column serves as left divider */}

      {/* COLUMN 5: Pull % (MIDDLE SECTION - hidden on md, shown on lg) */}
      <div className="hidden lg:flex items-center justify-center">
        {player.player_card.pull_percentage ? (
          <span className={`text-xs font-semibold ${getPullPercentageColor(player.player_card.pull_percentage)}`}>
            {player.player_card.pull_percentage.toFixed(1)}%
          </span>
        ) : (
          <span className="text-xs text-primary-black-600">--</span>
        )}
      </div>

      {/* COLUMN 6: Sell Value (MIDDLE SECTION - hidden on md, shown on lg) */}
      <div className="hidden lg:flex items-center justify-center">
        <span className="text-xs text-primary-black-300 font-semibold">
          💰 {player.sellValue || 0}
        </span>
      </div>

      {/* COLUMN 7: Divider Right (MIDDLE SECTION - hidden on md, shown on lg) */}
      {/* Border on Sell column serves as right divider */}

      {/* COLUMN 8: FPTS (RIGHT SECTION - always visible) */}
      <div className="flex flex-col items-center justify-center">
        {player.isLiveOrFinal && player.score !== undefined ? (
          <>
            <span className="text-base text-white font-bold leading-tight">{player.score.toFixed(1)}</span>
            {player.projected && player.projected > 0 && (
              <span className="text-[10px] text-primary-black-500 leading-tight">{player.projected.toFixed(1)}</span>
            )}
          </>
        ) : player.projected && player.projected > 0 ? (
          <>
            <span className="text-sm text-primary-black-500 leading-tight">--</span>
            <span className="text-[10px] text-primary-black-500 leading-tight">{player.projected.toFixed(1)}</span>
          </>
        ) : (
          <span className="text-xs text-primary-black-600 leading-tight">--</span>
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
        className={`grid md:hidden ${customClassName} py-2 px-2`}
        style={{ 
          gridTemplateColumns: mobileGridTemplate,
          gap: '4px',
          alignItems: 'center',
          minHeight: '56px'
        }}
      >
        {/* COLUMN 1: Position Badge - exact match to modal */}
        <div className="flex items-center justify-center">
          <span className="px-1 py-0.5 bg-primary-black-700 text-primary-black-300 rounded text-[9px] font-semibold text-center">
            {showBenchBadge ? 'BN' : getPositionAbbr(player.player_card.position)}
          </span>
        </div>

        {/* COLUMN 2: Player Icon - exact match to modal */}
        <div className={`rounded bg-primary-black-700 flex items-center justify-center w-10 h-10 border-2 ${player.card_tier ? getTierBadgeInfo(player.card_tier).borderColor : 'border-gray-500'}`}>
          <svg className="w-6 h-6 text-primary-black-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>

        {/* COLUMN 3: Player Name & Info - Sleeper-style dense layout */}
        <div className="min-w-0">
          {/* Line 1: Name + Position + Team + Tier */}
          <div className="flex items-baseline gap-1 mb-0.5">
            <h4 className="font-bold text-primary-black-50 truncate text-[11px] leading-tight">
              {player.player_card.player_name}
            </h4>
            <span className="text-[9px] text-primary-black-400 font-semibold flex-shrink-0">
              {getPositionAbbr(player.player_card.position)} - {player.player_card.team_abbreviation}
            </span>
            {player.card_tier && (
              <span className={`px-1 py-0 rounded text-[8px] font-bold uppercase ${getTierBadgeInfo(player.card_tier).color} flex-shrink-0 leading-tight`}>
                {getTierBadgeInfo(player.card_tier).initial}
              </span>
            )}
          </div>
          {/* Line 2: Matchup info */}
          <div className="flex items-center gap-1 text-[9px] leading-tight">
            {player.isBye ? (
              <span className="text-primary-black-500 font-semibold">BYE</span>
            ) : (
              <>
                {/* Live game - show clock, quarter, score, opponent */}
                {(player.gameStatus === 'live' || player.gameStatus === 'halftime') && (
                  <span className="text-primary-black-50 font-semibold">
                    LIVE {player.timeRemaining && player.quarter ? `${player.timeRemaining} ${player.quarter} ` : ''}
                    {player.homeScore !== undefined && player.awayScore !== undefined && (
                      <>
                        {player.isHome 
                          ? `${player.homeScore}-${player.awayScore} ` 
                          : `${player.awayScore}-${player.homeScore} `
                        }
                      </>
                    )}
                    {(() => {
                      const opponent = player.opponent || (player.isHome ? player.awayTeam : player.homeTeam);
                      return opponent ? `${player.isHome ? 'vs' : '@'} ${opponent}` : '';
                    })()}
                  </span>
                )}
                {/* Final game - show result, score, opponent */}
                {player.gameStatus === 'final' && (
                  <span className="text-primary-black-50 font-semibold">
                    {(() => {
                      if (player.homeScore === undefined || player.awayScore === undefined) {
                        const opponent = player.opponent || (player.isHome ? player.awayTeam : player.homeTeam);
                        return `FINAL${opponent ? ` ${player.isHome ? 'vs' : '@'} ${opponent}` : ''}`;
                      }
                      const playerScore = player.isHome ? player.homeScore : player.awayScore;
                      const opponentScore = player.isHome ? player.awayScore : player.homeScore;
                      const opponent = player.opponent || (player.isHome ? player.awayTeam : player.homeTeam);
                      const result = playerScore > opponentScore ? 'W' : playerScore < opponentScore ? 'L' : 'T';
                      const resultColor = result === 'W' ? 'text-green-400' : result === 'L' ? 'text-red-400' : 'text-yellow-400';
                      return (
                        <>
                          FINAL <span className={resultColor}>{result}</span> {playerScore}-{opponentScore}{opponent ? ` ${player.isHome ? 'vs' : '@'} ${opponent}` : ''}
                        </>
                      );
                    })()}
                  </span>
                )}
                {/* Scheduled game - show time and opponent */}
                {player.gameStartTime && player.gameStatus === 'scheduled' && (
                  <>
                    <span className="text-primary-black-400">
                      {new Date(player.gameStartTime).toLocaleDateString('en-US', { weekday: 'short' })} {new Date(player.gameStartTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </span>
                    {(() => {
                      const opponent = player.opponent || (player.isHome ? player.awayTeam : player.homeTeam);
                      return opponent ? (
                        <span className="text-primary-black-300 font-semibold">
                          {player.isHome ? 'vs' : '@'} {opponent}
                        </span>
                      ) : null;
                    })()}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* COLUMN 4: FPTS - exact match to modal */}
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
                <>
                  <span className="text-[10px] text-primary-black-500">--</span>
                  <span className="text-[7px] text-primary-black-500 leading-tight">{player.projected.toFixed(1)}</span>
                </>
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
  showBenchBadge: PropTypes.bool,
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
  showBenchBadge: PropTypes.bool,
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
