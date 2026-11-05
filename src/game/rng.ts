/**
 * Deterministyczny generator (mulberry32). Stan trzymamy w obiekcie gry (`seed`),
 * więc zapis gry zawiera też stan losowania: odświeżenie strony nie zmienia przyszłych zdarzeń,
 * a ten sam seed + te same ruchy dają tę samą grę (podstawa pod ranking online i antycheat).
 */
export function rng(s: { seed: number }): number {
  const a = (s.seed = (s.seed + 0x6d2b79f5) | 0);
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const pick = <T>(s: { seed: number }, arr: readonly T[]): T => arr[Math.floor(rng(s) * arr.length)];

/**
 * Miesza do stanu generatora porcję losowości z serwera (ranking online).
 * Bez znajomości `n` nie da się przewidzieć niczego, co silnik wylosuje później.
 */
export function mix(seed: number, n: number): number {
  let h = (seed ^ Math.imul(n | 0, 0x9e3779b1)) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) | 0;
}
