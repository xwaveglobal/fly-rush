# XWAVE player server (reference)

The game reads and writes players through `PlayerStore` (`src/net/PlayerStore.ts`):

- **LocalPlayerStore** (default) keeps the `players` and `scores` tables in the browser. Bots are seeded on first launch with `is_bot = true`. The real player is written as `p-<id>` with `is_bot = false` after every run.
- **RemotePlayerStore** uses the same API over HTTP. Open the game with `?api=https://your-server` (or set `window.XWAVE_API`) to switch.

## Run locally
```
node server/index.mjs          # http://localhost:8787, data in server/data.json
# then: http://localhost:5173/?api=http://localhost:8787
```

## API
| Method | Path | Body / result |
|---|---|---|
| GET | /players/:id | PlayerRecord or null |
| PUT | /players/:id | PlayerRecord |
| POST | /scores | { playerId, board, score } — keeps the best per board |
| GET | /boards/:board?limit=100 | ranked rows with player |
| GET | /boards/:board/rank/:playerId | { rank, total } |

Boards: `all`, `week:2026-W43`, `cup:<session>-<class>`.

## Before going live
- Put `schema.sql` in PostgreSQL (or SQLite) in place of the JSON file.
- Add auth: an anonymous install token, then optional Apple, Google or Facebook login.
- Make X-Points and class **server-authoritative**: recompute them from submitted runs (the `runs` table) with sanity checks. Never accept xp from the client, and never sell it.
- Mix bots in: return `is_bot` rows to fill boards while the player base is small, and lower the bot share as real players grow.
