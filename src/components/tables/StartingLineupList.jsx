import PropTypes from 'prop-types';
import PlayerRow from './PlayerRow';
import { getPositionAbbr } from './tableHelpers.jsx';
import { calculatePlayerSellValue } from '../../utils/sellValueCalculator';
import { getPositionColorClasses } from '../../constants/colors';

/**
 * StartingLineupList - Position slots view for starting lineup
 * 
 * Displays position-based slots (QB, RB1, RB2, WR1, WR2, WR3, TE, FLEX, SUPERFLEX)
 * Uses canonical PlayerRow component for consistency
 * 
 * Used in: TeamManager (Starting Lineup page)
 */
const StartingLineupList = ({
  lineup = {},
  positionSlots = [],
  onPlayerClick = null,
  onAddToken = null,
  onSell = null,
  liveGameData = null,
  projections = null,
  inventory = null,
  isPreviewMode = false,
  isMobile = false,
  teamStartsNextWeek = false
}) => {
  const getPositionLabel = (slotKey) => {
    if (slotKey === 'QB') return 'QB';
    if (slotKey.startsWith('RB')) return 'RB';
    if (slotKey.startsWith('WR')) return 'WR';
    if (slotKey === 'TE') return 'TE';
    if (slotKey === 'FLEX') return 'FLX';
    if (slotKey === 'SUPERFLEX') return 'SFLX';
    return slotKey;
  };

  return (
    <div className="space-y-0">
      {positionSlots.map((slot, index) => {
        const player = lineup[slot.key];
        const gameData = player ? liveGameData?.get(player.player_card?.player_id) : null;
        const gameStatus = gameData?.gameStatus?.toLowerCase();
        const isGameLiveOrFinal = gameStatus === 'live' || gameStatus === 'halftime' || gameStatus === 'final';
        const isLocked = isPreviewMode ? false : (player?.is_locked || isGameLiveOrFinal);
        const appliedToken = inventory?.tokens?.find(t => t.applied_to_player_id === player?.id && t.is_active);

        // If player exists, use PlayerRow
        if (player) {
          // Calculate sell value for the player
          const playerWithSellValue = {
            ...player,
            sellValue: player.sellValue || calculatePlayerSellValue(player)
          };
          
          return (
            <div key={slot.key} className="relative">
              <PlayerRow
                player={playerWithSellValue}
                index={index}
                slotKey={slot.key}
                liveGameData={liveGameData}
                projections={projections}
                isLocked={isLocked}
                teamStartsNextWeek={teamStartsNextWeek}
                appliedToken={appliedToken}
                onAddToken={onAddToken}
                onClick={() => {
                  if (!isLocked && onPlayerClick) {
                    onPlayerClick(player, slot.key);
                  }
                }}
                onSell={onSell && !isLocked ? onSell : null}
                renderExtraColumns={(p, i) => (
                  <>
                    {/* Token Button Column - Desktop only */}
                    <div className="hidden md:flex items-center justify-center w-8">
                      {onAddToken && (() => {
                        if (appliedToken) {
                          const getTokenEmoji = (tokenName) => {
                            const emojiMap = {
                              'multi-td': '🏈',
                              'elite performance': '⭐',
                              'td scorer': '🎯',
                              'big game': '💥'
                            };
                            return emojiMap[tokenName?.toLowerCase()] || '💎';
                          };

                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddToken(p);
                              }}
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-lg hover:scale-110 transition-transform shadow-lg"
                              title={`${appliedToken.token_card.token_name} (+${appliedToken.token_card.bonus_points})`}
                            >
                              {getTokenEmoji(appliedToken.token_card.token_name)}
                            </button>
                          );
                        }

                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToken(p);
                            }}
                            disabled={isLocked}
                            className="w-8 h-8 rounded-full border-2 border-dashed border-primary-black-600 hover:border-yellow-500 flex items-center justify-center text-primary-black-500 hover:text-yellow-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Add token"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
                            </svg>
                          </button>
                        );
                      })()}
                    </div>
                  </>
                )}
              />
            </div>
          );
        }

        // Empty slot
        return (
          <div
            key={slot.key}
            onClick={() => {
              if (onPlayerClick) {
                onPlayerClick(slot.key);
              }
            }}
            className={`grid transition-all min-h-[76px] cursor-pointer py-2.5 px-3 ${
              index % 2 === 0 ? 'bg-primary-black-900' : 'bg-primary-black-800/40'
            }`}
            style={{ 
              gridTemplateColumns: '32px 40px 1fr 28px 56px',
              gap: '10px',
              alignItems: 'center'
            }}
          >
            {/* Position Badge */}
            <div className="flex items-center justify-center">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-center min-w-[28px] ${getPositionColorClasses(slot.key)}`}>
                {getPositionLabel(slot.key)}
              </span>
            </div>

            {/* Empty Icon - matches filled player icon styling */}
            <div className="rounded bg-primary-black-800/50 flex items-center justify-center w-10 h-10 border-2 border-dashed border-primary-black-600">
              <div className="text-primary-black-500 text-lg font-bold">+</div>
            </div>

            {/* Empty Slot Text */}
            <div className="min-w-0">
              <div className="text-xs text-primary-black-500 font-semibold">
                Empty Slot
              </div>
            </div>

            {/* Empty Token Column */}
            <div className="hidden md:flex items-center justify-center w-8"></div>

            {/* Empty FPTS Column */}
            <div className="text-center">
              <span className="text-[11px] text-primary-black-600">--</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

StartingLineupList.propTypes = {
  lineup: PropTypes.object,
  positionSlots: PropTypes.array,
  onPlayerClick: PropTypes.func,
  onAddToken: PropTypes.func,
  onSell: PropTypes.func,
  liveGameData: PropTypes.object,
  projections: PropTypes.object,
  inventory: PropTypes.object,
  isPreviewMode: PropTypes.bool,
  isMobile: PropTypes.bool,
  teamStartsNextWeek: PropTypes.bool
};

export default StartingLineupList;
