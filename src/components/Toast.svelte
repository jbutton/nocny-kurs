<script lang="ts">
  import X from '@lucide/svelte/icons/x';
  import { actions, type Toast } from '../stores/app';
  import { t, tm } from '../i18n';
  import type { Lang } from '../game/types';

  let { toast, lang, canUndo }: { toast: Toast; lang: Lang; canUndo: boolean } = $props();
  $effect(() => {
    const id = toast.id;
    const timer = setTimeout(() => actions.dismissToast(id), toast.undo ? 6000 : 4500);
    return () => clearTimeout(timer);
  });
  const close = () => actions.dismissToast(toast.id);

  // zamykanie: dotknięcie, krzyżyk albo przesunięcie palcem w górę
  let startY: number | null = null;
  let dy = $state(0);
  const down = (e: PointerEvent) => { startY = e.clientY; };
  const move = (e: PointerEvent) => { if (startY !== null) dy = Math.min(0, e.clientY - startY); };
  const up = () => {
    if (startY === null) return;
    startY = null;
    if (dy < -25) close();
    else dy = 0;
  };
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="toast" role="status" style:transform={dy ? `translateY(${dy}px)` : undefined} style:opacity={dy ? 1 + dy / 80 : undefined}
  onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up} onclick={(e) => !(e.target as Element).closest('button') && close()}>
  <span>{@html tm(lang, toast.msg)}</span>
  {#if toast.undo && canUndo}<button class="undo" onclick={actions.undo}>{t(lang, 'undo')}</button>{/if}
  <button class="x" aria-label={t(lang, 'close')} onclick={close}><X size={16} strokeWidth={2.6} /></button>
</div>

<style>
  .toast { position: absolute; left: 12px; right: 12px; top: 12px; background: #2a3142; border-radius: 16px; padding: 10px 8px 10px 14px; display: flex; align-items: center; gap: 8px; z-index: 30; font-size: 14px; box-shadow: 0 10px 30px rgba(0, 0, 0, .4); animation: down .2s; cursor: pointer; touch-action: none; user-select: none; }
  span { flex: 1; }
  .undo { border: 0; background: var(--accent); color: #0b1b19; font-weight: 800; border-radius: 10px; padding: 6px 10px; cursor: pointer; flex-shrink: 0; }
  .x { border: 0; background: transparent; color: var(--muted); width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; cursor: pointer; flex-shrink: 0; }
  .x:hover { color: var(--text); background: rgba(255, 255, 255, .06); }
</style>
