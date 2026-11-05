/**
 * Test protokołu gry rankingowej na działającym API (lokalnie: `npm run api:dev`).
 * Uruchomienie: API_URL=http://localhost:8787 npx vitest run tests/online.test.ts
 */
import { describe, expect, it } from 'vitest';
import { CITIES, GOODS } from '../src/game/data';
import { priceOf, score, used } from '../src/game/engine';
import { act, type Act } from '../src/game/replay';
import { rankedAct } from '../src/game/run';
import { newGame } from '../src/game/engine';
import type { CityId, GameState } from '../src/game/types';

const API = process.env.API_URL ?? '';
const post = async (path: string, body: unknown) => {
  const r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, data: await r.json() as Record<string, unknown> };
};
const step = async (id: string, at: number, acts: Act[]) => {
  const r = await post(`/api/runs/${id}/step`, { at, acts });
  if (r.status !== 200) throw new Error(String(r.data.error));
  return r.data.n as number;
};

/** Prosty bot: kupuje towar o największej przebitce między miastami (ceny wszystkich miast są jawne) */
async function playBot(diff: 'normal'): Promise<{ s: GameState; id: string }> {
  const { data } = await post('/api/runs', { diff });
  const id = data.id as string;
  let s: GameState = { ...newGame(diff, data.seed as number), run: { id, synced: 0 } };
  const go = async (a: Act) => { s = (await rankedAct(s, a, step)).s; };
  await go(['sk']);
  while (!s.over && s.day < s.maxDays) {
    if (s.pending?.kind === 'police') { await go(['p', 'dump']); continue; }
    if (s.pending?.kind === 'robbery') { await go(['r', 'give']); continue; }
    for (const g of GOODS) if (s.inv[g.id]) await go(['t', g.id, 'sell', s.inv[g.id]!.qty, 'street']);
    if (s.debt > 0 && s.cash > s.debt + 500) await go(['rp', s.debt]);
    let best: { g: (typeof GOODS)[number]['id']; to: CityId; r: number } | null = null;
    for (const c of CITIES) if (c.id !== s.city) for (const g of GOODS) {
      const r = s.prices[c.id][g.id] / priceOf(s, g.id);
      if (!best || r > best.r) best = { g: g.id, to: c.id, r };
    }
    const keep = 400;
    const n = Math.max(0, Math.min(s.cap - used(s), Math.floor((s.cash - keep) / priceOf(s, best!.g))));
    if (n > 0) await go(['t', best!.g, 'buy', n, 'street']);
    const before = s.day;
    await go(['v', best!.to, false]);
    if (s.day === before) await go(['v', best!.to, true]);
  }
  if (s.pending?.kind === 'police') await go(['p', 'dump']);
  if (s.pending?.kind === 'robbery') await go(['r', 'give']);
  for (const g of GOODS) if (s.inv[g.id]) await go(['t', g.id, 'sell', s.inv[g.id]!.qty, 'street']);
  if (s.debt > 0 && s.cash > 0) await go(['rp', s.debt]);
  await go(['f']);
  return { s, id };
}

describe.skipIf(!API)('ranking online: gra z losowością od serwera', () => {
  it('pełna gra: serwer liczy ten sam wynik; drugie zgłoszenie oddaje ten sam wpis', async () => {
    const { s, id } = await playBot('normal');
    expect(s.over).toBe(true);
    expect(score(s)).toBeGreaterThan(0);
    const run = s.run!;
    const body = { at: run.synced, acts: s.log.slice(run.synced), name: 'Test Bot' };
    const r = await post(`/api/runs/${id}/finish`, body);
    expect(r.status).toBe(201);
    expect(r.data.score).toBe(score(s));
    const again = await post(`/api/runs/${id}/finish`, body);
    expect(again.status).toBe(200);
    expect(again.data.id).toBe(r.data.id);
    // po zakończeniu nie da się już dopisywać ruchów
    expect((await post(`/api/runs/${id}/step`, { at: s.log.length, acts: [['v', 'krk', false]] })).status).toBe(409);
  }, 60_000);

  it('oszustwa: własna losowość, ruch losowy bez serwera, podrobiony wynik', async () => {
    const { data } = await post('/api/runs', { diff: 'normal' });
    const id = data.id as string;
    // gracz nie może sam wstawić losowości
    expect((await post(`/api/runs/${id}/step`, { at: 0, acts: [['e', 5], ['v', 'krk', false]] })).status).toBe(400);
    // zła długość dziennika = konflikt
    expect((await post(`/api/runs/${id}/step`, { at: 3, acts: [['v', 'krk', false]] })).status).toBe(409);
    // podróż „przemycona” w zakończeniu gry (losowanie bez serwera) = odrzucenie
    let s = newGame('normal', data.seed as number);
    s = act(s, ['sk']).s;
    s = act(s, ['v', 'krk', false]).s;
    const fin = await post(`/api/runs/${id}/finish`, { at: 0, acts: [...s.log, ['b', 50000], ['f']], name: 'Cheater' });
    expect(fin.status).toBe(422);
    expect(fin.data.error).toBe('replay');
    // stary sposób zgłaszania (seed + dziennik od gracza) już nie istnieje
    expect((await post('/api/scores', { name: 'x', diff: 'normal', seed: 1, log: [] })).status).toBe(404);
  });
});
