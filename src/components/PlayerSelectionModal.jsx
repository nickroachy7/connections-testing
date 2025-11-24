import { useState, useMemo, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import PlayerCard from './PlayerCard';
import { useIsMobile } from '../hooks';
import { getTierBadgeInfo } from './tables/tableHelpers.jsx';

/**
 * PlayerSelectionModal Component
 * 
 * Modal for selecting a player to add to a specific lineup position.
 * Shows available players filtered by position with search and sort.
 * Mobile: Bottom sheet with list rows (matches BenchPlayerSwapModal style)
 * Desktop: Modal with card grid
 */
export default function PlayerSelectionModal({
  isOpen,
  onClose,
  position,
  availablePlayers,
  onSelectPlayer,
  liveGameData,
  projections,
  inventory
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const isMobile = useIsMobile();
  const modalRef = useRef(null);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open (mobile only)
  useEffect(() => {
    if (!isOpen || !isMobile) return;
    
    const mainContent = document.querySelector('main') || document.body;
    
    document.body.style.overflow = 'hidden';
    mainContent.style.pointerEvents = 'none';
    
    return () => {
      document.body.style.overflow = 'unset';
      mainContent.style.pointerEvents = 'auto';
    };
  }, [isOpen, isMobile]);

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    let filtered = availablePlayers.filter(player => {
      const matchesSearch = 
        player.player_card.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.player_card.team_abbreviation.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    // Sort
    switch (sortBy) {
      case 'points':
        filtered.sort((a, b) => (b.total_fantasy_points || 0) - (a.total_fantasy_points || 0));
        break;
      case 'level':
        filtered.sort((a, b) => (b.card_level || 0) - (a.card_level || 0));
        break;
      case 'name':
      default:
        filtered.sort((a, b) => a.player_card.player_name.localeCompare(b.player_card.player_name));
        break;
    }

    return filtered;
  }, [availablePlayers, searchTerm, sortBy]);

  if (!isOpen) return null;

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

  const getPositionLabel = (pos) => {
    const labels = {
      'QB': 'Quarterback',
      'RB1': 'Running Back',
      'RB2': 'Running Back',
      'WR1': 'Wide Receiver',
      'WR2': 'Wide Receiver',
      'WR3': 'Wide Receiver',
      'TE': 'Tight End',
      'FLEX': 'Flex (RB/WR/TE)'
    };
    return labels[pos] || pos;
  };

  // Get game info for a player
  const getGameInfo = (player) => {
    if (!player) return { gameData: null, projection: null, isLive: false, isFinal: false };
    
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

  // Mobile Bottom Sheet View
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end">
        <div className="bg-primary-black-900 rounded-t-3xl w-full max-h-[85vh] flex flex-col border-t border-primary-black-700 shadow-2xl">
          {/* Header */}
          <div className="border-b border-primary-black-700 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-lg font-bold text-primary-black-50">Add to Lineup</h2>
                <p className="text-xs text-primary-black-400 mt-0.5">
                  Choose position for {position}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-primary-black-400 hover:text-primary-black-50 transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>
          </div>

          {/* Player List - Mobile (matches BenchPlayerSwapModal exactly) */}
          <div className="flex-1 overflow-y-auto">
            <div className="bg-primary-black-950/50">
              <h3 className="text-[10px] font-bold text-primary-black-500 uppercase tracking-wider px-4 py-2">
                Available Players
              </h3>
            </div>
            
            {filteredPlayers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
                <div className="text-5xl mb-3 opacity-30">🔍</div>
                <h3 className="text-lg font-semibold text-primary-black-50 mb-1">No players found</h3>
                <p className="text-sm text-primary-black-400">
                  {searchTerm ? 'Try a different search term' : 'No available players for this position'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-primary-black-800">
                {filteredPlayers.map((player) => {
                  const { gameData, projection, isLive, isFinal } = getGameInfo(player);
                  const appliedToken = inventory?.tokens?.find(t => t.applied_to_player_id === player.id && t.is_active);
                  
                  const projectedPoints = projection?.projected || 0;
                  const actualPoints = gameData?.currentPoints || player.actual_points || 0;
                  const displayPoints = isFinal || isLive ? actualPoints : projectedPoints;
                  const isLiveOrFinal = isLive || isFinal;

                  return (
                    <div
                      key={player.id}
                      onClick={() => onSelectPlayer(player)}
                      className={`
                        grid py-2 px-1 transition-all border-l-4 min-h-[56px]
                        ${isFinal
                          ? 'bg-primary-black-900/60 border-transparent cursor-pointer'
                          : 'bg-primary-black-900 border-transparent cursor-pointer'
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
                        <span className="px-1 py-0.5 bg-primary-black-700 text-primary-black-300 rounded text-[9px] font-semibold text-center">
                          BN
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

                      {/* COLUMN 3: Player Name & Info */}
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
                          {!gameData || !gameData.opponent ? (
                            <span className="text-primary-black-500 font-semibold">BYE</span>
                          ) : (
                            <>
                              {/* Game Status for live/final games */}
                              {(gameData.gameStatus === 'live' || gameData.gameStatus === 'halftime') && (
                                <span className="text-red-400 font-bold">🔴 LIVE</span>
                              )}
                              {gameData.gameStatus === 'final' && (
                                <span className="text-primary-black-400">Final</span>
                              )}
                              {/* Matchup and time */}
                              {gameData.gameStartTime && gameData.gameStatus === 'scheduled' && (
                                <span className="text-primary-black-400">
                                  {new Date(gameData.gameStartTime).toLocaleDateString('en-US', { weekday: 'short' })} {new Date(gameData.gameStartTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                </span>
                              )}
                              <span className="text-primary-black-300 font-semibold">
                                {gameData.isHome ? 'vs' : '@'} {gameData.opponent}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* COLUMN 4: FPTS */}
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
                })}
              </div>
            )}
          </div>

          {/* Footer - Cancel Button */}
          <div className="border-t border-primary-black-700 p-3">
            <button
              onClick={onClose}
              className="w-full py-3 bg-primary-black-800 hover:bg-primary-black-700 text-primary-black-300 rounded-xl font-semibold transition-colors text-base"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Modal View
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-primary-black-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col border border-primary-black-700">
        {/* Header */}
        <div className="border-b border-primary-black-700 px-6 py-4 bg-primary-black-900/50 rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-primary-black-50">Select Player</h2>
              <p className="text-sm text-primary-black-400 mt-1">
                Choose a {getPositionLabel(position)} to add to your lineup
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-primary-black-400 hover:text-primary-black-50 transition-colors text-3xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Search and Sort */}
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search by name or team..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 bg-primary-black-900 border border-primary-black-600 text-primary-black-50 rounded-lg focus:ring-2 focus:ring-primary-green-500 focus:border-transparent"
            />
            <div className="flex items-center gap-2">
              <label className="text-sm text-primary-black-400 whitespace-nowrap">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-primary-black-900 border border-primary-black-600 text-primary-black-50 rounded-lg focus:ring-2 focus:ring-primary-green-500 focus:border-transparent"
              >
                <option value="name">Name</option>
                <option value="points">Points</option>
                <option value="level">Level</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-2 text-sm text-primary-black-400">
            {filteredPlayers.length} {filteredPlayers.length === 1 ? 'player' : 'players'} available
          </div>
        </div>

        {/* Player List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredPlayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="text-6xl mb-4 opacity-30">🔍</div>
              <h3 className="text-xl font-semibold text-primary-black-50 mb-2">No players found</h3>
              <p className="text-primary-black-400">
                {searchTerm ? 'Try a different search term' : 'No available players for this position'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlayers.map((player) => {
                const appliedToken = inventory?.tokens?.find(t => t.applied_to_player_id === player.id && t.is_active);
                
                return (
                  <div
                    key={player.id}
                    onClick={() => onSelectPlayer(player)}
                    className="cursor-pointer transform hover:scale-105 transition-transform"
                  >
                    <PlayerCard
                      player={player}
                      draggable={false}
                      isLocked={false}
                      appliedToken={appliedToken}
                      gameData={liveGameData?.get(player.player_card.player_id)}
                      liveGameData={liveGameData}
                      projection={projections?.get(player.player_card.player_id)}
                      size="medium"
                      showStats={true}
                      className="hover:border-primary-green-500 hover:shadow-lg hover:shadow-primary-green-500/20"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-primary-black-700 px-6 py-4 bg-primary-black-900/50 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <p className="text-sm text-primary-black-500">
              💡 Click on a player card to add them to your lineup
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-primary-black-700 hover:bg-primary-black-600 text-primary-black-300 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

PlayerSelectionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  position: PropTypes.string,
  availablePlayers: PropTypes.array.isRequired,
  onSelectPlayer: PropTypes.func.isRequired,
  liveGameData: PropTypes.instanceOf(Map),
  projections: PropTypes.instanceOf(Map),
  inventory: PropTypes.object
};
