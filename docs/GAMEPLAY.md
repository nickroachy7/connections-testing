# Gameplay Flow & User Journey

This document defines how the game works from the user's perspective. All features should align with this specification.

## 🎯 Core Concept

**Build your roster. Set your lineup. Beat the median. Climb the leaderboard.**

Players acquire NFL player cards through pack openings, build weekly lineups, and compete to score at or above the median to earn wins. Different contest types offer varying durations, PPR scoring, and loss limits.

---

## 📋 User Journey

### 1. Onboarding (First-Time User)

**Sign Up**
1. User lands on home page
2. Clicks "Get Started" or "Sign Up"
3. Enters email, password, and username
4. Account created → Auto-redirected to team creation

**Create First Team**
1. Select contest type (1-week, 3-week, or 18-week)
2. Name your team
3. Click "Start My Team"
4. Automatically opens starter pack with tier boosts
5. Tier assignment mini-game:
   - Drag players into tier slots (Role Player, Starter, All-Star, Elite)
   - Higher tiers get better card levels and bonuses
   - Must fill all required slots before continuing
6. Players added to inventory
7. Redirected to "Starting Lineup" page

---

### 2. Core Gameplay Loop

#### Week Cycle

**Phase 1: Preparation (Tuesday 8 PM - Sunday 1 PM)**
- Status: **Upcoming Week**
- Actions Available:
  - ✅ Open packs (purchase with coins)
  - ✅ Set/modify lineup
  - ✅ View projections
  - ✅ Browse inventory
  - ✅ Check leaderboard

**Phase 2: Games In Progress (Sunday 1 PM - Tuesday 12:01 AM)**
- Status: **Live Week**
- Actions Available:
  - ❌ Cannot change lineup (players locked at Sunday 1:05 PM)
  - ❌ Cannot open packs (roster locked)
  - ✅ View live scores updating in real-time
  - ✅ Check leaderboard
  - ✅ Track opponent scores

**Phase 3: Week Finalized (Tuesday 12:01 AM - Tuesday 8 PM)**
- Status: **Finalized Week**
- Actions Available:
  - ✅ View final scores
  - ✅ See win/loss result (beat median or not)
  - ✅ Check updated record
  - ✅ View leaderboard changes
  - ❌ Cannot open packs yet (waiting for advancement)
  - ✅ Can preview next week's lineup

**Phase 4: Week Advancement (Tuesday 8 PM)**
- System automatically advances to next week
- Players unlocked
- Cycle repeats

---

### 3. Building Your Roster

#### Market

The Market is your one-stop shop for roster expansion. Access via the **MARKET** tab in the navigation.

**Two Ways to Acquire Players:**
1. **Pack Shop** - Purchase packs for random players and tokens
2. **Free Agency** - Claim individual "waiver wire" players

---

#### Pack Shop

**Available Packs**

| Pack | Players | Tokens | Cost | Best For |
|------|---------|--------|------|----------|
| 🎁 Starter Pack | 12 | 3 | Free | New teams - full starting lineup + 3 bench |
| 🥉 Bronze Pack | 3 | 1 | 15 | Budget roster additions |
| 🥈 Silver Pack | 5 | 2 | 35 | Good value upgrade |
| 🥇 Gold Pack | 8 | 3 | 60 | Premium roster boost |
| 💎 Elite Pack | 12 | 5 | 100 | Major roster overhaul |

**Starter Pack Contents (Team Creation)**
- 2 QB (for QB and SUPERFLEX slots)
- 3 RB (for RB1, RB2, and FLEX option)
- 4 WR (for WR1, WR2, WR3, and bench)
- 2 TE (for TE slot and FLEX option)
- 1 Flex-eligible (random RB/WR/TE bonus)
- 3 Tokens (strategic boosts)

Total: 12 players + 3 tokens = **Complete starting lineup + 3 bench players**

**Roster Limit**: 75 players maximum

---

#### Free Agency (Waiver Wire)

Claim individual players directly - no pack RNG required! Perfect for filling specific roster gaps.

**How It Works:**
1. One player available per position each day (QB, RB, WR, TE)
2. Players rotate **daily at midnight**
3. These are **waiver-wire quality** players (backup/depth tier)
4. Will score points but aren't star players
5. Great for emergency fills or bye week coverage

**Pricing:**

| Position | Cost | Typical Projection |
|----------|------|-------------------|
| QB | 5 coins | 5-10 pts |
| RB | 4 coins | 4-8 pts |
| WR | 4 coins | 4-8 pts |
| TE | 3 coins | 3-6 pts |

**Rules:**
- ✅ Claim as many players as you want (if you have coins)
- ✅ Same player can be claimed by multiple teams
- ❌ Cannot claim a player you already own
- ❌ Cannot claim a player you've previously claimed (ever)
- ❌ Cannot claim if roster is full (75 players)

**Use Cases:**
- Fill a bye week slot cheaply
- Replace an injured player quickly
- Try out a new position without pack RNG
- Budget-conscious roster building

**Pack Opening Flow**
1. User navigates to Pack Shop
2. Checks roster limits (warning if near capacity)
3. Clicks "Buy Pack" → Confirms purchase
4. Redirected to pack opening page
5. Animated pack reveal
6. Card reveal sequence showing pulled players
7. Tier assignment if applicable
8. Players added to inventory
9. Return to inventory or shop

**Pull Rates (Production-Grade Rarity System)**
Distribution is calibrated using position-relative PPG thresholds and weighted pack selection:

| Rarity | Target Pull % | Typical PPG | Visual |
|--------|---------------|-------------|--------|
| ✨ Legendary | 2-3% | Elite performers | Gold glow |
| 💎 Epic | 8-10% | Star players | Purple glow |
| 🔷 Rare | 20-25% | Solid starters | Blue glow |
| Common | 50-55% | Average players | Gray |
| Trash | 10-15% | Backups/Injured | Dim |

**Technical Implementation:**
- `rarity_tier`: Categorical tier for UI display
- `pack_weight`: Direct probability weight (higher = more likely)
- `pull_percentage`: Display value shown to users (lower = rarer)
- Calculated in `calculate-pull-rates` edge function
- Uses position-specific PPG thresholds (e.g., QB legendary ≥24 PPG, RB ≥18 PPG)

---

### 4. Setting Your Lineup

#### Lineup Builder (Starting Lineup Page)

**Required Positions**
- 1 QB (Quarterback)
- 2 RB (Running Backs)
- 2 WR (Wide Receivers)
- 1 TE (Tight End)
- 1 FLEX (RB/WR/TE)
- 1 K (Kicker)
- 1 DEF (Defense/Special Teams)

**Lineup Management**
1. View current lineup grid (3x3 layout)
2. Click empty slot or existing player
3. Player selection modal opens:
   - Filter by position
   - Sort by projections, name, team
   - View player stats and projections
4. Select player → Auto-assigns to correct position
5. Repeat until all 9 slots filled
6. Lineup auto-saves on changes

**Lineup Status Indicators**
- 🔓 Unlocked: Can freely edit (before Sunday 1:05 PM)
- 🔒 Locked: Cannot edit (games in progress)
- ⚡ Live: Real-time scoring updates
- ✅ Final: Week complete, scores finalized

**Projected Points**
- Each player shows weekly projection
- Total lineup projection calculated and displayed
- Projections update Tuesday 8:05 PM and Sunday 6:00 PM

---

### 5. Scoring System

#### Median-Based Scoring (Critical!)

**How It Works**
1. All teams submit lineups before Sunday 1:05 PM
2. Games play out Sunday/Monday/Thursday
3. Each team's lineup score is calculated
4. System calculates the **median** score of all active teams
5. Win/Loss determined:
   - **Score >= Median** = Win ✅
   - **Score < Median** = Loss ❌

**Why Median, Not Average?**
- More fair - not skewed by extreme outliers
- Eliminates advantage of "lucky" high scorers
- Truly represents the middle of the pack
- Consistent with "beat half the field" concept

**Example**
```
10 teams with scores: 85, 92, 98, 105, 110, 115, 120, 125, 130, 145
Median = 112.5 (average of 110 and 115)

Results:
- 85, 92, 98, 105, 110 → LOSS (below median)
- 115, 120, 125, 130, 145 → WIN (at or above median)
```

#### PPR Scoring

Varies by contest type:
- **Standard (0 PPR)**: No bonus for receptions
- **Half PPR (0.5)**: 0.5 points per reception
- **Full PPR (1.0)**: 1 point per reception

Base scoring:
- Passing yards: 0.04 pts/yd (1 pt per 25 yds)
- Passing TD: 4 pts
- Passing INT: -2 pts
- Rushing yards: 0.1 pts/yd (1 pt per 10 yds)
- Rushing TD: 6 pts
- Receiving yards: 0.1 pts/yd
- Receiving TD: 6 pts
- Field Goal: 3 pts
- Extra Point: 1 pt
- Defensive sack: 1 pt
- Defensive INT: 2 pt

---

### 6. Contest Types

#### Available Contests

**1-Week Contests (Lightning Round)**
- Duration: 1 week
- Max Losses: 1
- Starter Pack Boosts: 1 Role Player
- Use Case: Quick one-off challenge

**3-Week Contests (Tournament)**
- Duration: 3 weeks
- Max Losses: 1
- Starter Pack Boosts: 3 Role Players, 2 Starters, 1 All-Star
- Use Case: Short tournament experience

**18-Week Contests (Full Season)**
- Duration: 18 weeks
- Max Losses: 7
- Starter Pack Boosts: 1 Role Player
- Use Case: Full NFL season grind

Each contest type offers Standard, Half PPR, and Full PPR variants.

#### Contest Progression

**Active Team**
- Team is competing each week
- Can manage lineup and roster
- Earns wins/losses

**Eliminated Team**
- Team exceeded max losses
- Cannot compete further
- Stats frozen
- Can still view team/history

**Completed Team**
- Finished all weeks (win or lose)
- Final record recorded
- Appears on leaderboards

---

### 7. Weekly Contests (Lives System)

Weekly contests allow teams to compete for coin rewards by risking their Lives. This is the primary way to earn coins and advance in the game.

#### Lives System

**How Lives Work**
- Each team starts with a number of Lives (based on contest type, typically 3)
- Lives = `max_losses - current_losses`
- You can enter **one contest per Life per week**
- Win = Keep your Life + Earn Coins
- Lose = Lose a Life
- When Lives reach 0, your team is eliminated

**Example**
```
Team starts with 3 Lives (0 losses, max_losses = 3)

Week 1: Enter 2 Duels (using 2 lives)
- Win first Duel: Keep life, earn 5 coins
- Lose second Duel: Lose 1 life (now 2 lives remaining)

Week 2: Can enter up to 2 contests (2 lives remaining)
```

#### Available Contest Types

**Duel (Head-to-Head)**
| Property | Value |
|----------|-------|
| Size | 2 Teams |
| Win Condition | Outscore your opponent |
| Reward | 5 Coins |
| Risk | 1 Life |

- You are matched against one other team
- Higher score wins and keeps their Life
- Lower score loses a Life
- Ties: Both keep their Lives, split the reward

**Arena (Median Pool)**
| Property | Value |
|----------|-------|
| Size | 12 Teams |
| Win Condition | Score at or above the median |
| Reward | 10 Coins |
| Risk | 1 Life |

- Compete against 11 other teams
- Top 6 scores (at/above median) WIN and earn coins
- Bottom 6 scores (below median) LOSE a Life
- Higher reward reflects higher competition

#### Contest Flow

**1. Browse Available Contests**
- Navigate to Contests page
- View available Duels and Arenas
- See current entry count, spots remaining
- See Risk (lives) and Reward (coins) clearly

**2. Enter a Contest**
- Click "Join" on any available contest
- Confirm entry in modal (shows stakes)
- Entry is locked until week finalizes
- Your Life is "at risk" but not deducted yet

**3. Week Plays Out**
- Games run Sunday-Monday
- Your lineup scores points
- No changes allowed after lock

**4. Results Processing (Tuesday)**
- After week finalizes:
  - H2H: Scores compared, winner determined
  - Arena: Median calculated, winners/losers determined
- Winners: Coins added to team balance
- Losers: Loss added to team record (Life lost)

**5. Contest Replenishment**
- When a contest fills up, a new one spawns automatically
- There's always at least one of each type available
- Enter as many contests as you have Lives

#### Strategy Tips

- **Conservative**: Enter 1 contest per week, preserve Lives
- **Aggressive**: Enter max contests, maximize coin potential
- **Mixed**: Enter Duel for smaller guaranteed reward, Arena for higher stakes
- **Risk Assessment**: Duels are 50/50, Arenas depend on field quality

---

### 8. Economy & Rewards

#### Coin System (Micro-Economy)

**Target Balance Range: 25-150 coins**

**Earning Coins**
- Starting balance: 50 coins
- Contest wins: 25-75 coins (varies by contest type)
  - Duel: 25 coins
  - Sprint Survivor: 30 coins
  - PPR Sprint: 35 coins
  - Elite Four: 35 coins
  - Weekly Showdown: 40 coins
  - The Grind: 45 coins
  - Gauntlet: 50 coins
  - Arena: 75 coins
- Quick selling players: 1-8 coins (based on rarity)
- Quick selling tokens: 2-8 coins

**Spending Coins**
- Bronze Pack: 15 coins (3 players + 1 token)
- Silver Pack: 35 coins (5 players + 2 tokens)
- Gold Pack: 60 coins (8 players + 3 tokens)
- Elite Pack: 100 coins (12 players + 5 tokens)
- Free Agency Claims: 3-5 coins per player

**Economy Philosophy**
- Coins are scarce and meaningful
- Every win feels rewarding
- Saving up for packs takes strategy
- Quick selling creates meaningful decisions

#### Inventory Management

**Roster Limits**
- Soft Cap: 50 players (warning shown)
- Hard Cap: 75 players (cannot buy packs)

**Inventory Actions**
- View all owned player cards
- Filter by position, team, tier
- Sort by projections, value, acquisition date
- Bench unused players
- View detailed player stats

---

### 9. Leaderboards

#### Contest Leaderboards
- Ranked within same contest type (fair comparison)
- Sort by:
  - Total Points (season total)
  - Win-Loss Record
  - Win Percentage
- Shows rank, percentile, stats

#### Global Leaderboard
- All teams across all contest types
- Not a fair comparison (different rules)
- Fun "overall" view

#### Personal Stats
- Lifetime wins/losses
- Total teams created
- Career points
- Best season record

---

### 10. Team Management

#### Team Selection Page
- View all your teams
- See contest type, record, status
- Select active team to manage
- Create new team (up to limit)

#### Team Page Views
- **Starting Lineup**: Build/view lineup
- **Pack Shop**: Buy packs, manage coins
- **Inventory**: Browse all cards, filter/sort
- **Activity**: Transaction history
- **Leaderboard**: See rankings

#### Multiple Teams
- Users can have multiple teams
- Each team:
  - Independent inventory
  - Separate lineups
  - Own contest type
  - Individual record
- Switch between teams via team selection

---

### 11. Live Scoring Experience

#### Real-Time Updates (Game Days)

**During Games**
- Scores update every 2 minutes
- Banner shows:
  - Your current total
  - Live vs Projected status
  - Current median line
  - Above/Below median indicator
- Player cards show live points
- Game status badges (LIVE, HALFTIME, FINAL)

**Visual Feedback**
- Green glow: You're above median
- Red tint: You're below median
- Progress bar showing score vs median
- Trophy icon if winning

**After Games Finalize**
- Final score locked
- Win/Loss badge appears
- Record updates
- Leaderboard refreshes

---

### 12. Player Cards & Progression

#### Card Tiers
- **Elite**: Top 1% players (highest projections)
- **All-Star**: Top performers
- **Starter**: Solid weekly starts
- **Role Player**: Bench depth, streaming options

#### Card Levels
- Level 1-10 based on experience points
- Higher levels = better performance
- XP earned from weekly usage (coming soon)

#### Player Stats Displayed
- Weekly projected points
- Season average (PPG)
- Games played
- Injury status
- Pull percentage (rarity indicator)
- Team abbreviation
- Position

---

### 13. Navigation & UX

#### Main Navigation

**Unauthenticated Users**
- Home page with CTA
- Login/Signup pages

**Authenticated Users**
- Header with logo, user menu
- Sidebar navigation (desktop)
- Mobile menu (hamburger)

**Team-Specific Routes**
```
/teams/:teamId/starting-lineup   - Build lineup
/teams/:teamId/market             - Buy packs & claim free agents
/teams/:teamId/inventory          - View cards
/teams/:teamId/activity           - Transaction log
/teams/:teamId/leaderboard        - Rankings
```

#### Persistent Elements

**Fantasy Nav Banner** (Team Context)
- Shows on all team pages
- Displays:
  - Team name & logo
  - Username
  - Win-Loss record
  - Coins balance
  - Current week score
  - Score vs median indicator
- Navigation tabs for team pages

**Teams Page Banner** (Team Selection)
- Shows on team selection page
- Username
- Total teams count
- "Create New Team" button

---

### 14. Private Leagues & Contest Configuration

#### Creating a League

Commissioners create private leagues with full control over contest rules:

**Step 1: Basic Settings**
- League name
- Maximum users (5-100)
- Teams per user (1-3)
- Fresh start required (must create new team to join)

**Step 2: Contest Configuration**

| Setting | Options | Description |
|---------|---------|-------------|
| **Scoring Format** | Standard, Half PPR, Full PPR | PPR bonus for receptions |
| **Win Condition** | Beat the Median, H2H*, Both* | How wins are determined |
| **Elimination Mode** | None, Strike System, Survivor | How elimination works |
| **Lives (Strikes)** | 1-7 | Losses before elimination (strike mode) |
| **Restarts Allowed** | Yes/No | Can eliminated teams restart? |
| **Max Restarts** | Unlimited or 1-5 | How many times can restart |
| **Season Length** | 1, 4, 9, or 18 weeks | Contest duration |

*Coming soon

#### Win Conditions

**Beat the Median** (Default)
- Each week, all league teams submit lineups
- System calculates the league's median score
- Score ≥ Median = Win
- Score < Median = Loss

**Head-to-Head** (Coming Soon)
- Weekly matchups against another team
- Higher score wins the matchup
- Bye weeks for odd number of teams

**Both (Hardcore)** (Coming Soon)
- Must beat your H2H opponent AND the league median
- Ultimate competitive mode

#### Elimination Modes

**No Elimination**
- Season-long record tracking
- No one gets eliminated
- Final standings based on W-L record

**Strike System** (Default)
- Start with X lives (configurable: 1-7)
- Lose a life for each loss
- Eliminated when all lives are lost
- Optional: Restart to reset lives

**Survivor Mode**
- Single-elimination - one loss and you're out!
- Most intense competition format
- Restarts can be allowed/disabled

#### Restart Rules
- Restarts are **free** (no coin cost)
- Commissioner controls if restarts are allowed
- Can require a **new team** on restart
- Can limit **max restarts** per user

#### League Start Week
- Leagues start from the **current NFL week** when created
- Mid-season leagues are fully supported
- Season length determines how many weeks to play

#### Private League Teams
- Teams in leagues are marked as `team_type: 'private'`
- League-specific W-L record tracked in `league_teams` table
- Teams compete against league median (not global)
- Future: H2H matchups stored in `league_matchups` table

---

### 15. User States & Flows

#### New User → First Team
```
Sign Up → Create Team → Starter Pack → Tier Assignment → Starting Lineup
```

#### Returning User → Manage Team
```
Login → Team Selection → Starting Lineup → (Set Lineup | Buy Packs | Check Scores)
```

#### Weekly Routine
```
Tuesday: Check results → See new week → Adjust lineup
Wednesday-Saturday: Optional pack purchases, lineup tweaks
Sunday: Final lineup check → Watch games → Track live scores
Monday-Tuesday: Final games → Week finalizes → Check results
```

#### Multi-Team User
```
Team Selection → Choose Team A → Manage
              → Choose Team B → Manage
              → Create Team C → Setup
```

---

### 16. Notifications & Feedback

#### Toast Notifications
- Pack purchase confirmation
- Lineup saved
- Insufficient coins
- Roster limit warnings
- Errors (API failures, etc.)

#### Status Badges
- "Live" - Games in progress
- "Locked" - Lineup locked
- "Final" - Week complete
- "Upcoming" - Next week preview
- "Eliminated" - Max losses exceeded

#### Empty States
- No teams: Prompt to create first team
- No lineup: Instruction to set lineup
- No packs available: Coming soon message
- No players in inventory: Buy a pack CTA

---

### 17. Future Features (Not Yet Implemented)

- **Achievements**: Unlock badges for milestones
- **Tournaments**: Bracket-style competitions
- **Trading**: Player card marketplace
- **Challenges**: Daily/weekly special objectives
- **Social**: Friends list, head-to-head matchups
- **Customization**: Team logos, card backs, themes
- **Premium Packs**: Higher rarity guarantees
- **Token Usage**: Apply boost tokens to lineups
- **Mobile App**: Native iOS/Android experience

---

## 🎮 Design Principles

1. **Simplicity First**: Easy to understand, hard to master
2. **Fair Competition**: Median scoring eliminates luck-based advantages
3. **Meaningful Choices**: Lineup decisions and pack strategy matter
4. **Instant Feedback**: Real-time scoring, immediate visual responses
5. **Progression**: Card levels, team records, leaderboard climbing
6. **Flexibility**: Multiple contest types for different play styles
7. **Accessibility**: Mobile-responsive, keyboard navigation, screen readers

---

## ✅ Checklist for New Features

Before implementing any feature, ensure:
- [ ] It aligns with the core "Beat the Median" concept
- [ ] User flow is intuitive and documented here
- [ ] Visual feedback is clear and immediate
- [ ] Mobile experience is considered
- [ ] Error states are handled gracefully
- [ ] It fits within the weekly game cycle
- [ ] Contest type variations are supported
- [ ] Leaderboard impacts are considered

---

**Document Version**: 1.1  
**Last Updated**: December 1, 2025  
**Status**: Living Document - Update as features change
