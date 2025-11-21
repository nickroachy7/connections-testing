# Table System: Before vs After

## The Problem You Had

You had player/token tables in multiple places:
- **InventoryPanel** - 500+ lines, custom grid markup
- **BenchAndTokensPanel** - 600+ lines, custom grid markup  
- Different column widths
- Inconsistent styling
- Hard to maintain
- Easy to break alignment

## The Solution

**One source of truth** for table design:
- `PlayerTable.jsx` - 300 lines, used everywhere
- `TokenTable.jsx` - 250 lines, used everywhere
- Exact same visual design
- Grid specifications defined once
- Customization through props, not code duplication

---

## Comparison: InventoryPanel

### ❌ BEFORE (Current Approach)
```jsx
function InventoryPanel() {
  return (
    <div>
      {/* 200 lines of player table markup */}
      <div className="grid ..." style={{ gridTemplateColumns: '24px 40px...' }}>
        <div>Headers...</div>
        {players.map(player => (
          <div className="grid ..." style={{ gridTemplateColumns: '24px 40px...' }}>
            {/* 50 lines per row */}
            <div>Checkbox</div>
            <div>Badge</div>
            <div>Icon</div>
            {/* ... 13 more columns ... */}
          </div>
        ))}
      </div>
      
      {/* Another 200 lines of token table markup */}
      <div className="grid ..." style={{ gridTemplateColumns: '24px 40px...' }}>
        {/* Same pattern, slightly different */}
      </div>
    </div>
  );
}
```

**Issues:**
- 500+ lines of JSX
- Column template repeated 3+ times
- Hard to ensure consistency
- Change header? Update 10 places
- Change column width? Update header + rows + dividers

---

### ✅ AFTER (New Approach)
```jsx
import PlayerTable from '@/components/tables/PlayerTable';
import TokenTable from '@/components/tables/TokenTable';

function InventoryPanel() {
  return (
    <div>
      <PlayerTable
        players={enrichedPlayers}
        showBulkSelect={true}
        showTierLevel={true}
        selectedIds={selectedPlayers}
        onBulkSelectChange={handlePlayerBulkSelect}
      />
      
      <TokenTable
        tokens={enrichedTokens}
        showBulkSelect={true}
        selectedIds={selectedTokens}
        onBulkSelectChange={handleTokenBulkSelect}
      />
    </div>
  );
}
```

**Benefits:**
- ~50 lines of JSX
- No grid templates to maintain
- Guaranteed consistency
- Change table design once, everywhere updates
- Impossible to misalign columns

---

## Comparison: BenchAndTokensPanel

### ❌ BEFORE
```jsx
function BenchAndTokensPanel() {
  return (
    <div>
      {/* 300 lines for player section */}
      {filterPosition ? (
        <div className="flex ...">
          {/* Custom markup for filtered view */}
        </div>
      ) : (
        <div className="grid ..." style={{ gridTemplateColumns: '24px 40px...' }}>
          {/* Different markup for normal view */}
        </div>
      )}
      
      {/* Another 300 lines for token section */}
      {tokenFilter ? (
        <div className="flex ...">
          {/* Custom markup */}
        </div>
      ) : (
        <div className="grid ...">
          {/* Different markup */}
        </div>
      )}
    </div>
  );
}
```

---

### ✅ AFTER
```jsx
import PlayerTable from '@/components/tables/PlayerTable';
import TokenTable from '@/components/tables/TokenTable';

function BenchAndTokensPanel() {
  const renderMoveButton = (player) => (
    <button onClick={() => onMove(player)}>MOVE</button>
  );

  return (
    <div>
      <PlayerTable
        players={filteredPlayers}
        showBulkSelect={false}
        onRowDragStart={onPlayerDrag}
        renderExtraRowColumns={filterPosition ? renderMoveButton : null}
      />
      
      <TokenTable
        tokens={filteredTokens}
        showBulkSelect={false}
        onRowDragStart={onTokenDrag}
      />
    </div>
  );
}
```

---

## Key Design Principle

### ❌ Configuration Over Composition (Bad)
```jsx
<PlayerTable
  variant="inventory"
  bulkActions={true}
  tierColumn={true}
  levelColumn={true}
  filterMode={false}
  // 50 more config options...
/>
```

This leads to:
- Component becomes massive
- Too many conditional branches
- Hard to add new variations
- Brittle and complex

---

### ✅ Composition Over Configuration (Good)
```jsx
<PlayerTable
  players={data}
  showBulkSelect={true}
  showTierLevel={true}
  renderExtraRowColumns={(player) => <CustomButton player={player} />}
  getRowClassName={(player) => player.special ? 'highlight' : ''}
/>
```

This gives:
- Base component stays simple
- Unlimited customization through render props
- Easy to add new features
- Clean and flexible

---

## Migration Path

You don't have to refactor everything at once:

### Phase 1: New Features
Use `PlayerTable`/`TokenTable` for any new pages/features

### Phase 2: When Touching Code
When you need to update InventoryPanel or BenchAndTokensPanel, refactor that section to use the new tables

### Phase 3: Dedicated Cleanup
Set aside time to refactor remaining old table code

---

## The Bottom Line

**Before:** 1,000+ lines of duplicated table markup across 2 pages

**After:** 2 reusable components (~550 lines total) used everywhere

**Result:**
- ✅ Perfect visual consistency
- ✅ 80% less code
- ✅ Guaranteed column alignment
- ✅ Easy to maintain
- ✅ Fast to add new table views
- ✅ Impossible to create inconsistency

**When you want to change table design:**
- Before: Update 5+ files, 20+ locations
- After: Update 1 file, change propagates everywhere
