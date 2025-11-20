import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * PackAnimation - Realistic pack opening experience
 * Features:
 * - Realistic card pack appearance
 * - Slice-to-open interaction
 * - Cards shuffle out and form a row
 * - Hover glow effects based on pull percentage rarity
 */
export default function PackAnimation({ pack, onOpenComplete }) {
  const [sliceProgress, setSliceProgress] = useState(0);
  const [isSlicing, setIsSlicing] = useState(false);
  const [isOpened, setIsOpened] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);

  useEffect(() => {
    // Show prompt animation
    const timer = setTimeout(() => setShowPrompt(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleMouseDown = () => {
    setIsSlicing(true);
    setShowPrompt(false);
  };

  const handleMouseUp = () => {
    if (sliceProgress >= 100) {
      setIsOpened(true);
      // Trigger pack opening after animation
      setTimeout(() => {
        onOpenComplete();
      }, 800);
    } else {
      // Reset if not fully sliced
      setSliceProgress(0);
      setIsSlicing(false);
    }
  };

  const handleMouseMove = (e) => {
    if (!isSlicing) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    const topThird = height * 0.35;
    
    // Only allow slicing in the top area
    if (y < topThird) {
      const progress = Math.min(100, sliceProgress + 5);
      setSliceProgress(progress);
    }
  };

  const handleTouchStart = () => {
    setIsSlicing(true);
    setShowPrompt(false);
  };

  const handleTouchEnd = () => {
    if (sliceProgress >= 100) {
      setIsOpened(true);
      setTimeout(() => {
        onOpenComplete();
      }, 800);
    } else {
      setSliceProgress(0);
      setIsSlicing(false);
    }
  };

  const handleTouchMove = (e) => {
    if (!isSlicing) return;
    
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const y = touch.clientY - rect.top;
    const height = rect.height;
    const topThird = height * 0.35;
    
    if (y < topThird) {
      const progress = Math.min(100, sliceProgress + 5);
      setSliceProgress(progress);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-[80vh]">
      {/* Pack Container */}
      <div
        className={`
          relative transition-all duration-700 ease-out
          ${isOpened ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}
        `}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setIsSlicing(false);
          setSliceProgress(0);
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        style={{ cursor: isSlicing ? 'grabbing' : 'grab' }}
      >
        {/* Floating Prompt */}
        {showPrompt && !isSlicing && (
          <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="bg-primary-green-500 text-primary-black-950 px-6 py-3 rounded-full font-bold text-lg shadow-glow-green">
              ↑ Slice Here ↑
            </div>
          </div>
        )}

        {/* Pack Wrapper */}
        <div className="relative">
          {/* Pack Body - Realistic Card Pack */}
          <div className="relative w-80 h-[28rem] perspective-1000">
            {/* Pack Front Face */}
            <div
              className={`
                absolute inset-0 rounded-2xl overflow-hidden
                transition-transform duration-500
                ${isOpened ? 'translate-y-8 rotate-12' : ''}
              `}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                boxShadow: '0 20px 60px rgba(16, 185, 129, 0.4), inset 0 2px 10px rgba(255, 255, 255, 0.2)'
              }}
            >
              {/* Pack Design */}
              <div className="relative h-full flex flex-col items-center justify-between p-8">
                {/* Top Seal Area */}
                <div className="relative w-full">
                  {/* Tear Line */}
                  <div className="relative h-12 overflow-hidden">
                    <svg
                      className="w-full h-full"
                      viewBox="0 0 320 48"
                      preserveAspectRatio="none"
                    >
                      {/* Perforated edge */}
                      <path
                        d="M 0,24 Q 10,20 20,24 T 40,24 T 60,24 T 80,24 T 100,24 T 120,24 T 140,24 T 160,24 T 180,24 T 200,24 T 220,24 T 240,24 T 260,24 T 280,24 T 300,24 T 320,24"
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth="2"
                        fill="none"
                        strokeDasharray="4,4"
                      />
                    </svg>
                    
                    {/* Slice Progress Indicator */}
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-b from-transparent via-white/30 to-transparent transition-all duration-300"
                      style={{ 
                        width: `${sliceProgress}%`,
                        boxShadow: sliceProgress > 0 ? '0 0 20px rgba(255,255,255,0.6)' : 'none'
                      }}
                    />
                  </div>

                  {/* Slicing particles */}
                  {isSlicing && sliceProgress > 20 && (
                    <div className="absolute top-8 left-0 right-0 flex justify-center gap-2">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 h-1 bg-white rounded-full animate-ping"
                          style={{
                            animationDelay: `${i * 0.1}s`,
                            animationDuration: '0.5s'
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Pack Branding */}
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="text-center">
                    {/* Logo/Icon */}
                    <div className="w-24 h-24 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-4 border-white/40">
                      <span className="text-5xl">🏈</span>
                    </div>
                    
                    {/* Pack Name */}
                    <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
                      {pack.pack.pack_name}
                    </h2>
                    
                    {/* Pack Type Badge */}
                    <div className="inline-block px-4 py-1 bg-white/30 backdrop-blur-sm rounded-full border-2 border-white/50 mb-4">
                      <span className="text-white font-bold text-sm uppercase tracking-wider">
                        {pack.pack.pack_type}
                      </span>
                    </div>
                  </div>

                  {/* Contents */}
                  <div className="mt-6 bg-white/20 backdrop-blur-sm rounded-xl p-4 border-2 border-white/30">
                    <div className="text-white text-center">
                      <div className="font-bold text-lg mb-2">Contains:</div>
                      <div className="flex items-center justify-center gap-6">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🏈</span>
                          <span className="font-bold">{pack.pack.player_count}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🎯</span>
                          <span className="font-bold">{pack.pack.token_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Branding */}
                <div className="text-center">
                  <div className="text-white/80 font-bold uppercase tracking-widest text-xs">
                    YAP Sports
                  </div>
                </div>
              </div>
            </div>

            {/* Glow Effect */}
            <div className={`
              absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-500
              ${isSlicing ? 'opacity-100' : 'opacity-0'}
            `}
              style={{
                boxShadow: '0 0 40px rgba(16, 185, 129, 0.8), 0 0 80px rgba(16, 185, 129, 0.4)'
              }}
            />
          </div>

          {/* Progress Bar */}
          {isSlicing && (
            <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 w-64">
              <div className="bg-primary-black-800 rounded-full h-3 overflow-hidden border-2 border-primary-green-500/50">
                <div 
                  className="h-full bg-gradient-to-r from-primary-green-600 to-primary-green-400 transition-all duration-200 ease-out"
                  style={{ width: `${sliceProgress}%` }}
                />
              </div>
              <div className="text-center mt-2 text-primary-green-400 font-bold text-sm">
                {sliceProgress < 100 ? 'Keep slicing...' : 'Opening!'}
              </div>
            </div>
          )}
        </div>

        {/* Sparkle Effects */}
        {sliceProgress > 50 && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-ping"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${10 + Math.random() * 30}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: '1s'
                }}
              >
                <span className="text-xl">✨</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

PackAnimation.propTypes = {
  pack: PropTypes.shape({
    id: PropTypes.number,
    pack: PropTypes.shape({
      pack_name: PropTypes.string.isRequired,
      pack_type: PropTypes.string.isRequired,
      player_count: PropTypes.number.isRequired,
      token_count: PropTypes.number.isRequired,
    }).isRequired,
  }).isRequired,
  onOpenComplete: PropTypes.func.isRequired,
};
