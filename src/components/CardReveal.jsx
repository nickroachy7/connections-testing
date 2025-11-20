import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

function CardReveal({ items, onRevealComplete }) {
  const [revealedIndices, setRevealedIndices] = useState(new Set());
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isShuffling, setIsShuffling] = useState(true);
  const [allRevealed, setAllRevealed] = useState(false);

  useEffect(() => {
    // Trigger shuffle animation on mount
    const timer = setTimeout(() => {
      setIsShuffling(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Check if all cards are revealed
    if (revealedIndices.size === items.length && items.length > 0) {
      setAllRevealed(true);
    }
  }, [revealedIndices, items.length]);

  const handleCardClick = (index) => {
    if (!revealedIndices.has(index)) {
      setRevealedIndices(prev => new Set([...prev, index]));
      
      // Play a subtle sound effect here if desired
      // new Audio('/sounds/card-flip.mp3').play();
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

  // Get glow color based on pull_percentage (lower % = rarer = better glow)
  const getGlowColor = (pullPercentage) => {
    if (!pullPercentage) return {
      border: 'border-gray-600',
      shadow: 'hover:shadow-[0_0_8px_rgba(107,114,128,0.3)]',
      glow: 'rgba(107, 114, 128, 0.15)',
      textColor: 'text-gray-400'
    };
    
    if (pullPercentage <= 5) return {
      border: 'border-yellow-400',
      shadow: 'hover:shadow-[0_0_12px_rgba(250,204,21,0.4)]',
      glow: 'rgba(250, 204, 21, 0.2)',
      textColor: 'text-yellow-400'
    };
    
    if (pullPercentage <= 15) return {
      border: 'border-purple-500',
      shadow: 'hover:shadow-[0_0_12px_rgba(168,85,247,0.4)]',
      glow: 'rgba(168, 85, 247, 0.2)',
      textColor: 'text-purple-400'
    };
    
    if (pullPercentage <= 25) return {
      border: 'border-blue-500',
      shadow: 'hover:shadow-[0_0_12px_rgba(59,130,246,0.4)]',
      glow: 'rgba(59, 130, 246, 0.2)',
      textColor: 'text-blue-400'
    };
    
    if (pullPercentage <= 40) return {
      border: 'border-green-500',
      shadow: 'hover:shadow-[0_0_12px_rgba(34,197,94,0.4)]',
      glow: 'rgba(34, 197, 94, 0.2)',
      textColor: 'text-green-400'
    };
    
    return {
      border: 'border-gray-600',
      shadow: 'hover:shadow-[0_0_8px_rgba(107,114,128,0.3)]',
      glow: 'rgba(107, 114, 128, 0.15)',
      textColor: 'text-gray-400'
    };
  };

  return (
    <div className="w-full h-screen flex flex-col justify-center px-4 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">Your Pull!</h2>
        <p className="text-primary-black-300 mb-3">
          Click each card to reveal what you got
        </p>
        {!allRevealed && (
          <button
            onClick={handleRevealAll}
            className="px-5 py-2 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-lg transition-all shadow-glow-green hover:scale-105"
          >
            Reveal All
          </button>
        )}
      </div>

      {/* Cards Container */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div className="flex gap-4 justify-center flex-wrap max-w-full">
          {items.map((item, index) => {
            const isRevealed = revealedIndices.has(index);
            const isHovered = hoveredIndex === index;
            const glowStyle = getGlowColor(item.data.pull_percentage);
              
            return (
              <div
                key={index}
                className={`
                  relative flex-shrink-0 transition-all duration-700 ease-out
                  ${isShuffling ? 'opacity-0 translate-y-[-50px] scale-50' : 'opacity-100 translate-y-0 scale-100'}
                `}
                style={{
                  transitionDelay: `${index * 80}ms`,
                  width: '160px',
                  perspective: '1000px'
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Card Flip Container */}
                <div
                  className={`
                    relative w-full transition-transform duration-700 cursor-pointer
                    ${isRevealed ? '[transform:rotateY(180deg)]' : ''}
                  `}
                  style={{ 
                    transformStyle: 'preserve-3d',
                    aspectRatio: '0.64'
                  }}
                  onClick={() => !isRevealed && handleCardClick(index)}
                >
                  {/* Card Back */}
                  <div
                    className={`
                      absolute inset-0 rounded-xl border-2 bg-gradient-to-br from-primary-black-800 via-primary-black-750 to-primary-black-800 
                      flex items-center justify-center overflow-hidden
                      ${!isRevealed && isHovered ? 'scale-105 border-primary-green-500' : 'border-primary-black-600'}
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

                {/* Pull Percentage Info (appears after reveal) */}
                {isRevealed && item.data.pull_percentage && (
                  <div className="absolute -bottom-6 left-0 right-0 text-center animate-fade-in">
                    <div className={`text-[10px] font-bold ${glowStyle.textColor}`}>
                      {item.data.pull_percentage.toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Continue Button */}
      {allRevealed && (
        <div className="text-center mt-6">
          <button
            onClick={onRevealComplete}
            className="px-6 py-3 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-lg transition-all shadow-glow-green hover:scale-105"
          >
            Continue
          </button>
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
};

export default CardReveal;