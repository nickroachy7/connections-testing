import PropTypes from 'prop-types';
import BenchList from './tables/BenchList';
import TokenTable from './tables/TokenTable';
import { enrichPlayerData, enrichTokenData } from './tables/tableHelpers.jsx';
import { calculatePlayerSellValue, calculateTokenSellValue } from '../utils/sellValueCalculator';

/**
 * BenchFilterManager Component
 * 
 * Displays all bench players and tokens in a simple list without tabs/filters
 */
export default function BenchFilterManager({
  benchPlayers = [],
  tokens,
  availableTokens,
  onBenchPlayerClick,
  onTokenClick,
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
          <h3 className="text-sm font-semibold text-primary-black-300 mb-2 px-2">
            Bench ({enrichedBench.length})
          </h3>
          <BenchList
            benchPlayers={enrichedBench}
            onPlayerClick={onBenchPlayerClick}
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
          <h3 className="text-sm font-semibold text-primary-black-300 mb-2 px-2">
            Tokens ({enrichedTokens.length})
          </h3>
          <TokenTable
            tokens={enrichedTokens}
            onRowClick={onTokenClick}
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
