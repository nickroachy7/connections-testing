# NFL Fantasy Connections 🏈

A fantasy football game where you collect player cards, build lineups, and compete weekly against a global average. Survive the season by avoiding elimination!

---

## 🎮 What is This?

NFL Fantasy Connections is a unique take on fantasy football:
- **Collect player cards** through packs (with varying rarities/tiers)
- **Build lineups** each week with strategic decisions
- **Apply token bonuses** for extra points (2x multipliers, yardage boosts, etc.)
- **Beat the average** to earn wins (fall below = loss)
- **Survive to the end** - 3 losses and you're eliminated!
- **Multiple contest types** - Choose 3, 8, 12, or 18-week contests with different PPR scoring

---

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/nickroachy7/connections-testing.git
   cd connections-testing
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Add your Supabase credentials

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Access the app**
   - Open http://localhost:5173

For detailed setup instructions, see **[QUICK_START.md](./QUICK_START.md)**

---

## 📖 Documentation

### Essential Reading
- **[GAMEPLAY_FLOW.md](./GAMEPLAY_FLOW.md)** ⭐ - How the game works (user perspective)
- **[QUICK_START.md](./QUICK_START.md)** - Developer setup guide
- **[docs/](./docs/)** - All technical documentation

### Key Documentation
- **[Development Status](./docs/DEVELOPMENT_STATUS.md)** - Current progress, roadmap, known issues
- **[Weekly Automation](./docs/WEEKLY_AUTOMATION.md)** - How automated processes work
- **[System Architecture](./docs/SYSTEM_ARCHITECTURE.md)** - Database schema and technical details
- **[Edge Functions Guide](./docs/EDGE_FUNCTIONS_GUIDE.md)** - Backend function documentation

See **[docs/README.md](./docs/README.md)** for complete documentation index.

---

## 🛠️ Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions + Auth + Storage)
- **NFL Data:** BallDontLie API
- **Deployment:** Vercel (frontend) + Supabase (backend)
- **Language:** JavaScript/JSX

---

## 🎯 Key Features

### ✅ Implemented
- ✅ User authentication and profiles
- ✅ Pack opening system with card rarities
- ✅ Player inventory management
- ✅ Lineup building with drag-and-drop
- ✅ Token system for strategic bonuses
- ✅ Automated weekly workflow (lock, stats, finalize, advance)
- ✅ Live stats integration with real NFL games
- ✅ Contest types (8 different modes)
- ✅ Win/loss tracking and elimination system
- ✅ Card progression (XP, leveling, tier upgrades)
- ✅ Real-time updates via Supabase subscriptions

### 🚧 In Progress
- 🚧 Security hardening (RLS policies)
- 🚧 Enhanced error handling
- 🚧 UI/UX polish
- 🚧 Multi-user testing

### 📋 Planned
- Leaderboards (contest-specific)
- Pack shop with multiple pack types
- Trading/marketplace
- Mobile app
- Advanced analytics

---

## 📂 Project Structure

```
connections-testing/
├── src/
│   ├── components/        # React components
│   ├── contexts/          # React contexts (Auth, Fantasy, Toast)
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Page components
│   ├── services/          # API services (Supabase, NFL API)
│   └── utils/             # Utility functions
├── supabase/
│   ├── functions/         # Edge functions (Deno/TypeScript)
│   └── migrations/        # Database migrations
├── docs/                  # Documentation
├── public/                # Static assets
└── .github/               # GitHub config & Copilot instructions
```

---

## 🔄 Weekly Automation

The game runs on automated weekly cycles:

1. **Thursday-Monday:** Games are played, stats update live
2. **Tuesday 12:01 AM:** Week finalizes, wins/losses determined
3. **Tuesday 8:00 PM:** Advance to next week, unlock all players
4. **Wednesday+:** Users set lineups for upcoming week

All processes are automated via Supabase cron jobs and edge functions.

See **[docs/WEEKLY_AUTOMATION.md](./docs/WEEKLY_AUTOMATION.md)** for details.

---

## 🧪 Development Workflow

### Running Locally
```bash
npm run dev          # Start Vite dev server
```

### Supabase Development
```bash
# Work with edge functions
cd supabase/functions/[function-name]
deno run --allow-all index.ts

# Deploy edge function
supabase functions deploy [function-name]

# Run migrations
supabase db push
```

### Code Quality
- Follow existing code patterns
- Use ESLint configuration
- Check `.github/copilot-instructions.md` for guidelines
- Test before pushing to main

---

## 🤝 Contributing

This is currently a private project, but we welcome contributions:

1. Check **[docs/DEVELOPMENT_STATUS.md](./docs/DEVELOPMENT_STATUS.md)** for current priorities
2. Review **[GAMEPLAY_FLOW.md](./GAMEPLAY_FLOW.md)** to understand intended behavior
3. Follow the code style and patterns in the codebase
4. See `.github/copilot-instructions.md` for detailed guidelines
5. Test your changes thoroughly before submitting

---

## 📊 Project Status

**Current Phase:** Pre-Production - Security & Quality Hardening  
**Target Launch:** Late November 2025  
**Production Readiness:** 6.2/10 → Improving to 9+/10

See **[docs/DEVELOPMENT_STATUS.md](./docs/DEVELOPMENT_STATUS.md)** for detailed status.

---

## 📞 Support & Contact

- **Issues:** Use GitHub Issues
- **Documentation:** See `/docs` folder
- **Project Owner:** @nickroachy7

---

## 📄 License

See [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- **BallDontLie API** for NFL data
- **Supabase** for backend infrastructure
- **React** and **Vite** for frontend framework
- **Tailwind CSS** for styling

---

**Built with ❤️ for fantasy football fans**
