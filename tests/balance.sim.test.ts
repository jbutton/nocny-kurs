/**
 * Symulacja balansu: bot gra tysiące gier prostą strategią i wypisuje statystyki.
 * Uruchomienie: npm run sim
 */
import { it } from 'vitest';
import { CITIES, GOODS } from '../src/game/data';
import {
  finish, newGame, rating, repay, resolvePolice, resolveRobbery, score, trade, tradeLimits, travel, used,
} from '../src/game/engine';
import type { Diff, GameState, GoodId } from '../src/game/types';

interface Stats { score: number; bankrupt: boolean; police: number; robbery: number; peak: number; debtFreeDay: number }

function play(diff: Diff, seed: number, cautious: boolean): Stats {
  let s: GameState = { ...newGame(diff, seed), tut: 4 };
  const st: Stats = { score: 0, bankrupt: false, police: 0, robbery: 0, peak: 0, debtFreeDay: 0 };
  while (!s.over) {
    // sprzedaj wszystko, co jest tu „normalnie” albo „drogo” i z zyskiem
    for (const g of GOODS) {
      const h = s.inv[g.id];
      if (h && s.prices[s.city][g.id] > h.avg && rating(g.id, s.prices[s.city][g.id]) !== 'cheap') s = trade(s, g.id, 'sell', h.qty).s;
    }
    // ostatni dzień: sprzedaj wszystko, spłać i zakończ
    if (s.day === s.maxDays) {
      for (const g of GOODS) { const h = s.inv[g.id]; if (h) s = trade(s, g.id, 'sell', h.qty).s; }
      s = repay(s).s;
      s = finish(s).s;
      break;
    }
    // spłać dług, gdy stać na to z zapasem
    if (s.debt > 0 && s.cash > s.debt * (cautious ? 1.2 : 2.5)) s = repay(s).s;
    if (!st.debtFreeDay && s.debt === 0) st.debtFreeDay = s.day;
    // kup najtańszy względnie towar za większość gotówki (zostaw na bilet)
    const cheap = GOODS.map((g) => ({ id: g.id as GoodId, r: s.prices[s.city][g.id] / ((g.min + g.max) / 2) }))
      .filter((x) => rating(x.id, s.prices[s.city][x.id]) === 'cheap').sort((a, b) => a.r - b.r)[0];
    if (cheap) {
      const keep = 150;
      const p = s.prices[s.city][cheap.id];
      const n = Math.min(tradeLimits(s, cheap.id, 'street').maxBuy, Math.floor((s.cash - keep) / p));
      if (n > 0) s = trade(s, cheap.id, 'buy', n).s;
    }
    // jedź do losowego innego miasta
    const others = CITIES.filter((c) => c.id !== s.city);
    const to = others[(seed + s.day * 7) % others.length].id;
    const r = travel(s, to, s.cash < 150);
    s = r.s;
    if (s.pending?.kind === 'police') { st.police++; s = resolvePolice(s, used(s) > 40 && s.cash > s.pending.bribeC ? 'bribe' : 'run').s; }
    if (s.pending?.kind === 'robbery') { st.robbery++; s = resolveRobbery(s, 'run').s; }
    st.peak = Math.max(st.peak, score(s));
    if (r.fx.some((f) => f.t === 'end')) st.bankrupt = true;
  }
  st.score = score(s);
  return st;
}

const pct = (arr: number[], p: number) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];

it('balans: statystyki', () => {
  const N = 2000;
  for (const diff of ['easy', 'normal', 'hard'] as Diff[]) {
    const runs = Array.from({ length: N }, (_, i) => play(diff, i * 7919 + 1, true));
    const scores = runs.map((r) => r.score).sort((a, b) => a - b);
    const won = runs.filter((r) => r.score > 0).length;
    const avg = (f: (r: Stats) => number) => (runs.reduce((a, r) => a + f(r), 0) / N).toFixed(1);
    console.log(
      `${diff.padEnd(6)} | wygrane (wynik>0): ${((100 * won) / N).toFixed(0)}% | bankructwa: ${((100 * runs.filter((r) => r.bankrupt).length) / N).toFixed(1)}%` +
        ` | wynik p10/p50/p90: ${pct(scores, 0.1)} / ${pct(scores, 0.5)} / ${pct(scores, 0.9)}` +
        ` | kontrole/grę: ${avg((r) => r.police)} | napady/grę: ${avg((r) => r.robbery)}` +
        ` | dług spłacony do dnia (mediana): ${pct(runs.map((r) => r.debtFreeDay || 99).sort((a, b) => a - b), 0.5)}`,
    );
  }
}, 120000);
