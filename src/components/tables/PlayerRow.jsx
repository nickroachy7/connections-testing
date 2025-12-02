import PropTypes from 'prop-types';
import SwipeableRow from '../SwipeableRow';
import {
  getPositionAbbr,
  getTierBadgeInfo,
  getPullPercentageColor
} from './tableHelpers.jsx';

/**
 * PlayerRow - CANONICAL player row component
 * 
 * This is the SINGLE SOURCE OF TRUTH for how a player row looks across the entire app.
 * Used in: Starting Lineup, Bench, Inventory
 * 
 * Mobile-optimized with:
 * - 72px row height
 * - 14px player names (text-sm)
 * - 12px metadata (text-xs)
 * - 48px touch targets
 * - 16px padding, 12px gaps
 */
const PlayerRow = ({
  player,
  index = 0,
  
  // Visual options
  showBenchBadge = false,
  showAddButton = false,
  showBulkSelect = false,
  showTierBadge = true,
  
  // State
  isSelected = false,
  isLocked = false,
  isSelectedForAction = false,
  teamStartsNextWeek = false,
  
  // Data
  liveGameData = null,
  projections = null,
  
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
  // Enrich with live game data
  const gameData = liveGameData?.get(player.player_card?.player_id);
  const projection = projections?.get(player.player_card?.player_id);
  const gameStatus = gameData?.gameStatus?.toLowerCase();
  // Show BYE if:
  // 1. liveGameData has loaded (size > 0) AND this player has no game data
  // This correctly shows BYE for players on actual bye weeks, even for teams waiting to start
  const hasGameDataLoaded = liveGameData && liveGameData.size > 0;
  const isBye = hasGameDataLoaded && !gameData;
  const isGameLiveOrFinal = gameStatus === 'live' || gameStatus === 'halftime' || gameStatus === 'final';

  // Default row styling
  const defaultClassName = `
    grid transition-all min-h-[72px] md:min-h-[48px]
    ${isLocked ? 'cursor-not-allowed opacity-60 bg-primary-black-900 md:border-primary-black-600' : 'cursor-move md:border-transparent'}
    ${index % 2 === 0 && !isLocked ? 'bg-primary-black-800' : !isLocked ? 'bg-primary-black-900' : ''}
  `;

  const customClassName = getRowClassName ? getRowClassName(player, index, isLocked) : defaultClassName;

  // Desktop grid: checkbox/drag | badge | icon | info | pull% | sell | fpts [| extra]
  // When extra columns exist, add them to the end
  const desktopGridTemplate = renderExtraColumns 
    ? '24px 40px 50px 1fr 90px 90px 80px auto' // Use 1fr for player info to be flexible
    : '24px 40px 50px 1fr 90px 90px 80px'; // Use 1fr instead of 400px for better responsiveness
  
  // Mobile grid: badge | icon | info | fpts (optimized for space)
  const mobileGridTemplate = '32px 40px 1fr 56px';

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
      {/* DESKTOP ROW */}
      <div
        draggable={!isLocked}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onClick={handleClick}
        className={`hidden md:grid items-center ${customClassName} md:py-2 md:px-2 md:border-l-4 ${onClick ? 'cursor-pointer hover:bg-primary-black-700/50' : ''}`}
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

        {/* Position Badge */}
        <div className="flex items-center justify-center">
          <span className="px-2 py-1 bg-primary-black-700 text-primary-black-300 rounded text-xs font-bold">
            {showBenchBadge ? 'BN' : getPositionAbbr(player.player_card.position)}
          </span>
        </div>

        {/* Player Icon */}
        <div className={`rounded bg-primary-black-700 flex items-center justify-center w-12 h-12 border-2 ${player.card_tier ? getTierBadgeInfo(player.card_tier).borderColor : 'border-gray-500'}`}>
          <svg className="w-7 h-7 text-primary-black-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>

        {/* Player Info - Name + Metadata */}
        <div className="min-w-0 overflow-hidden">
          {/* Line 1: Name + Position + Tier */}
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-primary-black-50 truncate text-sm leading-tight">
              {player.player_card.player_name}
            </h4>
            <span className="px-1.5 py-0.5 bg-primary-black-700 text-primary-black-400 rounded text-[9px] font-semibold flex-shrink-0">
              {getPositionAbbr(player.player_card.position)}
            </span>
            {showTierBadge && player.card_tier && (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getTierBadgeInfo(player.card_tier).color} flex-shrink-0 leading-tight`}>
                {getTierBadgeInfo(player.card_tier).initial}
              </span>
            )}
          </div>
          
          {/* Line 2: Team + Matchup */}
          <div className="flex items-center gap-1.5 text-[11px] leading-tight">
            <span className="px-1.5 py-0.5 bg-primary-black-700 text-primary-black-300 rounded font-semibold">
              {player.player_card.team_abbreviation}
            </span>
            
            {isBye && <span className="text-primary-black-500 font-semibold">BYE</span>}
            
            {!isBye && (gameStatus === 'live' || gameStatus === 'halftime') && gameData && (
              <span className="text-primary-black-50 font-semibold">
                LIVE {gameData.timeRemaining && gameData.quarter ? `${gameData.timeRemaining} ${gameData.quarter} ` : ''}
                {gameData.homeScore !== undefined && gameData.awayScore !== undefined && (
                  <>
                    {gameData.isHome ? `${gameData.homeScore}-${gameData.awayScore} ` : `${gameData.awayScore}-${gameData.homeScore} `}
                  </>
                )}
                {(() => {
                  const opponent = gameData.opponent || (gameData.isHome ? gameData.awayTeam : gameData.homeTeam);
                  return opponent ? `${gameData.isHome ? 'vs' : '@'} ${opponent}` : '';
                })()}
              </span>
            )}
            
            {!isBye && gameStatus === 'final' && gameData && gameData.homeScore !== undefined && gameData.awayScore !== undefined && (
              <span className="text-primary-black-400">
                {(() => {
                  const playerScore = gameData.isHome ? gameData.homeScore : gameData.awayScore;
                  const opponentScore = gameData.isHome ? gameData.awayScore : gameData.homeScore;
                  const opponent = gameData.opponent || (gameData.isHome ? gameData.awayTeam : gameData.homeTeam);
                  const result = playerScore > opponentScore ? 'W' : playerScore < opponentScore ? 'L' : 'T';
                  const resultColor = result === 'W' ? 'text-green-400' : result === 'L' ? 'text-red-400' : 'text-yellow-400';
                  return (
                    <>
                      Final <span className={resultColor}>{result}</span> {playerScore}-{opponentScore}{opponent ? ` ${gameData.isHome ? 'vs' : '@'} ${opponent}` : ''}
                    </>
                  );
                })()}
              </span>
            )}
            
            {!isBye && gameStatus === 'scheduled' && (gameData?.gameStartTime || gameData?.isUpcoming) && (
              <>
                {/* Show week number prefix for upcoming games (team hasn't started yet) */}
                {gameData.isUpcoming && gameData.weekNumber && (
                  <span className="text-amber-400 font-semibold">
                    Wk {gameData.weekNumber}
                  </span>
                )}
                {gameData.gameStartTime && (
                  <span className="text-primary-black-400">
                    {new Date(gameData.gameStartTime).toLocaleDateString('en-US', { weekday: 'short' })} {new Date(gameData.gameStartTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </span>
                )}
                {gameData.opponent && (
                  <span className="text-primary-black-300 font-semibold">
                    {gameData.isHome ? 'vs' : '@'} {gameData.opponent}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Pull % */}
        <div className="hidden lg:flex items-center justify-center">
          {player.player_card.pull_percentage ? (
            <span className={`text-xs font-semibold ${getPullPercentageColor(player.player_card.pull_percentage)}`}>
              {player.player_card.pull_percentage.toFixed(1)}%
            </span>
          ) : (
            <span className="text-xs text-primary-black-600">--</span>
          )}
        </div>

        {/* Sell Value */}
        <div className="hidden lg:flex items-center justify-center">
          <span className="text-xs text-primary-black-300 font-semibold">
            💰 {player.sellValue || 0}
          </span>
        </div>

        {/* FPTS */}
        <div className="flex flex-col items-center justify-center">
          {gameData?.currentPoints !== undefined && isGameLiveOrFinal ? (
            <>
              <span className="text-base text-white font-bold leading-tight">{gameData.currentPoints.toFixed(1)}</span>
              {projection?.projected && projection.projected > 0 && (
                <span className="text-[10px] text-primary-black-500 leading-tight">{projection.projected.toFixed(1)}</span>
              )}
            </>
          ) : projection?.projected && projection.projected > 0 ? (
            <>
              <span className="text-sm text-primary-black-500 leading-tight">--</span>
              <span className="text-[10px] text-primary-black-500 leading-tight">{projection.projected.toFixed(1)}</span>
            </>
          ) : (
            <span className="text-xs text-primary-black-600 leading-tight">--</span>
          )}
        </div>

        {renderExtraColumns && renderExtraColumns(player, index)}
      </div>

      {/* MOBILE ROW */}
      {onSell && !isLocked ? (
        <SwipeableRow
          onSell={() => onSell(player)}
          sellValue={player.sellValue || 0}
          disabled={isLocked}
          className="md:hidden"
        >
          <div
            onClick={handleClick}
            className={`grid ${customClassName} py-2.5 px-3 ${onClick ? 'cursor-pointer active:bg-primary-black-700/50' : ''}`}
            style={{ 
              gridTemplateColumns: mobileGridTemplate,
              gap: '10px',
              alignItems: 'center',
              minHeight: '76px'
            }}
          >
            <MobileRowContent 
              player={player}
              showBenchBadge={showBenchBadge}
              showTierBadge={showTierBadge}
              handleClick={handleClick}
              gameData={gameData}
              projection={projection}
              gameStatus={gameStatus}
              isBye={isBye}
              isGameLiveOrFinal={isGameLiveOrFinal}
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
          onClick={handleClick}
          className={`grid md:hidden ${customClassName} py-2.5 px-3 ${onClick ? 'cursor-pointer active:bg-primary-black-700/50' : ''}`}
          style={{ 
            gridTemplateColumns: mobileGridTemplate,
            gap: '10px',
            alignItems: 'center',
            minHeight: '76px'
          }}
        >
          <MobileRowContent 
            player={player}
            showBenchBadge={showBenchBadge}
            showTierBadge={showTierBadge}
            handleClick={handleClick}
            gameData={gameData}
            projection={projection}
            gameStatus={gameStatus}
            isBye={isBye}
            isGameLiveOrFinal={isGameLiveOrFinal}
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
  player,
  showBenchBadge,
  showTierBadge,
  handleClick,
  gameData,
  projection,
  gameStatus,
  isBye,
  isGameLiveOrFinal,
  renderExtraColumns,
  index
}) => (
  <>
    {/* Position Badge */}
    <div className="flex items-center justify-center">
      <span className="px-1.5 py-0.5 bg-primary-black-700 text-primary-black-300 rounded text-[10px] font-bold text-center min-w-[28px]">
        {showBenchBadge ? 'BN' : getPositionAbbr(player.player_card.position)}
      </span>
    </div>

    {/* Player Icon */}
    <div className={`rounded bg-primary-black-700 flex items-center justify-center w-10 h-10 border-2 ${player.card_tier ? getTierBadgeInfo(player.card_tier).borderColor : 'border-gray-500'}`}>
      <svg className="w-6 h-6 text-primary-black-300" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
    </div>

    {/* Player Info */}
    <div className="min-w-0">
      {/* Line 1: Name + Tier */}
      <div className="flex items-center gap-1.5 mb-0.5">
        <h4 className="font-bold text-primary-black-50 truncate text-sm leading-tight">
          {player.player_card.player_name}
        </h4>
        {showTierBadge && player.card_tier && (
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${getTierBadgeInfo(player.card_tier).color} flex-shrink-0 leading-tight`}>
            {getTierBadgeInfo(player.card_tier).initial}
          </span>
        )}
      </div>
      
      {/* Line 2: Position + Team */}
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-[11px] text-primary-black-400 font-semibold">
          {getPositionAbbr(player.player_card.position)} - {player.player_card.team_abbreviation}
        </span>
      </div>
      
      {/* Line 3: Matchup Info */}
      <div className="flex items-center gap-1.5 text-[11px] leading-tight">
        {isBye ? (
          <span className="text-primary-black-500 font-semibold">BYE</span>
        ) : (gameStatus === 'live' || gameStatus === 'halftime') && gameData ? (
          <span className="text-primary-black-50 font-semibold">
            LIVE {gameData.timeRemaining && gameData.quarter ? `${gameData.timeRemaining} ${gameData.quarter} ` : ''}
            {gameData.homeScore !== undefined && gameData.awayScore !== undefined && (
              <>
                {gameData.isHome ? `${gameData.homeScore}-${gameData.awayScore} ` : `${gameData.awayScore}-${gameData.homeScore} `}
              </>
            )}
            {(() => {
              const opponent = gameData.opponent || (gameData.isHome ? gameData.awayTeam : gameData.homeTeam);
              return opponent ? `${gameData.isHome ? 'vs' : '@'} ${opponent}` : '';
            })()}
          </span>
        ) : gameStatus === 'final' && gameData && gameData.homeScore !== undefined && gameData.awayScore !== undefined ? (
          <span className="text-primary-black-400">
            {(() => {
              const playerScore = gameData.isHome ? gameData.homeScore : gameData.awayScore;
              const opponentScore = gameData.isHome ? gameData.awayScore : gameData.homeScore;
              const opponent = gameData.opponent || (gameData.isHome ? gameData.awayTeam : gameData.homeTeam);
              const result = playerScore > opponentScore ? 'W' : playerScore < opponentScore ? 'L' : 'T';
              const resultColor = result === 'W' ? 'text-green-400' : result === 'L' ? 'text-red-400' : 'text-yellow-400';
              return (
                <>
                  <span className={resultColor}>{result}</span> {playerScore}-{opponentScore}{opponent ? ` ${gameData.isHome ? 'vs' : '@'}${opponent}` : ''}
                </>
              );
            })()}
          </span>
        ) : gameStatus === 'scheduled' && gameData?.gameStartTime ? (
          <span className="text-primary-black-400">
            {new Date(gameData.gameStartTime).toLocaleDateString('en-US', { weekday: 'short' })} {new Date(gameData.gameStartTime).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).replace(' ', '').toLowerCase()}
            {gameData.opponent && (
              <span className="text-primary-black-300 font-semibold ml-1">
                {gameData.isHome ? 'vs' : '@'}{gameData.opponent}
              </span>
            )}
          </span>
        ) : null}
      </div>
    </div>

    {/* FPTS */}
    <div className="text-center">
      {gameData?.currentPoints !== undefined && isGameLiveOrFinal ? (
        <div className="flex flex-col items-center">
          <span className="text-sm text-white font-bold leading-tight">{gameData.currentPoints.toFixed(1)}</span>
          {projection?.projected && projection.projected > 0 && (
            <span className="text-[9px] text-primary-black-500 leading-tight">{projection.projected.toFixed(1)}</span>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          {projection?.projected && projection.projected > 0 ? (
            <>
              <span className="text-[11px] text-primary-black-500">--</span>
              <span className="text-[9px] text-primary-black-500 leading-tight">{projection.projected.toFixed(1)}</span>
            </>
          ) : (
            <span className="text-[11px] text-primary-black-600">--</span>
          )}
        </div>
      )}
    </div>

    {renderExtraColumns && renderExtraColumns(player, index)}
  </>
);

PlayerRow.propTypes = {
  player: PropTypes.object.isRequired,
  index: PropTypes.number,
  showBenchBadge: PropTypes.bool,
  showAddButton: PropTypes.bool,
  showBulkSelect: PropTypes.bool,
  showTierBadge: PropTypes.bool,
  isSelected: PropTypes.bool,
  isLocked: PropTypes.bool,
  isSelectedForAction: PropTypes.bool,
  teamStartsNextWeek: PropTypes.bool,
  liveGameData: PropTypes.object,
  projections: PropTypes.object,
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
  player: PropTypes.object.isRequired,
  showBenchBadge: PropTypes.bool,
  showTierBadge: PropTypes.bool,
  handleClick: PropTypes.func.isRequired,
  gameData: PropTypes.object,
  projection: PropTypes.object,
  gameStatus: PropTypes.string,
  isBye: PropTypes.bool,
  isGameLiveOrFinal: PropTypes.bool,
  renderExtraColumns: PropTypes.func,
  index: PropTypes.number
};

export default PlayerRow;
