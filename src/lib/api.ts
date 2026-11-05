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

async function post<T>(path: string, body: unknown, timeoutMs = 8000): Promise<{ status: number; data: T & { error?: string } }> {
  const r = await fetch(`${API_URL}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs),
  });
  return { status: r.status, data: (await r.json()) as T & { error?: string } };
}

/** Nowa gra rankingowa: seed losuje serwer */
export async function startRun(diff: Diff): Promise<{ id: string; seed: number }> {
  const { status, data } = await post<{ id: string; seed: number }>('/api/runs', { diff }, 5000);
  if (status !== 201 || !data.id) throw new Error(data.error ?? `HTTP ${status}`);
  return data;
}

/** Błąd serwera, po którym tej gry nie da się już kontynuować w rankingu (np. otwarta w dwóch kartach) */
export class RunLost extends Error {}

/** Wysyła zaległe ruchy i decyzję gracza, zwraca losowość od serwera */
export async function stepRun(id: string, at: number, acts: Act[]): Promise<number> {
  const { status, data } = await post<{ n: number }>(`/api/runs/${id}/step`, { at, acts });
  if (status === 200 && typeof data.n === 'number') return data.n;
  if (status >= 400 && status < 500) throw new RunLost(data.error ?? `HTTP ${status}`);
  throw new Error(data.error ?? `HTTP ${status}`);
}

export async function finishRun(id: string, at: number, acts: Act[], name: string): Promise<SubmitResult> {
  try {
    const { status, data } = await post<{ id: number; place: number; name: string }>(`/api/runs/${id}/finish`, { at, acts, name }, 15000);
    if (status >= 300 || !data.id) return { ok: false, reason: data.error ?? `HTTP ${status}` };
    return { ok: true, id: data.id, place: data.place ?? 0, name: data.name ?? name };
  } catch {
    return { ok: false, reason: 'network' };
  }
}
