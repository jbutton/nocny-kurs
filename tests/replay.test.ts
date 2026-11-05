import { describe, expect, it } from 'vitest';
import { score } from '../src/game/engine';
import { cleanNick, isBadNick } from '../src/game/leaderboard';
import { act, probe, replay, validClientActs, verifyRun, type Act } from '../src/game/replay';
import { rankedAct, stepLog } from '../src/game/run';
import { newGame } from '../src/game/engine';
import type { GameState } from '../src/game/types';

/** Rozgrywa krótką grę „po ludzku” przez act() i zwraca stan */
function playGame(seed: number): GameState {
  let s = newGame('normal', seed);
  const go = (a: Act) => { s = act(s, a).s; };
  go(['t', 'weed', 'buy', 10, 'street']); // samouczek: tania marihuana
  go(['v', 'krk', false]);
  go(['t', 'weed', 'sell', 10, 'street']);
  go(['rp', 1000]);
  for (let i = 0; i < 40 && !s.over && s.day < s.maxDays; i++) {
    if (s.pending?.kind === 'police') go(['p', 'dump']);
    if (s.pending?.kind === 'robbery') go(['r', 'give']);
    go(['v', s.city === 'krk' ? 'kat' : 'krk', s.cash < 150]);
  }
  if (s.pending?.kind === 'police') go(['p', 'dump']);
  if (s.pending?.kind === 'robbery') go(['r', 'give']);
  go(['b', 20000]);
  go(['f']);
  return s;
}

describe('dziennik ruchów i odtwarzanie', () => {
  it('odtworzenie daje identyczny stan', () => {
    const s = playGame(123);
    expect(s.over).toBe(true);
    const r = replay('normal', 123, s.log);
    expect(r.ok).toBe(true);
    expect(score(r.s)).toBe(score(s));
    expect(r.s.day).toBe(s.day);
  });
  it('ruch bez efektu nie trafia do dziennika', () => {
    const s = newGame('normal', 1);
    expect(act(s, ['t', 'weed', 'sell', 5, 'street']).s.log).toHaveLength(0);
  });
  it('gra offline (bez losowości od serwera) nie przechodzi weryfikacji rankingowej', () => {
    const s = playGame(7);
    expect(replay('normal', 7, s.log).ok).toBe(true);
    expect(verifyRun('normal', 7, s.log)).toEqual({ ok: false, reason: 'replay' });
  });
  it('filtr ruchów od gracza: bez losowości i dziwnych danych', () => {
    expect(validClientActs([['t', 'weed', 'buy', 5, 'street'], ['v', 'krk', false]])).toBe(true);
    expect(validClientActs([['e', 123]])).toBe(false);
    expect(validClientActs([['x']])).toBe(false);
    expect(validClientActs([['t', { a: 1 }]])).toBe(false);
    expect(validClientActs('nope')).toBe(false);
  });
  it('rozpoznaje ruchy z losowaniem', () => {
    const s = newGame('normal', 1);
    expect(probe(s, ['t', 'weed', 'buy', 5, 'street'])).toBe('plain');
    expect(probe(s, ['v', 'krk', false])).toBe('random');
    expect(probe(s, ['t', 'weed', 'sell', 5, 'street'])).toBe('noop');
  });
  it('serwer: ponowienie tej samej prośby daje tę samą losowość, inna długość dziennika = konflikt', () => {
    const a: Act[] = [['t', 'weed', 'buy', 5, 'street'], ['v', 'krk', false]];
    const r1 = stepLog([], 0, a, 42);
    if (!r1.ok) throw new Error();
    expect(r1.log).toEqual([a[0], ['e', 42], a[1]]);
    expect(stepLog(r1.log, 0, a, 99)).toEqual({ ok: true, log: r1.log, n: 42, fresh: false });
    expect(stepLog(r1.log, 1, a, 99).ok).toBe(false);
    expect(stepLog(r1.log, 0, [['v', 'gda', false]], 99).ok).toBe(false);
  });

  /** Gra rankingowa z udawanym serwerem (ta sama logika co w Workerze) */
  function rankedGame(seed: number, rolls: () => number) {
    let server: Act[] = [];
    const step = async (_id: string, at: number, acts: Act[]) => {
      const r = stepLog(server, at, acts, rolls());
      if (!r.ok) throw new Error('conflict');
      server = r.log;
      return r.n;
    };
    return { step, get server() { return server; }, s: { ...newGame('normal', seed), run: { id: 'x', synced: 0 } } as GameState };
  }
  async function playRanked(seed: number, rolls: () => number) {
    const G = rankedGame(seed, rolls);
    let s = G.s;
    const go = async (a: Act) => { s = (await rankedAct(s, a, G.step)).s; };
    await go(['t', 'weed', 'buy', 10, 'street']);
    await go(['v', 'krk', false]);
    await go(['t', 'weed', 'sell', 10, 'street']);
    for (let i = 0; i < 40 && !s.over && s.day < s.maxDays; i++) {
      if (s.pending?.kind === 'police') await go(['p', 'dump']);
      if (s.pending?.kind === 'robbery') await go(['r', 'give']);
      await go(['t', 'speed', 'buy', 3, 'street']);
      await go(['v', s.city === 'krk' ? 'kat' : 'krk', s.cash < 150]);
      await go(['t', 'speed', 'sell', 3, 'street']);
    }
    if (s.pending?.kind === 'police') await go(['p', 'dump']);
    if (s.pending?.kind === 'robbery') await go(['r', 'give']);
    await go(['f']);
    return { s, server: G.server };
  }

  it('gra rankingowa: serwer ma ten sam dziennik i sam liczy ten sam wynik', async () => {
    let k = 1;
    const { s, server } = await playRanked(5, () => (k = Math.imul(k, 48271) | 0));
    expect(s.over).toBe(true);
    expect(s.log.slice(0, server.length)).toEqual(server);
    const full = [...server, ...s.log.slice(s.run!.synced)];
    expect(full).toEqual(s.log);
    const v = verifyRun('normal', 5, full);
    if (score(s) > 0) expect(v).toEqual({ ok: true, score: score(s) });
    // podmieniona losowość (gracz „wybiera” korzystne rzuty) psuje odtworzenie albo wynik
    const forged = full.map((a) => (a[0] === 'e' ? (['e', (a[1] as number) + 1] as Act) : a));
    const fv = verifyRun('normal', 5, forged);
    expect(fv.ok && v.ok && fv.score === v.score).toBe(false);
  });
  it('ruch z losowaniem ukryty wśród zwykłych ruchów (bez losowości od serwera) = odrzucenie', () => {
    const r = stepLog([], 0, [['t', 'weed', 'buy', 10, 'street'], ['v', 'krk', false], ['v', 'kat', false]], 7);
    if (!r.ok) throw new Error();
    const after = replay('normal', 3, r.log, false);
    expect(after.ok).toBe(true);
    expect(replay('normal', 3, r.log, true).ok).toBe(false);
  });
  it('znając seed i kod nie da się przewidzieć jutra: wynik podróży zależy od losowości z serwera', () => {
    const s = act(newGame('normal', 11), ['t', 'weed', 'buy', 10, 'street']).s;
    const predicted = act(s, ['v', 'krk', false]).s.prices; // „przewidywanie” bez losowości z serwera
    const real = (n: number) => act(act(s, ['e', n]).s, ['v', 'krk', false]).s.prices;
    expect(real(1)).not.toEqual(predicted);
    expect(real(1)).not.toEqual(real(2));
    expect(real(1)).toEqual(real(1));
  });
  it('filtr nicków', () => {
    expect(isBadNick('Ku.rw4')).toBe(true);
    expect(cleanNick('  Fast   Eddie ', 'Anon')).toBe('Fast Eddie');
    expect(cleanNick('chuj123', 'Anon')).toBe('Anon');
    expect(cleanNick('Zbyszek z Łodzi', 'Anon')).toBe('Zbyszek z Łodzi');
  });
});
