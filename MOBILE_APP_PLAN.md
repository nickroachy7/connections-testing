# iOS App Development Plan

**Priority:** HIGH - Testers prefer native app over website  
**Status:** Planning Phase  
**Created:** 2026-01-31

---

## Why Mobile Matters

Your target users (friends/testers) want to **pick up and play on their phone**. A website doesn't cut it. Native app is essential for:
- Push notifications (lineup reminders, game updates)
- Faster, smoother experience
- App Store credibility
- Offline capabilities
- Better user retention

---

## Framework Comparison

### Option 1: React Native (Recommended ⭐)

**Pros:**
- Share React knowledge from web app
- Share services layer (Supabase, API clients)
- Share business logic and utilities
- One codebase for iOS + Android
- Expo makes TestFlight deployment easy
- Active community, good docs

**Cons:**
- Not truly native (but close enough)
- Slightly larger app size
- Some platform-specific code needed

**Recommendation:** **Use React Native with Expo**

### Option 2: Swift/SwiftUI (Native)

**Pros:**
- Best performance
- Native iOS feel
- Access to all iOS APIs
- Smaller app size

**Cons:**
- Completely separate codebase
- Can't reuse any web code
- Need Swift expertise
- Android requires separate Kotlin/Java app
- 2x development time

### Option 3: PWA (Progressive Web App)

**Pros:**
- Zero extra code (it's just the website)
- Works on all devices

**Cons:**
- Not a "real" app (users notice)
- No App Store presence
- Limited push notifications
- Worse performance
- Doesn't feel native

**Verdict:** ❌ Doesn't meet user expectations

---

## Recommended Architecture: React Native + Expo

### Project Structure

```
your-app-monorepo/
├── packages/
│   ├── web/                    # Existing React + Vite app
│   ├── mobile/                 # New React Native app
│   └── shared/                 # Shared code
│       ├── services/           # Supabase, API clients
│       ├── utils/              # Helper functions
│       ├── constants/          # Config, types
│       └── types/              # TypeScript types
├── package.json                # Monorepo root
└── turbo.json                  # Turborepo config (optional)
```

### What Can Be Shared (60-70% of code)

**Backend Services:**
- ✅ `supabase.js` - Database queries
- ✅ Supabase Auth
- ✅ BallDontLie API client
- ✅ All Edge Function calls

**Business Logic:**
- ✅ Scoring calculations
- ✅ Pack opening logic
- ✅ Lineup validation
- ✅ Contest type configs
- ✅ Fantasy point calculations

**Utilities:**
- ✅ Date/time helpers
- ✅ Formatters (currency, numbers)
- ✅ Constants (positions, tiers)

### What Needs Mobile-Specific Code (30-40%)

**UI Components:**
- ❌ Replace Tailwind with React Native StyleSheet
- ❌ Replace Lucide React icons with React Native icons
- ❌ Rebuild layout components (no CSS Grid/Flexbox equivalents)
- ❌ Native navigation (React Navigation vs React Router)

**Platform Features:**
- ❌ Push notifications (Expo Notifications)
- ❌ Deep linking (Expo Linking)
- ❌ App lifecycle handling
- ❌ Native gestures (swipe, pull-to-refresh)

---

## Phase 1: Foundation (Week 1)

### 1.1 Set Up Monorepo

```bash
# Create shared package
npx create-expo-app mobile
mkdir packages
mv connections-testing packages/web
mv mobile packages/mobile
mkdir packages/shared

# Set up package.json for monorepo
```

### 1.2 Extract Shared Services

Move these from `web/src/` to `shared/`:
- `services/supabase.js`
- `services/nflApi.js`
- `utils/projections.js`
- `utils/time.js`
- `utils/scoring.js`
- `constants/contestTypes.js`
- `constants/positions.js`

### 1.3 Basic Mobile App Shell

- Expo app with navigation
- Supabase auth (login/signup screens)
- Bottom tab navigation (Dashboard, Team, Shop, Profile)
- Splash screen with your branding

**Deliverable:** Empty mobile app that logs in

---

## Phase 2: Core Features (Week 2-3)

### Priority Features for MVP

1. **Authentication** ✅
   - Login/signup
   - Session persistence
   - Profile view

2. **Dashboard**
   - See active team
   - Current week status
   - Quick stats (record, coins)

3. **Team Manager**
   - View lineup
   - Swap players (drag-and-drop or modal)
   - See bench
   - Live scoring

4. **Pack Shop**
   - Buy packs
   - Open pack animation
   - View pulled cards

5. **Inventory**
   - Filter/sort players
   - View player stats
   - Add to lineup

6. **Leaderboard**
   - View standings
   - Your rank
   - Opponent scores

### Nice-to-Have (v2)

- Player profile modal
- Trade system
- Chat/messaging
- Tournament brackets
- Replay animations

---

## Phase 3: Native Features (Week 4)

### Push Notifications

**Use Cases:**
- "Lineup locks in 1 hour!"
- "Games are live! Check your score"
- "You beat the median! +1 Win"
- "New pack available in shop"

**Implementation:**
```javascript
import * as Notifications from 'expo-notifications';

// Request permission
const { status } = await Notifications.requestPermissionsAsync();

// Schedule notification
await Notifications.scheduleNotificationAsync({
  content: {
    title: "Lineup Lock Warning",
    body: "Set your lineup before Sunday 1:05 PM!"
  },
  trigger: { seconds: 3600 } // 1 hour before lock
});
```

### Deep Linking

**Use Cases:**
- Share player cards: `app://player/123`
- Contest invites: `app://contest/456`
- Referral codes: `app://join?ref=NICK123`

---

## Phase 4: Polish & TestFlight (Week 5)

### App Store Assets

- [ ] App icon (1024x1024)
- [ ] Launch screen
- [ ] App Store screenshots (6.7" and 5.5" iPhones)
- [ ] App Store description
- [ ] Privacy policy
- [ ] Terms of service

### TestFlight Beta

1. Enroll in Apple Developer Program ($99/year)
2. Create app in App Store Connect
3. Build with Expo EAS: `eas build --platform ios`
4. Submit to TestFlight
5. Invite testers (up to 10,000 via email/link)

**Timeline:** ~48 hours from submission to live beta

### Feedback Loop

- TestFlight includes crash reports
- In-app feedback button
- Analytics (Expo Analytics or PostHog)

---

## Development Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Setup Monorepo | 2 days | Shared services extracted |
| Auth + Navigation | 3 days | Login flow works |
| Core Features | 2 weeks | Full game playable |
| Native Features | 1 week | Push notifications, polish |
| TestFlight | 2 days | Beta live for testers |
| **Total** | **3-4 weeks** | iOS app in testers' hands |

---

## Cost Breakdown

- Apple Developer Program: **$99/year** (required)
- Expo EAS Build: **Free tier** (100 builds/month)
- Push Notifications: **Free** (Expo Notifications)
- Hosting: **$0** (Supabase + Vercel existing)

**Total upfront cost: $99**

---

## Android Later?

Once iOS is stable:
- React Native already supports Android
- Same codebase, just build for Google Play
- Google Play Developer: $25 one-time fee
- Can launch within 1 week of iOS completion

---

## Questions for Nick

1. **Timeline?** Need iOS app in 1 week, 1 month, or not urgent?
2. **MVP features?** Which features are essential for first beta?
3. **Android?** iOS-only initially or both platforms?
4. **Branding?** Do you have app name + icon ready?
5. **TestFlight testers?** How many friends are waiting for the app?

---

## My Recommendation

**Ship iOS MVP in 3 weeks:**

- Week 1: Set up monorepo, extract shared code, basic mobile shell
- Week 2: Port core features (team manager, lineup, shop)
- Week 3: Polish, push notifications, TestFlight beta

**Then:**
- Get feedback from testers
- Iterate quickly on mobile
- Add Android if demand exists
- Continue web development in parallel

**Key insight:** Mobile-first means your testers are engaged NOW, not waiting for a perfect website.

---

**Max - Let's get this app in your friends' hands. 📱⚡**
