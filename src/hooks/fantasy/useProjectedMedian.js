import { useMemo } from 'react';

/**
 * Custom hook to calculate the projected median score across all teams
 * This shows users what the competitive benchmark will be BEFORE games start
 * 
 * @param {number} currentWeek - Current NFL week number
 * @param {number} seasonYear - Current season year
 * @param {Array} allTeamsProjections - Array of all teams' projected scores
 * @returns {Object} - { projectedMedian, totalTeams, isCalculating }
 */
export function useProjectedMedian(currentWeek, seasonYear, allTeamsProjections) {
  const median = useMemo(() => {
    console.log('🧮 useProjectedMedian calculating...', {
      currentWeek,
      seasonYear,
      teamsCount: allTeamsProjections?.length || 0,
      scores: allTeamsProjections
    });

    if (!allTeamsProjections || allTeamsProjections.length === 0) {
      console.log('⚠️ No teams projections available for median calculation');
      return {
        projectedMedian: 0,
        totalTeams: 0,
        isCalculating: false
      };
    }

    // Sort scores to find median
    const sortedScores = [...allTeamsProjections].sort((a, b) => a - b);
    const count = sortedScores.length;
    
    let medianValue;
    if (count % 2 === 0) {
      // Even number of teams - average of middle two
      const mid1 = sortedScores[count / 2 - 1];
      const mid2 = sortedScores[count / 2];
      medianValue = (mid1 + mid2) / 2;
      console.log(`📊 MEDIAN (even): (${mid1.toFixed(1)} + ${mid2.toFixed(1)}) / 2 = ${medianValue.toFixed(1)}`);
    } else {
      // Odd number of teams - middle value
      medianValue = sortedScores[Math.floor(count / 2)];
      console.log(`📊 MEDIAN (odd): ${medianValue.toFixed(1)} (middle of ${count} teams)`);
    }

    console.log(`✅ Projected Median: ${medianValue.toFixed(1)} pts from ${count} teams`);

    return {
      projectedMedian: medianValue,
      totalTeams: count,
      isCalculating: count > 0
    };
  }, [allTeamsProjections]);

  return median;
}
