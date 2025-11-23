import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * PackAnimation - Interactive pack opening experience
 * Features:
 * - Custom green pack design with image
 * - Canvas-based slice-to-open interaction
 * - Skip button for quick opening
 * - Visual feedback and animations
 */
export default function PackAnimation({ pack, onOpenComplete }) {
  const [sliceProgress, setSliceProgress] = useState(0);
  const [isSlicing, setIsSlicing] = useState(false);
  const [isOpened, setIsOpened] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);
  const canvasRef = useRef(null);
  const [slicePoints, setSlicePoints] = useState([]);

  useEffect(() => {
    // Show prompt animation
    const timer = setTimeout(() => setShowPrompt(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Draw slice line on canvas
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (slicePoints.length > 1) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#10b981';
      
      ctx.beginPath();
      ctx.moveTo(slicePoints[0].x, slicePoints[0].y);
      
      for (let i = 1; i < slicePoints.length; i++) {
        ctx.lineTo(slicePoints[i].x, slicePoints[i].y);
      }
      
      ctx.stroke();
    }
  }, [slicePoints]);

  const handleSkipSlicing = () => {
    setIsOpened(true);
    setTimeout(() => {
      onOpenComplete();
    }, 400);
  };

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsSlicing(true);
    setShowPrompt(false);
    setSlicePoints([{ x, y }]);
  };

  const handleMouseUp = () => {
    if (sliceProgress >= 50) {
      setIsOpened(true);
      setTimeout(() => {
        onOpenComplete();
      }, 200);
    } else if (slicePoints.length > 0) {
      // Don't auto-reset - let them continue slicing
      setIsSlicing(false);
    }
  };

  const handleMouseMove = (e) => {
    if (!isSlicing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setSlicePoints(prev => [...prev, { x, y }]);
    
    // Calculate horizontal coverage by checking min and max X positions
    const xPositions = [...slicePoints, { x, y }].map(p => p.x);
    const minX = Math.min(...xPositions);
    const maxX = Math.max(...xPositions);
    const coverage = maxX - minX;
    const canvasWidth = rect.width;
    
    // Progress based on how much of the width we've covered
    const progress = Math.min(100, (coverage / canvasWidth) * 100);
    setSliceProgress(progress);
  };

  const handleTouchStart = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    setIsSlicing(true);
    setShowPrompt(false);
    setSlicePoints([{ x, y }]);
  };

  const handleTouchEnd = () => {
    if (sliceProgress >= 50) {
      setIsOpened(true);
      setTimeout(() => {
        onOpenComplete();
      }, 200);
    } else if (slicePoints.length > 0) {
      // Don't auto-reset - let them continue slicing
      setIsSlicing(false);
    }
  };

  const handleTouchMove = (e) => {
    if (!isSlicing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    setSlicePoints(prev => [...prev, { x, y }]);
    
    const xPositions = [...slicePoints, { x, y }].map(p => p.x);
    const minX = Math.min(...xPositions);
    const maxX = Math.max(...xPositions);
    const coverage = maxX - minX;
    const canvasWidth = rect.width;
    
    const progress = Math.min(100, (coverage / canvasWidth) * 100);
    setSliceProgress(progress);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-primary-black-950">
      {/* Pack Container - Absolutely centered */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`
            transition-opacity duration-700
            ${isOpened ? 'opacity-0 pointer-events-none' : 'opacity-100'}
          `}
        >
        {/* Simple slice instruction */}
        {showPrompt && !isSlicing && sliceProgress === 0 && (
          <div className="absolute top-[12%] left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
            <div className="text-white text-sm font-medium opacity-80">
              ← Slice to Open →
            </div>
          </div>
        )}

          {/* Pack Wrapper with Canvas Overlay */}
          <div className="relative">
            {/* Pack Image - Optimized size */}
            <div className="relative" style={{ width: '320px', height: '480px' }}>
              <img 
                src="/green-pack.png" 
                alt={pack.pack.pack_name}
                className="w-full h-full object-contain"
                style={{
                  filter: isSlicing 
                    ? 'drop-shadow(0 0 50px rgba(16, 185, 129, 0.9))' 
                    : 'drop-shadow(0 30px 60px rgba(0, 0, 0, 0.6))',
                  transition: 'filter 0.3s ease-out'
                }}
              />              {/* Canvas for drawing slice line */}
              <canvas
                ref={canvasRef}
                width={320}
                height={480}
                className="absolute inset-0 pointer-events-auto cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => {
                  setIsSlicing(false);
                }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
              />            {/* Simple dashed slice line */}
            {showPrompt && sliceProgress === 0 && (
              <div className="absolute top-[12%] left-0 right-0 pointer-events-none">
                <div className="mx-4 border-t-2 border-dashed border-white/60 animate-pulse" />
              </div>
            )}

              {/* Pack Info Overlay - On the pack itself */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/50 backdrop-blur-sm rounded-lg px-6 py-4 border-2 border-white/40">
                  <h2 className="text-2xl font-bold text-white mb-2 text-center drop-shadow-lg">
                    {pack.pack.pack_name}
                  </h2>
                  <div className="flex items-center justify-center gap-4 text-white">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl">🏈</span>
                      <span className="font-bold">{pack.pack.player_count}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl">🎯</span>
                      <span className="font-bold">{pack.pack.token_count}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>      {/* Skip Button - Absolute bottom */}
      {!isOpened && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
          <button
            onClick={handleSkipSlicing}
            className="
              group relative px-6 py-2.5
              bg-primary-black-800 hover:bg-primary-black-700
              text-primary-green-400 font-bold rounded-lg text-sm
              border-2 border-primary-green-500/50 hover:border-primary-green-500
              transition-all duration-200
              shadow-lg hover:shadow-glow-green
              transform hover:scale-105 active:scale-95
            "
          >
            <span className="flex items-center gap-2">
              Skip Slicing
              <span className="transform group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </button>
          <p className="text-primary-gray-400 text-xs">
            Too excited? Click to open instantly!
          </p>
        </div>
      )}
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
