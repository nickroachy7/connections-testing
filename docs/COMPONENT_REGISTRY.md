# Component Registry

> **Single source of truth** for all UI components in YapSports.
> Updated: December 2025

---

## Table of Contents

1. [Component Categories](#component-categories)
2. [Core Components](#core-components)
3. [Shared Components](#shared-components)
4. [Feature Components](#feature-components)
5. [Naming Conventions](#naming-conventions)
6. [Component Decision Matrix](#component-decision-matrix)

---

## Component Categories

All components are organized into clear categories:

| Category | Purpose | Location |
|----------|---------|----------|
| **Core** | Base building blocks (buttons, badges, modals) | `components/ui/` |
| **Shared** | Reusable across features (PlayerRow, TokenRow) | `components/shared/` |
| **Feature** | Feature-specific (Lineup, Inventory, Market) | `components/features/` |
| **Layout** | Page structure (Header, Navigation, Footer) | `components/layout/` |
| **Tables** | List/Table displays | `components/tables/` |

---

## Core Components (Base Building Blocks)

### Badges
| Component | Purpose | Props |
|-----------|---------|-------|
| `PositionBadge` | Display QB/RB/WR/TE/FLEX/SFLX position | `position`, `isLocked?`, `size?` |
| `TierBadge` | Display player tier (B/R/S/A) | `tier`, `size?` |
| `StatusBadge` | Game status (LIVE/FINAL/PRE-GAME) | `status`, `size?` |
| `InjuryBadge` | Injury status (Q/D/O/IR) | `status` |

### Headers
| Component | Purpose | Props |
|-----------|---------|-------|
| `PageHeader` | Top-level page title | `title`, `subtitle?`, `actions?` |
| `SectionHeader` | Sub-section header within pages | `title`, `count?`, `actions?` |

**Header Hierarchy:**
- Use `PageHeader` for top of pages (e.g., "Inventory", "Starting Lineup")
- Use `SectionHeader` for sections within pages (e.g., "Bench (5)", "Tokens (6)")
- NEVER use raw `<h3>` tags for section headers

### Modals
| Component | Purpose | Props |
|-----------|---------|-------|
| `BaseModal` | Standard centered modal | `isOpen`, `onClose`, `title`, `children` |
| `BottomSheet` | Mobile slide-up modal | `isOpen`, `onClose`, `title`, `children` |
| `ConfirmationModal` | Yes/No confirmation | `isOpen`, `onClose`, `onConfirm`, `message` |
| **`SwapModal`** | **UNIFIED swap/selection modal** | See SwapModal section below |

#### SwapModal - Unified Selection Modal

**SwapModal is the ONLY component for swap/selection operations.** It replaces the previous 4 separate modals:
- ~~PlayerSwapModal~~ (deleted)
- ~~BenchPlayerSwapModal~~ (deleted)
- ~~TokenSelectionModal~~ (deleted)
- ~~TokenApplicationModal~~ (deleted)

**Mode Reference:**
| Mode | Current Item | Choose From | Action |
|------|--------------|-------------|--------|
| `swap-player` | Lineup player | Bench players | Swap positions |
| `add-player` | Empty slot | Bench players | Add to slot |
| `place-player` | Bench player | Lineup slots | Place in lineup |
| `select-token` | Player | Available tokens | Apply token |
| `apply-token` | Token | Lineup players | Apply to player |

**Required Props:**
- `mode`: One of the modes above
- `isOpen`: Boolean
- `onClose`: Close handler
- `onSelect`: Called with selected item

**Conditional Props (based on mode):**
- `currentPlayer`: For swap-player, place-player, select-token modes
- `currentToken`: For apply-token mode
- `currentSlot`: For swap-player, add-player modes
- `players`: Array of selectable players
- `tokens`: Array of selectable tokens
- `slots`: Array of selectable slot keys
- `lineup`: Current lineup object (for place-player mode)
- `liveGameData`, `projections`: Game data Maps
- `onNavigateToShop`: Optional "Go to Shop" action

### Feedback
| Component | Purpose | Props |
|-----------|---------|-------|
| `LoadingSpinner` | Loading indicator | `size?`, `message?` |
| `EmptyState` | No data placeholder | `icon?`, `message`, `action?` |
| `ErrorBoundary` | Error fallback | `children`, `fallback?` |

### Prompts & CTAs
| Component | Purpose | Props |
|-----------|---------|-------|
| `EnterContestPrompt` | Prompt users to join contests when not in one | `week`, `onEnterClick`, `size?` |

### Navigation
| Component | Purpose | Props |
|-----------|---------|-------|
| `TabBar` | Horizontal tab navigation | `tabs`, `activeTab`, `onChange` |
| `BackButton` | Navigate back | `onClick?`, `fallbackPath?` |

---

## Shared Components (Reusable)

### Player Display
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `PlayerRow` | Single player row in lists | Lineup lists, bench, inventory |
| `PlayerRowCompact` | Condensed player display | Modals, selection lists |
| `PlayerAvatar` | Player image/placeholder | Any player display |
| `PlayerMeta` | Name, team, matchup info | Combined with other components |
| `PlayerPoints` | Score/projection display | Any point display |

### Token Display
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `TokenRow` | Single token row in lists | Token inventory, selection |
| `TokenRowCompact` | Condensed token display | Modals |
| `TokenIcon` | Token type icon | Any token reference |

### Stats & Scores
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `PointsDisplay` | Formatted points (projected/actual) | Anywhere points shown |
| `RecordDisplay` | W-L record | Team/contest standings |
| `CoinDisplay` | Currency with icon | Anywhere coins shown |

---

## Feature Components

### Lineup Feature (`features/lineup/`)
| Component | Purpose |
|-----------|---------|
| `LineupPage` | Main lineup page container |
| `StartingLineupSection` | Starting lineup list |
| `BenchSection` | Bench players/tokens display |
| `LineupSlot` | Single lineup position slot |
| `SwapModal` | **UNIFIED** modal for all swap/selection operations (see Core Modals) |

### Inventory Feature (`features/inventory/`)
| Component | Purpose |
|-----------|---------|
| `InventoryPage` | Main inventory page |
| `InventoryList` | Player/token list |
| `InventoryFilters` | Filter controls |
| `SellModal` | Confirm sell action |

### Market Feature (`features/market/`)
| Component | Purpose |
|-----------|---------|
| `MarketPage` | Main market page |
| `PackShop` | Pack purchase section |
| `PackCard` | Single pack display |
| `FreeAgency` | Free agent section |
| `FreeAgentRow` | Single free agent |

### Contest Feature (`features/contest/`)
| Component | Purpose |
|-----------|---------|
| `ContestPage` | Main contest page |
| `AvailableContestBanner` | Available contest for joining (3-row structure) |
| `EnteredContestBanner` | Entered contest with scores + expandable standings |
| `StandingsTable` | Contest standings |
| `StandingsRow` | Single team in standings |

#### Contest Banner Components (UNIFIED STRUCTURE)

**Both banner types follow a consistent 3-row structure:**

**Row 1 - Header:** Contest type icon (colored by type), Name, Description, Participant count

**Row 2 - Details:** Win Condition | Scoring Format | Field Size

**Row 3 - Stakes:** Risk (heart/ticket), Reward (coins), [Join button for Available only]

**EnteredContestBanner Additional Rows:**
- **Row 4 - Scoring:** Status badge, progress bar, scores (varies by H2H/Median/Top Score)
- **Expandable:** Standings panel (click to expand)

**Contest Type Colors:**
| Type | Color | Icon |
|------|-------|------|
| Median | Blue (`text-blue-400`) | Target |
| H2H | Orange (`text-orange-400`) | Swords |
| Top Score | Yellow (`text-yellow-400`) | Crown |
| Survivor | Purple (`text-purple-400`) | Zap |

**Legacy Components (DEPRECATED):**
- ~~`ContestCard`~~ → Use `AvailableContestBanner`
- ~~`TeamScoreBanner`~~ → Use `EnteredContestBanner`
- ~~`ExpandableContestBanner`~~ → Use `EnteredContestBanner`

### Token Feature (`features/tokens/`)
| Component | Purpose |
|-----------|---------|
| `TokenSelectModal` | Select token to apply |
| `TokenApplyModal` | Apply token to player |

---

## Layout Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `Header` | Main app header | `layout/Header` |
| `FantasyNavigation` | Main navigation | `layout/FantasyNavigation` |
| `FantasyLayout` | Page wrapper | `layout/FantasyLayout` |
| `Footer` | App footer | `layout/Footer` |
| `PageHeader` | Page title section | `layout/PageHeader` |
| `TeamBanner` | Team info banner | `layout/TeamBanner` |

---

## Naming Conventions

### Component Naming Rules

1. **Use PascalCase** for all components
2. **Be specific** - name should describe what it does
3. **Use suffixes** consistently:
   - `*Modal` - Overlay/popup component
   - `*Sheet` - Bottom sheet (mobile)
   - `*Page` - Full page component
   - `*List` - List container
   - `*Row` - Single item in a list
   - `*Card` - Card-style container
   - `*Badge` - Small status indicator
   - `*Section` - Page section wrapper
   - `*Button` - Clickable action
   - `*Icon` - Icon/visual element

### Naming Examples

| ✅ Good | ❌ Avoid |
|---------|----------|
| `PlayerRow` | `Player` (too generic) |
| `SwapModal` (unified) | Multiple swap modal variants |
| `PositionBadge` | `Badge` (what kind?) |
| `StandingsRow` | `TeamRow` (in what context?) |
| `PackCard` | `PackItem` (Card is more specific) |

---

## Component Decision Matrix

Use this matrix to determine whether to **create a new component** or **use an existing one**:

### When to CREATE a new component:

| Scenario | Justification |
|----------|---------------|
| Unique UI pattern not covered | No existing component matches |
| Reusable across 3+ places | Worth abstracting |
| Complex logic self-contained | Encapsulation benefit |
| Clear single responsibility | Can be named specifically |

### When to REUSE an existing component:

| Scenario | Component to Use |
|----------|------------------|
| Display a player anywhere | `PlayerRow` or `PlayerRowCompact` |
| Display a token anywhere | `TokenRow` or `TokenRowCompact` |
| Need a modal/popup | `BaseModal` or `BottomSheet` |
| Show loading state | `LoadingSpinner` |
| Display points/score | `PointsDisplay` |
| Show position label | `PositionBadge` |

### When to EXTEND vs CREATE:

| If you need... | Action |
|----------------|--------|
| Slightly different styling | Add prop to existing |
| Different data shape | Create variant or new |
| Additional functionality | Compose existing + new |
| Same UI, different context | Reuse with props |

---

## Migration Plan

### Phase 1: Create Core Components
- [ ] Extract `PositionBadge` (centralize position colors)
- [ ] Extract `TierBadge` (centralize tier display)
- [ ] Create `BaseModal` and `BottomSheet`
- [ ] Standardize `LoadingSpinner`

### Phase 2: Consolidate Shared Components
- [ ] Consolidate `PlayerRow` variations
- [ ] Consolidate `TokenRow` variations
- [ ] Create `PlayerRowCompact` for modals

### Phase 3: Organize Feature Components
- [ ] Move feature components to `features/` directories
- [ ] Delete unused components
- [ ] Update all imports

### Phase 4: Delete Deprecated Components
See [DEPRECATED_COMPONENTS.md] for removal list.

---

## Quick Reference: What Component Do I Use?

```
Need to display a player?
├── In a list → PlayerRow
├── In a modal → PlayerRowCompact
└── Just the avatar → PlayerAvatar

Need to display a token?
├── In a list → TokenRow
└── In a modal → TokenRowCompact

Need a popup?
├── Desktop-centered → BaseModal
├── Mobile-friendly → BottomSheet
└── Confirmation → ConfirmationModal

Need status indicator?
├── Game status → StatusBadge
├── Position → PositionBadge
├── Tier → TierBadge
└── Injury → InjuryBadge

Need loading state?
└── Always → LoadingSpinner

Need empty state?
└── Always → EmptyState
```

---

**Last Updated**: December 2, 2025
**Maintained By**: Development Team
