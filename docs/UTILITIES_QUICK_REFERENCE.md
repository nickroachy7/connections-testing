# Quick Reference: Using New Utilities

## Import Patterns

### Using Index Files (Recommended)
```javascript
// Import multiple utilities from one place
import { 
  filterPlayersByPosition, 
  sortPlayersByName,
  formatTimeAgo 
} from '../utils';

import { 
  createEmptyLineup, 
  getRankColor,
  getActivityIcon 
} from '../constants';

import { 
  useCurrentWeek, 
  useDebounce,
  useLocalStorage 
} from '../hooks';
```

## Common Use Cases

### 1. Initialize Empty Lineup
```javascript
import { createEmptyLineup } from '../constants/lineup';

const [lineup, setLineup] = useState(createEmptyLineup());
```

### 2. Filter Players by Position
```javascript
import { filterPlayersByPosition } from '../utils/filters';

const qbs = filterPlayersByPosition(players, 'QB');
const all = filterPlayersByPosition(players, 'all'); // No filter
```

### 3. Filter Starters vs Bench
```javascript
import { filterPlayersByLineupStatus } from '../utils/filters';

const starters = filterPlayersByLineupStatus(inventory.players, true);
const bench = filterPlayersByLineupStatus(inventory.players, false);
```

### 4. Filter Injured Players
```javascript
import { filterPlayersByInjuryStatus } from '../utils/filters';

const injured = filterPlayersByInjuryStatus(players, 'injured');
const questionable = filterPlayersByInjuryStatus(players, 'questionable');
```

### 5. Sort Players
```javascript
import { sortPlayersByName, sortPlayersByProjection } from '../utils/sorting';

const alphabetical = sortPlayersByName(players);
const topProjected = sortPlayersByProjection(players); // Descending by default
```

### 6. Sort Leaderboard
```javascript
import { sortLeaderboard } from '../utils/sorting';

const sorted = sortLeaderboard(leaderboardData, 'week'); // 'week', 'projected', 'season', 'wins'
```

### 7. Format Time
```javascript
import { formatTimeAgo } from '../utils/time';

const timeString = formatTimeAgo(activity.created_at); // "5m ago"
```

### 8. Get Rank Color
```javascript
import { getRankColor } from '../constants/ui';

const colorClass = getRankColor(1); // "text-yellow-400"
<span className={getRankColor(rank)}>{rank}</span>
```

### 9. Get Activity Icon
```javascript
import { getActivityIcon } from '../constants/ui';

const icon = getActivityIcon('pack_purchase'); // "📦"
```

### 10. Use Current Week Hook
```javascript
import { useCurrentWeek } from '../hooks/useSupabase';

function MyComponent() {
  const { currentWeek, loading, error } = useCurrentWeek();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>Week {currentWeek.week}</div>;
}
```

### 11. Use Teams Hook
```javascript
import { useTeams } from '../hooks/useSupabase';

function MyComponent() {
  const { teams, loading, error } = useTeams({ 
    isActive: true, 
    isBot: false 
  });
  
  // teams is automatically filtered
}
```

### 12. Debounce Search
```javascript
import { useDebounce } from '../hooks/useDebounce';

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  
  useEffect(() => {
    // Only runs 500ms after user stops typing
    performSearch(debouncedSearch);
  }, [debouncedSearch]);
}
```

### 13. Detect Click Outside
```javascript
import { useClickOutside } from '../hooks/useClickOutside';

function DropdownComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useClickOutside(() => setIsOpen(false));
  
  return (
    <div ref={ref}>
      {/* Dropdown content */}
    </div>
  );
}
```

### 14. Track Previous Value
```javascript
import { usePrevious } from '../hooks/usePrevious';

function MyComponent({ teamId }) {
  const previousTeamId = usePrevious(teamId);
  
  useEffect(() => {
    if (previousTeamId !== teamId) {
      console.log('Team changed!');
    }
  }, [teamId, previousTeamId]);
}
```

### 15. Use Local Storage
```javascript
import { useLocalStorage } from '../hooks/useStorage';

function MyComponent() {
  const [favorites, setFavorites] = useLocalStorage('favorites', []);
  
  const addFavorite = (item) => {
    setFavorites([...favorites, item]);
    // Automatically persists to localStorage
  };
}
```

## Migration Examples

### Before vs After

#### Example 1: Lineup Initialization
```javascript
// ❌ Before
const [lineup, setLineup] = useState({
  QB: null,
  RB1: null,
  RB2: null,
  WR1: null,
  WR2: null,
  WR3: null,
  TE: null,
  FLEX: null,
  BENCH: []
});

// ✅ After
import { createEmptyLineup } from '../constants/lineup';
const [lineup, setLineup] = useState(createEmptyLineup());
```

#### Example 2: Filtering Players
```javascript
// ❌ Before
const qbs = players.filter(p => p.position === 'QB');
const injured = players.filter(p => {
  const status = p.player_card?.injury_status || 'healthy';
  return status !== 'healthy';
});

// ✅ After
import { filterPlayersByPosition, filterPlayersByInjuryStatus } from '../utils/filters';
const qbs = filterPlayersByPosition(players, 'QB');
const injured = filterPlayersByInjuryStatus(players, 'injured');
```

#### Example 3: Sorting
```javascript
// ❌ Before
const sorted = [...players].sort((a, b) => {
  const nameA = `${a.first_name} ${a.last_name}`;
  const nameB = `${b.first_name} ${b.last_name}`;
  return nameA.localeCompare(nameB);
});

// ✅ After
import { sortPlayersByName } from '../utils/sorting';
const sorted = sortPlayersByName(players);
```

#### Example 4: Time Formatting
```javascript
// ❌ Before
const formatTimeAgo = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'Just now';
  // ... more logic
};
const time = formatTimeAgo(activity.created_at);

// ✅ After
import { formatTimeAgo } from '../utils/time';
const time = formatTimeAgo(activity.created_at);
```

## Best Practices

1. **Always use utilities instead of duplicating logic**
   - Check `/src/utils/`, `/src/constants/`, `/src/hooks/` first
   - If a utility doesn't exist, create it rather than duplicating

2. **Use index imports for cleaner code**
   - `import { ... } from '../utils'` instead of individual files
   - Makes refactoring easier if files move

3. **Prefer custom hooks for data fetching**
   - Instead of useEffect with fetch logic, use `useQuery` or specialized hooks
   - Handles loading/error states automatically

4. **Use constants for all magic values**
   - Position names, cache durations, UI constants
   - Single source of truth prevents bugs

5. **Extract complex logic into utilities**
   - If logic is more than 3-4 lines, consider a utility function
   - Name utilities by what they do: `filterPlayersByPosition`, not `filter`

## Testing

All utilities are pure functions and can be easily tested:

```javascript
import { filterPlayersByPosition } from '../utils/filters';

describe('filterPlayersByPosition', () => {
  it('filters QBs correctly', () => {
    const players = [
      { name: 'Player 1', position: 'QB' },
      { name: 'Player 2', position: 'RB' }
    ];
    const result = filterPlayersByPosition(players, 'QB');
    expect(result).toHaveLength(1);
    expect(result[0].position).toBe('QB');
  });
});
```
