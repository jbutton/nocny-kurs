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

export const cleanNick = (raw: string, fallback: string) => (raw.trim() || fallback).slice(0, NICK_MAX);
