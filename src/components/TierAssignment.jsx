import { useState } from 'react';
import PropTypes from 'prop-types';

export default function TierAssignment({ cards, tierConfig, onConfirm }) {
  const [assignments, setAssignments] = useState({});
  const [selectedCards, setSelectedCards] = useState([]);

  // Calculate available tier slots from transformed config
  const totalSlots = {
    all_star: tierConfig.all_star?.slots || 0,
    starter: tierConfig.starter?.slots || 0,
    role_player: tierConfig.role_player?.slots || 0
  };

  // Calculate used slots
  const usedSlots = {
    all_star: Object.values(assignments).filter(t => t === 'all_star').length,
    starter: Object.values(assignments).filter(t => t === 'starter').length,
    role_player: Object.values(assignments).filter(t => t === 'role_player').length
  };

  const handleCardSelect = (cardId) => {
    if (selectedCards.includes(cardId)) {
      setSelectedCards(selectedCards.filter(id => id !== cardId));
    } else {
      setSelectedCards([...selectedCards, cardId]);
    }
  };

  const handleAssignTier = (tier) => {
    if (selectedCards.length === 0) {
      alert('Please select at least one card');
      return;
    }

    if (usedSlots[tier] + selectedCards.length > totalSlots[tier]) {
      alert(`Not enough ${tier} slots available`);
      return;
    }

    const newAssignments = { ...assignments };
    selectedCards.forEach(cardId => {
      newAssignments[cardId] = tier;
    });

    setAssignments(newAssignments);
    setSelectedCards([]);
  };

  const handleClearAssignment = (cardId) => {
    const newAssignments = { ...assignments };
    delete newAssignments[cardId];
    setAssignments(newAssignments);
  };

  const handleConfirm = () => {
    // Convert assignments to the format expected by parent (player_id -> tier)
    const formattedAssignments = {};
    cards.forEach(card => {
      const playerId = card.data?.id || card.id;
      formattedAssignments[playerId] = assignments[playerId] || 'base';
    });

    console.log('TierAssignment - handleConfirm called')
    console.log('TierAssignment - assignments:', assignments)
    console.log('TierAssignment - formattedAssignments:', formattedAssignments)
    
    onConfirm(formattedAssignments);
  };

  const getTierLabel = (tier) => {
    const labels = {
      all_star: 'All-Star',
      starter: 'Starter',
      role_player: 'Role Player',
      base: 'Base'
    };
    return labels[tier] || tier;
  };

  const getTierLevel = (tier) => {
    const levels = {
      all_star: 'L7',
      starter: 'L5',
      role_player: 'L3',
      base: 'L1'
    };
    return levels[tier] || 'L1';
  };

  const getTierColor = (tier) => {
    const colors = {
      all_star: 'bg-purple-500',
      starter: 'bg-blue-500',
      role_player: 'bg-green-500',
      base: 'bg-gray-500'
    };
    return colors[tier] || 'bg-gray-500';
  };

  // User only needs to assign all available tier slots, remaining cards will be Base
  const totalAvailableSlots = totalSlots.all_star + totalSlots.starter + totalSlots.role_player;
  const totalAssignedSlots = Object.keys(assignments).length;
  const canConfirm = totalAssignedSlots >= totalAvailableSlots;

  return (
    <div className="min-h-screen bg-dk-black-primary p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-dk-display font-bold text-dk-white-primary mb-2">
            Assign Tiers to Your Starter Pack
          </h1>
          <p className="text-dk-white-muted text-lg mb-4">
            Your starter pack comes with tier boosts! Select cards and assign them to higher tiers for better starting levels.
          </p>
          <div className="inline-flex items-center gap-2 bg-dk-green-primary/10 border border-dk-green-primary/30 rounded-lg px-6 py-3">
            <span className="text-2xl">📋</span>
            <div className="text-left">
              <div className="text-dk-green-primary font-bold text-lg">
                Assign {totalAvailableSlots} Cards Total
              </div>
              <div className="text-dk-white-muted text-sm">
                {totalSlots.all_star > 0 && `${totalSlots.all_star} All-Star${totalSlots.all_star > 1 ? 's' : ''}`}
                {totalSlots.all_star > 0 && (totalSlots.starter > 0 || totalSlots.role_player > 0) && ', '}
                {totalSlots.starter > 0 && `${totalSlots.starter} Starter${totalSlots.starter > 1 ? 's' : ''}`}
                {totalSlots.starter > 0 && totalSlots.role_player > 0 && ', '}
                {totalSlots.role_player > 0 && `${totalSlots.role_player} Role Player${totalSlots.role_player > 1 ? 's' : ''}`}
              </div>
            </div>
          </div>
        </div>

        {/* Tier Slots Summary */}
        <div className="bg-dk-black-secondary rounded-lg p-6 mb-6 border border-dk-black-light">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-dk-display font-bold text-dk-white-primary">
              Tier Slots Progress
            </h2>
            <div className="text-dk-white-muted text-sm">
              {totalAssignedSlots} / {totalAvailableSlots} assigned
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-3 bg-dk-black-primary rounded-full overflow-hidden mb-6">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-green-500 transition-all duration-500"
              style={{
                width: `${(totalAssignedSlots / totalAvailableSlots) * 100}%`
              }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {totalSlots.all_star > 0 && (
              <div className={`bg-purple-500/20 border-2 rounded-lg p-4 transition-all ${
                usedSlots.all_star === totalSlots.all_star 
                  ? 'border-purple-500 shadow-lg shadow-purple-500/20' 
                  : 'border-purple-500/50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-purple-400 font-bold">All-Star</div>
                  {usedSlots.all_star === totalSlots.all_star && (
                    <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">✓ Complete</span>
                  )}
                </div>
                <div className="text-sm text-purple-300 mb-2">Starts at Level 7</div>
                <div className="text-3xl text-white font-bold">
                  {usedSlots.all_star} / {totalSlots.all_star}
                </div>
                {usedSlots.all_star < totalSlots.all_star && (
                  <div className="text-xs text-purple-300 mt-2">
                    {totalSlots.all_star - usedSlots.all_star} more needed
                  </div>
                )}
              </div>
            )}
            {totalSlots.starter > 0 && (
              <div className={`bg-blue-500/20 border-2 rounded-lg p-4 transition-all ${
                usedSlots.starter === totalSlots.starter 
                  ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
                  : 'border-blue-500/50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-blue-400 font-bold">Starter</div>
                  {usedSlots.starter === totalSlots.starter && (
                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">✓ Complete</span>
                  )}
                </div>
                <div className="text-sm text-blue-300 mb-2">Starts at Level 5</div>
                <div className="text-3xl text-white font-bold">
                  {usedSlots.starter} / {totalSlots.starter}
                </div>
                {usedSlots.starter < totalSlots.starter && (
                  <div className="text-xs text-blue-300 mt-2">
                    {totalSlots.starter - usedSlots.starter} more needed
                  </div>
                )}
              </div>
            )}
            {totalSlots.role_player > 0 && (
              <div className={`bg-green-500/20 border-2 rounded-lg p-4 transition-all ${
                usedSlots.role_player === totalSlots.role_player 
                  ? 'border-green-500 shadow-lg shadow-green-500/20' 
                  : 'border-green-500/50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-green-400 font-bold">Role Player</div>
                  {usedSlots.role_player === totalSlots.role_player && (
                    <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">✓ Complete</span>
                  )}
                </div>
                <div className="text-sm text-green-300 mb-2">Starts at Level 3</div>
                <div className="text-3xl text-white font-bold">
                  {usedSlots.role_player} / {totalSlots.role_player}
                </div>
                {usedSlots.role_player < totalSlots.role_player && (
                  <div className="text-xs text-green-300 mt-2">
                    {totalSlots.role_player - usedSlots.role_player} more needed
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Assignment Instructions */}
          <div className="bg-dk-green-primary/10 border border-dk-green-primary/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <div className="text-dk-green-primary font-bold mb-1">How to Assign Tiers</div>
                <ol className="text-dk-white-muted text-sm space-y-1 list-decimal list-inside">
                  <li>Select one or more cards by clicking on them</li>
                  <li>Click an "Assign" button below to assign the selected tier</li>
                  <li>Repeat until all tier slots are filled</li>
                  <li>Unassigned cards will be Base tier (Level 1)</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Assignment Buttons */}
          <div className="flex gap-4 mt-6">
            {totalSlots.all_star > 0 && (
              <button
                onClick={() => handleAssignTier('all_star')}
                disabled={selectedCards.length === 0 || usedSlots.all_star >= totalSlots.all_star}
                className="flex-1 px-6 py-4 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <div className="flex flex-col items-center gap-1">
                  <span>Assign All-Star ⭐</span>
                  <span className="text-xs opacity-80">
                    {usedSlots.all_star}/{totalSlots.all_star} slots used
                  </span>
                </div>
              </button>
            )}
            {totalSlots.starter > 0 && (
              <button
                onClick={() => handleAssignTier('starter')}
                disabled={selectedCards.length === 0 || usedSlots.starter >= totalSlots.starter}
                className="flex-1 px-6 py-4 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <div className="flex flex-col items-center gap-1">
                  <span>Assign Starter 🔥</span>
                  <span className="text-xs opacity-80">
                    {usedSlots.starter}/{totalSlots.starter} slots used
                  </span>
                </div>
              </button>
            )}
            {totalSlots.role_player > 0 && (
              <button
                onClick={() => handleAssignTier('role_player')}
                disabled={selectedCards.length === 0 || usedSlots.role_player >= totalSlots.role_player}
                className="flex-1 px-6 py-4 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <div className="flex flex-col items-center gap-1">
                  <span>Assign Role Player 💪</span>
                  <span className="text-xs opacity-80">
                    {usedSlots.role_player}/{totalSlots.role_player} slots used
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Selected Cards Counter */}
        {selectedCards.length > 0 && (
          <div className="bg-dk-green-primary/20 border border-dk-green-primary rounded-lg p-3 mb-6 text-center animate-fade-in">
            <span className="text-dk-green-primary font-bold">
              {selectedCards.length} card{selectedCards.length !== 1 ? 's' : ''} selected
            </span>
            <span className="text-dk-white-muted ml-2">- Click an "Assign" button above</span>
          </div>
        )}

        {/* Cards Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {cards.map(card => {
            const cardData = card.data || card;
            const cardId = cardData.id;
            const assignedTier = assignments[cardId];
            const isSelected = selectedCards.includes(cardId);

            return (
              <div
                key={cardId}
                onClick={() => !assignedTier && handleCardSelect(cardId)}
                className={`
                  relative bg-dk-black-secondary rounded-lg p-4 border-2 cursor-pointer transition-all
                  ${isSelected ? 'border-dk-green-primary scale-105' : 'border-dk-black-light'}
                  ${assignedTier ? 'opacity-75' : 'hover:border-dk-green-primary/50'}
                `}
              >
                {/* Player Info */}
                <div className="text-center">
                  <div className="text-white font-bold mb-1">{cardData.player_name}</div>
                  <div className="text-dk-white-muted text-sm">{cardData.position}</div>
                  <div className="text-dk-white-muted text-sm">{cardData.team_abbreviation}</div>
                </div>

                {/* Tier Badge */}
                {assignedTier && (
                  <div className="mt-3">
                    <div className={`${getTierColor(assignedTier)} text-white text-xs font-bold py-1 px-2 rounded text-center`}>
                      {getTierLabel(assignedTier)}
                    </div>
                    <div className="text-center text-dk-white-muted text-xs mt-1">
                      {getTierLevel(assignedTier)}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearAssignment(card.id);
                      }}
                      className="w-full mt-2 text-red-400 text-xs hover:text-red-300"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-dk-green-primary text-dk-black-primary rounded-full w-6 h-6 flex items-center justify-center font-bold">
                    ✓
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Confirm Button */}
        <div className="flex justify-center">
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`px-8 py-4 text-xl font-bold rounded-lg transition-all ${
              canConfirm
                ? 'bg-dk-green-primary text-dk-black-primary hover:bg-dk-green-secondary hover:scale-105 shadow-lg'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {canConfirm 
              ? '✓ Confirm Tier Assignments' 
              : `⚠️ Assign ${totalAvailableSlots - totalAssignedSlots} more tier${totalAvailableSlots - totalAssignedSlots !== 1 ? 's' : ''}`
            }
          </button>
        </div>

        {!canConfirm && (
          <div className="text-center mt-4 text-dk-white-muted text-sm">
            <p>You must assign all {totalAvailableSlots} tier slots before continuing.</p>
            <p className="mt-1">Remaining cards will automatically be Base tier (Level 1).</p>
          </div>
        )}
      </div>
    </div>
  );
}

TierAssignment.propTypes = {
  cards: PropTypes.arrayOf(PropTypes.object).isRequired,
  tierConfig: PropTypes.object.isRequired,
  onConfirm: PropTypes.func.isRequired
};
