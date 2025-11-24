import PropTypes from 'prop-types';

/**
 * LineupListView Component
 * 
 * Traditional list view of lineup slots with player info
 */
export default function LineupListView({
  lineup,
  onPlayerClick,
  liveGameData,
  projections,
  inventory,
  isPreviewMode = false
}) {
  const positionSlots = [
    { key: 'QB', label: 'Quarterback' },
    { key: 'RB1', label: 'Running Back' },
    { key: 'RB2', label: 'Running Back' },
    { key: 'WR1', label: 'Wide Receiver' },
    { key: 'WR2', label: 'Wide Receiver' },
    { key: 'WR3', label: 'Wide Receiver' },
    { key: 'TE', label: 'Tight End' },
    { key: 'FLEX', label: 'Flex (RB/WR/TE)' },
    { key: 'SUPERFLEX', label: 'SuperFlex (Any Position)' }
  ];

  const getPositionAbbr = (position) => {
    const map = {
      'Quarterback': 'QB',
      'Running Back': 'RB',
      'Wide Receiver': 'WR',
      'Tight End': 'TE'
    };
    return map[position] || position;
  };

  const getPositionLabel = (slotKey) => {
    // Simplify position labels
    if (slotKey === 'QB') return 'QB';
    if (slotKey.startsWith('RB')) return 'RB';
    if (slotKey.startsWith('WR')) return 'WR';
    if (slotKey === 'TE') return 'TE';
    if (slotKey === 'FLEX') return 'FLX';
    if (slotKey === 'SUPERFLEX') return 'SFLX';
    return slotKey;
  };

  const getPositionColor = (slotKey) => {
    // Color coding for position badges
    if (slotKey === 'QB') return 'bg-purple-600/80 text-white';
    if (slotKey.startsWith('RB')) return 'bg-cyan-600/80 text-white';
    if (slotKey.startsWith('WR')) return 'bg-blue-600/80 text-white';
    if (slotKey === 'TE') return 'bg-yellow-600/80 text-white';
    if (slotKey === 'FLEX') return 'bg-orange-600/80 text-white';
    if (slotKey === 'SUPERFLEX') return 'bg-pink-600/80 text-white';
    return 'bg-primary-black-700 text-primary-black-300';
  };

  const defaultClassName = (index, isLocked) => `
    grid transition-all min-h-[56px]
    ${isLocked ? 'cursor-not-allowed opacity-60 bg-red-900/20' : 'cursor-pointer'}
    ${index % 2 === 0 && !isLocked ? 'bg-primary-black-800/20' : !isLocked ? 'bg-primary-black-800/40' : ''}
  `;

  return (
    <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-lg sm:rounded-xl">
      {positionSlots.map((slot, index) => {
        const player = lineup[slot.key];
        const gameData = player ? liveGameData?.get(player.player_card.player_id) : null;
        const projection = player ? projections?.get(player.player_card.player_id) : null;
        const gameStatus = gameData?.gameStatus?.toLowerCase();
        const isGameLiveOrFinal = gameStatus === 'live' || gameStatus === 'halftime' || gameStatus === 'final';
        const isLocked = isPreviewMode ? false : (player?.is_locked || isGameLiveOrFinal);
        const appliedToken = inventory?.tokens?.find(t => t.applied_to_player_id === player?.id && t.is_active);

        return (
          <div
            key={slot.key}
            onClick={() => {
              if (!isLocked) {
                if (player && onPlayerClick) {
                  // Filled slot - pass player and slot key to open swap modal
                  onPlayerClick(player, slot.key);
                } else if (!player && onPlayerClick) {
                  // Empty slot - pass position to filter bench
                  onPlayerClick(slot.key);
                }
              }
            }}
            className={`${defaultClassName(index, isLocked)} py-2 px-2`}
            style={{ 
              gridTemplateColumns: '32px 40px 1fr 60px',
              gap: '4px',
              alignItems: 'center'
            }}
          >
            {/* COLUMN 1: Position Badge - exact match to modal */}
            <div className="flex items-center justify-center">
              <span className={`px-1 py-0.5 rounded text-[9px] font-semibold text-center ${getPositionColor(slot.key)}`}>
                {getPositionLabel(slot.key)}
              </span>
            </div>

            {/* COLUMN 2: Player Icon - exact match to modal */}
            <div className="rounded bg-primary-black-700 flex items-center justify-center w-10 h-10">
              {player ? (
                <svg className="w-6 h-6 text-primary-black-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              ) : (
                <div className="text-primary-black-600 text-lg">+</div>
              )}
            </div>

            {/* COLUMN 3: Player Name & Info - Sleeper-style dense layout */}
            <div className="min-w-0">
              {player ? (
                <>
                  {/* Line 1: Name + Position + Team + Tier */}
                  <div className="flex items-baseline gap-1 mb-0.5">
                    <h4 className="font-bold text-primary-black-50 truncate text-[11px] leading-tight">
                      {player.player_card.player_name}
                    </h4>
                    <span className="text-[9px] text-primary-black-400 font-semibold flex-shrink-0">
                      {getPositionAbbr(player.player_card.position)} - {player.player_card.team_abbreviation}
                    </span>
                  </div>
                  {/* Line 2: Matchup info */}
                  <div className="flex items-center gap-1 text-[9px] leading-tight">
                    {/* Game Status for live/final games */}
                    {(gameStatus === 'live' || gameStatus === 'halftime') && (
                      <span className="text-red-400 font-bold">🔴 LIVE</span>
                    )}
                    {gameStatus === 'final' && (
                      <span className="text-green-400 font-bold">✓ FINAL</span>
                    )}
                    {/* Matchup and time */}
                    {gameData?.gameStartTime && gameStatus === 'scheduled' && (
                      <span className="text-primary-black-400">
                        {new Date(gameData.gameStartTime).toLocaleDateString('en-US', { weekday: 'short' })} {new Date(gameData.gameStartTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </span>
                    )}
                    {gameData?.opponent && (
                      <span className="text-primary-black-300 font-semibold">
                        {gameData.isHome ? 'vs' : '@'} {gameData.opponent}
                      </span>
                    )}
                    {!gameData?.opponent && !gameData?.gameStartTime && (
                      <span className="text-primary-black-500 font-semibold">BYE</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-[11px] text-primary-black-500 font-semibold">
                  Empty Slot
                </div>
              )}
            </div>

            {/* COLUMN 4: FPTS - exact match to modal */}
            <div className="text-center">
              {player ? (
                isGameLiveOrFinal && gameData?.currentPoints !== undefined ? (
                  <div className="flex flex-col items-center">
                    <span className="text-sm text-white font-bold leading-tight">{gameData.currentPoints.toFixed(1)}</span>
                    {projection?.projected && projection.projected > 0 && (
                      <span className="text-[7px] text-primary-black-500 leading-tight">{projection.projected.toFixed(1)}</span>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    {projection?.projected && projection.projected > 0 ? (
                      <>
                        <span className="text-[10px] text-primary-black-500">--</span>
                        <span className="text-[7px] text-primary-black-500 leading-tight">{projection.projected.toFixed(1)}</span>
                      </>
                    ) : (
                      <span className="text-[9px] text-primary-black-600">--</span>
                    )}
                  </div>
                )
              ) : (
                <span className="text-[9px] text-primary-black-600">--</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

LineupListView.propTypes = {
  lineup: PropTypes.object.isRequired,
  onPlayerClick: PropTypes.func,
  liveGameData: PropTypes.instanceOf(Map),
  projections: PropTypes.instanceOf(Map),
  inventory: PropTypes.object,
  isPreviewMode: PropTypes.bool
};
