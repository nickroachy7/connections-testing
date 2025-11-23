import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * PlayerSwapModal Component
 * 
 * Mobile-optimized bottom sheet for swapping lineup players with bench players.
 * Shows current lineup player and eligible bench players to swap with.
 * 
 * Features:
 * - Shows current player with position badge
 * - Shows bench players with "BN" badge
 * - Clear "swap" context
 * - Sleeper-inspired design
 */
export default function PlayerSwapModal({
  currentPlayer,
  slotKey,
  eligiblePlayers,
  onSwap,
  onClose,
  liveGameData,
  projections
}) {
  const modalRef = useRef(null);

  // Handle player swap - directly call onSwap callback
  const handlePlayerSwap = (player) => {
    onSwap(player);
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll and pointer events when modal is open
  useEffect(() => {
    const mainContent = document.querySelector('main') || document.body;
    
    document.body.style.overflow = 'hidden';
    mainContent.style.pointerEvents = 'none';
    
    return () => {
      document.body.style.overflow = 'unset';
      mainContent.style.pointerEvents = 'auto';
    };
  }, []);

  // Get position display name
  const getPositionLabel = (key) => {
    if (key === 'FLEX') return 'FLEX';
    if (key.startsWith('QB')) return 'QB';
    if (key.startsWith('RB')) return 'RB';
    if (key.startsWith('WR')) return 'WR';
    if (key.startsWith('TE')) return 'TE';
    return key;
  };

  // Get game info for a player
  const getGameInfo = (player) => {
    const gameData = liveGameData?.get(player.player_card.player_id);
    const projection = projections?.get(player.player_card.player_id);
    
    return {
      gameData,
      projection,
      isLive: gameData?.gameStatus?.toLowerCase() === 'live',
      isFinal: gameData?.gameStatus?.toLowerCase() === 'final',
      isScheduled: gameData?.gameStatus?.toLowerCase() === 'scheduled'
    };
  };

  // Get position color for lineup players (matching Sleeper app)
  const getPositionColor = (position) => {
    const colors = {
      'QB': 'bg-pink-500 text-white',
      'RB': 'bg-teal-400 text-black',
      'WR': 'bg-blue-400 text-white',
      'TE': 'bg-orange-400 text-black',
      'FLEX': 'bg-gradient-to-r from-teal-400 to-orange-400 text-black'
    };
    return colors[position] || 'bg-primary-black-700 text-primary-black-300';
  };

  // Render player card row - matches PlayerTable styling
  const renderPlayerRow = (player, isCurrentPlayer = false, isBenchPlayer = false) => {
    const { gameData, projection, isLive, isFinal } = getGameInfo(player);
    const projectedPoints = projection?.projected || 0;
    const actualPoints = gameData?.currentPoints || player.actual_points || 0;
    const displayPoints = isFinal || isLive ? actualPoints : projectedPoints;
    const isLiveOrFinal = isLive || isFinal;

    // Get position abbreviation
    const getPositionAbbr = (position) => {
      const abbr = {
        'Quarterback': 'QB',
        'Running Back': 'RB',
        'Wide Receiver': 'WR',
        'Tight End': 'TE'
      };
      return abbr[position] || position;
    };

    const positionAbbr = getPositionAbbr(player.player_card.position);
    const badgeText = isBenchPlayer ? 'BN' : positionAbbr;
    const badgeColor = isBenchPlayer ? 'bg-primary-black-700 text-primary-black-300' : getPositionColor(positionAbbr);

    return (
      <div
        key={player.id}
        onClick={() => !isCurrentPlayer && handlePlayerSwap(player)}
        className={`
          grid py-2 px-1 transition-all border-l-4 min-h-[56px]
          ${isCurrentPlayer 
            ? 'bg-primary-black-800/50 border-primary-green-500/50 cursor-default' 
            : 'bg-primary-black-900 border-transparent cursor-pointer hover:bg-primary-green-500/10 hover:border-primary-green-500 active:bg-primary-green-500/20'
          }
        `}
        style={{ 
          gridTemplateColumns: '32px 40px 1fr 60px',
          gap: '4px',
          alignItems: 'center'
        }}
      >
        {/* COLUMN 1: Position Badge */}
        <div className="flex items-center justify-center">
          <span className={`px-1 py-0.5 rounded text-[9px] font-semibold text-center ${badgeColor}`}>
            {badgeText}
          </span>
        </div>

        {/* COLUMN 2: Player Icon */}
        <div className="rounded bg-primary-black-700 flex items-center justify-center w-10 h-10">
          {player.player_card.player_image ? (
            <img
              src={player.player_card.player_image}
              alt={player.player_card.player_name}
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <svg className="w-6 h-6 text-primary-black-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          )}
        </div>

        {/* COLUMN 3: Player Name & Info (stacked for mobile) */}
        <div className="min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <h4 className="font-bold text-primary-black-50 truncate text-[11px] leading-tight">
              {player.player_card.player_name}
            </h4>
          </div>
          <div className="flex items-center gap-1 text-[9px] flex-wrap leading-tight">
            {/* Team Badge */}
            <span className="px-1 py-0 bg-primary-black-700 text-primary-black-300 rounded font-semibold">
              {player.player_card.team_abbreviation}
            </span>
            {/* Opponent and Game Time */}
            {gameData && gameData.opponent ? (
              <>
                <span className="text-primary-black-300 font-semibold">
                  {gameData.isHome ? 'vs' : '@'}{gameData.opponent}
                </span>
                {/* Game Time */}
                {gameData.gameStartTime && gameData.gameStatus === 'scheduled' && (
                  <span className="text-primary-black-500">
                    {new Date(gameData.gameStartTime).toLocaleDateString('en-US', { weekday: 'short' })}{' '}
                    {new Date(gameData.gameStartTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </span>
                )}
              </>
            ) : (
              <span className="text-primary-black-500 font-semibold">BYE</span>
            )}
            {/* Game Status for live/final games */}
            {!gameData?.isBye && (gameData?.gameStatus === 'live' || gameData?.gameStatus === 'halftime') && (
              <span className="text-red-400 font-bold">🔴 LIVE</span>
            )}
            {!gameData?.isBye && gameData?.gameStatus === 'final' && (
              <span className="text-green-400 font-bold">✓ FINAL</span>
            )}
          </div>
        </div>

        {/* COLUMN 4: FPTS (score on top, projected below) */}
        <div className="text-center">
          {isLiveOrFinal && displayPoints !== undefined ? (
            <div className="flex flex-col items-center">
              <span className="text-sm text-white font-bold leading-tight">{displayPoints.toFixed(1)}</span>
              {projectedPoints > 0 && (
                <span className="text-[7px] text-primary-black-500 leading-tight">{projectedPoints.toFixed(1)}</span>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {projectedPoints > 0 ? (
                <>
                  <span className="text-[10px] text-primary-black-500">--</span>
                  <span className="text-[7px] text-primary-black-500 leading-tight">{projectedPoints.toFixed(1)}</span>
                </>
              ) : (
                <span className="text-[9px] text-primary-black-600">--</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-fadeIn"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div 
        ref={modalRef}
        className="fixed inset-x-0 bottom-0 z-[101] bg-primary-black-950 rounded-t-3xl shadow-2xl animate-slideUp max-h-[85vh] flex flex-col pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-primary-black-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 border-b border-primary-black-800">
          <h2 className="text-lg font-bold text-primary-black-50 text-center">
            Swap Player
          </h2>
          <p className="text-xs text-primary-black-400 text-center mt-1">
            {getPositionLabel(slotKey)} Position
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Current Player Section */}
          {currentPlayer && (
            <div className="border-b border-primary-black-800">
              <div className="px-4 py-2 text-xs font-semibold text-primary-black-400 uppercase tracking-wide bg-primary-black-900">
                Current Player
              </div>
              {renderPlayerRow(currentPlayer, true)}
            </div>
          )}

          {/* Swap Candidates Section */}
          <div>
            <div className="px-4 py-2 text-xs font-semibold text-primary-black-400 uppercase tracking-wide bg-primary-black-900 flex items-center justify-center">
              <div className="h-px flex-1 bg-primary-black-800" />
              <span className="px-3">Choose player to swap</span>
              <div className="h-px flex-1 bg-primary-black-800" />
            </div>

            {eligiblePlayers.length > 0 ? (
              <div>
                {eligiblePlayers.map(player => renderPlayerRow(player, false, true))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <div className="text-4xl mb-2 opacity-30">🏈</div>
                <p className="text-primary-black-400 font-semibold">
                  No eligible players available
                </p>
                <p className="text-xs text-primary-black-500 mt-1">
                  Add more players to your bench
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Cancel Button */}
        <div className="p-4 border-t border-primary-black-800 bg-primary-black-900/50">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-primary-black-800 hover:bg-primary-black-700 text-primary-black-200 font-semibold transition-colors active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
      `}</style>
    </>
  );
}

PlayerSwapModal.propTypes = {
  currentPlayer: PropTypes.object,
  slotKey: PropTypes.string.isRequired,
  eligiblePlayers: PropTypes.array.isRequired,
  onSwap: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  liveGameData: PropTypes.instanceOf(Map),
  projections: PropTypes.instanceOf(Map)
};
