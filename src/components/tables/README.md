# Unified Table System

## Overview

The table system provides consistent, grid-based layouts for player and token lists across all pages. The exact same visual design is used everywhere, with page-specific features added through props and composition.

## Core Components

### `PlayerTable.jsx`
Unified player table with CSS Grid layout.

### `TokenTable.jsx`
Unified token table with CSS Grid layout.

## Usage Examples

### 1. Inventory Page (with bulk selection and tier/level)

```jsx
import PlayerTable from '@/components/tables/PlayerTable';
import TokenTable from '@/components/tables/TokenTable';

function InventoryPanel() {
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [selectedTokens, setSelectedTokens] = useState([]);

  const handlePlayerBulkSelect = (player, checked) => {
    if (checked) {
      setSelectedPlayers([...selectedPlayers, player.id]);
    } else {
      setSelectedPlayers(selectedPlayers.filter(id => id !== player.id));
    }
  };

  return (
    <>
      {/* Players with bulk select and tier/level columns */}
      <PlayerTable
        players={players}
        showBulkSelect={true}
        showTierLevel={true}
        selectedIds={selectedPlayers}
        onBulkSelectChange={handlePlayerBulkSelect}
        isRowLocked={(player) => player.is_locked}
        emptyMessage="No players in inventory"
      />

      {/* Tokens with bulk select */}
      <TokenTable
        tokens={tokens}
        showBulkSelect={true}
        selectedIds={selectedTokens}
        onBulkSelectChange={handleTokenBulkSelect}
        emptyMessage="No tokens available"
      />
    </>
  );
}
```

### 2. Starting Lineup Page (drag & drop, no bulk select)

```jsx
import PlayerTable from '@/components/tables/PlayerTable';
import TokenTable from '@/components/tables/TokenTable';

function BenchAndTokensPanel() {
  const handlePlayerDragStart = (e, player) => {
    e.dataTransfer.setData('player', JSON.stringify(player));
  };

  const handleTokenDragStart = (e, token) => {
    e.dataTransfer.setData('token', JSON.stringify(token));
  };

  return (
    <>
      {/* Bench players - draggable, no bulk select */}
      <PlayerTable
        players={benchPlayers}
        showBulkSelect={false}
        showTierLevel={false}
        onRowDragStart={handlePlayerDragStart}
        isRowLocked={(player) => player.is_locked || isGameLive(player)}
        emptyMessage="Bench is empty"
        emptyIcon="🪑"
      />

      {/* Available tokens - draggable */}
      <TokenTable
        tokens={availableTokens}
        showBulkSelect={false}
        onRowDragStart={handleTokenDragStart}
        emptyMessage="No tokens available"
      />
    </>
  );
}
```

### 3. Filtered View (custom action column)

```jsx
import PlayerTable from '@/components/tables/PlayerTable';

function FilteredPlayerSelection({ onSelectPlayer, positionFilter }) {
  // Custom row rendering with "MOVE" button
  const renderActionColumn = (player) => (
    <div className="flex-shrink-0">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelectPlayer(player);
        }}
        className="px-4 py-1.5 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 rounded text-xs font-bold"
      >
        MOVE
      </button>
    </div>
  );

  // Custom row className for filtered state
  const getFilteredRowClass = (player, index, isLocked) => `
    flex items-center gap-4 px-2 py-3 transition-all border-l-4
    ${isLocked ? 'border-red-500/50 opacity-60' : 'border-primary-green-500/30'}
    ${index % 2 === 0 ? 'bg-primary-black-900' : 'bg-primary-black-800/50'}
  `;

  return (
    <PlayerTable
      players={players.filter(p => p.position === positionFilter)}
      showBulkSelect={false}
      showTierLevel={false}
      renderExtraRowColumns={renderActionColumn}
      getRowClassName={getFilteredRowClass}
      emptyMessage={`No ${positionFilter} players available`}
    />
  );
}
```

## Key Benefits

### ✅ Visual Consistency
- Same column widths across all pages
- Same header styling
- Same hover states and transitions
- Same row striping and colors

### ✅ Alignment Guarantee
- CSS Grid prevents column shifting
- Dividers stay in place
- Content can appear/disappear without layout shifts

### ✅ Easy Customization
- **showBulkSelect**: Add checkboxes (inventory page)
- **showTierLevel**: Add tier/level columns (inventory only)
- **renderExtraColumns**: Inject custom columns (action buttons, etc.)
- **getRowClassName**: Custom styling per page
- **isRowLocked**: Control locked state logic

### ✅ Flexible Interactions
- **onRowClick**: Click handler
- **onRowDragStart/End**: Drag & drop
- **onBulkSelectChange**: Checkbox handling

## Grid Specifications

### Player Table
```
Grid: 24px 40px 40px 160px 24px 70px 90px 60px 50px 24px 60px 60px 70px 70px [50px 60px]
Columns:
1. Empty/Checkbox (24px)
2. Position Badge (40px)
3. Icon (40px)
4. Player Name (160px)
5. Divider (24px)
6. Opponent (70px)
7. Status (90px)
8. Projected (60px)
9. Score (50px)
10. Divider (24px)
11. Position Rank (60px)
12. Season Avg (60px)
13. Pull % (70px)
14. Sell (70px)
15. Tier (50px) - optional
16. Level (60px) - optional
```

### Token Table
```
Grid: 24px 40px 40px 160px 24px 70px 1fr 24px 70px 70px
Columns:
1. Empty/Checkbox (24px)
2. Type Badge (40px)
3. Icon (40px)
4. Token Name (160px)
5. Divider (24px)
6. Rarity (70px)
7. Description (flexible)
8. Divider (24px)
9. Bonus (70px)
10. Sell (70px)
```

## Anti-Pattern: Don't Do This

❌ **Copying and pasting table markup to each page**
```jsx
// Bad: Duplicate markup in every component
function InventoryPanel() {
  return (
    <div className="grid ...">
      {/* 200 lines of table markup */}
    </div>
  );
}

function BenchPanel() {
  return (
    <div className="grid ...">
      {/* Same 200 lines, slightly different */}
    </div>
  );
}
```

✅ **Using shared table components**
```jsx
// Good: One component, different configurations
function InventoryPanel() {
  return <PlayerTable players={players} showBulkSelect={true} showTierLevel={true} />;
}

function BenchPanel() {
  return <PlayerTable players={players} showBulkSelect={false} showTierLevel={false} />;
}
```

## Maintenance

When you need to change the table design:
1. Update `PlayerTable.jsx` or `TokenTable.jsx`
2. All pages automatically get the change
3. No risk of inconsistency

When you need page-specific features:
1. Use props (`showBulkSelect`, `renderExtraColumns`, etc.)
2. Don't modify the base table
3. Keep the core visual design identical
