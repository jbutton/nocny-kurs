/**
 * Klient API rankingu online (Cloudflare Worker, katalog worker/).
 * Adres API ustawia zmienna PUBLIC_API_URL przy budowaniu; bez niej ranking online jest wyłączony.
 */
import { QueryClient } from '@tanstack/svelte-query';
import type { Act } from '../game/replay';
import type { Diff } from '../game/types';

export const API_URL: string = (import.meta.env.PUBLIC_API_URL ?? '').replace(/\/$/, '');
export const onlineEnabled = () => API_URL !== '';

/** Wspólny klient TanStack Query (kontekst ustawia Game.svelte, store używa go do odświeżania) */
export const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

export interface OnlineEntry { id: number; name: string; score: number; diff: Diff; date: string }

export async function fetchTop(diff: Diff, limit = 20): Promise<OnlineEntry[]> {
  const r = await fetch(`${API_URL}/api/scores?diff=${diff}&limit=${limit}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return ((await r.json()) as { scores: OnlineEntry[] }).scores;
}

export type SubmitResult = { ok: true; id: number; place: number; name: string } | { ok: false; reason: string };

export async function submitScore(body: { name: string; diff: Diff; seed: number; log: Act[] }): Promise<SubmitResult> {
  try {
    const r = await fetch(`${API_URL}/api/scores`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = (await r.json()) as { id?: number; place?: number; name?: string; error?: string };
    if (!r.ok || !d.id) return { ok: false, reason: d.error ?? `HTTP ${r.status}` };
    return { ok: true, id: d.id, place: d.place ?? 0, name: d.name ?? body.name };
  } catch {
    return { ok: false, reason: 'network' };
  }
}
