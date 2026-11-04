<script lang="ts">
  import { actions, type Toast } from '../stores/app';
  import { t, tm } from '../i18n';
  import type { Lang } from '../game/types';

  let { toast, lang, canUndo }: { toast: Toast; lang: Lang; canUndo: boolean } = $props();
  $effect(() => {
    const id = toast.id;
    const timer = setTimeout(() => actions.dismissToast(id), toast.undo ? 6000 : 4500);
    return () => clearTimeout(timer);
  });
</script>

<div class="toast" role="status">
  <span>{@html tm(lang, toast.msg)}</span>
  {#if toast.undo && canUndo}<button onclick={actions.undo}>{t(lang, 'undo')}</button>{/if}
</div>

<style>
  .toast { position: absolute; left: 12px; right: 12px; top: 12px; background: #2a3142; border-radius: 16px; padding: 10px 14px; display: flex; align-items: center; gap: 10px; z-index: 30; font-size: 14px; box-shadow: 0 10px 30px rgba(0, 0, 0, .4); animation: down .2s; }
  button { margin-left: auto; border: 0; background: var(--accent); color: #0b1b19; font-weight: 800; border-radius: 10px; padding: 6px 10px; cursor: pointer; flex-shrink: 0; }
</style>
