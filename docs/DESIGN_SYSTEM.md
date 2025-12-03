# Design System Guide

> **Visual best practices and design standards for YapSports**
> Updated: December 2025

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Icons & Visuals](#icons--visuals)
6. [Component Styling](#component-styling)
7. [Patterns & Anti-Patterns](#patterns--anti-patterns)

---

## Design Philosophy

### Core Principles

1. **Clean & Compact** - Maximize information density without clutter
2. **Dark Theme First** - Primary black backgrounds, light text
3. **Minimal Visual Noise** - No emojis, use solid icons only
4. **Consistent Rhythm** - Uniform spacing and sizing
5. **Mobile-First** - Design for mobile, scale up to desktop
6. **Performance** - Avoid heavy animations, prioritize speed

### Visual Identity

| Element | Approach |
|---------|----------|
| Background | Dark (#0d0d0d to #1a1a1a) |
| Primary Accent | Green (#22c55e) - Success, active, positive |
| Secondary Accent | Orange (#f97316) - Warnings, attention |
| Text | White primary, gray secondary |
| Borders | Subtle, low contrast (primary-black-700) |

---

## Color System

### Primary Palette (Use These)

```
Background Layers:
├── primary-black-950 (#000000) - Deepest background
├── primary-black-900 (#0d0d0d) - Main background
├── primary-black-800 (#1a1a1a) - Card backgrounds
├── primary-black-700 (#262626) - Elevated surfaces
└── primary-black-600 (#404040) - Borders, dividers

Text Colors:
├── white - Primary text
├── primary-black-300 (#cccccc) - Secondary text
├── primary-black-400 (#999999) - Tertiary/muted text
└── primary-black-500 (#666666) - Disabled text

Accent Colors:
├── primary-green-500 (#22c55e) - Primary actions, success
├── primary-green-600 (#16a34a) - Hover states
├── accent-orange-500 (#f97316) - Warnings, attention
└── accent-orange-600 (#ea580c) - Hover states
```

### Position Colors (Standardized)

| Position | Background | Text |
|----------|------------|------|
| QB | `bg-red-600` | `text-white` |
| RB | `bg-primary-green-600` | `text-white` |
| WR | `bg-blue-600` | `text-white` |
| TE | `bg-purple-600` | `text-white` |
| FLEX | `bg-yellow-600` | `text-black` |
| SFLX | `bg-pink-600` | `text-white` |
| BN (Bench) | `bg-primary-black-700` | `text-primary-black-300` |

**Implementation**: Import from `constants/colors.js`:
```javascript
import { POSITION_COLORS, getPositionColor } from '@/constants/colors';
```

#### When to Use Position Colors

Position badge colors are **context-dependent**:

| Context | `slotKey` Prop | Badge Color | Meaning |
|---------|----------------|-------------|---------|  
| **Starting Lineup** | `"QB"`, `"RB1"`, etc. | **Colored** | Player is assigned to this slot |
| **Bench** | `null` | **Grey** | Player is on bench, not slotted |
| **Inventory** | `null` | **Grey** | Player is in inventory, not in lineup |

This visual distinction helps users understand at a glance:
- **Colored badge** = Player is slotted in the starting lineup
- **Grey badge** = Player is available but not currently in a position slot

**Implementation in PlayerRow.jsx:**
```jsx
// Only use colored badges when slotKey is explicitly provided
if (!slotKey) {
  return 'bg-primary-black-700 text-primary-black-300';  // Grey
}
return getPositionColorClassesFromConstants(slotKey, isLocked);  // Colored
```

### Tier Colors (Standardized)

| Tier | Badge Color | Border |
|------|-------------|--------|
| All-Star (A) | `bg-purple-500 text-white` | `border-purple-500` |
| Starter (S) | `bg-blue-500 text-white` | `border-blue-500` |
| Role Player (R) | `bg-green-500 text-white` | `border-green-500` |
| Base (B) | `bg-gray-500 text-white` | `border-gray-500` |

### Status Colors

| Status | Color |
|--------|-------|
| Live | `text-primary-green-400` + pulse animation |
| Final | `text-primary-black-400` |
| Pre-Game | `text-primary-black-400` |
| Locked | `text-primary-black-500` (dimmed) |
| Win | `text-primary-green-500` |
| Loss | `text-red-500` |

### Colors to AVOID (Legacy)

Do NOT use these legacy prefixes in new code:
- ❌ `dk-green-*` → Use `primary-green-*`
- ❌ `dk-orange-*` → Use `accent-orange-*`
- ❌ `dk-black-*` → Use `primary-black-*`
- ❌ `dk-navy-*` → Deprecated

---

## Typography

### Font Scale

| Use Case | Class | Size |
|----------|-------|------|
| Page Title | `text-xl font-bold` | 20px |
| Section Header | `text-lg font-semibold` | 18px |
| Card Title | `text-base font-semibold` | 16px |
| Body Text | `text-sm` | 14px |
| Secondary Text | `text-xs text-primary-black-400` | 12px |
| Badge/Label | `text-[10px] font-bold` | 10px |
| Micro Text | `text-[9px]` | 9px |

### Header Hierarchy

There are two levels of headers used in the app. **Both have transparent backgrounds** so the page background color shows through.

| Level | Component | Use Case | Example |
|-------|-----------|----------|---------|  
| **Page** | `PageHeader` | Top of each page | "Inventory", "Starting Lineup" |
| **Section** | `SectionHeader` | Sub-sections within a page | "Bench 13", "Tokens 6" |

**PageHeader** (`src/components/PageHeader.jsx`):
- Large title (`text-lg sm:text-xl`, white)
- Optional subtitle with status info (supports JSX for icons/dynamic content)
- Right-side actions (buttons, filters, toggles)
- **Transparent background** - page color shows through
- Used once at top of each main page

```jsx
<PageHeader 
  title="Inventory" 
  subtitle="Roster: 15/20"
  actions={<ViewToggle />}
/>

// Subtitle with JSX (e.g., icons, dynamic status)
<PageHeader 
  title="Starting Lineup"
  subtitle={
    <div className="flex items-center gap-1">
      <CheckIcon className="w-3 h-3" />
      <span className="text-primary-green-500">Lineup Saved</span>
    </div>
  }
/>
```

**SectionHeader** (`src/components/ui/SectionHeader.jsx`):
- Smaller title (`text-sm`, muted gray `text-primary-black-300`)
- Optional count displayed inline (not a badge)
- Optional right-side actions
- **Transparent background** - page color shows through
- Used for sub-sections like Bench, Tokens, Players

```jsx
<SectionHeader 
  title="Bench" 
  count={13}
/>
```

**NEVER use raw `<h3>` tags for section headers** - always use `SectionHeader` for consistency.

### Text Rules

1. **Primary text**: White (`text-white`)
2. **Secondary text**: Gray (`text-primary-black-300` or `text-primary-black-400`)
3. **Disabled text**: Muted (`text-primary-black-500`)
4. **No underlines** except for links
5. **Truncate long text** with `truncate` class

---

## Spacing & Layout

### Row Backgrounds (Standardized)

**All list rows use the same alternating background pattern:**

```jsx
// Consistent across ALL lists: PlayerRow, TokenRow, TokenTable, etc.
${index % 2 === 0 ? 'bg-primary-black-800/30' : 'bg-primary-black-800/50'}
```

| Row Type | Even Rows | Odd Rows |
|----------|-----------|----------|
| All Lists | `bg-primary-black-800/30` | `bg-primary-black-800/50` |

**DO NOT use:**
- ❌ `bg-primary-black-800` / `bg-primary-black-900` (too much contrast)
- ❌ `bg-primary-black-800/20` / `bg-primary-black-800/40` (inconsistent with new standard)

This creates subtle alternating stripes that are consistent across:
- Starting Lineup
- Bench
- Inventory
- Token lists
- Any other row-based list

### Spacing Scale

Use Tailwind's default spacing scale consistently:

| Spacing | Value | Use Case |
|---------|-------|----------|
| `p-1` / `gap-1` | 4px | Tight spacing (badges) |
| `p-2` / `gap-2` | 8px | Compact spacing (list items) |
| `p-3` / `gap-3` | 12px | Standard spacing |
| `p-4` / `gap-4` | 16px | Section spacing |
| `p-6` / `gap-6` | 24px | Large section breaks |

### Component Spacing

| Component Type | Internal Padding | Gap Between Items |
|----------------|------------------|-------------------|
| Card | `p-3` or `p-4` | - |
| List Item | `py-2 px-3` | `gap-2` |
| Modal | `p-4` | `gap-4` |
| Badge | `px-1.5 py-0.5` | - |
| Button | `px-3 py-2` or `px-4 py-2` | - |

### Layout Patterns

```jsx
// Standard list item
<div className="flex items-center gap-3 py-2 px-3">

// Card container
<div className="bg-primary-black-800 rounded-lg p-4">

// Section with header
<div className="space-y-3">
  <h3 className="text-sm font-semibold text-primary-black-300">Section</h3>
  {/* content */}
</div>
```

### Mobile Responsiveness

| Pattern | Implementation |
|---------|----------------|
| Hide on mobile | `hidden md:block` |
| Show only mobile | `block md:hidden` |
| Responsive padding | `p-3 md:p-4` |
| Responsive text | `text-sm md:text-base` |

---

## Icons & Visuals

### Icon Guidelines

| ✅ DO | ❌ DON'T |
|-------|----------|
| Use solid icons | Use emojis |
| Use SVG or icon libraries | Use image icons |
| Use consistent sizing | Mix icon sizes randomly |
| Match icon color to context | Use colorful icons |

### Recommended Icons

For icons, use **Lucide React** or **Heroicons**:

```jsx
import { ChevronRight, Settings, User } from 'lucide-react';

<ChevronRight className="w-4 h-4 text-primary-black-400" />
```
