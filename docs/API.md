# BallDontLie NFL API Integration Guide

Complete reference for integrating the BallDontLie NFL API using the official JavaScript SDK.

## 📦 Setup

### Installation

```bash
npm install @balldontlie/sdk dotenv
```

### Environment Variables

```env
VITE_BALLDONTLIE_API_KEY=your_api_key_here
```

### SDK Initialization

```javascript
import { BalldontlieAPI } from '@balldontlie/sdk';

const nflApi = new BalldontlieAPI({
  apiKey: import.meta.env.VITE_BALLDONTLIE_API_KEY
});
```

---

## 🏈 Available Endpoints

### 1. Teams

Get all NFL teams:

```javascript
const teams = await nflApi.nfl.getTeams();
// Returns: { data: Team[], meta: { total_count, next_cursor, per_page } }
```

**Team Object Structure:**
```typescript
{
  id: number;
  conference: string;
  division: string;
  city: string;
  name: string;
  full_name: string;
  abbreviation: string; // "KC", "SF", etc.
}
```

---

### 2. Players

Get players with filtering and pagination:

```javascript
// Get all players
const players = await nflApi.nfl.getPlayers();

// Filter by team
const chiefsPlayers = await nflApi.nfl.getPlayers({
  team_ids: [1] // Kansas City Chiefs
});

// Filter by position
const quarterbacks = await nflApi.nfl.getPlayers({
  position: 'QB'
});

// Search by name
const mahomes = await nflApi.nfl.getPlayers({
  search: 'Mahomes'
});

// Pagination
const page2 = await nflApi.nfl.getPlayers({
  cursor: 'next_cursor_value',
  per_page: 50
});
```

**Player Object Structure:**
```typescript
{
  id: number;
  first_name: string;
  last_name: string;
  position: string; // "QB", "RB", "WR", etc.
  height: string;
  weight: string;
  team: Team; // Full team object
}
```

**Available Positions:**
- Offense: QB, RB, WR, TE, OL (Offensive Line)
- Defense: DL, LB, DB
- Special Teams: K, P

---

### 3. Games

Get NFL games with filters:

```javascript
// Get all games
const games = await nflApi.nfl.getGames();

// Filter by season
const season2024 = await nflApi.nfl.getGames({
  seasons: [2024]
});

// Filter by team
const chiefsGames = await nflApi.nfl.getGames({
  team_ids: [1],
  seasons: [2024]
});

// Filter by date range
const weekGames = await nflApi.nfl.getGames({
  start_date: '2024-09-01',
  end_date: '2024-09-08'
});

// Get specific game
const game = await nflApi.nfl.getGame(12345);
```

**Game Object Structure:**
```typescript
{
  id: number;
  season: number;
  status: string; // "scheduled", "in_progress", "final"
  date: string; // ISO 8601
  home_team: Team;
  visitor_team: Team;
  home_team_score: number;
  visitor_team_score: number;
  week: number;
  period: number; // Current quarter (1-4)
  time: string; // Time remaining in period
}
```

**Game Status Values:**
- `scheduled` - Game not started
- `in_progress` - Game currently playing
- `halftime` - Halftime break
- `final` - Game completed

---

### 4. Stats (Per-Game Player Stats)

Get player statistics for specific games:

```javascript
// Get stats for a specific game
const gameStats = await nflApi.nfl.getStats({
  game_ids: [12345]
});

// Get stats for a player
const playerStats = await nflApi.nfl.getStats({
  player_ids: [456]
});

// Get stats for multiple games
const weekStats = await nflApi.nfl.getStats({
  game_ids: [123, 124, 125, 126]
});

// Combine filters
const mahomesWeek1 = await nflApi.nfl.getStats({
  player_ids: [456],
  game_ids: [12345]
});
```

**Stats Object Structure:**
```typescript
{
  id: string;
  game: Game; // Full game object
  player: Player; // Full player object
  team: Team; // Full team object
  
  // Passing stats
  passing_attempts: number;
  passing_completions: number;
  passing_yards: number;
  passing_touchdowns: number;
  passing_interceptions: number;
  
  // Rushing stats
  rushing_attempts: number;
  rushing_yards: number;
  rushing_touchdowns: number;
  
  // Receiving stats
  receptions: number;
  receiving_yards: number;
  receiving_touchdowns: number;
  targets: number;
  
  // Kicking stats
  field_goals_made: number;
  field_goals_attempted: number;
  extra_points_made: number;
  extra_points_attempted: number;
  
  // Defensive stats
  tackles: number;
  sacks: number;
  interceptions: number;
  fumbles_recovered: number;
}
```

**Important Notes:**
- Stats are per-game, not cumulative
- Only populated fields are returned (e.g., RB won't have passing stats)
- Use `game.status === "final"` to ensure stats are complete

---

### 5. Season Averages

Get aggregated season statistics for players:

```javascript
// Get season averages for a player
const mahomesAvg = await nflApi.nfl.getSeasonAverages({
  season: 2024,
  player_ids: [456]
});

// Get averages for multiple players
const qbAverages = await nflApi.nfl.getSeasonAverages({
  season: 2024,
  player_ids: [456, 789, 101]
});
```

**Season Average Object Structure:**
```typescript
{
  player_id: number;
  season: number;
  games_played: number;
  
  // Averages per game
  passing_attempts: number;
  passing_completions: number;
  passing_yards: number;
  passing_touchdowns: number;
  passing_interceptions: number;
  rushing_attempts: number;
  rushing_yards: number;
  rushing_touchdowns: number;
  receptions: number;
  receiving_yards: number;
  receiving_touchdowns: number;
  // ... etc.
}
```

---

## 🔄 Pagination

All list endpoints support cursor-based pagination:

```javascript
async function getAllPlayers() {
  const allPlayers = [];
  let cursor = null;
  
  do {
    const response = await nflApi.nfl.getPlayers({
      cursor,
      per_page: 100
    });
    
    allPlayers.push(...response.data);
    cursor = response.meta.next_cursor;
  } while (cursor);
  
  return allPlayers;
}
```

**Pagination Helper:**
```javascript
async function* paginateAll(endpoint, params = {}) {
  let cursor = null;
  
  do {
    const response = await endpoint({ ...params, cursor });
    
    for (const item of response.data) {
      yield item;
    }
    
    cursor = response.meta.next_cursor;
  } while (cursor);
}

// Usage
for await (const player of paginateAll(nflApi.nfl.getPlayers)) {
  console.log(player.first_name, player.last_name);
}
```

---

## 💡 Common Use Cases

### Calculate Fantasy Points

```javascript
function calculateFantasyPoints(stats, pprValue = 0.5) {
  let points = 0;
  
  // Passing
  points += (stats.passing_yards || 0) * 0.04; // 1 pt per 25 yards
  points += (stats.passing_touchdowns || 0) * 4;
  points += (stats.passing_interceptions || 0) * -2;
  
  // Rushing
  points += (stats.rushing_yards || 0) * 0.1; // 1 pt per 10 yards
  points += (stats.rushing_touchdowns || 0) * 6;
  
  // Receiving
  points += (stats.receiving_yards || 0) * 0.1;
  points += (stats.receiving_touchdowns || 0) * 6;
  points += (stats.receptions || 0) * pprValue; // PPR bonus
  
  // Kicking
  points += (stats.field_goals_made || 0) * 3;
  points += (stats.extra_points_made || 0) * 1;
  
  // Defense
  points += (stats.sacks || 0) * 1;
  points += (stats.interceptions || 0) * 2;
  
  return points;
}
```

### Get Live Game Scores

```javascript
async function getLiveScores() {
  const today = new Date().toISOString().split('T')[0];
  
  const games = await nflApi.nfl.getGames({
    start_date: today,
    end_date: today
  });
  
  return games.data.filter(game => game.status === 'in_progress');
}
```

### Update Player Projections

```javascript
async function updatePlayerProjections(season = 2024) {
  const players = await nflApi.nfl.getPlayers();
  
  for (const player of players.data) {
    const averages = await nflApi.nfl.getSeasonAverages({
      season,
      player_ids: [player.id]
    });
    
    if (averages.data.length > 0) {
      const avg = averages.data[0];
      const projectedPoints = calculateFantasyPoints(avg);
      
      // Update database with projectedPoints
      await updateDatabase(player.id, projectedPoints);
    }
  }
}
```

### Track Live Stats During Games

```javascript
async function trackLiveStats(gameIds) {
  const stats = await nflApi.nfl.getStats({
    game_ids: gameIds
  });
  
  const playerScores = new Map();
  
  for (const stat of stats.data) {
    const points = calculateFantasyPoints(stat);
    playerScores.set(stat.player.id, {
      player: stat.player,
      game: stat.game,
      points
    });
  }
  
  return playerScores;
}
```

---

## ⚠️ Rate Limiting & Best Practices

### Rate Limits
- Free tier: 10 requests/minute
- Check response headers for rate limit info

### Best Practices

1. **Cache Responses**
```javascript
const cache = new Map();

async function getCachedTeams() {
  if (cache.has('teams')) {
    return cache.get('teams');
  }
  
  const teams = await nflApi.nfl.getTeams();
  cache.set('teams', teams);
  return teams;
}
```

2. **Batch Requests**
```javascript
// ❌ Don't do this (too many requests)
for (const playerId of playerIds) {
  await nflApi.nfl.getStats({ player_ids: [playerId] });
}

// ✅ Do this (single request)
await nflApi.nfl.getStats({ player_ids: playerIds });
```

3. **Handle Errors**
```javascript
async function safeApiCall(apiFunction, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await apiFunction();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

4. **Use Appropriate Filters**
```javascript
// ❌ Don't fetch all games then filter
const allGames = await nflApi.nfl.getGames();
const week1Games = allGames.data.filter(g => g.week === 1);

// ✅ Use API filters
const week1Games = await nflApi.nfl.getGames({
  seasons: [2024],
  weeks: [1]
});
```

---

## 📚 Additional Resources

- **Official SDK**: [@balldontlie/sdk](https://www.npmjs.com/package/@balldontlie/sdk)
- **API Documentation**: [balldontlie.io/docs](https://balldontlie.io/docs)
- **Rate Limits**: Check response headers `X-RateLimit-Remaining`

---

## 🔧 Edge Function Integration

When using in Supabase Edge Functions (Deno):

```typescript
import { BalldontlieAPI } from 'npm:@balldontlie/sdk@1';

const nflApi = new BalldontlieAPI({
  apiKey: Deno.env.get('BALLDONTLIE_API_KEY')!
});

Deno.serve(async (req) => {
  try {
    const players = await nflApi.nfl.getPlayers({ per_page: 100 });
    
    return new Response(
      JSON.stringify({ success: true, data: players }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

---

**Document Version**: 1.0  
**Last Updated**: November 21, 2025  
**SDK Version**: @balldontlie/sdk@1
