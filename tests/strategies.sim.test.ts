/**
 * Porównanie strategii: ten sam „chciwy” bot z różnymi trikami. Trik, który daje nieproporcjonalnie dużo,
 * zwykle oznacza dziurę w zasadach. Uruchomienie: npm run sim
 */
import { it } from 'vitest';
import { CITIES, GOODS, MED, RX, V } from '../src/game/data';
import { canSellVehicle, newGame, priceOf, rxLeft, score, teleStatus, travelCost, used, visitedToday } from '../src/game/engine';
import { act, type Act } from '../src/game/replay';
import type { CityId, Diff, GameState, VehicleId } from '../src/game/types';

interface Opts { dodge?: boolean; pharm?: boolean; bank?: boolean; van?: boolean; bribe?: boolean }
function bot(diff: Diff, seed: number, o: Opts): number {
  let s = { ...newGame(diff, seed), tut: 4 };
  const go = (a: Act) => { s = act(s, a).s; };
  while (!s.over) {
    if (s.pending?.kind === 'police') { go(o.bribe && s.cash >= s.pending.bribeC ? ['p', 'bribe'] : ['p', 'dump']); continue; }
    if (s.pending?.kind === 'robbery') { go(['r', 'give']); continue; }
    if (o.bank) go(['w', 1e12]);
    for (const g of [...GOODS.map((x) => x.id), MED.id] as const) if (s.inv[g]) go(['t', g, 'sell', s.inv[g]!.qty, 'street']);
    if (s.debt > 0 && s.cash > s.debt + 500) go(['rp', s.debt]);
    if (s.day >= s.maxDays) { go(['f']); break; }
    if (o.van) for (const v of ['van', 'car', 'scooter'] as VehicleId[]) if (s.vehicle !== v && s.cash > V[v].price * 2) { go(['bv', v]); break; }
    if (o.pharm && s.rxUnlocked) {
      if (!visitedToday(s) && C(s.city).clinic && s.cash > 3000) go(['c']);
      else if (teleStatus(s) === 'ok' && s.cash > 3000) go(['tr']);
      if (rxLeft(s) > 0 && s.pharm[s.city].stock) go(['t', MED.id, 'buy', Math.min(rxLeft(s), s.cap - used(s), Math.floor((s.cash - 500) / s.pharm[s.city].price)), 'pharm']);
    }
    let best: { g: (typeof GOODS)[number]['id']; to: CityId; r: number } | null = null;
    for (const c of CITIES) if (c.id !== s.city) for (const g of GOODS) {
      const r = s.prices[c.id][g.id] / priceOf(s, g.id);
      if (!best || r > best.r) best = { g: g.id, to: c.id, r };
    }
    const n = Math.max(0, Math.min(s.cap - used(s), Math.floor((s.cash - 600) / priceOf(s, best!.g))));
    if (n > 0 && best!.r > 1.15) go(['t', best!.g, 'buy', n, 'street']);
    const ticket = travelCost(s, best!.to);
    const dodge = !V[s.vehicle].fuel && (o.dodge || s.cash < ticket.cost);
    if (o.bank) go(['d', Math.max(0, s.cash - ticket.cost - 50)]);
    const day = s.day;
    go(['v', best!.to, dodge]);
    if (s.day === day) { go(['bt', best!.to]); if (s.day === day) go(['f']); }
  }
  void canSellVehicle;
  return score(s);
}
const C = (id: CityId) => CITIES.find((c) => c.id === id)!;

it('strategie', () => {
  const variants: [string, Opts][] = [
    ['bazowa', {}], ['zawsze na gapę', { dodge: true }], ['apteka codziennie', { pharm: true }],
    ['bank na noc', { bank: true }], ['dostawczak', { van: true }], ['łapówki', { bribe: true }],
    ['wszystko naraz', { pharm: true, bank: true, van: true, bribe: true }],
  ];
  for (const diff of ['normal', 'hard'] as Diff[]) for (const [name, o] of variants) {
    const sc = Array.from({ length: 300 }, (_, i) => bot(diff, 1000 + i, o)).sort((a, b) => a - b);
    const q = (p: number) => sc[Math.floor(p * (sc.length - 1))].toLocaleString('pl-PL');
    console.log(`${diff.padEnd(6)} ${name.padEnd(18)} mediana ${q(0.5).padStart(12)} | p90 ${q(0.9).padStart(12)} | max ${q(1).padStart(13)}`);
  }
  void RX;
}, 600_000);
