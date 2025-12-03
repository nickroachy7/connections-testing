# Component Technical Debt & Consolidation Plan

> **Tracking document** for component architecture improvements.
> Updated: December 2025

---

## ✅ COMPLETED - Phase 1: Position Color Centralization

**Problem**: Position color logic (`getPositionColor`) was duplicated in 6+ files.

**Solution**: Created `constants/colors.js` with centralized exports.

**Files Updated**:
- ✅ `TokenApplicationModal.jsx` - Now uses `BottomSheet` + `PlayerRowCompact`
- ✅ `TokenSelectionModal.jsx` - Now uses `BottomSheet` + `TokenRowCompact`
- ✅ `BenchPlayerSwapModal.jsx` - Now uses `BottomSheet` + `PlayerRowCompact`
- ✅ `PlayerSwapModal.jsx` - Now uses `BottomSheet` + `PlayerRowCompact`
- ✅ `tables/PlayerRow.jsx` - Uses `getPositionColorClassesFromConstants`
- ✅ `tables/StartingLineupList.jsx` - Uses `getPositionColorClasses`
- ✅ `tables/UnifiedItemList.jsx` - Uses `getPositionColorClasses`

---

## ✅ COMPLETED - Phase 2: Base UI Components Created

**New Components in `components/ui/`**:
- ✅ `BottomSheet.jsx` - Shared mobile bottom sheet modal
- ✅ `PositionBadge.jsx` - Centralized position badge component
- ✅ `TierBadge.jsx` - Player tier badge (A/S/R/B)
- ✅ `PlayerRowCompact.jsx` - Compact player row for modals
- ✅ `TokenRowCompact.jsx` - Compact token row for modals
- ✅ `index.js` - Barrel export file

---

## ✅ COMPLETED - Phase 3: Modal Consolidation

**Before**: 4 large modals with duplicated patterns (~1,500 lines total)
**After**: 4 slim modals using shared components (~500 lines total)

**Refactored**:
- ✅ `PlayerSwapModal.jsx` - 345 lines → 140 lines
- ✅ `BenchPlayerSwapModal.jsx` - 437 lines → 220 lines
- ✅ `TokenSelectionModal.jsx` - 324 lines → 105 lines
- ✅ `TokenApplicationModal.jsx` - 391 lines → 125 lines

**Deleted Old Files**:
- ✅ `PlayerSwapModal.old.jsx`
- ✅ `BenchPlayerSwapModal.old.jsx`
- ✅ `TokenSelectionModal.old.jsx`
- ✅ `TokenApplicationModal.old.jsx`

---

## Immediate Cleanup Complete ✅

The following unused components were removed:
- `ContestInfoBanner.jsx`
- `GameStatusBadge.jsx`
- `LineupPreview.jsx`
- `SkeletonLoader.jsx`
- `TeamCustomizationModal.jsx`
- `TeamsPageBanner.jsx`
- `WelcomeTutorial.jsx`
- `LineupHorizontalView.jsx`
- `tables/PlayerTable.jsx`
- `tables/UnifiedItemList.jsx.bak`

---

## 🔄 IN PROGRESS - Phase 4: Directory Reorganization

**Current Structure**:
```
components/
├── [40+ flat files]
├── tables/
└── ui/
    ├── BottomSheet.jsx ✅
    ├── PositionBadge.jsx ✅
    ├── TierBadge.jsx ✅
    ├── PlayerRowCompact.jsx ✅
    ├── TokenRowCompact.jsx ✅
    └── index.js ✅
```

**Target Structure** (Future work):
```
components/
├── ui/                    # Base components ✅ DONE
├── shared/                # Move PlayerRow, TokenRow here
├── layout/                # Move Header, Navigation, Footer
└── features/              # Feature-specific components
```

---

## Remaining Technical Debt (Lower Priority)

### 1. Large Component Splitting

#### `FantasyNavigation.jsx` (~400 lines)
Could be split into:
- `NavBar.jsx` - Top nav bar
- `MobileSidebar.jsx` - Mobile drawer
- `UserMenu.jsx` - User dropdown

#### `FantasyNavBanner.jsx` (~1000 lines)
Could be split into:
- `TeamBanner.jsx` - Team name/record
- `ScoreSummary.jsx` - Points display
- `MatchupInfo.jsx` - vs Median display

### 2. Bench Component Consolidation
- `BenchAndTokensPanel.jsx` (284 lines)
- `BenchFilterManager.jsx` (97 lines)
Could be merged into single `BenchSection` component.

---

## Metrics

| Metric | Before | After |
|--------|--------|-------|
| Components in root | 56 | 44 |
| Duplicated position color logic | 7 files | 0 |
| Modal total lines | ~1,500 | ~500 |
| UI components in ui/ | 0 | 6 |
| Lines saved | - | ~1,000+ |

---

**Last Updated**: December 2, 2025
