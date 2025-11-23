import { useState } from 'react';
import PropTypes from 'prop-types';

export default function TierAssignment({ cards, tierConfig, onConfirm }) {
  const [assignments, setAssignments] = useState({});
  const [selectedCard, setSelectedCard] = useState(null);

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

  const handleSelectCard = (cardId) => {
    setSelectedCard(cardId);
  };

  const handleAssignTier = (tier) => {
    if (!selectedCard) return;

    // Check if tier is full
    if (usedSlots[tier] >= totalSlots[tier]) {
      return;
    }

    const newAssignments = { ...assignments };
    
    // Assign tier to selected card
    newAssignments[selectedCard] = tier;
    setAssignments(newAssignments);
    
    // Auto-select next unassigned card for faster flow
    const nextUnassigned = cards.find(card => {
      const cardId = card.data?.id || card.id;
      return cardId !== selectedCard && !newAssignments[cardId];
    });
    
    if (nextUnassigned) {
      setSelectedCard(nextUnassigned.data?.id || nextUnassigned.id);
    } else {
      setSelectedCard(null);
    }
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

  const getTierInfo = (tier) => {
    const info = {
      all_star: { 
        label: 'All-Star', 
        icon: '⭐', 
        level: 'L7', 
        badgeClass: 'bg-purple-500',
        borderClass: 'border-purple-500'
      },
      starter: { 
        label: 'Starter', 
        icon: '🔥', 
        level: 'L5', 
        badgeClass: 'bg-blue-500',
        borderClass: 'border-blue-500'
      },
      role_player: { 
        label: 'Role Player', 
        icon: '💪', 
        level: 'L3', 
        badgeClass: 'bg-green-500',
        borderClass: 'border-green-500'
      },
      base: { 
        label: 'Base', 
        icon: '', 
        level: 'L1', 
        badgeClass: 'bg-gray-500',
        borderClass: 'border-gray-600'
      }
    };
    return info[tier] || info.base;
  };

  // User only needs to assign all available tier slots
  const totalAvailableSlots = totalSlots.all_star + totalSlots.starter + totalSlots.role_player;
  const totalAssignedSlots = Object.keys(assignments).length;
  const canConfirm = totalAssignedSlots >= totalAvailableSlots;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-primary-black-950">
      {/* Header */}
      <div className="flex-shrink-0 text-center pt-6 pb-4 px-4 border-b border-primary-black-700">
        <h2 className="text-3xl font-bold text-white mb-2">
          🚀 Boost Your Starter Pack!
        </h2>
        <p className="text-primary-black-300 mb-3">
          {selectedCard 
            ? '⬇️ Choose a tier below to upgrade your selected card' 
            : '👆 Select a card to upgrade, then pick its tier'
          }
        </p>
        <div className="text-sm text-primary-black-400">
          {totalAssignedSlots}/{totalAvailableSlots} upgrades assigned
        </div>
      </div>

      {/* Cards Grid - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {cards.map(card => {
            const cardData = card.data || card;
            const cardId = cardData.id;
            const assignedTier = assignments[cardId];
            const isSelected = selectedCard === cardId;
            const tierInfo = getTierInfo(assignedTier || 'base');

            return (
              <button
                key={cardId}
                onClick={() => handleSelectCard(cardId)}
                className={`
                  relative bg-primary-black-800 rounded-xl border-3 overflow-hidden transition-all
                  hover:scale-105 cursor-pointer
                  ${isSelected 
                    ? 'border-primary-green-500 shadow-lg shadow-primary-green-500/50 scale-105' 
                    : assignedTier 
                      ? tierInfo.borderClass + ' shadow-md' 
                      : 'border-primary-black-600 hover:border-primary-black-500'
                  }
                `}
              >
                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-primary-green-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10 animate-pulse">
                    SELECTED
                  </div>
                )}

                {/* Tier Badge */}
                {assignedTier && (
                  <div className={`absolute top-2 left-2 ${tierInfo.badgeClass} text-white text-xs font-bold px-2 py-1 rounded-lg z-10`}>
                    {tierInfo.icon} {tierInfo.level}
                  </div>
                )}

                {/* Player Info */}
                <div className="p-4">
                  <div className="text-center">
                    <div className="text-white font-bold text-sm mb-1 line-clamp-2">{cardData.player_name}</div>
                    <div className="text-primary-black-300 text-xs">{cardData.position}</div>
                    <div className="text-primary-black-400 text-xs">{cardData.team_abbreviation}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tier Selection Panel - Fixed Bottom */}
      <div className="flex-shrink-0 border-t-2 border-primary-black-700 bg-primary-black-900">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Instruction */}
          <div className="text-center mb-4">
            {selectedCard ? (
              <p className="text-primary-green-400 font-bold text-lg">
                🎯 Assign a tier to {cards.find(c => (c.data?.id || c.id) === selectedCard)?.data?.player_name || 'selected card'}
              </p>
            ) : (
              <p className="text-primary-black-400 text-sm">
                Select a card above to assign it a tier
              </p>
            )}
          </div>

          {/* Tier Buttons */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {totalSlots.all_star > 0 && (
              <button
                onClick={() => handleAssignTier('all_star')}
                disabled={!selectedCard || usedSlots.all_star >= totalSlots.all_star}
                className={`
                  relative p-4 rounded-xl border-2 transition-all
                  ${!selectedCard || usedSlots.all_star >= totalSlots.all_star
                    ? 'border-purple-500/20 bg-purple-500/5 opacity-40 cursor-not-allowed'
                    : 'border-purple-500 bg-purple-500/10 hover:bg-purple-500/20 hover:scale-105 cursor-pointer'
                  }
                `}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">⭐</div>
                  <div className="text-purple-400 font-bold text-lg mb-1">All-Star</div>
                  <div className="text-purple-300 text-sm mb-2">Level 7</div>
                  <div className="text-2xl font-bold text-white">
                    {usedSlots.all_star} / {totalSlots.all_star}
                  </div>
                  {usedSlots.all_star >= totalSlots.all_star && (
                    <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                      FULL
                    </div>
                  )}
                </div>
              </button>
            )}

            {totalSlots.starter > 0 && (
              <button
                onClick={() => handleAssignTier('starter')}
                disabled={!selectedCard || usedSlots.starter >= totalSlots.starter}
                className={`
                  relative p-4 rounded-xl border-2 transition-all
                  ${!selectedCard || usedSlots.starter >= totalSlots.starter
                    ? 'border-blue-500/20 bg-blue-500/5 opacity-40 cursor-not-allowed'
                    : 'border-blue-500 bg-blue-500/10 hover:bg-blue-500/20 hover:scale-105 cursor-pointer'
                  }
                `}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">🔥</div>
                  <div className="text-blue-400 font-bold text-lg mb-1">Starter</div>
                  <div className="text-blue-300 text-sm mb-2">Level 5</div>
                  <div className="text-2xl font-bold text-white">
                    {usedSlots.starter} / {totalSlots.starter}
                  </div>
                  {usedSlots.starter >= totalSlots.starter && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      FULL
                    </div>
                  )}
                </div>
              </button>
            )}

            {totalSlots.role_player > 0 && (
              <button
                onClick={() => handleAssignTier('role_player')}
                disabled={!selectedCard || usedSlots.role_player >= totalSlots.role_player}
                className={`
                  relative p-4 rounded-xl border-2 transition-all
                  ${!selectedCard || usedSlots.role_player >= totalSlots.role_player
                    ? 'border-green-500/20 bg-green-500/5 opacity-40 cursor-not-allowed'
                    : 'border-green-500 bg-green-500/10 hover:bg-green-500/20 hover:scale-105 cursor-pointer'
                  }
                `}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">��</div>
                  <div className="text-green-400 font-bold text-lg mb-1">Role Player</div>
                  <div className="text-green-300 text-sm mb-2">Level 3</div>
                  <div className="text-2xl font-bold text-white">
                    {usedSlots.role_player} / {totalSlots.role_player}
                  </div>
                  {usedSlots.role_player >= totalSlots.role_player && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      FULL
                    </div>
                  )}
                </div>
              </button>
            )}
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`w-full px-8 py-4 text-xl font-bold rounded-xl transition-all ${
              canConfirm
                ? 'bg-primary-green-500 text-primary-black-950 hover:bg-primary-green-400 hover:scale-105 shadow-lg'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {canConfirm 
              ? '✓ Confirm Upgrades & Continue' 
              : `Assign ${totalAvailableSlots - totalAssignedSlots} more upgrade${totalAvailableSlots - totalAssignedSlots !== 1 ? 's' : ''}`
            }
          </button>
          {canConfirm && (
            <p className="text-center mt-3 text-sm text-primary-black-400">
              Remaining cards will stay at Base tier (L1)
            </p>
          )}
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
