import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import Header from './Header';

function CardReveal({ items, onRevealComplete, isStarterPack = false, tierConfig = null }) {
  const navigate = useNavigate();
  const { teamId } = useParams();
  const [revealedIndices, setRevealedIndices] = useState(new Set());
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isShuffling, setIsShuffling] = useState(true);
  const [allRevealed, setAllRevealed] = useState(false);
  const [tierAssignments, setTierAssignments] = useState({});
  const [showTierUI, setShowTierUI] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [centerCardIndex, setCenterCardIndex] = useState(0);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    // Trigger shuffle animation on mount
    const timer = setTimeout(() => {
      setIsShuffling(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Detect which card is in the center
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      
      const cards = container.querySelectorAll('[data-card-index]');
      let closestIndex = 0;
      let closestDistance = Infinity;
      
      cards.forEach((card, idx) => {
        const cardRect = card.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const distance = Math.abs(containerCenter - cardCenter);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = idx;
        }
      });
      
      setCenterCardIndex(closestIndex);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Center first card after animation completes
    const scrollTimer = setTimeout(() => {
      const firstCard = container.querySelector('[data-card-index="0"]');
      if (firstCard) {
        firstCard.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest', 
          inline: 'center' 
        });
        // Trigger initial center detection
        setTimeout(handleScroll, 100);
      }
    }, 200);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimer);
    };
  }, [items.length]);

  useEffect(() => {
    // Check if all cards are revealed
    if (revealedIndices.size === items.length && items.length > 0) {
      setAllRevealed(true);
      // For starter packs, show tier assignment UI after all cards revealed
      if (isStarterPack && tierConfig) {
        setShowTierUI(true);
      }
    }
  }, [revealedIndices, items.length, isStarterPack, tierConfig]);

  const handleCardClick = (index) => {
    if (!revealedIndices.has(index)) {
      setRevealedIndices(prev => new Set([...prev, index]));
    }
  };

  const handleRevealAll = () => {
    // Reveal all cards with a slight delay between each
    items.forEach((_, index) => {
      setTimeout(() => {
        setRevealedIndices(prev => new Set([...prev, index]));
      }, index * 100);
    });
  };

  const handleCardClickForTier = (cardIndex) => {
    if (!selectedTier) return;
    
    const config = tierConfig[selectedTier];
    const currentAssignments = tierAssignments[selectedTier] || [];
    
    // Check if this card is already assigned to this tier
    if (currentAssignments.includes(cardIndex)) {
      // Unassign
      setTierAssignments(prev => ({
        ...prev,
        [selectedTier]: currentAssignments.filter(idx => idx !== cardIndex)
      }));
      return;
    }
    
    // Check if tier is full
    if (currentAssignments.length >= config.slots) {
      return;
    }
    
    // Check if card is assigned to another tier
    const existingTier = Object.keys(tierAssignments).find(tier => 
      tierAssignments[tier]?.includes(cardIndex)
    );
    
    if (existingTier) {
      // Remove from old tier
      setTierAssignments(prev => ({
        ...prev,
        [existingTier]: prev[existingTier].filter(idx => idx !== cardIndex),
        [selectedTier]: [...currentAssignments, cardIndex]
      }));
    } else {
      // Add to new tier
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
      // Convert tier assignments from card indices to player IDs
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

  const getGlowColor = (pullPercentage) => {
    if (!pullPercentage) {
      // Token or no pull percentage
      return {
        border: 'border-gray-600',
        shadow: 'hover:shadow-[0_0_8px_rgba(107,114,128,0.3)]',
        glow: 'rgba(107, 114, 128, 0.15)',
        textColor: 'text-gray-400'
      };
    }
    
    // Legendary: 0-5%
    if (pullPercentage <= 5) {
      return {
        border: 'border-yellow-500',
        shadow: 'hover:shadow-[0_0_15px_rgba(234,179,8,0.5)]',
        glow: 'rgba(234, 179, 8, 0.2)',
        textColor: 'text-yellow-400'
      };
    }
    
    // Epic: 5-15%
    if (pullPercentage <= 15) {
      return {
        border: 'border-purple-500',
        shadow: 'hover:shadow-[0_0_12px_rgba(168,85,247,0.4)]',
        glow: 'rgba(168, 85, 247, 0.15)',
        textColor: 'text-purple-400'
      };
    }
    
    // Rare: 15-40%
    if (pullPercentage <= 40) {
      return {
        border: 'border-blue-500',
        shadow: 'hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]',
        glow: 'rgba(59, 130, 246, 0.12)',
        textColor: 'text-blue-400'
      };
    }
    
    return {
      border: 'border-gray-600',
      shadow: 'hover:shadow-[0_0_8px_rgba(107,114,128,0.3)]',
      glow: 'rgba(107, 114, 128, 0.15)',
      textColor: 'text-gray-400'
    };
  };

  return (
    <div className="fixed inset-0 bg-primary-black-950 flex flex-col">
      {/* Header */}
      <Header />
      
      {/* Title Section - Minimal padding */}
      <div className="flex-shrink-0 text-center pt-2 pb-1 px-4">
        <h2 className="text-xl font-bold text-white">
          {showTierUI ? 'Assign Your Tier Boosts!' : 'Your Pull!'}
        </h2>
        <p className="text-xs text-primary-black-300 mt-0.5">
          {showTierUI 
            ? selectedTier 
              ? `Click a player for ${selectedTier}`
              : 'Select tier, then click players'
            : 'Click cards to reveal'
          }
        </p>
      </div>

      {/* Cards Container - Horizontal scroll carousel - Fixed position */}
      <div className="flex-shrink-0 flex items-center overflow-hidden" style={{ height: '60vh', maxHeight: '550px', marginTop: '5vh' }}>
        <div 
          ref={scrollContainerRef}
          className="w-full h-full overflow-x-auto overflow-y-hidden scrollbar-hide snap-x snap-mandatory scroll-smooth"
          style={{
            scrollPaddingLeft: 'calc(50% - 110px)',
            scrollPaddingRight: 'calc(50% - 110px)'
          }}
        >
          <div className="inline-flex items-center gap-8 h-full px-[calc(50vw-110px)]">
          {items.map((item, index) => {
            const isRevealed = revealedIndices.has(index);
            const isHovered = hoveredIndex === index;
            const glowStyle = getGlowColor(item.data.pull_percentage);
            const assignedTier = Object.keys(tierAssignments).find(tier => 
              tierAssignments[tier]?.includes(index)
            );
            const isCenterCard = index === centerCardIndex;
              
            return (
              <div
                key={index}
                data-card-index={index}
                className={`
                  flex-shrink-0 snap-center transition-all duration-500 ease-out flex flex-col items-center gap-2
                  ${isShuffling ? 'opacity-0 translate-y-[-50px]' : 'opacity-100 translate-y-0'}
                  ${showTierUI && selectedTier && item.type === 'player' && isRevealed ? 'cursor-pointer' : ''}
                `}
                style={{
                  transitionDelay: isShuffling ? `${index * 80}ms` : '0ms',
                  transform: isCenterCard ? 'scale(1.2)' : 'scale(1)',
                  transition: 'transform 0.3s ease-out'
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Card Flip Container */}
                <div
                  className={`
                    relative transition-transform duration-700 cursor-pointer
                    ${isRevealed ? '[transform:rotateY(180deg)]' : ''}
                  `}
                  style={{ 
                    width: '220px',
                    perspective: '1000px',
                    transformStyle: 'preserve-3d',
                    aspectRatio: '0.64'
                  }}
                  onClick={() => {
                    if (!isRevealed) {
                      handleCardClick(index);
                    } else if (showTierUI && item.type === 'player') {
                      handleCardClickForTier(index);
                    }
                  }}
                >
                  {/* Card Back */}
                  <div
                    className={`
                      absolute inset-0 rounded-xl border-2 bg-gradient-to-br from-primary-black-800 via-primary-black-750 to-primary-black-800 
                      flex items-center justify-center overflow-hidden
                      ${!isRevealed && isHovered ? `scale-105 ${glowStyle.border} ${glowStyle.shadow}` : 'border-primary-black-600'}
                      transition-all duration-300
                    `}
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    {/* Card back design */}
                    <div className="text-center p-4">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary-black-700 border-2 border-primary-black-600 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-green-500/20 to-primary-green-700/20"></div>
                      </div>
                      <div className="text-primary-black-500 font-bold text-xs uppercase tracking-widest">
                        YAP Sports
                      </div>
                      <div className="text-primary-black-600 text-[10px] mt-1">
                        Click to reveal
                      </div>
                    </div>

                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" 
                      style={{
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 2s infinite'
                      }}
                    />
                  </div>

                  {/* Card Front */}
                  <div
                    className={`
                      absolute inset-0 rounded-xl transition-all duration-300
                      ${isRevealed && isHovered ? `scale-105 ${glowStyle.shadow}` : ''}
                    `}
                    style={{ 
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)'
                    }}
                  >
                    {item.type === 'player' ? (
                      // Player Card
                      <div className={`
                        relative rounded-xl border-2 ${isHovered && isRevealed ? glowStyle.border : 'border-primary-black-600'} 
                        bg-primary-black-800/90 w-full h-full overflow-hidden
                        transition-all duration-300
                        ${isHovered && isRevealed ? glowStyle.shadow : ''}
                      `}>
                        {/* Subtle Glow Effect on Hover */}
                        {isHovered && isRevealed && (
                          <div 
                            className="absolute inset-0 opacity-10 pointer-events-none"
                            style={{ 
                              background: `radial-gradient(circle at center, ${glowStyle.glow} 0%, transparent 70%)`
                            }}
                          />
                        )}

                        {/* Tier Badge (shows during tier assignment) */}
                        {showTierUI && assignedTier && (
                          <div className="absolute top-2 right-2 z-10">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary-green-500 text-white border border-primary-green-400">
                              {assignedTier}
                            </span>
                          </div>
                        )}

                        {/* Position Badge */}
                        <div className="absolute top-2 left-2 z-10">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-black/60 backdrop-blur-sm text-primary-black-300 border border-primary-black-600">
                            {item.data.position === 'Quarterback' ? 'QB' :
                             item.data.position === 'Running Back' ? 'RB' :
                             item.data.position === 'Wide Receiver' ? 'WR' :
                             item.data.position === 'Tight End' ? 'TE' :
                             item.data.position === 'Kicker' ? 'K' :
                             item.data.position === 'Defense' ? 'DEF' : item.data.position}
                          </span>
                        </div>

                        {/* Card Content */}
                        <div className="relative h-full flex flex-col p-3 pt-8">
                          <div className="flex-grow"></div>
                          
                          {/* Player Info */}
                          <div className="mt-auto">
                            <div className="text-center mb-2">
                              <div className="text-sm font-bold text-white leading-tight mb-1">
                                {item.data.player_name}
                              </div>
                              <div className="text-xs text-primary-black-400 font-semibold">
                                {item.data.team || 'NFL'}
                              </div>
                            </div>

                            {/* Tier Badge */}
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-700 text-white">
                                {item.data.tier || 'B'}
                              </span>
                              <span className="text-[10px] text-primary-black-400 font-medium">
                                Level 1
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Token Card
                      <div className={`
                        relative rounded-xl border-2 ${isHovered && isRevealed ? glowStyle.border : 'border-primary-black-600'} 
                        bg-primary-black-800/90 w-full h-full overflow-hidden
                        transition-all duration-300
                        ${isHovered && isRevealed ? glowStyle.shadow : ''}
                      `}>
                        {/* Token Badge */}
                        <div className="absolute top-2 left-2 z-10">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary-green-500/20 backdrop-blur-sm text-primary-green-400 border border-primary-green-500">
                            TOKEN
                          </span>
                        </div>

                        {/* Card Content */}
                        <div className="relative h-full flex flex-col p-3 pt-8">
                          {/* Token Icon */}
                          <div className="flex-grow flex items-center justify-center">
                            <div className="w-14 h-14 flex items-center justify-center bg-primary-green-500/20 border-2 border-primary-green-500/50 rounded-full shadow-lg">
                              <span className="text-2xl">🎯</span>
                            </div>
                          </div>
                          
                          {/* Token Info */}
                          <div className="mt-auto">
                            <div className="text-center mb-2">
                              <div className="text-sm font-bold text-white leading-tight mb-1">
                                {item.data.token_name}
                              </div>
                            </div>

                            {/* Multiplier */}
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-primary-green-700 text-white">
                                {item.data.multiplier}x
                              </span>
                              <span className="text-[10px] text-primary-black-400 font-medium">
                                Multiplier
                              </span>
                            </div>

                            {/* Condition */}
                            {item.data.condition?.stat && (
                              <div className="text-center text-[9px] text-primary-black-400 font-medium">
                                {item.data.condition.stat.replace(/_/g, ' ').toUpperCase()} {item.data.condition.operator} {item.data.condition.value}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pull Percentage Info (appears after reveal) - Now outside card, scales with parent */}
                {isRevealed && item.data.pull_percentage ? (
                  <div className="text-center animate-fade-in">
                    <div className={`text-xs font-bold ${glowStyle.textColor}`}>
                      {item.data.pull_percentage.toFixed(1)}%
                    </div>
                  </div>
                ) : (
                  <div className="h-5" /> 
                )}
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {/* Pack Stats Section */}
      {!showTierUI && (
        <div className="flex-shrink-0 py-4 px-4">
          <div className="max-w-md mx-auto">
            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-medium text-primary-black-300">Cards Revealed</span>
                <span className="text-sm font-bold text-primary-green-400">{revealedIndices.size} / {items.length}</span>
              </div>
              <div className="h-2 bg-primary-black-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary-green-500 to-primary-green-400 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(revealedIndices.size / items.length) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Rarity Distribution */}
            {revealedIndices.size > 0 && (
              <div className="flex gap-3 justify-center text-xs">
                {(() => {
                  const rarities = { legendary: 0, epic: 0, rare: 0, common: 0 };
                  Array.from(revealedIndices).forEach(index => {
                    const item = items[index];
                    if (item?.type === 'player' && item.data?.pull_percentage) {
                      const pct = item.data.pull_percentage;
                      if (pct <= 5) rarities.legendary++;
                      else if (pct <= 15) rarities.epic++;
                      else if (pct <= 40) rarities.rare++;
                      else rarities.common++;
                    }
                  });
                  return (
                    <>
                      {rarities.legendary > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500"/>
                          <span className="text-primary-black-300">Legendary: {rarities.legendary}</span>
                        </div>
                      )}
                      {rarities.epic > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-purple-400 to-purple-600"/>
                          <span className="text-primary-black-300">Epic: {rarities.epic}</span>
                        </div>
                      )}
                      {rarities.rare > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600"/>
                          <span className="text-primary-black-300">Rare: {rarities.rare}</span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Buttons - Fixed position with safe area support for mobile */}
      <div className="fixed bottom-0 left-0 right-0 text-center py-3 pb-safe bg-primary-black-950 border-t border-primary-black-800 z-10">
        <div className="pb-safe-offset-3">
          {!allRevealed && (
            <button
              onClick={handleRevealAll}
              className="px-6 py-2.5 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-lg transition-all hover:scale-105 text-sm shadow-lg"
            >
              Reveal All
            </button>
          )}
          {allRevealed && !showTierUI && (
            <button
              onClick={handleContinue}
              className="px-6 py-2.5 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-lg transition-all hover:scale-105 text-sm shadow-lg"
            >
              Continue
            </button>
          )}
        </div>
      </div>

      {/* Tier Assignment UI - Fixed position with safe area support */}
      {showTierUI && tierConfig && (
        <div className="fixed bottom-0 left-0 right-0 mt-1 space-y-1.5 flex-shrink-0 bg-primary-black-950 border-t border-primary-black-800 py-3 pb-safe z-10">
          {/* Tier Selection Buttons */}
          <div className="flex gap-1.5 justify-center flex-wrap">
            {Object.keys(tierConfig).map(tier => {
              const config = tierConfig[tier];
              const assigned = tierAssignments[tier] || [];
              const isFull = assigned.length >= config.slots;
              
              return (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(selectedTier === tier ? null : tier)}
                  disabled={isFull}
                  className={`
                    px-3 py-2 rounded-lg font-bold text-xs transition-all
                    ${selectedTier === tier
                      ? 'bg-primary-green-500 text-white scale-105 shadow-glow-green'
                      : isFull
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-primary-black-700 hover:bg-primary-black-600 text-white hover:scale-105'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{config.icon}</span>
                    <div className="text-left">
                      <div>{tier} Tier</div>
                      <div className="text-[10px] text-primary-black-400">
                        {assigned.length}/{config.slots} assigned
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="max-w-md mx-auto">
            <div className="h-1.5 bg-primary-black-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-green-500 transition-all duration-300"
                style={{
                  width: `${(Object.values(tierAssignments).flat().length / 
                           Object.values(tierConfig).reduce((sum, t) => sum + t.slots, 0)) * 100}%`
                }}
              />
            </div>
          </div>

          {/* Confirm Button */}
          <div className="text-center">
            <button
              onClick={handleContinue}
              disabled={!canConfirmTiers()}
              className={`
                px-6 py-2.5 rounded-lg font-bold text-base transition-all
                ${canConfirmTiers()
                  ? 'bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 hover:scale-105 shadow-glow-green'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {canConfirmTiers() ? 'Confirm Tiers' : 'Assign All Players'}
            </button>
          </div>
        </div>
      )}

      {/* Add shimmer animation styles */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

CardReveal.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    type: PropTypes.string.isRequired,
    data: PropTypes.object.isRequired,
  })).isRequired,
  onRevealComplete: PropTypes.func,
  isStarterPack: PropTypes.bool,
  tierConfig: PropTypes.object,
};

export default CardReveal;
