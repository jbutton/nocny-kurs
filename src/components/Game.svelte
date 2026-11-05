<!-- Wyspa gry (Astro: client:only="svelte"). Czyta stan z TanStack Store przez useSelector. -->
<script lang="ts">
  import { useSelector } from '@tanstack/svelte-store';
  import { app } from '../stores/app';
  import { setQueryClientContext } from '@tanstack/svelte-query';
  import { queryClient } from '../lib/api';
  import StatusBar from './StatusBar.svelte';
  import NavBar from './NavBar.svelte';
  import Market from './Market.svelte';
  import MapView from './MapView.svelte';
  import Shop from './Shop.svelte';
  import Chat from './Chat.svelte';
  import Wallet from './Wallet.svelte';
  import TradeSheet from './TradeSheet.svelte';
  import Mentor from './Mentor.svelte';
  import Toast from './Toast.svelte';
  import Dialogs from './Dialogs.svelte';
  import Skyline from './Skyline.svelte';
  import Logo from './Logo.svelte';
  import { t } from '../i18n';

  // props z Astro: język strony i ścieżka bazowa (store czyta je z <html lang> i import.meta.env)
  let { pageLang: _pl, base: _b }: { pageLang?: string; base?: string } = $props();
  // TanStack Query (ranking online)
  setQueryClientContext(queryClient);
  const st = useSelector(app);
  const s = $derived(st.current);
  const g = $derived(s.game);
  const blocking = $derived(!!s.dialog || !!g.pending);
  const mentor = $derived(g.tut <= 3 && !s.sheet && !blocking);
  let content: HTMLDivElement | undefined = $state();
  $effect(() => { void s.tab; content?.scrollTo({ top: 0 }); });
</script>

<Skyline city={g.city} wanted={Math.min(5, Math.floor(g.heat / 20))} />

<div class="stage">
<header class="brand"><Logo lang={s.lang} /></header>
<div class="phone">
  <StatusBar game={g} lang={s.lang} />
  <div class="content" class:roomy={mentor} bind:this={content}>
    {#if s.tab === 'market'}<Market game={g} lang={s.lang} />
    {:else if s.tab === 'map'}<MapView game={g} lang={s.lang} />
    {:else if s.tab === 'shop'}<Shop game={g} lang={s.lang} />
    {:else if s.tab === 'chat'}<Chat game={g} lang={s.lang} />
    {:else}<Wallet game={g} lang={s.lang} />{/if}
  </div>
  <NavBar tab={s.tab} game={g} lang={s.lang} />

  {#if mentor}<Mentor step={g.tut} lang={s.lang} />{/if}
  {#if s.sheet && !blocking}
    {#key s.sheet.item + s.sheet.src}<TradeSheet game={g} lang={s.lang} sheet={s.sheet} />{/key}
  {/if}
  {#if s.busy}<div class="busy" aria-live="polite"><span>{t(s.lang, 'connecting')}</span></div>{/if}
  <Dialogs game={g} lang={s.lang} dialog={s.dialog} board={s.board} nick={s.nick} />
  {#if s.toast}
    {#key s.toast.id}<Toast toast={s.toast} lang={s.lang} canUndo={!!s.undo} />{/key}
  {/if}
</div>
</div>
