# Projected Points Architecture - Production Implementation

## Overview

This document describes the **production-ready** architecture for calculating and displaying projected points, live points, and projected final scores in the FantasyNavBanner.

## Problem Solved

**Before**: Projected points in the banner did NOT update when players were added/removed from lineups, breaking the core fantasy sports experience.

**Root Cause**: Complex calculation logic scattered across components with stale data and useEffect dependency issues.

**Solution**: Centralized calculation using a custom hook with `useMemo` for automatic reactivity.

---

## Architecture

### 1. **Custom Hook: `useLineupStats`**

Location: `src/hooks/fantasy/useLineupStats.js`

**Purpose**: Single source of truth for ALL lineup calculations. Uses `useMemo` to automatically recalculate when dependencies change.

**Returns**:
```javascript
{
  projectedPoints: number,      // Sum of projected points for starting lineup
  livePoints: number,            // Sum of live points (games in progress/final)
  projectedFinal: number,        // Live + projected for games not started
  playerBreakdown: array,        // Per-position details
  hasAnyLiveGames: boolean,      // Any games currently live
  hasAnyFinalGames: boolean      // Any games completed
}
```

**Key Feature**: Calculations happen automatically whenever `lineup`, `projections`, or `liveGameData` changes. No manual useEffect needed!

**Example**:
```javascript
const stats = useLineupStats(lineup, projections, liveGameData);
// stats.projectedPoints updates INSTANTLY when lineup changes
```

---

### 2. **FantasyContext Integration**

Location: `src/contexts/FantasyContext.jsx`

**Enhancement**: Context now exposes `lineupStats` as a derived value:

```javascript
const FantasyContext = {
  // Raw state
  lineup,
  projections,
  liveGameData,
  
  // Derived stats (always up-to-date)
  lineupStats: {
    projectedPoints,
    livePoints,
    projectedFinal,
    ...
  }
};
```

**Benefits**:
- ✅ All components get the same calculation results
- ✅ No duplicate calculation logic
- ✅ Automatic updates when any dependency changes
- ✅ Performance optimized with `useMemo`

---

### 3. **FantasyNavBanner Simplification**

Location: `src/components/FantasyNavBanner.jsx`

**Before** (REMOVED):
```javascript
// Old approach - manual calculation in useEffect
useEffect(() => {
  let total = 0;
  positions.forEach(pos => {
    const player = lineup[pos];
    // Complex calculation logic...
  });
  setProjectedPoints(total);
}, [lineup, projections]); // Dependency issues!
```

**After** (PRODUCTION):
```javascript
// New approach - consume from context
const { lineupStats } = useFantasy();
const projectedPoints = lineupStats?.projectedPoints || 0;

// That's it! Updates automatically when lineup changes
```

**Result**: 
- 90% less code in the component
- No more stale data issues
- No more useEffect dependency problems
- Pure presentational component

---

## Data Flow

```
User Action (Add/Remove Player)
  ↓
TeamManager updates lineup state
  ↓
FantasyContext lineup state changes
  ↓
useLineupStats hook detects change (via useMemo dependencies)
  ↓
Hook recalculates all values
  ↓
FantasyContext re-renders with new lineupStats
  ↓
FantasyNavBanner receives updated lineupStats
  ↓
Banner displays new projected points INSTANTLY
```

---

## Calculation Logic

### Projected Points (Week Not Live)
```javascript
sum(lineup[position].weekly_projected_points for each position)
```

### Live Points (Week Live)
```javascript
sum(player.currentPoints for players where game is live/final)
```

### Projected Final (Week Live)
```javascript
sum of:
  - Live points (for games started)
  + Projected points (for games not started)
```

This gives users the most accurate prediction of their final score during live games.

---

## Key Benefits

### 1. **Immediate Reactivity**
Players added/removed from lineup → projected points update INSTANTLY

### 2. **Single Source of Truth**
All calculations happen in one place (`useLineupStats`), preventing inconsistencies

### 3. **Performance Optimized**
`useMemo` ensures calculations only run when dependencies actually change

### 4. **Maintainable**
- Custom hook is easy to test
- Logic is isolated and reusable
- Components stay focused on presentation

### 5. **Type Safe**
Hook returns consistent shape, making it easy to add TypeScript later

### 6. **Scalable**
Easy to add new derived calculations (e.g., `averageProjected`, `benchStrength`, etc.)

---

## Usage Examples

### In Any Component

```javascript
import { useFantasy } from '../contexts/FantasyContext';

function MyComponent() {
  const { lineupStats } = useFantasy();
  
  return (
    <div>
      <p>Projected: {lineupStats.projectedPoints.toFixed(1)}</p>
      <p>Live: {lineupStats.livePoints.toFixed(1)}</p>
      <p>Projected Final: {lineupStats.projectedFinal.toFixed(1)}</p>
    </div>
  );
}
```

### Debugging

```javascript
const { lineupStats } = useFantasy();

console.log('Player Breakdown:', lineupStats.playerBreakdown);
// Output:
// [
//   { position: 'QB', playerName: 'Patrick Mahomes', projected: 22.5, live: 0, gameStatus: 'scheduled' },
//   { position: 'RB1', playerName: 'Christian McCaffrey', projected: 18.2, live: 12.4, gameStatus: 'live' },
//   ...
// ]
```

---

## Testing Approach

### Unit Test the Hook

```javascript
import { renderHook } from '@testing-library/react-hooks';
import { useLineupStats } from './useLineupStats';

test('calculates projected points correctly', () => {
  const lineup = { QB: mockPlayer1, RB1: mockPlayer2 };
  const projections = new Map([
    [mockPlayer1.id, { projected: 20 }],
    [mockPlayer2.id, { projected: 15 }]
  ]);
  
  const { result } = renderHook(() => 
    useLineupStats(lineup, projections, new Map())
  );
  
  expect(result.current.projectedPoints).toBe(35);
});
```

---

## Future Enhancements

### Easy to Add

1. **Average Projected Per Position**
   ```javascript
   averageProjectedByPosition: {
     QB: 22.5,
     RB: 15.2,
     WR: 12.8
   }
   ```

2. **Strength Rating**
   ```javascript
   teamStrength: 'Strong' | 'Average' | 'Weak' // Based on projection variance
   ```

3. **Week-over-Week Comparison**
   ```javascript
   comparedToLastWeek: +5.2 // Projected points difference
   ```

All of these can be added to the hook without touching any components!

---

## Migration Notes

### Props Removed from FantasyNavBanner

- ~~`lineup`~~ - Now from context
- ~~`projections`~~ - Now from context  
- ~~`liveGameData`~~ - Now from context

### Benefits of Removal

- Smaller prop drilling
- Guaranteed consistency (everyone uses same source)
- Easier refactoring

---

## Best Practices

### ✅ DO

- Use `lineupStats` from context for all derived calculations
- Add new calculations to the hook, not components
- Trust the `useMemo` dependency array
- Log `playerBreakdown` for debugging

### ❌ DON'T

- Calculate projected points in components
- Create local state for derived values
- Duplicate calculation logic across components
- Manually trigger recalculations

---

## Conclusion

This architecture follows **React best practices** and **fantasy sports industry standards**:

1. **Single Source of Truth** - FantasyContext
2. **Derived State** - Calculated via `useMemo`
3. **Separation of Concerns** - Calculation (hook) vs Presentation (component)
4. **Performance** - Only recalculates when needed
5. **Maintainability** - Easy to test, debug, and extend

The projected points now update **INSTANTLY** when users modify their lineup, providing the core fantasy sports experience users expect.
