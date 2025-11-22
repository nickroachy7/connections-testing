
# BALLDONTLIE NFL API — JavaScript Guide & Parameter Reference

_Last updated: November 18, 2025_

This document is a developer-friendly, JavaScript-first reference for the **BALLDONTLIE NFL API**. It includes a quickstart, pagination patterns, error handling, and per-endpoint **parameters + JS examples**.

---

## Overview

- **Base URL:** `https://api.balldontlie.io/nfl/v1`
- **Coverage:** Data from **2002 → current** seasons.
- **Auth:** **API key required**. Send `Authorization: YOUR_API_KEY` on every request.
- **Pagination:** Cursor-based. Responses include `meta.next_cursor` and `meta.per_page`. Request the next page with `?cursor=...`.
- **Response format:** JSON.
- **JS SDK (optional):** `@balldontlie/sdk`

> Tip: Prefer `per_page=100` where available to reduce the number of requests. Use retry with exponential backoff on 429s.

---

## Quickstart (JS)

### Using `fetch`

```js
const API_BASE = "https://api.balldontlie.io/nfl/v1";
const API_KEY = process.env.BALLDONTLIE_API_KEY; // put your key in an env var

async function http(path, params = {}) {
  const url = new URL(path, API_BASE);
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) {
      // APIs expect array params like team_ids[]=1&team_ids[]=2
      for (const item of v) url.searchParams.append(`${k}[]`, String(item));
    } else if (v !== undefined && v !== null) {
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url, {
    headers: { Authorization: API_KEY },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
  return res.json();
}
```

### Pagination helper (cursor-based)

```js
async function* paginate(path, params = {}, { perPage = 100, limit = Infinity } = {}) {
  let cursor = undefined;
  let returned = 0;
  while (returned < limit) {
    const page = await http(path, { ...params, per_page: perPage, cursor });
    const rows = page.data ?? [];
    for (const row of rows) {
      if (returned++ >= limit) return;
      yield row;
    }
    cursor = page.meta?.next_cursor;
    if (!cursor) break;
  }
}
```

### Axios variant

```js
const axios = require("axios");
const client = axios.create({
  baseURL: "https://api.balldontlie.io/nfl/v1",
  headers: { Authorization: process.env.BALLDONTLIE_API_KEY },
});
```

### Simple 429 retry utility

```js
async function withRetries(fn, { tries = 4, baseDelayMs = 400 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const status = err.response?.status || err.status;
      if (attempt >= tries || status !== 429) throw err;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

---

## Account Tiers & Rate Limits

- **Free:** 5 requests / minute
- **ALL-STAR (paid):** 60 requests / minute
- **GOAT (paid):** 600 requests / minute  
- Endpoint access varies by tier (see individual endpoints below).

---

## Errors (common)

| Code | Meaning |
|---:|---|
| 400 | Bad Request (check parameters) |
| 401 | Unauthorized (missing or wrong key / insufficient tier) |
| 404 | Not Found |
| 406 | Not Acceptable (non-JSON requested) |
| 429 | Too Many Requests (rate-limited) |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

# Endpoint Reference (JS + Parameters)

Below, each section shows **path**, **required/optional query parameters**, and **ready-to-use JS examples**.

## Teams

### GET `/teams` — list teams
**Query params**
- `division` _(optional)_ — e.g., `EAST`, `NORTH`, `SOUTH`, `WEST`
- `conference` _(optional)_ — `AFC` or `NFC`

```js
const teams = await http("/teams", { conference: "AFC" });
```

### GET `/teams/{id}` — get one team
**Path params**
- `id` _(required)_ — team id

```js
const eagles = await http("/teams/18");
```

---

## Players

### GET `/players` — list players
**Query params**
- `cursor` _(optional)_ — pagination cursor
- `per_page` _(optional, max 100)_
- `search` _(optional)_ — matches first or last name (case-insensitive)
- `first_name` _(optional)_
- `last_name` _(optional)_
- `team_ids[]` _(optional, array)_
- `player_ids[]` _(optional, array)_

```js
// search by name
const lamars = await http("/players", { search: "lamar", per_page: 100 });

// filter by multiple teams
const players = await http("/players", { team_ids: [6, 18] });
```

### GET `/players/{id}` — get one player
**Path params**
- `id` _(required)_

```js
const player = await http("/players/33"); // Lamar Jackson
```

---

## Player Injuries

### GET `/player_injuries` — list recent injuries
**Query params**
- `cursor` _(optional)_
- `per_page` _(optional, max 100)_
- `team_ids[]` _(optional, array)_
- `player_ids[]` _(optional, array)_

```js
// latest injuries for specific teams
const injuries = await http("/player_injuries", { team_ids: [6, 18], per_page: 100 });
```

---

## Active Players

### GET `/players/active` — currently active players
**Query params** (same shape as `/players`)
- `cursor`, `per_page`, `search`, `first_name`, `last_name`, `team_ids[]`, `player_ids[]`

```js
// find active players named "Jackson" on BAL (6) or PHI (18)
const active = await http("/players/active", {
  last_name: "jackson",
  team_ids: [6, 18],
  per_page: 100,
});
```

---

## Games

### GET `/games` — list games
**Query params**
- `cursor` _(optional)_
- `per_page` _(optional, max 100)_
- `dates[]` _(optional, array of `YYYY-MM-DD`)_
- `seasons[]` _(optional, array of seasons)_
- `team_ids[]` _(optional, array)_
- `postseason` _(optional, boolean)_
- `weeks[]` _(optional, array of week numbers)_

```js
// Week 1 games for 2024
const games = await http("/games", { seasons: [2024], weeks: [1], per_page: 100 });

// All 2024 games for a team
const kc2024 = await http("/games", { seasons: [2024], team_ids: [14], per_page: 100 });
```

### GET `/games/{id}` — get one game
**Path params**
- `id` _(required)_

```js
const game = await http("/games/7001");
```

---

## Stats (per-game player stats)

- **Real-time:** Stats update live during games.

### GET `/stats` — list per-game stats
**Query params**
- `cursor` _(optional)_
- `per_page` _(optional, max 100)_
- `player_ids[]` _(optional, array)_
- `game_ids[]` _(optional, array)_
- `seasons[]` _(optional, array)_

```js
// All stats for a player in 2024 (paginated)
const out = [];
for await (const row of paginate("/stats", { player_ids: [33], seasons: [2024] })) {
  out.push(row);
}
```

---

## Season Stats (player season aggregates)

### GET `/season_stats` — list season totals
**Query params**
- `season` _(required, number)_
- `player_ids[]` _(optional, array)_
- `team_id` _(optional)_
- `postseason` _(optional, default `false`)_
- `sort_by` _(optional, e.g., `rushing_yards`, most response fields allowed)_
- `sort_order` _(optional, `asc` or `desc`)_

```js
// Top rushers, 2024
const rushers = await http("/season_stats", {
  season: 2024,
  sort_by: "rushing_yards",
  sort_order: "desc",
  per_page: 100,
});
```

---

## Standings

### GET `/standings` — team standings for a season
**Query params**
- `season` _(required)_

```js
const standings = await http("/standings", { season: 2024 });
```

---

## Advanced Stats (GOAT tier)

> Requires GOAT tier. Week-level and season-level advanced stats.

### GET `/advanced_stats/rushing`
**Query params**
- `season` _(required)_
- `player_id` _(optional)_
- `postseason` _(optional)_
- `week` _(optional; **0** = full season to-date)_

```js
const advRush = await http("/advanced_stats/rushing", { season: 2024, week: 0 });
```

### GET `/advanced_stats/passing`
**Query params** — same shape as rushing

```js
const advPass = await http("/advanced_stats/passing", { season: 2024, week: 0 });
```

### GET `/advanced_stats/receiving`
**Query params** — same shape as rushing

```js
const advRecv = await http("/advanced_stats/receiving", { season: 2024, week: 0 });
```

---

## Team Season Stats (season aggregates)

### GET `/team_season_stats`
**Query params**
- `season` _(required)_
- `team_ids[]` _(required, array)_
- `postseason` _(optional)_
- `cursor` _(optional)_
- `per_page` _(optional, max 100)_

```js
const detSeason = await http("/team_season_stats", { season: 2025, team_ids: [25] });
```

---

## Team Stats (per-game team stats)

### GET `/team_stats`
**Query params**
- `cursor` _(optional)_
- `per_page` _(optional, max 100)_
- `team_ids[]` _(optional, array)_
- `seasons[]` _(optional, array)_
- `game_ids[]` _(optional, array)_

```js
const teamGames = await http("/team_stats", { team_ids: [6], seasons: [2025] });
```

---

## Plays (play-by-play)

### GET `/plays`
**Query params**
- `game_id` _(required)_
- `cursor` _(optional)_
- `per_page` _(optional, max 100)_

```js
const plays = await http("/plays", { game_id: 424066, per_page: 100 });
```

---

## Betting Odds (GOAT tier)

- **Availability:** From **2025 season, week 8+**.
- **Vendors:** `betmgm`, `fanduel`, `draftkings`, `bet365`, `caesars`, `espnbet`.
- Provide `(season & week)` **or** `game_ids[]`.

### GET `/odds`
**Query params**
- `cursor` _(optional)_
- `per_page` _(optional, max 100)_
- `season` _(optional; must be paired with `week`)_
- `week` _(optional; must be paired with `season`)_
- `game_ids[]` _(optional, array)_

```js
// All vendors for a given week
const odds = await http("/odds", { season: 2025, week: 8 });

// Specific games
const oddsForGames = await http("/odds", { game_ids: [424051, 424050] });
```

---

## Using the JS SDK (optional)

```js
import { BalldontlieAPI } from "@balldontlie/sdk";

const api = new BalldontlieAPI({ apiKey: process.env.BALLDONTLIE_API_KEY });

// Teams
const teams = await api.nfl.getTeams();

// Players
const players = await api.nfl.getPlayers({ search: "lamar" });

// Games
const games = await api.nfl.getGames({ seasons: [2024], weeks: [1] });

// Season Stats
const seasonStats = await api.nfl.getSeasonStats({ season: 2024, sort_by: "rushing_yards", sort_order: "desc" });

// Advanced Stats (GOAT tier)
const advPassing = await api.nfl.getAdvancedPassingStats({ season: 2024, week: 0 });
```

---

## Appendix: Array params pattern

When a parameter accepts multiple values, send them as `paramName[]=v1&paramName[]=v2`.

```js
const url = new URL("https://api.balldontlie.io/nfl/v1/games");
url.searchParams.append("team_ids[]", 6);
url.searchParams.append("team_ids[]", 18);
```

---

## Appendix: Environment variables (Node)

```bash
# .env
BALLDONTLIE_API_KEY=xxxxxxxxxxxxxxxx
```

```js
// index.js
require("dotenv").config();
```

---

## Appendix: Minimal end-to-end script

```js
import "dotenv/config";

const API_BASE = "https://api.balldontlie.io/nfl/v1";

async function http(path, params = {}) { /* ... same as above ... */ }
async function* paginate(path, params = {}, opts) { /* ... same as above ... */ }

async function main() {
  const teams = await http("/teams");
  console.log("Team count:", teams.data.length);

  const chiefs = teams.data.find(t => t.abbreviation === "KC");
  const games = await http("/games", { seasons: [2024], team_ids: [chiefs.id] });
  console.log("KC 2024 games:", games.data.length);

  const game = games.data[0];
  const stats = [];
  for await (const row of paginate("/stats", { game_ids: [game.id] })) {
    stats.push(row);
  }
  console.log("Rows of per-game player stats:", stats.length);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
```

---

## Troubleshooting & Tips

- **401 Unauthorized** — ensure `Authorization` header is present and your tier includes the endpoint.
- **429 Too Many Requests** — back off and retry (see utility above); consider upgrading tier.
- **Empty results** — check season/week/date filters and array parameter formatting (use `[]` suffix).
- **Real-time data** — in-progress games update stats; re-poll with backoff.

---

Happy building! 🏈
