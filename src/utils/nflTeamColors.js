/**
 * NFL Team Colors
 * 
 * Primary and secondary colors for all 32 NFL teams
 * Colors sourced from official team branding
 */

export const NFL_TEAM_COLORS = {
  // AFC East
  'BUF': { primary: '#00338D', secondary: '#C60C30', name: 'Buffalo Bills' },
  'MIA': { primary: '#008E97', secondary: '#FC4C02', name: 'Miami Dolphins' },
  'NE': { primary: '#002244', secondary: '#C60C30', name: 'New England Patriots' },
  'NYJ': { primary: '#125740', secondary: '#FFFFFF', name: 'New York Jets' },
  
  // AFC North
  'BAL': { primary: '#241773', secondary: '#000000', name: 'Baltimore Ravens' },
  'CIN': { primary: '#FB4F14', secondary: '#000000', name: 'Cincinnati Bengals' },
  'CLE': { primary: '#311D00', secondary: '#FF3C00', name: 'Cleveland Browns' },
  'PIT': { primary: '#FFB612', secondary: '#101820', name: 'Pittsburgh Steelers' },
  
  // AFC South
  'HOU': { primary: '#03202F', secondary: '#A71930', name: 'Houston Texans' },
  'IND': { primary: '#002C5F', secondary: '#A2AAAD', name: 'Indianapolis Colts' },
  'JAX': { primary: '#006778', secondary: '#D7A22A', name: 'Jacksonville Jaguars' },
  'TEN': { primary: '#0C2340', secondary: '#4B92DB', name: 'Tennessee Titans' },
  
  // AFC West
  'DEN': { primary: '#FB4F14', secondary: '#002244', name: 'Denver Broncos' },
  'KC': { primary: '#E31837', secondary: '#FFB81C', name: 'Kansas City Chiefs' },
  'LV': { primary: '#000000', secondary: '#A5ACAF', name: 'Las Vegas Raiders' },
  'LAC': { primary: '#0080C6', secondary: '#FFC20E', name: 'Los Angeles Chargers' },
  
  // NFC East
  'DAL': { primary: '#041E42', secondary: '#869397', name: 'Dallas Cowboys' },
  'NYG': { primary: '#0B2265', secondary: '#A71930', name: 'New York Giants' },
  'PHI': { primary: '#004C54', secondary: '#A5ACAF', name: 'Philadelphia Eagles' },
  'WAS': { primary: '#5A1414', secondary: '#FFB612', name: 'Washington Commanders' },
  
  // NFC North
  'CHI': { primary: '#0B162A', secondary: '#C83803', name: 'Chicago Bears' },
  'DET': { primary: '#0076B6', secondary: '#B0B7BC', name: 'Detroit Lions' },
  'GB': { primary: '#203731', secondary: '#FFB612', name: 'Green Bay Packers' },
  'MIN': { primary: '#4F2683', secondary: '#FFC62F', name: 'Minnesota Vikings' },
  
  // NFC South
  'ATL': { primary: '#A71930', secondary: '#000000', name: 'Atlanta Falcons' },
  'CAR': { primary: '#0085CA', secondary: '#101820', name: 'Carolina Panthers' },
  'NO': { primary: '#D3BC8D', secondary: '#101820', name: 'New Orleans Saints' },
  'TB': { primary: '#D50A0A', secondary: '#FF7900', name: 'Tampa Bay Buccaneers' },
  
  // NFC West
  'ARI': { primary: '#97233F', secondary: '#000000', name: 'Arizona Cardinals' },
  'LA': { primary: '#003594', secondary: '#FFA300', name: 'Los Angeles Rams' },
  'SF': { primary: '#AA0000', secondary: '#B3995D', name: 'San Francisco 49ers' },
  'SEA': { primary: '#002244', secondary: '#69BE28', name: 'Seattle Seahawks' },
};

/**
 * Get team color gradient for backgrounds
 * Returns a CSS gradient string
 */
export const getTeamGradient = (teamAbbr) => {
  const colors = NFL_TEAM_COLORS[teamAbbr];
  if (!colors) {
    return 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'; // Default dark gradient
  }
  
  return `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`;
};

/**
 * Get team colors for Tailwind-compatible inline styles
 */
export const getTeamColors = (teamAbbr) => {
  return NFL_TEAM_COLORS[teamAbbr] || { primary: '#1a1a1a', secondary: '#2d2d2d', name: 'Unknown Team' };
};

/**
 * Get just the primary color hex
 */
export const getTeamPrimaryColor = (teamAbbr) => {
  return NFL_TEAM_COLORS[teamAbbr]?.primary || '#1a1a1a';
};

/**
 * Get just the secondary color hex
 */
export const getTeamSecondaryColor = (teamAbbr) => {
  return NFL_TEAM_COLORS[teamAbbr]?.secondary || '#2d2d2d';
};
