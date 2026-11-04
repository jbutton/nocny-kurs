// Generuje e2e/fixtures/day30.json: prawdziwa gra z pełnym dziennikiem ruchów, zatrzymana w ostatnim dniu
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { newGame, score, rating, tradeLimits } from '../src/game/engine';
import { GOODS, CITIES } from '../src/game/data';
import { act, type Act } from '../src/game/replay';
it('fixture', () => {
  for (let seed = 1; seed < 500; seed++) {
    let s = newGame('normal', seed);
    const go = (a: Act) => { s = act(s, a).s; };
    go(['sk']);
    let i = 0;
    while (!s.over && s.day < s.maxDays && i++ < 200) {
      if (s.pending?.kind === 'police') { go(['p', 'dump']); continue; }
      if (s.pending?.kind === 'robbery') { go(['r', 'give']); continue; }
      for (const g of GOODS) { const h = s.inv[g.id]; if (h && s.prices[s.city][g.id] > h.avg) go(['t', g.id, 'sell', h.qty, 'street']); }
      const c = GOODS.find((g) => rating(g.id, s.prices[s.city][g.id]) === 'cheap');
      if (c) { const n = Math.min(tradeLimits(s, c.id, 'street').maxBuy, Math.floor((s.cash - 200) / s.prices[s.city][c.id])); if (n > 0) go(['t', c.id, 'buy', n, 'street']); }
      go(['v', CITIES.filter((x) => x.id !== s.city)[s.day % 7].id, s.cash < 200]);
    }
    if (s.pending) continue;
    for (const g of GOODS) { const h = s.inv[g.id]; if (h) go(['t', g.id, 'sell', h.qty, 'street']); }
    go(['rp', s.cash]);
    if (!s.over && s.day === s.maxDays && score(s) > 0) { writeFileSync('e2e/fixtures/day30.json', JSON.stringify(s)); console.log('seed', seed, score(s)); return; }
  }
});
