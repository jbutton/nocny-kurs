-- Ranking online: tylko zweryfikowane wyniki (serwer odtwarza grę z seeda i dziennika ruchów)
CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  diff TEXT NOT NULL CHECK (diff IN ('easy', 'normal', 'hard')),
  score INTEGER NOT NULL,
  seed INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
-- jedna gra (seed + poziom) może trafić do rankingu tylko raz
CREATE UNIQUE INDEX IF NOT EXISTS scores_game ON scores (diff, seed);
CREATE INDEX IF NOT EXISTS scores_top ON scores (diff, score DESC);
