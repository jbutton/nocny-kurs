/**
 * Dziennik ruchów i odtwarzanie gry.
 *
 * Każdy ruch gracza przechodzi przez `act()`, który wykonuje go w silniku i dopisuje do `s.log`.
 * Silnik jest deterministyczny (seed w stanie), więc `seed + poziom + lista ruchów` jednoznacznie
 * wyznacza przebieg gry. Serwer rankingu odtwarza grę z tych danych i sam liczy wynik —
 * wysłanie spreparowanego wyniku nic nie daje.
 */
import * as E from './engine';
import type {
  CityId, Diff, GameState, ItemId, Outcome, PoliceChoice, RobberyChoice, Src, TradeMode, VehicleId, WeaponId,
} from './types';

export type Act =
  | ['t', ItemId, TradeMode, number, Src] // handel
  | ['v', CityId, boolean] // podróż (dodge = na gapę)
  | ['bt', CityId] // pożycz na paliwo i jedź
  | ['f'] // zakończ grę
  | ['p', PoliceChoice] // kontrola policji
  | ['r', RobberyChoice] // napad
  | ['c'] // wizyta w klinice
  | ['tr'] // teleporada
  | ['rp', number] // spłata długu
  | ['b', number] // pożyczka
  | ['d', number] // wpłata do banku
  | ['w', number] // wypłata z banku
  | ['bv', VehicleId] // kup pojazd
  | ['sv'] // sprzedaj pojazd
  | ['bw', WeaponId] // kup ochronę
  | ['sk']; // pomiń samouczek

/** Kwoty w dzienniku muszą być skończonymi liczbami (JSON nie zapisze Infinity) */
const amt = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 1e12);

function run(s: GameState, a: Act): Outcome {
  switch (a[0]) {
    case 't': return E.trade(s, a[1], a[2], a[3], a[4]);
    case 'v': return E.travel(s, a[1], a[2]);
    case 'bt': return E.borrowAndTravel(s, a[1]);
    case 'f': return E.finish(s);
    case 'p': return E.resolvePolice(s, a[1]);
    case 'r': return E.resolveRobbery(s, a[1]);
    case 'c': return E.clinicVisit(s);
    case 'tr': return E.teleRenew(s);
    case 'rp': return E.repay(s, a[1]);
    case 'b': return E.borrow(s, a[1]);
    case 'd': return E.deposit(s, a[1]);
    case 'w': return E.withdraw(s, a[1]);
    case 'bv': return E.buyVehicle(s, a[1]);
    case 'sv': return E.sellVehicle(s);
    case 'bw': return E.buyWeapon(s, a[1]);
    case 'sk': return { s: s.tut >= 4 ? s : E.skipTutorial(s), fx: [] };
  }
}

/** Wykonuje ruch i — jeśli coś zmienił — dopisuje go do dziennika */
export function act(s: GameState, a: Act): Outcome {
  const norm = (['rp', 'b', 'd', 'w'].includes(a[0]) ? [a[0], amt(a[1] as number)] : a) as Act;
  const o = run(s, norm);
  if (o.s === s) return o;
  return { s: { ...o.s, log: [...(s.log ?? []), norm] }, fx: o.fx };
}

/** Odtwarza grę od zera. Ruch, który niczego nie zmienia, oznacza niezgodny dziennik. */
export function replay(diff: Diff, seed: number, log: Act[]): { s: GameState; ok: boolean } {
  let s = E.newGame(diff, seed);
  for (const a of log) {
    const o = act(s, a);
    if (o.s === s) return { s, ok: false };
    s = o.s;
  }
  return { s, ok: true };
}

// ---------------------------------------------------------------- weryfikacja zgłoszenia do rankingu
export interface Submission { name: string; diff: Diff; seed: number; log: Act[] }
export type Verdict = { ok: true; score: number; name: string } | { ok: false; reason: string };

const DIFFS: Diff[] = ['easy', 'normal', 'hard'];
export const MAX_LOG = 5000;

/** Sprawdza zgłoszenie: format, odtworzenie gry, zakończenie i dodatni wynik */
export function verify(body: unknown, cleanName: (raw: string) => string): Verdict {
  const b = body as Partial<Submission>;
  if (!b || typeof b !== 'object') return { ok: false, reason: 'format' };
  if (!DIFFS.includes(b.diff as Diff)) return { ok: false, reason: 'diff' };
  if (typeof b.seed !== 'number' || !Number.isInteger(b.seed)) return { ok: false, reason: 'seed' };
  if (!Array.isArray(b.log) || b.log.length === 0 || b.log.length > MAX_LOG) return { ok: false, reason: 'log' };
  if (typeof b.name !== 'string') return { ok: false, reason: 'name' };
  let r: ReturnType<typeof replay>;
  try {
    r = replay(b.diff as Diff, b.seed, b.log as Act[]);
  } catch {
    return { ok: false, reason: 'replay' };
  }
  if (!r.ok) return { ok: false, reason: 'replay' };
  if (!r.s.over) return { ok: false, reason: 'unfinished' };
  const sc = E.score(r.s);
  if (sc <= 0) return { ok: false, reason: 'score' };
  return { ok: true, score: sc, name: cleanName(b.name) };
}
