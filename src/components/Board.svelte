<!-- Okno rankingu: zakładki „Wszyscy gracze” (online, TanStack Query) / „To urządzenie” + poziomy trudności -->
<script lang="ts">
  import Trophy from '@lucide/svelte/icons/trophy';
  import Globe from '@lucide/svelte/icons/globe';
  import Smartphone from '@lucide/svelte/icons/smartphone';
  import { createQuery } from '@tanstack/svelte-query';
  import Modal from './Modal.svelte';
  import { actions, type Dialog } from '../stores/app';
  import { DICTS, fmt, t } from '../i18n';
  import { rankOf } from '../game/engine';
  import { forDiff, type BoardEntry } from '../game/leaderboard';
  import { fetchTop, onlineEnabled } from '../lib/api';
  import type { Diff, Lang } from '../game/types';

  type BoardDialog = Extract<Dialog, { kind: 'board' }>;
  let { dialog, lang, board }: { dialog: BoardDialog; lang: Lang; board: BoardEntry[] } = $props();
  const d = $derived(DICTS[lang]);
  const diffs: Diff[] = ['easy', 'normal', 'hard'];
  const medal = (i: number) => ['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`;

  const online = $derived(dialog.scope === 'online');
  const query = createQuery(() => ({
    queryKey: ['scores', dialog.diff],
    queryFn: () => fetchTop(dialog.diff),
    enabled: online && onlineEnabled(),
  }));
  const hlOnline = $derived(dialog.online?.status === 'ok' ? dialog.online.id : 0);
  const rows = $derived(
    online
      ? (query.data ?? []).map((x) => ({ id: x.id, name: x.name, score: x.score, date: x.date, me: x.id === hlOnline }))
      : forDiff(board, dialog.diff).map((x) => ({ ...x, me: x.id === dialog.hl })),
  );
  const localPos = $derived(forDiff(board, dialog.diff).findIndex((x) => x.id === dialog.hl));
  const go = (patch: Partial<Pick<BoardDialog, 'diff' | 'scope'>>) =>
    actions.showBoard(patch.diff ?? dialog.diff, dialog.hl, dialog.afterEnd, patch.scope ?? dialog.scope);
</script>

<Modal title={t(lang, 'boardTitle')} icon={Trophy} tone="warn" onclose={dialog.afterEnd ? undefined : actions.closeDialog}>
  {#if onlineEnabled()}
    <div class="scope">
      <button class:on={online} onclick={() => go({ scope: 'online' })}><Globe size={14} /> {t(lang, 'boardOnline')}</button>
      <button class:on={!online} onclick={() => go({ scope: 'local' })}><Smartphone size={14} /> {t(lang, 'boardDevice')}</button>
    </div>
  {/if}
  <div class="tabs">
    {#each diffs as df (df)}
      <button class:on={df === dialog.diff} onclick={() => go({ diff: df })}>{d.diffName[df]}</button>
    {/each}
  </div>

  {#if dialog.afterEnd}
    {#if online && dialog.online?.status === 'sending'}<div class="place">{t(lang, 'sending')}</div>
    {:else if online && dialog.online?.status === 'ok'}<div class="place">{@html t(lang, 'placeOnline', { n: dialog.online.place })}</div>
    {:else if dialog.online?.status === 'error'}<div class="place warn">{t(lang, 'sendFail', { r: dialog.online.reason })}</div>
    {:else if online && dialog.online?.status === 'unranked'}<div class="place warn">{t(lang, 'unranked')}</div>
    {:else if !online && localPos >= 0}<div class="place">{@html t(lang, 'place', { n: localPos + 1 })}</div>{/if}
  {/if}

  {#if online && query.isPending}
    <p class="note">{t(lang, 'onlineLoading')}</p>
  {:else if online && query.isError}
    <p class="note warn">{t(lang, 'onlineError')}</p>
  {:else}
    {#each rows as x, i (x.id)}
      <div class="brow" class:me={x.me}>
        <span class="pl">{medal(i)}</span>
        <span class="nm">{x.name}<small>{d.ranks[rankOf(x.score)]} · {x.date}</small></span>
        <span class="sc">{fmt(lang, x.score)} zł</span>
      </div>
    {:else}
      <p class="note">{t(lang, 'boardEmpty')}</p>
    {/each}
  {/if}
  <p class="note">{t(lang, online ? 'boardOnlineNote' : 'boardLocal')}</p>

  {#if dialog.afterEnd}
    <button class="btn center" onclick={actions.askDifficulty}>{t(lang, 'again')}</button>
  {:else}
    <button class="btn center" onclick={actions.closeDialog}>{t(lang, 'close')}</button>
  {/if}
</Modal>

<style>
  .scope { display: flex; gap: 6px; margin: 0 0 8px; background: var(--card); padding: 4px; border-radius: 12px; }
  .scope button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; border: 0; background: none; color: var(--muted); font-weight: 800; padding: 8px; border-radius: 9px; cursor: pointer; font-size: 13px; }
  .scope button.on { background: var(--card2); color: var(--text); }
  .tabs { display: flex; gap: 6px; margin: 4px 0 12px; }
  .tabs button { flex: 1; border: 0; background: var(--card); color: var(--muted); font-weight: 800; padding: 8px 4px; border-radius: 10px; cursor: pointer; font-size: 12px; }
  .tabs button.on { background: var(--accent); color: #0b1b19; }
  .place { margin-bottom: 10px; color: var(--muted); }
  .warn { color: var(--warn); }
  .brow { display: flex; align-items: center; gap: 10px; background: var(--card); border-radius: 12px; padding: 9px 12px; margin-bottom: 6px; }
  .brow.me { outline: 2px solid var(--accent); background: #1d2f2d; }
  .pl { width: 28px; text-align: center; font-weight: 900; }
  .nm { flex: 1; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nm small { display: block; font-weight: 600; color: var(--muted); font-size: 11px; }
  .sc { font-weight: 900; }
</style>
