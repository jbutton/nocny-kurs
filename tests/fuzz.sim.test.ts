/**
 * Fuzzer zasad: tysiące gier z losowymi (także bezsensownymi) ruchami. Po każdym ruchu sprawdzamy,
 * czy stan jest możliwy, a na końcu — czy odtworzenie z dziennika daje identyczną grę.
 * Uruchomienie: npm run sim
 */
import { describe, expect, it } from 'vitest';
import { CITIES, GOODS, VEHICLES, WEAPONS } from '../src/game/data';
import { newGame, used } from '../src/game/engine';
import { act, replay, type Act } from '../src/game/replay';
import { rng } from '../src/game/rng';
import type { Diff, GameState } from '../src/game/types';

function problems(s: GameState): string[] {
  const p: string[] = [];
  const int0 = (n: number, k: string) => { if (!Number.isInteger(n) || n < 0) p.push(`${k}=${n}`); };
  int0(s.cash, 'cash'); int0(s.bank, 'bank'); int0(s.debt, 'debt');
  if (!(s.heat >= 0 && s.heat <= 100)) p.push(`heat=${s.heat}`);
  if (!(s.day >= 1 && s.day <= s.maxDays)) p.push(`day=${s.day}`);
  for (const [k, h] of Object.entries(s.inv)) if (!h || !Number.isInteger(h.qty) || h.qty <= 0 || !Number.isFinite(h.avg)) p.push(`inv.${k}=${JSON.stringify(h)}`);
  if (used(s) > s.cap) p.push(`used ${used(s)} > cap ${s.cap}`);
  for (const c of CITIES) for (const g of GOODS) { const x = s.prices[c.id][g.id]; if (!Number.isInteger(x) || x <= 0) p.push(`price ${c.id}.${g.id}=${x}`); }
  if (s.rx && (s.rx.used > s.rx.limit || s.rx.used < 0)) p.push(`rx ${JSON.stringify(s.rx)}`);
  if (s.pending && s.over) p.push('pending+over');
  if (new Set(s.weapons).size !== s.weapons.length) p.push('weapons dup');
  return p;
}

const ITEMS = [...GOODS.map((g) => g.id), 'medweed', 'gold'];
function randomAct(r: { seed: number }, s: GameState): Act {
  const pick = <T>(a: readonly T[]) => a[Math.floor(rng(r) * a.length)];
  const num = () => pick([0, 1, 5, 50, 101, 700, 1e9, -3, 2.5, Math.floor(rng(r) * 400)]);
  if (s.pending) return s.pending.kind === 'police' ? ['p', pick(['run', 'dump', 'bribe', 'bluff'] as const)] : ['r', pick(['give', 'run', 'fight'] as const)];
  const k = rng(r);
  if (k < 0.35) return ['t', pick(ITEMS), pick(['buy', 'sell']), num(), pick(['street', 'street', 'pharm'])] as Act;
  if (k < 0.55) return ['v', pick(CITIES).id, rng(r) < 0.3];
  if (k < 0.58) return ['bt', pick(CITIES).id];
  const rest: Act[] = [
    ['c'], ['tr'], ['rp', num()], ['b', num()], ['d', num()], ['w', num()], ['bv', pick(VEHICLES).id], ['sv'],
    ['bw', pick(WEAPONS).id], ['sk'], ['f'],
  ];
  const a = pick(rest);
  return a[0] === 'f' && rng(r) < 0.9 ? ['sk'] : a; // kończymy rzadko, żeby gry trwały
}

describe('fuzzer zasad', () => {
  it('losowe ruchy nigdy nie dają niemożliwego stanu, a odtworzenie zgadza się co do złotówki', () => {
    const bad: string[] = [];
    let moves = 0, ends = 0;
    for (let g = 0; g < 3000 && bad.length < 10; g++) {
      const diff = (['easy', 'normal', 'hard'] as Diff[])[g % 3];
      let s = newGame(diff, g * 7919);
      const r = { seed: g };
      for (let i = 0; i < 600 && !s.over; i++) {
        const a = randomAct(r, s);
        let o;
        try { o = act(s, a); } catch (e) { bad.push(`gra ${g}: wyjątek po ${JSON.stringify(a)}: ${(e as Error).message}`); break; }
        const p = problems(o.s);
        if (p.length) { bad.push(`gra ${g}, ruch ${JSON.stringify(a)}: ${p.join(', ')}`); break; }
        if (o.s !== s) moves++;
        s = o.s;
      }
      if (s.over) ends++;
      const re = replay(diff, g * 7919, s.log);
      if (!re.ok || JSON.stringify({ ...re.s, log: 0 }) !== JSON.stringify({ ...s, log: 0 })) bad.push(`gra ${g}: odtworzenie się nie zgadza`);
    }
    console.log(`fuzzer: ${moves} ruchów, ${ends} gier zakończonych`);
    expect(bad).toEqual([]);
  }, 300_000);
});
