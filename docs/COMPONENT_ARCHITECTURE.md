# Component Architecture Guide

**Last Updated**: November 25, 2025

This document provides a clear overview of the component hierarchy and responsibilities in the Connections Testing fantasy football app.

---

## 📊 Component Hierarchy

```
App.jsx (Root Router)
├── RootLayout (Header + Footer wrapper)
│   ├── TeamsLayout (Team selection page wrapper)
│   │   └── TeamSelection (Team list page)
│   │
│   └── FantasyLayout (Team-specific page wrapper)
│       ├── TeamManager (Starting Lineup page)
│       ├── Inventory (Inventory page)
│       ├── PackShop (Pack shop page)
│       ├── Leaderboard (Leaderboard page)
│       └── Activity (Activity feed page)
│
└── PackOpening (Standalone full-screen pack opening)
```

---

## 🏗️ Layout Components

### **RootLayout**
- **Location**: `src/App.jsx`
- **Purpose**: Main application wrapper
- **Provides**: Header and Footer across all pages
- **Used by**: All routes except PackOpening

### **TeamsLayout**
- **Location**: `src/components/TeamsLayout.jsx`
- **Purpose**: Wrapper for team selection page
- **Provides**: 
  - TeamsPageBanner (persistent header for team list)
  - Team list state management
- **Used by**: `/fantasy` route (team selection)

### **FantasyLayout**
- **Location**: `src/components/FantasyLayout.jsx`
- **Purpose**: Wrapper for team-specific pages
- **Provides**:
  - FantasyContext (shared state across team pages)
  - FantasyNavBanner (persistent header showing team info)
  - Live game data subscriptions
  - Projections data
  - Inventory management
- **Used by**: All `/teams/:teamId/*` routes

---

## 🎯 Page Components

### **TeamManager** (Starting Lineup Page)
- **Location**: `src/pages/TeamManager.jsx`
- **Route**: `/teams/:teamId/starting-lineup`
- **Purpose**: Main lineup building interface
- **Key Features**:
  - Drag-and-drop lineup management
  - Bench player management
  - Token application
  - Auto-save functionality
  - Multiple view modes (grid, horizontal, list)
- **Key Child Components**:
  - `LineupGrid` - Drag-and-drop grid view of lineup slots
  - `LineupListView` - List view of lineup with position slots
  - `BenchFilterManager` - Filtered bench/token section
  - `BenchPlayerSwapModal` - Modal for swapping bench ↔ lineup
  - `TokenApplicationModal` - Modal for applying tokens

### **Inventory**
- **Location**: `src/pages/Inventory.jsx`
- **Route**: `/teams/:teamId/inventory`
- **Purpose**: View and manage all owned players and tokens
- **Key Features**:
  - Swipe-to-sell on mobile
  - Bulk selection and selling
  - Grid and list views
  - Player/token filtering
- **Key Child Components**:
  - `InventoryPanel` - Main inventory display

### **PackShop**
- **Location**: `src/pages/PackShop.jsx`
- **Route**: `/teams/:teamId/pack-shop`
- **Purpose**: Purchase packs with coins
- **Key Features**:
  - Pack display with pricing
  - Purchase confirmation
  - Navigation to pack opening

### **Leaderboard**
- **Location**: `src/pages/Leaderboard.jsx`
- **Route**: `/teams/:teamId/leaderboard`
- **Purpose**: Display weekly rankings
- **Key Features**:
  - Team rankings by week
  - Win/loss records
  - Score tracking

### **Activity**
- **Location**: `src/pages/Activity.jsx`
- **Route**: `/teams/:teamId/activity`
- **Purpose**: Recent user activity feed
- **Key Features**:
  - Pack openings
  - Player acquisitions
  - Sales history

---

## 🧩 Core Reusable Components

### **PageHeader** ⭐ (NEW)
- **Location**: `src/components/PageHeader.jsx`
- **Purpose**: Consistent header design across all pages
- **Layout**:
  - **Left**: Page name (large) + helpful info/status below (smaller)
  - **Right**: Actions (filters, buttons, view toggles, etc.)
- **Key Features**:
  - Isolated component that doesn't affect other page layouts
  - Responsive design with mobile-optimized sizing
  - Flexible actions prop for custom buttons/controls
  - Optional subtitle prop for dynamic status text
- **Used by**: All main pages (TeamManager, Inventory, PackShop, Leaderboard, Activity)
- **Props**:
  - `title` (required) - Page name displayed prominently
  - `subtitle` (optional) - Status text or helpful info (can be string or JSX)
  - `actions` (optional) - JSX for buttons, filters, controls on the right
  - `className` (optional) - Additional CSS classes for spacing

**Example Usage**:
```jsx
<PageHeader
  title="Inventory"
  subtitle={`Roster: ${inventory.players?.length || 0}/20`}
  actions={
    <>
      <ViewToggleButtons />
      <FilterTabs />
    </>
  }
/>
```

---

### **BenchFilterManager** ⭐ (NEW NAME)
- **Location**: `src/components/BenchFilterManager.jsx`
- **Old Name**: BenchAndTokensPanel
- **Purpose**: **Business logic layer** for filtering bench players and tokens
- **Does**:
  - Manages ALL/PLAYERS/TOKENS tab state
  - Handles position-based filtering (when user clicks empty slot)
  - Handles token-based filtering (when user clicks + on player card)
  - Enriches data with live scores and projections
  - Auto-scrolls to filtered content
- **Does NOT**: Render UI directly (delegates to UnifiedItemList)
- **Used by**: TeamManager page only
- **Key Props**:
  - `benchPlayers` - Players not in lineup
  - `availableTokens` - All tokens in inventory
  - `filterPosition` - Position to filter by (e.g., "QB")
  - `tokenFilterPlayerId` - Player ID to show tokens for
  - `onMoveToSlot` - Callback for adding player to lineup
  - `onApplyTokenToPlayer` - Callback for applying token

**Why it exists**: TeamManager needs complex filtering logic that shouldn't bloat the page component or the rendering component. This is the perfect middle layer.

---

### **UnifiedItemList** ⭐ (NEW UNIFIED COMPONENT)
- **Location**: `src/components/tables/UnifiedItemList.jsx`
- **Purpose**: **Pure rendering component** for player/token lists
- **Replaced**: PlayerTable, TokenTable, parts of LineupListView
- **Modes**:
  1. **`mode="inventory"`**: Shows swipe-to-sell, bulk selection, grid/list toggle
  2. **`mode="lineup"`**: Shows position-based lineup slots with drag-drop
  3. **`mode="bench"`**: Shows add-to-lineup buttons for bench players/tokens
- **Key Features**:
  - SwipeableRow integration for mobile gestures
  - Responsive table/grid rendering
  - Live score and projection display
  - Token boost indicators
  - Game status badges (locked when live/final)
- **Used by**:
  - InventoryPanel (mode="inventory")
  - LineupListView (mode="lineup")
  - BenchFilterManager (mode="bench")

**Why it exists**: Eliminated code duplication across 3 different table components while maintaining unique features for each context.

---

### **InventoryPanel**
- **Location**: `src/components/InventoryPanel.jsx`
- **Purpose**: Display user's inventory on Inventory page
- **Key Features**:
  - Tab switching (PLAYERS/TOKENS)
  - View mode toggle (grid/list)
  - Filter controls
  - Swipe-to-sell functionality
  - Bulk sell mode
- **Uses**: `UnifiedItemList` with mode="inventory"

---

### **LineupGrid**
- **Location**: `src/components/LineupGrid.jsx`
- **Purpose**: Grid-based drag-and-drop lineup builder
- **Key Features**:
  - Drag-and-drop for lineup slots
  - Token badges on players
  - Live scores and projections
  - Empty slot placeholders
  - Game status indicators (locked when live)
- **Used by**: TeamManager page

---

### **LineupListView**
- **Location**: `src/components/LineupListView.jsx`
- **Purpose**: List-based lineup view (alternative to grid)
- **Key Features**:
  - Position-based rows (QB, RB1, RB2, etc.)
  - Shows projected/live points
  - Token boost indicators
- **Uses**: `UnifiedItemList` with mode="lineup"
- **Used by**: TeamManager page

---

## 🎨 Banner Components

### **FantasyNavBanner**
- **Location**: `src/components/FantasyNavBanner.jsx`
- **Purpose**: Persistent header for team-specific pages
- **Displays**:
  - Team name and logo
  - Username
  - Win-Loss record
  - Coins balance
  - Current week score
  - Score vs median indicator
  - Navigation tabs
- **Composed of**:
  - `TeamMatchupBanner` (team info and stats)
  - `FantasyNavigation` (page navigation tabs)

### **TeamsPageBanner**
- **Location**: `src/components/TeamsPageBanner.jsx`
- **Purpose**: Header for team selection page
- **Displays**:
  - Username
  - Total teams count
  - "Create New Team" button
  - Navigation tabs (MY TEAMS / LOBBY)

---

## 🔔 Modal Components

### **BenchPlayerSwapModal**
- **Location**: `src/components/BenchPlayerSwapModal.jsx`
- **Purpose**: Modal for swapping players between bench and lineup
- **Modes**:
  1. **slot-to-bench**: Pick a bench player to fill empty slot
  2. **bench-to-lineup**: Pick a lineup slot to swap with bench player
- **Key Features**:
  - Shows only eligible players/slots based on position
  - Displays live scores and projections
  - Filters out locked players (games live/final)

### **TokenApplicationModal**
- **Location**: `src/components/TokenApplicationModal.jsx`
- **Purpose**: Modal for applying a token to a lineup player
- **Key Features**:
  - Shows token boost preview
  - Displays projected point increase
  - Prevents applying to locked players

### **PlayerCardModal**
- **Location**: `src/components/PlayerCardModal.jsx`
- **Purpose**: Full-screen player card view
- **Displays**: Player stats, rarity, projections, game info

### **SellConfirmationModal**
- **Location**: `src/components/SellConfirmationModal.jsx`
- **Purpose**: Confirm player/token sale
- **Displays**: Sell value, card details, confirmation prompt

### **TeamCustomizationModal**
- **Location**: `src/components/TeamCustomizationModal.jsx`
- **Purpose**: Edit team name and logo
- **Key Features**: Form validation, logo selection

---

## 🎴 Card Components

### **PlayerCard**
- **Location**: `src/components/PlayerCard.jsx`
- **Purpose**: Reusable player card display
- **Variants**:
  - Compact mode (small cards)
  - Full mode (detailed view)
  - Draggable mode (lineup building)
  - Locked mode (game live/final)
- **Displays**: Photo, name, position, team, rarity, points, token boost

### **PackAnimation**
- **Location**: `src/components/PackAnimation.jsx`
- **Purpose**: Animated pack opening sequence
- **Key Features**:
  - 3D flip animation
  - Card reveal sequence
  - Rarity-based effects

---

## 📊 Widget Components

### **LiveScoreWidget**
- **Location**: `src/components/LiveScoreWidget.jsx`
- **Purpose**: Real-time score display during games
- **Displays**: Current score, game status, time remaining

### **LeaderboardWidget**
- **Location**: `src/components/LeaderboardWidget.jsx`
- **Purpose**: Compact leaderboard display
- **Used by**: Dashboard and other pages

### **RecentActivityFeed**
- **Location**: `src/components/RecentActivityFeed.jsx`
- **Purpose**: Shows recent user actions
- **Displays**: Pack openings, sales, acquisitions

---

## 🛠️ Utility Components

### **LoadingSpinner**
- **Location**: `src/components/LoadingSpinner.jsx`
- **Purpose**: Consistent loading indicator

### **SkeletonLoader**
- **Location**: `src/components/SkeletonLoader.jsx`
- **Purpose**: Skeleton screens for loading states

### **ErrorBoundary**
- **Location**: `src/components/ErrorBoundary.jsx`
- **Purpose**: Catch and display React errors gracefully

### **SwipeableRow**
- **Location**: `src/components/SwipeableRow.jsx`
- **Purpose**: Touch gesture wrapper for swipe-to-sell
- **Used by**: UnifiedItemList in inventory mode

---

## 🎯 Component Decision Tree

### "I need to display a list of players/tokens"
→ Use **UnifiedItemList** with appropriate mode:
- Inventory page? `mode="inventory"`
- Lineup view? `mode="lineup"`
- Bench section? `mode="bench"`

### "I need to manage bench filtering logic"
→ Use **BenchFilterManager** (it uses UnifiedItemList internally)

### "I need a player card"
→ Use **PlayerCard** component

### "I need a full-screen player view"
→ Use **PlayerCardModal**

### "I need a persistent header on team pages"
→ Already provided by **FantasyLayout** (FantasyNavBanner)

### "I need a modal for user confirmation"
→ Check existing modals first (SellConfirmationModal, TokenApplicationModal, etc.)

---

## 🔄 Recent Refactoring (November 2025)

### Consolidation of List Components
**Problem**: Duplicate code across PlayerTable, TokenTable, and LineupListView made maintenance difficult.

**Solution**: Created **UnifiedItemList** with mode-based rendering:
- ✅ Eliminated ~800 lines of duplicate code
- ✅ Maintained all unique features (swipe-to-sell, bulk select, position slots)
- ✅ Consistent UI across inventory, lineup, and bench views

### Renaming for Clarity
**Problem**: "BenchAndTokensPanel" name didn't clearly convey its filtering role.

**Solution**: Renamed to **BenchFilterManager**:
- ✅ Name reflects its purpose (manages filters, not just a panel)
- ✅ Clear distinction: BenchFilterManager = logic layer, UnifiedItemList = rendering layer

---

## 📝 Best Practices

### When Creating New Components:
1. **Check for existing components first** - avoid duplication
2. **Use UnifiedItemList** for player/token lists instead of creating new tables
3. **Keep components focused** - one responsibility per component
4. **Separate logic from rendering** - follow BenchFilterManager pattern
5. **Use PropTypes** for runtime validation
6. **Document complex components** with JSDoc comments

### Component Naming:
- **Pages**: Noun (e.g., TeamManager, Inventory)
- **Layouts**: [Thing]Layout (e.g., FantasyLayout, TeamsLayout)
- **Modals**: [Purpose]Modal (e.g., SellConfirmationModal)
- **Managers**: [Thing]Manager (e.g., BenchFilterManager)
- **Widgets**: [Thing]Widget (e.g., LiveScoreWidget)
- **Panels**: [Thing]Panel (e.g., InventoryPanel)

---

## 🔍 Quick Reference

| Component | Type | Used By | Purpose |
|-----------|------|---------|---------|
| **BenchFilterManager** | Manager | TeamManager | Filter logic for bench/tokens |
| **UnifiedItemList** | Renderer | 3 places | Unified player/token list rendering |
| **LineupGrid** | Display | TeamManager | Drag-drop grid lineup builder |
| **InventoryPanel** | Display | Inventory page | Full inventory view |
| **FantasyNavBanner** | Banner | All team pages | Persistent team header |
| **PlayerCard** | Card | Many | Reusable player card |
| **PackAnimation** | Animation | PackOpening | Pack reveal animation |

---

**Need help?** Check this guide first before creating new components. Most use cases are already covered by existing components.
