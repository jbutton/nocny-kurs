/**
 * API rankingu online „Nocny Kurs / Night Run” (Cloudflare Worker + D1).
 *
 *   GET  /api/scores?diff=normal&limit=20   → top wyników
 *   POST /api/scores {name, diff, seed, log} → serwer odtwarza grę tym samym silnikiem co klient,
 *                                               sam liczy wynik i zapisuje go, jeśli gra jest zakończona
 *
 * Nie zapisujemy adresów IP ani żadnych danych osobowych — tylko nick, wynik, poziom i datę.
 */
import { cleanNick } from '../../src/game/leaderboard';
import { verify } from '../../src/game/replay';

interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
}

const DIFFS = ['easy', 'normal', 'hard'];
const MAX_BODY = 512 * 1024;

function cors(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
const json = (data: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });

async function top(env: Env, diff: string, limit: number) {
  const { results } = await env.DB.prepare(
    'SELECT id, name, score, diff, substr(created_at, 1, 10) AS date FROM scores WHERE diff = ? ORDER BY score DESC, id ASC LIMIT ?',
  ).bind(diff, limit).all();
  return results;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (url.pathname !== '/api/scores') return json({ error: 'not_found' }, 404, h);

    if (req.method === 'GET') {
      const diff = url.searchParams.get('diff') ?? 'normal';
      if (!DIFFS.includes(diff)) return json({ error: 'diff' }, 400, h);
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 20));
      return json({ scores: await top(env, diff, limit) }, 200, { ...h, 'Cache-Control': 'no-store' });
    }

    if (req.method === 'POST') {
      const raw = await req.text();
      if (raw.length > MAX_BODY) return json({ error: 'too_large' }, 413, h);
      let body: unknown;
      try { body = JSON.parse(raw); } catch { return json({ error: 'format' }, 400, h); }
      const v = verify(body, (n) => cleanNick(n, 'Anonim'));
      if (!v.ok) return json({ error: v.reason }, 422, h);
      const { diff, seed } = body as { diff: string; seed: number };
      const ins = await env.DB.prepare('INSERT OR IGNORE INTO scores (name, diff, score, seed) VALUES (?, ?, ?, ?)')
        .bind(v.name, diff, v.score, seed).run();
      if (!ins.meta.changes) return json({ error: 'duplicate' }, 409, h);
      const id = ins.meta.last_row_id;
      const better = await env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE diff = ? AND (score > ? OR (score = ? AND id < ?))')
        .bind(diff, v.score, v.score, id).first<{ n: number }>();
      return json({ id, score: v.score, name: v.name, place: (better?.n ?? 0) + 1 }, 201, h);
    }

    return json({ error: 'method' }, 405, h);
  },
};
