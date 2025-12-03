import PropTypes from 'prop-types';

/**
 * FreeAgentCard Component
 * 
 * Matches the exact inventory/lineup row pattern:
 * - Simple dark background
 * - Grey position badge (not colored)
 * - Player icon with tier border
 * - Clean text hierarchy
 * - Simple claim button
 */

// Position abbreviations
const POSITION_ABBREV = {
  'Quarterback': 'QB',
  'Running Back': 'RB',
  'Wide Receiver': 'WR',
  'Tight End': 'TE',
};

export default function FreeAgentCard({
  player,
  onClaim,
  isClaiming = false,
  userCoins = 0,
  disabled = false
}) {
  const canAfford = userCoins >= player.coin_cost;
  const alreadyClaimed = player.already_claimed || player.in_inventory;
  const isClaimable = !disabled && canAfford && !isClaiming && !alreadyClaimed;
  
  const positionAbbrev = POSITION_ABBREV[player.player_position] || player.player_position;

  const handleClaim = (e) => {
    e.stopPropagation();
    if (isClaimable) {
      onClaim(player);
    }
  };

  return (
    <div
      className={`
        w-full
        ${alreadyClaimed ? 'opacity-50' : 'hover:bg-primary-black-750'}
        transition-colors duration-200
      `}
    >
      {/* Main Row - matching inventory grid pattern */}
      <div 
        className="flex items-center gap-3 py-2 px-3"
        style={{ minHeight: '56px' }}
      >
        {/* Position Badge - grey like inventory */}
        <div className="flex-shrink-0 flex items-center justify-center w-10">
          <span className="px-2 py-1 rounded text-xs font-bold bg-primary-black-700 text-primary-black-300">
            {positionAbbrev}
          </span>
        </div>

        {/* Player Icon */}
        <div className="flex-shrink-0 relative rounded bg-primary-black-700 flex items-center justify-center w-10 h-10 border-2 border-gray-500">
          <svg className="w-6 h-6 text-primary-black-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          {/* Line 1: Name + Team */}
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="text-sm font-bold text-primary-black-50 truncate">
              {player.player_name}
            </h4>
            <span className="px-1.5 py-0.5 bg-primary-black-700 text-primary-black-400 rounded text-[10px] font-semibold flex-shrink-0">
              {player.team_abbreviation}
            </span>
          </div>
          
          {/* Line 2: Projection */}
          <div className="text-xs text-primary-black-400">
            Proj: <span className="text-primary-green-400 font-semibold">{Number(player.weekly_projected_points).toFixed(1)}</span> pts
          </div>
        </div>

        {/* Right Side: Price + CTA */}
        <div className="flex-shrink-0 flex items-center gap-3">
          {/* Price */}
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" />
            </svg>
            <span className="text-sm font-semibold text-white">
              {player.coin_cost}
            </span>
          </div>

          {/* CTA */}
          {isClaiming ? (
            <div className="w-16 flex justify-center">
              <svg className="animate-spin h-5 w-5 text-primary-black-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : player.in_inventory ? (
            <span className="text-xs text-primary-black-500">
              In Roster
            </span>
          ) : player.already_claimed ? (
            <span className="text-xs text-primary-black-500">
              Claimed
            </span>
          ) : !canAfford ? (
            <span className="text-xs text-red-400">
              Need {player.coin_cost - userCoins}
            </span>
          ) : disabled ? (
            <span className="text-xs text-primary-black-500">
              Select Team
            </span>
          ) : (
            <button
              onClick={handleClaim}
              className="px-3 py-1.5 bg-primary-green-500 hover:bg-primary-green-400 rounded-md transition-colors"
            >
              <span className="text-xs font-semibold text-primary-black-950">
                Claim
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

FreeAgentCard.propTypes = {
  player: PropTypes.shape({
    id: PropTypes.string.isRequired,
    player_card_id: PropTypes.string.isRequired,
    player_name: PropTypes.string.isRequired,
    player_position: PropTypes.string.isRequired,
    team_abbreviation: PropTypes.string.isRequired,
    weekly_projected_points: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    coin_cost: PropTypes.number.isRequired,
    already_claimed: PropTypes.bool,
    in_inventory: PropTypes.bool,
  }).isRequired,
  onClaim: PropTypes.func.isRequired,
  isClaiming: PropTypes.bool,
  userCoins: PropTypes.number,
  disabled: PropTypes.bool,
};
