import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import Header from './Header';

function CardReveal({ items, onRevealComplete, isStarterPack = false, tierConfig = null }) {
  const navigate = useNavigate();
  const { teamId } = useParams();
  const [revealedIndices, setRevealedIndices] = useState(new Set());
  const [allRevealed, setAllRevealed] = useState(false);
  const [tierAssignments, setTierAssignments] = useState({});
  const [showTierUI, setShowTierUI] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [shimmerIndex, setShimmerIndex] = useState(-1);
  const [cardsVisible, setCardsVisible] = useState(false);

  // Show cards (face-down) after a brief delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setCardsVisible(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Handle clicking a card to reveal it
  const handleCardReveal = (index) => {
    if (revealedIndices.has(index)) return; // Already revealed
    setRevealedIndices(prev => {
      const newSet = new Set([...prev, index]);
      // Check if all cards are now revealed
      if (newSet.size === items.length) {
        setTimeout(() => {
          setAllRevealed(true);
          if (isStarterPack && tierConfig) {
            setShowTierUI(true);
          }
        }, 500); // Brief delay after last card flip
      }
      return newSet;
    });
  };

  // Reveal all remaining cards
  const handleRevealAll = async () => {
    const unrevealed = items.map((_, i) => i).filter(i => !revealedIndices.has(i));
    for (let i = 0; i < unrevealed.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setRevealedIndices(prev => new Set([...prev, unrevealed[i]]));
    }
    setTimeout(() => {
      setAllRevealed(true);
      if (isStarterPack && tierConfig) {
        setShowTierUI(true);
      }
    }, 500);
  };

  useEffect(() => {
    if (!allRevealed) return;
    const rareCardIndices = items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => {
        if (item.type !== 'player') return false;
        const tier = item.data.rarity_tier || getTierFromPercentage(item.data.pull_percentage);
        return ['legendary', 'epic', 'rare'].includes(tier);
      })
      .map(({ idx }) => idx);
    if (rareCardIndices.length === 0) return;
    let currentIdx = 0;
    const shimmerInterval = setInterval(() => {
      setShimmerIndex(rareCardIndices[currentIdx]);
      currentIdx = (currentIdx + 1) % rareCardIndices.length;
      setTimeout(() => setShimmerIndex(-1), 1500);
    }, 3000);
    return () => clearInterval(shimmerInterval);
  }, [allRevealed, items]);

  const handleCardClickForTier = (cardIndex) => {
    if (!selectedTier) return;
    const config = tierConfig[selectedTier];
    const currentAssignments = tierAssignments[selectedTier] || [];
    if (currentAssignments.includes(cardIndex)) {
      setTierAssignments(prev => ({
        ...prev,
        [selectedTier]: currentAssignments.filter(idx => idx !== cardIndex)
      }));
      return;
    }
    if (currentAssignments.length >= config.slots) return;
    const existingTier = Object.keys(tierAssignments).find(tier => 
      tierAssignments[tier]?.includes(cardIndex)
    );
    if (existingTier) {
      setTierAssignments(prev => ({
        ...prev,
        [existingTier]: prev[existingTier].filter(idx => idx !== cardIndex),
        [selectedTier]: [...currentAssignments, cardIndex]
      }));
    } else {
      setTierAssignments(prev => ({
        ...prev,
        [selectedTier]: [...currentAssignments, cardIndex]
      }));
    }
  };

  const canConfirmTiers = () => {
    if (!tierConfig) return false;
    const totalSlots = Object.values(tierConfig).reduce((sum, config) => sum + config.slots, 0);
    const totalAssigned = Object.values(tierAssignments).flat().length;
    return totalAssigned === totalSlots;
  };

  const handleContinue = () => {
    if (showTierUI && tierConfig) {
      const tierAssignmentsByPlayerId = {};
      Object.keys(tierAssignments).forEach(tier => {
        tierAssignments[tier].forEach(cardIndex => {
          const playerItem = items[cardIndex];
          if (playerItem && playerItem.type === 'player') {
            tierAssignmentsByPlayerId[playerItem.data.id] = tier;
          }
        });
      });
      onRevealComplete?.(tierAssignmentsByPlayerId);
    } else {
      onRevealComplete?.();
    }
  };

  const getTierFromPercentage = (pullPercentage) => {
    if (pullPercentage <= 5) return 'legendary';
    if (pullPercentage <= 15) return 'epic';
    if (pullPercentage <= 35) return 'rare';
    if (pullPercentage <= 65) return 'common';
    return 'trash';
  };

  const getRarityStyles = (rarityTier, pullPercentage) => {
    const tier = rarityTier || (pullPercentage ? getTierFromPercentage(pullPercentage) : 'common');
    switch (tier) {
      case 'legendary':
        return {
          border: 'border-yellow-500',
          shimmerColor: 'from-yellow-500/0 via-yellow-400/40 to-yellow-500/0',
          glowColor: 'shadow-yellow-500/30',
          textColor: 'text-yellow-400',
          label: 'LEGENDARY',
          bgGlow: 'bg-gradient-to-br from-yellow-500/10 to-transparent'
        };
      case 'epic':
        return {
          border: 'border-purple-500',
          shimmerColor: 'from-purple-500/0 via-purple-400/35 to-purple-500/0',
          glowColor: 'shadow-purple-500/25',
          textColor: 'text-purple-400',
          label: 'EPIC',
          bgGlow: 'bg-gradient-to-br from-purple-500/10 to-transparent'
        };
      case 'rare':
        return {
          border: 'border-blue-500',
          shimmerColor: 'from-blue-500/0 via-blue-400/30 to-blue-500/0',
          glowColor: 'shadow-blue-500/20',
          textColor: 'text-blue-400',
          label: 'RARE',
          bgGlow: 'bg-gradient-to-br from-blue-500/5 to-transparent'
        };
      case 'common':
        return {
          border: 'border-gray-600',
          shimmerColor: 'from-gray-500/0 via-gray-400/15 to-gray-500/0',
          glowColor: 'shadow-gray-500/10',
          textColor: 'text-gray-400',
          label: '',
          bgGlow: ''
        };
      default:
        return {
          border: 'border-gray-700',
          shimmerColor: 'from-gray-600/0 via-gray-500/10 to-gray-600/0',
          glowColor: '',
          textColor: 'text-gray-500',
          label: '',
          bgGlow: ''
        };
    }
  };

  const getPositionAbbr = (position) => {
    const map = { 'Quarterback': 'QB', 'Running Back': 'RB', 'Wide Receiver': 'WR', 'Tight End': 'TE', 'Kicker': 'K', 'Defense': 'DEF' };
    return map[position] || position;
  };

  return (
    <div className="fixed inset-0 bg-primary-black-950 flex flex-col">
      <Header />
      <div className="flex-shrink-0 text-center pt-3 pb-2 px-4">
        <h2 className="text-xl font-bold text-white">
          {showTierUI ? 'Assign Your Tier Boosts!' : 'Pack Opened!'}
        </h2>
        <p className="text-xs text-primary-black-400 mt-1">
          {showTierUI ? (selectedTier ? `Tap a player for ${selectedTier.replace('_', ' ')}` : 'Select a tier, then tap players') : (allRevealed ? `You received ${items.length} cards` : 'Tap cards to reveal them')}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-24">
        <div className="grid grid-cols-3 gap-2 max-w-lg mx-auto">
          {items.map((item, index) => {
            const isRevealed = revealedIndices.has(index);
            const isShimmering = shimmerIndex === index;
            const rarityStyle = getRarityStyles(item.data.rarity_tier, item.data.pull_percentage);
            const assignedTier = Object.keys(tierAssignments).find(tier => tierAssignments[tier]?.includes(index));
            return (
              <div
                key={index}
                className={`relative aspect-[3/4] transition-all duration-500 ease-out ${cardsVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75 translate-y-4'}`}
                style={{ 
                  transitionDelay: cardsVisible ? `${index * 80}ms` : '0ms',
                  perspective: '1000px'
                }}
                onClick={() => {
                  if (!isRevealed && !showTierUI) {
                    handleCardReveal(index);
                  } else if (showTierUI && item.type === 'player') {
                    handleCardClickForTier(index);
                  }
                }}
              >
                {/* Card flip container */}
                <div 
                  className={`relative w-full h-full transition-transform duration-500 ease-out`}
                  style={{ 
                    transformStyle: 'preserve-3d',
                    transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)'
                  }}
                >
                  {/* Card Back (face-down) */}
                  <div 
                    className="absolute inset-0 w-full h-full rounded-xl border-2 border-primary-black-600 bg-gradient-to-br from-primary-black-700 via-primary-black-800 to-primary-black-900 overflow-hidden shadow-md shadow-black/30 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    {/* Card back design */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-primary-black-600/50 border-2 border-primary-black-500/50 flex items-center justify-center">
                        <span className="text-2xl">🏈</span>
                      </div>
                    </div>
                    {/* Decorative pattern */}
                    <div className="absolute inset-2 border border-primary-black-600/30 rounded-lg pointer-events-none" />
                    <div className="absolute inset-4 border border-primary-black-600/20 rounded-lg pointer-events-none" />
                    {/* Tap to reveal hint */}
                    <div className="absolute bottom-2 left-0 right-0 text-center">
                      <span className="text-[10px] text-primary-black-400 font-medium">Tap to reveal</span>
                    </div>
                  </div>

                  {/* Card Front (face-up) */}
                  <div 
                    className="absolute inset-0 w-full h-full"
                    style={{ 
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)'
                    }}
                  >
                    {item.type === 'player' ? (
                      <div className={`relative w-full h-full rounded-xl border-2 ${rarityStyle.border} bg-primary-black-800/95 overflow-hidden shadow-md shadow-black/30 transition-all duration-300 ${isShimmering ? `shadow-lg ${rarityStyle.glowColor}` : ''} ${showTierUI && !assignedTier ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''} ${assignedTier ? 'ring-2 ring-primary-green-500 ring-offset-2 ring-offset-primary-black-950' : ''}`}>
                        {rarityStyle.bgGlow && <div className={`absolute inset-0 ${rarityStyle.bgGlow} pointer-events-none`} />}
                        {isShimmering && <div className={`absolute inset-0 bg-gradient-to-r ${rarityStyle.shimmerColor} pointer-events-none z-20`} style={{ animation: 'shimmerSlide 1.5s ease-in-out' }} />}
                        <div className="absolute top-2 left-2 z-10">
                          <span className="px-1.5 py-0.5 bg-primary-black-700/90 text-primary-black-200 rounded text-[10px] font-semibold backdrop-blur-sm">{getPositionAbbr(item.data.position)}</span>
                        </div>
                        {assignedTier && <div className="absolute top-2 right-2 z-10"><span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-primary-green-500 text-white">{assignedTier.replace('_', ' ')}</span></div>}
                        {!showTierUI && rarityStyle.label && <div className="absolute top-2 right-2 z-10"><span className={`text-sm ${rarityStyle.textColor}`}>{item.data.rarity_tier === 'legendary' ? '✨' : item.data.rarity_tier === 'epic' ? '💎' : item.data.rarity_tier === 'rare' ? '🔷' : ''}</span></div>}
                        <div className="relative h-full flex flex-col p-2 pt-8">
                          <div className="flex-grow"></div>
                          <div className="mt-auto">
                            <div className="text-xs font-bold text-primary-black-50 leading-tight">{(() => { const name = item.data.player_name; const parts = name.split(' '); if (parts.length >= 2) { return `${parts[0][0]}. ${parts.slice(1).join(' ')}`; } return name; })()}</div>
                            <div className="text-[10px] text-primary-black-400 font-medium leading-tight mt-0.5">{item.data.team || 'NFL'}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full h-full rounded-xl border-2 border-primary-green-500/50 bg-primary-black-800/95 overflow-hidden shadow-md shadow-black/30">
                        <div className="absolute top-2 left-2 z-10"><span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-primary-green-500/20 text-primary-green-400">TOKEN</span></div>
                        <div className="relative h-full flex flex-col p-2 pt-8">
                          <div className="flex-grow flex items-center justify-center">
                            <div className="w-10 h-10 flex items-center justify-center bg-primary-green-500/20 border-2 border-primary-green-500/50 rounded-full"><span className="text-xl">{item.data.emoji || '🎯'}</span></div>
                          </div>
                          <div className="mt-auto">
                            <div className="text-xs font-bold text-primary-black-50 leading-tight">{item.data.token_name}</div>
                            <div className="text-[10px] text-primary-green-400 font-medium leading-tight mt-0.5">+{item.data.bonus_points || item.data.multiplier || '?'} pts</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {item.type === 'player' && rarityStyle.label && !showTierUI && isRevealed && <div className={`absolute -bottom-4 left-0 right-0 text-center text-[9px] font-bold ${rarityStyle.textColor}`}>{rarityStyle.label}</div>}
              </div>
            );
          })}
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-primary-black-950 via-primary-black-950 to-transparent pt-8 pb-6 px-4">
        {showTierUI && tierConfig && (
          <div className="mb-4 space-y-3">
            <div className="flex gap-2 justify-center flex-wrap">
              {Object.keys(tierConfig).map(tier => {
                const config = tierConfig[tier];
                const assigned = tierAssignments[tier] || [];
                const isFull = assigned.length >= config.slots;
                return (
                  <button key={tier} onClick={() => setSelectedTier(selectedTier === tier ? null : tier)} disabled={isFull} className={`px-3 py-2 rounded-lg font-bold text-xs transition-all ${selectedTier === tier ? 'bg-primary-green-500 text-white scale-105' : isFull ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-primary-black-700 hover:bg-primary-black-600 text-white'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config.icon}</span>
                      <div className="text-left">
                        <div className="capitalize">{tier.replace('_', ' ')}</div>
                        <div className="text-[10px] opacity-70">{assigned.length}/{config.slots}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="text-center space-y-3">
          {/* Reveal All button - shown when cards are visible but not all revealed */}
          {cardsVisible && !allRevealed && revealedIndices.size < items.length && (
            <button 
              onClick={handleRevealAll}
              className="px-6 py-2 rounded-lg font-semibold text-sm bg-primary-black-700 hover:bg-primary-black-600 text-primary-black-200 transition-all"
            >
              Reveal All ({items.length - revealedIndices.size} remaining)
            </button>
          )}
          {allRevealed && (
            <button onClick={handleContinue} disabled={showTierUI && !canConfirmTiers()} className={`px-8 py-3 rounded-xl font-bold text-base transition-all ${(!showTierUI || canConfirmTiers()) ? 'bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 hover:scale-105 shadow-lg' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
              {showTierUI ? (canConfirmTiers() ? 'Confirm & Continue' : 'Assign All Players') : 'Continue'}
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes shimmerSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
    </div>
  );
}

CardReveal.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({ type: PropTypes.string.isRequired, data: PropTypes.object.isRequired })).isRequired,
  onRevealComplete: PropTypes.func,
  isStarterPack: PropTypes.bool,
  tierConfig: PropTypes.object,
};

export default CardReveal;
