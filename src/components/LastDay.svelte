<!-- Baner ostatniego dnia z wyraźnym przyciskiem zakończenia gry (Rynek i Mapa) -->
<script lang="ts">
  import Flag from '@lucide/svelte/icons/flag';
  import { actions } from '../stores/app';
  import { t } from '../i18n';
  import type { Lang } from '../game/types';
  let { lang }: { lang: Lang } = $props();
</script>

<div class="last">
  <div class="txt"><b>⏰ {t(lang, 'lastDayTitle')}</b><span>{t(lang, 'lastDay')}</span></div>
  <button class="btn center fin" onclick={actions.finish}><Flag size={18} strokeWidth={2.4} /> {t(lang, 'finish')}</button>
</div>

<style>
  .last { background: color-mix(in srgb, var(--warn) 12%, var(--card)); border: 2px solid color-mix(in srgb, var(--warn) 55%, transparent); border-radius: var(--radius); padding: 12px 14px; margin: 8px 0 10px; }
  .txt { display: flex; flex-direction: column; gap: 2px; font-size: 13px; color: var(--muted); line-height: 1.4; }
  .txt b { color: var(--warn); font-size: 15px; }
  .fin { display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--warn); color: #261a02; margin-top: 10px; }
</style>
