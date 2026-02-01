# Development Roadmap

**Vision:** Multi-sport fantasy platform with rogue-like card collection  
**Sports:** NBA, MLB, NFL  
**Platform:** iOS (priority), Android (prep for later)  
**Release:** When confident, ~100 TestFlight users

---

## Phase 1: Multi-Sport Foundation ⚡ (CURRENT)

**Goal:** Make the platform sport-agnostic without breaking NFL

**Status:** 🟡 In Progress

### Database Schema
- [ ] Create `sports` table (nfl, nba, mlb)
- [ ] Create `sport_positions` table (QB, PG, P, etc.)
- [ ] Create `lineup_configurations` table (flexible lineup slots)
- [ ] Create `sport_stats` and `scoring_rules` tables
- [ ] Migrate `player_cards` to support multiple sports
- [ ] Refactor `weekly_lineups` to use flexible slots
- [ ] Add `sport_id` to `contest_types`

### API Abstraction Layer
- [ ] Create `services/sportsData/` interface
- [ ] Implement `NFLDataSource` (wrap existing BallDontLie)
- [ ] Implement `NBADataSource` (choose API: BallDontLie, ESPN, or NBA Stats)
- [ ] Implement `MLBDataSource` (ESPN or MLB Stats API)
- [ ] Factory pattern for sport selection
- [ ] Shared error handling and rate limiting

### Frontend Refactoring
- [ ] Create `useSportConfig()` hook
- [ ] Refactor position selectors to be dynamic
- [ ] Make `LineupGrid` sport-aware
- [ ] Dynamic stat displays per sport
- [ ] Update 122 "NFL" references to be dynamic

### Validation
- [ ] NFL experience should look/work identically
- [ ] Run full test suite (once created)
- [ ] Deploy to staging for smoke tests

**Timeline:** 2-3 weeks  
**Blocker:** None, can start immediately

---

## Phase 2: React Native Mobile App 📱

**Goal:** iOS app with core fantasy experience

**Status:** 🔴 Not Started

### Setup
- [ ] Create React Native + Expo project
- [ ] Set up monorepo (web, mobile, shared)
- [ ] Extract shared services to `packages/shared/`
- [ ] Configure Expo EAS for builds
- [ ] Set up TypeScript (optional but recommended)

### Core Features
- [ ] Authentication (login, signup, session)
- [ ] Navigation (bottom tabs + stack)
- [ ] Dashboard (team overview, current week)
- [ ] Team Manager (lineup, bench, swaps)
- [ ] Pack Shop (buy, open, animations)
- [ ] Inventory (filter, sort, add to lineup)
- [ ] Leaderboard (standings, rank)
- [ ] Live scoring updates

### Native Features
- [ ] Push notifications (lineup locks, live updates)
- [ ] Deep linking (player cards, contest invites)
- [ ] Pull-to-refresh
- [ ] Haptic feedback
- [ ] Offline mode (view lineup without internet)

### Polish
- [ ] App icon
- [ ] Splash screen
- [ ] Onboarding flow
- [ ] Error states
- [ ] Loading states
- [ ] Empty states

### TestFlight
- [ ] Apple Developer enrollment ($99/year)
- [ ] App Store Connect setup
- [ ] Build with EAS
- [ ] Submit to TestFlight
- [ ] Invite 100 beta testers

**Timeline:** 3-4 weeks  
**Blocker:** Needs Phase 1 for sport abstraction

---

## Phase 3: NBA Support 🏀

**Goal:** Add NBA as second sport

**Status:** 🔴 Not Started

### Data Integration
- [ ] Choose NBA data source
- [ ] Implement `NBADataSource` class
- [ ] Map NBA positions (PG, SG, SF, PF, C)
- [ ] Define NBA scoring rules (points, rebounds, assists)
- [ ] Import NBA player catalog
- [ ] Set up NBA game schedule

### Contest Types
- [ ] Create NBA contest types (daily, weekly, season-long)
- [ ] Define lineup configurations (e.g., 2 G, 2 F, 1 C, 1 UTIL)
- [ ] Pack distributions for NBA players
- [ ] Tier assignments (S/A/R/B)

### Edge Functions
- [ ] NBA live stats tracking
- [ ] NBA projection updates
- [ ] NBA game finalization
- [ ] NBA weekly cycle (if applicable)

### Testing
- [ ] Beta test with NBA season active
- [ ] Validate scoring calculations
- [ ] Test pack opening for balance

**Timeline:** 2-3 weeks  
**Blocker:** Needs Phase 1 + 2

---

## Phase 4: MLB Support ⚾

**Goal:** Add MLB as third sport

**Status:** 🔴 Not Started

### Data Integration
- [ ] Choose MLB data source
- [ ] Implement `MLBDataSource` class
- [ ] Map MLB positions (P, C, 1B, 2B, 3B, SS, OF)
- [ ] Define MLB scoring rules (H, R, RBI, HR, K, ERA, W, SV)
- [ ] Import MLB player catalog
- [ ] Set up MLB game schedule (162 games/season)

### Contest Types
- [ ] Daily contests (pitcher + hitters)
- [ ] Weekly contests
- [ ] Season-long (roto or points)
- [ ] Playoff brackets

### Edge Functions
- [ ] MLB live stats tracking
- [ ] MLB projection updates
- [ ] MLB game finalization

### Testing
- [ ] Beta test during MLB season
- [ ] Validate scoring
- [ ] Pack balance

**Timeline:** 2-3 weeks  
**Blocker:** Needs Phase 1 + 2 + 3

---

## Phase 5: Android Release 🤖

**Goal:** Launch on Google Play Store

**Status:** 🔴 Not Started

### Setup
- [ ] Google Play Developer account ($25 one-time)
- [ ] Build with EAS for Android
- [ ] Test on multiple Android devices
- [ ] App signing and security

### Polish
- [ ] Android-specific UI tweaks
- [ ] Test on various screen sizes
- [ ] Handle Android back button
- [ ] Adaptive icon

### Launch
- [ ] Google Play Store listing
- [ ] Screenshots and description
- [ ] Submit for review
- [ ] Open beta or full launch

**Timeline:** 1 week  
**Blocker:** Needs stable iOS release

---

## Phase 6: Scale & Features 🚀

**Goal:** Growth and new contest types

**Status:** 🔴 Not Started

### New Contest Types
- [ ] DFS (salary cap)
- [ ] Head-to-head matchups
- [ ] Tournament brackets
- [ ] Survivor pools
- [ ] Best ball (auto-optimize)

### Growth Features
- [ ] Referral program
- [ ] Social features (friend leagues)
- [ ] Chat/trash talk
- [ ] Achievements and badges
- [ ] Leaderboards with prizes

### Media Features
- [ ] Weekly recap videos
- [ ] Player spotlight articles
- [ ] Podcast integration
- [ ] Live streams

### Infrastructure
- [ ] Analytics dashboard
- [ ] Admin tools
- [ ] Customer support system
- [ ] Content management system

---

## Current Focus: Phase 1 (Multi-Sport Foundation)

**This Week:**
1. Design and implement sport-agnostic database schema
2. Create migration plan (backwards compatible with NFL)
3. Build API abstraction layer
4. Start refactoring frontend components

**Measuring Success:**
- NFL experience works identically after refactor
- Can add NBA/MLB without modifying core tables
- API abstraction supports multiple data sources
- Code is cleaner and more maintainable

---

**Updated:** 2026-01-31  
**Next Review:** Weekly check-in with Nick
