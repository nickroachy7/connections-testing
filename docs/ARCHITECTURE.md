# System Architecture

## Overview

NFL Connections is built on a modern serverless architecture with React frontend, Supabase backend, and automated NFL data processing.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Vercel)                      │
│                                                             │
│  React 18 + Vite + Tailwind CSS                            │
│  ├─ Pages (Team Manager, Pack Shop, Inventory, etc.)      │
│  ├─ Components (Lineup Grid, Cards, Modals, etc.)         │
│  ├─ Contexts (Auth, Fantasy, Toast)                       │
│  └─ Services (Supabase Client, NFL API SDK)               │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ HTTPS/WebSocket
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE BACKEND                         │
│                                                             │
│  PostgreSQL Database + Auth + Storage + Realtime           │
│  ├─ Tables (users, teams, player_cards, etc.)             │
│  ├─ RLS Policies (Row Level Security)                     │
│  ├─ Functions (PostgreSQL stored procedures)              │
│  └─ Triggers (auto-updates, validations)                  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ HTTP/CRON
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTIONS (Deno)                    │
│                                                             │
│  TypeScript serverless functions                           │
│  ├─ update-projections (player stats & projections)       │
│  ├─ start-live-week (mark week as active)                 │
│  ├─ lock-players (lock lineups before games)              │
│  ├─ track-live-stats (fetch real-time stats)              │
│  ├─ finalize-game (close out completed games)             │
│  ├─ finalize-week (calculate median, wins/losses)         │
│  ├─ advance-week (move to next week)                      │
│  ├─ open-pack (handle pack purchases)                     │
│  └─ start-new-team (create team with starter pack)        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ HTTPS
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                  BALLDONTLIE NFL API                        │
│                                                             │
│  External NFL data provider                                │
│  ├─ Player stats (season, weekly, live)                   │
│  ├─ Game data (scores, status)                            │
│  ├─ Team data                                             │
│  └─ Injury reports                                        │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. User Authentication
```
User → React Auth → Supabase Auth → PostgreSQL users table
                                   ↓
                          Auto-create profile trigger
```

### 2. Team Creation
```
User → Start New Team → Edge Function → Database
                           ↓
                    - Create team record
                    - Assign contest type
                    - Open starter pack
                    - Apply tier boosts
                    - Add players to inventory
```

### 3. Lineup Management
```
User → Set Lineup → React State → Supabase (weekly_lineups)
                                       ↓
                              Validate positions
                              Calculate projected points
```

### 4. Weekly Game Cycle

**Sunday 1:00 PM** - Start Live Week
```
CRON → start-live-week → Update nfl_season_config.status = 'live'
```

**Sunday 1:05 PM** - Lock Players
```
CRON → lock-players → Set is_locked = true on active players
```

**Sunday/Monday/Thursday (Every 2 min)** - Track Live Stats
```
CRON → track-live-stats → BallDontLie API → Update player_game_stats
                                          → Update weekly_lineups.total_points
```

**Every 10 min (Game Days)** - Finalize Games
```
CRON → finalize-game → Create zero-stat entries for DNPs
                    → Mark games as complete
```

**Tuesday 12:01 AM** - Finalize Week
```
CRON → finalize-week → Calculate median score
                     → Determine wins/losses (score >= median = Win)
                     → Update team records
                     → Update weekly_global_stats
```

**Tuesday 8:00 PM** - Advance Week
```
CRON → advance-week → Increment current_week
                    → Unlock all players
                    → Reset week status to 'upcoming'
```

**Tuesday 8:05 PM & Sunday 6:00 PM** - Update Projections
```
CRON → update-projections → BallDontLie API → Update weekly_projected_points
                                             → Recalculate pull_percentage
```

### 5. Pack Opening
```
User → Buy Pack → Edge Function → Database
                      ↓
               - Deduct coins
               - Generate random pulls (bell curve distribution)
               - Assign card tiers/levels
               - Add to inventory
```

## Database Architecture

### Core Tables

**users**
- User profiles and global stats
- Links to Supabase Auth
- Tracks lifetime wins/losses, total teams

**teams**
- User teams with contest type configuration
- Current week, wins/losses, elimination status
- Links to contest_types

**contest_types**
- Contest configurations (duration, loss limits, PPR scoring)
- Starter pack tier boosts
- Active/inactive status

**player_cards**
- NFL player master data
- Weekly projections (calculated by Edge Functions)
- Pull percentages (dynamic based on performance)
- Injury status, games played, season stats

**token_cards**
- Bonus tokens (Position Boost, Point Multiplier, etc.)
- Point bonuses and descriptions

**user_player_inventory**
- Player card ownership per team
- Card level and experience points
- Acquisition tracking

**user_token_inventory**
- Token card ownership per team
- Active/inactive status

**weekly_lineups**
- Team lineups per week
- Position assignments (QB, RB1, RB2, etc.)
- Total points (calculated from game stats)
- Beat median tracking

**weekly_global_stats**
- Median score calculation (NOT average)
- Highest/lowest scores
- Total teams participating

**player_game_stats**
- Per-game player statistics
- Links to players and games
- Fantasy points breakdown

### Key Views

**leaderboard_by_contest**
- Teams ranked within their contest type
- Win percentage, avg points per week
- Partitioned rankings

**global_leaderboard**
- All teams across all contests
- Global rankings (not fair for comparison)

## Security Architecture

### Row Level Security (RLS)

All tables have RLS enabled with policies:

**users**
- Users can read their own profile
- Public profiles readable by all

**teams**
- Users can manage their own teams
- All teams readable for leaderboards

**player_cards**
- Public read access (player catalog)

**user_player_inventory**
- Users can only see/modify their own inventory

**weekly_lineups**
- Users can manage their own lineups
- All lineups readable for scoring

### Function Security

All PostgreSQL functions use:
```sql
SECURITY DEFINER
SET search_path = public, pg_temp
```

This prevents SQL injection via function search path manipulation.

### API Security

- Supabase Auth JWT tokens required
- Service role key for Edge Functions
- BallDontLie API key in environment variables

## Performance Optimizations

### Database Indexes

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Team queries
CREATE INDEX idx_teams_user_id ON teams(user_id);
CREATE INDEX idx_teams_contest_type ON teams(contest_type_id);

-- Lineup queries
CREATE INDEX idx_weekly_lineups_team_week ON weekly_lineups(team_id, week_number);

-- Leaderboard queries
CREATE INDEX idx_teams_points ON teams(total_points DESC);
CREATE INDEX idx_teams_wins ON teams(wins DESC, losses ASC);
```

### Caching Strategy

- Frontend: React Query for API response caching
- Real-time: Supabase subscriptions for live updates
- CDN: Vercel edge caching for static assets

### Lazy Loading

```javascript
// Code splitting with React lazy
const PackShop = lazy(() => import('./pages/PackShop'))
const TeamManager = lazy(() => import('./pages/TeamManager'))
```

## Scalability Considerations

### Horizontal Scaling
- Stateless Edge Functions (auto-scale)
- Supabase connection pooling
- Vercel CDN distribution

### Database Optimization
- Materialized views for complex queries
- Partitioning for historical data
- Archive strategy for old seasons

### Rate Limiting
- BallDontLie API: Respect rate limits with retry logic
- Supabase: Connection pool management
- Frontend: Debounced search/filters

## Monitoring & Logging

### Edge Functions
- Logs stored in `edge_function_logs` table
- Error tracking and retry logic
- Performance metrics

### Database
- Supabase dashboard metrics
- Query performance monitoring
- Connection pool stats

### Frontend
- Error boundaries for crash recovery
- Toast notifications for user feedback
- Console logging in development mode

## Deployment Pipeline

1. **Development**: Local Supabase + Vite dev server
2. **Staging**: Supabase staging project + Vercel preview
3. **Production**: Supabase prod + Vercel production

### CI/CD
- GitHub Actions for automated testing
- Supabase CLI for migration deployment
- Vercel auto-deployment on push to main

## Future Enhancements

- Redis caching layer for frequently accessed data
- GraphQL API layer for complex queries
- Websocket connections for real-time lobby/chat
- Mobile app (React Native) sharing same backend
- Admin dashboard for contest management
