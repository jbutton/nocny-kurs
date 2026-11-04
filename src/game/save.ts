import type { GameState } from './types';

export const SAVE_KEY = 'ss_save_v3';

/** Przyjmuje tylko zapis trwającej gry w obecnej wersji formatu */
export function parseSave(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as GameState;
    if (s && s.v === 1 && !s.over && s.day <= s.maxDays) return s;
  } catch {
    /* uszkodzony zapis: zaczynamy od nowa */
  }
  return null;
}
