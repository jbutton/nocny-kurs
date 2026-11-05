/**
 * API rankingu online „Nocny Kurs / Night Run” (Cloudflare Worker + D1).
 *
 *   GET  /api/scores?diff=normal&limit=20     → top wyników
 *   POST /api/runs {diff}                     → nowa gra rankingowa: {id, seed}
 *   POST /api/runs/:id/step {at, acts}        → zapisuje ruchy gracza (ostatni losuje) i zwraca losowość {n}
 *   POST /api/runs/:id/finish {at, acts, name} → serwer odtwarza swój dziennik, sam liczy wynik i zapisuje go
 *
 * Losowość wydajemy dopiero po zapisaniu decyzji, więc znając kod i seed nie da się przewidzieć gry
 * (szczegóły: src/game/run.ts). Nie zapisujemy adresów IP ani danych osobowych — tylko nick, wynik, poziom i datę.
 */
import { cleanNick } from '../../src/game/leaderboard';
import { DIFFS, MAX_LOG, validClientActs, verifyRun, type Act } from '../../src/game/replay';
import { stepLog } from '../../src/game/run';
import type { Diff } from '../../src/game/types';

interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
}
interface RunRow { id: string; diff: Diff; seed: number; log: string; len: number; score_id: number | null }

const MAX_BODY = 256 * 1024;
/** Porzucone gry kasujemy po tylu dniach bez ruchu */
const STALE_DAYS = 14;

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
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });

const rand32 = () => crypto.getRandomValues(new Int32Array(1))[0];

async function top(env: Env, diff: string, limit: number) {
  const { results } = await env.DB.prepare(
    'SELECT id, name, score, diff, substr(created_at, 1, 10) AS date FROM scores WHERE diff = ? ORDER BY score DESC, id ASC LIMIT ?',
  ).bind(diff, limit).all();
  return results;
}
async function placeOf(env: Env, diff: string, score: number, id: number) {
  const better = await env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE diff = ? AND (score > ? OR (score = ? AND id < ?))')
    .bind(diff, score, score, id).first<{ n: number }>();
  return (better?.n ?? 0) + 1;
}

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  const raw = await req.text();
  if (raw.length > MAX_BODY) return null;
  try {
    const b = JSON.parse(raw) as unknown;
    return b && typeof b === 'object' ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });

    if (url.pathname === '/api/scores' && req.method === 'GET') {
      const diff = url.searchParams.get('diff') ?? 'normal';
      if (!DIFFS.includes(diff as Diff)) return json({ error: 'diff' }, 400, h);
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 20));
      return json({ scores: await top(env, diff, limit) }, 200, h);
    }

    if (url.pathname === '/api/runs' && req.method === 'POST') {
      const b = await readBody(req);
      if (!b || !DIFFS.includes(b.diff as Diff)) return json({ error: 'diff' }, 400, h);
      const id = crypto.randomUUID();
      const seed = rand32();
      await env.DB.batch([
        env.DB.prepare("DELETE FROM runs WHERE score_id IS NULL AND updated_at < strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ?)").bind(`-${STALE_DAYS} days`),
        env.DB.prepare('INSERT INTO runs (id, diff, seed) VALUES (?, ?, ?)').bind(id, b.diff, seed),
      ]);
      return json({ id, seed }, 201, h);
    }

    const m = url.pathname.match(/^\/api\/runs\/([0-9a-f-]{36})\/(step|finish)$/);
    if (m && req.method === 'POST') {
      const b = await readBody(req);
      if (!b) return json({ error: 'format' }, 400, h);
      const at = b.at;
      if (typeof at !== 'number' || !Number.isInteger(at) || !validClientActs(b.acts)) return json({ error: 'format' }, 400, h);
      const acts = b.acts as Act[];
      const run = await env.DB.prepare('SELECT id, diff, seed, log, len, score_id FROM runs WHERE id = ?').bind(m[1]).first<RunRow>();
      if (!run) return json({ error: 'no_run' }, 404, h);
      const log = JSON.parse(run.log) as Act[];

      if (m[2] === 'step') {
        if (run.score_id !== null) return json({ error: 'finished' }, 409, h);
        const r = stepLog(log, at, acts, rand32());
        if (!r.ok) return json({ error: 'conflict', at: run.len }, 409, h);
        if (r.log.length > MAX_LOG) return json({ error: 'log' }, 422, h);
        if (r.fresh) {
          // warunek na `len` chroni przed dwiema równoległymi prośbami (np. dwie karty z tą samą grą)
          const up = await env.DB.prepare("UPDATE runs SET log = ?, len = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ? AND len = ?")
            .bind(JSON.stringify(r.log), r.log.length, run.id, run.len).run();
          if (!up.meta.changes) return json({ error: 'conflict' }, 409, h);
        }
        return json({ n: r.n }, 200, h);
      }

      // finish
      if (typeof b.name !== 'string') return json({ error: 'name' }, 400, h);
      if (run.score_id !== null) {
        // ponowione zgłoszenie tej samej gry: oddajemy zapisany wynik
        const sc = await env.DB.prepare('SELECT id, name, score FROM scores WHERE id = ?').bind(run.score_id).first<{ id: number; name: string; score: number }>();
        if (!sc) return json({ error: 'finished' }, 409, h);
        return json({ ...sc, place: await placeOf(env, run.diff, sc.score, sc.id) }, 200, h);
      }
      if (at !== log.length) return json({ error: 'conflict', at: run.len }, 409, h);
      const full = [...log, ...acts];
      if (full.length > MAX_LOG) return json({ error: 'log' }, 422, h);
      const v = verifyRun(run.diff, run.seed, full);
      if (!v.ok) return json({ error: v.reason }, 422, h);
      const name = cleanNick(b.name, 'Anonim');
      const ins = await env.DB.prepare('INSERT OR IGNORE INTO scores (name, diff, score, seed) VALUES (?, ?, ?, ?)')
        .bind(name, run.diff, v.score, run.seed).run();
      if (!ins.meta.changes) return json({ error: 'duplicate' }, 409, h);
      const id = ins.meta.last_row_id;
      await env.DB.prepare("UPDATE runs SET log = ?, len = ?, score_id = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?")
        .bind(JSON.stringify(full), full.length, id, run.id).run();
      return json({ id, score: v.score, name, place: await placeOf(env, run.diff, v.score, id) }, 201, h);
    }

    return json({ error: 'not_found' }, 404, h);
  },
};
