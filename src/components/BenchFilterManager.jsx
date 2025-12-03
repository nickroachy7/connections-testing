import PropTypes from 'prop-types';
import BenchList from './tables/BenchList';
import TokenTable from './tables/TokenTable';
import { SectionHeader } from './ui';
import { enrichPlayerData, enrichTokenData } from './tables/tableHelpers.jsx';
import { calculatePlayerSellValue, calculateTokenSellValue } from '../utils/sellValueCalculator';

/**
 * BenchFilterManager Component
 * 
 * Displays all bench players and tokens in a simple list without tabs/filters
 * 
 * CLICK BEHAVIOR:
 * - Position badge click: Opens swap modal (triggers onBenchPlayerClick/onTokenClick)
 * - Row click: For future player detail view (not currently used)
 * 
 * This design prevents accidental modal triggers when users just want to view details.
 */
export default function BenchFilterManager({
  benchPlayers = [],
  tokens,
  availableTokens,
  onBenchPlayerClick,  // Called when position badge is clicked (opens swap modal)
  onTokenClick,        // Called when token badge is clicked (opens apply modal)
  liveGameData,
  projections,
  onSell,
  onSellToken,
  teamStartsNextWeek = false
}) {
  // Use tokens or availableTokens (for backward compatibility)
  const tokensList = tokens || availableTokens || [];

  // Enrich bench players with game data and calculate sell value
  const enrichedBench = (benchPlayers || []).map(player => {
    const enriched = enrichPlayerData(player, liveGameData, projections);
    return {
      ...enriched,
      sellValue: enriched.sellValue || calculatePlayerSellValue(enriched)
    };
  });

  // Enrich tokens and calculate sell value
  const enrichedTokens = tokensList.map(token => {
    const enriched = enrichTokenData(token);
    return {
      ...enriched,
      sellValue: enriched.sellValue || calculateTokenSellValue(enriched)
    };
  });

  return (
    <div className="space-y-4">
      {/* Bench Players - always shown */}
      {enrichedBench.length > 0 && (
        <div>
          <SectionHeader title="Bench" count={enrichedBench.length} />
          <BenchList
            benchPlayers={enrichedBench}
            onPlayerBadgeClick={onBenchPlayerClick}
            onSell={onSell}
            liveGameData={liveGameData}
            projections={projections}
            teamStartsNextWeek={teamStartsNextWeek}
          />
        </div>
      )}

      {/* Tokens - always shown */}
      {enrichedTokens.length > 0 && (
        <div>
          <SectionHeader title="Tokens" count={enrichedTokens.length} />
          <TokenTable
            tokens={enrichedTokens}
            onBadgeClick={onTokenClick}
            onSell={onSellToken}
            emptyMessage="No tokens available"
          />
        </div>
      )}

      {/* Empty state */}
      {enrichedBench.length === 0 && enrichedTokens.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-2 opacity-30">🏈</div>
          <p className="text-primary-black-400 font-semibold">No items in your bench</p>
          <p className="text-primary-black-500 text-sm mt-1">Open packs to add more players and tokens!</p>
        </div>
      )}
    </div>
  );
}

BenchFilterManager.propTypes = {
  benchPlayers: PropTypes.array,
  tokens: PropTypes.array,
  availableTokens: PropTypes.array,
  onBenchPlayerClick: PropTypes.func,
  onTokenClick: PropTypes.func,
  liveGameData: PropTypes.object,
  projections: PropTypes.object,
  onSell: PropTypes.func,
  onSellToken: PropTypes.func,
  teamStartsNextWeek: PropTypes.bool
};
