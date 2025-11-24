/**
 * Shared helper functions for table components
 */

export const getPullPercentageColor = (percentage) => {
  if (percentage >= 10) return 'text-red-400';
  if (percentage >= 5) return 'text-orange-400';
  if (percentage >= 1) return 'text-yellow-400';
  return 'text-primary-green-400';
};

export const getTierBadgeInfo = (tier) => {
  const tiers = {
    'all_star': { 
      initial: 'A', 
      color: 'bg-purple-500 text-white',
      borderColor: 'border-purple-500'
    },
    'starter': { 
      initial: 'S', 
      color: 'bg-blue-500 text-white',
      borderColor: 'border-blue-500'
    },
    'role_player': { 
      initial: 'R', 
      color: 'bg-green-500 text-white',
      borderColor: 'border-green-500'
    },
    'base': { 
      initial: 'B', 
      color: 'bg-gray-500 text-white',
      borderColor: 'border-gray-500'
    }
  };
  return tiers[tier] || { initial: 'B', color: 'bg-gray-500 text-white', borderColor: 'border-gray-500' };
};

export const getTokenRarityColor = (rarity) => {
  const colors = {
    'Legendary': 'from-yellow-500 to-yellow-600',
    'Epic': 'from-purple-500 to-purple-600',
    'Rare': 'from-blue-500 to-blue-600',
    'Common': 'from-gray-500 to-gray-600'
  };
  return colors[rarity] || 'from-gray-500 to-gray-600';
};

export const getRarityTextColor = (rarity) => {
  const colors = {
    'Legendary': 'text-yellow-400',
    'Epic': 'text-purple-400',
    'Rare': 'text-blue-400',
    'Common': 'text-primary-black-400'
  };
  return colors[rarity] || 'text-primary-black-400';
};

export const getInjuryStatusBadge = (injuryStatus) => {
  if (!injuryStatus || injuryStatus === 'Active') return null;
  
  const statusColors = {
    'Out': 'bg-red-500 text-white',
    'Doubtful': 'bg-orange-500 text-white',
    'Questionable': 'bg-yellow-500 text-black',
    'Probable': 'bg-blue-500 text-white',
    'Injured Reserve': 'bg-red-700 text-white'
  };
  
  const statusAbbr = {
    'Out': 'O',
    'Doubtful': 'D',
    'Questionable': 'Q',
    'Probable': 'P',
    'Injured Reserve': 'IR'
  };
  
  const colorClass = statusColors[injuryStatus] || 'bg-gray-500 text-white';
  const abbr = statusAbbr[injuryStatus] || injuryStatus.charAt(0);
  
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${colorClass}`}>
      {abbr}
    </span>
  );
};

export const isPlayerGameLiveOrFinal = (player, liveGameData) => {
  if (!liveGameData) return false;
  const gameData = liveGameData.get(player.player_card.player_id);
  if (!gameData) return false;
  const status = gameData.gameStatus?.toLowerCase();
  return status === 'live' || status === 'halftime' || status === 'final';
};

export const getPositionAbbr = (position) => {
  const abbr = {
    'Quarterback': 'QB',
    'Running Back': 'RB',
    'Wide Receiver': 'WR',
    'Tight End': 'TE'
  };
  return abbr[position] || position;
};

export const enrichPlayerData = (player, liveGameData, projections) => {
  const gameData = liveGameData?.get(player.player_card.player_id);
  const projection = projections?.get(player.player_card.player_id);
  
  const isBye = !gameData;
  const opponent = gameData?.opponent;
  const isHome = gameData?.isHome;
  const gameStatus = gameData?.gameStatus?.toLowerCase();
  const isLiveOrFinal = gameStatus === 'live' || gameStatus === 'halftime' || gameStatus === 'final';
  
  return {
    ...player,
    // Matchup info
    opponent: isBye ? null : opponent,
    isHome,
    isBye,
    gameStatus,
    gameStartTime: gameData?.gameStartTime,
    isLiveOrFinal,
    
    // Game scores and details
    homeScore: gameData?.homeScore,
    awayScore: gameData?.awayScore,
    homeTeam: gameData?.homeTeam,
    awayTeam: gameData?.awayTeam,
    timeRemaining: gameData?.timeRemaining,
    quarter: gameData?.quarter,
    
    // Stats
    projected: projection?.projected,
    score: gameData?.currentPoints,
    seasonAvg: projection?.seasonAvg
    // Note: sellValue should be calculated by the calling component
  };
};

export const enrichTokenData = (token) => {
  return {
    ...token
    // Note: sellValue should be calculated by the calling component
  };
};
