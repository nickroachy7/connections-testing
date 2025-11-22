import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import PlayerCard from './PlayerCard';

/**
 * PlayerSelectionModal Component
 * 
 * Modal for selecting a player to add to a specific lineup position.
 * Shows available players filtered by position with search and sort.
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
