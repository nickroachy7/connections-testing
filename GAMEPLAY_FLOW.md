# Gameplay Flow & User Experience

> **CRITICAL**: This document defines the complete user journey and gameplay experience. Always reference this file when implementing features that affect user flow. Update this document whenever gameplay mechanics change.

---

## New User Onboarding

### Account Creation & Team Setup
1. **Landing Page** → User clicks "Get Started" or "Sign Up"
2. **Authentication** → User creates account via Supabase Auth (email/password)
3. **Team Creation Flow**:
   - User prompted to create their first fantasy team
   - User enters team name
   - User selects their favorite NFL team (optional, cosmetic)
   - Team is created in database with user_id association

### Starter Pack Experience
**IMMEDIATELY** after team creation:
- User receives **1 Starter Pack** automatically
- Modal/page displays "Welcome! Here's your Starter Pack"
- Pack opening animation plays
- **Starter Pack Contents**:
  - 5-7 random players (mix of tiers: 1-2 high tier, 3-4 mid tier, 1-2 low tier)
  - 50 starting tokens
  - Players are automatically added to user's inventory
  - Tokens credited to user's account

**Post-Starter Pack**:
- User is directed to their **Inventory** to view their new players
- Tutorial overlay explains:
  - How to build a lineup
  - Token system basics
  - Contest participation

---

## Core Gameplay Loop

### 1. Building a Lineup
**Location**: `/team-manager` or Dashboard

**Flow**:
1. User views their **Lineup Grid** (QB, RB1, RB2, WR1, WR2, WR3, TE, FLEX, DEF)
2. User clicks empty position slot
3. **Player Selection Modal** opens showing:
   - Available players from inventory filtered by position
   - Player stats (projected points, recent performance)
   - Tier badges
4. User selects player → Player fills position slot
5. Repeat until lineup is complete (9 positions filled)

**Validations**:
- Cannot submit lineup with empty positions
- Cannot use same player in multiple positions
- Position eligibility enforced (e.g., QB can't play RB)

### 2. Global Season Competition
**Location**: Dashboard

**Global Season Structure**:
- **All teams compete together** in a single global season
- **18-week season** with weekly matchups
- **3-loss elimination**: Teams are eliminated after accumulating 3 losses
- **No contest selection**: Everyone plays in the same unified competition

**Weekly Flow**:
1. User sets their lineup before Sunday kickoff
2. All teams automatically participate in the week's competition
3. System validates lineup is complete before locking
4. Games begin → lineups lock → live scoring starts

**Contest States**:
- **Upcoming**: User can modify lineup
- **Live**: Games started, lineup locked, live scoring active
- **Completed**: Final scores calculated, rewards distributed

### 3. Live Scoring Experience
**Location**: Dashboard or `/live-scores`

**During NFL Games**:
- Real-time score updates via **BallDontLie API** (15-30 second intervals)
- User sees:
  - Each player's current fantasy points
  - Total team score
  - Leaderboard position (relative to contest participants)
  - Live game status (Q1, Q2, Halftime, etc.)

**Scoring Actions**:
- Points awarded for: TDs, yards, receptions, etc.
- Points deducted for: Turnovers, sacks (for QBs)
- **Tier Multipliers**: Higher tier players may have scoring boosts

### 4. Contest Results & Rewards
**After Games Conclude**:
1. Final scores calculated
2. **Win/Loss Determination**:
   - The **median score** of all participants is calculated
   - Teams scoring **at or above the median** earn a **Win**
   - Teams scoring **below the median** receive a **Loss**
   - This ensures exactly half (or close to half) of teams win each week
3. Leaderboard finalized
4. **Rewards Distributed**:
   - **Top 10%**: Premium packs (3-5 players, mix of tiers)
   - **Top 25%**: Standard packs (2-3 players)
   - **Top 50%**: Token rewards (25-100 tokens)
   - **Participation**: Small token bonus (5-10 tokens)

5. User receives notification of rewards
6. Rewards auto-added to inventory/tokens

**Elimination Rules**:
- Teams with **3 losses** are eliminated from the season
- Eliminated teams cannot participate in future weeks

---

## Inventory & Collection Management

### Inventory System
**Location**: `/inventory`

**Features**:
- Grid/list view of all owned players
- Filter by:
  - Position (QB, RB, WR, TE, DEF)
  - Tier (Elite, Pro, Rising, Rookie)
  - Team
  - Status (active in lineup, benched, available)
- Sort by:
  - Projected points
  - Recent performance
  - Tier
  - Alphabetical

**Player Actions**:
- Add to lineup (if slot available)
- View detailed stats
- Trade (future feature)
- Release player (free up roster space)

### Pack Shop & Opening
**Location**: `/pack-shop`

**Pack Types**:
1. **Starter Pack**: Free (one-time, on signup)
2. **Bronze Pack**: 25 tokens → 2 players (mostly low tier)
3. **Silver Pack**: 50 tokens → 3 players (mix of mid/low tier)
4. **Gold Pack**: 100 tokens → 4 players (guaranteed 1 high tier)
5. **Elite Pack**: 250 tokens → 5 players (multiple high tier, rare)

**Pack Opening Flow**:
1. User selects pack type
2. Token balance checked
3. Purchase confirmed → Tokens deducted
4. **Pack Opening Animation**:
   - Animated card flip/reveal
   - Players revealed one-by-one
   - Tier badges glow/animate
   - "New Player!" celebration for high tiers
5. Players added to inventory
6. User redirected to inventory or prompted to open another

---

## Token Economy

### Earning Tokens
- **Contest Rewards**: 5-100 tokens based on placement
- **Daily Login Bonus**: 5 tokens/day
- **Achievements**: Various milestones (e.g., "First Win" = 50 tokens)
- **Season Completion**: Bonus tokens for active participation

### Spending Tokens
- **Pack Purchases**: 25-250 tokens
- **Premium Contest Entry**: 10-50 tokens
- **Lineup Boosts** (future): Temporary score multipliers

### Token Balance Display
- Always visible in header/nav
- Updates in real-time
- Warning if balance too low for selected action

---

## Weekly Cycle

### Monday-Tuesday: Contest Setup
- New weekly contests created
- Previous week's results finalized
- Leaderboards reset

### Wednesday-Saturday: Entry Period
- Users build/modify lineups
- Enter contests
- Buy packs to improve rosters

### Sunday: Game Day
- Lineups lock at kickoff (1:00 PM ET)
- Live scoring begins
- Users watch real-time leaderboards

### Monday Morning: Results & Rewards
- Final scores processed
- Rewards distributed
- New cycle begins

---

## Key User Touchpoints

### Dashboard (`/dashboard`)
**Primary Hub** - User sees:
- Current contest status
- Active lineup preview
- Token balance
- Recent activity feed
- Quick actions: "Edit Lineup", "Buy Pack", "View Leaderboard"

### Team Manager (`/team-manager`)
- Full lineup editor
- Bench management
- Player swap interface
- Lineup optimizer suggestions

### Leaderboard (`/leaderboard`)
- User's rank in current contest
- Top performers
- Point differentials
- Live updates during games

---

## Critical UX Principles

### 1. Onboarding Clarity
- New users must understand the core loop in < 2 minutes
- Starter pack sets expectations for pack opening
- Tutorial overlays guide first-time actions

### 2. Feedback & Confirmation
- Every action has immediate visual feedback
- Token transactions show before/after balance
- Lineup changes immediately visible
- Success/error toasts for all operations

### 3. Mobile-First Design
- All interactions touch-friendly (min 44px tap targets)
- Responsive grids and modals
- Optimized for portrait orientation
- Fast load times (<2s initial render)

### 4. Real-Time Updates
- Live scores update without page refresh
- Leaderboard positions animate on change
- Token balance updates instantly
- Contest status clearly indicated

### 5. Error Handling
- Graceful degradation if API fails
- Clear error messages (not technical jargon)
- Retry mechanisms for failed requests
- Never lose user data (optimistic updates)

---

## Edge Cases & Business Rules

### Lineup Restrictions
- Maximum roster size: 50 players (prevent hoarding)
- Minimum active players: 9 (one full lineup)
- Cannot delete players in active lineups
- Position-specific maximums (e.g., max 5 QBs)

### Global Season Rules
- All teams compete in a single unified season
- Cannot modify lineup after games start (Sunday 1:00 PM ET)
- Tie-breakers: Total yards > TDs > Alphabetical
- 3 losses = elimination from the season

### Token Safeguards
- Cannot go below 0 tokens
- Refunds issued if contest cancelled
- Token purchases non-refundable (pack purchases)
- Token balance persists across seasons

---

## Future Enhancements (Not Yet Implemented)

- **Trading System**: Player-to-player trades between users
- **Leagues**: Private groups with custom scoring
- **Achievements**: Milestone badges and rewards
- **Social Features**: Chat, trash talk, friend challenges
- **Live Draft Mode**: Real-time draft lobby
- **Multi-Entry Contests**: Enter same contest with different lineups

---

**Last Updated**: November 19, 2025  
**Owner**: Product Team  
**Review Frequency**: After every major gameplay change