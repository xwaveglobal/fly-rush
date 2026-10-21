-- XWAVE Flying Run — player database (PostgreSQL / works in SQLite with minor type changes)
-- Bots and real players share one table; is_bot separates them.

CREATE TABLE players (
  id          TEXT PRIMARY KEY,            -- 'p-<install id>' for real players, 'bot-<hash>' for bots
  name        TEXT NOT NULL,
  avatar      INTEGER NOT NULL DEFAULT 0,  -- racing-helmet avatar index (0..23)
  flag        TEXT NOT NULL DEFAULT '',
  is_bot      BOOLEAN NOT NULL DEFAULT FALSE,
  cls         TEXT NOT NULL DEFAULT 'D',   -- D, C, B, A, AA, AAA
  xp          INTEGER NOT NULL DEFAULT 0,  -- X-Points (rank points) — server-authoritative, never sold
  best        INTEGER NOT NULL DEFAULT 0,
  runs        INTEGER NOT NULL DEFAULT 0,
  car         TEXT NOT NULL DEFAULT 'pearl',
  trophies    JSONB NOT NULL DEFAULT '{"gold":0,"silver":0,"bronze":0}',
  created_at  BIGINT NOT NULL,
  last_seen   BIGINT NOT NULL
);

-- best score per (player, board); board = 'all' | 'week:2026-W43' | 'cup:s41234-C'
CREATE TABLE scores (
  board      TEXT NOT NULL,
  player_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  score      INTEGER NOT NULL,
  at         BIGINT NOT NULL,
  PRIMARY KEY (board, player_id)
);
CREATE INDEX scores_board_rank ON scores (board, score DESC, at ASC);

-- each run as submitted (anti-cheat review, replays, analytics)
CREATE TABLE runs (
  id         BIGSERIAL PRIMARY KEY,
  player_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  track      TEXT NOT NULL,
  level      TEXT NOT NULL,               -- easy | normal | hard
  score      INTEGER NOT NULL,
  distance   INTEGER NOT NULL,
  near_miss  INTEGER NOT NULL,
  xp_gained  INTEGER NOT NULL,
  at         BIGINT NOT NULL
);
