import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { usePlayerProfile } from '../hooks/fantasy';
import { calculatePlayerSellValue, getSellValueBreakdown } from '../utils/sellValueCalculator';
import { getTierBadgeInfo } from './tables/tableHelpers';
import { getTeamGradient } from '../utils/nflTeamColors';

/**
 * Local NavigationTabs for modal - uses state instead of routing
 */
function NavigationTabsLocal({ navItems = [], activeTab }) {
  return (
    <div className="px-2 sm:px-3 md:px-6 lg:px-8 pt-3 md:pt-4">
      {/* Rounded Container - EXACT match to FantasyNavigation */}
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl overflow-hidden">
        {/* Mobile: Icon Navigation */}
        <div className="flex md:hidden justify-around items-center px-2 py-2">
          {navItems.map(item => {
            const active = activeTab === item.path;
            
            return (
              <button
                key={item.path}
                data-tab={item.path}
                disabled={!item.enabled}
                className={`flex flex-col items-center gap-1 py-1 flex-1 transition-all duration-200 ${
                  !item.enabled ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <div className={active && item.enabled ? 'text-primary-green-500' : 'text-primary-black-400'}>
                  {item.icon}
                </div>
                <span className={`text-[10px] font-medium ${
                  active && item.enabled ? 'text-primary-green-500' : 'text-primary-black-400'
                }`}>
                  {item.mobileLabel || item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Desktop: Original Button Layout */}
        <div className="hidden md:flex flex-wrap gap-2 p-2">
          {navItems.map(item => {
            const active = activeTab === item.path;
            
            return (
              <button
                key={item.path}
                data-tab={item.path}
                disabled={!item.enabled}
                className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap ${
                  active && item.enabled
                    ? 'bg-primary-green-500 text-primary-black-950'
                    : !item.enabled
                    ? 'bg-primary-black-800 text-primary-black-500 cursor-not-allowed opacity-50'
                    : 'bg-primary-black-700 text-primary-black-300 hover:bg-primary-black-600 hover:text-primary-black-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

NavigationTabsLocal.propTypes = {
  navItems: PropTypes.arrayOf(
    PropTypes.shape({
      path: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      enabled: PropTypes.bool,
      icon: PropTypes.node,
      mobileLabel: PropTypes.string
    })
  ).isRequired,
  activeTab: PropTypes.string.isRequired
};

/**
 * PlayerProfileModal Component
 * 
 * Full-screen mobile-optimized modal displaying comprehensive player information
 * Inspired by Sleeper app design with tabs for Summary, Game Log, and Card Info
 * 
 * Features:
 * - Player header with team colors
 * - Action buttons (Add to Lineup, Sell, Favorite)
 * - Tabs: Summary | Game Log | Card Info
 * - Mobile-first with slide-up animation
 */
export default function PlayerProfileModal({ 
  player, 
  isOpen, 
  onClose,
  onAddToLineup,
  onSell,
  isInLineup = false,
  isLocked = false
}) {
  const [activeTab, setActiveTab] = useState('summary');
  const { playerData, gameLog, isLoading, error } = usePlayerProfile(player, isOpen);

  // Navigation items for tabs
  const navItems = [
    {
      path: 'summary',
      label: 'SUMMARY',
      enabled: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      mobileLabel: 'Summary'
    },
    {
      path: 'game-log',
      label: 'GAME LOG',
      enabled: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      mobileLabel: 'Game Log'
    },
    {
      path: 'card-info',
      label: 'CARD INFO',
      enabled: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
      mobileLabel: 'Card Info'
    }
  ];

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      // Also lock the root element
      const root = document.getElementById('root');
      if (root) {
        root.style.overflow = 'hidden';
        root.style.height = '100vh';
      }
    }
    
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      const root = document.getElementById('root');
      if (root) {
        root.style.overflow = '';
        root.style.height = '';
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen || !player) return null;

  const tierInfo = getTierBadgeInfo(playerData?.card_tier || 'base');
  const sellValue = calculatePlayerSellValue(playerData);
  const teamAbbr = playerData?.player_card?.team_abbreviation || 'NE';
  const teamGradient = getTeamGradient(teamAbbr);

  // Get card level thresholds for XP bar
  const currentLevel = playerData?.card_level || 1;
  const currentXP = playerData?.experience_points || 0;
  
  // XP thresholds (from database card_level_thresholds)
  const xpThresholds = {
    1: 0, 2: 150, 3: 375, 4: 750, 5: 1500,
    6: 3000, 7: 6000, 8: 12000, 9: 24000, 10: 48000
  };
  
  const currentThreshold = xpThresholds[currentLevel] || 0;
  const nextThreshold = xpThresholds[currentLevel + 1] || currentThreshold;
  const xpProgress = currentLevel >= 10 ? 100 : ((currentXP - currentThreshold) / (nextThreshold - currentThreshold)) * 100;

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-[9999] flex items-end md:items-center justify-center overflow-hidden"
      onClick={onClose}
    >
      <div 
        className="bg-primary-black-900 w-full h-[92vh] md:h-[85vh] md:max-w-2xl md:rounded-xl overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner - Team Gradient (matches TeamMatchupBanner style) */}
        <div 
          className="border-b-2 border-primary-black-700/50"
          style={{ background: teamGradient }}
        >
          <div className="px-3 sm:px-4 py-3 sm:py-4">
            {/* Close button - Absolute positioned */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors border border-white/10 z-50"
            >
              <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-3 sm:gap-4">
              {/* Player Avatar */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/20">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>

              {/* Player Info - Left/Center */}
              <div className="flex-1 min-w-0">
                {/* Player Name */}
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-lg sm:text-2xl font-bold text-white truncate">
                    {playerData?.player_card?.player_name}
                  </h1>
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-white/70">
                  <span className="font-semibold text-white/90">{playerData?.player_card?.position}</span>
                  <span className="text-white/40">•</span>
                  <span className="font-semibold text-white/90">{playerData?.player_card?.team_abbreviation}</span>
                  <span className="text-white/40">•</span>
                  <span className="text-white/50 capitalize">
                    {playerData?.card_tier?.replace('_', ' ')} • Level {currentLevel}
                  </span>
                </div>
              </div>
            </div>

            {/* XP Progress Bar with Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 mt-3">
              {/* Progress Bar Container */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5 text-[10px] sm:text-xs">
                  <span className="text-white/70 font-medium">
                    {currentLevel < 10 ? `${nextThreshold - currentXP} XP to Level ${currentLevel + 1}` : '🏆 Max Level'}
                  </span>
                  <span className="text-white/50">
                    {currentXP} / {currentLevel >= 10 ? 'MAX' : nextThreshold}
                  </span>
                </div>
                <div className="w-full bg-white/20 backdrop-blur-sm rounded-full h-2 overflow-hidden border border-white/10">
                  <div 
                    className="bg-white h-full transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(xpProgress, 100)}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 flex-shrink-0">
                {!isInLineup && (
                  <button
                    onClick={() => {
                      onAddToLineup?.(playerData);
                      onClose();
                    }}
                    disabled={isLocked}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 disabled:cursor-not-allowed backdrop-blur-sm flex items-center justify-center transition-colors border border-white/10"
                    title="Add to Lineup"
                  >
                    <span className="text-xl sm:text-2xl">🏈</span>
                  </button>
                )}
                
                <button
                  onClick={() => {
                    onSell?.(playerData);
                    onClose();
                  }}
                  disabled={isLocked}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 disabled:cursor-not-allowed backdrop-blur-sm flex items-center justify-center transition-colors border border-white/10"
                  title={`Sell for ${sellValue} coins`}
                >
                  <span className="text-xl sm:text-2xl">💰</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Wrapper for proper rendering */}
        <div 
          onClick={(e) => {
            // Handle tab clicks without using router
            const target = e.target.closest('button');
            if (target) {
              const tabPath = target.getAttribute('data-tab');
              if (tabPath) {
                setActiveTab(tabPath);
              }
            }
          }}
        >
          <NavigationTabsLocal navItems={navItems} activeTab={activeTab} />
        </div>

        {/* Tab Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-green-500"></div>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-400">
              <p>Error loading player data</p>
              <p className="text-sm text-primary-black-500 mt-2">{error}</p>
            </div>
          ) : (
            <>
              {/* SUMMARY TAB */}
              {activeTab === 'summary' && (
                <div className="p-3 space-y-4">
                  {/* Season Stats */}
                  <div>
                    <h3 className="text-base font-bold text-white mb-2">Season Stats</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-primary-black-800 rounded-lg p-3 text-center">
                        <div className="text-[10px] text-primary-black-500 uppercase font-semibold mb-1">Season PPG</div>
                        <div className="text-2xl font-bold text-white">{(playerData?.player_card?.season_ppg || 0).toFixed(1)}</div>
                      </div>
                      <div className="bg-primary-black-800 rounded-lg p-3 text-center">
                        <div className="text-[10px] text-primary-black-500 uppercase font-semibold mb-1">Projected</div>
                        <div className="text-2xl font-bold text-white">{(playerData?.player_card?.weekly_projected_points || 0).toFixed(1)}</div>
                      </div>
                      <div className="bg-primary-black-800 rounded-lg p-3 text-center">
                        <div className="text-[10px] text-primary-black-500 uppercase font-semibold mb-1">Games</div>
                        <div className="text-2xl font-bold text-white">{playerData?.player_card?.games_played_season || 0}</div>
                      </div>
                    </div>
                  </div>

                  {/* Sell Value Breakdown */}
                  <div>
                    <h3 className="text-base font-bold text-white mb-2">Sell Value</h3>
                    <div className="bg-primary-black-800 rounded-lg p-3">
                      <div className="text-2xl font-bold text-yellow-400 mb-1.5">{sellValue} coins</div>
                      <p className="text-[10px] text-primary-black-400 leading-relaxed">
                        {getSellValueBreakdown(playerData)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* GAME LOG TAB */}
              {activeTab === 'game-log' && (
                <div className="p-3">
                  <h3 className="text-base font-bold text-white mb-2.5">2025 Season Game Log</h3>
                  {gameLog.length > 0 ? (
                    <div className="space-y-1.5">
                      {gameLog.map((game, idx) => {
                        // Determine game state
                        const isFuture = game.isFuture;
                        const isBye = game.isBye;
                        const wasOwned = game.wasOwned;
                        const wasInLineup = game.wasInLineup;
                        
                        // Determine display states
                        const isHistorical = !wasOwned && !isFuture && !isBye; // Before acquisition
                        const isBenched = wasOwned && !wasInLineup && !isFuture && !isBye; // Owned but not started
                        const wasStarted = wasOwned && wasInLineup && !isFuture && !isBye; // In lineup
                        
                        const isHome = game.game?.home_team === playerData.player_card.team_abbreviation;
                        const opponent = isHome ? game.game?.away_team : game.game?.home_team;
                        const teamScore = isHome ? game.game?.home_score : game.game?.away_score;
                        const oppScore = isHome ? game.game?.away_score : game.game?.home_score;
                        
                        // Determine row styling based on state
                        let rowBgColor = 'bg-primary-black-800'; // Default (started)
                        if (isHistorical) rowBgColor = 'bg-primary-black-900'; // Historical (darkest)
                        else if (isBenched) rowBgColor = 'bg-primary-black-850'; // Benched (medium)
                        
                        return (
                          <div key={game.id || `week-${idx}`} className={`rounded-lg p-2.5 ${rowBgColor}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1">
                                <div className="text-center min-w-[50px]">
                                  <div className="text-xs font-bold text-white">Week {game.week_number}</div>
                                  {game.game?.game_start_time && !isFuture && !isBye && (
                                    <div className="text-[10px] text-primary-black-500">
                                      {new Date(game.game.game_start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </div>
                                  )}
                                </div>
                                
                                {isFuture ? (
                                  <div className="text-xs text-primary-black-600 italic">-</div>
                                ) : isBye ? (
                                  <div className="text-xs text-primary-black-500 font-semibold">BYE</div>
                                ) : opponent ? (
                                  <div className="flex items-center gap-1.5">
                                    <div className={`text-xs font-semibold ${
                                      isHistorical ? 'text-primary-black-400' : 'text-primary-black-300'
                                    }`}>
                                      {isHome ? 'vs' : '@'} {opponent}
                                    </div>
                                    {isHistorical && (
                                      <div className="text-[9px] px-1.5 py-0.5 rounded bg-primary-black-700 text-primary-black-400 font-medium">
                                        Before Acquired
                                      </div>
                                    )}
                                    {isBenched && (
                                      <div className="text-[9px] px-1.5 py-0.5 rounded bg-primary-black-700 text-primary-black-400 font-medium">
                                        Benched
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                                
                                {!isFuture && !isBye && game.game?.game_status === 'final' && teamScore !== undefined && oppScore !== undefined && (
                                  <div className="text-[10px] text-primary-black-500">
                                    {teamScore} - {oppScore} {teamScore > oppScore ? 'W' : teamScore < oppScore ? 'L' : 'T'}
                                  </div>
                                )}
                              </div>
                              
                              <div className="text-right">
                                {isFuture || isBye ? (
                                  <div className="text-lg font-bold text-primary-black-700">-</div>
                                ) : game.fantasy_points !== null && game.fantasy_points !== undefined ? (
                                  <>
                                    <div className={`text-lg font-bold ${
                                      wasStarted ? 'text-white' : 'text-primary-black-400'
                                    }`}>{game.fantasy_points.toFixed(1)}</div>
                                    <div className="text-[9px] text-primary-black-500">fpts</div>
                                  </>
                                ) : (
                                  <div className="text-sm font-semibold text-primary-black-600">-</div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-primary-black-500 text-center py-8 text-sm">No game log available</p>
                  )}
                </div>
              )}

              {/* CARD INFO TAB */}
              {activeTab === 'card-info' && (
                <div className="p-4 space-y-6">
                  {/* Tier Visual */}
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${tierInfo.color} text-4xl font-bold mb-3`}>
                      {tierInfo.initial}
                    </div>
                    <h3 className="text-2xl font-bold text-white capitalize">
                      {playerData?.card_tier?.replace('_', ' ')}
                    </h3>
                    <p className="text-sm text-primary-black-400 mt-1">Level {currentLevel} Card</p>
                  </div>

                  {/* XP Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-primary-black-400">Experience</span>
                      <span className="text-white font-semibold">
                        {currentXP} / {currentLevel >= 10 ? 'MAX' : nextThreshold} XP
                      </span>
                    </div>
                    <div className="w-full bg-primary-black-700 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-primary-green-500 to-primary-green-400 h-full transition-all duration-500 rounded-full"
                        style={{ width: `${Math.min(xpProgress, 100)}%` }}
                      />
                    </div>
                    {currentLevel < 10 && (
                      <p className="text-xs text-primary-black-500 mt-1">
                        {nextThreshold - currentXP} XP until Level {currentLevel + 1}
                      </p>
                    )}
                    {currentLevel >= 10 && (
                      <p className="text-xs text-yellow-400 mt-1">🏆 Maximum Level Reached!</p>
                    )}
                  </div>

                  {/* Card Stats */}
                  <div className="bg-primary-black-800 rounded-lg p-4 space-y-3">
                    <h4 className="font-bold text-white mb-2">Card Stats</h4>
                    
                    <div className="flex justify-between">
                      <span className="text-primary-black-400">Tier</span>
                      <span className="text-white font-semibold capitalize">{playerData?.card_tier?.replace('_', ' ')}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-primary-black-400">Level</span>
                      <span className="text-white font-semibold">{currentLevel}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-primary-black-400">Total Fantasy Points</span>
                      <span className="text-white font-semibold">{(playerData?.total_fantasy_points || 0).toFixed(1)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-primary-black-400">Total XP Earned</span>
                      <span className="text-white font-semibold">{currentXP}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-primary-black-400">Rarity</span>
                      <span className="text-white font-semibold">{(playerData?.player_card?.pull_percentage || 50).toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="bg-primary-black-800 rounded-lg p-4 space-y-3">
                    <h4 className="font-bold text-white mb-2">Card Details</h4>
                    
                    <div className="flex justify-between">
                      <span className="text-primary-black-400">Base Value</span>
                      <span className="text-white font-semibold">{playerData?.player_card?.base_value || 0} coins</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-primary-black-400">Pull Percentage</span>
                      <span className="text-white font-semibold">{(playerData?.player_card?.pull_percentage || 50).toFixed(1)}%</span>
                    </div>

                    {playerData?.is_locked && (
                      <div className="flex items-center gap-2 pt-2 border-t border-primary-black-700">
                        <span className="text-red-400">🔒</span>
                        <span className="text-red-400 font-semibold">Card is locked</span>
                      </div>
                    )}
                  </div>

                  {/* Tier Progression */}
                  <div className="bg-primary-black-800 rounded-lg p-4">
                    <h4 className="font-bold text-white mb-3">Tier Progression</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${currentLevel >= 1 ? 'bg-gray-500 text-white' : 'bg-primary-black-700 text-primary-black-500'}`}>B</span>
                        <span className={currentLevel >= 1 ? 'text-white' : 'text-primary-black-500'}>Base (L1-2)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${currentLevel >= 3 ? 'bg-green-500 text-white' : 'bg-primary-black-700 text-primary-black-500'}`}>R</span>
                        <span className={currentLevel >= 3 ? 'text-white' : 'text-primary-black-500'}>Role Player (L3-4)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${currentLevel >= 5 ? 'bg-blue-500 text-white' : 'bg-primary-black-700 text-primary-black-500'}`}>S</span>
                        <span className={currentLevel >= 5 ? 'text-white' : 'text-primary-black-500'}>Starter (L5-6)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${currentLevel >= 7 ? 'bg-purple-500 text-white' : 'bg-primary-black-700 text-primary-black-500'}`}>A</span>
                        <span className={currentLevel >= 7 ? 'text-white' : 'text-primary-black-500'}>All-Star (L7-8)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${currentLevel >= 9 ? 'bg-yellow-500 text-white' : 'bg-primary-black-700 text-primary-black-500'}`}>E</span>
                        <span className={currentLevel >= 9 ? 'text-white' : 'text-primary-black-500'}>Elite (L9-10)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

PlayerProfileModal.propTypes = {
  player: PropTypes.object.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onAddToLineup: PropTypes.func,
  onSell: PropTypes.func,
  isInLineup: PropTypes.bool,
  isLocked: PropTypes.bool
};
