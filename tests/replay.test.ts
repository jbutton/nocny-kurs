import { describe, expect, it } from 'vitest';
import { score } from '../src/game/engine';
import { cleanNick, isBadNick } from '../src/game/leaderboard';
import { act, replay, verify, type Act } from '../src/game/replay';
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
  it('weryfikacja: poprawne zgłoszenie przechodzi, zmanipulowane nie', () => {
    const s = playGame(7);
    const good = { name: 'Zbyszek', diff: 'normal', seed: 7, log: s.log };
    const v = verify(good, (n) => cleanNick(n, 'Anon'));
    if (score(s) > 0) expect(v).toEqual({ ok: true, score: score(s), name: 'Zbyszek' });
    else expect(v.ok).toBe(false);
    // inny seed = inna gra → ruchy przestają pasować albo wynik się nie zgadza
    const forged = verify({ ...good, seed: 8 }, (n) => n);
    expect(forged.ok && forged.score === score(s)).toBe(false);
    expect(verify({ ...good, log: s.log.slice(0, -1) }, (n) => n)).toEqual({ ok: false, reason: 'unfinished' });
    expect(verify({ ...good, diff: 'insane' }, (n) => n).ok).toBe(false);
    expect(verify({ ...good, log: [['t', 'weed', 'buy', 999999, 'street']] }, (n) => n)).toEqual({ ok: false, reason: 'replay' });
  });
  it('filtr nicków', () => {
    expect(isBadNick('Ku.rw4')).toBe(true);
    expect(cleanNick('  Fast   Eddie ', 'Anon')).toBe('Fast Eddie');
    expect(cleanNick('chuj123', 'Anon')).toBe('Anon');
    expect(cleanNick('Zbyszek z Łodzi', 'Anon')).toBe('Zbyszek z Łodzi');
  });
});
