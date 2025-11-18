import { useState } from 'react';
import PropTypes from 'prop-types';

export default function TierAssignment({ cards, tierConfig, onConfirm }) {
  const [assignments, setAssignments] = useState({});
  const [selectedCards, setSelectedCards] = useState([]);

  // Calculate available tier slots
  const totalSlots = {
    all_star: tierConfig.all_star || 0,
    starter: tierConfig.starter || 0,
    role_player: tierConfig.role_player || 0
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
    // Convert assignments to array format for Edge Function
    const tierAssignments = cards.map(card => ({
      player_card_id: card.id,
      tier: assignments[card.id] || 'base'
    }));

    console.log('TierAssignment - handleConfirm called')
    console.log('TierAssignment - assignments:', assignments)
    console.log('TierAssignment - tierAssignments:', tierAssignments)
    
    onConfirm(tierAssignments);
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
          <p className="text-dk-white-muted text-lg">
            Select cards and assign them to tiers. 
            {totalSlots.all_star > 0 && ` ${totalSlots.all_star} All-Star,`}
            {totalSlots.starter > 0 && ` ${totalSlots.starter} Starter${totalSlots.starter > 1 ? 's' : ''},`}
            {totalSlots.role_player > 0 && ` ${totalSlots.role_player} Role Player${totalSlots.role_player > 1 ? 's' : ''}`}
            . Remaining cards will be Base tier (Level 1).
          </p>
        </div>

        {/* Tier Slots Summary */}
        <div className="bg-dk-black-secondary rounded-lg p-6 mb-6 border border-dk-black-light">
          <h2 className="text-xl font-dk-display font-bold text-dk-white-primary mb-4">
            Available Tier Slots
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {totalSlots.all_star > 0 && (
              <div className="bg-purple-500/20 border border-purple-500 rounded-lg p-4">
                <div className="text-purple-400 font-bold">All-Star</div>
                <div className="text-sm text-purple-300">Level 7</div>
                <div className="text-2xl text-white mt-2">
                  {usedSlots.all_star} / {totalSlots.all_star}
                </div>
              </div>
            )}
            {totalSlots.starter > 0 && (
              <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4">
                <div className="text-blue-400 font-bold">Starter</div>
                <div className="text-sm text-blue-300">Level 5</div>
                <div className="text-2xl text-white mt-2">
                  {usedSlots.starter} / {totalSlots.starter}
                </div>
              </div>
            )}
            {totalSlots.role_player > 0 && (
              <div className="bg-green-500/20 border border-green-500 rounded-lg p-4">
                <div className="text-green-400 font-bold">Role Player</div>
                <div className="text-sm text-green-300">Level 3</div>
                <div className="text-2xl text-white mt-2">
                  {usedSlots.role_player} / {totalSlots.role_player}
                </div>
              </div>
            )}
          </div>

          {/* Assignment Buttons */}
          <div className="flex gap-4 mt-6">
            {totalSlots.all_star > 0 && (
              <button
                onClick={() => handleAssignTier('all_star')}
                disabled={selectedCards.length === 0 || usedSlots.all_star >= totalSlots.all_star}
                className="px-6 py-3 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign All-Star
              </button>
            )}
            {totalSlots.starter > 0 && (
              <button
                onClick={() => handleAssignTier('starter')}
                disabled={selectedCards.length === 0 || usedSlots.starter >= totalSlots.starter}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign Starter
              </button>
            )}
            {totalSlots.role_player > 0 && (
              <button
                onClick={() => handleAssignTier('role_player')}
                disabled={selectedCards.length === 0 || usedSlots.role_player >= totalSlots.role_player}
                className="px-6 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign Role Player
              </button>
            )}
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {cards.map(card => {
            const assignedTier = assignments[card.id];
            const isSelected = selectedCards.includes(card.id);

            return (
              <div
                key={card.id}
                onClick={() => !assignedTier && handleCardSelect(card.id)}
                className={`
                  relative bg-dk-black-secondary rounded-lg p-4 border-2 cursor-pointer transition-all
                  ${isSelected ? 'border-dk-green-primary scale-105' : 'border-dk-black-light'}
                  ${assignedTier ? 'opacity-75' : 'hover:border-dk-green-primary/50'}
                `}
              >
                {/* Player Info */}
                <div className="text-center">
                  <div className="text-white font-bold mb-1">{card.player_name}</div>
                  <div className="text-dk-white-muted text-sm">{card.position}</div>
                  <div className="text-dk-white-muted text-sm">{card.team_abbreviation}</div>
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
            className="px-8 py-4 bg-dk-green-primary text-dk-black-primary text-xl font-bold rounded-lg hover:bg-dk-green-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {canConfirm 
              ? 'Confirm Tier Assignments' 
              : `Assign tiers to ${totalAvailableSlots - totalAssignedSlots} more card${totalAvailableSlots - totalAssignedSlots !== 1 ? 's' : ''}`
            }
          </button>
        </div>
      </div>
    </div>
  );
}

TierAssignment.propTypes = {
  cards: PropTypes.arrayOf(PropTypes.object).isRequired,
  tierConfig: PropTypes.object.isRequired,
  onConfirm: PropTypes.func.isRequired
};
