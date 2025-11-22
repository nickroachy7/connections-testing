# NFL Connections - Fantasy Football Game

**Build your roster. Set your lineup. Beat the median.**

A fantasy football game where you compete against other players by scoring at or above the weekly median to earn wins. Different contest types, PPR scoring variations, and dynamic player card progression create endless strategic possibilities.

---

## 🎯 Quick Start

### For Players

1. **Sign Up**: Create an account at [your-app-url.com]
2. **Create Team**: Choose a contest type (1-week, 3-week, or 18-week)
3. **Open Starter Pack**: Get your initial roster with tier boosts
4. **Set Lineup**: Build your 9-player weekly lineup before Sunday 1:05 PM
5. **Track Scores**: Watch live scoring updates during games
6. **Beat the Median**: Score at or above the median to earn a win!

### For Developers

```bash
# Clone repository
git clone https://github.com/nickroachy7/connections-testing.git
cd connections-testing

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your Supabase URL, anon key, and BallDontLie API key

# Start development server
npm run dev
```

---

## 🏈 How It Works

### The Median System

**Traditional fantasy**: Beat the average (skewed by extreme scores)
**NFL Connections**: Beat the median (true middle of the pack)

**Example:**
```
10 teams score: 85, 92, 98, 105, 110, 115, 120, 125, 130, 145
Median = 112.5 (average of 110 and 115)

Results:
- Scores >= 112.5 → WIN ✅
- Scores < 112.5 → LOSS ❌
```

This eliminates luck-based advantages and rewards consistent performance.

### Weekly Cycle

**Tuesday 8 PM - Sunday 1 PM**: Set/adjust lineup, open packs
**Sunday 1:05 PM**: Lineups lock, games begin
**Sunday-Tuesday**: Live scoring updates every 2 minutes
**Tuesday 12:01 AM**: Week finalizes, wins/losses calculated
**Tuesday 8 PM**: Week advances, players unlock, cycle repeats

### Contest Types

**1-Week Contests**
- Duration: 1 week
- Max Losses: 1
- Perfect for quick challenges

**3-Week Contests**
- Duration: 3 weeks
- Max Losses: 1
- Tournament-style experience

**18-Week Contests**
- Duration: Full NFL season
- Max Losses: 7
- Season-long grind

Each contest type offers Standard (0 PPR), Half PPR (0.5), and Full PPR (1.0) variants.

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling and responsive design
- **React Router** - Client-side routing
- **Context API** - State management

### Backend
- **Supabase**
  - PostgreSQL database
  - Authentication (email/password)
  - Row Level Security (RLS)
  - Real-time subscriptions
  - Storage (team images)
  - Edge Functions (Deno/TypeScript)

### External Services
- **BallDontLie NFL API** - Player stats, game data, projections
- **Vercel** - Frontend hosting and CDN

### Automation
- **pg_cron** - Scheduled database jobs
- **Edge Functions** - Serverless functions for:
  - Weekly cycle automation
  - Live stats tracking
  - Pack opening logic
  - Projection updates

---

## 📁 Project Structure

```
connections-testing/
├── src/
│   ├── pages/          # Route components
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React Context providers
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API clients (Supabase, NFL API)
│   ├── utils/          # Helper functions
│   └── constants/      # Static data and config
├── supabase/
│   ├── functions/      # Edge Functions (Deno)
│   └── migrations/     # Database schema and seed data
├── docs/               # Comprehensive documentation
│   ├── ARCHITECTURE.md # System design and data flow
│   ├── GAMEPLAY.md     # User journey and game mechanics
│   └── API.md          # BallDontLie API integration guide
└── public/             # Static assets
```

---

## 🎮 Key Features

### Player Management
- **Pack System**: Bell curve distribution for balanced pulls
- **Tier Assignment**: Drag-and-drop mini-game for starter packs
- **Card Levels**: Progression system (1-10) with experience points
- **Dynamic Projections**: Updated twice weekly based on real NFL data

### Lineup Building
- **9 Positions**: QB, 2 RB, 2 WR, TE, FLEX, K, DEF
- **Projected Points**: See weekly projections before setting lineup
- **Locked Status**: Players lock at game time, preventing changes
- **Injury Tracking**: Real-time injury status updates

### Live Scoring
- **Real-time Updates**: Stats refresh every 2 minutes during games
- **Median Tracking**: See if you're above/below median in real-time
- **Game Status**: Visual indicators (LIVE, HALFTIME, FINAL)
- **Projected Final**: Combines live scores + projections for unplayed games

### Leaderboards
- **Contest-Specific**: Fair rankings within same contest type
- **Sort Options**: By wins, points, win percentage
- **Global View**: Cross-contest leaderboard (fun, not fair)
- **Real-time Updates**: Refresh during games and after finalization

### Economy
- **Coins**: Earn 500 weekly, spend on packs
- **Pack Shop**: Standard packs (500 coins), more coming soon
- **Roster Limits**: Soft cap (50), hard cap (75)
- **Inventory Management**: Filter, sort, bulk actions

---

## 🔒 Security

### Authentication
- Supabase Auth with email/password
- JWT tokens for API requests
- Secure session management

### Database Security
- **Row Level Security (RLS)** on all tables
- Users can only access their own data
- Public read access for leaderboards/player catalog
- Service role key for Edge Functions

### SQL Injection Prevention
- All functions use `SECURITY DEFINER`
- `SET search_path = public, pg_temp` on all functions
- Prepared statements in Edge Functions

---

## 📚 Documentation

For detailed information, see:

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture, data flow, database schema, security, performance
- **[GAMEPLAY.md](docs/GAMEPLAY.md)** - Complete user journey, game mechanics, scoring system, contest types
- **[API.md](docs/API.md)** - BallDontLie NFL API integration guide with SDK examples

---

## 🚀 Deployment

### Frontend (Vercel)

1. Connect GitHub repository to Vercel
2. Set environment variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_BALLDONTLIE_API_KEY=your_api_key
   ```
3. Deploy automatically on push to main

### Backend (Supabase)

1. Create Supabase project
2. Run migrations:
   ```bash
   supabase db push
   ```
3. Deploy Edge Functions:
   ```bash
   supabase functions deploy update-projections
   supabase functions deploy start-live-week
   # ... deploy all functions
   ```
4. Set up cron jobs via Supabase dashboard

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- **BallDontLie API** for NFL data
- **Supabase** for backend infrastructure
- **Tailwind CSS** for styling system
- **Vercel** for hosting and deployment

---

**Built with ❤️ for fantasy football fans**