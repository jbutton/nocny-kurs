/**
 * Protokół gry rankingowej online — wspólny dla gry (klient) i serwera rankingu.
 *
 * 1. Serwer zakłada rozgrywkę: losuje seed i zwraca `id` + `seed`.
 * 2. Ruchy bez losowania (handel, bank, sklep) gra wykonuje od razu i tylko zapamiętuje.
 * 3. Ruch z losowaniem (podróż, decyzja przy kontroli, napad) gra najpierw wysyła na serwer razem
 *    z zaległymi ruchami. Serwer dopisuje je do swojego dziennika, wstawia przed tym ruchem
 *    `['e', n]` z nową losowością i dopiero wtedy odsyła `n`. Decyzja jest już zapisana, więc
 *    znajomość `n` niczego nie daje, a bez `n` nie da się przewidzieć wyniku.
 * 4. Na koniec serwer odtwarza własny dziennik (ścisłe odtworzenie) i sam liczy wynik.
 */
import { act, probe, type Act } from './replay';
import type { GameState, Outcome } from './types';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Serwer: dopisuje partię ruchów gracza (ostatni z nich losuje) i wstawia przed ostatnim losowość `n`.
 * `at` = długość dziennika, którą zna gracz. Ponowienie tej samej prośby (np. po zerwanym połączeniu)
 * zwraca tę samą losowość zamiast błędu.
 */
export function stepLog(log: Act[], at: number, acts: Act[], n: number):
  { ok: true; log: Act[]; n: number; fresh: boolean } | { ok: false } {
  if (acts.length === 0) return { ok: false };
  const add = (x: number): Act[] => [...acts.slice(0, -1), ['e', x], acts[acts.length - 1]];
  if (at === log.length) return { ok: true, log: [...log, ...add(n)], n, fresh: true };
  if (at >= 0 && log.length === at + acts.length + 1) {
    const tail = log.slice(at);
    const prev = tail[acts.length - 1];
    if (prev[0] === 'e' && same(tail, add(prev[1] as number))) return { ok: true, log, n: prev[1] as number, fresh: false };
  }
  return { ok: false };
}

export type StepFn = (id: string, at: number, acts: Act[]) => Promise<number>;

/**
 * Klient: wykonuje ruch w grze rankingowej. Ruch bez losowania — od razu, lokalnie.
 * Ruch z losowaniem — najpierw serwer (zapis decyzji + losowość), potem silnik.
 * Rzuca wyjątek, jeśli serwer nie odpowie (stan gry się wtedy nie zmienia).
 */
export async function rankedAct(s: GameState, a: Act, step: StepFn): Promise<Outcome> {
  const kind = probe(s, a);
  if (kind === 'noop') return { s, fx: [] };
  if (kind === 'plain' || !s.run) return act(s, a);
  const { id, synced } = s.run;
  const n = await step(id, synced, [...s.log.slice(synced), a]);
  const o = act(act(s, ['e', n]).s, a);
  return { s: { ...o.s, run: { id, synced: o.s.log.length } }, fx: o.fx };
}
