# NFL Connections Fantasy Game

A next-generation NFL fantasy game where players build rosters through pack openings, set weekly lineups, and compete to beat the median score. Features multiple contest types with varying durations, PPR scoring systems, and loss limits.

## 🎮 Core Gameplay

- **Pack-Based Roster Building**: Acquire players through a dynamic pack opening system
- **Median Scoring System**: Win by scoring at or above the median, not just the average
- **Multiple Contest Types**: Choose from 1-week, 3-week, or 18-week contests with different rules
- **PPR Scoring Variations**: Standard (0 PPR), Half PPR (0.5), and Full PPR (1.0) options
- **Loss Elimination**: Each contest type has a max loss limit before elimination

## 🏗️ Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth + Storage)
- **External API**: BallDontLie NFL API (via SDK)
- **Deployment**: Vercel (Frontend) + Supabase (Backend)

## 📁 Project Structure

```
connections-testing/
├── src/
│   ├── components/        # React components
│   ├── pages/            # Page components (routing)
│   ├── contexts/         # React contexts (Auth, Fantasy, Toast)
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API services (Supabase, NFL API)
│   ├── utils/            # Utility functions
│   └── constants/        # App constants
├── supabase/
│   ├── functions/        # Edge Functions (TypeScript/Deno)
│   └── migrations/       # Database migrations (SQL)
├── docs/                 # Documentation
└── public/              # Static assets
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Supabase CLI
- BallDontLie NFL API key

### Installation

1. Clone the repository
```bash
git clone https://github.com/nickroachy7/connections-testing.git
cd connections-testing
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Add your Supabase and BallDontLie API credentials
```

4. Run development server
```bash
npm run dev
```

### Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_BALLDONTLIE_API_KEY=your_balldontlie_api_key
```

## 📖 Key Features

### Contest Types
- **1 Week Contests**: Fast-paced weekly challenges
- **3 Week Contests**: Quick tournaments with 1-loss elimination
- **18 Week Contests**: Full season experience with 7-loss limit

### Scoring System
- Uses **median scoring** (not average) for win/loss determination
- Real-time scoring during NFL games
- Automatic weekly finalization and advancement

### Pack System
- Dynamic pull rates based on player performance
- Tier-based card system (Role Player, Starter, All-Star, Elite)
- Starter pack tier boosts based on contest type

### Automation
- Weekly projections update (Tuesday 8:05 PM, Sunday 6:00 PM)
- Live stats tracking during games (every 2 minutes on game days)
- Week finalization (Tuesday 12:01 AM)
- Week advancement (Tuesday 8:00 PM)

## 🗄️ Database Schema

Key tables:
- `users` - User profiles and stats
- `teams` - User teams with contest types
- `contest_types` - Contest configuration
- `player_cards` - NFL player data and projections
- `token_cards` - Bonus tokens for lineup boosts
- `user_player_inventory` - Player card ownership
- `weekly_lineups` - Team lineups per week
- `weekly_global_stats` - Weekly median/average calculations

## 🔧 Development

### Running Supabase Functions Locally
```bash
supabase functions serve
```

### Deploying Edge Functions
```bash
supabase functions deploy <function-name>
```

### Database Migrations
```bash
supabase db push
```

## 📚 Documentation

- **Architecture**: See `docs/ARCHITECTURE.md` for system design details
- **Gameplay Flow**: See `docs/GAMEPLAY.md` for user journey and mechanics
- **API Guide**: See `docs/API.md` for BallDontLie API integration

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

See LICENSE file for details.

## 🏆 Credits

Built by the YapSports team.
