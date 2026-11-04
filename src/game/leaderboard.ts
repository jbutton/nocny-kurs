import { DIFFS } from './data';
import type { Diff } from './types';

/**
 * Ranking lokalny (top N na poziom trudności). Funkcje są czyste; zapis w localStorage
 * robi warstwa store. Później podmienimy źródło na API online (TanStack Query).
 */
export interface BoardEntry {
  id: number;
  name: string;
  score: number;
  diff: Diff;
  date: string;
}
export const BOARD_SIZE = 10;
export const NICK_MAX = 16;

export function addEntry(board: BoardEntry[], e: BoardEntry): BoardEntry[] {
  const all = [...board, e];
  return (Object.keys(DIFFS) as Diff[]).flatMap((d) =>
    all.filter((x) => x.diff === d).sort((a, b) => b.score - a.score).slice(0, BOARD_SIZE),
  );
}
export const forDiff = (board: BoardEntry[], diff: Diff) =>
  board.filter((x) => x.diff === diff).sort((a, b) => b.score - a.score);

// prosty filtr wulgaryzmów w nickach (PL/EN, po normalizacji znaków)
const BAD = ['kurw', 'chuj', 'huj', 'jeb', 'pierdol', 'cip', 'pizd', 'fuck', 'shit', 'cunt', 'nigg', 'fag', 'dziwk', 'szmat', 'pedal', 'hitler'];
const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l')
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/[^a-z]/g, '');
export const isBadNick = (s: string) => BAD.some((w) => normalize(s).includes(w));

/** Nick do rankingu: przycięty, bez znaków sterujących, bez wulgaryzmów (wtedy zastępczy) */
export function cleanNick(raw: string, fallback: string): string {
  const n = raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, NICK_MAX);
  return !n || isBadNick(n) ? fallback : n;
}
