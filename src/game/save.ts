import type { GameState } from './types';

export const SAVE_KEY = 'ss_save_v3';

/** Przyjmuje tylko zapis trwającej gry w obecnej wersji formatu */
export function parseSave(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as GameState;
    if (s && s.v === 1 && !s.over && s.day <= s.maxDays) {
      // migracja starszych zapisów: pojedyncza broń → lista posiadanej ochrony
      const old = s as GameState & { weapon?: GameState['weapons'][number] | null };
      if (!Array.isArray(s.weapons)) { s.weapons = old.weapon ? [old.weapon] : []; delete old.weapon; }
      return s;
    }
  } catch {
    /* uszkodzony zapis: zaczynamy od nowa */
  }
  return null;
}
