/**
 * Dziennik ruchów i odtwarzanie gry.
 *
 * Każdy ruch gracza przechodzi przez `act()`, który wykonuje go w silniku i dopisuje do `s.log`.
 * Silnik jest deterministyczny (seed w stanie), więc `seed + poziom + lista ruchów` jednoznacznie
 * wyznacza przebieg gry. Serwer rankingu odtwarza grę z tych danych i sam liczy wynik —
 * wysłanie spreparowanego wyniku nic nie daje.
 *
 * Gra rankingowa: sam seed nie wystarcza, bo znając go (kod jest publiczny) dałoby się przeliczyć
 * całą przyszłość. Dlatego każdy ruch, w którym silnik losuje (podróż, decyzja przy kontroli,
 * napad…), musi być poprzedzony ruchem `['e', n]` z porcją losowości od serwera. Serwer wydaje `n`
 * dopiero wtedy, gdy zapisze decyzję gracza, więc wyniku nie da się poznać przed wyborem.
 */
import * as E from './engine';
import { mix } from './rng';
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
  | ['sk'] // pomiń samouczek
  | ['e', number]; // losowość od serwera (tylko w grze rankingowej)

/** Kwoty w dzienniku muszą być skończonymi liczbami (JSON nie zapisze Infinity) */
const amt = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 1e12);
const norm = (a: Act): Act => {
  if (['rp', 'b', 'd', 'w'].includes(a[0])) return [a[0], amt(a[1] as number)] as Act;
  if (a[0] === 'e') return ['e', (a[1] as number) | 0];
  return a;
};

const NOOP = (s: GameState): Outcome => ({ s, fx: [] });
function run(s: GameState, a: Act): Outcome {
  // po końcu gry nic się nie zmienia; w trakcie kontroli / napadu można tylko podjąć decyzję
  if (s.over && a[0] !== 'e') return NOOP(s);
  if (s.pending && !['p', 'r', 'e'].includes(a[0])) return NOOP(s);
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
    case 'e': return { s: { ...s, seed: mix(s.seed, a[1]) }, fx: [] };
  }
}

/** Wykonuje ruch i — jeśli coś zmienił — dopisuje go do dziennika */
export function act(s: GameState, a: Act): Outcome {
  const n = norm(a);
  const o = run(s, n);
  if (o.s === s) return o;
  return { s: { ...o.s, log: [...(s.log ?? []), n] }, fx: o.fx };
}

/** Czy ruch coś zmieni i czy silnik coś w nim wylosuje (wtedy w grze rankingowej potrzeba `['e', n]`) */
export function probe(s: GameState, a: Act): 'noop' | 'plain' | 'random' {
  const o = run(s, norm(a));
  if (o.s === s) return 'noop';
  return o.s.seed !== s.seed ? 'random' : 'plain';
}

/**
 * Odtwarza grę od zera. Ruch, który niczego nie zmienia, oznacza niezgodny dziennik.
 * `strict`: każdy ruch, w którym silnik losuje, musi stać bezpośrednio po `['e', n]` (gra rankingowa).
 */
export function replay(diff: Diff, seed: number, log: Act[], strict = false): { s: GameState; ok: boolean } {
  let s = E.newGame(diff, seed);
  let prev: Act | null = null;
  for (const a of log) {
    const o = act(s, a);
    if (o.s === s) return { s, ok: false };
    if (strict && a[0] !== 'e' && o.s.seed !== s.seed && prev?.[0] !== 'e') return { s, ok: false };
    s = o.s;
    prev = a;
  }
  return { s, ok: true };
}

// ---------------------------------------------------------------- weryfikacja gry rankingowej
export type Verdict = { ok: true; score: number } | { ok: false; reason: string };
export const DIFFS: Diff[] = ['easy', 'normal', 'hard'];
export const MAX_LOG = 5000;
/** Najwięcej ruchów wysyłanych do serwera naraz (ruchy bez losowania między dwoma losowymi) */
export const MAX_BATCH = 500;

const ACTS = new Set(['t', 'v', 'bt', 'f', 'p', 'r', 'c', 'tr', 'rp', 'b', 'd', 'w', 'bv', 'sv', 'bw', 'sk']);
/** Ruchy od gracza: poprawny kształt, bez `['e', …]` (losowość wstawia wyłącznie serwer) */
export function validClientActs(acts: unknown, max = MAX_BATCH): acts is Act[] {
  return Array.isArray(acts) && acts.length <= max &&
    acts.every((a) => Array.isArray(a) && a.length <= 5 && typeof a[0] === 'string' && ACTS.has(a[0]) &&
      a.every((x) => ['string', 'number', 'boolean'].includes(typeof x)));
}

/** Sprawdza zakończoną grę rankingową: ścisłe odtworzenie, koniec gry i dodatni wynik */
export function verifyRun(diff: Diff, seed: number, log: Act[]): Verdict {
  let r: ReturnType<typeof replay>;
  try {
    r = replay(diff, seed, log, true);
  } catch {
    return { ok: false, reason: 'replay' };
  }
  if (!r.ok) return { ok: false, reason: 'replay' };
  if (!r.s.over) return { ok: false, reason: 'unfinished' };
  const sc = E.score(r.s);
  if (sc <= 0) return { ok: false, reason: 'score' };
  return { ok: true, score: sc };
}
