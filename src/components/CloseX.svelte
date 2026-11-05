<!-- Krzyżyk zamykający okno (oprócz kliknięcia poza okno i klawisza Esc) -->
<script lang="ts">
  import X from '@lucide/svelte/icons/x';
  import { useSelector } from '@tanstack/svelte-store';
  import { app } from '../stores/app';
  import { t } from '../i18n';

  let { onclick }: { onclick: () => void } = $props();
  const lang = useSelector(app, (s) => s.lang);
</script>

<button class="x" type="button" aria-label={t(lang.current, 'close')} title={t(lang.current, 'close')} {onclick}><X size={20} strokeWidth={2.4} /></button>

<style>
  .x { position: absolute; top: 14px; right: 14px; width: 36px; height: 36px; border: 0; border-radius: 12px; background: var(--card); color: var(--muted); display: grid; place-items: center; cursor: pointer; z-index: 1; }
  .x:hover { color: var(--text); }
</style>
