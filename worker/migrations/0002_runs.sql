-- Rozgrywki rankingowe: serwer trzyma seed i dziennik ruchów, a losowość wydaje dopiero po zapisaniu decyzji gracza
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  diff TEXT NOT NULL CHECK (diff IN ('easy', 'normal', 'hard')),
  seed INTEGER NOT NULL,
  log TEXT NOT NULL DEFAULT '[]',
  len INTEGER NOT NULL DEFAULT 0,
  score_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS runs_old ON runs (updated_at);
